import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Bar,
  BarChart as ReBarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../../api/client";

const SUGGESTIONS = [
  "Show my profit this month",
  "Which products are losing money?",
  "Who is my best salesman?",
  "Which warehouse is performing best?",
  "What should I purchase?",
  "Which products are not moving?",
  "የዚህ ወር ትርፌ ስንት ነው?",
  "በጣም ትርፋማ የሆነው ምርት የትኛው ነው?",
];

const CHART_COLORS = ["#0f766e", "#c2410c", "#0369a1", "#a16207", "#7c3aed", "#be123c"];

const isRtlText = (text) => /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F]/.test(String(text || ""));
const isEthiopic = (text) => /[\u1200-\u137F]/.test(String(text || ""));
const dirFor = (language, text) => {
  if (language === "ar" || language === "he") return "rtl";
  if (isRtlText(text)) return "rtl";
  return "ltr";
};
const langFor = (language, text) => {
  if (language && language !== "other") return language;
  if (isEthiopic(text)) return "am";
  return undefined;
};
const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function renderMarkdown(src) {
  const lines = String(src || "").split(/\r?\n/);
  const html = [];
  let inUl = false;
  let inOl = false;
  let inCode = false;
  let codeBuf = [];
  const closeLists = () => {
    if (inUl) {
      html.push("</ul>");
      inUl = false;
    }
    if (inOl) {
      html.push("</ol>");
      inOl = false;
    }
  };
  const inline = (text) =>
    escapeHtml(text)
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>");
  for (const line of lines) {
    if (/^```/.test(line.trim())) {
      if (inCode) {
        html.push(`<pre class="ai-code"><code>${escapeHtml(codeBuf.join("\n"))}</code></pre>`);
        codeBuf = [];
        inCode = false;
      } else {
        closeLists();
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      codeBuf.push(line);
      continue;
    }
    const trimmed = line.trim();
    if (!trimmed) {
      closeLists();
      continue;
    }
    if (/^[-*]\s+/.test(trimmed)) {
      if (!inUl) {
        closeLists();
        html.push("<ul>");
        inUl = true;
      }
      html.push(`<li>${inline(trimmed.replace(/^[-*]\s+/, ""))}</li>`);
      continue;
    }
    if (/^\d+\.\s+/.test(trimmed)) {
      if (!inOl) {
        closeLists();
        html.push("<ol>");
        inOl = true;
      }
      html.push(`<li>${inline(trimmed.replace(/^\d+\.\s+/, ""))}</li>`);
      continue;
    }
    closeLists();
    if (/^###\s+/.test(trimmed)) html.push(`<h4>${inline(trimmed.replace(/^###\s+/, ""))}</h4>`);
    else if (/^##\s+/.test(trimmed)) html.push(`<h3>${inline(trimmed.replace(/^##\s+/, ""))}</h3>`);
    else html.push(`<p>${inline(trimmed)}</p>`);
  }
  closeLists();
  if (inCode) html.push(`<pre class="ai-code"><code>${escapeHtml(codeBuf.join("\n"))}</code></pre>`);
  return html.join("");
}

const tableFromChat = (chat) => {
  if (chat?.table?.headers?.length && Array.isArray(chat.table.rows)) {
    return {
      headers: chat.table.headers.map(String),
      rows: chat.table.rows.map((row) =>
        (Array.isArray(row) ? row : Object.values(row)).map((cell) =>
          cell == null ? "" : String(cell),
        ),
      ),
    };
  }
  if (Array.isArray(chat?.rows) && chat.rows.length && typeof chat.rows[0] === "object") {
    const headers = Object.keys(chat.rows[0]).slice(0, 8);
    return {
      headers,
      rows: chat.rows.slice(0, 50).map((row) => headers.map((h) => (row[h] == null ? "" : String(row[h])))),
    };
  }
  return null;
};

const chartFromChat = (chat) => {
  if (chat?.chart?.data?.length) return chat.chart;
  const rows = chat?.rows;
  if (!Array.isArray(rows) || rows.length < 2 || typeof rows[0] !== "object") return null;
  const keys = Object.keys(rows[0]);
  const nameKey =
    keys.find((k) => /name|label|product|warehouse|date|category|sku/i.test(k)) || keys[0];
  const valueKey =
    keys.find((k) => /value|total|amount|revenue|qty|quantity|profit|count|sum/i.test(k) && k !== nameKey) ||
    keys.find((k) => k !== nameKey);
  if (!nameKey || !valueKey) return null;
  const data = rows.slice(0, 12).map((row) => ({
    name: String(row[nameKey] ?? ""),
    value: Number(row[valueKey]) || 0,
  }));
  if (data.every((d) => !d.value)) return null;
  return { type: data.length > 6 ? "bar" : "pie", title: "", data };
};

const metricsFromChat = (chat) => {
  if (Array.isArray(chat?.metrics) && chat.metrics.length) return chat.metrics;
  const kn = chat?.keyNumbers || {};
  return Object.entries(kn)
    .filter(([, v]) => v != null && v !== "")
    .slice(0, 6)
    .map(([label, value]) => ({ label, value: String(value), trend: null }));
};

function downloadCsv(filename, table) {
  if (!table?.headers?.length) return;
  const escape = (cell) => `"${String(cell).replace(/"/g, '""')}"`;
  const lines = [
    table.headers.map(escape).join(","),
    ...table.rows.map((row) => row.map(escape).join(",")),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(href);
}

function exportPdf(title, chat, table) {
  const win = window.open("", "_blank", "noopener,noreferrer,width=900,height=700");
  if (!win) return;
  const metrics = metricsFromChat(chat)
    .map((m) => `<li><strong>${escapeHtml(m.label)}:</strong> ${escapeHtml(m.value)}</li>`)
    .join("");
  const tableHtml = table
    ? `<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%;font-size:12px">
        <thead><tr>${table.headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead>
        <tbody>${table.rows
          .map((row) => `<tr>${row.map((c) => `<td>${escapeHtml(c)}</td>`).join("")}</tr>`)
          .join("")}</tbody>
      </table>`
    : "";
  win.document.write(`<!doctype html><html><head><title>${escapeHtml(title)}</title>
    <style>body{font-family:Segoe UI,Noto Sans Ethiopic,sans-serif;padding:24px;color:#1c1917}
    h1{font-size:18px} .muted{color:#78716c}</style></head><body>
    <h1>${escapeHtml(title)}</h1>
    <div>${renderMarkdown(chat.answer || "")}</div>
    ${metrics ? `<ul>${metrics}</ul>` : ""}
    ${tableHtml}
    <p class="muted">Generated ${new Date().toLocaleString()}</p>
    <script>window.onload=()=>window.print()</script>
    </body></html>`);
  win.document.close();
}

function ResultTable({ table }) {
  if (!table?.headers?.length) return null;
  return (
    <div className="ai-table-wrap">
      <table className="ai-result-table">
        <thead>
          <tr>{table.headers.map((h) => <th key={h}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {table.rows.slice(0, 50).map((row, i) => (
            <tr key={i}>{row.map((cell, j) => <td key={j}>{cell || "—"}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AiMicroChart({ chart }) {
  if (!chart?.data?.length) return null;
  const data = chart.data;
  return (
    <div className="ai-micro-chart">
      {chart.title ? <h4>{chart.title}</h4> : null}
      <ResponsiveContainer width="100%" height={220}>
        {chart.type === "pie" ? (
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={48} outerRadius={80} paddingAngle={2}>
              {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
            </Pie>
            <Tooltip />
          </PieChart>
        ) : (
          <ReBarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e7e0d4" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={50} />
            <YAxis tick={{ fontSize: 11 }} width={48} />
            <Tooltip />
            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
              {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
            </Bar>
          </ReBarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

function MetricCards({ metrics }) {
  if (!metrics?.length) return null;
  return (
    <div className="ai-metric-grid">
      {metrics.map((m, i) => {
        const trend = m.trend ? String(m.trend) : "";
        const up = /^\+/.test(trend) || /up|increase/i.test(trend);
        const down = /^-/.test(trend) || /down|decrease/i.test(trend);
        return (
          <article key={`${m.label}-${i}`} className="ai-metric-card">
            <span className="muted">{m.label}</span>
            <strong>{m.value}</strong>
            {trend ? <em className={`ai-trend${up ? " up" : ""}${down ? " down" : ""}`}>{trend}</em> : null}
          </article>
        );
      })}
    </div>
  );
}

function SuggestionPills({ title, subtitle, candidates, busy, onPick }) {
  if (!candidates?.length) return null;
  return (
    <div className="ai-clarify-pills-block">
      {title ? <p className="ai-clarify-title">{title}</p> : null}
      {subtitle ? <p className="ai-clarify-sub muted">{subtitle}</p> : null}
      <div className="ai-clarify-pills">
        {candidates.map((candidate) => (
          <button
            key={candidate}
            type="button"
            className="ai-clarify-pill"
            disabled={busy}
            dir={dirFor(null, candidate)}
            onClick={() => onPick(candidate)}
          >
            {candidate}
          </button>
        ))}
      </div>
    </div>
  );
}

function TypingDots({ label }) {
  return (
    <div className="ai-msg ai ai-thinking">
      <div className="ai-typing" aria-live="polite" aria-label="Assistant is thinking">
        <span /><span /><span />
      </div>
      <p className="muted" style={{ margin: "8px 0 0" }}>{label}</p>
    </div>
  );
}

export default function AiAssistantPage() {
  const [searchParams] = useSearchParams();
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [busyMode, setBusyMode] = useState("");
  const [isDisambiguationEnabled, setIsDisambiguationEnabled] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const threadRef = useRef(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [messages, busy]);

  const runChat = async (next, { appendUser = true, regenerateFrom } = {}) => {
    if (!next || busy) return;
    setBusy(true);
    setBusyMode("chat");
    setError("");
    if (appendUser) {
      setQuestion("");
      setMessages((prev) => [...prev, { role: "user", text: next }]);
    }
    try {
      const res = await api("/api/ai/chat", {
        method: "POST",
        body: { question: next, mode: "sql" },
      });
      const chat = { ...res.data.chat, question: next };
      setMessages((prev) => {
        if (regenerateFrom != null) {
          const copy = [...prev];
          copy[regenerateFrom] = { role: "ai", chat };
          return copy;
        }
        return [...prev, { role: "ai", chat }];
      });
    } catch (err) {
      const msg = err.message || "Something went wrong";
      const rateLimited = /429|too many|rate/i.test(msg);
      setError(rateLimited ? "You are sending questions too quickly. Please wait a moment and try again." : msg);
      const failChat = {
        answer: rateLimited
          ? "Rate limit reached. Please wait a few seconds, then ask again."
          : `I could not answer that right now: ${msg}`,
        language: "en",
        error: true,
        question: next,
      };
      setMessages((prev) => {
        if (regenerateFrom != null) {
          const copy = [...prev];
          copy[regenerateFrom] = { role: "ai", chat: failChat };
          return copy;
        }
        return [...prev, { role: "ai", chat: failChat }];
      });
    } finally {
      setBusy(false);
      setBusyMode("");
    }
  };

  const ask = async (text) => {
    const next = (text || question).trim();
    if (!next || busy) return;
    if (!isDisambiguationEnabled) {
      await runChat(next);
      return;
    }
    setBusy(true);
    setBusyMode("clarify");
    setError("");
    setQuestion("");
    setMessages((prev) => [...prev, { role: "user", text: next }]);
    try {
      const res = await api("/api/ai/clarify", { method: "POST", body: { rawQuery: next } });
      setMessages((prev) => [
        ...prev,
        {
          role: "clarify",
          rawQuery: next,
          candidates: res.data.clarify?.candidates || [],
          grammarFixed: res.data.clarify?.grammarFixed || null,
        },
      ]);
    } catch (err) {
      const msg = err.message || "Could not clarify that question";
      setError(msg);
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          chat: {
            answer: `Clarification failed: ${msg}. You can turn off Smart Clarify and ask again.`,
            language: "en",
            error: true,
          },
        },
      ]);
    } finally {
      setBusy(false);
      setBusyMode("");
    }
  };

  useEffect(() => {
    const q = searchParams.get("q");
    if (q && !startedRef.current) {
      startedRef.current = true;
      ask(q);
    }
  }, [searchParams]);

  const copyResponse = async (index, chat) => {
    const table = tableFromChat(chat);
    const text = [
      chat.answer || "",
      ...(chat.bullets || []),
      table ? [table.headers.join("\t"), ...table.rows.map((r) => r.join("\t"))].join("\n") : "",
    ]
      .filter(Boolean)
      .join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(index);
      setTimeout(() => setCopiedId(null), 1600);
    } catch {
      setError("Could not copy to clipboard");
    }
  };

  return (
    <div className="ai-desk">
      <div className="topbar">
        <div>
          <h1 style={{ margin: 0 }}>Nigd Stock AI Assistant</h1>
          <p className="muted">
            Ask free-form questions about your company data. Read-only and company-scoped.
          </p>
        </div>
        <Link className="btn" to="/ai">← AI desk</Link>
      </div>

      <section className="card ai-assistant-panel">
        <div className="ai-chat-header">
          <div>
            <h2 style={{ margin: 0 }}>Ask a question</h2>
            <p className="muted" style={{ margin: "6px 0 0" }}>
              English, አማርኛ, Afaan Oromoo, or ትግርኛ
            </p>
          </div>
        </div>

        <div className="period-row">
          {SUGGESTIONS.map((item) => (
            <button key={item} type="button" className="period-chip" disabled={busy} onClick={() => ask(item)}>
              {item}
            </button>
          ))}
        </div>

        <div className="ai-thread" ref={threadRef}>
          {!messages.length && !busy ? (
            <p className="muted ai-empty">Ask about sales, stock, purchases, expenses, or profit.</p>
          ) : null}
          {messages.map((msg, index) => {
            if (msg.role === "user") {
              return (
                <div key={index} className="ai-msg user" dir={dirFor(null, msg.text)} lang={langFor(null, msg.text)}>
                  <p>{msg.text}</p>
                </div>
              );
            }
            if (msg.role === "clarify") {
              return (
                <div key={index} className="ai-msg ai ai-clarify" dir="ltr">
                  <SuggestionPills
                    title="Pick the question you meant:"
                    subtitle={msg.grammarFixed ? `Corrected: “${msg.grammarFixed}”` : null}
                    candidates={msg.candidates || []}
                    busy={busy}
                    onPick={(candidate) => runChat(candidate, { appendUser: true })}
                  />
                </div>
              );
            }
            const chat = msg.chat || {};
            const answer = chat.answer || "";
            const table = tableFromChat(chat);
            const chart = chartFromChat(chat);
            const metrics = metricsFromChat(chat);
            return (
              <div
                key={index}
                className={`ai-msg ai${chat.error ? " ai-msg-error" : ""}`}
                dir={dirFor(chat.language, answer)}
                lang={langFor(chat.language, answer)}
              >
                <MetricCards metrics={metrics} />
                <div className="ai-md" dangerouslySetInnerHTML={{ __html: renderMarkdown(answer) }} />
                {chat.bullets?.length ? (
                  <ul className="ai-bullets">{chat.bullets.map((b, i) => <li key={i}>{b}</li>)}</ul>
                ) : null}
                <AiMicroChart chart={chart} />
                <ResultTable table={table} />
                {chat.noMatch && chat.suggestions?.length ? (
                  <SuggestionPills
                    title="No match found. Do you mean:"
                    subtitle={
                      chat.grammarFixed
                        ? `Corrected: “${chat.grammarFixed}”`
                        : chat.entityMatches?.length
                          ? `Related in your catalog: ${chat.entityMatches.map((m) => m.name).join(", ")}`
                          : null
                    }
                    candidates={chat.suggestions}
                    busy={busy}
                    onPick={(candidate) => runChat(candidate, { appendUser: true })}
                  />
                ) : null}
                <div className="ai-msg-actions">
                  <button type="button" className="ai-action-btn" onClick={() => copyResponse(index, chat)}>
                    {copiedId === index ? "Copied" : "Copy Response"}
                  </button>
                  <button type="button" className="ai-action-btn" disabled={!table} onClick={() => downloadCsv(`ai-export-${Date.now()}.csv`, table)}>
                    Export CSV
                  </button>
                  <button type="button" className="ai-action-btn" onClick={() => exportPdf("AI assistant answer", chat, table)}>
                    Export PDF
                  </button>
                  <button
                    type="button"
                    className="ai-action-btn"
                    disabled={busy || !chat.question}
                    onClick={() => runChat(chat.question, { appendUser: false, regenerateFrom: index })}
                  >
                    Regenerate
                  </button>
                </div>
                <small className="muted">
                  {chat.source?.companyScoped ? "Company scoped · " : ""}
                  {chat.rowCount != null ? `${chat.rowCount} rows · ` : ""}
                  updated {chat.source?.lastUpdated || "—"}
                </small>
              </div>
            );
          })}
          {busy ? (
            <TypingDots
              label={busyMode === "clarify" ? "Fixing grammar and clarifying…" : "Analyzing your company data…"}
            />
          ) : null}
        </div>

        <div className="ai-form-toolbar">
          <label className={`ai-toggle${isDisambiguationEnabled ? " on" : ""}`}>
            <input
              type="checkbox"
              checked={isDisambiguationEnabled}
              onChange={(e) => setIsDisambiguationEnabled(e.target.checked)}
            />
            <span className="ai-toggle-track" aria-hidden="true"><span className="ai-toggle-thumb" /></span>
            <span className="ai-toggle-label">✨ Smart Clarify &amp; Grammar Check</span>
          </label>
          <span className="muted ai-form-hint">
            {isDisambiguationEnabled
              ? "We fix typos first, then you pick the best question."
              : "If nothing matches, we still suggest related questions."}
          </span>
        </div>

        <form
          className="ai-chat-form"
          onSubmit={(e) => {
            e.preventDefault();
            ask();
          }}
        >
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={isDisambiguationEnabled ? "Type roughly — we will clarify first…" : "Ask about your inventory…"}
            disabled={busy}
            dir={dirFor(null, question)}
            maxLength={800}
          />
          <button className="btn saffron" disabled={busy || !question.trim()}>
            {busy ? "Thinking…" : isDisambiguationEnabled ? "Clarify" : "Ask"}
          </button>
        </form>
        {error ? <p className="error">{error}</p> : null}
      </section>
    </div>
  );
}
