import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, money, qty } from "../../api/client";

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/api/insights/dashboard")
      .then((res) => setData(res.data.dashboard))
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (!data) return <p className="muted">Loading the floor…</p>;

  return (
    <>
      <div className="topbar">
        <div>
          <div className="pill">Live wholesale desk</div>
          <h1 style={{ margin: "8px 0 4px" }}>Today’s floor</h1>
          <p className="muted">Sales, stock-outs, debts, and slow movers in one glance.</p>
        </div>
        <div className="row-actions">
          <Link className="btn saffron" to="/sell/new">
            New structured order
          </Link>
          <Link className="btn secondary" to="/ai">
            AI desk
          </Link>
        </div>
      </div>

      <section className="grid stats">
        <article className="card stat-card">
          <span className="muted">Today</span>
          <b>{money(data.sales.today.total)}</b>
          <small>{data.sales.today.count} invoices</small>
        </article>
        <article className="card stat-card">
          <span className="muted">This week</span>
          <b>{money(data.sales.week.total)}</b>
          <small>{data.sales.week.count} invoices</small>
        </article>
        <article className="card stat-card">
          <span className="muted">Customer credit</span>
          <b>{money(data.creditOutstanding)}</b>
          <small>{data.overdueCreditCount} overdue</small>
        </article>
        <article className="card stat-card">
          <span className="muted">Supplier payables</span>
          <b>{money(data.supplierPayables)}</b>
          <small>Money you still owe</small>
        </article>
        <article className="card stat-card">
          <span className="muted">Profit view</span>
          <b><Link to="/income-statement">Income statement</Link></b>
          <small>Sales, costs, and expenses</small>
        </article>
      </section>

      <section className="grid split" style={{ marginTop: 16 }}>
        <article className="card">
          <h3>Best sellers</h3>
          {data.bestSellers.length === 0 ? (
            <p className="empty muted">Complete a sale to see velocity.</p>
          ) : (
            data.bestSellers.map((row) => (
              <div key={row.product?.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
                <div>
                  <strong>{row.product?.name}</strong>
                  <div className="muted">
                    {[row.product?.brand, row.product?.size, row.product?.color].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <strong>{qty(row.soldQuantity)}</strong>
              </div>
            ))
          )}
        </article>
        <article className="card">
          <h3>Stock-outs & lows</h3>
          {data.lowStock.length === 0 ? (
            <p className="empty muted">No SKUs at reorder level.</p>
          ) : (
            data.lowStock.map((row) => (
              <div key={row.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
                <strong>{row.product?.name}</strong>
                <div className="muted">
                  {row.warehouse?.name} · {qty(row.available)} left
                </div>
              </div>
            ))
          )}
        </article>
      </section>

      <section className="grid split" style={{ marginTop: 16 }}>
        <article className="card">
          <h3>Dead stock</h3>
          {data.deadStock.length === 0 ? (
            <p className="empty muted">No slow movers in the last 90 days.</p>
          ) : (
            data.deadStock.map((row) => (
              <div key={row.id} style={{ padding: "8px 0" }}>
                <strong>{row.product?.name}</strong>
                <div className="muted">{row.recommendation}</div>
              </div>
            ))
          )}
        </article>
        <article className="card">
          <h3>Follow up</h3>
          {data.followUpCustomers.length === 0 ? (
            <p className="empty muted">Customers are buying regularly.</p>
          ) : (
            data.followUpCustomers.map((row) => (
              <div key={row.id} style={{ padding: "8px 0" }}>
                <strong>{row.name}</strong>
                <div className="muted">{row.phone} · {row.lastPurchaseAt ? "quiet lately" : "never purchased"}</div>
              </div>
            ))
          )}
        </article>
      </section>
    </>
  );
}
