import { useEffect, useState } from "react";
import { api, qty } from "../../api/client";

const dateText = (value) => {
  if (!value) return "—";
  return String(value).slice(0, 10);
};

export default function StockPage() {
  const [rows, setRows] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [overview, setOverview] = useState({
    stores: [],
    lowStockCount: 0,
    undeliveredCount: 0,
  });
  const [filters, setFilters] = useState({
    search: "",
    warehouseId: "",
    from: "",
    to: "",
  });
  const [error, setError] = useState("");

  const loadOverview = async () => {
    const res = await api("/api/inventory/overview");
    setOverview(res.data.overview);
  };

  const load = async () => {
    try {
      setError("");
      const res = await api("/api/inventory", {
        query: { ...filters, limit: 100 },
      });
      setRows(res.data.inventory || []);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    api("/api/warehouses")
      .then((res) => setWarehouses(res.data.warehouses || []))
      .catch(() => {});
    loadOverview().catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    load();
  }, [filters.warehouseId, filters.from, filters.to]);

  return (
    <>
      <div className="topbar">
        <div>
          <h1 style={{ margin: 0 }}>Live stock</h1>
          <p className="muted">On-hand quantity by item and store, with the last delivery date.</p>
        </div>
      </div>

      <section className="stock-stats">
        {(warehouses.length ? warehouses : overview.stores).map((store) => {
          const stats = overview.stores.find((row) => row.warehouseId === (store.warehouseId || store.id))
            || { itemCount: 0, quantity: 0, name: store.name };
          return (
            <article key={store.id || store.warehouseId} className="card stat-card">
              <span className="muted">{store.name}</span>
              <b>{stats.itemCount}</b>
              <small>{qty(stats.quantity)} in store</small>
            </article>
          );
        })}
        <article className="card stat-card danger">
          <span>Low stock</span>
          <b>{overview.lowStockCount}</b>
          <small>
            {overview.lowStockCount === 1
              ? "1 item is low"
              : `${overview.lowStockCount} items are low`}
          </small>
        </article>
        <article className="card stat-card">
          <span className="muted">Not delivered to store</span>
          <b>{overview.undeliveredCount}</b>
          <small>Purchased items still waiting</small>
        </article>
      </section>

      <div className="toolbar">
        <label className="field">
          <span>Item name</span>
          <input
            placeholder="Search item name"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && load()}
          />
        </label>
        <label className="field">
          <span>Warehouse</span>
          <select
            value={filters.warehouseId}
            onChange={(e) => setFilters({ ...filters, warehouseId: e.target.value })}
          >
            <option value="">All stores</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Delivered from</span>
          <input
            type="date"
            value={filters.from}
            onChange={(e) => setFilters({ ...filters, from: e.target.value })}
          />
        </label>
        <label className="field">
          <span>Delivered to</span>
          <input
            type="date"
            value={filters.to}
            onChange={(e) => setFilters({ ...filters, to: e.target.value })}
          />
        </label>
        <button className="btn secondary" onClick={load}>Search</button>
      </div>

      {error ? <p className="error">{error}</p> : null}

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Quantity</th>
              <th>Unit</th>
              <th>Store</th>
              <th>Delivered</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className={row.isLowStock ? "low-stock" : undefined}>
                <td>
                  <strong>{row.product?.name}</strong>
                  {row.isLowStock ? <span className="pill danger" style={{ marginLeft: 8 }}>Low</span> : null}
                </td>
                <td>{qty(row.available)}</td>
                <td>{row.product?.unit}</td>
                <td>{row.warehouse?.name}</td>
                <td>{dateText(row.lastDeliveredAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? <p className="empty muted">No stock items for this filter.</p> : null}
      </div>
    </>
  );
}
