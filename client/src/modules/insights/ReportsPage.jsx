import { useEffect, useMemo, useState } from "react";
import { api, money, qty, vatOf, withVat, resolveAppName, VAT_RATE } from "../../api/client";
import { can, isOwner } from "../../auth/access";
import { useAuth } from "../../auth/AuthContext";
import ProfitReport from "./ProfitReport";
import InventoryLoading from "../../components/InventoryLoading";

const PERIODS = [
  { value: "today", label: "Today" },
  { value: "this_week", label: "This week" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "this_year", label: "This year" },
  { value: "custom", label: "Custom dates" },
];

const EXPENSE_CATEGORIES = [
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

const PAY_LABEL = {
  UNPAID: "Not paid",
  PARTIAL: "Partially paid",
  PAID: "Paid",
};

const pad = (n) => String(n).padStart(2, "0");
const isoLocal = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const todayIso = () => isoLocal(new Date());

function rangeFor(period, from, to) {
  const now = new Date();
  const today = isoLocal(now);
  if (period === "today") return { from: today, to: today };
  if (period === "this_week") {
    const start = new Date(now);
    const weekday = start.getDay() || 7;
    start.setDate(start.getDate() - weekday + 1);
    return { from: isoLocal(start), to: today };
  }
  if (period === "this_month") {
    return { from: isoLocal(new Date(now.getFullYear(), now.getMonth(), 1)), to: today };
  }
  if (period === "last_month") {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: isoLocal(start), to: isoLocal(end) };
  }
  if (period === "this_year") {
    return { from: isoLocal(new Date(now.getFullYear(), 0, 1)), to: today };
  }
  return { from, to };
}

