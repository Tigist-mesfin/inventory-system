const { QueryTypes } = require("sequelize");
const AppError = require("../../shared/errors/AppError");
const env = require("../../config/env");
const sequelize = require("../../config/db");
const tenant = require("../../shared/helpers/tenant.helper");
const { getSchemaPrompt, ALLOWED_TABLES } = require("./schemaCatalog");
const { scope } = require("./scope");
const { generateText, extractJson } = require("./geminiClient");
const clarifyService = require("./clarify.service");

const FORBIDDEN_SQL =
  /\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|REPLACE|CREATE|GRANT|REVOKE|CALL|EXEC|EXECUTE|MERGE|LOAD\s+DATA|INTO\s+OUTFILE|DUMPFILE|BENCHMARK|SLEEP\s*\(|INFORMATION_SCHEMA|performance_schema|mysql\.|sys\.)\b/i;

const extractSql = (text) => {
  if (!text) return "";
  const fenced = text.match(/```(?:sql)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  const selectMatch = text.match(/\bSELECT\b[\s\S]*/i);
  return (selectMatch ? selectMatch[0] : text).trim();
};

const detectLanguageHint = (question) => {
  const text = String(question || "");
  if (/[\u1200-\u137F]/.test(text)) return "Amharic (አማርኛ) or Tigrinya if that fits";
  if (/\b(maal|maaloo|haraa|bara|hojii|gurgurtaa)\b/i.test(text)) {
    return "Afaan Oromoo";
  }
  return "the same language the user used (English, Amharic, Afaan Oromoo, Tigrinya, etc.)";
};

const assertSafeSelect = (sql) => {
  let cleaned = String(sql || "").trim();
  cleaned = cleaned.replace(/;+\s*$/g, "").trim();
  if (!cleaned) throw AppError.badRequest("AI returned an empty query");
  if (cleaned.includes(";")) {
    throw AppError.badRequest("Only a single SELECT statement is allowed");
  }
  if (!/^\s*SELECT\b/i.test(cleaned)) {
    throw AppError.badRequest("Only SELECT queries are allowed");
  }
  if (FORBIDDEN_SQL.test(cleaned)) {
    throw AppError.badRequest("That query is not allowed");
  }
  if (/\b(password|refreshToken|accessToken|tokenHash|secret)\b/i.test(cleaned)) {
    throw AppError.badRequest("Sensitive columns cannot be queried");
  }
  // Force bind parameter — reject literal company ids or wrong placeholders
  if (!/:companyId\b/.test(cleaned) || !/\bcompanyId\s*=\s*:companyId\b/i.test(cleaned)) {
    throw AppError.badRequest(
      "Query must include companyId = :companyId for tenant isolation",
    );
  }
  const companyAssignments = [
    ...cleaned.matchAll(/\b(?:\w+\.)?companyId\s*=\s*([:\w"'`-]+)/gi),
  ];
  for (const match of companyAssignments) {
    if (String(match[1]) !== ":companyId") {
      throw AppError.badRequest(
        "companyId must use the :companyId bind parameter only",
      );
    }
  }

  const fromMatches = [
    ...cleaned.matchAll(/\b(?:FROM|JOIN)\s+`?([a-zA-Z0-9_]+)`?/gi),
  ];
  for (const match of fromMatches) {
    const table = String(match[1] || "").toLowerCase();
    const allowed = [...ALLOWED_TABLES].some(
      (name) => name.toLowerCase() === table,
    );
    if (!allowed) {
      throw AppError.badRequest(
        `Table "${match[1]}" is not available to the assistant`,
      );
    }
  }

  if (!/\bLIMIT\b/i.test(cleaned)) {
    cleaned = `${cleaned} LIMIT 100`;
  } else {
    cleaned = cleaned.replace(/\bLIMIT\s+(\d+)/i, (_, n) => {
      const limit = Math.min(Math.max(parseInt(n, 10) || 100, 1), 100);
      return `LIMIT ${limit}`;
    });
  }

  return cleaned;
};

