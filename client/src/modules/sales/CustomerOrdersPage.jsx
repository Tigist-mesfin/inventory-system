import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import LineEditor, { emptyLine, VatSummary } from "../../components/LineEditor";
import { can } from "../../auth/access";
import { useAuth } from "../../auth/AuthContext";
import OrdersBoard from "./OrdersBoard";
import InventoryLoading from "../../components/InventoryLoading";
import PartySelectField from "../../components/PartySelectField";

const today = () => new Date().toISOString().slice(0, 10);

function StaffOrderForm({ onCreated }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [party, setParty] = useState("registered");
  const [customerId, setCustomerId] = useState("");
  const [walkInName, setWalkInName] = useState("");
  const [walkInPhone, setWalkInPhone] = useState("");
  const [deliveryDate, setDeliveryDate] = useState(today());
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState([emptyLine()]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const errors = [];
      try {
        const c = await api("/api/customer-orders/customers", {
          query: { limit: 200 },
        });
        if (!cancelled) setCustomers(c.data.customers || []);
      } catch (err) {
        try {
          const fallback = await api("/api/customers", {
            query: { type: "CUSTOMER", status: "ACTIVE", limit: 100 },
          });
          if (!cancelled) setCustomers(fallback.data.customers || []);
        } catch (fallbackErr) {
          errors.push(fallbackErr.message || err.message);
        }
      }
      try {
        const p = await api("/api/products", { query: { status: "ACTIVE", limit: 500 } });
        if (!cancelled) setProducts(p.data.products || []);
      } catch (err) {
        errors.push(err.message);
      }
      if (!cancelled) {
        if (errors.length) setError(errors[0]);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!customers.length) setParty("walkin");
  }, [customers.length]);

  if (!can(user, "sales", "CREATE")) return null;
  if (!ready) return <InventoryLoading message="Loading inventory..." />;

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
        const customer = customers.find((row) => String(row.id) === String(customerId));
        if (!customer) throw new Error("Choose a customer");
        customerName = customer.name;
        customerPhone = customer.phone;
      }
      if (!customerName || !customerPhone) {
        throw new Error("Enter customer name and phone");
      }
      const res = await api("/api/customer-orders", {
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
      setCustomerId("");
      onCreated?.();
      const orderId = res.data?.order?.id;
      if (orderId) navigate(`/orders/${orderId}/proforma`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="card" onSubmit={submit} style={{ marginBottom: 18 }}>
      <h3 style={{ marginTop: 0 }}>Prepare proforma</h3>
      <p className="muted">
        Register the customer order, then print or share the proforma. Approve later to sell stock.
      </p>
      <PartySelectField
        options={customers.map((row) => ({
          id: row.id,
          name: [row.name, row.phone].filter(Boolean).join(" · "),
        }))}
        party={party}
        onPartyChange={(next) => {
          setParty(next);
          if (next === "registered") {
            setWalkInName("");
            setWalkInPhone("");
          } else {
            setCustomerId("");
          }
        }}
        valueId={customerId}
        onValueIdChange={setCustomerId}
        walkInName={walkInName}
        onWalkInNameChange={setWalkInName}
        walkInPhone={walkInPhone}
        onWalkInPhoneChange={setWalkInPhone}
        showWalkInPhone
        selectLabel="Customer"
        walkInLabel="Walk-in customer (not in list)"
        walkInNameLabel="Walk-in customer name"
        walkInPlaceholder="Customer name"
        emptySelectText="No customers yet"
        registerTo="/customers?type=CUSTOMER"
        registerLabel="Register customer"
      />
      <label className="field">
        <span>Delivery date</span>
        <input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} required />
      </label>
      <LineEditor
        products={products}
        lines={lines}
        onChange={setLines}
        priceKey="sellingPrice"
        showStock={false}
        emptyText="No product matches that name."
      />
      <p className="muted" style={{ marginTop: 6 }}>
        You can order any quantity — stock is checked only when you approve the order into sales.
      </p>
      <label className="field" style={{ marginTop: 12 }}>
        <span>Notes</span>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>
      <VatSummary lines={lines} products={products} />
      {error ? <p className="error">{error}</p> : null}
      <button className="btn saffron" disabled={busy}>
        {busy ? "Saving…" : "Save and open proforma"}
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
            Register an order, print or share the proforma, then approve it to sell stock.
          </p>
        </div>
      </div>
      <StaffOrderForm onCreated={() => setReloadKey((value) => value + 1)} />
      <OrdersBoard reloadKey={reloadKey} />
    </>
  );
}
