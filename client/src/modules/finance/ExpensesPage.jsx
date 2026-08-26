import { useEffect, useState } from "react";
import { api, money } from "../../api/client";
import { can } from "../../auth/access";
import { useAuth } from "../../auth/AuthContext";

const CATEGORIES = [
  { value: "RENT", label: "Rent" },
  { value: "SALARY", label: "Salaries" },
  { value: "UTILITIES", label: "Utilities" },
  { value: "TRANSPORT", label: "Transport" },
  { value: "MARKETING", label: "Marketing" },
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "OFFICE", label: "Office" },
  { value: "TAX", label: "Tax" },
  { value: "OTHER", label: "Other" },
];

const PERIODS = [
  { value: "today", label: "Today" },
  { value: "this_week", label: "This week" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "this_year", label: "This year" },
  { value: "custom", label: "Custom dates" },
];

const categoryLabel = (value) =>
  CATEGORIES.find((row) => row.value === value)?.label || value;

const todayIso = () => new Date().toISOString().slice(0, 10);

const emptyForm = () => ({
  expenseDate: todayIso(),
  category: "OTHER",
  description: "",
  amount: "",
  paymentMethod: "",
});

export default function ExpensesPage() {
  const { user } = useAuth();
  const [form, setForm] = useState(emptyForm());
  const [period, setPeriod] = useState("this_month");
  const [from, setFrom] = useState(todayIso());
  const [to, setTo] = useState(todayIso());
  const [category, setCategory] = useState("");
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async (nextPeriod = period) => {
    const query = { period: nextPeriod };
    if (nextPeriod === "custom") {
      query.from = from;
      query.to = to;
    }
    if (category) query.category = category;
    const res = await api("/api/expenses/report", { query });
    setReport(res.data.report);
  };

  const pickPeriod = (value) => {
    setPeriod(value);
    if (value !== "custom") {
      load(value).catch((err) => setError(err.message));
    }
  };

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/expenses", {
        method: "POST",
        body: {
          expenseDate: form.expenseDate,
          category: form.category,
          description: form.description,
          amount: Number(form.amount),
          paymentMethod: form.paymentMethod || null,
        },
      });
      setForm(emptyForm());
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (row) => {
    if (!window.confirm(`Delete expense “${row.description}”?`)) return;
    setError("");
    try {
      await api(`/api/expenses/${row.id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <div className="topbar">
        <div>
          <h1 style={{ margin: 0 }}>Expenses</h1>
          <p className="muted">Record operating costs and see totals by date.</p>
        </div>
      </div>

      {can(user, "finance", "CREATE") ? (
        <form className="card" onSubmit={submit}>
          <h2 style={{ marginTop: 0 }}>Record expense</h2>
          <div className="catalog-fields">
            <label className="field">
              <span>Date</span>
              <input
                type="date"
                value={form.expenseDate}
                onChange={(e) => setForm({ ...form, expenseDate: e.target.value })}
                required
              />
            </label>
            <label className="field">
              <span>Category</span>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                required
              >
                {CATEGORIES.map((row) => (
                  <option key={row.value} value={row.value}>{row.label}</option>
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
              <span>What was it for</span>
              <input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="e.g. Shop rent for August"
                required
              />
            </label>
            <label className="field">
              <span>Paid with <em>(optional)</em></span>
              <input
                value={form.paymentMethod}
                onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
                placeholder="Cash, Telebirr…"
              />
            </label>
          </div>
          {error ? <p className="error">{error}</p> : null}
          <button className="btn saffron" disabled={busy} style={{ marginTop: 12 }}>
            {busy ? "Saving…" : "Save expense"}
          </button>
        </form>
      ) : error ? <p className="error">{error}</p> : null}

      <section className="card" style={{ marginTop: 16 }}>
        <h2 style={{ marginTop: 0 }}>Expense report by date</h2>
        <div className="period-row">
          {PERIODS.map((row) => (
            <button
              key={row.value}
              type="button"
              className={`period-chip${period === row.value ? " active" : ""}`}
              onClick={() => pickPeriod(row.value)}
            >
              {row.label}
            </button>
          ))}
        </div>
        {period === "custom" ? (
          <div className="catalog-fields" style={{ marginTop: 12 }}>
            <label className="field">
              <span>From</span>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </label>
            <label className="field">
              <span>To</span>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </label>
          </div>
        ) : null}
        <div className="catalog-fields" style={{ marginTop: 12 }}>
          <label className="field">
            <span>Category filter</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">All categories</option>
              {CATEGORIES.map((row) => (
                <option key={row.value} value={row.value}>{row.label}</option>
              ))}
            </select>
          </label>
        </div>
        <button
          type="button"
          className="btn"
          style={{ marginTop: 12 }}
          onClick={() => load().catch((err) => setError(err.message))}
        >
          Show report
        </button>

        {report ? (
          <>
            <p className="muted" style={{ marginTop: 16 }}>
              {report.period?.label}: {money(report.totals?.amount)} across {report.totals?.count || 0} expenses
            </p>
            <h3>By date</h3>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Count</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(report.byDate || []).map((row) => (
                    <tr key={row.date}>
                      <td>{row.date}</td>
                      <td>{row.count}</td>
                      <td>{money(row.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(report.byDate || []).length === 0 ? <p className="empty muted">No expenses in this period.</p> : null}

            <h3>By category</h3>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Count</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(report.byCategory || []).map((row) => (
                    <tr key={row.category}>
                      <td>{categoryLabel(row.category)}</td>
                      <td>{row.count}</td>
                      <td>{money(row.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3>All entries</h3>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Category</th>
                    <th>Description</th>
                    <th>Amount</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {(report.expenses || []).map((row) => (
                    <tr key={row.id}>
                      <td>{String(row.expenseDate).slice(0, 10)}</td>
                      <td>{categoryLabel(row.category)}</td>
                      <td>{row.description}</td>
                      <td>{money(row.amount)}</td>
                      <td>
                        {can(user, "finance", "DELETE") ? (
                          <button type="button" className="btn danger" onClick={() => remove(row)}>
                            Delete
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </section>
    </>
  );
}
