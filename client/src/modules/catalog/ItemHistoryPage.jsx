import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api, money, qty } from "../../api/client";
import { can } from "../../auth/access";
import { useAuth } from "../../auth/AuthContext";
import InventoryLoading from "../../components/InventoryLoading";

const TABS = [
  { id: "details", label: "Item details" },
  { id: "purchases", label: "Purchase history" },
  { id: "sales", label: "Sales history" },
  { id: "stock", label: "Stock history" },
];

const emptyFilters = () => ({
  from: "",
  to: "",
  supplierId: "",
  warehouseId: "",
  customerId: "",
  createdBy: "",
  unitCost: "",
  sellingPrice: "",
});

export default function ItemHistoryPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const tab = TABS.some((row) => row.id === tabParam) ? tabParam : "purchases";
  const [history, setHistory] = useState(null);
  const [filters, setFilters] = useState(emptyFilters());
  const [applied, setApplied] = useState(emptyFilters());
  const [lookups, setLookups] = useState({
    warehouses: [],
    suppliers: [],
    customers: [],
    salesmen: [],
  });
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const setTab = (next) => setSearchParams({ tab: next });

  const load = (query) =>
    api(`/api/products/${id}/history`, { query }).then((res) => {
      setHistory(res.data.history);
      setSelectedPurchase(null);
    });

  useEffect(() => {
    Promise.all([
      api("/api/warehouses"),
      api("/api/suppliers", { query: { status: "ACTIVE" } }).catch(() => ({ data: { suppliers: [] } })),
      api("/api/customers", { query: { type: "CUSTOMER", status: "ACTIVE", limit: 200 } }).catch(() => ({ data: { customers: [] } })),
      api("/api/team").catch(() => ({ data: { salesmen: [] } })),
    ])
      .then(([w, s, c, t]) => {
        setLookups({
          warehouses: w.data.warehouses || [],
          suppliers: s.data.suppliers || [],
          customers: c.data.customers || [],
          salesmen: t.data.salesmen || [],
        });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const query = {};
    Object.entries(applied).forEach(([key, value]) => {
      if (value !== "" && value != null) query[key] = value;
    });
    load(query).catch((err) => setError(err.message));
  }, [id, applied]);

  const purchaseSummary = useMemo(() => {
    const rows = history?.purchases || [];
    const quantity = rows.reduce((sum, row) => sum + Number(row.quantity || 0), 0);
    const amount = rows.reduce((sum, row) => sum + Number(row.totalCost || 0), 0);
    const first = rows[rows.length - 1]?.date;
    const last = rows[0]?.date;
    return { count: rows.length, quantity, amount, first, last };
  }, [history]);

  const salesSummary = useMemo(() => {
    const rows = history?.sales || [];
    const quantity = rows.reduce((sum, row) => sum + Number(row.quantity || 0), 0);
    const amount = rows.reduce((sum, row) => sum + Number(row.totalSaleAmount || 0), 0);
    const first = rows[rows.length - 1]?.date;
    const last = rows[0]?.date;
    return { count: rows.length, quantity, amount, first, last };
  }, [history]);

  const removeItem = async () => {
    const name = history?.product?.name || "this item";
    if (
      !window.confirm(
        `Delete ${name}? This only works if the item has no purchase or sale history.`,
      )
    ) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api(`/api/products/${id}`, { method: "DELETE" });
      navigate("/catalog");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (error && !history) return <p className="error">{error}</p>;
  if (!history) return <InventoryLoading message="Loading inventory..." />;

  const product = history.product || {};

  return (
    <>
      <div className="topbar">
        <div>
          <h1 style={{ margin: 0 }}>{product.name}</h1>
          <p className="muted">
            When and how much this item was purchased and sold. Historical prices stay as recorded.
          </p>
        </div>
        <div className="row-actions">
          {can(user, "catalog", "DELETE") ? (
            <button type="button" className="btn danger" onClick={removeItem} disabled={busy}>
              {busy ? "Deleting…" : "Delete item"}
            </button>
          ) : null}
          <Link className="btn secondary" to="/catalog">Back to items</Link>
        </div>
      </div>
      {error ? <p className="error">{error}</p> : null}

      <div className="grid stats" style={{ marginBottom: 16 }}>
        <article
          className={`card stat-card ${tab === "purchases" ? "stat-card-selected" : ""}`}
          role="button"
          tabIndex={0}
          style={{ cursor: "pointer" }}
          onClick={() => setTab("purchases")}
        >
          <span className="muted">Purchased</span>
          <b>{qty(purchaseSummary.quantity)} {product.unit}</b>
          <small>
            {purchaseSummary.count} buy{purchaseSummary.count === 1 ? "" : "s"} · {money(purchaseSummary.amount)} ETB
            {purchaseSummary.first ? ` · ${purchaseSummary.first} → ${purchaseSummary.last}` : ""}
          </small>
        </article>
        <article
          className={`card stat-card ${tab === "sales" ? "stat-card-selected" : ""}`}
          role="button"
          tabIndex={0}
          style={{ cursor: "pointer" }}
          onClick={() => setTab("sales")}
        >
          <span className="muted">Sold</span>
          <b>{qty(salesSummary.quantity)} {product.unit}</b>
          <small>
            {salesSummary.count} sale{salesSummary.count === 1 ? "" : "s"} · {money(salesSummary.amount)} ETB
            {salesSummary.first ? ` · ${salesSummary.first} → ${salesSummary.last}` : ""}
          </small>
        </article>
      </div>

      <div className="seg" style={{ marginBottom: 16 }}>
        {TABS.map((row) => (
          <button
            key={row.id}
            type="button"
            className={`btn ${tab === row.id ? "" : "secondary"}`}
            onClick={() => setTab(row.id)}
          >
            {row.label}
          </button>
        ))}
      </div>

      {tab === "details" ? (
        <section className="card">
          <dl className="product-meta">
            <div><dt>SKU</dt><dd>{product.sku || "—"}</dd></div>
            <div><dt>Unit</dt><dd>{product.unit}</dd></div>
            <div><dt>Current selling price</dt><dd>{money(product.sellingPrice)} ETB</dd></div>
            <div><dt>Catalog purchase price</dt><dd>{money(product.purchasePrice)} ETB</dd></div>
            <div><dt>Brand</dt><dd>{product.brand || "—"}</dd></div>
          </dl>
          <p className="muted">
            The catalog purchase price is only a default. Each purchase below keeps its own unit cost.
          </p>
        </section>
      ) : null}

      {tab === "purchases" ? (
        <section className="card">
          <div className="toolbar">
            <label className="field">
              <span>From</span>
              <input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
            </label>
            <label className="field">
              <span>To</span>
              <input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
            </label>
            <label className="field">
              <span>Supplier</span>
              <select value={filters.supplierId} onChange={(e) => setFilters({ ...filters, supplierId: e.target.value })}>
                <option value="">All</option>
                {lookups.suppliers.map((row) => (
                  <option key={row.id} value={row.id}>{row.name}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Store</span>
              <select value={filters.warehouseId} onChange={(e) => setFilters({ ...filters, warehouseId: e.target.value })}>
                <option value="">All</option>
                {lookups.warehouses.map((row) => (
                  <option key={row.id} value={row.id}>{row.name}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Purchase price</span>
              <input type="number" min="0" step="0.01" value={filters.unitCost} onChange={(e) => setFilters({ ...filters, unitCost: e.target.value })} />
            </label>
            <button type="button" className="btn secondary" onClick={() => setApplied({ ...filters })}>Apply</button>
            <button type="button" className="btn ghost" onClick={() => { setFilters(emptyFilters()); setApplied(emptyFilters()); }}>Clear</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Supplier</th>
                  <th>Store</th>
                  <th>Qty</th>
                  <th>Unit cost</th>
                  <th>Total cost</th>
                  <th>Sold</th>
                  <th>Remaining</th>
                  <th>Reference</th>
                </tr>
              </thead>
              <tbody>
                {(history.purchases || []).map((row) => (
                  <tr key={row.id} className={selectedPurchase?.id === row.id ? "low-stock" : undefined}>
                    <td>{row.date}</td>
                    <td>{row.supplier}</td>
                    <td>{row.store}</td>
                    <td>{qty(row.quantity)} {product.unit}</td>
                    <td>{money(row.unitCost)} ETB</td>
                    <td>{money(row.totalCost)} ETB</td>
                    <td>{qty(row.soldQuantity)}</td>
                    <td>{qty(row.remainingQuantity)}</td>
                    <td>
                      <button type="button" className="btn ghost" onClick={() => setSelectedPurchase(row)}>
                        {row.document}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(history.purchases || []).length === 0 ? <p className="empty muted">No purchases for this filter.</p> : (
            <p className="totals-box" style={{ marginTop: 12 }}>
              Purchased {qty(purchaseSummary.quantity)} {product.unit} across {purchaseSummary.count} buy
              {purchaseSummary.count === 1 ? "" : "s"} · {money(purchaseSummary.amount)} ETB
              {purchaseSummary.first ? ` · ${purchaseSummary.first} to ${purchaseSummary.last}` : ""}
            </p>
          )}
          {selectedPurchase ? (
            <div className="totals-box" style={{ marginTop: 16 }}>
              <h3 style={{ marginTop: 0 }}>{selectedPurchase.document}</h3>
              <p>Date {selectedPurchase.date} · Supplier {selectedPurchase.supplier} · Store {selectedPurchase.store}</p>
              <p>
                Purchased {qty(selectedPurchase.quantity)} @ {money(selectedPurchase.unitCost)} ETB
                {" · "}Total {money(selectedPurchase.totalCost)} ETB
              </p>
              <p>
                Sold from this purchase {qty(selectedPurchase.soldQuantity)} · Remaining {qty(selectedPurchase.remainingQuantity)}
              </p>
              <p className="muted">Entered by {selectedPurchase.createdBy || "—"}</p>
            </div>
          ) : null}
        </section>
      ) : null}

      {tab === "sales" ? (
        <section className="card">
          <div className="toolbar">
            <label className="field">
              <span>From</span>
              <input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
            </label>
            <label className="field">
              <span>To</span>
              <input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
            </label>
            <label className="field">
              <span>Customer</span>
              <select value={filters.customerId} onChange={(e) => setFilters({ ...filters, customerId: e.target.value })}>
                <option value="">All</option>
                {lookups.customers.map((row) => (
                  <option key={row.id} value={row.id}>{row.name}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Store</span>
              <select value={filters.warehouseId} onChange={(e) => setFilters({ ...filters, warehouseId: e.target.value })}>
                <option value="">All</option>
                {lookups.warehouses.map((row) => (
                  <option key={row.id} value={row.id}>{row.name}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Salesperson</span>
              <select value={filters.createdBy} onChange={(e) => setFilters({ ...filters, createdBy: e.target.value })}>
                <option value="">All</option>
                {lookups.salesmen.map((row) => (
                  <option key={row.id} value={row.id}>{row.fullName}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Selling price</span>
              <input type="number" min="0" step="0.01" value={filters.sellingPrice} onChange={(e) => setFilters({ ...filters, sellingPrice: e.target.value })} />
            </label>
            <button type="button" className="btn secondary" onClick={() => setApplied({ ...filters })}>Apply</button>
            <button type="button" className="btn ghost" onClick={() => { setFilters(emptyFilters()); setApplied(emptyFilters()); }}>Clear</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Store</th>
                  <th>Salesperson</th>
                  <th>Qty</th>
                  <th>Selling price</th>
                  <th>Total sale</th>
                  <th>Purchase cost</th>
                  <th>Profit/Loss</th>
                  <th>Reference</th>
                </tr>
              </thead>
              <tbody>
                {(history.sales || []).map((row) => (
                  <tr key={row.id}>
                    <td>{row.date}</td>
                    <td>{row.customer}</td>
                    <td>{row.store}</td>
                    <td>{row.salesperson}</td>
                    <td>{qty(row.quantity)} {product.unit}</td>
                    <td>{money(row.sellingPrice)} ETB</td>
                    <td>{money(row.totalSaleAmount)} ETB</td>
                    <td>{money(row.purchaseCost)} ETB</td>
                    <td>{money(row.profit)} ETB</td>
                    <td>
                      <Link to={`/sell/${row.saleId}`}>{row.document}</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(history.sales || []).length === 0 ? <p className="empty muted">No sales for this filter.</p> : (
            <p className="totals-box" style={{ marginTop: 12 }}>
              Sold {qty(salesSummary.quantity)} {product.unit} across {salesSummary.count} sale
              {salesSummary.count === 1 ? "" : "s"} · {money(salesSummary.amount)} ETB
              {salesSummary.first ? ` · ${salesSummary.first} to ${salesSummary.last}` : ""}
            </p>
          )}
        </section>
      ) : null}

      {tab === "stock" ? (
        <section className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Qty</th>
                  <th>Cost</th>
                  <th>Store</th>
                  <th>From purchase</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {(history.stock || []).map((row, index) => (
                  <tr key={`${row.id}-${index}`}>
                    <td>{row.date}</td>
                    <td>{row.type}</td>
                    <td>{row.quantity}</td>
                    <td>{row.unitCost != null ? `${money(row.unitCost)} ETB` : "—"}</td>
                    <td>{row.store || "—"}</td>
                    <td>{row.fromPurchase || "—"}</td>
                    <td>{row.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(history.stock || []).length === 0 ? <p className="empty muted">No stock movements yet.</p> : null}
        </section>
      ) : null}
    </>
  );
}
