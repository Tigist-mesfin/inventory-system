import { useEffect, useMemo, useState } from "react";
import { api, money } from "../../api/client";
import LineEditor, { emptyLine, lineAmount } from "../../components/LineEditor";
import { can } from "../../auth/access";
import { useAuth } from "../../auth/AuthContext";
import TradeTabs from "./TradeTabs";
import OrdersBoard from "./OrdersBoard";

const today = () => new Date().toISOString().slice(0, 10);

function StaffOrderForm({ onCreated }) {
  const { user } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [party, setParty] = useState("registered");
  const [customerId, setCustomerId] = useState("");
  const [walkInName, setWalkInName] = useState("");
  const [walkInPhone, setWalkInPhone] = useState("");
  const [deliveryDate, setDeliveryDate] = useState(today());
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState([emptyLine()]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const stockByProduct = useMemo(() => {
    const map = {};
    inventory.forEach((row) => {
      map[row.productId] = (map[row.productId] || 0) + Number(row.available || 0);
    });
    return map;
  }, [inventory]);

  const grandTotal = lines.reduce((sum, line) => sum + lineAmount(line), 0);

  useEffect(() => {
    Promise.all([
      api("/api/customers", { query: { type: "CUSTOMER", status: "ACTIVE", limit: 200 } }),
      api("/api/products", { query: { status: "ACTIVE", limit: 200 } }),
      api("/api/inventory", { query: { limit: 500 } }),
    ])
      .then(([c, p, inv]) => {
        setCustomers(c.data.customers || []);
        setProducts(p.data.products || []);
        setInventory(inv.data.inventory || []);
      })
      .catch((err) => setError(err.message));
  }, []);

  if (!can(user, "sales", "CREATE")) return null;

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
          unitPrice: Number(line.unitPrice),
        }));
      if (!items.length) throw new Error("Add at least one item");
      let customerName = walkInName.trim();
      let customerPhone = walkInPhone.trim();
      if (party === "registered") {
        const customer = customers.find((row) => row.id === customerId);
        if (!customer) throw new Error("Choose a customer");
        customerName = customer.name;
        customerPhone = customer.phone;
      }
      if (!customerName || !customerPhone) {
        throw new Error("Enter customer name and phone");
      }
      await api("/api/customer-orders", {
        method: "POST",
        body: {
          customerName,
          customerPhone,
          deliveryDate,
          notes: notes || null,
          items,
        },
      });
      setLines([emptyLine()]);
      setNotes("");
      setWalkInName("");
      setWalkInPhone("");
      onCreated?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="card" onSubmit={submit} style={{ marginBottom: 18 }}>
      <h3 style={{ marginTop: 0 }}>New customer order</h3>
      <p className="muted">Record an order for a customer. Approve it later to sell stock.</p>
      <div className="seg" style={{ marginBottom: 12 }}>
        <button
          type="button"
          className={`btn ${party === "registered" ? "" : "secondary"}`}
          onClick={() => setParty("registered")}
        >
          Registered customer
        </button>
        <button
          type="button"
          className={`btn ${party === "walkin" ? "" : "secondary"}`}
          onClick={() => setParty("walkin")}
        >
          Walk-in
        </button>
      </div>
      {party === "registered" ? (
        <label className="field">
          <span>Customer</span>
          <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} required>
            <option value="">Select customer</option>
            {customers.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name} · {row.phone}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <div className="toolbar">
          <label className="field">
            <span>Name</span>
            <input value={walkInName} onChange={(e) => setWalkInName(e.target.value)} required />
          </label>
          <label className="field">
            <span>Phone</span>
            <input value={walkInPhone} onChange={(e) => setWalkInPhone(e.target.value)} required />
          </label>
        </div>
      )}
      <label className="field">
        <span>Delivery date</span>
        <input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} required />
      </label>
      <LineEditor
        products={products}
        stockByProduct={stockByProduct}
        lines={lines}
        onChange={setLines}
        priceKey="sellingPrice"
      />
      <button
        type="button"
        className="btn secondary"
        onClick={() => setLines([...lines, emptyLine()])}
      >
        Add item
      </button>
      <label className="field" style={{ marginTop: 12 }}>
        <span>Notes</span>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>
      <p>
        Total <strong>{money(grandTotal)} ETB</strong>
      </p>
      {error ? <p className="error">{error}</p> : null}
      <button className="btn saffron" disabled={busy}>
        {busy ? "Saving…" : "Save order"}
      </button>
    </form>
  );
}

export default function CustomerOrdersPage() {
  const [reloadKey, setReloadKey] = useState(0);
  return (
    <>
      <div className="topbar">
        <div>
          <h1 style={{ margin: 0 }}>Customer orders</h1>
          <p className="muted">
            Staff record orders for customers, then approve them to sell stock.
          </p>
        </div>
      </div>
      <TradeTabs />
      <StaffOrderForm onCreated={() => setReloadKey((value) => value + 1)} />
      <OrdersBoard reloadKey={reloadKey} />
    </>
  );
}
