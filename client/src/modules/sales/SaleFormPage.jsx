import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, money, qty, VAT_RATE, vatOf, withVat } from "../../api/client";
import LineEditor, { emptyLine, lineAmount, VatSummary } from "../../components/LineEditor";
import SaleLotChoice from "../../components/SaleLotChoice";
import InventoryLoading from "../../components/InventoryLoading";

const STEPS = [
  { id: "form", label: "Items" },
  { id: "review", label: "Review" },
];

const qtyInStore = (row, warehouseId) => {
  if (!warehouseId) return Number(row.quantity || 0);
  const wanted = String(warehouseId);
  const store = (row.stores || []).find((item) => String(item.warehouseId) === wanted);
  if (store) return Number(store.quantity || 0);
  if (String(row.warehouseId || "") === wanted) {
    return Number(row.available ?? row.quantity ?? 0);
  }
  return 0;
};

const warehouseWithStock = (warehouses, items) => {
  const qtyByStore = new Map();
  for (const row of items || []) {
    const stores = row.stores?.length
      ? row.stores
      : row.warehouseId
        ? [{ warehouseId: row.warehouseId, quantity: row.available ?? row.quantity }]
        : [];
    for (const store of stores) {
      const onHand = Number(store.quantity || 0);
      if (onHand <= 0 || !store.warehouseId) continue;
      qtyByStore.set(
        store.warehouseId,
        (qtyByStore.get(store.warehouseId) || 0) + onHand,
      );
    }
  }
  let best = null;
  for (const [id, total] of qtyByStore) {
    if (!best || total > best.total) best = { id, total };
  }
  if (best?.id) return best.id;
  return warehouses?.[0]?.id || "";
};

function SaleSteps({ current }) {
  const index = STEPS.findIndex((row) => row.id === current);
  return (
    <ol className="sale-steps">
      {STEPS.map((row, i) => (
        <li
          key={row.id}
          className={i === index ? "is-current" : i < index ? "is-done" : ""}
        >
          <span>{i + 1}</span>
          {row.label}
        </li>
      ))}
    </ol>
  );
}

