import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, money, qty } from "../../api/client";
import InventoryLoading from "../../components/InventoryLoading";

const dateText = (value) => {
  if (!value) return "—";
  return String(value).slice(0, 10);
};

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/api/insights/dashboard")
      .then((res) => setData(res.data.dashboard))
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (!data) return <InventoryLoading message="Loading inventory..." />;

  const purchases = data.purchases || { today: { count: 0, total: 0 }, week: { count: 0, total: 0 } };
  const profit = data.grossProfit || { today: 0, week: 0 };
  const stores = data.stockByWarehouse || [];

  return (
    <>
      <div className="topbar">
        <div>
          <div className="pill">Company dashboard</div>
          <h1 style={{ margin: "8px 0 4px" }}>Stock, purchases, and profit</h1>
          <p className="muted">Your company’s live totals for today and this week.</p>
        </div>
        <div className="row-actions">
          <Link className="btn saffron" to="/buy">
            New purchase
          </Link>
          <Link className="btn secondary" to="/stock">
            Live stock
          </Link>
          <Link className="btn secondary" to="/income-statement">
            Income statement
          </Link>
        </div>
      </div>

      <section className="stock-stats">
        <article className="card stat-card">
          <span className="muted">Total stock</span>
          <b>{qty(data.totalStock)}</b>
          <small>
            {data.warehouseCount === 1
              ? "1 warehouse"
              : `${data.warehouseCount || 0} warehouses`}
          </small>
        </article>
        {stores.map((store) => (
          <article key={store.warehouseId} className="card stat-card">
            <span className="muted">{store.name}</span>
            <b>{qty(store.quantity)}</b>
            <small>
              {store.itemCount === 1 ? "1 item in store" : `${store.itemCount} items in store`}
            </small>
          </article>
        ))}
      </section>

      <section className="grid stats" style={{ marginTop: 4 }}>
        <article className="card stat-card">
          <span className="muted">Today total purchase</span>
          <b>{money(purchases.today.total)}</b>
          <small>
            {purchases.today.count === 1
              ? "1 purchase"
              : `${purchases.today.count} purchases`}
          </small>
        </article>
        <article className="card stat-card">
          <span className="muted">This week total purchase</span>
          <b>{money(purchases.week.total)}</b>
          <small>
            {purchases.week.count === 1
              ? "1 purchase"
              : `${purchases.week.count} purchases`}
          </small>
        </article>
        <article className="card stat-card">
          <span className="muted">Total low stock items</span>
          <b>{qty(data.lowStockCount || 0)}</b>
          <small>At or below reorder level</small>
        </article>
        <article className="card stat-card danger">
          <span>Out-of-stock items</span>
          <b>{qty(data.outOfStockCount || 0)}</b>
          <small>Zero quantity in a store</small>
        </article>
        <article className="card stat-card">
          <span className="muted">Recently added items</span>
          <b>{qty(data.recentlyAddedCount || 0)}</b>
          <small>New catalog items this week</small>
        </article>
        <article className="card stat-card">
          <span className="muted">Gross profit today</span>
          <b>{money(profit.today)}</b>
          <small>Sales minus cost of goods</small>
        </article>
        <article className="card stat-card">
          <span className="muted">Gross profit this week</span>
          <b>{money(profit.week)}</b>
          <small>Sales minus cost of goods</small>
        </article>
      </section>

      <section className="grid split" style={{ marginTop: 16 }}>
        <article className="card">
          <h3>Recently added items</h3>
          {(data.recentlyAdded || []).length === 0 ? (
            <p className="empty muted">No new items this week.</p>
          ) : (
            data.recentlyAdded.map((row) => (
              <div
                key={row.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "8px 0",
                  borderBottom: "1px solid var(--line)",
                }}
              >
                <div>
                  <strong>{row.name}</strong>
                  <div className="muted">
                    {[row.sku, row.brand].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <span className="muted">{dateText(row.createdAt)}</span>
              </div>
            ))
          )}
        </article>
        <article className="card">
          <h3>Recent purchases this week</h3>
          {(data.recentPurchases || []).length === 0 ? (
            <p className="empty muted">No purchases recorded this week.</p>
          ) : (
            data.recentPurchases.map((row) => (
              <div
                key={row.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "8px 0",
                  borderBottom: "1px solid var(--line)",
                }}
              >
                <div>
                  <strong>{row.orderNumber}</strong>
                  <div className="muted">
                    {[row.supplier?.name, dateText(row.orderDate)].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <strong>{money(row.totalAmount)}</strong>
              </div>
            ))
          )}
        </article>
      </section>
    </>
  );
}
