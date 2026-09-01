import { money, qty } from "../../api/client";

const RESULT_LABEL = {
  PROFIT: "Profit",
  LOSS: "Loss",
  BREAKEVEN: "Break even",
};

function resultClass(result) {
  if (result === "PROFIT") return "pnl-positive";
  if (result === "LOSS") return "pnl-negative";
  return "";
}

const COMPACT_KEYS = new Set([
  "productName",
  "customerName",
  "warehouseName",
  "salespersonName",
  "quantity",
  "sellingPrice",
  "totalSellingAmount",
  "profit",
  "profitMargin",
  "sellingDate",
]);

const COLUMNS = [
  { key: "productName", label: "Item", compact: true },
  { key: "sku", label: "SKU", compact: false },
  { key: "customerName", label: "Customer", compact: true },
  { key: "warehouseName", label: "Store", compact: true },
  { key: "salespersonName", label: "Salesperson", compact: true },
  { key: "purchasePrice", label: "Purchase price", compact: false, money: true },
  { key: "sellingPrice", label: "Selling price", compact: true, money: true },
  { key: "purchaseDate", label: "Purchase date", compact: false },
  { key: "sellingDate", label: "Selling date", compact: true },
  { key: "quantity", label: "Qty", compact: true, qty: true },
  { key: "totalPurchaseAmount", label: "Total purchase", compact: false, money: true },
  { key: "totalSellingAmount", label: "Total sales", compact: true, money: true },
  { key: "profit", label: "Profit / loss", compact: true, money: true, result: true },
  { key: "profitMargin", label: "Margin", compact: true, margin: true },
  { key: "document", label: "Invoice", compact: false },
];

function cellValue(row, col) {
  if (col.key === "productName") {
    return (
      <>
        <strong>{row.productName}</strong>
        {row.sku ? <div className="muted">{row.sku}</div> : null}
      </>
    );
  }
  if (col.qty) return `${qty(row.quantity)} ${row.unit || ""}`;
  if (col.margin) return `${row.profitMargin}%`;
  if (col.money) return `${money(row[col.key])} ETB`;
  return row[col.key] || "—";
}

export default function ProfitReport({
  report,
  showAllColumns,
  page,
  onPage,
}) {
  if (!report) return null;
  const lines = report.lines || [];
  const summary = report.summary || report.totals || {};
  const meta = report.meta || { page: 1, totalPages: 1, total: 0 };
  const columns = COLUMNS.filter((col) => showAllColumns || col.compact || COMPACT_KEYS.has(col.key));

  return (
    <div className="grid" style={{ marginTop: 16 }}>
      <section className="stock-stats">
        <article className="card stat-card">
          <span className="muted">Total sales</span>
          <b>{summary.saleCount || 0}</b>
          <small>{summary.lineCount || 0} item lines</small>
        </article>
        <article className="card stat-card">
          <span className="muted">Revenue</span>
          <b>{money(summary.revenue)} ETB</b>
          <small>Total selling amount</small>
        </article>
        <article className="card stat-card">
          <span className="muted">Purchase cost</span>
          <b>{money(summary.purchaseCost)} ETB</b>
          <small>Actual stock cost (WAC)</small>
        </article>
        <article className="card stat-card">
          <span className="muted">Profit</span>
          <b className="pnl-positive">{money(summary.totalProfit)} ETB</b>
          <small>Sum of profitable lines</small>
        </article>
        <article className="card stat-card danger">
          <span>Loss</span>
          <b>{money(summary.totalLoss)} ETB</b>
          <small>Sum of loss lines</small>
        </article>
        <article className="card stat-card">
          <span className="muted">Quantity sold</span>
          <b>{qty(summary.quantitySold)}</b>
          <small>Net {money(summary.profit)} ETB · {summary.profitMargin}% margin</small>
        </article>
      </section>

      <div className="card table-wrap">
        {lines.length === 0 ? (
          <p className="empty muted">No completed sales for these filters.</p>
        ) : (
          <table>
            <thead>
              <tr>
                {columns.map((col) => (
                  <th key={col.key}>{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lines.map((row) => (
                <tr key={row.id}>
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={col.result ? resultClass(row.result) : undefined}
                    >
                      {col.result ? (
                        <>
                          <strong>{money(row.profit)} ETB</strong>
                          <div className="muted">{RESULT_LABEL[row.result] || row.result}</div>
                        </>
                      ) : (
                        cellValue(row, col)
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {meta.totalPages > 1 ? (
          <div className="pager no-print">
            <button
              type="button"
              className="btn secondary"
              disabled={page <= 1}
              onClick={() => onPage(page - 1)}
            >
              Previous
            </button>
            <span className="muted">
              Page {meta.page} of {meta.totalPages} · {meta.total} lines
            </span>
            <button
              type="button"
              className="btn secondary"
              disabled={page >= meta.totalPages}
              onClick={() => onPage(page + 1)}
            >
              Next
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
