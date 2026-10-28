import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, money, qty, withVat } from "../../api/client";
import LineEditor, { emptyLine, lineAmount, VatSummary } from "../../components/LineEditor";
import SaleLotChoice from "../../components/SaleLotChoice";
import InventoryLoading from "../../components/InventoryLoading";
import { useAuth } from "../../auth/AuthContext";
import { can, isSalesman } from "../../auth/access";
import PartySelectField from "../../components/PartySelectField";
import {
  isKachaBridgeAvailable,
  isKachaPaymentMethod,
  isKachaWebView,
  kachaStatusMessage,
  pollKachaPayment,
  requestKachaBridgePayment,
} from "../../lib/kacha";

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
  if (warehouses?.length === 1) return warehouses[0].id || "";
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
      const id = String(store.warehouseId);
      // Prefer stock only among the warehouses the user can use
      if (warehouses?.length && !warehouses.some((w) => String(w.id) === id)) {
        continue;
      }
      qtyByStore.set(id, (qtyByStore.get(id) || 0) + onHand);
    }
  }
  let best = null;
  for (const [id, total] of qtyByStore) {
    if (!best || total > best.total) best = { id, total };
  }
  if (best?.id) return best.id;
  return warehouses?.[0]?.id || "";
};

export default function SaleFormPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { id: editId } = useParams();
  const editing = Boolean(editId);
  const [warehouses, setWarehouses] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [party, setParty] = useState("registered");
  const [paidAmount, setPaidAmount] = useState("");
  const [payStatus, setPayStatus] = useState("");
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

  const canAddProduct = can(user, "catalog", "CREATE") || can(user, "catalog", "READ");
  const canBuyStock = can(user, "purchasing", "CREATE") || can(user, "purchasing", "READ");
  const canViewStock = can(user, "inventory", "READ");

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
  const grandTotal = withVat(subtotal);
  const selectedCustomer = customers.find((row) => row.id === form.customerId);
  const walletBalance = Number(selectedCustomer?.walletBalance || 0);
  const paid = Number(paidAmount === "" ? grandTotal : paidAmount);
  const remaining = Math.max(0, grandTotal - paid);
  const selectedWarehouse = warehouses.find(
    (row) => String(row.id) === String(form.warehouseId),
  );
  const noItemsInStore = Boolean(form.warehouseId) && products.length === 0;

  useEffect(() => {
    const sessionStores = (user?.warehouses || []).map((store) => ({
      id: store.id,
      name: store.name,
      code: store.code,
    }));

    Promise.all([
      api("/api/warehouses").catch(() => ({ data: { warehouses: [] } })),
      api("/api/customers", { query: { type: "CUSTOMER", status: "ACTIVE", limit: 100 } }).catch(
        () => ({ data: { customers: [] } }),
      ),
      api("/api/payment-methods", { query: { status: "ACTIVE" } }).catch(
        () => ({ data: { paymentMethods: [] } }),
      ),
      api("/api/inventory/by-item", { query: { limit: 500 } }).catch(
        () => ({ data: { items: [] } }),
      ),
    ])
      .then(([w, c, m, inv]) => {
        let warehouseRows = w.data.warehouses || [];
        // Salesmen: always prefer assigned stores from session if API list is empty
        if (!warehouseRows.length && sessionStores.length) {
          warehouseRows = sessionStores;
        }
        if (
          isSalesman(user) &&
          !user?.allWarehouses &&
          sessionStores.length &&
          warehouseRows.length
        ) {
          const allowed = new Set(sessionStores.map((store) => String(store.id)));
          const filtered = warehouseRows.filter((store) => allowed.has(String(store.id)));
          if (filtered.length) warehouseRows = filtered;
        }

        const items = (inv.data.items || []).filter(
          (row) => Number(row.quantity) > 0 && row.product,
        );
        setWarehouses(warehouseRows);
        setCustomers(c.data.customers || []);
        setMethods(m.data.paymentMethods || []);
        setInventory(items);

        const customerRows = c.data.customers || [];
        if (!customerRows.length) {
          setParty("walkin");
        }

        const autoWarehouseId =
          warehouseRows.length === 1
            ? warehouseRows[0].id
            : warehouseWithStock(warehouseRows, items);

        setForm((prev) => ({
          ...prev,
          warehouseId: prev.warehouseId || autoWarehouseId || "",
          customerId: editId ? prev.customerId : "",
          paymentMethod: prev.paymentMethod || m.data.paymentMethods?.[0]?.name || "CASH",
        }));

        if (!warehouseRows.length && isSalesman(user)) {
          setError(
            "No store is assigned to your account. Ask the company owner to assign a store in Team.",
          );
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => {
        if (!editId) setReady(true);
      });
  }, [editId, user?.id, user?.allWarehouses, user?.warehouses]);

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

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setPayStatus("");
    try {
      if (!filledItems.length) throw new Error("Add at least one item");
      validateStock();
      validateLots();

      const useKacha =
        payFrom === "direct" && isKachaPaymentMethod(form.paymentMethod);

      if (useKacha && editing) {
        throw new Error("Use Record payment on the sales list to collect a Kacha balance.");
      }

      if (useKacha) {
        if (!isKachaWebView() || !isKachaBridgeAvailable()) {
          throw new Error(
            "Kacha payment requires opening this app inside the Kacha superapp. Use Cash or another method in a regular browser.",
          );
        }
      }

      let amountPaid = paidAmount;
      if (payFrom === "wallet") {
        if (party !== "registered" || !form.customerId) {
          throw new Error("Choose a registered customer to deduct from wallet");
        }
        if (walletBalance <= 0) {
          throw new Error("This customer has no wallet balance. Recharge the wallet first.");
        }
        if (amountPaid === "") {
          amountPaid = String(Math.min(walletBalance, grandTotal).toFixed(2));
          setPaidAmount(amountPaid);
        }
      } else if (useKacha) {
        amountPaid = String(grandTotal.toFixed(2));
        setPaidAmount(amountPaid);
      } else if (amountPaid === "") {
        amountPaid = String(grandTotal.toFixed(2));
        setPaidAmount(amountPaid);
      }

      const paidNow = Number(amountPaid);
      if (Number.isNaN(paidNow) || paidNow < 0) throw new Error("Enter a valid amount paid");
      if (paidNow > grandTotal) throw new Error("Amount paid cannot be more than the grand total");
      if (payFrom === "wallet" && paidNow > walletBalance) {
        throw new Error(`Wallet only has ${money(walletBalance)} ETB`);
      }

      const saleBody = {
        warehouseId: form.warehouseId,
        customerId: party === "registered" ? form.customerId || null : null,
        customerName: party === "walkin" ? form.walkInName : undefined,
        paymentMethod: payFrom === "wallet" ? "WALLET" : form.paymentMethod,
        paidAmount: paidNow,
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
      } else if (useKacha) {
        // Keep sale DRAFT until Kacha callback confirms payment (stock posts then).
        const created = await api("/api/sales", {
          method: "POST",
          body: {
            warehouseId: saleBody.warehouseId,
            customerId: saleBody.customerId,
            customerName: saleBody.customerName,
            paymentMethod: "Kacha",
            items: saleBody.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
            })),
          },
        });
        const saleId = created.data.sale.id;
        setPayStatus("Creating Kacha payment request…");
        const payRes = await api(`/api/sales/${saleId}/kacha/payments`, {
          method: "POST",
          body: {},
        });
        const reference = payRes.data?.bridge?.reference;
        const paymentId = payRes.data?.payment?.id;
        if (!reference || !paymentId) {
          throw new Error("Kacha did not return a payment reference");
        }
        setPayStatus("Open the Kacha payment dialog…");
        await requestKachaBridgePayment(reference);
        setPayStatus("Waiting for payment confirmation…");
        const payment = await pollKachaPayment({ api, saleId, paymentId });
        if (String(payment.status).toUpperCase() !== "PROCESSED") {
          throw new Error(kachaStatusMessage(payment.status));
        }
        setPayStatus(kachaStatusMessage("PROCESSED"));
        saved = await api(`/api/sales/${saleId}`);
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
            paidAmount: paidNow,
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
      setPayStatus("");
    } finally {
      setBusy(false);
    }
  };

  const kachaSelected =
    payFrom === "direct" && isKachaPaymentMethod(form.paymentMethod);

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

  return (
    <form className="card" onSubmit={submit}>
      <h1>{editing ? "Edit sale" : "Add new sale"}</h1>
      <p className="muted">
        Only items that currently have quantity in the selected store can be sold.
      </p>

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
            required
            disabled={warehouses.length === 1}
          >
            {warehouses.length === 0 ? (
              <option value="">No store assigned</option>
            ) : null}
            {warehouses.length > 1 ? (
              <option value="">Select store</option>
            ) : null}
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
          {warehouses.length === 1 ? (
            <small className="muted">
              Your assigned store is selected automatically
              {selectedWarehouse?.name ? `: ${selectedWarehouse.name}` : ""}.
            </small>
          ) : null}
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
              No delivered stock to sell. Add a product first, then buy or deliver stock into this store.
            </small>
          ) : null}
        </label>
        <PartySelectField
          options={customers.map((c) => ({
            id: c.id,
            name: `${c.name}${c.phone ? ` · ${c.phone}` : ""} · wallet ${money(c.walletBalance)}`,
          }))}
          party={party}
          onPartyChange={(next) => {
            setParty(next);
            if (next === "walkin") setPayFrom("direct");
            if (next === "registered") {
              setForm((prev) => ({ ...prev, walkInName: "" }));
            } else {
              setForm((prev) => ({ ...prev, customerId: "" }));
            }
          }}
          valueId={form.customerId}
          onValueIdChange={(customerId) => setForm((prev) => ({ ...prev, customerId }))}
          walkInName={form.walkInName}
          onWalkInNameChange={(walkInName) => setForm((prev) => ({ ...prev, walkInName }))}
          selectLabel="Customer"
          walkInLabel="Walk-in customer (not in list)"
          walkInNameLabel="Walk-in customer name"
          walkInPlaceholder="Customer name"
          emptySelectText="No customers yet"
          registerTo="/customers?type=CUSTOMER"
          registerLabel="Register customer"
        />
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
        {kachaSelected ? (
          <p className="muted" style={{ marginTop: 0 }}>
            {isKachaWebView() && isKachaBridgeAvailable()
              ? "Kacha will charge the signed-in superapp wallet. Stock updates only after payment is confirmed."
              : "Kacha payment works only inside the Kacha superapp. In a regular browser, choose another payment method."}
          </p>
        ) : null}
      </div>

      <h3>Items sold</h3>
      {noItemsInStore ? (
        <div className="card" style={{ marginBottom: 14, background: "var(--surface-2, #f8fafc)" }}>
          <p style={{ margin: 0 }}>
            <strong>No items in this store to sell.</strong>
          </p>
          <p className="muted" style={{ marginTop: 6 }}>
            Add a product first, then purchase / deliver stock into{" "}
            {selectedWarehouse?.name || "this store"} before creating a sale.
          </p>
          <div className="row-actions" style={{ marginTop: 12 }}>
            {canAddProduct ? (
              <Link className="btn secondary add-item-btn-sm" to="/catalog">
                Add new item
              </Link>
            ) : null}
            {canBuyStock ? (
              <Link className="btn secondary" to="/buy">
                Buy stock
              </Link>
            ) : null}
            {canViewStock ? (
              <Link className="btn secondary" to="/stock">
                Open live stock
              </Link>
            ) : null}
            {!canAddProduct && !canBuyStock && !canViewStock ? (
              <p className="muted" style={{ margin: 0 }}>
                Ask the company owner to add products and stock for your store.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
      <LineEditor
        products={products}
        stockByProduct={stockByProduct}
        inStockOnly
        emptyText="No items with quantity in this store. Add a new item first."
        lines={form.items}
        onChange={(items) => setForm({ ...form, items })}
        priceKey="sellingPrice"
        lockPrice
        addLabel="Add item"
        addClassName="btn secondary add-item-btn-sm"
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

      {!kachaSelected ? (
        <label className="field" style={{ marginTop: 16 }}>
          <span>Amount paid (ETB)</span>
          <input
            type="number"
            min="0"
            step="0.01"
            max={grandTotal || undefined}
            value={paidAmount}
            onChange={(e) => setPaidAmount(e.target.value)}
            placeholder={money(grandTotal)}
          />
        </label>
      ) : (
        <p className="muted" style={{ marginTop: 16 }}>
          Amount charged via Kacha: <strong>{money(grandTotal)} ETB</strong>
        </p>
      )}
      {!kachaSelected ? (
        <p className={remaining > 0 ? "error" : "muted"}>
          Remaining to pay: <strong>{money(remaining)} ETB</strong>
          {remaining > 0 && party === "registered"
            ? " — this customer will be recorded as partially paid."
            : remaining > 0
              ? " — remaining balance is kept on this invoice."
              : filledItems.length
                ? " — fully paid."
                : ""}
        </p>
      ) : null}

      {payStatus ? <p className="muted">{payStatus}</p> : null}
      {error ? <p className="error">{error}</p> : null}
      <div className="row-actions sale-form-actions" style={{ marginTop: 16 }}>
        <button type="button" className="btn secondary" onClick={() => navigate("/sell")} disabled={busy}>
          Cancel
        </button>
        <button className="btn saffron" disabled={busy || !filledItems.length}>
          {busy
            ? kachaSelected
              ? "Waiting for Kacha…"
              : "Saving sale…"
            : editing
              ? "Save changes"
              : kachaSelected
                ? "Pay with Kacha"
                : "Save sale"}
        </button>
      </div>
    </form>
  );
}
