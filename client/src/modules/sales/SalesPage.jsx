import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, money, qty } from "../../api/client";
import TradeTabs from "./TradeTabs";
import { isOwner, can } from "../../auth/access";
import { useAuth } from "../../auth/AuthContext";

const PAY_LABEL = {
  UNPAID: "Not paid",
  PARTIAL: "Partially paid",
  PAID: "Paid",
};

export default function SalesPage() {
  const { user } = useAuth();
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [methods, setMethods] = useState([]);
  const [salesmen, setSalesmen] = useState([]);
  const [filters, setFilters] = useState({
    from: "",
    to: "",
    productId: "",
    search: "",
    paymentMethod: "",
    createdBy: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [paying, setPaying] = useState(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("");

  const load = async () => {
    const query = { limit: 100 };
    if (filters.from) query.from = filters.from;
    if (filters.to) query.to = filters.to;
    if (filters.productId) query.productId = filters.productId;
    if (filters.search) query.search = filters.search;
    if (filters.createdBy) query.createdBy = filters.createdBy;
    const s = await api("/api/sales", { query });
    setSales(s.data.sales || []);
  };

  useEffect(() => {
    Promise.all([
      api("/api/products", { query: { limit: 100, status: "ACTIVE" } }),
      api("/api/payment-methods"),
      isOwner(user) ? api("/api/team") : Promise.resolve({ data: { salesmen: [] } }),
    ])
      .then(([p, m, team]) => {
        setProducts(p.data.products || []);
        setMethods(m.data.paymentMethods || []);
        setSalesmen(team.data.salesmen || []);
        setPayMethod((prev) => prev || m.data.paymentMethods?.[0]?.name || "");
      })
      .catch((err) => setError(err.message));
  }, [user]);

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, [filters.from, filters.to, filters.productId, filters.createdBy]);

  const openPay = (sale) => {
    setPaying(sale);
    setPayAmount(Number(sale.remainingBalance || 0).toFixed(2));
    setPayMethod(sale.paymentMethod || methods[0]?.name || "");
    setError("");
  };

  const submitPay = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(`/api/sales/${paying.id}/payments`, {
        method: "POST",
        body: { amount: Number(payAmount), paymentMethod: payMethod },
      });
      setPaying(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const methodStats = useMemo(() => {
    const map = {};
    sales.forEach((sale) => {
      const key = sale.paymentMethod || "Unknown";
      if (!map[key]) map[key] = { count: 0, total: 0, qty: 0 };
      map[key].count += 1;
      map[key].total += Number(sale.totalAmount || 0);
      map[key].qty += (sale.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    });
    return map;
  }, [sales]);

  const visible = filters.paymentMethod
    ? sales.filter((sale) => sale.paymentMethod === filters.paymentMethod)
    : sales;

  const selectedStats = useMemo(() => {
    const count = visible.length;
    const total = visible.reduce((sum, sale) => sum + Number(sale.totalAmount || 0), 0);
    const units = visible.reduce(
      (sum, sale) =>
        sum + (sale.items || []).reduce((inner, item) => inner + Number(item.quantity || 0), 0),
      0,
    );
    return { count, total, units };
  }, [visible]);

  return (
    <>
      <div className="topbar">
        <div>
          <h1 style={{ margin: 0 }}>Sales</h1>
          <p className="muted">
            Counter sales you record in the shop. Filter by date, item, customer, or payment method.
          </p>
        </div>
        {can(user, "sales", "CREATE") ? (
          <Link className="btn saffron" to="/sell/new">Add new sale</Link>
        ) : null}
      </div>
      <TradeTabs />
      {error ? <p className="error">{error}</p> : null}

      <div className="card table-wrap">
        <div className="toolbar">
          <label className="field">
            <span>From date</span>
            <input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
          </label>
          <label className="field">
            <span>To date</span>
            <input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
          </label>
          <label className="field">
            <span>Item</span>
            <select value={filters.productId} onChange={(e) => setFilters({ ...filters, productId: e.target.value })}>
              <option value="">All items</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Payment method</span>
            <select
              value={filters.paymentMethod}
              onChange={(e) => setFilters({ ...filters, paymentMethod: e.target.value })}
            >
              <option value="">All methods</option>
              {methods.map((m) => (
                <option key={m.id} value={m.name}>{m.name}</option>
              ))}
              {Object.keys(methodStats)
                .filter((name) => !methods.some((m) => m.name === name))
                .map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
            </select>
          </label>
          {isOwner(user) ? (
            <label className="field">
              <span>Salesman</span>
              <select
                value={filters.createdBy}
                onChange={(e) => setFilters({ ...filters, createdBy: e.target.value })}
              >
                <option value="">All staff</option>
                <option value={user.id}>{user.fullName} (you)</option>
                {salesmen.map((row) => (
                  <option key={row.id} value={row.id}>{row.fullName}</option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="field">
            <span>Customer</span>
            <input
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && load()}
            />
          </label>
          <button className="btn secondary" onClick={load}>Search</button>
        </div>

        <div className="totals-box" style={{ marginBottom: 16 }}>
          <strong>
            {filters.paymentMethod ? filters.paymentMethod : "All payment methods"}
          </strong>
          <div>
            {selectedStats.count} sale{selectedStats.count === 1 ? "" : "s"} ·{" "}
            {qty(selectedStats.units)} units sold ·{" "}
            <strong>{money(selectedStats.total)} ETB</strong>
          </div>
        </div>

        <div className="chip-row" style={{ marginBottom: 16 }}>
          {Object.entries(methodStats).map(([name, stat]) => (
            <button
              key={name}
              type="button"
              className={`btn ${filters.paymentMethod === name ? "" : "secondary"}`}
              onClick={() =>
                setFilters({
                  ...filters,
                  paymentMethod: filters.paymentMethod === name ? "" : name,
                })
              }
            >
              {name}: {stat.count} · {money(stat.total)} ETB
            </button>
          ))}
        </div>

        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Invoice</th>
              <th>Salesman</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Total</th>
              <th>Method</th>
              <th>Payment</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visible.map((sale) => (
              <tr key={sale.id}>
                <td>{new Date(sale.saleDate).toLocaleDateString()}</td>
                <td>{sale.invoiceNumber}</td>
                <td>{sale.creator?.fullName || sale.creator?.username || "—"}</td>
                <td>{sale.customerName || sale.customer?.name || "Walk-in"}</td>
                <td>
                  {(sale.items || []).map((item) => (
                    <div key={item.id}>
                      {item.product?.name}: {qty(item.quantity)} {item.product?.unit} × {money(item.unitPrice)}
                    </div>
                  ))}
                </td>
                <td>{money(sale.totalAmount)} ETB</td>
                <td>{sale.paymentMethod}</td>
                <td>
                  {PAY_LABEL[sale.paymentStatus] || sale.paymentStatus}
                  <div className="muted">Paid {money(sale.paidAmount)} · left {money(sale.remainingBalance)}</div>
                </td>
                <td>
                  <div className="row-actions">
                    {Number(sale.remainingBalance || 0) > 0 ? (
                      <button type="button" className="btn saffron" onClick={() => openPay(sale)}>
                        Complete payment
                      </button>
                    ) : null}
                    <Link className="btn secondary" to={`/sell/${sale.id}`}>View</Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {visible.length === 0 ? <p className="empty muted">No sales for this filter.</p> : null}
      </div>
      {paying ? (
        <div className="modal-backdrop" onClick={() => !busy && setPaying(null)} role="presentation">
          <div className="modal-card" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h2>Complete payment</h2>
            <p className="muted">
              {paying.invoiceNumber} · remaining {money(paying.remainingBalance)} ETB
            </p>
            <form onSubmit={submitPay}>
              <label className="field">
                <span>Amount paid now</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  max={Number(paying.remainingBalance || 0)}
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  required
                />
              </label>
              <label className="field">
                <span>Payment method</span>
                <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)} required>
                  {methods.map((m) => (
                    <option key={m.id} value={m.name}>{m.name}</option>
                  ))}
                </select>
              </label>
              {error ? <p className="error">{error}</p> : null}
              <div className="modal-actions">
                <button type="button" className="btn secondary" onClick={() => setPaying(null)} disabled={busy}>
                  Cancel
                </button>
                <button className="btn saffron" disabled={busy}>
                  {busy ? "Saving…" : "Record payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