const buildSqlPrompt = ({ question, companyId, warehouseIds }) => {
  const warehouseRule =
    warehouseIds === null
      ? "User can see all warehouses for this company."
      : warehouseIds.length
        ? `User may only see warehouses in this id list: ${warehouseIds.join(", ")}. Filter warehouseId accordingly when querying warehouse-scoped tables.`
        : "User has no warehouse access; return an empty-safe query with 1=0 if warehouse data is required.";

  return `You are a MySQL query generator for a multi-tenant inventory ERP.
Return ONLY one MySQL SELECT statement. No markdown explanation.

Tenant isolation (mandatory):
- Every query MUST include companyId = :companyId (bind parameter name exactly :companyId).
- Never query other companies. Never invent ids.
- ${warehouseRule}

Rules:
- SELECT only. No INSERT/UPDATE/DELETE/DDL.
- Use only these tables/columns:
${getSchemaPrompt()}
- Prefer aggregates for totals. Cap detail with LIMIT <= 100.
- Use ISO dates when filtering dates.
- Join sales to sale_items via sale_items.saleId = sales.id
- Join products via productId
- Do not select password or token columns (they are not in the schema).

User question:
${question}

Company bind parameter: always filter with companyId = :companyId (do not inline the UUID).
`;
};

const buildAnswerPrompt = ({ question, rows, languageHint }) => `
You are a helpful inventory ERP assistant.
Answer using ONLY the SQL result JSON below. Never invent numbers or rows.
If the result is empty, say no matching data was found.
Respond in ${languageHint}.
Return JSON only:
{
  "answer":"markdown-friendly answer",
  "language":"en|am|om|ti|other",
  "bullets":["optional"],
  "metrics":[{"label":"Total revenue","value":"1200","trend":"+12%| -3%|null"}],
  "chart":{"type":"bar|pie","title":"optional","data":[{"name":"A","value":10}]},
  "table":{"headers":["col"],"rows":[["v"]]}|null
}
Rules for chart/metrics:
- Include metrics when totals/counts/averages are present.
- Include chart when 2+ comparable categories or a short trend exist (max 12 points).
- Use only values from the SQL result.

Question: ${question}

SQL result (max 100 rows):
${JSON.stringify(rows).slice(0, 12000)}
`;

/**
 * Secure multi-tenant Gemini SQL assistant.
 * @param {{ userQuestion: string, user: object }} params
 */
