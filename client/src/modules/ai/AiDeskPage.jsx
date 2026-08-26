import { useEffect, useState } from "react";
import { api, money } from "../../api/client";
import { isOwner } from "../../auth/access";
import { useAuth } from "../../auth/AuthContext";

const SUGGESTIONS = [
  "Show my profit this month",
  "Which products are losing money?",
  "Who is my best salesman?",
  "Which warehouse is performing best?",
  "What should I purchase?",
  "Which products are not moving?",
  "Compare this month with last month",
  "Show me sales performance by salesman",
  "Which products have the highest margin?",
  "Where am I losing money?",
  "የዚህ ወር ትርፌ ስንት ነው?",
  "በጣም ትርፋማ የሆነው ምርት የትኛው ነው?",
];

const PERIODS = [
  { value: "today", label: "Today" },
  { value: "this_week", label: "This week" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "this_year", label: "This year" },
];

function BarChart({ points }) {
  const rows = points || [];
  const max = Math.max(...rows.map((row) => Number(row.revenue || 0)), 1);
  if (!rows.length) return <p className="muted">No sales in this period.</p>;
  return (
    <div className="ai-bars">
      {rows.slice(-14).map((row) => (
        <div key={row.date} className="ai-bar-row">
          <span>{String(row.date).slice(5, 10)}</span>
          <div className="ai-bar-track">
            <div className="ai-bar-fill" style={{ width: `${(Number(row.revenue) / max) * 100}%` }} />
          </div>
          <strong>{money(row.revenue)}</strong>
        </div>
      ))}
    </div>
  );
}

