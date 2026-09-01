import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, money } from "../../api/client";
import { can } from "../../auth/access";
import { useAuth } from "../../auth/AuthContext";
import InventoryLoading from "../../components/InventoryLoading";

const CATEGORIES = [
  { value: "RENT", label: "Rent & Lease" },
  { value: "SALARY", label: "Salaries & Wages" },
  { value: "UTILITIES", label: "Utilities" },
  { value: "TRANSPORT", label: "Transportation" },
  { value: "FUEL", label: "Fuel" },
  { value: "MAINTENANCE", label: "Maintenance & Repairs" },
  { value: "OFFICE", label: "Office Supplies" },
  { value: "MARKETING", label: "Marketing & Advertising" },
  { value: "BANK_FEES", label: "Bank & Payment Fees" },
  { value: "TAX", label: "Taxes & Government Fees" },
  { value: "INSURANCE", label: "Insurance" },
  { value: "EQUIPMENT", label: "Equipment & Tools" },
  { value: "DIGITAL", label: "Software & Subscriptions" },
  { value: "PACKAGING", label: "Packaging Materials" },
  { value: "SHIPPING", label: "Shipping & Delivery" },
  { value: "LEGAL_ACCOUNTING", label: "Legal & Accounting" },
  { value: "CLEANING", label: "Cleaning & Sanitation" },
  { value: "SECURITY", label: "Security" },
  { value: "INTEREST_FINANCE", label: "Interest & Finance Costs" },
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
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("");
  const [methods, setMethods] = useState([]);
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async (
    nextPeriod = period,
    nextCategory = category,
    nextMethod = paymentMethodFilter,
  ) => {
    const query = { period: nextPeriod };
    if (nextPeriod === "custom") {
      query.from = from;
      query.to = to;
    }
    if (nextCategory) query.category = nextCategory;
    if (nextMethod) query.paymentMethod = nextMethod;
    const res = await api("/api/expenses/report", { query });
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
    load(period, category, paymentMethodFilter).catch((err) =>
      setError(err.message),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, category, paymentMethodFilter]);

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

  if (!report && !error) {
    return <InventoryLoading message="Loading expenses..." />;
  }

  const lines = report?.expenses || [];

  return (
    <>
      <div className="topbar">
        <div>
          <h1 style={{ margin: 0 }}>Expenses</h1>
          <p className="muted">Record operating costs and filter the list by date or category.</p>
        </div>
        <Link className="btn secondary" to="/other-income">
          Other income
        </Link>
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
                  <option key={row.value} value={row.value}>
                    {row.label}
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
              <span>What was it for</span>
              <input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="e.g. Shop rent for August"
                required
              />
            </label>
            <label className="field">
              <span>Paid with</span>
              {methods.length ? (
                <select
                  value={form.paymentMethod}
                  onChange={(e) =>
                    setForm({ ...form, paymentMethod: e.target.value })
                  }
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
                />
              )}
            </label>
          </div>
          {error ? <p className="error">{error}</p> : null}
          <button className="btn saffron" disabled={busy} style={{ marginTop: 12 }}>
            {busy ? "Saving…" : "Save expense"}
          </button>
        </form>
      ) : error ? (
        <p className="error">{error}</p>
      ) : null}

      <section className="card" style={{ marginTop: 16 }}>
        <div className="toolbar" style={{ marginBottom: 14 }}>
          <label className="field">
            <span>Category</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">All categories</option>
              {CATEGORIES.map((row) => (
                <option key={row.value} value={row.value}>
                  {row.label}
                </option>
              ))}
            </select>
          </label>
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
              load("custom", category, paymentMethodFilter).catch((err) =>
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
          {report?.totals?.count || 0} expenses
        </p>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Description</th>
                <th>Payment method</th>
                <th>Amount</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((row) => (
                <tr key={row.id}>
                  <td>{String(row.expenseDate).slice(0, 10)}</td>
                  <td>{categoryLabel(row.category)}</td>
                  <td>{row.description}</td>
                  <td>{row.paymentMethod || "—"}</td>
                  <td>{money(row.amount)} ETB</td>
                  <td>
                    {can(user, "finance", "DELETE") ? (
                      <button
                        type="button"
                        className="btn ghost"
                        onClick={() => remove(row)}
                      >
                        Delete
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {lines.length === 0 ? (
          <p className="empty muted">No expenses for these filters.</p>
        ) : null}
      </section>
    </>
  );
}
