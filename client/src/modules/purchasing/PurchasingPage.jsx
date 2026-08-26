import { useEffect, useState } from "react";
import { api, money, qty } from "../../api/client";
import LineEditor, { emptyLine, lineAmount } from "../../components/LineEditor";
import { isOwner } from "../../auth/access";
import { useAuth } from "../../auth/AuthContext";

const STATUS_LABEL = {
  NOT_DELIVERED: "Not delivered",
  ON_LOADING: "On loading",
  DELIVERED: "Delivered to store",
};

function itemChips(items = []) {
  const shown = items.slice(0, 6);
  const extra = items.length - shown.length;
  return (
    <div className="stat-items">
      {shown.map((item) => (
        <span key={item.productId}>
          {item.name} · {qty(item.quantity)} {item.unit}
        </span>
      ))}
      {extra > 0 ? <span>+{extra} more</span> : null}
      {items.length === 0 ? <span>None</span> : null}
    </div>
  );
}

function PayModal({ row, methods, busy, error, onClose, onSave }) {
  const remaining = Number(row.remainingBalance || 0);
  const [amount, setAmount] = useState(remaining ? remaining.toFixed(2) : "");
  const [paymentMethod, setPaymentMethod] = useState(row.paymentMethod || methods[0]?.name || "");

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  const submit = (event) => {
    event.preventDefault();
    onSave(row.purchaseOrderId, {
      amount: Number(amount),
      paymentMethod,
    });
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <h2>Complete payment</h2>
        <p className="muted">
          {row.document} · remaining {money(remaining)} ETB
        </p>
        <form onSubmit={submit}>
          <label className="field">
            <span>Amount paid now</span>
            <input
              type="number"
              min="0.01"
              step="0.01"
              max={remaining}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={busy}
              required
            />
          </label>
          <label className="field">
            <span>Payment method / account</span>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              disabled={busy}
              required
            >
              {methods.map((m) => (
                <option key={m.id} value={m.name}>{m.name}</option>
              ))}
            </select>
          </label>
          {error ? <p className="error">{error}</p> : null}
          <div className="modal-actions">
            <button type="button" className="btn secondary" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="btn saffron" disabled={busy}>
              {busy ? "Saving…" : "Record payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeliveryModal({ row, warehouses, busy, error, onClose, onSave }) {
  const [status, setStatus] = useState(row.deliveryStatus || "NOT_DELIVERED");
  const [warehouseId, setWarehouseId] = useState(row.warehouseId || warehouses[0]?.id || "");
  const [quantity, setQuantity] = useState(row.quantity);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  const submit = (event) => {
    event.preventDefault();
    onSave(row.id, {
      deliveryStatus: status,
      warehouseId: warehouseId || null,
      quantity: Number(quantity),
    });
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delivery-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="delivery-modal-title">Update delivery</h2>
        <p className="muted">
          {row.productName} · {row.document}
        </p>
        <form onSubmit={submit}>
          <label className="field">
            <span>Status</span>
            <select value={status} onChange={(e) => setStatus(e.target.value)} disabled={busy}>
              {Object.entries(STATUS_LABEL).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Store / warehouse</span>
            <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} disabled={busy}>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Amount {row.unit ? `(${row.unit})` : ""}</span>
            <input
              type="number"
              min="0.001"
              step="0.001"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              disabled={busy}
              required
            />
          </label>
          {error ? <p className="error">{error}</p> : null}
          <div className="modal-actions">
            <button type="button" className="btn secondary" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="btn saffron" disabled={busy}>
              {busy ? "Saving…" : "Save update"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PurchasingPage() {
  const { user } = useAuth();
  const owner = isOwner(user);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [methods, setMethods] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [party, setParty] = useState("registered");
  const [supplierId, setSupplierId] = useState("");
  const [walkInName, setWalkInName] = useState("");
  const [deliverWarehouseId, setDeliverWarehouseId] = useState("");
  const [lines, setLines] = useState([emptyLine()]);
  const [filters, setFilters] = useState({ from: "", to: "", productId: "", paymentMethod: "", createdBy: "" });
  const [salesmen, setSalesmen] = useState([]);
  const [report, setReport] = useState(null);
  const [summary, setSummary] = useState({
    notDelivered: { count: 0, items: [] },
    onLoading: { count: 0, items: [] },
    delivered: { count: 0, items: [] },
    undeliveredCount: 0,
  });
  const [error, setError] = useState("");
  const [modalError, setModalError] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(null);
  const [paying, setPaying] = useState(null);

  const grandTotal = lines.reduce((sum, line) => sum + lineAmount(line), 0);

  useEffect(() => {
    setPaidAmount(grandTotal ? grandTotal.toFixed(2) : "");
  }, [grandTotal]);

  const loadLookups = async () => {
    const [s, p, w, m, team] = await Promise.all([
      api("/api/suppliers", { query: { status: "ACTIVE" } }),
      api("/api/products", { query: { limit: 100, status: "ACTIVE" } }),
      api("/api/warehouses"),
      api("/api/payment-methods", { query: { status: "ACTIVE" } }),
      owner ? api("/api/team") : Promise.resolve({ data: { salesmen: [] } }),
    ]);
    const supplierRows = (s.data.suppliers || []).filter((row) => row.name !== "Walk-in");
    const methodRows = m.data.paymentMethods || [];
    setSuppliers(supplierRows);
    setProducts(p.data.products || []);
    setWarehouses(w.data.warehouses || []);
    setMethods(methodRows);
    setSalesmen(team.data.salesmen || []);
    setSupplierId((prev) => prev || supplierRows[0]?.id || "");
    setDeliverWarehouseId((prev) => prev || w.data.warehouses[0]?.id || "");
    setPaymentMethod((prev) => prev || methodRows[0]?.name || "");
  };

  const loadRecords = async () => {
    const query = { limit: 100 };
    if (filters.from) query.from = filters.from;
    if (filters.to) query.to = filters.to;
    if (filters.productId) query.productId = filters.productId;
    if (filters.paymentMethod) query.paymentMethod = filters.paymentMethod;
    if (filters.createdBy) query.createdBy = filters.createdBy;
    const [r, summary] = await Promise.all([
      api("/api/insights/purchases-report", { query }),
      api("/api/purchase-orders/undelivered-summary"),
    ]);
    setReport(r.data.report);
    setSummary({
      notDelivered: summary.data.notDelivered || { count: 0, items: [] },
      onLoading: summary.data.onLoading || { count: 0, items: [] },
      delivered: summary.data.delivered || { count: 0, items: [] },
      undeliveredCount: summary.data.undeliveredCount || 0,
    });
  };

  useEffect(() => {
    loadLookups().catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    loadRecords().catch((err) => setError(err.message));
  }, [filters.from, filters.to, filters.productId, filters.paymentMethod, filters.createdBy]);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const items = lines.map((line) => ({
        productId: line.productId,
        quantity: Number(line.quantity),
        unitPrice: Number(line.unitPrice),
      }));
      await api("/api/purchase-orders", {
        method: "POST",
        body: {
          ...(party === "registered" ? { supplierId } : { walkInName }),
          paymentMethod,
          paidAmount: Number(paidAmount || 0),
          items,
        },
      });
      setLines([emptyLine()]);
      setWalkInName("");
      await Promise.all([loadLookups(), loadRecords()]);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const savePayment = async (purchaseOrderId, payload) => {
    setBusy(true);
    setModalError("");
    try {
      await api(`/api/purchase-orders/${purchaseOrderId}/payments`, {
        method: "POST",
        body: payload,
      });
      setPaying(null);
      await loadRecords();
    } catch (err) {
      setModalError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const saveItem = async (itemId, payload) => {
    setBusy(true);
    setModalError("");
    try {
      await api(`/api/purchase-orders/items/${itemId}`, {
        method: "PATCH",
        body: payload,
      });
      setEditing(null);
      await loadRecords();
    } catch (err) {
      setModalError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const deliverAll = async () => {
    setBusy(true);
    setError("");
    try {
      await api("/api/purchase-orders/deliver-all", {
        method: "POST",
        body: { warehouseId: deliverWarehouseId },
      });
      await loadRecords();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="topbar">
        <div>
          <h1 style={{ margin: 0 }}>Record a purchase</h1>
          <p className="muted">
            Buying records the purchase only. Stock is added to a warehouse after the store keeper (or admin) marks the item delivered.
          </p>
        </div>
      </div>

      <section className="grid stats three" style={{ marginBottom: 16 }}>
        <article className="card stat-card">
          <span className="muted">Not delivered</span>
          <b>{summary.notDelivered.count}</b>
          <small>Waiting for the store</small>
          {itemChips(summary.notDelivered.items)}
        </article>
        <article className="card stat-card">
          <span className="muted">On loading</span>
          <b>{summary.onLoading.count}</b>
          <small>In progress</small>
          {itemChips(summary.onLoading.items)}
        </article>
        <article className="card stat-card">
          <span className="muted">Delivered to store</span>
          <b>{summary.delivered.count}</b>
          <small>Already in warehouse</small>
          {itemChips(summary.delivered.items)}
        </article>
      </section>

      <div className="card" style={{ marginBottom: 18 }}>
        {owner ? (
          <div className="toolbar" style={{ marginTop: 0 }}>
            <label className="field">
              <span>Deliver all into this warehouse</span>
              <select
                value={deliverWarehouseId}
                onChange={(e) => setDeliverWarehouseId(e.target.value)}
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="btn saffron"
              disabled={busy || !deliverWarehouseId || summary.undeliveredCount === 0}
              onClick={deliverAll}
            >
              {busy ? "Updating…" : "Mark all as delivered to store"}
            </button>
          </div>
        ) : (
          <p className="muted" style={{ margin: 0 }}>
            New purchases are saved as not delivered. An admin can change status and warehouse.
          </p>
        )}
      </div>

      <form className="card" onSubmit={submit}>
        <div className="seg">
          <button type="button" className={`btn ${party === "registered" ? "" : "secondary"}`} onClick={() => setParty("registered")}>
            Registered supplier
          </button>
          <button type="button" className={`btn ${party === "walkin" ? "" : "secondary"}`} onClick={() => setParty("walkin")}>
            Walk-in seller
          </button>
        </div>

        <div className="grid split" style={{ marginTop: 14 }}>
          {party === "registered" ? (
            <label className="field">
              <span>Supplier from list</span>
              <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} required>
                <option value="">Select supplier</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </label>
          ) : (
            <label className="field">
              <span>Walk-in seller name</span>
              <input value={walkInName} onChange={(e) => setWalkInName(e.target.value)} placeholder="Name of the person you bought from" required />
            </label>
          )}
          <label className="field">
            <span>Payment method / account</span>
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} required>
              <option value="">Select method</option>
              {methods.map((m) => (
                <option key={m.id} value={m.name}>{m.name}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Amount paid (ETB)</span>
            <input
              type="number"
              min="0"
              step="0.01"
              max={grandTotal || undefined}
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value)}
              required
            />
          </label>
        </div>

        <h3>Items bought</h3>
        <LineEditor products={products} showStock={false} lines={lines} onChange={setLines} priceKey="purchasePrice" />

        <div className="totals-box" style={{ marginTop: 16 }}>
          {lines.filter((l) => l.productId).map((line) => {
            const product = products.find((p) => p.id === line.productId);
            return (
              <div key={line.productId}>
                {product?.name} total: <strong>{money(lineAmount(line))} ETB</strong>
                <span className="muted"> ({qty(line.quantity)} {product?.unit} × {money(line.unitPrice)})</span>
              </div>
            );
          })}
          <p style={{ marginBottom: 0 }}>
            Grand total cost: <strong>{money(grandTotal)} ETB</strong>
          </p>
        </div>

        {error ? <p className="error">{error}</p> : null}
        <button className="btn saffron" style={{ marginTop: 16 }} disabled={busy}>
          {busy ? "Saving purchase…" : "Save purchase"}
        </button>
      </form>

      <div className="card" style={{ marginTop: 18 }}>
        <h3>Purchase records</h3>
        <p className="muted">Each purchased line is not delivered, on loading, or delivered to store.</p>
        <div className="toolbar">
          <label className="field">
            <span>From date</span>
            <input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
          </label>
          <label className="field">
            <span>To date</span>
            <input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
          </label>
          <label className="field">
            <span>Item</span>
            <select value={filters.productId} onChange={(e) => setFilters({ ...filters, productId: e.target.value })}>
              <option value="">All items</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Payment method</span>
            <select
              value={filters.paymentMethod}
              onChange={(e) => setFilters({ ...filters, paymentMethod: e.target.value })}
            >
              <option value="">All methods</option>
              {methods.map((m) => (
                <option key={m.id} value={m.name}>{m.name}</option>
              ))}
            </select>
          </label>
          {owner ? (
            <label className="field">
              <span>Salesman</span>
              <select
                value={filters.createdBy}
                onChange={(e) => setFilters({ ...filters, createdBy: e.target.value })}
              >
                <option value="">All staff</option>
                <option value={user.id}>{user.fullName} (you)</option>
                {salesmen.map((row) => (
                  <option key={row.id} value={row.id}>{row.fullName}</option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Purchase date</th>
                <th>Item</th>
                <th>Qty</th>
                <th>Unit price</th>
                <th>Line total</th>
                <th>Bought from</th>
                <th>Salesman</th>
                <th>Paid</th>
                <th>Method</th>
                <th>Status</th>
                <th>Warehouse</th>
                <th>Purchase #</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(report?.lines || []).map((row, index, all) => {
                const firstOfOrder = all.findIndex((line) => line.purchaseOrderId === row.purchaseOrderId) === index;
                const canPay = firstOfOrder && Number(row.remainingBalance || 0) > 0;
                return (
                <tr key={row.id}>
                  <td>{row.date}</td>
                  <td>
                    {row.productName}
                    <div className="muted">{row.unit}</div>
                  </td>
                  <td>{qty(row.quantity)} {row.unit}</td>
                  <td>{money(row.unitPrice)} ETB</td>
                  <td>{money(row.totalPrice)} ETB</td>
                  <td>{row.party}</td>
                  <td>{row.salesman || "—"}</td>
                  <td>
                    {money(row.paidAmount)} ETB
                    {Number(row.remainingBalance || 0) > 0 ? (
                      <div className="muted">left {money(row.remainingBalance)}</div>
                    ) : null}
                  </td>
                  <td>{row.paymentMethod || "—"}</td>
                  <td>{STATUS_LABEL[row.deliveryStatus] || row.deliveryStatus}</td>
                  <td>{row.warehouseName || "—"}</td>
                  <td>{row.document}</td>
                  <td>
                    <div className="row-actions">
                      {canPay ? (
                        <button
                          type="button"
                          className="btn saffron"
                          onClick={() => {
                            setModalError("");
                            setPaying(row);
                          }}
                        >
                          Complete payment
                        </button>
                      ) : null}
                      {owner ? (
                        <button
                          type="button"
                          className="btn secondary"
                          onClick={() => {
                            setModalError("");
                            setEditing(row);
                          }}
                        >
                          Update
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
          {(report?.lines || []).length === 0 ? <p className="empty muted">No purchases for this filter.</p> : null}
        </div>
        {report?.totals ? (
          <p className="totals-box" style={{ marginTop: 12 }}>
            Filtered total: <strong>{money(report.totals.amount)} ETB</strong>
            {" · "}
            Quantity: <strong>{qty(report.totals.quantity)}</strong>
            {" · "}
            Not delivered in this list: <strong>{report.undeliveredCount || 0}</strong>
          </p>
        ) : null}
      </div>

      {editing ? (
        <DeliveryModal
          row={editing}
          warehouses={warehouses}
          busy={busy}
          error={modalError}
          onClose={() => {
            if (!busy) {
              setEditing(null);
              setModalError("");
            }
          }}
          onSave={saveItem}
        />
      ) : null}
      {paying ? (
        <PayModal
          row={paying}
          methods={methods}
          busy={busy}
          error={modalError}
          onClose={() => {
            if (!busy) {
              setPaying(null);
              setModalError("");
            }
          }}
          onSave={savePayment}
        />
      ) : null}
    </>
  );
}