exports.handleUserAIQuery = async ({ userQuestion, user }) => {
  const question = String(userQuestion || "").trim();
  if (!question) throw AppError.badRequest("Question is required");
  if (question.length > 800) throw AppError.badRequest("Question is too long");

  const companyId = tenant.requireCompanyId(user);
  const scoped = scope(user, {});
  const languageHint = detectLanguageHint(question);

  let sqlText;
  try {
    sqlText = await generateText(
      buildSqlPrompt({
        question,
        companyId,
        warehouseIds: scoped.warehouseIds,
      }),
    );
  } catch (err) {
    if (err.statusCode) throw err;
    console.error("[ai/sqlAssistant] unexpected:", err.message || err);
    throw AppError.badRequest(
      env.NODE_ENV === "development" && err.message
        ? `AI service error: ${String(err.message).slice(0, 240)}`
        : "AI service is temporarily unavailable. Try again shortly.",
    );
  }

  const sql = assertSafeSelect(extractSql(sqlText));

  const replacements = { companyId };
  let finalSql = sql;

  const WAREHOUSE_TABLES = new Set([
    "sales",
    "inventory",
    "stock_transactions",
    "stock_batches",
    "warehouses",
    "purchase_order_items",
  ]);
  const queriedTables = [
    ...sql.matchAll(/\b(?:FROM|JOIN)\s+`?([a-zA-Z0-9_]+)`?/gi),
  ].map((m) => String(m[1] || "").toLowerCase());
  const touchesWarehouseData = queriedTables.some((name) =>
    WAREHOUSE_TABLES.has(name),
  );

  // Extra warehouse isolation for non-owner / assigned-store users
  if (Array.isArray(scoped.warehouseIds)) {
    if (!scoped.warehouseIds.length) {
      return {
        answer: "You do not have access to any warehouse data.",
        language: "en",
        bullets: [],
        table: null,
        rows: [],
        rowCount: 0,
        sqlPreview: null,
        provider: "gemini",
        source: {
          companyScoped: true,
          recordsAnalyzed: 0,
          lastUpdated: new Date().toISOString(),
        },
      };
    }
    scoped.warehouseIds.forEach((id, index) => {
      replacements[`wh${index}`] = id;
    });
    const whList = scoped.warehouseIds.map((_, i) => `:wh${i}`).join(", ");

    if (touchesWarehouseData) {
      if (!/\bwarehouseId\b/i.test(sql)) {
        throw AppError.badRequest(
          "Could not safely scope that question to your stores. Try rephrasing.",
        );
      }
      const inner = sql.replace(/\s+LIMIT\s+\d+\s*$/i, "");
      // Prefer injecting into WHERE so aggregates still work when warehouseId is selected
      if (/\bWHERE\b/i.test(inner)) {
        finalSql = `${inner} AND warehouseId IN (${whList}) LIMIT 100`;
      } else {
        finalSql = `${inner} WHERE warehouseId IN (${whList}) LIMIT 100`;
      }
    }
  }

  let rows;
  try {
    rows = await sequelize.query(finalSql, {
      replacements,
      type: QueryTypes.SELECT,
    });
  } catch (err) {
    throw AppError.badRequest(
      "Could not run that analysis against your data. Try rephrasing the question.",
    );
  }

  const limitedRows = Array.isArray(rows) ? rows.slice(0, 100) : [];

  let noMatchSuggestions = null;
  if (!limitedRows.length) {
    try {
      noMatchSuggestions = await clarifyService.suggestOnNoMatch({
        rawQuery: question,
        user,
      });
    } catch {
      noMatchSuggestions = null;
    }
  }

  let narrative;
  try {
    const answerText = await generateText(
      buildAnswerPrompt({
        question,
        rows: limitedRows,
        languageHint,
      }),
    );
    narrative = extractJson(answerText);
  } catch {
    narrative = null;
  }

  const answer =
    narrative?.answer ||
    (limitedRows.length
      ? `Found ${limitedRows.length} matching row(s) in your company data.`
      : noMatchSuggestions?.message ||
        "No matching data was found for your company.");

  return {
    answer,
    language: narrative?.language || "en",
    bullets: Array.isArray(narrative?.bullets) ? narrative.bullets : [],
    metrics: Array.isArray(narrative?.metrics) ? narrative.metrics.slice(0, 6) : [],
    chart:
      narrative?.chart?.data && Array.isArray(narrative.chart.data)
        ? {
            type: narrative.chart.type === "pie" ? "pie" : "bar",
            title: narrative.chart.title || "",
            data: narrative.chart.data.slice(0, 12).map((point) => ({
              name: String(point.name ?? point.label ?? ""),
              value: Number(point.value) || 0,
            })),
          }
        : null,
    table: narrative?.table || null,
    rows: limitedRows,
    rowCount: limitedRows.length,
    noMatch: !limitedRows.length,
    suggestions: noMatchSuggestions?.candidates || [],
    grammarFixed: noMatchSuggestions?.grammarFixed || null,
    entityMatches: noMatchSuggestions?.entityMatches || [],
    sqlPreview: null, // never expose SQL to the client by default
    provider: "gemini",
    source: {
      companyScoped: true,
      recordsAnalyzed: limitedRows.length,
      lastUpdated: new Date().toISOString(),
    },
  };
};

exports.assertSafeSelect = assertSafeSelect;
