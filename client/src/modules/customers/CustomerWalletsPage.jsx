import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, money } from "../../api/client";
import { can } from "../../auth/access";
import { useAuth } from "../../auth/AuthContext";
import InventoryLoading from "../../components/InventoryLoading";

const TYPE_LABEL = {
  DEPOSIT: "Deposit",
  SALE: "Sale deduct",
  REFUND: "Refund",
};

const today = () => new Date().toISOString().slice(0, 10);

export default function CustomerWalletsPage() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [methods, setMethods] = useState([]);
  const [filters, setFilters] = useState({ search: "", customerId: "", type: "" });
  const [form, setForm] = useState({
    customerId: "",
    amount: "",
    method: "CASH",
    reason: "",
    paidAt: today(),
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  const load = async (nextFilters = filters) => {
    const query = { limit: 100 };
    if (nextFilters.search) query.search = nextFilters.search;
    if (nextFilters.customerId) query.customerId = nextFilters.customerId;
    if (nextFilters.type) query.type = nextFilters.type;
    const [wallets, history] = await Promise.all([
      api("/api/customers/wallets"),
      api("/api/customers/wallet-transactions", { query }),
    ]);
    setCustomers(wallets.data.customers || []);
    setTransactions(history.data.transactions || []);
  };

  useEffect(() => {
    Promise.all([
      load(),
      api("/api/payment-methods", { query: { status: "ACTIVE" } }),
    ])
      .then(([, m]) => {
        const rows = m.data.paymentMethods || [];
        setMethods(rows);
        setForm((prev) => ({
          ...prev,
          method: prev.method || rows[0]?.name || "CASH",
        }));
      })
      .catch((err) => setError(err.message))
      .finally(() => setReady(true));
  }, []);

  const selected = customers.find((row) => row.id === form.customerId);

  const recharge = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(`/api/customers/${form.customerId}/wallet`, {
        method: "POST",
        body: {
          amount: Number(form.amount),
          method: form.method,
          reason: form.reason || null,
          paidAt: form.paidAt ? new Date(`${form.paidAt}T12:00:00`).toISOString() : undefined,
        },
      });
      setForm((prev) => ({ ...prev, amount: "", reason: "" }));
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (!ready) return <InventoryLoading message="Loading inventory..." />;

  return (
    <>
      <div className="topbar">
        <div>
          <h1 style={{ margin: 0 }}>Customer wallets</h1>
          <p className="muted">
            Recharge a customer balance, then deduct it on a sale or take a direct payment.
          </p>
        </div>
        <Link className="btn secondary" to="/customers">
          Customers
        </Link>
      </div>

      {error ? <p className="error">{error}</p> : null}

      {can(user, "customers", "CREATE") ? (
        <form className="card" onSubmit={recharge} style={{ marginBottom: 18 }}>
          <h3 style={{ marginTop: 0 }}>Recharge wallet</h3>
          <div className="grid split">
            <label className="field">
              <span>Customer</span>
              <select
                value={form.customerId}
                onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                required
              >
                <option value="">Select customer</option>
                {customers.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name} · wallet {money(row.walletBalance)} ETB
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Amount (ETB)</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                required
              />
            </label>
            <label className="field">
              <span>Payment method deposited</span>
              <select
                value={form.method}
                onChange={(e) => setForm({ ...form, method: e.target.value })}
                required
              >
                {(methods.length ? methods : [{ id: "cash", name: "CASH" }]).map((row) => (
                  <option key={row.id} value={row.name}>
                    {row.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Date</span>
              <input
                type="date"
                value={form.paidAt}
                onChange={(e) => setForm({ ...form, paidAt: e.target.value })}
                required
              />
            </label>
          </div>
          <label className="field" style={{ marginTop: 12 }}>
            <span>Reason</span>
            <input
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="Advance, top-up, deposit for order…"
            />
          </label>
          {selected ? (
            <p className="muted">
              Current wallet for {selected.name}: <strong>{money(selected.walletBalance)} ETB</strong>
            </p>
          ) : null}
          <button className="btn saffron" disabled={busy} style={{ marginTop: 8 }}>
            {busy ? "Saving…" : "Save deposit"}
          </button>
        </form>
      ) : null}

      <div className="card table-wrap" style={{ marginBottom: 18 }}>
        <h3 style={{ marginTop: 0 }}>Customer balances</h3>
        <table>
          <thead>
            <tr>
              <th>Customer</th>
              <th>Phone</th>
              <th>Wallet</th>
              <th>Unpaid sales</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((row) => (
              <tr key={row.id}>
                <td>
                  <strong>{row.name}</strong>
                  {row.businessName ? <div className="muted">{row.businessName}</div> : null}
                </td>
                <td>{row.phone}</td>
                <td>
                  <strong>{money(row.walletBalance)} ETB</strong>
                </td>
                <td>{money(row.debt)} ETB</td>
              </tr>
            ))}
          </tbody>
        </table>
        {customers.length === 0 ? <p className="empty muted">No customers yet.</p> : null}
      </div>

      <div className="card table-wrap">
        <h3 style={{ marginTop: 0 }}>Wallet history</h3>
        <p className="muted">Deposits show the payment method and reason. Sales show when the wallet was deducted.</p>
        <div className="toolbar">
          <input
            placeholder="Search name, phone, method, reason"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && load()}
          />
          <select
            value={filters.customerId}
            onChange={(e) => {
              const next = { ...filters, customerId: e.target.value };
              setFilters(next);
              load(next).catch((err) => setError(err.message));
            }}
          >
            <option value="">All customers</option>
            {customers.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </select>
          <select
            value={filters.type}
            onChange={(e) => {
              const next = { ...filters, type: e.target.value };
              setFilters(next);
              load(next).catch((err) => setError(err.message));
            }}
          >
            <option value="">All types</option>
            <option value="DEPOSIT">Deposits</option>
            <option value="SALE">Sale deducts</option>
            <option value="REFUND">Refunds</option>
          </select>
          <button type="button" className="btn secondary" onClick={() => load()}>
            Search
          </button>
        </div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Customer</th>
              <th>Type</th>
              <th>Method</th>
              <th>Reason</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((row) => (
              <tr key={row.id}>
                <td>{new Date(row.occurredAt).toLocaleString()}</td>
                <td>
                  {row.customer?.name || "—"}
                  <div className="muted">{row.customer?.phone}</div>
                </td>
                <td>{TYPE_LABEL[row.type] || row.type}</td>
                <td>{row.method}</td>
                <td>
                  {row.reason || "—"}
                  {row.sale?.invoiceNumber ? (
                    <div className="muted">{row.sale.invoiceNumber}</div>
                  ) : null}
                </td>
                <td>
                  <strong>
                    {row.type === "SALE" ? "−" : "+"}
                    {money(row.amount)} ETB
                  </strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {transactions.length === 0 ? (
          <p className="empty muted">No wallet deposits or deductions yet.</p>
        ) : null}
      </div>
    </>
  );
}
