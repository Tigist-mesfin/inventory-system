import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, money, qty } from "../../api/client";
import InventoryLoading from "../../components/InventoryLoading";
import { useAuth } from "../../auth/AuthContext";
import { can, canAny, firstAllowedPath, isOwner } from "../../auth/access";

const dateText = (value) => {
  if (!value) return "—";
  return String(value).slice(0, 10);
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const canSales = can(user, "sales", "READ");
  const canBuy = can(user, "purchasing", "READ");
  const canStock = can(user, "inventory", "READ");
  const canFinance = can(user, "finance", "READ");
  const canCatalog = can(user, "catalog", "READ");
  const canInsights = can(user, "insights", "READ");
  const canLoadDashboard = canAny(user, [
    ["sales", "READ"],
    ["purchasing", "READ"],
    ["inventory", "READ"],
    ["finance", "READ"],
    ["insights", "READ"],
  ]);

  useEffect(() => {
    if (!canLoadDashboard) {
      setData(null);
      setError("");
      return undefined;
    }
    let cancelled = false;
    api("/api/insights/dashboard")
      .then((res) => {
        if (!cancelled) setData(res.data.dashboard);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [canLoadDashboard]);

  if (!canLoadDashboard) {
    const home = firstAllowedPath(user);
    return (
      <>
        <div className="topbar">
          <div>
            <div className="pill">Your desk</div>
            <h1 style={{ margin: "8px 0 4px" }}>Welcome, {user?.fullName || "teammate"}</h1>
            <p className="muted">
              You only see modules your company owner assigned to you.
            </p>
          </div>
        </div>
        <div className="grid">
          {canSales ? (
            <Link className="card" to="/sell">
              <h3>Sales</h3>
              <p className="muted">Record and view sales</p>
            </Link>
          ) : null}
          {canBuy ? (
            <Link className="card" to="/buy">
              <h3>Purchasing</h3>
              <p className="muted">Supplier orders</p>
            </Link>
          ) : null}
          {canStock ? (
            <Link className="card" to="/stock">
              <h3>Live stock</h3>
              <p className="muted">On-hand quantities</p>
            </Link>
          ) : null}
          {canCatalog ? (
            <Link className="card" to="/catalog">
              <h3>Products</h3>
              <p className="muted">Catalog items</p>
            </Link>
          ) : null}
          {!canSales && !canBuy && !canStock && !canCatalog ? (
            <p className="muted">
              No modules assigned yet. Ask your company owner to grant access
              {home !== "/" ? (
                <>
                  {" "}
                  or open <Link to={home}>your available page</Link>
                </>
              ) : null}
              .
            </p>
          ) : null}
        </div>
      </>
    );
  }

  if (error) return <p className="error">{error}</p>;
  if (!data) return <InventoryLoading message="Loading inventory..." />;

  const purchases = data.purchases || { today: { count: 0, total: 0 }, week: { count: 0, total: 0 } };
  const profit = data.grossProfit || { today: 0, week: 0 };
  const stores = data.stockByWarehouse || [];
  const showStock = canStock || isOwner(user);
  const showPurchases = canBuy || isOwner(user);
  const showProfit = canFinance || canInsights || isOwner(user);
  const showCatalogBits = canCatalog || isOwner(user);

  return (
    <>
      <div className="topbar">
        <div>
          <div className="pill">Company dashboard</div>
          <h1 style={{ margin: "8px 0 4px" }}>Stock, purchases, and profit</h1>
          <p className="muted">Live totals for areas you can access.</p>
        </div>
        <div className="row-actions">
          {canBuy ? (
            <Link className="btn saffron" to="/buy">
              New purchase
            </Link>
          ) : null}
          {canStock ? (
            <Link className="btn secondary" to="/stock">
              Live stock
            </Link>
          ) : null}
          {canFinance ? (
            <Link className="btn secondary" to="/income-statement">
              Income statement
            </Link>
          ) : null}
          {canSales ? (
            <Link className="btn secondary" to="/sell">
              Sales
            </Link>
          ) : null}
        </div>
      </div>

      {showStock ? (
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
      ) : null}

      <section className="grid stats" style={{ marginTop: 4 }}>
        {showPurchases ? (
          <>
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
          </>
        ) : null}
        {showStock ? (
          <>
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
          </>
        ) : null}
        {showCatalogBits ? (
          <article className="card stat-card">
            <span className="muted">Recently added items</span>
            <b>{qty(data.recentlyAddedCount || 0)}</b>
            <small>New catalog items this week</small>
          </article>
        ) : null}
        {showProfit ? (
          <>
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
          </>
        ) : null}
      </section>

      {(showCatalogBits || showPurchases) && (
        <section className="grid split" style={{ marginTop: 16 }}>
          {showCatalogBits ? (
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
          ) : null}
          {showPurchases ? (
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
          ) : null}
        </section>
      )}
    </>
  );
}
