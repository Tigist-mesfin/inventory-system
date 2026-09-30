import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, money, qty, VAT_RATE, resolveAppName } from "../../api/client";
import { isOwner, can } from "../../auth/access";
import { useAuth } from "../../auth/AuthContext";
import DailyBalanceCheck from "./DailyBalanceCheck";
import VatDataSection from "./VatDataSection";
import InventoryLoading from "../../components/InventoryLoading";

const PERIODS = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "this_month", label: "This month" },
  { value: "this_year", label: "This year" },
  { value: "all", label: "All sales" },
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
  if (period === "this_week") {
    const start = new Date(now);
    const weekday = start.getDay() || 7;
    start.setDate(start.getDate() - weekday + 1);
    return { from: isoLocal(start), to: today };
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

const emptyFilters = () => {
  const range = rangeFor("today");
  return {
    period: "today",
    from: range.from,
    to: range.to,
    productId: "",
    customerId: "",
    paymentMethod: "",
    createdBy: "",
  };
};

const dayText = (value) => {
  if (!value) return "—";
  return String(value).slice(0, 10);
};

const purchaseDateText = (item) => {
  const allocs = item.costAllocations || [];
  const dates = [];
  const seen = new Set();
  for (const alloc of allocs) {
    const day = alloc.purchaseDate ? String(alloc.purchaseDate).slice(0, 10) : "";
    if (!day || seen.has(day)) continue;
    seen.add(day);
    dates.push(day);
  }
  return dates.length ? dates.join(", ") : "—";
};

const paidLabel = (sale) => {
  const remaining = Number(sale.remainingBalance || 0);
  if (remaining > 0.004) {
    return sale.paymentStatus === "UNPAID" ? "Unpaid" : "Partial";
  }
  return "Paid";
};

const lineProfit = (item) =>
  Number(item.totalPrice || 0) - Number(item.purchaseTotal || 0);

const csvEscape = (value) => {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
};

const downloadBlob = (blob, filename) => {
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(href);
};

const buildExportRows = (lines, showAllColumns) =>
  lines.map(({ sale, item }) => {
    const net = Number(item.totalPrice || 0);
    const withVat = Number(item.totalWithVat || net);
    const purchase = Number(item.purchaseUnitCost || 0);
    const remaining = Number(sale.remainingBalance || 0);
    const row = {
      Date: dayText(sale.saleDate),
      Item: item.product?.name || "Item",
      Qty: Number(item.quantity || 0),
      "Cost with VAT": withVat,
      "Purchase price": purchase,
      Profit: lineProfit(item),
      Customer: sale.customerName || sale.customer?.name || "Walk-in",
      "Payment method": sale.paymentMethod || "—",
      "Paid amount": Number(sale.paidAmount || 0),
      Remaining: remaining > 0.004 ? remaining : 0,
      Status: paidLabel(sale),
    };
    if (showAllColumns) {
      row.Amount = Number(item.unitPrice || 0);
      row.Total = net;
      row["Purchase date"] = purchaseDateText(item);
      row.Salesman = sale.creator?.fullName || sale.creator?.username || "—";
    }
    return row;
  });

export default function SalesPage() {
  const { user } = useAuth();
  const showCostColumns = isOwner(user) || can(user, "finance", "READ");
  const owner = isOwner(user);
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [methods, setMethods] = useState([]);
  const [salesmen, setSalesmen] = useState([]);
  const [filters, setFilters] = useState(emptyFilters);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [paying, setPaying] = useState(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("");
  const [balanceOpen, setBalanceOpen] = useState(false);
  const [vatOpen, setVatOpen] = useState(false);
  const [balanceKey, setBalanceKey] = useState(0);
  const [showAllColumns, setShowAllColumns] = useState(false);
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 899px)").matches,
  );
  const [showDashboard, setShowDashboard] = useState(
    () => typeof window === "undefined" || !window.matchMedia("(max-width: 899px)").matches,
  );

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const mq = window.matchMedia("(max-width: 899px)");
    const sync = () => {
      const mobile = mq.matches;
      setIsMobile(mobile);
      setShowDashboard(!mobile);
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const setPeriod = (period) => {
    const dates = rangeFor(period, filters.from, filters.to);
    setFilters({ ...filters, period, from: dates.from, to: dates.to });
  };

  const setDate = (patch) => {
    setFilters({ ...filters, ...patch, period: "custom" });
  };

  const load = async () => {
    const query = { limit: 500, status: "COMPLETED" };
    const dates = rangeFor(filters.period, filters.from, filters.to);
    if (dates.from) query.from = dates.from;
    if (dates.to) query.to = dates.to;
    if (filters.productId) query.productId = filters.productId;
    if (filters.createdBy) query.createdBy = filters.createdBy;
    if (filters.customerId && filters.customerId !== "walkin") {
      query.customerId = filters.customerId;
    }
    const first = await api("/api/sales", { query });
    let rows = first.data.sales || [];
    const pages = Math.min(first.meta?.totalPages || 1, 10);
    for (let page = 2; page <= pages; page += 1) {
      const next = await api("/api/sales", { query: { ...query, page } });
      rows = rows.concat(next.data.sales || []);
    }
    setSales(rows);
  };

  useEffect(() => {
    Promise.all([
      api("/api/products", { query: { limit: 100, status: "ACTIVE" } }),
      api("/api/payment-methods"),
      api("/api/customers", { query: { type: "CUSTOMER", status: "ACTIVE", limit: 200 } }).catch(
        () => ({ data: { customers: [] } }),
      ),
      owner ? api("/api/team") : Promise.resolve({ data: { salesmen: [] } }),
    ])
      .then(([p, m, c, team]) => {
        setProducts(p.data.products || []);
        setMethods(m.data.paymentMethods || []);
        setCustomers(c.data.customers || []);
        setSalesmen(team.data.salesmen || []);
        setPayMethod((prev) => prev || m.data.paymentMethods?.[0]?.name || "");
      })
      .catch((err) => setError(err.message));
  }, [owner]);

  useEffect(() => {
    load()
      .catch((err) => setError(err.message))
      .finally(() => setReady(true));
  }, [
    filters.period,
    filters.from,
    filters.to,
    filters.productId,
    filters.createdBy,
    filters.customerId,
  ]);

  const periodLines = useMemo(() => {
    const rows = [];
    sales.forEach((sale) => {
      if (filters.customerId === "walkin" && sale.customerId) return;
      const items = sale.items || [];
      if (!items.length) {
        rows.push({
          sale,
          item: {
            id: `${sale.id}-empty`,
            productId: null,
            quantity: 0,
            unitPrice: 0,
            totalPrice: sale.subtotal || 0,
            totalWithVat: sale.totalAmount || 0,
            purchaseUnitCost: 0,
            purchaseTotal: 0,
            product: { name: "No line items", unit: "" },
          },
        });
        return;
      }
      items.forEach((item) => {
        if (filters.productId && item.productId !== filters.productId) return;
        rows.push({ sale, item });
      });
    });
    return rows;
  }, [sales, filters.productId, filters.customerId]);

  const lines = useMemo(() => {
    if (!filters.paymentMethod) return periodLines;
    return periodLines.filter(({ sale }) => sale.paymentMethod === filters.paymentMethod);
  }, [periodLines, filters.paymentMethod]);

  const methodStats = useMemo(() => {
    const map = {};
    methods.forEach((method) => {
      map[method.name] = { name: method.name, count: 0, qty: 0, total: 0 };
    });
    periodLines.forEach(({ sale, item }) => {
      const key = sale.paymentMethod || "Unknown";
      if (!map[key]) map[key] = { name: key, count: 0, qty: 0, total: 0 };
      map[key].count += 1;
      map[key].qty += Number(item.quantity || 0);
      map[key].total += Number(item.totalWithVat || item.totalPrice || 0);
    });
    return Object.values(map);
  }, [periodLines, methods]);

  const totals = useMemo(() => {
    const qtySold = lines.reduce((sum, row) => sum + Number(row.item.quantity || 0), 0);
    const withoutVat = lines.reduce((sum, row) => sum + Number(row.item.totalPrice || 0), 0);
    const withVat = lines.reduce(
      (sum, row) => sum + Number(row.item.totalWithVat || row.item.totalPrice || 0),
      0,
    );
    const purchase = lines.reduce((sum, row) => sum + Number(row.item.purchaseTotal || 0), 0);
    return { count: lines.length, qtySold, withoutVat, withVat, purchase };
  }, [lines]);

  const openPay = (sale) => {
    setPaying(sale);
    setPayAmount(Number(sale.remainingBalance || 0).toFixed(2));
    setPayMethod(sale.paymentMethod || methods[0]?.name || "");
    setError("");
  };

  const submitPay = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(`/api/sales/${paying.id}/payments`, {
        method: "POST",
        body: { amount: Number(payAmount), paymentMethod: payMethod },
      });
      setPaying(null);
      await load();
      setBalanceKey((value) => value + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const removeSale = async (sale) => {
    if (
      !window.confirm(
        `Delete ${sale.invoiceNumber}? Stock from this sale will be returned to the store.`,
      )
    ) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api(`/api/sales/${sale.id}/cancel`, { method: "POST" });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const saleCount = useMemo(
    () => new Set(lines.map(({ sale }) => sale.id)).size,
    [lines],
  );

  const exportRows = useMemo(
    () => buildExportRows(lines, showAllColumns),
    [lines, showAllColumns],
  );

  const periodLabel =
    PERIODS.find((row) => row.value === filters.period)?.label ||
    (filters.period === "custom" ? "Date range" : "Sales");

  const exportExcel = () => {
    if (!exportRows.length) {
      setError("No sales to export for this filter");
      return;
    }
    const headers = Object.keys(exportRows[0]);
    const body = [
      headers.join(","),
      ...exportRows.map((row) => headers.map((key) => csvEscape(row[key])).join(",")),
    ].join("\r\n");
    const stamp = isoLocal(new Date());
    downloadBlob(
      new Blob([`\uFEFF${body}`], { type: "text/csv;charset=utf-8" }),
      `sales-export-${stamp}.csv`,
    );
  };

  const exportPdf = async () => {
    if (!exportRows.length) {
      setError("No sales to export for this filter");
      return;
    }
    setError("");
    const escapeHtml = (value) =>
      String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    const appName = escapeHtml(await resolveAppName());
    const headers = Object.keys(exportRows[0]);
    const head = headers.map((key) => `<th>${escapeHtml(key)}</th>`).join("");
    const body = exportRows
      .map(
        (row) =>
          `<tr>${headers
            .map((key) => {
              const value = row[key];
              const text =
                typeof value === "number"
                  ? Number(value).toLocaleString(undefined, {
                      minimumFractionDigits: key === "Qty" ? 0 : 2,
                      maximumFractionDigits: key === "Qty" ? 3 : 2,
                    })
                  : String(value ?? "");
              return `<td>${escapeHtml(text)}</td>`;
            })
            .join("")}</tr>`,
      )
      .join("");
    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Sales export</title>
  <style>
    @page { margin: 16mm 12mm 18mm; }
    body { font-family: Arial, sans-serif; color: #122; margin: 0; padding: 0 0 36px; }
    h1 { font-size: 18px; margin: 0 0 8px; }
    p { margin: 0 0 16px; color: #456; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th, td { border: 1px solid #ccd; padding: 6px 8px; text-align: left; }
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
  <h1>${escapeHtml(periodLabel)} sales</h1>
  <p>${saleCount} sale${saleCount === 1 ? "" : "s"} · ${escapeHtml(qty(totals.qtySold))} sold · Total with VAT ${escapeHtml(money(totals.withVat))} ETB</p>
  <table>
    <thead><tr>${head}</tr></thead>
    <tbody>${body}</tbody>
  </table>
  <footer class="app-name">${appName}</footer>
</body>
</html>`;
    const popup = window.open("", "_blank", "width=1000,height=720");
    if (!popup) {
      setError("Allow pop-ups to export PDF");
      return;
    }
    popup.document.open();
    popup.document.write(html);
    popup.document.close();
    popup.focus();
    const triggerPrint = () => {
      try {
        popup.print();
      } catch {
        setError("Could not open the print dialog");
      }
    };
    if (popup.document.readyState === "complete") {
      window.setTimeout(triggerPrint, 200);
    } else {
      popup.onload = () => window.setTimeout(triggerPrint, 200);
    }
  };

  if (!ready) return <InventoryLoading message="Loading inventory..." />;

  return (
    <>
      {vatOpen ? (
        <VatDataSection
          onClose={() => setVatOpen(false)}
        />
      ) : balanceOpen ? (
        <DailyBalanceCheck
          methods={methods}
          reloadToken={balanceKey}
          onClose={() => setBalanceOpen(false)}
          onPay={openPay}
        />
      ) : (
        <>
      <div className="topbar">
        <div>
          <h1 style={{ margin: 0 }}>Sales</h1>
          <p className="muted">
            Completed shop sales only. Totals follow the selected period and filters.
          </p>
        </div>
        <div className="row-actions">
          {can(user, "sales", "CREATE") ? (
            <Link className="btn danger" to="/sell/new">
              Add new sale
            </Link>
          ) : null}
          {isMobile ? (
            <button
              type="button"
              className="btn secondary"
              onClick={() => setShowDashboard((open) => !open)}
            >
              {showDashboard ? "Hide sales dashboard" : "View sales dashboard"}
            </button>
          ) : null}
          <button
            type="button"
            className="btn secondary"
            onClick={() => {
              setBalanceOpen(false);
              setVatOpen(true);
            }}
          >
            VAT
          </button>
          <button
            type="button"
            className="btn secondary"
            onClick={() => {
              setVatOpen(false);
              setBalanceOpen(true);
            }}
          >
            Daily balance check
          </button>
        </div>
      </div>
      {error ? <p className="error">{error}</p> : null}

      <div className="period-chips">
        {PERIODS.map((row) => (
          <button
            key={row.value}
            type="button"
            className={`btn chip ${filters.period === row.value ? "" : "secondary"}`}
            onClick={() => setPeriod(row.value)}
          >
            {row.label}
          </button>
        ))}
      </div>

      {showDashboard ? (
        <div className="purchase-analytics stock-analytics" style={{ marginBottom: 16 }}>
          {methodStats.map((stat) => (
            <button
              type="button"
              key={stat.name}
              className={`analytics-card is-action${filters.paymentMethod === stat.name ? " is-selected" : ""}`}
              onClick={() =>
                setFilters({
                  ...filters,
                  paymentMethod: filters.paymentMethod === stat.name ? "" : stat.name,
                })
              }
            >
              <span>{stat.name}</span>
              <b>{money(stat.total)}</b>
              <small>
                {stat.count} item{stat.count === 1 ? "" : "s"} · {qty(stat.qty)} sold
              </small>
            </button>
          ))}
        </div>
      ) : null}

      <div className="card table-wrap">
        <div className="toolbar">
          <label className="field">
            <span>From date</span>
            <input
              type="date"
              value={filters.from}
              onChange={(e) => setDate({ from: e.target.value })}
            />
          </label>
          <label className="field">
            <span>To date</span>
            <input
              type="date"
              value={filters.to}
              onChange={(e) => setDate({ to: e.target.value })}
            />
          </label>
          <label className="field">
            <span>Item</span>
            <select
              value={filters.productId}
              onChange={(e) => setFilters({ ...filters, productId: e.target.value })}
            >
              <option value="">All items</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Customer</span>
            <select
              value={filters.customerId}
              onChange={(e) => setFilters({ ...filters, customerId: e.target.value })}
            >
              <option value="">All customers</option>
              <option value="walkin">Walk-in</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Payment method</span>
            <select
              value={filters.paymentMethod}
              onChange={(e) => setFilters({ ...filters, paymentMethod: e.target.value })}
            >
              <option value="">All methods</option>
              {methods.map((m) => (
                <option key={m.id} value={m.name}>{m.name}</option>
              ))}
            </select>
          </label>
          {owner ? (
            <label className="field">
              <span>Salesman</span>
              <select
                value={filters.createdBy}
                onChange={(e) => setFilters({ ...filters, createdBy: e.target.value })}
              >
                <option value="">All staff</option>
                <option value={user.id}>{user.fullName} (you)</option>
                {salesmen.map((row) => (
                  <option key={row.id} value={row.id}>{row.fullName}</option>
                ))}
              </select>
            </label>
          ) : null}
        </div>

        <div className="totals-box" style={{ marginBottom: 16 }}>
          <strong>{periodLabel} sales</strong>
          <div>
            {saleCount} sale{saleCount === 1 ? "" : "s"} · {qty(totals.qtySold)} sold
          </div>
          <div>
            Without VAT <strong>{money(totals.withoutVat)} ETB</strong>
            {" · "}
            VAT {VAT_RATE}% <strong>{money(totals.withVat - totals.withoutVat)} ETB</strong>
            {" · "}
            Total with VAT <strong>{money(totals.withVat)} ETB</strong>
          </div>
        </div>

        <div className="sale-table-actions no-print">
          <button type="button" className="btn chip secondary" onClick={exportExcel}>
            Export to Excel
          </button>
          <button type="button" className="btn chip secondary" onClick={exportPdf}>
            Export to PDF
          </button>
          {can(user, "sales", "CREATE") ? (
            <Link className="btn chip secondary" to="/sell/import">
              Import from Excel
            </Link>
          ) : null}
          <button
            type="button"
            className={`btn chip ${showAllColumns ? "secondary" : ""}`}
            onClick={() => setShowAllColumns((value) => !value)}
          >
            {showAllColumns ? "Basic columns" : "Show all columns"}
          </button>
        </div>

        <div className={`table-wrap sale-table ${showAllColumns ? "is-expanded" : "is-compact"}`}>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Item</th>
                <th>Qty</th>
                {showAllColumns ? <th>Amount</th> : null}
                {showAllColumns ? <th>Total</th> : null}
                <th>Cost with VAT</th>
                {showCostColumns ? <th>Purchase price</th> : null}
                {showCostColumns ? <th>Profit</th> : null}
                <th>Customer</th>
                <th>Payment method</th>
                <th>Paid amount</th>
                <th>Remaining</th>
                {showAllColumns ? <th>Purchase date</th> : null}
                {showAllColumns ? <th>Salesman</th> : null}
                <th>Status</th>
                <th className="no-print">Actions</th>
              </tr>
            </thead>
            <tbody>
              {lines.map(({ sale, item }) => {
                const net = Number(item.totalPrice || 0);
                const withVat = Number(item.totalWithVat || net);
                const remaining = Number(sale.remainingBalance || 0);
                const purchase = Number(item.purchaseUnitCost || 0);
                const profit = lineProfit(item);
                return (
                  <tr key={item.id}>
                    <td>{dayText(sale.saleDate)}</td>
                    <td>{item.product?.name || "Item"}</td>
                    <td>{qty(item.quantity)} {item.product?.unit || ""}</td>
                    {showAllColumns ? <td>{money(item.unitPrice)}</td> : null}
                    {showAllColumns ? <td>{money(net)}</td> : null}
                    <td>{money(withVat)}</td>
                    {showCostColumns ? <td>{money(purchase)}</td> : null}
                    {showCostColumns ? <td>{money(profit)}</td> : null}
                    <td>{sale.customerName || sale.customer?.name || "Walk-in"}</td>
                    <td>{sale.paymentMethod || "—"}</td>
                    <td>{money(sale.paidAmount)}</td>
                    <td>{remaining > 0.004 ? money(remaining) : "—"}</td>
                    {showAllColumns ? <td>{purchaseDateText(item)}</td> : null}
                    {showAllColumns ? (
                      <td>{sale.creator?.fullName || sale.creator?.username || "—"}</td>
                    ) : null}
                    <td>{paidLabel(sale)}</td>
                    <td className="no-print">
                      <div className="row-actions">
                        {remaining > 0.004 && can(user, "sales", "CREATE") ? (
                          <button type="button" className="btn saffron" onClick={() => openPay(sale)}>
                            Complete payment
                          </button>
                        ) : null}
                        {can(user, "sales", "UPDATE") ? (
                          <Link className="btn secondary" to={`/sell/${sale.id}/edit`}>
                            Edit
                          </Link>
                        ) : null}
                        {can(user, "sales", "UPDATE") ? (
                          <button
                            type="button"
                            className="btn ghost"
                            disabled={busy}
                            onClick={() => removeSale(sale)}
                          >
                            Delete
                          </button>
                        ) : null}
                        <Link className="btn" to={`/sell/${sale.id}`}>View</Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {lines.length === 0 ? <p className="empty muted">No sales for this filter.</p> : null}
      </div>
        </>
      )}

      {paying ? (
        <div className="modal-backdrop" onClick={() => !busy && setPaying(null)} role="presentation">
          <div className="modal-card" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h2>Complete payment</h2>
            <p className="muted">
              {paying.invoiceNumber} · remaining {money(paying.remainingBalance)} ETB
            </p>
            <form onSubmit={submitPay}>
              <label className="field">
                <span>Amount paid now</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  max={Number(paying.remainingBalance || 0)}
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  required
                />
              </label>
              <label className="field">
                <span>Payment method</span>
                <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)} required>
                  {methods.map((m) => (
                    <option key={m.id} value={m.name}>{m.name}</option>
                  ))}
                </select>
              </label>
              {error ? <p className="error">{error}</p> : null}
              <div className="modal-actions">
                <button type="button" className="btn secondary" onClick={() => setPaying(null)} disabled={busy}>
                  Cancel
                </button>
                <button className="btn saffron" disabled={busy}>
                  {busy ? "Saving…" : "Record payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
