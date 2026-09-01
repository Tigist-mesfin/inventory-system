import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, money, resolveAppName, VAT_RATE } from "../../api/client";
import InventoryLoading from "../../components/InventoryLoading";

const PERIODS = [
  { value: "all_time", label: "All time" },
  { value: "today", label: "Today" },
  { value: "this_week", label: "This week" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "this_year", label: "This year" },
  { value: "custom", label: "Custom range" },
];

const CATEGORY_LABELS = {
  RENT: "Rent & Lease",
  SALARY: "Salaries & Wages",
  UTILITIES: "Utilities",
  TRANSPORT: "Transportation",
  FUEL: "Fuel",
  MAINTENANCE: "Maintenance & Repairs",
  OFFICE: "Office Supplies",
  MARKETING: "Marketing & Advertising",
  BANK_FEES: "Bank & Payment Fees",
  TAX: "Taxes & Government Fees",
  INSURANCE: "Insurance",
  EQUIPMENT: "Equipment & Tools",
  DIGITAL: "Software & Subscriptions",
  PACKAGING: "Packaging Materials",
  SHIPPING: "Shipping & Delivery",
  LEGAL_ACCOUNTING: "Legal & Accounting",
  CLEANING: "Cleaning & Sanitation",
  SECURITY: "Security",
  INTEREST_FINANCE: "Interest & Finance Costs",
  OTHER: "Other",
};

const pad = (n) => String(n).padStart(2, "0");
const isoLocal = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const todayIso = () => isoLocal(new Date());

const num = (value) => Number(value || 0);
const safeMoney = (value) => money(Number.isFinite(num(value)) ? value : 0);
const pct = (value) => {
  const n = num(value);
  if (!Number.isFinite(n)) return "0.00%";
  return `${n.toFixed(2)}%`;
};

const monthLabel = (value) => {
  if (!value) return "—";
  const [year, month] = String(value).split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, { month: "long", year: "numeric" });
};

