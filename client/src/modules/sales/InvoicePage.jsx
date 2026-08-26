import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, money, qty } from "../../api/client";

const STANDING = {
  UNPAID: "Not paid",
  PARTIAL: "Partially paid",
  PAID: "Paid in full",
};

export default function InvoicePage() {
  const { id } = useParams();
  const [sale, setSale] = useState(null);
  const [company, setCompany] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api(`/api/sales/${id}`), api("/api/company-profile")])
      .then(([saleRes, companyRes]) => {
        setSale(saleRes.data.sale);
        setCompany(companyRes.data.company);
      })
      .catch((err) => setError(err.message));
  }, [id]);

  useEffect(() => {
    if (!sale?.invoiceNumber) return undefined;
    const previous = document.title;
    const onBeforePrint = () => {
      document.title = sale.invoiceNumber;
    };
    const onAfterPrint = () => {
      document.title = previous;
    };
    window.addEventListener("beforeprint", onBeforePrint);
    window.addEventListener("afterprint", onAfterPrint);
    return () => {
      window.removeEventListener("beforeprint", onBeforePrint);
      window.removeEventListener("afterprint", onAfterPrint);
      document.title = previous;
    };
  }, [sale?.invoiceNumber]);

  if (error) return <p className="error">{error}</p>;
  if (!sale) return <p className="muted">Loading invoice…</p>;

  const companyReady = Boolean(company?.name);

  return (
    <article className="card invoice invoice-sheet">
      <div className="invoice-actions no-print">
        <button type="button" className="btn saffron" onClick={() => window.print()}>
          Print invoice
        </button>
      </div>

      <header className="invoice-header">
        <div>
          {companyReady ? (
            <>
              <h1 className="invoice-company">{company.name}</h1>
              {company.address ? <p>{company.address}</p> : null}
              <p className="muted">
                {[company.phone, company.email, company.tin ? `TIN ${company.tin}` : null]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </>
          ) : (
            <>
              <h1 className="invoice-company">Company name</h1>
            </>
          )}
        </div>
        <div className="invoice-meta">
          <div className="pill">{sale.status}</div>
          <strong>{sale.invoiceNumber}</strong>
          <div className="muted">{new Date(sale.saleDate).toLocaleString()}</div>
          <div className="muted">{sale.warehouse?.name}</div>
        </div>
      </header>

      <section className="invoice-party">
        <div>
          <span className="muted">Bill to</span>
          <strong>{sale.customerName || sale.customer?.name || "Walk-in"}</strong>
          <div>{sale.customerPhone || sale.customer?.phone}</div>
        </div>
        <div>
          <span className="muted">Payment</span>
          <strong>{sale.paymentMethod}</strong>
          <div>{STANDING[sale.paymentStatus] || sale.paymentStatus}</div>
        </div>
      </section>

      <table className="invoice-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Qty</th>
            <th>Price</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {sale.items.map((item) => (
            <tr key={item.id}>
              <td>
                {item.product?.name}
                <div className="muted">
                  {[item.product?.brand, item.product?.size, item.product?.color].filter(Boolean).join(" · ")}
                </div>
              </td>
              <td>{qty(item.quantity)} {item.product?.unit}</td>
              <td>{money(item.unitPrice)}</td>
              <td>{money(item.totalPrice)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="invoice-totals">
        <div>Subtotal <strong>{money(sale.subtotal)} ETB</strong></div>
        <div>Grand total <strong>{money(sale.totalAmount)} ETB</strong></div>
        <div>Amount paid <strong>{money(sale.paidAmount)} ETB</strong></div>
        <div>Remaining to pay <strong>{money(sale.remainingBalance)} ETB</strong></div>
      </div>
      <p className="muted">Salesperson {sale.creator?.fullName}</p>

      <footer className="invoice-footer">
        <div>Designed by Abyssinia Software</div>
        <div>0951 05 0364</div>
      </footer>
    </article>
  );
}
