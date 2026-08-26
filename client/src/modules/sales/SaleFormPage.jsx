import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, money, qty } from "../../api/client";
import LineEditor, { emptyLine, lineAmount } from "../../components/LineEditor";

export default function SaleFormPage() {
  const navigate = useNavigate();
  const [warehouses, setWarehouses] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [party, setParty] = useState("registered");
  const [step, setStep] = useState("form");
  const [paidAmount, setPaidAmount] = useState("");
  const [form, setForm] = useState({
    warehouseId: "",
    customerId: "",
    walkInName: "",
    paymentMethod: "CASH",
    items: [emptyLine()],
  });
  const [methods, setMethods] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const stockByProduct = useMemo(() => {
    const map = {};
    inventory
      .filter((row) => !form.warehouseId || row.warehouseId === form.warehouseId)
      .forEach((row) => {
        map[row.productId] = (map[row.productId] || 0) + Number(row.available || 0);
      });
    return map;
  }, [inventory, form.warehouseId]);

  const filledItems = form.items.filter((line) => line.productId);
  const grandTotal = filledItems.reduce((sum, line) => sum + lineAmount(line), 0);
  const paid = Number(paidAmount === "" ? grandTotal : paidAmount);
  const remaining = Math.max(0, grandTotal - paid);

  useEffect(() => {
    Promise.all([
      api("/api/warehouses"),
      api("/api/customers", { query: { type: "CUSTOMER", status: "ACTIVE" } }),
      api("/api/products", { query: { status: "ACTIVE", limit: 100 } }),
      api("/api/payment-methods", { query: { status: "ACTIVE" } }),
    ])
      .then(([w, c, p, m]) => {
        setWarehouses(w.data.warehouses);
        setCustomers(c.data.customers);
        setProducts(p.data.products);
        setMethods(m.data.paymentMethods || []);
        setForm((prev) => ({
          ...prev,
          warehouseId: prev.warehouseId || w.data.warehouses[0]?.id || "",
          customerId: "",
          paymentMethod: prev.paymentMethod || m.data.paymentMethods?.[0]?.name || "CASH",
        }));
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!form.warehouseId) return;
    api("/api/inventory", { query: { warehouseId: form.warehouseId, limit: 200 } })
      .then((inv) => setInventory(inv.data.inventory || []))
      .catch((err) => setError(err.message));
  }, [form.warehouseId]);

  const validateStock = () => {
    for (const line of filledItems) {
      const available = stockByProduct[line.productId];
      if (available != null && Number(line.quantity) > Number(available)) {
        const product = products.find((p) => p.id === line.productId);
        throw new Error(
          `${product?.name || "Item"} only has ${qty(available)} ${product?.unit || "unit"} in this store`,
        );
      }
    }
  };

  const goReview = (event) => {
    event.preventDefault();
    setError("");
    try {
      if (!filledItems.length) throw new Error("Add at least one item");
      validateStock();
      setPaidAmount(String(grandTotal.toFixed(2)));
      setStep("review");
    } catch (err) {
      setError(err.message);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (Number.isNaN(paid) || paid < 0) throw new Error("Enter a valid amount paid");
      if (paid > grandTotal) throw new Error("Amount paid cannot be more than the grand total");
      validateStock();
      const created = await api("/api/sales", {
        method: "POST",
        body: {
          warehouseId: form.warehouseId,
          customerId: party === "registered" ? form.customerId || null : null,
          customerName: party === "walkin" ? form.walkInName : undefined,
          paymentMethod: form.paymentMethod,
          items: filledItems.map((item) => ({
            productId: item.productId,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
          })),
        },
      });
      const completed = await api(`/api/sales/${created.data.sale.id}/complete`, {
        method: "POST",
        body: { paidAmount: paid },
      });
      navigate(`/sell/${completed.data.sale.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (step === "review") {
    return (
      <form className="card" onSubmit={submit}>
        <h1>Review sale</h1>
        <p className="muted">Check each item, enter how much was paid, then save to open the invoice.</p>

        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {filledItems.map((line) => {
              const product = products.find((p) => p.id === line.productId);
              return (
                <tr key={line.productId}>
                  <td>{product?.name}</td>
                  <td>{qty(line.quantity)} {product?.unit}</td>
                  <td>{money(line.unitPrice)}</td>
                  <td>{money(lineAmount(line))} ETB</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="totals-box" style={{ marginTop: 16 }}>
          <p>Grand total: <strong>{money(grandTotal)} ETB</strong></p>
          <p className="muted" style={{ marginBottom: 0 }}>
            Payment: {form.paymentMethod}
            {party === "registered"
              ? ` · ${customers.find((c) => c.id === form.customerId)?.name || ""}`
              : ` · ${form.walkInName}`}
          </p>
        </div>

        <label className="field" style={{ marginTop: 16 }}>
          <span>Amount paid (ETB)</span>
          <input
            type="number"
            min="0"
            step="0.01"
            max={grandTotal}
            value={paidAmount}
            onChange={(e) => setPaidAmount(e.target.value)}
            required
          />
        </label>
        <p className={remaining > 0 ? "error" : "muted"}>
          Remaining to pay: <strong>{money(remaining)} ETB</strong>
          {remaining > 0 && party === "registered"
            ? " — this customer will be recorded as partially paid."
            : remaining > 0
              ? " — remaining balance is kept on this invoice."
              : " — fully paid."}
        </p>

        {error ? <p className="error">{error}</p> : null}
        <div className="row-actions" style={{ marginTop: 16 }}>
          <button type="button" className="btn secondary" onClick={() => setStep("form")} disabled={busy}>
            Back
          </button>
          <button className="btn saffron" disabled={busy}>
            {busy ? "Saving sale…" : "Save sale"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form className="card" onSubmit={goReview}>
      <h1>Add new sale</h1>
      <p className="muted">
        Select items and enter quantity. Available quantity in this store is shown for each item.
      </p>

      <div className="seg">
        <button type="button" className={`btn ${party === "registered" ? "" : "secondary"}`} onClick={() => setParty("registered")}>
          Customer from list
        </button>
        <button type="button" className={`btn ${party === "walkin" ? "" : "secondary"}`} onClick={() => setParty("walkin")}>
          Walk-in customer
        </button>
      </div>

      <div className="grid split" style={{ marginTop: 14 }}>
        <label className="field">
          <span>Store / warehouse (stock comes from here)</span>
          <select value={form.warehouseId} onChange={(e) => setForm({ ...form, warehouseId: e.target.value })}>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </label>
        {party === "registered" ? (
          <label className="field">
            <span>Customer from list</span>
            <select value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })} required>
              <option value="">Select customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name} {c.phone ? `· ${c.phone}` : ""}</option>
              ))}
            </select>
          </label>
        ) : (
          <label className="field">
            <span>Walk-in customer name</span>
            <input
              value={form.walkInName}
              onChange={(e) => setForm({ ...form, walkInName: e.target.value })}
              required
            />
          </label>
        )}
        <label className="field">
          <span>Payment method</span>
          <select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>
            {methods.map((m) => (
              <option key={m.id} value={m.name}>{m.name}</option>
            ))}
          </select>
        </label>
      </div>

      <h3>Items sold</h3>
      <LineEditor
        products={products}
        stockByProduct={stockByProduct}
        lines={form.items}
        onChange={(items) => setForm({ ...form, items })}
        priceKey="sellingPrice"
        lockPrice
      />

      <div className="totals-box" style={{ marginTop: 16 }}>
        {filledItems.map((line) => {
          const product = products.find((p) => p.id === line.productId);
          return (
            <div key={line.productId}>
              {product?.name} total: <strong>{money(lineAmount(line))} ETB</strong>
            </div>
          );
        })}
        <p style={{ marginBottom: 0 }}>
          Grand total: <strong>{money(grandTotal)} ETB</strong>
        </p>
      </div>

      {error ? <p className="error">{error}</p> : null}
      <button className="btn saffron" style={{ marginTop: 16 }}>
        Review sale
      </button>
    </form>
  );
}
