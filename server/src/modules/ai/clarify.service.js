const { QueryTypes } = require("sequelize");
const AppError = require("../../shared/errors/AppError");
const sequelize = require("../../config/db");
const tenant = require("../../shared/helpers/tenant.helper");
const { generateText, extractJson } = require("./geminiClient");

const loadEntityContext = async (companyId) => {
  const [products, categories, warehouses] = await Promise.all([
    sequelize.query(
      `SELECT p.name AS name, p.sku AS sku, c.name AS categoryName
       FROM products p
       LEFT JOIN categories c ON c.id = p.categoryId
       WHERE p.companyId = :companyId
       ORDER BY p.name ASC
       LIMIT 50`,
      { replacements: { companyId }, type: QueryTypes.SELECT },
    ),
    sequelize.query(
      `SELECT name FROM categories WHERE companyId = :companyId ORDER BY name ASC LIMIT 30`,
      { replacements: { companyId }, type: QueryTypes.SELECT },
    ),
    sequelize.query(
      `SELECT name FROM warehouses WHERE companyId = :companyId ORDER BY name ASC LIMIT 20`,
      { replacements: { companyId }, type: QueryTypes.SELECT },
    ),
  ]);

  return {
    products: (products || []).map((row) => ({
      name: row.name,
      sku: row.sku,
      category: row.categoryName || null,
    })),
    categories: (categories || []).map((row) => row.name).filter(Boolean),
    warehouses: (warehouses || []).map((row) => row.name).filter(Boolean),
  };
};

const normalizeText = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^\w\s\u1200-\u137F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const wordTokens = (value) => normalizeText(value).split(" ").filter((t) => t.length >= 2);

const tokensOverlap = (a, b) => {
  const setB = new Set(wordTokens(b));
  return wordTokens(a).some((token) => setB.has(token) || [...setB].some((other) => other.includes(token) || token.includes(other)));
};

const detectTopics = (rawQuery) => {
  const q = normalizeText(rawQuery);
  const topics = [];
  if (/\b(sale?s|sala|sell|revenu|invoice|order|gurgur|بيع)\b/.test(q) || /\bsal/.test(q)) topics.push("sales");
  if (/\b(stock|invent|qty|quant|wareh|store|lot|مخزون)\b/.test(q)) topics.push("stock");
  if (/\b(purch|buy|supplier|procure|شراء)\b/.test(q)) topics.push("purchases");
  if (/\b(profit|margin|loss|expens|income|finance|profit|خسارة|ربح)\b/.test(q)) topics.push("profit");
  if (/\b(custom|client|wallet|debt|credit|ደንበ)\b/.test(q)) topics.push("customers");
  if (!topics.length) topics.push("sales", "stock");
  return topics;
};

