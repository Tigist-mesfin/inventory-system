import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, money, qty, VAT_RATE } from "../../api/client";

const pad = (n) => String(n).padStart(2, "0");
const isoLocal = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const todayIso = () => isoLocal(new Date());

async function fetchTodaySales() {
  const from = todayIso();
  const query = { limit: 500, status: "COMPLETED", from, to: from };
  const first = await api("/api/sales", { query });
  let rows = first.data.sales || [];
  const pages = Math.min(first.meta?.totalPages || 1, 10);
  for (let page = 2; page <= pages; page += 1) {
    const next = await api("/api/sales", { query: { ...query, page } });
    rows = rows.concat(next.data.sales || []);
  }
  return rows;
}

const customerKey = (sale) =>
  sale.customerId ||
  `walkin:${sale.customerName || "Walk-in"}:${sale.customerPhone || ""}`;

const customerName = (sale) =>
  sale.customerName || sale.customer?.name || "Walk-in";

export default function DailyBalanceCheck({ methods = [], reloadToken, onClose, onPay }) {
  const [sales, setSales] = useState([]);
  const [error, setError] = useState("");
  const [section, setSection] = useState("summary");

  const load = () =>
    fetchTodaySales()
      .then((rows) => {
        setSales(rows);
        setError("");
      })
      .catch((err) => setError(err.message));

  useEffect(() => {
    load();
  }, [reloadToken]);

  const itemTotals = useMemo(() => {
    const map = {};
    sales.forEach((sale) => {
      (sale.items || []).forEach((item) => {
        const id = item.productId || item.id;
        if (!map[id]) {
          map[id] = {
            id,
            name: item.product?.name || "Item",
            unit: item.product?.unit || "",
            qty: 0,
            withoutVat: 0,
            withVat: 0,
          };
        }
        map[id].qty += Number(item.quantity || 0);
        map[id].withoutVat += Number(item.totalPrice || 0);
        map[id].withVat += Number(item.totalWithVat || item.totalPrice || 0);
      });
    });
    return Object.values(map).sort((a, b) => b.withVat - a.withVat);
  }, [sales]);

  const deposits = useMemo(() => {
    const map = {};
    methods.forEach((method) => {
      map[method.name] = { name: method.name, paid: 0, invoices: 0 };
    });
    sales.forEach((sale) => {
      const key = sale.paymentMethod || "Unknown";
      if (!map[key]) map[key] = { name: key, paid: 0, invoices: 0 };
      map[key].paid += Number(sale.paidAmount || 0);
      map[key].invoices += 1;
    });
    return Object.values(map);
  }, [sales, methods]);

  const totals = useMemo(() => {
    const sold = sales.reduce((sum, sale) => sum + Number(sale.totalAmount || 0), 0);
    const paid = sales.reduce((sum, sale) => sum + Number(sale.paidAmount || 0), 0);
    const unpaid = sales.reduce((sum, sale) => sum + Number(sale.remainingBalance || 0), 0);
    return { sold, paid, unpaid, invoices: sales.length };
  }, [sales]);

  const unpaidCustomers = useMemo(() => {
    const map = {};
    sales
      .filter((sale) => Number(sale.remainingBalance || 0) > 0)
      .forEach((sale) => {
        const key = customerKey(sale);
        if (!map[key]) {
          map[key] = {
            key,
            customerId: sale.customerId || null,
            name: customerName(sale),
            phone: sale.customerPhone || sale.customer?.phone || "",
            outstanding: 0,
            invoices: [],
          };
        }
        map[key].outstanding += Number(sale.remainingBalance || 0);
        map[key].invoices.push(sale);
      });
    return Object.values(map).sort((a, b) => b.outstanding - a.outstanding);
  }, [sales]);

  const itemsOf = (sale) =>
    (sale.items || [])
      .map(
        (item) =>
          `${item.product?.name || "Item"} · ${qty(item.quantity)} ${item.product?.unit || ""}`,
      )
      .join(", ");

  return (
    <>
      <div className="topbar">
        <div>
          <h2 style={{ margin: 0 }}>Daily balance check</h2>
          <p className="muted">
            Today {todayIso()} · completed sales only. Deposits are money actually paid in.
          </p>
        </div>
        <button type="button" className="btn secondary" onClick={onClose}>
          Back to sales list
        </button>
      </div>
      {error ? <p className="error">{error}</p> : null}

      <div className="grid stats three" style={{ marginBottom: 16 }}>
        <article className="card stat-card">
          <span className="muted">Total sold today</span>
          <b>{money(totals.sold)} ETB</b>
          <small>{totals.invoices} invoice{totals.invoices === 1 ? "" : "s"}</small>
        </article>
        <article className="card stat-card">
          <span className="muted">Total paid today</span>
          <b>{money(totals.paid)} ETB</b>
          <small>Money deposited</small>
        </article>
        <article
          className={`card stat-card ${section === "unpaid" ? "stat-card-selected" : ""}`}
          role="button"
          tabIndex={0}
          style={{ cursor: "pointer" }}
          onClick={() => setSection(section === "unpaid" ? "summary" : "unpaid")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setSection(section === "unpaid" ? "summary" : "unpaid");
            }
          }}
        >
          <span className="muted">Total unpaid today</span>
          <b>{money(totals.unpaid)} ETB</b>
          <small>
            {unpaidCustomers.length} customer{unpaidCustomers.length === 1 ? "" : "s"} · click to list
          </small>
        </article>
      </div>

      {section === "unpaid" ? (
        <div className="card table-wrap">
          <h3 style={{ marginTop: 0 }}>Unpaid customers today</h3>
          <p className="muted">
            Outstanding balances from today’s sales, with the items they bought.
          </p>
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Outstanding</th>
                <th>What they bought</th>
                <th>Invoice</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {unpaidCustomers.map((row) =>
                row.invoices.map((sale, index) => (
                  <tr key={sale.id}>
                    {index === 0 ? (
                      <td rowSpan={row.invoices.length}>
                        <strong>{row.name}</strong>
                        <div className="muted">{row.phone || "No phone"}</div>
                        <div className="muted">
                          Customer total {money(row.outstanding)} ETB
                        </div>
                      </td>
                    ) : null}
                    <td>{money(sale.remainingBalance)} ETB</td>
                    <td>{itemsOf(sale) || "—"}</td>
                    <td>
                      {sale.invoiceNumber}
                      <div className="muted">
                        billed {money(sale.totalAmount)} · paid {money(sale.paidAmount)}
                      </div>
                    </td>
                    <td>
                      <div className="row-actions">
                        {onPay ? (
                          <button type="button" className="btn saffron" onClick={() => onPay(sale)}>
                            Collect
                          </button>
                        ) : null}
                        <Link className="btn secondary" to={`/sell/${sale.id}`}>View</Link>
                      </div>
                    </td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
          {unpaidCustomers.length === 0 ? (
            <p className="empty muted">No unpaid balances on today’s sales.</p>
          ) : null}
        </div>
      ) : (
        <>
          <div className="card table-wrap" style={{ marginBottom: 16 }}>
            <h3 style={{ marginTop: 0 }}>Today’s sales by item</h3>
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Qty</th>
                  <th>Total without VAT</th>
                  <th>Total with VAT</th>
                </tr>
              </thead>
              <tbody>
                {itemTotals.map((row) => (
                  <tr key={row.id}>
                    <td>
                      {row.name}
                      <div className="muted">{row.unit}</div>
                    </td>
                    <td>
                      {qty(row.qty)} {row.unit}
                    </td>
                    <td>{money(row.withoutVat)} ETB</td>
                    <td>{money(row.withVat)} ETB</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {itemTotals.length === 0 ? (
              <p className="empty muted">No completed sales today.</p>
            ) : null}
          </div>

          <div className="card table-wrap">
            <h3 style={{ marginTop: 0 }}>Money deposited by payment method</h3>
            <p className="muted">
              Amount actually paid in today, including VAT {VAT_RATE}%. Unpaid balances are not counted here.
            </p>
            <table>
              <thead>
                <tr>
                  <th>Payment method</th>
                  <th>Invoices</th>
                  <th>Deposited</th>
                </tr>
              </thead>
              <tbody>
                {deposits.map((row) => (
                  <tr key={row.name}>
                    <td>{row.name}</td>
                    <td>{row.invoices}</td>
                    <td>{money(row.paid)} ETB</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {deposits.length === 0 ? (
              <p className="empty muted">No payment methods recorded today.</p>
            ) : null}
            <p className="totals-box" style={{ marginTop: 12 }}>
              Total deposited today: <strong>{money(totals.paid)} ETB</strong>
              {" · "}
              Still unpaid: <strong>{money(totals.unpaid)} ETB</strong>
            </p>
          </div>
        </>
      )}
    </>
  );
}

