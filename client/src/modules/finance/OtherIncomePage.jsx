import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, money } from "../../api/client";
import { can } from "../../auth/access";
import { useAuth } from "../../auth/AuthContext";
import InventoryLoading from "../../components/InventoryLoading";

const PERIODS = [
  { value: "today", label: "Today" },
  { value: "this_week", label: "This week" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "this_year", label: "This year" },
  { value: "custom", label: "Custom dates" },
];

const pad2 = (n) => String(n).padStart(2, "0");
const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

const emptyForm = () => ({
  incomeDate: todayIso(),
  receivedFrom: "",
  reason: "",
  amount: "",
  paymentMethod: "",
});

export default function OtherIncomePage() {
  const { user } = useAuth();
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState(null);
  const [period, setPeriod] = useState("this_month");
  const [from, setFrom] = useState(todayIso());
  const [to, setTo] = useState(todayIso());
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("");
  const [methods, setMethods] = useState([]);
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const canCreate = can(user, "finance", "CREATE");
  const canUpdate = can(user, "finance", "UPDATE");
  const canDelete = can(user, "finance", "DELETE");

  const load = async (nextPeriod = period, nextMethod = paymentMethodFilter) => {
    const query = { period: nextPeriod };
    if (nextPeriod === "custom") {
      query.from = from;
      query.to = to;
    }
    if (nextMethod) query.paymentMethod = nextMethod;
    const res = await api("/api/other-incomes/report", { query });
    setReport(res.data.report);
  };

  useEffect(() => {
    api("/api/payment-methods", { query: { status: "ACTIVE" } })
      .then((res) => setMethods(res.data.paymentMethods || res.data.methods || []))
      .catch(() => setMethods([]));
    load().catch((err) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (period === "custom") return;
    load(period, paymentMethodFilter).catch((err) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, paymentMethodFilter]);

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm());
    setError("");
  };

  const startEdit = (row) => {
    setEditingId(row.id);
    setForm({
      incomeDate: String(row.incomeDate).slice(0, 10),
      receivedFrom: row.receivedFrom || "",
      reason: row.reason || "",
      amount: String(row.amount ?? ""),
      paymentMethod: row.paymentMethod || "",
    });
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    const body = {
      incomeDate: form.incomeDate,
      receivedFrom: form.receivedFrom,
      reason: form.reason,
      amount: Number(form.amount),
      paymentMethod: form.paymentMethod || null,
    };
    try {
      if (editingId) {
        await api(`/api/other-incomes/${editingId}`, { method: "PATCH", body });
      } else {
        await api("/api/other-incomes", { method: "POST", body });
      }
      cancelEdit();
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (row) => {
    if (!window.confirm(`Delete income from “${row.receivedFrom}”?`)) return;
    setError("");
    try {
      await api(`/api/other-incomes/${row.id}`, { method: "DELETE" });
      if (editingId === row.id) cancelEdit();
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  if (!report && !error) {
    return <InventoryLoading message="Loading other income..." />;
  }

  const lines = report?.incomes || [];
  const showForm = canCreate || (editingId && canUpdate);

  return (
    <>
      <div className="topbar">
        <div>
          <h1 style={{ margin: 0 }}>Other income</h1>
          <p className="muted">
            Record income that is not from sales — who paid, why, amount, and payment method.
          </p>
        </div>
        <Link className="btn secondary" to="/expenses">
          Expenses
        </Link>
      </div>

      {showForm ? (
        <form className="card" onSubmit={submit}>
          <h2 style={{ marginTop: 0 }}>{editingId ? "Edit income" : "Record income"}</h2>
          <div className="catalog-fields">
            <label className="field">
              <span>Date</span>
              <input
                type="date"
                value={form.incomeDate}
                onChange={(e) => setForm({ ...form, incomeDate: e.target.value })}
                required
                disabled={busy}
              />
            </label>
            <label className="field">
              <span>From who</span>
              <input
                value={form.receivedFrom}
                onChange={(e) => setForm({ ...form, receivedFrom: e.target.value })}
                placeholder="Person or company"
                required
                disabled={busy}
              />
            </label>
            <label className="field">
              <span>Reason</span>
              <input
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                placeholder="e.g. Commission, refund, service fee"
                required
                disabled={busy}
              />
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
                disabled={busy}
              />
            </label>
            <label className="field">
              <span>Payment method</span>
              {methods.length ? (
                <select
                  value={form.paymentMethod}
                  onChange={(e) =>
                    setForm({ ...form, paymentMethod: e.target.value })
                  }
                  disabled={busy}
                >
                  <option value="">Choose method</option>
                  {methods.map((row) => (
                    <option key={row.id || row.name} value={row.name}>
                      {row.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  value={form.paymentMethod}
                  onChange={(e) =>
                    setForm({ ...form, paymentMethod: e.target.value })
                  }
                  placeholder="Cash, Telebirr…"
                  disabled={busy}
                />
              )}
            </label>
          </div>
          {error ? <p className="error">{error}</p> : null}
          <div className="row-actions" style={{ marginTop: 12 }}>
            {editingId ? (
              <button type="button" className="btn secondary" onClick={cancelEdit} disabled={busy}>
                Cancel
              </button>
            ) : null}
            <button className="btn saffron" disabled={busy}>
              {busy ? "Saving…" : editingId ? "Save changes" : "Save income"}
            </button>
          </div>
        </form>
      ) : error ? (
        <p className="error">{error}</p>
      ) : null}

      <section className="card" style={{ marginTop: 16 }}>
        <div className="toolbar" style={{ marginBottom: 14 }}>
          <label className="field">
            <span>Payment method</span>
            <select
              value={paymentMethodFilter}
              onChange={(e) => setPaymentMethodFilter(e.target.value)}
            >
              <option value="">All methods</option>
              {methods.map((row) => (
                <option key={row.id || row.name} value={row.name}>
                  {row.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Start date</span>
            <input
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPeriod("custom");
              }}
            />
          </label>
          <label className="field">
            <span>End date</span>
            <input
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPeriod("custom");
              }}
            />
          </label>
        </div>

        <div className="period-row" style={{ marginBottom: 14 }}>
          {PERIODS.map((row) => (
            <button
              key={row.value}
              type="button"
              className={`period-chip${period === row.value ? " active" : ""}`}
              onClick={() => setPeriod(row.value)}
            >
              {row.label}
            </button>
          ))}
        </div>

        {period === "custom" ? (
          <button
            type="button"
            className="btn"
            style={{ marginBottom: 14 }}
            onClick={() =>
              load("custom", paymentMethodFilter).catch((err) =>
                setError(err.message),
              )
            }
          >
            Show
          </button>
        ) : null}

        <p className="muted" style={{ marginTop: 0 }}>
          {report?.period?.label || "Period"}: {money(report?.totals?.amount)} ETB
          {" · "}
          {report?.totals?.count || 0} records
        </p>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>From who</th>
                <th>Reason</th>
                <th>Payment method</th>
                <th>Amount</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((row) => (
                <tr key={row.id}>
                  <td>{String(row.incomeDate).slice(0, 10)}</td>
                  <td>{row.receivedFrom}</td>
                  <td>{row.reason}</td>
                  <td>{row.paymentMethod || "—"}</td>
                  <td>{money(row.amount)} ETB</td>
                  <td>
                    <div className="row-actions">
                      {canUpdate ? (
                        <button
                          type="button"
                          className="btn secondary"
                          disabled={busy}
                          onClick={() => startEdit(row)}
                        >
                          Edit
                        </button>
                      ) : null}
                      {canDelete ? (
                        <button
                          type="button"
                          className="btn ghost"
                          disabled={busy}
                          onClick={() => remove(row)}
                        >
                          Delete
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {lines.length === 0 ? (
          <p className="empty muted">No other income for these filters.</p>
        ) : null}
      </section>
    </>
  );
}