const csvEscape = (value) => {
  const text = value == null ? "" : String(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
};

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

async function openPdf({ title, subtitle, rows }) {
  const escapeHtml = (value) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  const appName = escapeHtml(await resolveAppName());
  const body = rows
    .map((row) => {
      const cls = row.bold ? " style=\"font-weight:700\"" : "";
      return `<tr${cls}><td>${escapeHtml(row.account)}</td><td style="text-align:right">${escapeHtml(row.amount)}</td><td style="text-align:right">${escapeHtml(row.pct)}</td></tr>`;
    })
    .join("");
  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    @page { margin: 16mm 12mm 18mm; }
    body { font-family: Arial, sans-serif; color: #122; margin: 0; padding: 0 0 36px; }
    h1 { font-size: 18px; margin: 0 0 8px; }
    p { margin: 0 0 16px; color: #456; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th, td { border: 1px solid #ccd; padding: 6px 8px; text-align: left; }
    th { background: #f3f6f6; }
    .app-name {
      margin-top: 28px; padding-top: 12px; border-top: 1px solid #ccd;
      text-align: center; font-size: 13px; font-weight: 700;
    }
    @media print {
      .app-name { position: fixed; left: 0; right: 0; bottom: 0; margin: 0; padding: 8px 0; background: #fff; }
    }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p>${escapeHtml(subtitle)}</p>
  <table>
    <thead><tr><th>Account</th><th>Amount</th><th>% of revenue</th></tr></thead>
    <tbody>${body}</tbody>
  </table>
  <footer class="app-name">${appName}</footer>
</body>
</html>`;
  const popup = window.open("", "_blank", "width=1000,height=720");
  if (!popup) throw new Error("Allow pop-ups to export PDF");
  popup.document.open();
  popup.document.write(html);
  popup.document.close();
  popup.focus();
  window.setTimeout(() => {
    try {
      popup.print();
    } catch {
      /* ignore */
    }
  }, 200);
}

function StatementRow({ account, amount, pctOf, strong, indent, net, loss }) {
  const className = [
    "pnl-row",
    indent ? "indent" : "",
    strong ? "subtotal" : "",
    net ? "net" : "",
    loss ? "pnl-negative" : "",
    net && !loss ? "pnl-positive" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={className}>
      <span>{account}</span>
      <strong>
        {amount}
        {pctOf != null ? <small className="muted"> · {pctOf}</small> : null}
      </strong>
    </div>
  );
}

export default function IncomeStatementPage() {
  const [period, setPeriod] = useState("all_time");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [statement, setStatement] = useState(null);
  const [vatReport, setVatReport] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);

  const load = async (nextPeriod = period, nextFrom = from, nextTo = to) => {
    setBusy(true);
    setError("");
    try {
      const query = { period: nextPeriod };
      const vatQuery = {};
      if (nextPeriod === "custom") {
        query.from = nextFrom;
        query.to = nextTo;
        vatQuery.from = nextFrom;
        vatQuery.to = nextTo;
      } else if (nextPeriod !== "all_time" && nextPeriod !== "all") {
        // income-statement resolves period dates itself; mirror for VAT via same period fields
        query.period = nextPeriod;
      }

      // For VAT report, map named periods to from/to on the client for consistency with VatDataSection
      if (nextPeriod === "all_time" || nextPeriod === "all") {
        /* leave vatQuery empty = all records */
      } else if (nextPeriod === "custom") {
        /* already set */
      } else {
        // Let income-statement handle named periods; for VAT pass period dates from response after load
      }

      const statementRes = await api("/api/expenses/income-statement", { query });
      const nextStatement = statementRes.data.statement;
      setStatement(nextStatement);

      const periodFrom = nextStatement?.period?.from
        ? String(nextStatement.period.from).slice(0, 10)
        : "";
      const periodTo = nextStatement?.period?.to
        ? String(nextStatement.period.to).slice(0, 10)
        : "";
      if (nextPeriod !== "all_time" && nextPeriod !== "all") {
        if (periodFrom) vatQuery.from = periodFrom;
        if (periodTo) vatQuery.to = periodTo;
      }

      try {
        const vatRes = await api("/api/insights/vat-report", { query: vatQuery });
        setVatReport(vatRes.data.report);
      } catch {
        setVatReport(null);
      }
    } catch (err) {
      setError(err.message);
      setStatement(null);
      setVatReport(null);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    load("all_time").catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pickPeriod = (value) => {
    setPeriod(value);
    if (value === "custom") {
      const today = todayIso();
      setFrom((prev) => prev || today);
      setTo((prev) => prev || today);
      return;
    }
    load(value).catch(() => {});
  };

  const sales = statement?.sales || {};
  const cogs = statement?.cogs || {};
  const gross = statement?.grossProfit || {};
  const opex = statement?.operatingExpenses || {};
  const opProfit = statement?.operatingProfit || {};
  const other = statement?.otherIncome || {};
  const totalRevenue = statement?.totalRevenue || {};
  const net = statement?.netIncome || {};
  const vatTotals = vatReport?.totals || {};
  const netAmount = num(net.amount);
  const isLoss = netAmount < 0 || net.result === "LOSS";

  const statementRows = useMemo(() => {
    if (!statement) return [];
    const rows = [
      { account: "REVENUE", amount: "", pct: "", bold: true },
      {
        account: "  Sales revenue",
        amount: `${safeMoney(sales.amount)} ETB`,
        pct: pct(sales.pctOfRevenue),
      },
      {
        account: "  Other income",
        amount: `${safeMoney(other.amount)} ETB`,
        pct: pct(other.pctOfRevenue),
      },
      {
        account: "Total revenue",
        amount: `${safeMoney(totalRevenue.amount)} ETB`,
        pct: "100.00%",
        bold: true,
      },
      { account: "COST OF SALES", amount: "", pct: "", bold: true },
      {
        account: "  Cost of goods sold",
        amount: `(${safeMoney(cogs.amount)} ETB)`,
        pct: pct(cogs.pctOfRevenue),
      },
      {
        account: "Total cost of sales",
        amount: `(${safeMoney(cogs.amount)} ETB)`,
        pct: pct(cogs.pctOfRevenue),
        bold: true,
      },
      {
        account: "Gross profit",
        amount: `${safeMoney(gross.amount)} ETB`,
        pct: pct(gross.marginPct),
        bold: true,
      },
      { account: "OPERATING EXPENSES", amount: "", pct: "", bold: true },
      ...(opex.byCategory || []).map((row) => ({
        account: `  ${CATEGORY_LABELS[row.category] || row.category}`,
        amount: `(${safeMoney(row.amount)} ETB)`,
        pct: "",
      })),
      {
        account: "Total operating expenses",
        amount: `(${safeMoney(opex.amount)} ETB)`,
        pct: pct(opex.pctOfRevenue),
        bold: true,
      },
      {
        account: "Operating profit",
        amount: `${safeMoney(opProfit.amount)} ETB`,
        pct: pct(opProfit.marginPct),
        bold: true,
      },
      {
        account: "Other income (added below operating profit)",
        amount: `${safeMoney(other.amount)} ETB`,
        pct: pct(other.pctOfRevenue),
      },
      {
        account: isLoss ? "Net loss" : "Net profit",
        amount: `${safeMoney(net.amount)} ETB`,
        pct: pct(net.marginPct),
        bold: true,
      },
    ];
    return rows;
  }, [statement, sales, cogs, gross, opex, opProfit, other, totalRevenue, net, isLoss]);

  const exportExcel = () => {
    if (!statementRows.length) {
      setError("Nothing to export yet");
      return;
    }
    const header = ["Account", "Amount", "% of revenue"];
    const body = statementRows.map((row) =>
      [row.account, row.amount, row.pct].map(csvEscape).join(","),
    );
    downloadBlob(
      new Blob([[header.join(","), ...body].join("\r\n")], {
        type: "text/csv;charset=utf-8",
      }),
      `income-statement-${period}.csv`,
    );
  };

  const exportPdf = async () => {
    setExporting(true);
    setError("");
    try {
      await openPdf({
        title: "Income statement",
        subtitle: `${statement?.period?.label || period} · Net ${safeMoney(net.amount)} ETB`,
        rows: statementRows,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setExporting(false);
    }
  };

  const periodLabel =
    statement?.period?.label ||
    PERIODS.find((row) => row.value === period)?.label ||
    "Period";
  const periodRangeText =
    period === "all_time"
      ? "All available records"
      : statement?.period?.from
        ? `${String(statement.period.from).slice(0, 10)} → ${String(statement.period.to).slice(0, 10)}`
        : "";

  return (
    <>
      <div className="topbar">
        <div>
          <h1 style={{ margin: 0 }}>Income statement</h1>
          <p className="muted">
            Profit &amp; loss from sales, inventory COGS, operating expenses, and other income.
          </p>
        </div>
        <div className="row-actions">
          <Link className="btn secondary" to="/other-income">
            Other income
          </Link>
          <Link className="btn secondary" to="/expenses">
            Expenses
          </Link>
        </div>
      </div>

      <section className="card no-print">
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
            className="toolbar"
            style={{ marginTop: 12 }}
            onSubmit={(e) => {
              e.preventDefault();
              load("custom", from, to).catch(() => {});
            }}
          >
            <label className="field">
              <span>Start date</span>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                required
              />
            </label>
            <label className="field">
              <span>End date</span>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                required
              />
            </label>
            <button className="btn" style={{ alignSelf: "end" }} disabled={busy}>
              {busy ? "Loading…" : "Apply"}
            </button>
          </form>
        ) : null}
        {error ? <p className="error">{error}</p> : null}
      </section>

      {busy && !statement ? (
        <InventoryLoading message="Loading income statement..." />
      ) : null}

      {statement ? (
        <>
          <p className="muted" style={{ marginTop: 12 }}>
            {periodLabel}
            {periodRangeText ? ` · ${periodRangeText}` : ""}
            {busy ? " · Updating…" : ""}
          </p>

          <section className="stock-stats" style={{ marginTop: 12 }}>
            <article className="card stat-card">
              <span className="muted">Total sales / income</span>
              <b>{safeMoney(sales.amount)} ETB</b>
              <small>{sales.count || 0} completed sales (net of VAT)</small>
            </article>
            <article className="card stat-card">
              <span className="muted">COGS</span>
              <b>{safeMoney(cogs.amount)} ETB</b>
              <small>Inventory cost at sale (not purchase totals)</small>
            </article>
            <article className="card stat-card">
              <span className="muted">Other revenue</span>
              <b>{safeMoney(other.amount)} ETB</b>
              <small>Other income records</small>
            </article>
            <article className="card stat-card">
              <span className="muted">Total expenses</span>
              <b>{safeMoney(opex.amount)} ETB</b>
              <small>Operating expenses</small>
            </article>
            <article className="card stat-card">
              <span className="muted">VAT (sales)</span>
              <b>{safeMoney(vatTotals.salesVat ?? sales.vatCollected)} ETB</b>
              <small>
                Purchases VAT {safeMoney(vatTotals.purchaseVat)} · Net{" "}
                {safeMoney(vatTotals.netVat)}
              </small>
            </article>
            <article className={`card stat-card${isLoss ? " danger" : ""}`}>
              <span className="muted">{isLoss ? "Net loss" : "Net profit"}</span>
              <b className={isLoss ? "pnl-negative" : "pnl-positive"}>
                {safeMoney(net.amount)} ETB
              </b>
              <small>Margin {pct(net.marginPct)} of total revenue</small>
            </article>
          </section>

          <div className="sale-table-actions no-print" style={{ margin: "12px 0" }}>
            <button
              type="button"
              className="btn chip secondary"
              onClick={exportExcel}
              disabled={exporting || busy}
            >
              Export to Excel
            </button>
            <button
              type="button"
              className="btn chip secondary"
              onClick={exportPdf}
              disabled={exporting || busy}
            >
              {exporting ? "Exporting…" : "Export to PDF"}
            </button>
          </div>

          <article className="card pnl-card income-statement-card" style={{ marginTop: 8 }}>
            <div className="pnl-head">
              <h2 style={{ margin: 0 }}>Income statement</h2>
              <p className="muted">{periodLabel}</p>
            </div>

            <h3 className="pnl-section">Revenue</h3>
            <StatementRow
              account="Sales revenue"
              amount={`${safeMoney(sales.amount)} ETB`}
              pctOf={pct(sales.pctOfRevenue)}
              indent
            />
            {num(sales.discountAmount) > 0 ? (
              <StatementRow
                account="Sales discounts recorded"
                amount={`${safeMoney(sales.discountAmount)} ETB`}
                indent
              />
            ) : null}
            <StatementRow
              account="Other income / other revenue"
              amount={`${safeMoney(other.amount)} ETB`}
              pctOf={pct(other.pctOfRevenue)}
              indent
            />
            <StatementRow
              account="Total revenue"
              amount={`${safeMoney(totalRevenue.amount)} ETB`}
              strong
            />

            <h3 className="pnl-section">Cost of sales</h3>
            <StatementRow
              account="Cost of goods sold"
              amount={`(${safeMoney(cogs.amount)} ETB)`}
              pctOf={pct(cogs.pctOfRevenue)}
              indent
            />
            <StatementRow
              account="Total cost of sales"
              amount={`(${safeMoney(cogs.amount)} ETB)`}
              strong
            />

            <StatementRow
              account="Gross profit"
              amount={`${safeMoney(gross.amount)} ETB`}
              pctOf={`Margin ${pct(gross.marginPct)}`}
              strong
            />

            <h3 className="pnl-section">Operating expenses</h3>
            {(opex.byCategory || []).length === 0 ? (
              <p className="muted" style={{ margin: "8px 0" }}>
                No operating expenses in this period.
              </p>
            ) : (
              (opex.byCategory || []).map((row) => (
                <StatementRow
                  key={row.category}
                  account={CATEGORY_LABELS[row.category] || row.category}
                  amount={`(${safeMoney(row.amount)} ETB)`}
                  indent
                />
              ))
            )}
            <StatementRow
              account="Total operating expenses"
              amount={`(${safeMoney(opex.amount)} ETB)`}
              strong
            />

            <StatementRow
              account="Operating profit"
              amount={`${safeMoney(opProfit.amount)} ETB`}
              pctOf={`Margin ${pct(opProfit.marginPct)}`}
              strong
            />

            <h3 className="pnl-section">Other income</h3>
            <StatementRow
              account="Total other income"
              amount={`${safeMoney(other.amount)} ETB`}
              indent
            />
            <p className="muted" style={{ fontSize: "0.9rem" }}>
              Included once in net profit (after operating profit). Also shown in Total revenue above.
            </p>

            <StatementRow
              account={isLoss ? "Net loss" : "Net profit"}
              amount={`${safeMoney(net.amount)} ETB`}
              pctOf={`Margin ${pct(net.marginPct)}`}
              net
              loss={isLoss}
            />

            <div className="card table-wrap" style={{ marginTop: 20 }}>
              <h3 style={{ marginTop: 0 }}>Statement detail</h3>
              <table>
                <thead>
                  <tr>
                    <th>Account</th>
                    <th style={{ textAlign: "right" }}>Amount</th>
                    <th style={{ textAlign: "right" }}>% of revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {statementRows.map((row) => (
                    <tr key={row.account} style={row.bold ? { fontWeight: 700 } : undefined}>
                      <td>{row.account}</td>
                      <td style={{ textAlign: "right" }}>{row.amount || "—"}</td>
                      <td style={{ textAlign: "right" }}>{row.pct || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article className="card" style={{ marginTop: 16 }}>
            <h2 style={{ marginTop: 0 }}>VAT / tax summary</h2>
            <p className="muted">
              From existing sales and purchase documents (rate {vatReport?.vatRate || statement.vatRate || VAT_RATE}%).
              Sales revenue on this statement is net; VAT is not deducted again from net profit.
            </p>
            {vatReport ? (
              <>
                <section className="stock-stats" style={{ marginTop: 8 }}>
                  <article className="card stat-card">
                    <span className="muted">VAT collected on sales</span>
                    <b>{safeMoney(vatTotals.salesVat)} ETB</b>
                  </article>
                  <article className="card stat-card">
                    <span className="muted">VAT on purchases</span>
                    <b>{safeMoney(vatTotals.purchaseVat)} ETB</b>
                  </article>
                  <article className="card stat-card">
                    <span className="muted">Net VAT position</span>
                    <b>{safeMoney(vatTotals.netVat)} ETB</b>
                    <small>Sales VAT − purchase VAT</small>
                  </article>
                </section>
                <h3>VAT by month</h3>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Month</th>
                        <th>Sales VAT</th>
                        <th>Purchase VAT</th>
                        <th>Net VAT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(vatReport.monthly || []).map((row) => (
                        <tr key={row.month}>
                          <td>{monthLabel(row.month)}</td>
                          <td>{safeMoney(row.salesVat)} ETB</td>
                          <td>{safeMoney(row.purchaseVat)} ETB</td>
                          <td>{safeMoney(row.netVat)} ETB</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {(vatReport.monthly || []).length === 0 ? (
                  <p className="empty muted">No VAT documents in this period.</p>
                ) : null}
              </>
            ) : (
              <p className="muted">
                VAT report is unavailable for your permissions or returned no data. Sales VAT on completed invoices for this period:{" "}
                {safeMoney(sales.vatCollected)} ETB.
              </p>
            )}
          </article>

          <p className="muted" style={{ marginTop: 16 }}>
            {statement.notes?.cogsBasis} {statement.notes?.purchasesNote}
          </p>
        </>
      ) : !busy && error ? null : !busy ? (
        <p className="empty muted">No financial statement data yet.</p>
      ) : null}
    </>
  );
}
