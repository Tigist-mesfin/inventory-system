import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { api, documentVat, money, qty, absoluteShareUrl, vatOf, withVat } from "../../api/client";
import DesignerCredit from "../../components/DesignerCredit";
import InventoryLoading from "../../components/InventoryLoading";

const STANDING = {
  UNPAID: "Not paid",
  PARTIAL: "Partially paid",
  PAID: "Paid in full",
};

const ethiopianWaPhone = (value) => {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("251") && digits.length >= 12) return digits;
  if (digits.startsWith("0") && digits.length >= 10) return `251${digits.slice(1)}`;
  if (digits.length === 9) return `251${digits}`;
  return digits;
};

function invoiceShareText({ company, sale, vat, url, includeUrl = true }) {
  const who = sale.customerName || sale.customer?.name || "Walk-in";
  const lines = [
    `${company?.name || "Invoice"} · ${sale.invoiceNumber}`,
    `${who} · Total ${money(vat.total)} ETB`,
  ];
  if (includeUrl && url) {
    // Blank lines + bare https URL so WhatsApp/Telegram auto-link it.
    lines.push("", "Open receipt:", "", url);
  } else {
    lines.push("", "Open receipt:");
  }
  return lines.join("\n");
}

export default function InvoicePage({
  publicSale = null,
  publicCompany = null,
  publicShareUrl = "",
} = {}) {
  const { id } = useParams();
  const [sale, setSale] = useState(publicSale);
  const [company, setCompany] = useState(publicCompany);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  useEffect(() => {
    if (publicSale) {
      setSale(publicSale);
      setCompany(publicCompany);
      return undefined;
    }
    Promise.all([api(`/api/sales/${id}`), api("/api/company-profile")])
      .then(([saleRes, companyRes]) => {
        setSale(saleRes.data.sale);
        setCompany(companyRes.data.company);
      })
      .catch((err) => setError(err.message));
    return undefined;
  }, [id, publicSale, publicCompany]);

  const shareUrl = useMemo(() => {
    if (publicShareUrl) {
      const raw = String(publicShareUrl).replace(/\?.*$/, "").trim();
      if (/^https?:\/\//i.test(raw)) return raw;
      return absoluteShareUrl(raw);
    }
    if (!sale?.shareToken) return "";
    return absoluteShareUrl(`/i/${sale.shareToken}`);
  }, [publicShareUrl, sale?.shareToken]);

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
  if (!sale) return <InventoryLoading message="Loading inventory..." />;

  const companyReady = Boolean(company?.name);
  const vat = documentVat({
    subtotal: sale.subtotal,
    discountAmount: sale.discountAmount,
    taxAmount: sale.taxAmount,
    totalAmount: sale.totalAmount,
    vatRate: sale.vatRate || company?.vatRate,
  });
  const text = invoiceShareText({ company, sale, vat, url: shareUrl });
  const customerPhone = ethiopianWaPhone(sale.customerPhone || sale.customer?.phone);

  const copyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied("Link copied");
    } catch {
      setCopied("Copy the link from the address bar");
    }
    window.setTimeout(() => setCopied(""), 2500);
  };

  const shareWhatsApp = () => {
    const target = customerPhone
      ? `https://wa.me/${customerPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(target, "_blank", "noopener,noreferrer");
  };

  const shareTelegram = () => {
    // Put the https URL in the message body so it stays a tappable link after send.
    const text = invoiceShareText({
      company,
      sale,
      vat,
      url: shareUrl,
      includeUrl: true,
    });
    const params = new URLSearchParams();
    if (shareUrl) params.set("url", shareUrl);
    params.set("text", text);
    window.open(`https://t.me/share/url?${params.toString()}`, "_blank", "noopener,noreferrer");
  };

  const shareOther = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Invoice ${sale.invoiceNumber}`,
          text: text,
          url: shareUrl || undefined,
        });
        return;
      } catch {
        /* cancelled */
      }
    }
    copyLink();
  };

  return (
    <article className="card invoice invoice-sheet">
      <div className="invoice-actions no-print">
        <button type="button" className="btn secondary" onClick={shareWhatsApp}>
          WhatsApp
        </button>
        <button type="button" className="btn secondary" onClick={shareTelegram}>
          Telegram
        </button>
        <button type="button" className="btn secondary" onClick={shareOther}>
          Other
        </button>
        <button type="button" className="btn secondary" onClick={copyLink} disabled={!shareUrl}>
          {copied || "Copy link"}
        </button>
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
          <div className="muted">VAT {vat.rate}%</div>
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
          <strong>{sale.paymentMethod === "WALLET" ? "Wallet" : sale.paymentMethod}</strong>
          <div>{STANDING[sale.paymentStatus] || sale.paymentStatus}</div>
          {sale.paymentMethod === "WALLET" ? (
            <div className="muted">Deducted from customer wallet</div>
          ) : null}
        </div>
      </section>

      <table className="invoice-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Qty</th>
            <th>Price</th>
            <th>Amount</th>
            <th>VAT {vat.rate}%</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {sale.items.map((item) => {
            const net = Number(item.totalPrice || 0);
            const lineVat = Number(item.vatAmount != null ? item.vatAmount : vatOf(net));
            const lineTotal = Number(item.totalWithVat != null ? item.totalWithVat : withVat(net));
            return (
              <tr key={item.id}>
                <td>
                  {item.product?.name}
                  <div className="muted">
                    {[item.product?.brand, item.product?.size, item.product?.color]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                </td>
                <td>
                  {qty(item.quantity)} {item.product?.unit}
                </td>
                <td>{money(item.unitPrice)}</td>
                <td>{money(net)}</td>
                <td>{money(lineVat)}</td>
                <td>{money(lineTotal)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="invoice-totals">
        <div>
          Subtotal <strong>{money(vat.net)} ETB</strong>
        </div>
        {Number(sale.discountAmount || 0) > 0 ? (
          <div>
            Discount <strong>{money(sale.discountAmount)} ETB</strong>
          </div>
        ) : null}
        <div className="proforma-vat-row">
          VAT {vat.rate}% <strong>{money(vat.tax)} ETB</strong>
        </div>
        <div className="proforma-grand">
          Grand total <strong>{money(vat.total)} ETB</strong>
        </div>
        <div>
          Amount paid <strong>{money(sale.paidAmount)} ETB</strong>
        </div>
        <div>
          Remaining to pay <strong>{money(sale.remainingBalance)} ETB</strong>
        </div>
      </div>
      <p className="muted">Salesperson {sale.creator?.fullName}</p>

      <DesignerCredit />
    </article>
  );
}
