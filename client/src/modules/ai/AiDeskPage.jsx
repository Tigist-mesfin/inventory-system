import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, money } from "../../api/client";
import InventoryLoading from "../../components/InventoryLoading";

const TABS = [
  { id: "daily", label: "Daily AI Summary" },
  { id: "monthly", label: "Monthly AI Summary" },
  { id: "insights", label: "AI Insights" },
  { id: "profit", label: "Profit & Loss items" },
];

function NarrativeBox({ narrative }) {
  if (!narrative) return null;
  return (
    <article className="ai-narrative card">
      <h3 style={{ marginTop: 0 }}>{narrative.headline || "AI summary"}</h3>
      {(narrative.bullets || []).length ? (
        <ul className="ai-bullets">
          {narrative.bullets.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      ) : (
        <p className="muted">No narrative yet.</p>
      )}
    </article>
  );
}

function StatGrid({ items }) {
  return (
    <section className="grid stats ai-summary-stats">
      {items.map((item) => (
        <article key={item.label} className="card stat-card ai-stat-green">
          <span className="muted">{item.label}</span>
          <b>{item.value}</b>
        </article>
      ))}
    </section>
  );
}

function SimpleTable({ title, columns, rows, empty = "No rows" }) {
  return (
    <article className="card ai-panel-card">
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      {!rows?.length ? (
        <p className="muted">{empty}</p>
      ) : (
        <div className="ai-table-wrap">
          <table className="ai-result-table">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th key={col.key}>{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.id || row.name || i}>
                  {columns.map((col) => (
                    <td key={col.key}>{col.render ? col.render(row) : row[col.key] ?? "—"}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </article>
  );
}

export default function AiDeskPage() {
  const [tab, setTab] = useState("daily");
  const [warehouseId, setWarehouseId] = useState("");
  const [warehouses, setWarehouses] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [daily, setDaily] = useState(null);
  const [monthly, setMonthly] = useState(null);
  const [insights, setInsights] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const query = { warehouseId: warehouseId || undefined };

  const loadCore = async () => {
    const res = await api("/api/ai/dashboard", { query });
    setDashboard(res.data.dashboard);
  };

  const loadTab = async (nextTab = tab) => {
    setBusy(true);
    setError("");
    try {
      if (nextTab === "daily") {
        const res = await api("/api/ai/summary/daily", { query });
        setDaily(res.data.summary);
      } else if (nextTab === "monthly" || nextTab === "profit") {
        const res = await api("/api/ai/summary/monthly", { query });
        setMonthly(res.data.summary);
      } else if (nextTab === "insights") {
        const res = await api("/api/ai/summary/insights", { query });
        setInsights(res.data.board);
      }
    } catch (err) {
      setError(err.message || "Failed to load AI summary");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    api("/api/warehouses")
      .then((res) => setWarehouses(res.data.warehouses || []))
      .catch(() => {});
    loadCore().catch((err) => setError(err.message));
    loadTab("daily");
  }, []);

  const refresh = async () => {
    await loadCore().catch((err) => setError(err.message));
    await loadTab(tab);
  };

  const cards = dashboard?.cards || {};

  if (!dashboard && !error) return <InventoryLoading message="Loading AI desk..." />;

  return (
    <div className="ai-desk">
      <div className="topbar">
        <div>
          <h1 style={{ margin: 0 }}>AI business desk</h1>
          <p className="muted">
            Daily and monthly analysis summarized by AI from your company records.
          </p>
        </div>
        <Link className="btn saffron" to="/ai/assistant">
         NegadaStock AI Assistant
        </Link>
      </div>

      <div className="card">
        <div className="period-row ai-desk-tabs">
          {TABS.map((row) => (
            <button
              key={row.id}
              type="button"
              className={`period-chip${tab === row.id ? " active" : ""}`}
              onClick={() => {
                setTab(row.id);
                loadTab(row.id);
              }}
            >
              {row.label}
            </button>
          ))}
        </div>
        <div className="catalog-fields" style={{ marginTop: 12 }}>
          <label className="field">
            <span>Warehouse</span>
            <select
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
            >
              <option value="">All stores I can see</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </label>
        </div>
        <button type="button" className="btn" style={{ marginTop: 12 }} disabled={busy} onClick={refresh}>
          {busy ? "Refreshing…" : "Refresh analysis"}
        </button>
      </div>

      <section className="grid stats" style={{ marginTop: 16 }}>
        <article className="card stat-card"><span className="muted">Today&apos;s sales</span><b>{money(cards.todaySales)}</b></article>
        <article className="card stat-card"><span className="muted">Monthly sales</span><b>{money(cards.monthlySales)}</b></article>
        <article className="card stat-card"><span className="muted">Monthly gross profit</span><b>{money(cards.monthlyGrossProfit)}</b></article>
        <article className="card stat-card"><span className="muted">Profit margin</span><b>{cards.profitMargin == null ? "n/a" : `${cards.profitMargin}%`}</b></article>
        <article className="card stat-card"><span className="muted">Low stock items</span><b>{cards.lowStockCount ?? 0}</b></article>
        <article className="card stat-card"><span className="muted">Loss-making products</span><b>{cards.lossMakingCount ?? 0}</b></article>
        <article className="card stat-card"><span className="muted">Top product</span><b>{cards.topProduct?.name || "—"}</b><small>{cards.topProduct ? money(cards.topProduct.profit) : ""}</small></article>
        <article className="card stat-card"><span className="muted">Top salesman</span><b>{cards.topSalesman?.name || "—"}</b><small>{cards.topSalesman ? money(cards.topSalesman.revenue) : ""}</small></article>
      </section>

      {error ? <p className="error" style={{ marginTop: 12 }}>{error}</p> : null}
      {busy && !daily && !monthly && !insights ? (
        <InventoryLoading message="Building AI summary…" />
      ) : null}

      {tab === "daily" && daily ? (
        <div className="ai-summary-block">
          <NarrativeBox narrative={daily.narrative} />
          <StatGrid
            items={[
              { label: "Today's sales", value: money(daily.cards.sales) },
              { label: "Purchases", value: money(daily.cards.purchases) },
              { label: "Profit", value: money(daily.cards.profit) },
              { label: "Margin", value: daily.cards.profitMargin == null ? "n/a" : `${daily.cards.profitMargin}%` },
              { label: "Invoices", value: daily.cards.invoices ?? 0 },
              { label: "Low-stock items", value: daily.cards.lowStockCount ?? 0 },
            ]}
          />
          <div className="grid split" style={{ marginTop: 16 }}>
            <SimpleTable
              title="Stock movements today"
              columns={[
                { key: "type", label: "Type" },
                { key: "txnCount", label: "Transactions" },
                { key: "quantity", label: "Quantity", render: (r) => String(r.quantity ?? "—") },
              ]}
              rows={daily.lists.stockMovements}
            />
            <SimpleTable
              title="Top-selling products"
              columns={[
                { key: "name", label: "Item" },
                { key: "quantity", label: "Qty" },
                { key: "revenue", label: "Revenue", render: (r) => money(r.revenue) },
              ]}
              rows={daily.lists.topSelling}
            />
          </div>
          <div className="grid split" style={{ marginTop: 16 }}>
            <SimpleTable
              title="Low-stock items"
              columns={[
                { key: "name", label: "Item" },
                { key: "warehouse", label: "Store" },
                { key: "quantity", label: "On hand" },
              ]}
              rows={daily.lists.lowStock}
            />
            <SimpleTable
              title="Items giving profit today"
              columns={[
                { key: "name", label: "Item" },
                { key: "profit", label: "Profit", render: (r) => money(r.profit) },
                { key: "margin", label: "Margin", render: (r) => (r.margin == null ? "—" : `${r.margin}%`) },
              ]}
              rows={daily.lists.topProfit}
            />
          </div>
        </div>
      ) : null}

      {tab === "monthly" && monthly ? (
        <div className="ai-summary-block">
          <NarrativeBox narrative={monthly.narrative} />
          <StatGrid
            items={[
              { label: "Sales performance", value: money(monthly.cards.sales) },
              { label: "Purchase total", value: money(monthly.cards.purchases) },
              { label: "Gross profit", value: money(monthly.cards.profit) },
              { label: "COGS", value: money(monthly.cards.cogs) },
              { label: "Margin", value: monthly.cards.profitMargin == null ? "n/a" : `${monthly.cards.profitMargin}%` },
              { label: "Loss-making SKUs", value: monthly.cards.lossMakingCount ?? 0 },
            ]}
          />
          <div className="grid split" style={{ marginTop: 16 }}>
            <SimpleTable
              title="Best products"
              columns={[
                { key: "name", label: "Item" },
                { key: "profit", label: "Profit", render: (r) => money(r.profit) },
                { key: "revenue", label: "Revenue", render: (r) => money(r.revenue) },
              ]}
              rows={monthly.lists.bestProducts}
            />
            <SimpleTable
              title="Worst / loss products"
              columns={[
                { key: "name", label: "Item" },
                { key: "profit", label: "Profit", render: (r) => money(r.profit) },
                { key: "margin", label: "Margin", render: (r) => (r.margin == null ? "—" : `${r.margin}%`) },
              ]}
              rows={monthly.lists.worstProducts}
            />
          </div>
          <div className="grid split" style={{ marginTop: 16 }}>
            <SimpleTable
              title="Store performance"
              columns={[
                { key: "name", label: "Store" },
                { key: "revenue", label: "Sales", render: (r) => money(r.revenue) },
                { key: "profit", label: "Profit", render: (r) => money(r.profit) },
              ]}
              rows={monthly.lists.stores}
            />
            <SimpleTable
              title="Salesman performance"
              columns={[
                { key: "name", label: "Salesman" },
                { key: "revenue", label: "Sales", render: (r) => money(r.revenue) },
                { key: "invoices", label: "Invoices" },
              ]}
              rows={monthly.lists.salesmen}
            />
          </div>
          <div className="grid split" style={{ marginTop: 16 }}>
            <SimpleTable
              title="Fast movers"
              columns={[
                { key: "name", label: "Item" },
                { key: "quantity", label: "Qty sold" },
                { key: "revenue", label: "Revenue", render: (r) => money(r.revenue) },
              ]}
              rows={monthly.lists.fastMoving}
            />
            <SimpleTable
              title="Slow movers"
              columns={[
                { key: "name", label: "Item" },
                { key: "quantity", label: "Qty sold" },
                { key: "revenue", label: "Revenue", render: (r) => money(r.revenue) },
              ]}
              rows={monthly.lists.slowMoving}
            />
          </div>
        </div>
      ) : null}

      {tab === "profit" && monthly ? (
        <div className="ai-summary-block">
          <NarrativeBox
            narrative={{
              headline: monthly.narrative?.headline || "Profit and loss by item",
              bullets: [
                `${(monthly.lists.bestProducts || []).length} profit-leading items this month.`,
                `${(monthly.lists.worstProducts || []).length} loss-making items need attention.`,
                ...(monthly.narrative?.bullets || []).slice(0, 3),
              ],
            }}
          />
          <div className="grid split" style={{ marginTop: 16 }}>
            <SimpleTable
              title="Items giving profit"
              columns={[
                { key: "name", label: "Item" },
                { key: "quantity", label: "Qty" },
                { key: "revenue", label: "Revenue", render: (r) => money(r.revenue) },
                { key: "profit", label: "Profit", render: (r) => money(r.profit) },
                { key: "margin", label: "Margin", render: (r) => (r.margin == null ? "—" : `${r.margin}%`) },
              ]}
              rows={monthly.lists.bestProducts}
            />
            <SimpleTable
              title="Items giving loss"
              columns={[
                { key: "name", label: "Item" },
                { key: "quantity", label: "Qty" },
                { key: "revenue", label: "Revenue", render: (r) => money(r.revenue) },
                { key: "profit", label: "Loss", render: (r) => money(r.profit) },
                { key: "margin", label: "Margin", render: (r) => (r.margin == null ? "—" : `${r.margin}%`) },
              ]}
              rows={monthly.lists.worstProducts}
            />
          </div>
        </div>
      ) : null}

      {tab === "insights" && insights ? (
        <div className="ai-summary-block">
          <NarrativeBox narrative={insights.narrative} />
          <div className="ai-insight-grid">
            {(insights.prompts || []).map((prompt) => (
              <article key={prompt.id} className="card ai-insight-card">
                <h3 style={{ marginTop: 0 }}>{prompt.question}</h3>
                <p className="muted">{prompt.answerHint}</p>
                {(prompt.items || []).length === 0 ? (
                  <p className="muted">No matching items right now.</p>
                ) : (
                  <ul className="ai-insight-list">
                    {prompt.items.slice(0, 5).map((item, i) => (
                      <li key={item.id || item.name || i}>
                        <strong>{item.name || "—"}</strong>
                        <span className="muted">
                          {item.warehouse ? ` · ${item.warehouse}` : ""}
                          {item.quantity != null ? ` · qty ${item.quantity}` : ""}
                          {item.profit != null ? ` · ${money(item.profit)}` : ""}
                          {item.revenue != null && item.profit == null ? ` · ${money(item.revenue)}` : ""}
                          {item.suggestedQty != null ? ` · reorder ${item.suggestedQty}` : ""}
                          {item.reason ? ` · ${item.reason}` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {(prompt.stores || []).length ? (
                  <ul className="ai-insight-list">
                    {prompt.stores.map((store, i) => (
                      <li key={store.name || i}>
                        <strong>{store.name}</strong>
                        <span className="muted"> · profit {money(store.profit)}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <Link className="btn ai-ask-link" to={`/ai/assistant?q=${encodeURIComponent(prompt.question)}`}>
                  Ask assistant
                </Link>
              </article>
            ))}
          </div>
        </div>
      ) : null}

      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Need a custom answer?</h3>
        <p className="muted">Open the NegadaStock AI Assistant tab to ask free-form questions with Smart Clarify.</p>
        <Link className="btn saffron" to="/ai/assistant">Open negade stock AI assistant</Link>
      </div>
    </div>
  );
}
