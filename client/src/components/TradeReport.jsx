import { money, qty } from "../api/client";

export default function TradeReport({ title, report, empty }) {
  if (!report) return null;
  const { lines = [], byItem = [], byDate = [], totals = {} } = report;

  return (
    <div className="grid" style={{ marginTop: 16 }}>
      <div className="card totals-box">
        <h3 style={{ marginTop: 0 }}>{title} totals</h3>
        <p>
          All items quantity: <strong>{qty(totals.quantity)}</strong>
          <br />
          Total cost / value: <strong>{money(totals.amount)} ETB</strong>
        </p>
      </div>

      <div className="card table-wrap">
        <h3>By item</h3>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Total ETB</th>
            </tr>
          </thead>
          <tbody>
            {byItem.map((row) => (
              <tr key={row.productId}>
                <td>
                  {row.name}
                  <div className="muted">{row.unit}</div>
                </td>
                <td>{qty(row.quantity)} {row.unit}</td>
                <td>{money(row.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {byItem.length === 0 ? <p className="empty muted">{empty}</p> : null}
      </div>

      <div className="card table-wrap">
        <h3>By date</h3>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Qty</th>
              <th>Total ETB</th>
            </tr>
          </thead>
          <tbody>
            {byDate.map((row) => (
              <tr key={row.date}>
                <td>{row.date}</td>
                <td>{qty(row.quantity)}</td>
                <td>{money(row.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card table-wrap">
        <h3>By date and item</h3>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Document</th>
              <th>Party</th>
              <th>Item</th>
              <th>Qty</th>
              <th>Unit price</th>
              <th>Line total</th>
              <th>Payment</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((row) => (
              <tr key={row.id}>
                <td>{row.date}</td>
                <td>{row.document}</td>
                <td>{row.party}</td>
                <td>
                  {row.productName}
                  <div className="muted">{row.unit}</div>
                </td>
                <td>{qty(row.quantity)} {row.unit}</td>
                <td>{money(row.unitPrice)}</td>
                <td>{money(row.totalPrice)}</td>
                <td>
                  {row.paymentStatus || "—"}
                  <div className="muted">{row.paymentMethod || ""}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
