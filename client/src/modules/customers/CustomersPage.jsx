import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, money } from "../../api/client";
import InventoryLoading from "../../components/InventoryLoading";

const TYPE_LABEL = {
  CUSTOMER: "Customer",
  SUPPLIER: "Supplier",
};

export default function CustomersPage() {
  const [parties, setParties] = useState([]);
  const [form, setForm] = useState({ name: "", phone: "", location: "", type: "CUSTOMER" });
  const [payment, setPayment] = useState({ partyId: "", amount: "", method: "CASH" });
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  const load = () =>
    api("/api/customers")
      .then((res) => setParties(res.data.customers || []))
      .catch((err) => setError(err.message));

  useEffect(() => {
    load().finally(() => setReady(true));
  }, []);

  if (!ready) return <InventoryLoading message="Loading inventory..." />;

  return (
    <>
      <div className="topbar">
        <div>
          <h1 style={{ margin: 0 }}>Customers & suppliers</h1>
          <p className="muted">
            Register customers and suppliers with name, phone, and address. Recharge wallets, then deduct on a sale or take a direct payment.
          </p>
        </div>
        <Link className="btn saffron" to="/customers/wallets">
          Customer wallets
        </Link>
      </div>
      {error ? <p className="error">{error}</p> : null}
      <form
        className="card"
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          try {
            await api("/api/customers", { method: "POST", body: form });
            setForm({ name: "", phone: "", location: "", type: "CUSTOMER" });
            await load();
          } catch (err) {
            setError(err.message);
          }
        }}
      >
        <h3>Register</h3>
        <div className="grid split">
          <label className="field">
            <span>Name</span>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </label>
          <label className="field">
            <span>Phone</span>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
          </label>
          <label className="field">
            <span>Address</span>
            <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </label>
          <label className="field">
            <span>Type</span>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} required>
              <option value="CUSTOMER">Customer</option>
              <option value="SUPPLIER">Supplier</option>
            </select>
          </label>
        </div>
        <button className="btn" style={{ marginTop: 12 }}>Save</button>
      </form>

      <form
        className="card"
        style={{ marginTop: 16 }}
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          try {
            await api(`/api/customers/${payment.partyId}/payments`, {
              method: "POST",
              body: { amount: Number(payment.amount), method: payment.method },
            });
            setPayment({ partyId: "", amount: "", method: "CASH" });
            await load();
          } catch (err) {
            setError(err.message);
          }
        }}
      >
        <h3>Debit / remaining payment</h3>
        <div className="grid split">
          <label className="field">
            <span>Customer or supplier</span>
            <select value={payment.partyId} onChange={(e) => setPayment({ ...payment, partyId: e.target.value })} required>
              <option value="">Select</option>
              {parties.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {TYPE_LABEL[c.type] || c.type} · remaining {money(c.debt)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Amount</span>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={payment.amount}
              onChange={(e) => setPayment({ ...payment, amount: e.target.value })}
              required
            />
          </label>
          <label className="field">
            <span>Method</span>
            <select value={payment.method} onChange={(e) => setPayment({ ...payment, method: e.target.value })}>
              <option>CASH</option>
              <option>MOBILE_MONEY</option>
              <option>BANK_TRANSFER</option>
            </select>
          </label>
        </div>
        <button className="btn saffron" style={{ marginTop: 12 }}>Record payment</button>
      </form>

      <div className="card table-wrap" style={{ marginTop: 16 }}>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Address</th>
              <th>Wallet</th>
              <th>Remaining</th>
            </tr>
          </thead>
          <tbody>
            {parties.map((c) => (
              <tr key={c.id}>
                <td>
                  <strong>{c.name}</strong>
                  <div className="muted">{c.phone}</div>
                </td>
                <td>{TYPE_LABEL[c.type] || c.type}</td>
                <td>{c.location || "—"}</td>
                <td>{c.type === "CUSTOMER" ? `${money(c.walletBalance)} ETB` : "—"}</td>
                <td>
                  <strong>{money(c.debt)}</strong>
                  <div className="muted">
                    {c.paymentStanding === "PARTIAL"
                      ? "Partially paid"
                      : c.paymentStanding === "UNPAID"
                        ? "Remaining to pay"
                        : "Settled"}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