export default function AiDeskPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState("this_month");
  const [warehouseId, setWarehouseId] = useState("");
  const [salesmanId, setSalesmanId] = useState("");
  const [warehouses, setWarehouses] = useState([]);
  const [salesmen, setSalesmen] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const filters = {
    period,
    warehouseId: warehouseId || undefined,
    salesmanId: salesmanId || undefined,
  };

  const load = async () => {
    const res = await api("/api/ai/dashboard", { query: filters });
    setDashboard(res.data.dashboard);
  };

  useEffect(() => {
    api("/api/warehouses")
      .then((res) => setWarehouses(res.data.warehouses || []))
      .catch(() => {});
    if (isOwner(user)) {
      api("/api/team")
        .then((res) => setSalesmen(res.data.salesmen || []))
        .catch(() => {});
    }
    load().catch((err) => setError(err.message));
  }, []);

  const ask = async (text) => {
    const next = (text || question).trim();
    if (!next) return;
    setBusy(true);
    setError("");
    setQuestion("");
    try {
      const res = await api("/api/ai/chat", {
        method: "POST",
        body: { question: next, filters },
      });
      const chat = res.data.chat;
      setMessages((prev) => [
        ...prev,
        { role: "user", text: next },
        { role: "ai", chat },
      ]);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const cards = dashboard?.cards || {};

  return (
    <div className="ai-desk">
      <div className="topbar">
        <div>
          <h1 style={{ margin: 0 }}>AI business desk</h1>
          <p className="muted">Numbers come from your sales, stock, and purchase records. The assistant never invents figures.</p>
        </div>
      </div>

      <div className="card">
        <div className="period-row">
          {PERIODS.map((row) => (
            <button
              key={row.value}
              type="button"
              className={`period-chip${period === row.value ? " active" : ""}`}
              onClick={() => setPeriod(row.value)}
            >
              {row.label}
            </button>
          ))}
        </div>
        <div className="catalog-fields" style={{ marginTop: 12 }}>
          <label className="field">
            <span>Warehouse</span>
            <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
              <option value="">All stores I can see</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </label>
          {salesmen.length ? (
            <label className="field">
              <span>Salesman</span>
              <select value={salesmanId} onChange={(e) => setSalesmanId(e.target.value)}>
                <option value="">All salesmen</option>
                {salesmen.map((s) => (
                  <option key={s.id} value={s.id}>{s.fullName}</option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
        <button type="button" className="btn" style={{ marginTop: 12 }} onClick={() => load().catch((err) => setError(err.message))}>
          Refresh dashboard
        </button>
      </div>

      <section className="grid stats" style={{ marginTop: 16 }}>
        <article className="card stat-card"><span className="muted">Today's sales</span><b>{money(cards.todaySales)}</b></article>
        <article className="card stat-card"><span className="muted">Monthly sales</span><b>{money(cards.monthlySales)}</b></article>
        <article className="card stat-card"><span className="muted">Monthly gross profit</span><b>{money(cards.monthlyGrossProfit)}</b></article>
        <article className="card stat-card"><span className="muted">Profit margin</span><b>{cards.profitMargin == null ? "n/a" : `${cards.profitMargin}%`}</b></article>
        <article className="card stat-card"><span className="muted">Inventory value</span><b>{money(cards.totalInventoryValue)}</b></article>
        <article className="card stat-card"><span className="muted">Low stock items</span><b>{cards.lowStockCount ?? 0}</b></article>
        <article className="card stat-card"><span className="muted">Dead stock value</span><b>{money(cards.deadStockValue)}</b></article>
        <article className="card stat-card"><span className="muted">Sales growth</span><b>{cards.salesGrowth == null ? "n/a" : `${cards.salesGrowth}%`}</b></article>
        <article className="card stat-card"><span className="muted">Top product</span><b>{cards.topProduct?.name || "—"}</b><small>{cards.topProduct ? money(cards.topProduct.profit) : ""}</small></article>
        <article className="card stat-card"><span className="muted">Top salesman</span><b>{cards.topSalesman?.name || "—"}</b><small>{cards.topSalesman ? money(cards.topSalesman.revenue) : ""}</small></article>
        <article className="card stat-card"><span className="muted">Top warehouse</span><b>{cards.topWarehouse?.name || "—"}</b><small>{cards.topWarehouse ? money(cards.topWarehouse.revenue) : ""}</small></article>
        <article className="card stat-card"><span className="muted">Loss-making products</span><b>{cards.lossMakingCount ?? 0}</b></article>
      </section>

      <div className="grid split" style={{ marginTop: 16 }}>
        <article className="card">
          <h3>Sales trend</h3>
          <BarChart points={dashboard?.trend?.points} />
        </article>
        <article className="card">
          <h3>AI insights</h3>
          {(dashboard?.insights || []).length === 0 ? (
            <p className="muted">Complete sales this month to generate insights.</p>
          ) : (
            (dashboard.insights || []).map((row, index) => (
              <div key={index} className="ai-insight">
                <p>{row.text}</p>
                <small className="muted">{row.period}</small>
              </div>
            ))
          )}
        </article>
      </div>

      <section className="card" style={{ marginTop: 16 }}>
        <h2 style={{ marginTop: 0 }}>Ask the assistant</h2>
        <div className="period-row">
          {SUGGESTIONS.map((item) => (
            <button key={item} type="button" className="period-chip" onClick={() => ask(item)}>
              {item}
            </button>
          ))}
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
            placeholder="English, አማርኛ, or Afaan Oromo"
          />
          <button className="btn saffron" disabled={busy}>{busy ? "Thinking…" : "Ask"}</button>
        </form>
        {error ? <p className="error">{error}</p> : null}
        <div className="ai-thread">
          {messages.map((msg, index) => (
            <div key={index} className={`ai-msg ${msg.role}`}>
              {msg.role === "user" ? (
                <p>{msg.text}</p>
              ) : (
                <>
                  <p>{msg.chat.answer}</p>
                  <dl className="ai-keys">
                    {Object.entries(msg.chat.keyNumbers || {}).map(([key, value]) =>
                      value == null ? null : (
                        <div key={key}>
                          <dt>{key}</dt>
                          <dd>{String(value)}</dd>
                        </div>
                      ),
                    )}
                  </dl>
                  <p className="muted">{msg.chat.explanation}</p>
                  <p><strong>Recommendation:</strong> {msg.chat.recommendation}</p>
                  <small className="muted">
                    {msg.chat.source?.period} · {msg.chat.source?.from} → {msg.chat.source?.to} · records {msg.chat.source?.recordsAnalyzed} · {msg.chat.source?.calculation} · updated {msg.chat.source?.lastUpdated}
                  </small>
                </>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
