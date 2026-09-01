import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import LineEditor, { emptyLine, VatSummary } from "../../components/LineEditor";
import { can } from "../../auth/access";
import { useAuth } from "../../auth/AuthContext";
import OrdersBoard from "./OrdersBoard";
import InventoryLoading from "../../components/InventoryLoading";

const today = () => new Date().toISOString().slice(0, 10);

const rankByName = (items, query, getName) => {
  const needle = String(query || "").trim().toLowerCase();
  if (!needle) return items;
  const starts = [];
  const contains = [];
  for (const item of items) {
    const name = String(getName(item) || "").toLowerCase();
    if (name.startsWith(needle)) starts.push(item);
    else if (name.includes(needle)) contains.push(item);
  }
  return [...starts, ...contains];
};

function CustomerPicker({ customers, value, onChange }) {
  const wrapRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = customers.find((row) => String(row.id) === String(value));
  const options = useMemo(
    () =>
      rankByName(customers, query, (row) =>
        [row.name, row.phone, row.businessName].filter(Boolean).join(" "),
      ),
    [customers, query],
  );

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (event) => {
      if (!wrapRef.current?.contains(event.target)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const choose = (id) => {
    onChange(String(id));
    setOpen(false);
    setQuery("");
  };

  return (
    <div className="item-picker" ref={wrapRef}>
      <input
        className="item-picker-input"
        value={open ? query : selected ? `${selected.name} · ${selected.phone}` : ""}
        onChange={(e) => {
          setQuery(e.target.value);
          if (!open) setOpen(true);
        }}
        onFocus={() => {
          setOpen(true);
          setQuery("");
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (options[0]) choose(options[0].id);
          }
          if (e.key === "Escape") {
            setOpen(false);
            setQuery("");
          }
        }}
        placeholder={customers.length ? "Type customer name or phone…" : "No customers loaded"}
        autoComplete="off"
        required={!value}
      />
      {open ? (
        <div className="item-picker-menu">
          {!customers.length ? (
            <p className="muted" style={{ margin: 0, padding: "10px 12px" }}>
              No customers found. Open Customers and add one, or use Walk-in.
            </p>
          ) : options.length === 0 ? (
            <p className="muted" style={{ margin: 0, padding: "10px 12px" }}>
              No customer matches that name.
            </p>
          ) : (
            <ul>
              {options.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    className={String(row.id) === String(value) ? "is-selected" : ""}
                    onClick={() => choose(row.id)}
                  >
                    {row.name} · {row.phone}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

function StaffOrderForm({ onCreated }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [stockByProduct, setStockByProduct] = useState({});
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
        const inv = await api("/api/inventory/by-item", { query: { limit: 500 } });
        const items = inv.data.items || [];
        const nextProducts = [];
        const nextStock = {};
        for (const row of items) {
          const id = row.productId || row.product?.id;
          if (!id || !row.product) continue;
          const onHand = Number(row.quantity || 0);
          nextStock[id] = onHand;
          nextProducts.push({
            ...row.product,
            id,
            sellingPrice: row.product.sellingPrice,
          });
        }
        if (!cancelled) {
          setProducts(nextProducts);
          setStockByProduct(nextStock);
        }
      } catch (err) {
        try {
          const [p, inv] = await Promise.all([
            api("/api/products", { query: { status: "ACTIVE", limit: 500 } }),
            api("/api/inventory", { query: { limit: 500 } }),
          ]);
          const nextStock = {};
          for (const row of inv.data.inventory || []) {
            const id = row.productId;
            nextStock[id] = (nextStock[id] || 0) + Number(row.available || 0);
          }
          if (!cancelled) {
            setProducts(p.data.products || []);
            setStockByProduct(nextStock);
          }
        } catch (fallbackErr) {
          errors.push(fallbackErr.message || err.message);
        }
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
          <CustomerPicker customers={customers} value={customerId} onChange={setCustomerId} />
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
        inStockOnly
        emptyText="No item with stock matches that name."
      />
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
