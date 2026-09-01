import { useState } from "react";
import { Link } from "react-router-dom";
import { documentVat, money, qty, vatOf, withVat } from "../api/client";
import DesignerCredit from "./DesignerCredit";

const STATUS_LABEL = {
  PENDING: "Pending",
  ON_LOADING: "Sold",
  DELIVERED: "Sent",
  CANCELLED: "Cancelled",
};

function ethiopianWaPhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("251") && digits.length >= 12) return digits;
  if (digits.startsWith("0") && digits.length >= 10) return `251${digits.slice(1)}`;
  if (digits.length === 9) return `251${digits}`;
  return digits;
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function shareText({ company, order, totals, url, includeUrl = true }) {
  const lines = [
    `${company?.name || "Proforma"} · ${order.orderNumber}`,
    `${order.customerName} · Total ${money(totals.total)} ETB`,
    "",
    "You can see the details here:",
  ];
  if (includeUrl && url) lines.push(url);
  return lines.join("\n");
}

export default function ProformaSheet({
  company,
  order,
  shareUrl,
  backTo,
}) {
  const [copied, setCopied] = useState("");
  const totals = documentVat(order || {});
  const items = order.items || [];

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
    const text = shareText({ company, order, totals, url: shareUrl });
    const phone = ethiopianWaPhone(order.customerPhone);
    const target = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(target, "_blank", "noopener,noreferrer");
  };

  const shareTelegram = () => {
    const caption = shareText({
      company,
      order,
      totals,
      url: shareUrl,
      includeUrl: false,
    });
    const params = new URLSearchParams();
    if (shareUrl) params.set("url", shareUrl);
    params.set("text", caption);
    window.open(`https://t.me/share/url?${params.toString()}`, "_blank", "noopener,noreferrer");
  };

  const shareNative = async () => {
    const caption = shareText({
      company,
      order,
      totals,
      url: shareUrl,
      includeUrl: false,
    });
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Proforma ${order.orderNumber}`,
          text: caption,
          url: shareUrl || undefined,
        });
        return;
      } catch {
        /* user cancelled or share failed — fall back */
      }
    }
    shareWhatsApp();
  };

  return (
    <article className="card invoice invoice-sheet proforma-sheet">
      <div className="invoice-actions no-print">
        {backTo ? (
          <Link className="btn secondary" to={backTo}>
            Back to orders
          </Link>
        ) : null}
        <button type="button" className="btn secondary" onClick={copyLink} disabled={!shareUrl}>
          {copied || "Copy share link"}
        </button>
        <button type="button" className="btn secondary" onClick={shareWhatsApp}>
          WhatsApp
        </button>
        <button type="button" className="btn secondary" onClick={shareTelegram}>
          Telegram
        </button>
        <button type="button" className="btn secondary" onClick={shareNative}>
          Other
        </button>
        <button type="button" className="btn saffron" onClick={() => window.print()}>
          Print proforma
        </button>
      </div>

      <div className="proforma-banner">
        <div>
          <div className="proforma-kicker">Proforma invoice</div>
          <h1 className="invoice-company">{company?.name || "Company name"}</h1>
          {company?.address ? <p>{company.address}</p> : null}
          <p className="muted">
            {[company?.phone, company?.email, company?.tin ? `TIN ${company.tin}` : null]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <div className="proforma-meta">
          <div className="proforma-stamp">PROFORMA</div>
          <strong>{order.orderNumber}</strong>
          <div>Date {formatDate(order.createdAt)}</div>
          <div>Delivery {formatDate(order.deliveryDate)}</div>
          <div className="pill">{STATUS_LABEL[order.status] || order.status}</div>
        </div>
      </div>

      <section className="invoice-party">
        <div>
          <span className="muted">Prepared for</span>
          <strong>{order.customerName}</strong>
          <div>{order.customerPhone}</div>
        </div>
        <div>
          <span className="muted">VAT</span>
          <strong>{totals.rate}%</strong>
          <div>Prices below show VAT on each line</div>
        </div>
      </section>

      {order.notes ? (
        <p className="proforma-notes">
          <span className="muted">Notes</span>
          {order.notes}
        </p>
      ) : null}

      <table className="invoice-table proforma-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Item</th>
            <th>Qty</th>
            <th>Price</th>
            <th>Amount</th>
            <th>VAT {totals.rate}%</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => {
            const net = Number(item.totalPrice || 0);
            const lineVat = Number(item.vatAmount != null ? item.vatAmount : vatOf(net));
            const lineTotal = Number(item.totalWithVat != null ? item.totalWithVat : withVat(net));
            return (
              <tr key={item.id || `${item.productId}-${index}`}>
                <td>{index + 1}</td>
                <td>
                  {item.product?.name || "Item"}
                  <div className="muted">
                    {[item.product?.sku, item.product?.brand, item.product?.size, item.product?.color]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                </td>
                <td>
                  {qty(item.quantity)} {item.product?.unit || ""}
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

      <div className="invoice-totals proforma-totals">
        <div>
          Subtotal <strong>{money(totals.net)} ETB</strong>
        </div>
        <div className="proforma-vat-row">
          VAT {totals.rate}% <strong>{money(totals.tax)} ETB</strong>
        </div>
        <div className="proforma-grand">
          Grand total <strong>{money(totals.total)} ETB</strong>
        </div>
      </div>

      <p className="proforma-disclaimer">
        This is a proforma invoice for the customer order. It is not a tax invoice until the
        order is approved and sold.
      </p>

      <DesignerCredit />
    </article>
  );
}
