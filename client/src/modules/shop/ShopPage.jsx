import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, money, qty } from "../../api/client";
import LineEditor, { emptyLine, lineAmount } from "../../components/LineEditor";

export default function ShopPage() {
  const [products, setProducts] = useState([]);
  const [lines, setLines] = useState([emptyLine()]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(null);

  useEffect(() => {
    api("/api/shop/products")
      .then((res) => setProducts(res.data.products || []))
      .catch((err) => setError(err.message));
  }, []);

  const shopProducts = products.map((p) => ({
    ...p,
    purchasePrice: p.sellingPrice,
  }));

  const grandTotal = lines.reduce((sum, line) => sum + lineAmount(line), 0);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const items = lines
        .filter((line) => line.productId)
        .map((line) => ({
          productId: line.productId,
          quantity: Number(line.quantity),
        }));
      const res = await api("/api/shop/orders", {
        method: "POST",
        body: { customerName, customerPhone, deliveryDate, items },
      });
      setDone(res.data.order);
      setLines([emptyLine()]);
      setCustomerName("");
      setCustomerPhone("");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap" style={{ alignItems: "flex-start", paddingTop: 24 }}>
      <div style={{ width: "min(720px, 100%)" }}>
        <div className="topbar">
          <div>
            <h1 style={{ margin: 0 }}>Order items</h1>
            <p className="muted">No login needed. Choose available items, amounts, your name, phone, and delivery date.</p>
          </div>
          <Link className="btn secondary" to="/login">Staff login</Link>
        </div>

        {done ? (
          <div className="card totals-box" style={{ marginBottom: 16 }}>
            Order <strong>{done.orderNumber}</strong> received. Total {money(done.totalAmount)} ETB.
            Status: pending until the store approves it.
          </div>
        ) : null}

        <form className="card" onSubmit={submit}>
          <div className="grid split">
            <label className="field">
              <span>Your name</span>
              <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
            </label>
            <label className="field">
              <span>Phone</span>
              <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} required />
            </label>
          </div>
          <label className="field" style={{ marginTop: 12 }}>
            <span>Delivery date</span>
            <input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} required />
          </label>

          <h3>Items</h3>
          <LineEditor
            products={shopProducts}
            showStock
            stockByProduct={Object.fromEntries(products.map((p) => [p.id, Number(p.available || 0)]))}
            lines={lines}
            onChange={setLines}
            priceKey="sellingPrice"
          />

          <div className="totals-box" style={{ marginTop: 16 }}>
            Grand total: <strong>{money(grandTotal)} ETB</strong>
          </div>
          {error ? <p className="error">{error}</p> : null}
          <button className="btn saffron" style={{ marginTop: 16 }} disabled={busy}>
            {busy ? "Sending order…" : "Place order"}
          </button>
        </form>
      </div>
    </div>
  );
}
