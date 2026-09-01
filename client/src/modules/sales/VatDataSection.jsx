import { useEffect, useMemo, useState } from "react";
import { api, money, VAT_RATE } from "../../api/client";

const PERIODS = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "this_month", label: "This month" },
  { value: "this_year", label: "This year" },
  { value: "all", label: "All VAT" },
];

const pad = (n) => String(n).padStart(2, "0");
const isoLocal = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

function rangeFor(period, from, to) {
  const now = new Date();
  const today = isoLocal(now);
  if (period === "today") return { from: today, to: today };
  if (period === "yesterday") {
    const day = new Date(now);
    day.setDate(day.getDate() - 1);
    const key = isoLocal(day);
    return { from: key, to: key };
  }
  if (period === "this_month") {
    return { from: isoLocal(new Date(now.getFullYear(), now.getMonth(), 1)), to: today };
  }
  if (period === "this_year") {
    return { from: isoLocal(new Date(now.getFullYear(), 0, 1)), to: today };
  }
  if (period === "all") return { from: "", to: "" };
  return { from, to };
}

const monthLabel = (value) => {
  if (!value) return "—";
  const [year, month] = String(value).split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, { month: "long", year: "numeric" });
};

export default function VatDataSection({ onClose }) {
  const initial = rangeFor("this_month");
  const [period, setPeriod] = useState("this_month");
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");

  const dates = useMemo(() => rangeFor(period, from, to), [period, from, to]);

  useEffect(() => {
    const query = {};
    if (dates.from) query.from = dates.from;
    if (dates.to) query.to = dates.to;
    api("/api/insights/vat-report", { query })
      .then((res) => {
        setReport(res.data.report);
        setError("");
      })
      .catch((err) => setError(err.message));
  }, [dates.from, dates.to]);

  const pickPeriod = (value) => {
    const next = rangeFor(value, from, to);
    setPeriod(value);
    setFrom(next.from);
    setTo(next.to);
  };

  const totals = report?.totals || {};
  const rate = report?.vatRate || VAT_RATE;

  return (
    <>
      <div className="topbar">
        <div>
          <h2 style={{ margin: 0 }}>VAT data</h2>
          <p className="muted">
            VAT {rate}% on completed sales (collected) and purchases (paid to suppliers).
            Net VAT is sales VAT minus purchase VAT.
          </p>
        </div>
        {onClose ? (
          <button type="button" className="btn secondary" onClick={onClose}>
            Back to sales list
          </button>
        ) : null}
      </div>
      {error ? <p className="error">{error}</p> : null}

      <div className="period-chips">
        {PERIODS.map((row) => (
          <button
            key={row.value}
            type="button"
            className={`btn chip ${period === row.value ? "" : "secondary"}`}
            onClick={() => pickPeriod(row.value)}
          >
            {row.label}
          </button>
        ))}
      </div>

      <div className="toolbar" style={{ marginBottom: 16 }}>
        <label className="field">
          <span>From date</span>
          <input
            type="date"
            value={from}
            onChange={(e) => {
              setPeriod("custom");
              setFrom(e.target.value);
            }}
          />
        </label>
        <label className="field">
          <span>To date</span>
          <input
            type="date"
            value={to}
            onChange={(e) => {
              setPeriod("custom");
              setTo(e.target.value);
            }}
          />
        </label>
      </div>

      <div className="purchase-analytics stock-analytics" style={{ marginBottom: 16 }}>
        <article className="analytics-card">
          <span>Sales VAT collected</span>
          <b>{money(totals.salesVat)}</b>
          <small>
            {totals.salesCount || 0} sale{totals.salesCount === 1 ? "" : "s"} · {money(totals.salesTotal)} ETB
          </small>
        </article>
        <article className="analytics-card">
          <span>Purchase VAT</span>
          <b>{money(totals.purchaseVat)}</b>
          <small>
            {totals.purchaseCount || 0} purchase{totals.purchaseCount === 1 ? "" : "s"} · {money(totals.purchaseTotal)} ETB
          </small>
        </article>
        <article className="analytics-card">
          <span>Net VAT</span>
          <b>{money(totals.netVat)}</b>
          <small>Sales VAT − purchase VAT</small>
        </article>
      </div>

      <div className="card table-wrap vat-block">
        <h3 style={{ marginTop: 0 }}>VAT by month</h3>
        <table>
          <thead>
            <tr>
              <th>Month</th>
              <th>Sales total</th>
              <th>Sales VAT</th>
              <th>Purchase total</th>
              <th>Purchase VAT</th>
              <th>Net VAT</th>
            </tr>
          </thead>
          <tbody>
            {(report?.monthly || []).map((row) => (
              <tr key={row.month}>
                <td>{monthLabel(row.month)}</td>
                <td>{money(row.salesTotal)} ETB</td>
                <td>{money(row.salesVat)} ETB</td>
                <td>{money(row.purchaseTotal)} ETB</td>
                <td>{money(row.purchaseVat)} ETB</td>
                <td>{money(row.netVat)} ETB</td>
              </tr>
            ))}
          </tbody>
        </table>
        {(report?.monthly || []).length === 0 ? (
          <p className="empty muted">No VAT in this date range.</p>
        ) : null}
      </div>

      <div className="card table-wrap vat-block">
        <h3 style={{ marginTop: 0 }}>VAT on each sale</h3>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Invoice</th>
              <th>Customer</th>
              <th>Without VAT</th>
              <th>VAT {rate}%</th>
              <th>Total with VAT</th>
            </tr>
          </thead>
          <tbody>
            {(report?.sales || []).map((row) => (
              <tr key={row.id}>
                <td>{row.date}</td>
                <td>{row.document}</td>
                <td>{row.party}</td>
                <td>{money(row.net)} ETB</td>
                <td>{money(row.vat)} ETB</td>
                <td>{money(row.total)} ETB</td>
              </tr>
            ))}
          </tbody>
        </table>
        {(report?.sales || []).length === 0 ? (
          <p className="empty muted">No sales VAT in this date range.</p>
        ) : null}
      </div>

      <div className="card table-wrap vat-block">
        <h3 style={{ marginTop: 0 }}>VAT on each purchase</h3>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Purchase #</th>
              <th>Supplier</th>
              <th>Without VAT</th>
              <th>VAT {rate}%</th>
              <th>Total with VAT</th>
            </tr>
          </thead>
          <tbody>
            {(report?.purchases || []).map((row) => (
              <tr key={row.id}>
                <td>{row.date}</td>
                <td>{row.document}</td>
                <td>{row.party}</td>
                <td>{money(row.net)} ETB</td>
                <td>{money(row.vat)} ETB</td>
                <td>{money(row.total)} ETB</td>
              </tr>
            ))}
          </tbody>
        </table>
        {(report?.purchases || []).length === 0 ? (
          <p className="empty muted">No purchase VAT in this date range.</p>
        ) : null}
      </div>
    </>
  );
}