const detectTimeHints = (rawQuery) => {
  const q = normalizeText(rawQuery);
  if (/\b(today|todya|tod|ዛሬ|har'a)\b/.test(q)) return "today";
  if (/\b(week|wk|ሳምንት|torban)\b/.test(q)) return "week";
  if (/\b(month|mon|ወር|ji'a)\b/.test(q)) return "month";
  if (/\b(year|annual|ዓመት)\b/.test(q)) return "year";
  return null;
};

const fuzzyEntityMatches = (rawQuery, entities) => {
  const q = normalizeText(rawQuery);
  const matches = [];

  for (const product of entities.products || []) {
    const name = normalizeText(product.name);
    const sku = normalizeText(product.sku);
    if (
      (name.length >= 3 && (q.includes(name) || name.includes(q) || tokensOverlap(q, name))) ||
      (sku && q.includes(sku))
    ) {
      matches.push({ type: "product", name: product.name });
    }
  }
  for (const category of entities.categories || []) {
    const name = normalizeText(category);
    if (name.length >= 3 && (q.includes(name) || tokensOverlap(q, name))) {
      matches.push({ type: "category", name: category });
    }
  }
  for (const warehouse of entities.warehouses || []) {
    const name = normalizeText(warehouse);
    if (name.length >= 3 && (q.includes(name) || tokensOverlap(q, name))) {
      matches.push({ type: "warehouse", name: warehouse });
    }
  }

  const seen = new Set();
  return matches.filter((row) => {
    const key = `${row.type}:${row.name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 5);
};

const templateSuggestions = (rawQuery, entities, entityMatches) => {
  const topics = detectTopics(rawQuery);
  const time = detectTimeHints(rawQuery);
  const productName = entityMatches.find((m) => m.type === "product")?.name;
  const warehouseName = entityMatches.find((m) => m.type === "warehouse")?.name;
  const list = [];

  const pushUnique = (text) => {
    const item = String(text || "").trim();
    if (item.length >= 3 && !list.includes(item)) list.push(item);
  };

  if (topics.includes("sales")) {
    if (time === "today") pushUnique("What are today's total sales?");
    else if (time === "week") pushUnique("What are this week's total sales?");
    else if (time === "month") pushUnique("What are this month's total sales?");
    else {
      pushUnique("What are today's total sales?");
      pushUnique("What are this week's total sales?");
      pushUnique("What are this month's total sales?");
    }
    if (productName) {
      pushUnique(`How many units of ${productName} were sold today?`);
      pushUnique(`What is the sales total for ${productName} this month?`);
    }
  }

  if (topics.includes("stock")) {
    if (productName && warehouseName) {
      pushUnique(`How much ${productName} is in stock at ${warehouseName}?`);
    } else if (productName) {
      pushUnique(`What is the current stock quantity for ${productName}?`);
    } else {
      pushUnique("Which products are low on stock?");
      pushUnique("Show current stock quantities by warehouse");
    }
  }

  if (topics.includes("purchases")) {
    pushUnique("What were today's purchases?");
    pushUnique("Show purchase totals this month");
  }

  if (topics.includes("profit")) {
    pushUnique("What is my profit this month?");
    pushUnique("Which products are most profitable?");
    pushUnique("Which products are losing money?");
  }

  if (topics.includes("customers")) {
    pushUnique("Which customers still owe money?");
    pushUnique("Show unpaid customer balances");
  }

  if (!list.length) {
    pushUnique("What are today's total sales?");
    pushUnique("Show current stock by warehouse");
    pushUnique(`Summarize data related to: ${rawQuery}`);
  }

  return list.slice(0, 5);
};

const normalizeCandidates = (parsed, rawQuery, { entityMatches = [], entities = null } = {}) => {
  let list = [];
  if (Array.isArray(parsed)) list = parsed;
  else if (Array.isArray(parsed?.candidates)) list = parsed.candidates;
  else if (Array.isArray(parsed?.questions)) list = parsed.questions;

  list = list
    .map((item) => String(item || "").trim())
    .filter((item) => item.length >= 3);

  const templates = templateSuggestions(rawQuery, entities || {}, entityMatches);
  for (const item of templates) {
    if (list.length >= 5) break;
    if (!list.includes(item)) list.push(item);
  }

  while (list.length < 3) {
    const fallback = templateSuggestions(rawQuery, entities || {}, entityMatches);
    const next = fallback[list.length];
    if (next && !list.includes(next)) list.push(next);
    else break;
  }
  return list.slice(0, 5);
};

const buildClarifyPrompt = ({ text, entities, entityMatches, noMatch }) => {
  const matchNote =
    entityMatches.length > 0
      ? `Matched entities: ${JSON.stringify(entityMatches)}`
      : "No product, category, or warehouse name matched the raw input.";

  return `You are an ERP query clarifier for an inventory/sales system.
Fix spelling, typos, and broken grammar in the user's raw question (e.g. "todya sala" -> "today's sales").
Use fuzzy matching against the company entity lists below (product names, SKUs, categories, warehouses).
Keep the user's language (English, Amharic, Afaan Oromoo, Tigrinya, etc.).
${noMatch ? "The database query returned NO rows — suggest what the user likely meant." : ""}
Produce 3 to 5 distinct, clear, actionable natural-language questions a shop owner might mean.
Include time-based variants when relevant (today, this week, this month).
If no entity matched, prefer general sales/stock/purchase questions related to the typo-fixed intent.

Return JSON only, either:
["question 1","question 2","question 3"]
or
{"candidates":["question 1","question 2","question 3"],"grammarFixed":"corrected phrase"}

${matchNote}

Company products (name / sku / category):
${JSON.stringify(entities.products).slice(0, 6000)}

Categories: ${JSON.stringify(entities.categories)}
Warehouses: ${JSON.stringify(entities.warehouses)}

Raw user input:
${text}
`;
};

const runClarify = async ({ text, entities, entityMatches, noMatch }) => {
  let parsed;
  let grammarFixed = null;
  try {
    const reply = await generateText(
      buildClarifyPrompt({ text, entities, entityMatches, noMatch }),
    );
    parsed = extractJson(reply);
    grammarFixed =
      parsed?.grammarFixed ||
      (typeof parsed?.corrected === "string" ? parsed.corrected : null);
  } catch (err) {
    if (err.statusCode) throw err;
    parsed = null;
  }

  const candidates = normalizeCandidates(parsed, text, { entityMatches, entities });
  return { candidates, grammarFixed };
};

/**
 * Grammar fix + disambiguation into candidate questions.
 * Tenant scoped via companyId from the authenticated user (never trust client userId).
 */
exports.clarifyQuery = async ({ rawQuery, user }) => {
  const text = String(rawQuery || "").trim();
  if (!text) throw AppError.badRequest("rawQuery is required");
  if (text.length > 800) throw AppError.badRequest("rawQuery is too long");

  const companyId = tenant.requireCompanyId(user);
  const entities = await loadEntityContext(companyId);
  const entityMatches = fuzzyEntityMatches(text, entities);

  let result;
  try {
    result = await runClarify({ text, entities, entityMatches, noMatch: false });
  } catch (err) {
    if (err.statusCode) throw err;
    throw AppError.badRequest(
      "Could not clarify that question right now. Try again shortly.",
    );
  }

  return {
    rawQuery: text,
    candidates: result.candidates,
    grammarFixed: result.grammarFixed,
    entityMatches,
    entityCount: entities.products.length,
  };
};

/**
 * When SQL returns no rows, suggest grammar-fixed related questions.
 */
exports.suggestOnNoMatch = async ({ rawQuery, user }) => {
  const text = String(rawQuery || "").trim();
  if (!text) return { candidates: [], entityMatches: [], grammarFixed: null };

  const companyId = tenant.requireCompanyId(user);
  const entities = await loadEntityContext(companyId);
  const entityMatches = fuzzyEntityMatches(text, entities);

  let result = { candidates: templateSuggestions(text, entities, entityMatches), grammarFixed: null };
  try {
    result = await runClarify({ text, entities, entityMatches, noMatch: true });
  } catch {
    /* template fallbacks already set */
  }

  const entityNote =
    entityMatches.length > 0
      ? `No exact data match, but we found: ${entityMatches.map((m) => m.name).join(", ")}.`
      : "No matching product, category, or warehouse found in your catalog.";

  return {
    rawQuery: text,
    candidates: result.candidates,
    grammarFixed: result.grammarFixed,
    entityMatches,
    message: `${entityNote} Do you mean one of these?`,
  };
};
