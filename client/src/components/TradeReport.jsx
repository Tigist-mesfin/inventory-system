import { money, qty, VAT_RATE, vatOf, withVat } from "../api/client";

const PAY_LABEL = {
  UNPAID: "Not paid",
  PARTIAL: "Partially paid",
  PAID: "Paid",
};

function ItemCell({ row }) {
  return (
    <>
      {row.name || row.productName}
      <div className="muted">
        {[row.sku, row.unit].filter(Boolean).join(" · ")}
      </div>
    </>
  );
}

function DateTable({ byDate, itemLabel }) {
  if (!byDate.length) return null;
  return (
    <div className="card table-wrap">
      <h3>By date</h3>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Documents</th>
            <th>Lines</th>
            <th>Qty</th>
            <th>Amount</th>
            <th>VAT {VAT_RATE}%</th>
            <th>Incl. VAT</th>
          </tr>
        </thead>
        <tbody>
          {byDate.map((day) => (
            <tr key={day.date}>
              <td>{day.date}</td>
              <td>{day.documentCount || "—"}</td>
              <td>{day.lineCount || 0}</td>
              <td>{qty(day.quantity)}</td>
              <td>{money(day.amount)}</td>
              <td>{money(vatOf(day.amount))}</td>
              <td>{money(withVat(day.amount))}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted" style={{ marginTop: 8 }}>
        {itemLabel} totals for each day. Open “Date + item” for the breakdown.
      </p>
    </div>
  );
}

function ItemTable({ byItem }) {
  if (!byItem.length) return null;
  return (
    <div className="card table-wrap">
      <h3>By item</h3>
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>Days</th>
            <th>Qty</th>
            <th>Amount</th>
            <th>VAT {VAT_RATE}%</th>
            <th>Incl. VAT</th>
          </tr>
        </thead>
        <tbody>
          {byItem.map((row) => (
            <tr key={row.productId}>
              <td>
                <ItemCell row={row} />
              </td>
              <td>{row.dates?.length || 0}</td>
              <td>
                {qty(row.quantity)} {row.unit || ""}
              </td>
              <td>{money(row.amount)}</td>
              <td>{money(vatOf(row.amount))}</td>
              <td>{money(withVat(row.amount))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DateItemTable({ byDate }) {
  if (!byDate.length) return null;
  return (
    <div className="grid">
      {byDate.map((day) => (
        <div className="card table-wrap" key={day.date}>
          <div className="report-day-head">
            <h3 style={{ margin: 0 }}>{day.date}</h3>
            <div className="muted">
              {day.documentCount || 0} document{day.documentCount === 1 ? "" : "s"} ·{" "}
              {qty(day.quantity)} units · {money(day.amount)} + VAT {money(vatOf(day.amount))} ={" "}
              <strong>{money(withVat(day.amount))} ETB</strong>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Lines</th>
                <th>Qty</th>
                <th>Amount</th>
                <th>VAT {VAT_RATE}%</th>
                <th>Incl. VAT</th>
              </tr>
            </thead>
            <tbody>
              {(day.items || []).map((item) => (
                <tr key={`${day.date}-${item.productId}`}>
                  <td>
                    <ItemCell row={item} />
                  </td>
                  <td>{item.lineCount || 0}</td>
                  <td>
                    {qty(item.quantity)} {item.unit || ""}
                  </td>
                  <td>{money(item.amount)}</td>
                  <td>{money(vatOf(item.amount))}</td>
                  <td>{money(withVat(item.amount))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

function LinesTable({ lines, kind }) {
  const partyLabel = kind === "purchases" ? "Supplier" : "Customer";
  return (
    <div className="card table-wrap">
      <h3>Line detail</h3>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Document</th>
            <th>{partyLabel}</th>
            <th>Staff</th>
            <th>Item</th>
            <th>Qty</th>
            <th>Unit price</th>
            <th>Amount</th>
            <th>VAT {VAT_RATE}%</th>
            <th>Incl. VAT</th>
            <th>Payment</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((row) => (
            <tr key={row.id}>
              <td>{row.date}</td>
              <td>{row.document}</td>
              <td>{row.party}</td>
              <td>{row.salesman || "—"}</td>
              <td>
                <ItemCell row={row} />
              </td>
              <td>
                {qty(row.quantity)} {row.unit || ""}
              </td>
              <td>{money(row.unitPrice)}</td>
              <td>{money(row.totalPrice)}</td>
              <td>{money(vatOf(row.totalPrice))}</td>
              <td>{money(withVat(row.totalPrice))}</td>
              <td>
                {PAY_LABEL[row.paymentStatus] || row.paymentStatus || "—"}
                <div className="muted">{row.paymentMethod || ""}</div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function TradeReport({ title, report, empty, view = "date-item", kind = "sales" }) {
  if (!report) return null;
  const { lines = [], byItem = [], byDate = [], totals = {} } = report;
  const itemLabel = kind === "purchases" ? "Purchases" : "Sales";

  if (!lines.length) {
    return (
      <div className="card">
        <p className="empty muted">{empty}</p>
      </div>
    );
  }

  return (
    <div className="grid" style={{ marginTop: 16 }}>
      <div className="card totals-box">
        <h3 style={{ marginTop: 0 }}>{title}</h3>
        <dl className="ai-keys">
          <div>
            <dt>Amount</dt>
            <dd>{money(totals.amount)} ETB</dd>
          </div>
          <div>
            <dt>VAT {VAT_RATE}%</dt>
            <dd>{money(vatOf(totals.amount))} ETB</dd>
          </div>
          <div>
            <dt>Incl. VAT</dt>
            <dd>{money(withVat(totals.amount))} ETB</dd>
          </div>
          <div>
            <dt>Quantity</dt>
            <dd>{qty(totals.quantity)}</dd>
          </div>
          <div>
            <dt>Items</dt>
            <dd>{totals.itemCount || byItem.length}</dd>
          </div>
          <div>
            <dt>Documents</dt>
            <dd>{totals.documentCount || 0}</dd>
          </div>
          <div>
            <dt>Lines</dt>
            <dd>{totals.lineCount || lines.length}</dd>
          </div>
        </dl>
      </div>

      {view === "date" ? <DateTable byDate={byDate} itemLabel={itemLabel} /> : null}
      {view === "item" ? <ItemTable byItem={byItem} /> : null}
      {view === "date-item" ? <DateItemTable byDate={byDate} /> : null}
      {view === "lines" ? <LinesTable lines={lines} kind={kind} /> : null}
    </div>
  );
}
