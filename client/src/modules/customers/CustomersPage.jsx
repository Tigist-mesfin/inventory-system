import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, money } from "../../api/client";
import InventoryLoading from "../../components/InventoryLoading";
import { can } from "../../auth/access";
import { useAuth } from "../../auth/AuthContext";

const TYPE_LABEL = {
  CUSTOMER: "Customer",
  SUPPLIER: "Supplier",
};

const emptyForm = () => ({ name: "", phone: "", location: "", type: "CUSTOMER" });

export default function CustomersPage() {
  const { user } = useAuth();
  const [parties, setParties] = useState([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState(null);
  const [payment, setPayment] = useState({ partyId: "", amount: "", method: "CASH" });
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  const canCreate = can(user, "customers", "CREATE");
  const canUpdate = can(user, "customers", "UPDATE");
  const canDelete = can(user, "customers", "DELETE");

  const load = (query = search) =>
    api("/api/customers", {
      query: {
        search: query.trim() || undefined,
        limit: 200,
      },
    })
      .then((res) => setParties(res.data.customers || []))
      .catch((err) => setError(err.message));

  useEffect(() => {
    load().finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready) return undefined;
    const timer = setTimeout(() => {
      load(search).catch(() => {});
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const startEdit = (party) => {
    setEditingId(party.id);
    setForm({
      name: party.name || "",
      phone: party.phone || "",
      location: party.location || "",
      type: party.type || "CUSTOMER",
    });
    setFormError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm());
    setFormError("");
  };

  const saveParty = async (event) => {
    event.preventDefault();
    setFormError("");
    setBusy(true);
    try {
      if (editingId) {
        await api(`/api/customers/${editingId}`, {
          method: "PATCH",
          body: {
            name: form.name,
            phone: form.phone,
            location: form.location,
          },
        });
      } else {
        await api("/api/customers", { method: "POST", body: form });
      }
      cancelEdit();
      await load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (party, status) => {
    const label = status === "INACTIVE" ? "deactivate" : "reactivate";
    if (!window.confirm(`${label[0].toUpperCase()}${label.slice(1)} ${party.name}?`)) return;
    setBusy(true);
    setError("");
    try {
      await api(`/api/customers/${party.id}`, {
        method: "PATCH",
        body: { status },
      });
      if (editingId === party.id) cancelEdit();
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const removeParty = async (party) => {
    if (!window.confirm(`Permanently delete ${party.name}? This only works if they have no history.`)) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api(`/api/customers/${party.id}`, { method: "DELETE" });
      if (editingId === party.id) cancelEdit();
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

      {(canCreate || editingId) && (
        <form className="card" onSubmit={saveParty}>
          <h3>{editingId ? "Update customer / supplier" : "Register"}</h3>
          <div className="grid split">
            <label className="field">
              <span>Name</span>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                disabled={busy}
              />
            </label>
            <label className="field">
              <span>Phone</span>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                required
                disabled={busy}
              />
            </label>
            <label className="field">
              <span>Address</span>
              <input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                disabled={busy}
              />
            </label>
            <label className="field">
              <span>Type</span>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                required
                disabled={busy || Boolean(editingId)}
              >
                <option value="CUSTOMER">Customer</option>
                <option value="SUPPLIER">Supplier</option>
              </select>
            </label>
          </div>
          {formError ? <p className="error" style={{ marginTop: 12 }}>{formError}</p> : null}
          <div className="row-actions" style={{ marginTop: 12 }}>
            {editingId ? (
              <button type="button" className="btn secondary" onClick={cancelEdit} disabled={busy}>
                Cancel
              </button>
            ) : null}
            <button className="btn" disabled={busy || (!canCreate && !editingId) || (editingId && !canUpdate)}>
              {busy ? "Saving…" : editingId ? "Save changes" : "Save"}
            </button>
          </div>
        </form>
      )}

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
              {parties
                .filter((c) => c.status !== "INACTIVE")
                .map((c) => (
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
        <div className="catalog-list-head" style={{ marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>Directory</h3>
          <label className="field" style={{ margin: 0, minWidth: 220 }}>
            <span className="muted" style={{ fontSize: 12 }}>Search by name or phone</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name or phone…"
            />
          </label>
        </div>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Address</th>
              <th>Status</th>
              <th>Wallet</th>
              <th>Remaining</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {parties.map((c) => (
              <tr key={c.id} style={c.status === "INACTIVE" ? { opacity: 0.65 } : undefined}>
                <td>
                  <strong>{c.name}</strong>
                  <div className="muted">{c.phone}</div>
                </td>
                <td>{TYPE_LABEL[c.type] || c.type}</td>
                <td>{c.location || "—"}</td>
                <td>{c.status === "INACTIVE" ? "Inactive" : "Active"}</td>
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
                <td>
                  <div className="row-actions">
                    {canUpdate ? (
                      <button type="button" className="btn secondary" disabled={busy} onClick={() => startEdit(c)}>
                        Edit
                      </button>
                    ) : null}
                    {canUpdate && c.status !== "INACTIVE" ? (
                      <button type="button" className="btn secondary" disabled={busy} onClick={() => setStatus(c, "INACTIVE")}>
                        Deactivate
                      </button>
                    ) : null}
                    {canUpdate && c.status === "INACTIVE" ? (
                      <button type="button" className="btn" disabled={busy} onClick={() => setStatus(c, "ACTIVE")}>
                        Reactivate
                      </button>
                    ) : null}
                    {canDelete ? (
                      <button type="button" className="btn secondary" disabled={busy} onClick={() => removeParty(c)}>
                        Delete
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {parties.length === 0 ? (
          <p className="empty muted">
            {search.trim() ? "No customers or suppliers match that search." : "No customers or suppliers yet."}
          </p>
        ) : null}
      </div>
    </>
  );
}
