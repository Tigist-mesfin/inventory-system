import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, money } from "../../api/client";

const PERIODS = [
  { value: "today", label: "Today" },
  { value: "this_week", label: "This week" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "this_year", label: "This year" },
  { value: "custom", label: "Custom dates" },
];

const CATEGORY_LABELS = {
  RENT: "Rent",
  SALARY: "Salaries",
  UTILITIES: "Utilities",
  TRANSPORT: "Transport",
  MARKETING: "Marketing",
  MAINTENANCE: "Maintenance",
  OFFICE: "Office",
  TAX: "Tax",
  OTHER: "Other",
};

const todayIso = () => new Date().toISOString().slice(0, 10);

export default function IncomeStatementPage() {
  const [period, setPeriod] = useState("this_month");
  const [from, setFrom] = useState(todayIso());
  const [to, setTo] = useState(todayIso());
  const [statement, setStatement] = useState(null);
  const [error, setError] = useState("");

  const load = async (nextPeriod = period) => {
    setError("");
    const query = { period: nextPeriod };
    if (nextPeriod === "custom") {
      query.from = from;
      query.to = to;
    }
    const res = await api("/api/expenses/income-statement", { query });
    setStatement(res.data.statement);
  };

  useEffect(() => {
    load("this_month").catch((err) => setError(err.message));
  }, []);

  const pickPeriod = (value) => {
    setPeriod(value);
    if (value !== "custom") {
      load(value).catch((err) => setError(err.message));
    }
  };

  const net = Number(statement?.netIncome?.amount || 0);
  const netClass = net >= 0 ? "pnl-positive" : "pnl-negative";

  return (
    <>
      <div className="topbar">
        <div>
          <h1 style={{ margin: 0 }}>Income statement</h1>
          <p className="muted">Sales minus cost of goods and operating expenses for the period you pick.</p>
        </div>
        <Link className="btn secondary" to="/expenses">Record expense</Link>
      </div>

      <section className="card">
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
          <form
            className="catalog-fields"
            style={{ marginTop: 12 }}
            onSubmit={(e) => {
              e.preventDefault();
              load("custom").catch((err) => setError(err.message));
            }}
          >
            <label className="field">
              <span>From</span>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} required />
            </label>
            <label className="field">
              <span>To</span>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} required />
            </label>
            <button className="btn" style={{ alignSelf: "end" }}>Show statement</button>
          </form>
        ) : null}
        {error ? <p className="error">{error}</p> : null}
      </section>

      {statement ? (
        <article className="card pnl-card" style={{ marginTop: 16 }}>
          <div className="pnl-head">
            <h2 style={{ margin: 0 }}>{statement.period?.label}</h2>
            <p className="muted">
              {String(statement.period?.from).slice(0, 10)} → {String(statement.period?.to).slice(0, 10)}
            </p>
          </div>

          <div className="pnl">
            <div className="pnl-row">
              <span>Sales ({statement.sales.count} invoices)</span>
              <strong>{money(statement.sales.amount)}</strong>
            </div>
            <div className="pnl-row deduct">
              <span>Less: Cost of goods sold</span>
              <strong>({money(statement.cogs.amount)})</strong>
            </div>
            <div className="pnl-row subtotal">
              <span>Gross profit</span>
              <strong>{money(statement.grossProfit.amount)}</strong>
            </div>
            <div className="pnl-row deduct">
              <span>Less: Operating expenses</span>
              <strong>({money(statement.operatingExpenses.amount)})</strong>
            </div>
            {(statement.operatingExpenses.byCategory || []).map((row) => (
              <div className="pnl-row indent muted" key={row.category}>
                <span>{CATEGORY_LABELS[row.category] || row.category}</span>
                <span>{money(row.amount)}</span>
              </div>
            ))}
            <div className={`pnl-row net ${netClass}`}>
              <span>Net income</span>
              <strong>{money(statement.netIncome.amount)}</strong>
            </div>
          </div>
          <p className="muted" style={{ marginBottom: 0 }}>
            Inventory purchases are counted in cost of goods when those items are sold, not as operating expenses.
            Record rent, salaries, and similar costs on the Expenses page.
          </p>
        </article>
      ) : !error ? (
        <p className="muted">Loading statement…</p>
      ) : null}
    </>
  );
}