function csvEscape(value) {
  const text = value == null ? "" : String(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function downloadCsv(filename, header, rows) {
  const body = rows.map((row) => row.map(csvEscape).join(","));
  downloadBlob(
    new Blob([[header.join(","), ...body].join("\r\n")], {
      type: "text/csv;charset=utf-8",
    }),
    filename,
  );
}

async function openPdf({ title, subtitle, headers, rows }) {
  const escapeHtml = (value) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  const appName = escapeHtml(await resolveAppName());
  const head = headers.map((key) => `<th>${escapeHtml(key)}</th>`).join("");
  const body = rows
    .map(
      (row) =>
        `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`,
    )
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
    table { width: 100%; border-collapse: collapse; font-size: 10px; }
    th, td { border: 1px solid #ccd; padding: 5px 6px; text-align: left; }
    th { background: #f3f6f6; }
    .app-name {
      margin-top: 28px;
      padding-top: 12px;
      border-top: 1px solid #ccd;
      text-align: center;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.04em;
    }
    @media print {
      .app-name {
        position: fixed;
        left: 0;
        right: 0;
        bottom: 0;
        margin: 0;
        padding: 8px 0;
        border-top: 1px solid #ccd;
        background: #fff;
      }
    }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p>${escapeHtml(subtitle)}</p>
  <table>
    <thead><tr>${head}</tr></thead>
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
  const triggerPrint = () => {
    try {
      popup.print();
    } catch {
      /* ignore */
    }
  };
  if (popup.document.readyState === "complete") {
    window.setTimeout(triggerPrint, 200);
  } else {
    popup.onload = () => window.setTimeout(triggerPrint, 200);
  }
}

const categoryLabel = (value) =>
  EXPENSE_CATEGORIES.find((row) => row.value === value)?.label || value;

const monthRange = () => rangeFor("this_month");

const emptySalesFilters = () => {
  const range = monthRange();
  return {
    period: "this_month",
    from: range.from,
    to: range.to,
    productId: "",
    customerId: "",
    warehouseId: "",
    createdBy: "",
  };
};

const emptyPurchaseFilters = () => {
  const range = monthRange();
  return {
    period: "this_month",
    from: range.from,
    to: range.to,
    productId: "",
    supplierId: "",
  };
};

const emptyExpenseFilters = () => ({
  period: "this_month",
  from: todayIso(),
  to: todayIso(),
  category: "",
});

function PurchaseReportView({ report }) {
  if (!report) return null;
  const lines = report.lines || [];
  const totals = report.totals || {};

  return (
    <div className="grid" style={{ marginTop: 16 }}>
      <section className="stock-stats">
        <article className="card stat-card">
          <span className="muted">Documents</span>
          <b>{totals.documentCount || 0}</b>
          <small>{totals.lineCount || lines.length} item lines</small>
        </article>
        <article className="card stat-card">
          <span className="muted">Amount</span>
          <b>{money(totals.amount)} ETB</b>
          <small>Before VAT</small>
        </article>
        <article className="card stat-card">
          <span className="muted">VAT {VAT_RATE}%</span>
          <b>{money(vatOf(totals.amount))} ETB</b>
          <small>Incl. VAT {money(withVat(totals.amount))} ETB</small>
        </article>
        <article className="card stat-card">
          <span className="muted">Quantity</span>
          <b>{qty(totals.quantity)}</b>
          <small>{totals.itemCount || 0} items</small>
        </article>
      </section>

      <div className="card table-wrap">
        {lines.length === 0 ? (
          <p className="empty muted">No purchases for these filters.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Document</th>
                <th>Supplier</th>
                <th>Item</th>
                <th>Qty</th>
                <th>Unit price</th>
                <th>Amount</th>
                <th>VAT</th>
                <th>Incl. VAT</th>
                <th>Payment</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((row) => (
                <tr key={row.id}>
                  <td>{row.date}</td>
                  <td>{row.document || "—"}</td>
                  <td>{row.party || "—"}</td>
                  <td>
                    <strong>{row.productName}</strong>
                    <div className="muted">
                      {[row.sku, row.unit].filter(Boolean).join(" · ")}
                    </div>
                  </td>
                  <td>
                    {qty(row.quantity)} {row.unit || ""}
                  </td>
                  <td>{money(row.unitPrice)} ETB</td>
                  <td>{money(row.totalPrice)} ETB</td>
                  <td>{money(vatOf(row.totalPrice))} ETB</td>
                  <td>{money(withVat(row.totalPrice))} ETB</td>
                  <td>
                    {PAY_LABEL[row.paymentStatus] || row.paymentStatus || "—"}
                    <div className="muted">{row.paymentMethod || ""}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function ExpenseReportView({ report }) {
  if (!report) return null;
  return (
    <div className="grid" style={{ marginTop: 16 }}>
      <p className="muted">
        {report.period?.label}: {money(report.totals?.amount)} ETB across{" "}
        {report.totals?.count || 0} expenses
      </p>
      <div className="card table-wrap">
        <h3 style={{ marginTop: 0 }}>By date</h3>
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
                <td>{money(row.amount)} ETB</td>
              </tr>
            ))}
          </tbody>
        </table>
        {(report.byDate || []).length === 0 ? (
          <p className="empty muted">No expenses in this period.</p>
        ) : null}
      </div>
      <div className="card table-wrap">
        <h3 style={{ marginTop: 0 }}>By category</h3>
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
                <td>{money(row.amount)} ETB</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="card table-wrap">
        <h3 style={{ marginTop: 0 }}>Expense lines</h3>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Category</th>
              <th>Description</th>
              <th>Method</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {(report.expenses || []).map((row) => (
              <tr key={row.id}>
                <td>{String(row.expenseDate).slice(0, 10)}</td>
                <td>{categoryLabel(row.category)}</td>
                <td>{row.description}</td>
                <td>{row.paymentMethod || "—"}</td>
                <td>{money(row.amount)} ETB</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const { user } = useAuth();
  const owner = isOwner(user);
  const canSales = can(user, "sales", "READ") || can(user, "insights", "READ");
  const canPurchases =
    can(user, "purchasing", "READ") || can(user, "insights", "READ");
  const canExpenses = can(user, "finance", "READ");

  const defaultKind = canSales
    ? "sales"
    : canPurchases
      ? "purchases"
      : "expenses";

  const [kind, setKind] = useState(defaultKind);
  const [salesFilters, setSalesFilters] = useState(emptySalesFilters);
  const [purchaseFilters, setPurchaseFilters] = useState(emptyPurchaseFilters);
  const [expenseFilters, setExpenseFilters] = useState(emptyExpenseFilters);
  const [salesPage, setSalesPage] = useState(1);
  const [showAllColumns, setShowAllColumns] = useState(false);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [salesmen, setSalesmen] = useState([]);
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);

  const activePeriod =
    kind === "sales"
      ? salesFilters.period
      : kind === "purchases"
        ? purchaseFilters.period
        : expenseFilters.period;

  const salesRange = useMemo(
    () => rangeFor(salesFilters.period, salesFilters.from, salesFilters.to),
    [salesFilters.period, salesFilters.from, salesFilters.to],
  );
  const purchaseRange = useMemo(
    () =>
      rangeFor(purchaseFilters.period, purchaseFilters.from, purchaseFilters.to),
    [purchaseFilters.period, purchaseFilters.from, purchaseFilters.to],
  );

  const salesQuery = (filters, extras = {}) => {
    const dates = rangeFor(filters.period, filters.from, filters.to);
    const query = { page: extras.page || 1, limit: extras.limit || 20 };
    if (dates.from) query.from = dates.from;
    if (dates.to) query.to = dates.to;
    if (filters.productId) query.productId = filters.productId;
    if (filters.customerId) query.customerId = filters.customerId;
    if (filters.warehouseId) query.warehouseId = filters.warehouseId;
    if (filters.createdBy) query.createdBy = filters.createdBy;
    return query;
  };

  const load = async () => {
    setBusy(true);
    setError("");
    try {
      if (kind === "sales") {
        const res = await api("/api/insights/item-profit-report", {
          query: salesQuery(salesFilters, { page: salesPage, limit: 20 }),
        });
        setReport(res.data.report);
      } else if (kind === "purchases") {
        const dates = purchaseRange;
        const query = {};
        if (dates.from) query.from = dates.from;
        if (dates.to) query.to = dates.to;
        if (purchaseFilters.productId) query.productId = purchaseFilters.productId;
        if (purchaseFilters.supplierId) {
          query.supplierId = purchaseFilters.supplierId;
        }
        const res = await api("/api/insights/purchases-report", { query });
        setReport(res.data.report);
      } else {
        const query = { period: expenseFilters.period };
        if (expenseFilters.period === "custom") {
          query.from = expenseFilters.from;
          query.to = expenseFilters.to;
        }
        if (expenseFilters.category) query.category = expenseFilters.category;
        const res = await api("/api/expenses/report", { query });
        setReport(res.data.report);
      }
    } catch (err) {
      setError(err.message);
      setReport(null);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    Promise.all([
      api("/api/products", { query: { limit: 200, status: "ACTIVE" } }).catch(
        () => ({ data: { products: [] } }),
      ),
      can(user, "customers", "READ")
        ? api("/api/customers", {
            query: { limit: 200, type: "CUSTOMER", status: "ACTIVE" },
          })
        : Promise.resolve({ data: { customers: [] } }),
      can(user, "purchasing", "READ") || can(user, "catalog", "READ")
        ? api("/api/suppliers", { query: { status: "ACTIVE", limit: 200 } })
        : Promise.resolve({ data: { suppliers: [] } }),
      can(user, "warehouse", "READ")
        ? api("/api/warehouses")
        : Promise.resolve({ data: { warehouses: [] } }),
      owner ? api("/api/team") : Promise.resolve({ data: { salesmen: [] } }),
    ])
      .then(([p, c, s, w, team]) => {
        setProducts(p.data.products || []);
        setCustomers(c.data.customers || []);
        setSuppliers(s.data.suppliers || []);
        setWarehouses(w.data.warehouses || []);
        setSalesmen(team.data.salesmen || []);
      })
      .catch((err) => setError(err.message));
  }, [user, owner]);

  useEffect(() => {
    if (kind === "sales" && !canSales) return;
    if (kind === "purchases" && !canPurchases) return;
    if (kind === "expenses" && !canExpenses) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, salesFilters, purchaseFilters, expenseFilters, salesPage]);

  const pickPeriod = (value) => {
    const dates = rangeFor(value, todayIso(), todayIso());
    if (kind === "sales") {
      setSalesPage(1);
      setSalesFilters((prev) => ({
        ...prev,
        period: value,
        from: dates.from,
        to: dates.to,
      }));
    } else if (kind === "purchases") {
      setPurchaseFilters((prev) => ({
        ...prev,
        period: value,
        from: dates.from,
        to: dates.to,
      }));
    } else {
      setExpenseFilters((prev) => ({
        ...prev,
        period: value,
        from: dates.from,
        to: dates.to,
      }));
    }
  };

  const setCustomDate = (field, value) => {
    if (kind === "sales") {
      setSalesPage(1);
      setSalesFilters((prev) => ({
        ...prev,
        period: "custom",
        [field]: value,
      }));
    } else if (kind === "purchases") {
      setPurchaseFilters((prev) => ({
        ...prev,
        period: "custom",
        [field]: value,
      }));
    } else {
      setExpenseFilters((prev) => ({
        ...prev,
        period: "custom",
        [field]: value,
      }));
    }
  };

  const buildSalesExportRows = (lines) => {
    const headers = [
      "Item",
      "SKU",
      "Customer",
      "Store",
      "Salesperson",
      "Purchase price",
      "Selling price",
      "Purchase date",
      "Selling date",
      "Quantity",
      "Total purchase",
      "Total selling",
      "Profit/Loss",
      "Result",
      "Margin %",
      "Invoice",
    ];
    const rows = lines.map((row) => [
      row.productName,
      row.sku,
      row.customerName,
      row.warehouseName,
      row.salespersonName,
      row.purchasePrice,
      row.sellingPrice,
      row.purchaseDate,
      row.sellingDate,
      row.quantity,
      row.totalPurchaseAmount,
      row.totalSellingAmount,
      row.profit,
      row.result,
      row.profitMargin,
      row.document,
    ]);
    return { headers, rows };
  };

  const buildPurchaseExportRows = (lines) => {
    const headers = [
      "Date",
      "Document",
      "Supplier",
      "Staff",
      "SKU",
      "Item",
      "Qty",
      "Unit",
      "Unit price",
      "Line total",
      "VAT",
      "Total with VAT",
      "Payment status",
      "Payment method",
    ];
    const rows = (lines || []).map((row) => [
      row.date,
      row.document,
      row.party,
      row.salesman,
      row.sku,
      row.productName,
      row.quantity,
      row.unit,
      row.unitPrice,
      row.totalPrice,
      vatOf(row.totalPrice),
      withVat(row.totalPrice),
      row.paymentStatus,
      row.paymentMethod,
    ]);
    return { headers, rows };
  };

  const fetchAllSalesLines = async () => {
    const rows = [];
    let page = 1;
    let totalPages = 1;
    do {
      const res = await api("/api/insights/item-profit-report", {
        query: salesQuery(salesFilters, { page, limit: 100 }),
      });
      rows.push(...(res.data.report?.lines || []));
      totalPages = res.data.report?.meta?.totalPages || 1;
      page += 1;
    } while (page <= totalPages && page <= 20);
    return rows;
  };

  const exportExcel = async () => {
    setExporting(true);
    setError("");
    try {
      if (kind === "sales") {
        const lines = await fetchAllSalesLines();
        if (!lines.length) throw new Error("No sales to export for this filter");
        const { headers, rows } = buildSalesExportRows(lines);
        downloadCsv(
          `sales-report-${salesRange.from || "all"}-${salesRange.to || "all"}.csv`,
          headers,
          rows,
        );
      } else if (kind === "purchases") {
        const lines = report?.lines || [];
        if (!lines.length) {
          throw new Error("No purchases to export for this filter");
        }
        const { headers, rows } = buildPurchaseExportRows(lines);
        downloadCsv(
          `purchase-report-${purchaseRange.from || "all"}-${purchaseRange.to || "all"}.csv`,
          headers,
          rows,
        );
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setExporting(false);
    }
  };

  const exportPdf = async () => {
    setExporting(true);
    setError("");
    try {
      if (kind === "sales") {
        const lines = await fetchAllSalesLines();
        if (!lines.length) throw new Error("No sales to export for this filter");
        const { headers, rows } = buildSalesExportRows(lines);
        const summary = report?.summary || {};
        await openPdf({
          title: "Sales report",
          subtitle: `${salesRange.from} to ${salesRange.to} · ${lines.length} lines · Profit ${money(summary.profit ?? 0)} ETB`,
          headers,
          rows,
        });
      } else if (kind === "purchases") {
        const lines = report?.lines || [];
        if (!lines.length) {
          throw new Error("No purchases to export for this filter");
        }
        const { headers, rows } = buildPurchaseExportRows(lines);
        await openPdf({
          title: "Purchase report",
          subtitle: `${purchaseRange.from} to ${purchaseRange.to} · ${lines.length} lines · ${money(report?.totals?.amount)} ETB`,
          headers,
          rows,
        });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <div className="topbar">
        <div>
          <h1 style={{ margin: 0 }}>Reports</h1>
        </div>
        <div className="row-actions no-print">
          {kind === "sales" ? (
            <button
              type="button"
              className="btn secondary"
              onClick={() => setShowAllColumns((value) => !value)}
            >
              {showAllColumns ? "Show less columns" : "Show all columns"}
            </button>
          ) : null}
        </div>
      </div>

      <div className="seg no-print" style={{ marginBottom: 16 }}>
        {canSales ? (
          <button
            type="button"
            className={`btn ${kind === "sales" ? "" : "secondary"}`}
            onClick={() => {
              setKind("sales");
              setSalesPage(1);
            }}
          >
            Sales report
          </button>
        ) : null}
        {canPurchases ? (
          <button
            type="button"
            className={`btn ${kind === "purchases" ? "" : "secondary"}`}
            onClick={() => setKind("purchases")}
          >
            Purchase report
          </button>
        ) : null}
        {canExpenses ? (
          <button
            type="button"
            className={`btn ${kind === "expenses" ? "" : "secondary"}`}
            onClick={() => setKind("expenses")}
          >
            Expense report
          </button>
        ) : null}
      </div>

      <section className="card no-print">
        {kind === "sales" ? (
          <div className="toolbar" style={{ marginBottom: 14 }}>
            <label className="field">
              <span>Item</span>
              <select
                value={salesFilters.productId}
                onChange={(e) => {
                  setSalesPage(1);
                  setSalesFilters((prev) => ({
                    ...prev,
                    productId: e.target.value,
                  }));
                }}
              >
                <option value="">All items</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Customer</span>
              <select
                value={salesFilters.customerId}
                onChange={(e) => {
                  setSalesPage(1);
                  setSalesFilters((prev) => ({
                    ...prev,
                    customerId: e.target.value,
                  }));
                }}
              >
                <option value="">All customers</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Store</span>
              <select
                value={salesFilters.warehouseId}
                onChange={(e) => {
                  setSalesPage(1);
                  setSalesFilters((prev) => ({
                    ...prev,
                    warehouseId: e.target.value,
                  }));
                }}
              >
                <option value="">All stores</option>
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </option>
                ))}
              </select>
            </label>
            {owner ? (
              <label className="field">
                <span>Salesperson</span>
                <select
                  value={salesFilters.createdBy}
                  onChange={(e) => {
                    setSalesPage(1);
                    setSalesFilters((prev) => ({
                      ...prev,
                      createdBy: e.target.value,
                    }));
                  }}
                >
                  <option value="">All staff</option>
                  <option value={user.id}>{user.fullName} (you)</option>
                  {salesmen.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.fullName}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label className="field">
              <span>Start date</span>
              <input
                type="date"
                value={salesFilters.from}
                onChange={(e) => setCustomDate("from", e.target.value)}
              />
            </label>
            <label className="field">
              <span>End date</span>
              <input
                type="date"
                value={salesFilters.to}
                onChange={(e) => setCustomDate("to", e.target.value)}
              />
            </label>
          </div>
        ) : null}

        {kind === "purchases" ? (
          <div className="toolbar" style={{ marginBottom: 14 }}>
            <label className="field">
              <span>Item</span>
              <select
                value={purchaseFilters.productId}
                onChange={(e) =>
                  setPurchaseFilters((prev) => ({
                    ...prev,
                    productId: e.target.value,
                  }))
                }
              >
                <option value="">All items</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Supplier</span>
              <select
                value={purchaseFilters.supplierId}
                onChange={(e) =>
                  setPurchaseFilters((prev) => ({
                    ...prev,
                    supplierId: e.target.value,
                  }))
                }
              >
                <option value="">All suppliers</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Start date</span>
              <input
                type="date"
                value={purchaseFilters.from}
                onChange={(e) => setCustomDate("from", e.target.value)}
              />
            </label>
            <label className="field">
              <span>End date</span>
              <input
                type="date"
                value={purchaseFilters.to}
                onChange={(e) => setCustomDate("to", e.target.value)}
              />
            </label>
          </div>
        ) : null}

        {kind === "expenses" ? (
          <div className="toolbar" style={{ marginBottom: 14 }}>
            <label className="field">
              <span>Category</span>
              <select
                value={expenseFilters.category}
                onChange={(e) =>
                  setExpenseFilters((prev) => ({
                    ...prev,
                    category: e.target.value,
                  }))
                }
              >
                <option value="">All categories</option>
                {EXPENSE_CATEGORIES.map((row) => (
                  <option key={row.value} value={row.value}>
                    {row.label}
                  </option>
                ))}
              </select>
            </label>
            {expenseFilters.period === "custom" ? (
              <>
                <label className="field">
                  <span>Start date</span>
                  <input
                    type="date"
                    value={expenseFilters.from}
                    onChange={(e) => setCustomDate("from", e.target.value)}
                  />
                </label>
                <label className="field">
                  <span>End date</span>
                  <input
                    type="date"
                    value={expenseFilters.to}
                    onChange={(e) => setCustomDate("to", e.target.value)}
                  />
                </label>
              </>
            ) : null}
          </div>
        ) : null}

        <div className="period-row">
          {PERIODS.map((row) => (
            <button
              key={row.value}
              type="button"
              className={`period-chip${activePeriod === row.value ? " active" : ""}`}
              onClick={() => pickPeriod(row.value)}
            >
              {row.label}
            </button>
          ))}
        </div>
      </section>

      {kind === "sales" || kind === "purchases" ? (
        <div className="sale-table-actions no-print" style={{ margin: "12px 0" }}>
          <button
            type="button"
            className="btn chip secondary"
            disabled={exporting || busy}
            onClick={exportExcel}
          >
            {exporting ? "Exporting…" : "Export to Excel"}
          </button>
          <button
            type="button"
            className="btn chip secondary"
            disabled={exporting || busy}
            onClick={exportPdf}
          >
            Export to PDF
          </button>
        </div>
      ) : null}

      {error ? <p className="error">{error}</p> : null}
      {busy && !report ? <InventoryLoading message="Loading report..." /> : null}

      {kind === "sales" ? (
        <ProfitReport
          report={report}
          showAllColumns={showAllColumns}
          page={salesPage}
          onPage={setSalesPage}
        />
      ) : null}

      {kind === "purchases" ? <PurchaseReportView report={report} /> : null}

      {kind === "expenses" ? <ExpenseReportView report={report} /> : null}
    </>
  );
}