export default function SaleFormPage() {
  const navigate = useNavigate();
  const { id: editId } = useParams();
  const editing = Boolean(editId);
  const [warehouses, setWarehouses] = useState([]);
  const [customers, setCustomers] = useState([]);
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
  const [costing, setCosting] = useState({});
  const [payFrom, setPayFrom] = useState("direct");
  const [ready, setReady] = useState(false);

  const stockByProduct = useMemo(() => {
    const map = {};
    inventory.forEach((row) => {
      const onHand = qtyInStore(row, form.warehouseId);
      if (onHand > 0) map[row.productId] = onHand;
    });
    return map;
  }, [inventory, form.warehouseId]);

  const products = useMemo(
    () =>
      inventory
        .map((row) => {
          if (qtyInStore(row, form.warehouseId) <= 0 || !row.product) return null;
          return {
            ...row.product,
            id: row.productId || row.product.id,
          };
        })
        .filter(Boolean),
    [inventory, form.warehouseId],
  );

  const storesWithStock = useMemo(
    () =>
      warehouses.filter((warehouse) =>
        inventory.some((row) => qtyInStore(row, warehouse.id) > 0),
      ),
    [warehouses, inventory],
  );

  const filledItems = form.items.filter((line) => line.productId);
  const subtotal = filledItems.reduce((sum, line) => sum + lineAmount(line), 0);
  const vatAmount = vatOf(subtotal);
  const grandTotal = withVat(subtotal);
  const selectedCustomer = customers.find((row) => row.id === form.customerId);
  const walletBalance = Number(selectedCustomer?.walletBalance || 0);
  const paid = Number(paidAmount === "" ? grandTotal : paidAmount);
  const remaining = Math.max(0, grandTotal - paid);

  useEffect(() => {
    Promise.all([
      api("/api/warehouses"),
      api("/api/customers", { query: { type: "CUSTOMER", status: "ACTIVE", limit: 100 } }).catch(
        () => ({ data: { customers: [] } }),
      ),
      api("/api/payment-methods", { query: { status: "ACTIVE" } }).catch(
        () => ({ data: { paymentMethods: [] } }),
      ),
      api("/api/inventory/by-item", { query: { limit: 500 } }),
    ])
      .then(([w, c, m, inv]) => {
        const warehouseRows = w.data.warehouses || [];
        const items = (inv.data.items || []).filter(
          (row) => Number(row.quantity) > 0 && row.product,
        );
        setWarehouses(warehouseRows);
        setCustomers(c.data.customers);
        setMethods(m.data.paymentMethods || []);
        setInventory(items);
        setForm((prev) => ({
          ...prev,
          warehouseId: prev.warehouseId || warehouseWithStock(warehouseRows, items),
          customerId: editId ? prev.customerId : "",
          paymentMethod: prev.paymentMethod || m.data.paymentMethods?.[0]?.name || "CASH",
        }));
      })
      .catch((err) => setError(err.message))
      .finally(() => {
        if (!editId) setReady(true);
      });
  }, [editId]);

  useEffect(() => {
    if (!editId) return undefined;
    let cancelled = false;
    api(`/api/sales/${editId}`)
      .then((res) => {
        if (cancelled) return;
        const sale = res.data.sale;
        const walkin = !sale.customerId;
        setParty(walkin ? "walkin" : "registered");
        setPayFrom(String(sale.paymentMethod || "").toUpperCase() === "WALLET" ? "wallet" : "direct");
        setPaidAmount(String(sale.paidAmount ?? sale.totalAmount ?? ""));
        setForm({
          warehouseId: sale.warehouseId || "",
          customerId: sale.customerId || "",
          walkInName: walkin ? sale.customerName || "" : "",
          paymentMethod: sale.paymentMethod || "CASH",
          items: (sale.items || []).map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
        });
        const nextCosting = {};
        (sale.items || []).forEach((item) => {
          const allocs = item.costAllocations || [];
          const manual = allocs.some((row) => row.costingMethod === "MANUAL");
          nextCosting[item.productId] = {
            method: manual ? "MANUAL" : "SIMPLE",
            picks: Object.fromEntries(
              allocs
                .filter((row) => row.stockBatchId)
                .map((row) => [row.stockBatchId, row.quantity]),
            ),
          };
        });
        setCosting(nextCosting);
      })
      .catch((err) => setError(err.message))
      .finally(() => setReady(true));
    return () => {
      cancelled = true;
    };
  }, [editId]);

  const validateStock = () => {
    for (const line of filledItems) {
      const available = stockByProduct[line.productId];
      const product = products.find((p) => p.id === line.productId);
      const name = product?.name || "Item";
      if (available == null || Number(available) <= 0) {
        throw new Error(`${name} is not in this store`);
      }
      if (Number(line.quantity) > Number(available)) {
        throw new Error(
          `${name} only has ${qty(available)} ${product?.unit || "unit"} in this store`,
        );
      }
    }
  };

  const validateLots = () => {
    for (const line of filledItems) {
      const row = costing[line.productId] || { method: "SIMPLE", picks: {} };
      if (row.method !== "MANUAL") continue;
      const selected = Object.values(row.picks || {}).reduce(
        (sum, value) => sum + Number(value || 0),
        0,
      );
      if (Number(selected.toFixed(3)) !== Number(Number(line.quantity).toFixed(3))) {
        const product = products.find((p) => p.id === line.productId);
        throw new Error(
          `${product?.name || "Item"}: selected purchases must equal ${line.quantity}`,
        );
      }
    }
  };

  const choosePay = (value) => {
    if (value === "wallet" && party !== "registered") return;
    setPayFrom(value);
  };

  const goReview = (event) => {
    event.preventDefault();
    setError("");
    try {
      if (!filledItems.length) throw new Error("Add at least one item");
      validateStock();
      validateLots();
      if (payFrom === "wallet") {
        if (party !== "registered" || !form.customerId) {
          throw new Error("Choose a registered customer to deduct from wallet");
        }
        if (walletBalance <= 0) {
          throw new Error("This customer has no wallet balance. Recharge the wallet first.");
        }
        setPaidAmount(String(Math.min(walletBalance, grandTotal).toFixed(2)));
      } else {
        setPaidAmount(String(grandTotal.toFixed(2)));
      }
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
      if (payFrom === "wallet" && paid > walletBalance) {
        throw new Error(`Wallet only has ${money(walletBalance)} ETB`);
      }
      validateStock();
      validateLots();
      const saleBody = {
        warehouseId: form.warehouseId,
        customerId: party === "registered" ? form.customerId || null : null,
        customerName: party === "walkin" ? form.walkInName : undefined,
        paymentMethod: payFrom === "wallet" ? "WALLET" : form.paymentMethod,
        paidAmount: paid,
        payFrom: payFrom === "wallet" ? "WALLET" : "DIRECT",
        costingMethod: "SIMPLE",
        items: filledItems.map((item) => {
          const row = costing[item.productId] || { method: "SIMPLE", picks: {} };
          const line = {
            productId: item.productId,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
            costingMethod: row.method === "MANUAL" ? "MANUAL" : "FIFO",
          };
          if (line.costingMethod === "MANUAL") {
            line.allocations = Object.entries(row.picks || {})
              .filter(([, value]) => Number(value) > 0)
              .map(([stockBatchId, value]) => ({
                stockBatchId,
                quantity: Number(value),
              }));
          }
          return line;
        }),
      };
      let saved;
      if (editing) {
        saved = await api(`/api/sales/${editId}/revise`, {
          method: "POST",
          body: saleBody,
        });
      } else {
        const created = await api("/api/sales", {
          method: "POST",
          body: {
            warehouseId: saleBody.warehouseId,
            customerId: saleBody.customerId,
            customerName: saleBody.customerName,
            paymentMethod: saleBody.paymentMethod,
            items: saleBody.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
            })),
          },
        });
        saved = await api(`/api/sales/${created.data.sale.id}/complete`, {
          method: "POST",
          body: {
            paidAmount: paid,
            payFrom: saleBody.payFrom,
            costingMethod: "SIMPLE",
            items: saleBody.items.map((item) => ({
              productId: item.productId,
              costingMethod: item.costingMethod,
              allocations: item.allocations,
            })),
          },
        });
      }
      navigate(`/sell/${saved.data.sale.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (!ready) return <InventoryLoading message="Loading inventory..." />;

  const payChecks = (
    <div className="field">
      <span>How to pay</span>
      <div className="pay-checks">
        <label className="check-option">
          <input
            type="checkbox"
            checked={payFrom === "direct"}
            onChange={() => choosePay("direct")}
          />
          Direct payment
        </label>
        <label className={`check-option${party !== "registered" ? " is-disabled" : ""}`}>
          <input
            type="checkbox"
            checked={payFrom === "wallet"}
            disabled={party !== "registered"}
            onChange={() => choosePay("wallet")}
          />
          From wallet
        </label>
      </div>
      {payFrom === "wallet" ? (
        <small className="muted">
          Wallet {money(walletBalance)} ETB
          {walletBalance <= 0 ? " — recharge this customer before selling on wallet." : ""}
        </small>
      ) : null}
    </div>
  );

  if (step === "review") {
    return (
      <form className="card" onSubmit={submit}>
        <h1>{editing ? "Review edited sale" : "Review sale"}</h1>
        <SaleSteps current="review" />
        <p className="muted">Check items, payment, and purchase lots, then save.</p>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Amount</th>
                <th>VAT {VAT_RATE}%</th>
                <th>Total</th>
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
                    <td>{money(vatOf(lineAmount(line)))} ETB</td>
                    <td>{money(withVat(lineAmount(line)))} ETB</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="totals-box" style={{ marginTop: 16 }}>
          <p>Subtotal: <strong>{money(subtotal)} ETB</strong></p>
          <p>VAT {VAT_RATE}%: <strong>{money(vatAmount)} ETB</strong></p>
          <p>Grand total: <strong>{money(grandTotal)} ETB</strong></p>
          <p className="muted" style={{ marginBottom: 0 }}>
            Payment: {payFrom === "wallet" ? "Wallet" : form.paymentMethod}
            {party === "registered"
              ? ` · ${selectedCustomer?.name || ""}`
              : ` · ${form.walkInName}`}
            {payFrom === "wallet"
              ? ` · wallet left after this sale ${money(Math.max(0, walletBalance - paid))} ETB`
              : ""}
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
            {busy ? "Saving sale…" : editing ? "Save changes" : "Save sale"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form className="card" onSubmit={goReview}>
      <h1>{editing ? "Edit sale" : "Add new sale"}</h1>
      <SaleSteps current="form" />
      <p className="muted">
        Only items that currently have quantity in the selected store can be sold.
      </p>

      <div className="seg">
        <button type="button" className={`btn ${party === "registered" ? "" : "secondary"}`} onClick={() => setParty("registered")}>
          Customer from list
        </button>
        <button
          type="button"
          className={`btn ${party === "walkin" ? "" : "secondary"}`}
          onClick={() => {
            setParty("walkin");
            setPayFrom("direct");
          }}
        >
          Walk-in customer
        </button>
      </div>

      <div className="grid split" style={{ marginTop: 14 }}>
        <label className="field">
          <span>Store / warehouse (stock comes from here)</span>
          <select
            value={form.warehouseId}
            onChange={(e) => {
              const warehouseId = e.target.value;
              setForm((prev) => ({
                ...prev,
                warehouseId,
                items: warehouseId === prev.warehouseId ? prev.items : [emptyLine()],
              }));
              setCosting({});
            }}
          >
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
          {products.length === 0 && storesWithStock.length > 0 ? (
            <small className="muted">
              This store has no items. Live stock is in{" "}
              {storesWithStock
                .filter((row) => row.id !== form.warehouseId)
                .map((row) => row.name)
                .join(", ") || storesWithStock.map((row) => row.name).join(", ")}
              . Choose that store to sell.
            </small>
          ) : products.length === 0 && inventory.length === 0 ? (
            <small className="muted">
              No delivered stock to sell. If Live stock is showing Undelivered purchases, deliver them to a store first.
            </small>
          ) : null}
        </label>
        {party === "registered" ? (
          <label className="field">
            <span>Customer from list</span>
            <select value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })} required>
              <option value="">Select customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.phone ? `· ${c.phone}` : ""} · wallet {money(c.walletBalance)}
                </option>
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
        {payChecks}
        {payFrom === "direct" ? (
          <label className="field">
            <span>Payment method</span>
            <select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>
              {methods.map((m) => (
                <option key={m.id} value={m.name}>{m.name}</option>
              ))}
            </select>
          </label>
        ) : (
          <label className="field">
            <span>Payment method</span>
            <input value="Wallet" readOnly />
          </label>
        )}
      </div>

      <h3>Items sold</h3>
      <LineEditor
        products={products}
        stockByProduct={stockByProduct}
        inStockOnly
        emptyText="No items with quantity in this store."
        lines={form.items}
        onChange={(items) => setForm({ ...form, items })}
        priceKey="sellingPrice"
        lockPrice
        afterLine={(line) => {
          if (!line.productId) return null;
          const product = products.find((p) => p.id === line.productId);
          const row = costing[line.productId] || { method: "SIMPLE", picks: {} };
          return (
            <SaleLotChoice
              warehouseId={form.warehouseId}
              productId={line.productId}
              productName={product?.name}
              quantity={line.quantity}
              unit={product?.unit}
              fifo={row.method !== "MANUAL"}
              picks={row.picks || {}}
              onFifoChange={(fifo) =>
                setCosting((prev) => ({
                  ...prev,
                  [line.productId]: {
                    method: fifo ? "SIMPLE" : "MANUAL",
                    picks: fifo ? {} : prev[line.productId]?.picks || {},
                  },
                }))
              }
              onPicksChange={(picks) =>
                setCosting((prev) => ({
                  ...prev,
                  [line.productId]: { method: "MANUAL", picks },
                }))
              }
            />
          );
        }}
      />

      <VatSummary lines={filledItems} products={products} />

      {error ? <p className="error">{error}</p> : null}
      <div className="row-actions" style={{ marginTop: 16 }}>
        <button type="button" className="btn secondary" onClick={() => navigate("/sell")}>
          Cancel
        </button>
        <button className="btn saffron">
          Review sale
        </button>
      </div>
    </form>
  );
}
