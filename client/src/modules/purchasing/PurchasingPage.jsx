import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, money, qty, withVat } from "../../api/client";
import LineEditor, { emptyLine, lineAmount, VatSummary } from "../../components/LineEditor";
import { can, isOwner } from "../../auth/access";
import { useAuth } from "../../auth/AuthContext";
import InventoryLoading from "../../components/InventoryLoading";
import PartySelectField from "../../components/PartySelectField";

const STATUS_LABEL = {
  NOT_DELIVERED: "Not delivered",
  ON_LOADING: "On loading",
  DELIVERED: "Delivered to store",
};

function itemChips(items = []) {
  const shown = items.slice(0, 4);
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

function unpaidFromLines(lines = []) {
  const seen = new Set();
  let unpaid = 0;
  for (const row of lines) {
    if (seen.has(row.purchaseOrderId)) continue;
    seen.add(row.purchaseOrderId);
    unpaid += Number(row.remainingBalance || 0);
  }
  return unpaid;
}

function UpdateModal({ row, warehouses, methods, owner, busy, error, onClose, onSave }) {
  const remaining = Math.max(0, Number(row.remainingBalance || 0));
  const [status, setStatus] = useState(row.deliveryStatus || "NOT_DELIVERED");
  const [warehouseId, setWarehouseId] = useState(row.warehouseId || warehouses[0]?.id || "");
  const [quantity, setQuantity] = useState(row.quantity);
  const [payAmount, setPayAmount] = useState("");
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
    onSave(row, {
      deliveryStatus: status,
      warehouseId: warehouseId || null,
      quantity: Number(quantity),
      payAmount: remaining > 0 ? Number(payAmount || 0) : 0,
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
        <h2>Update purchase</h2>
        <p className="muted">
          {row.productName} · unpaid {money(remaining)} ETB
        </p>
        <form onSubmit={submit}>
          {owner ? (
            <>
              <label className="field">
                <span>Status</span>
                <select value={status} onChange={(e) => setStatus(e.target.value)} disabled={busy}>
                  {Object.entries(STATUS_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Deliver into warehouse</span>
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
            </>
          ) : null}
          {remaining > 0 ? (
            <>
              <label className="field">
                <span>Amount to pay (ETB)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  disabled={busy}
                  placeholder={`Unpaid ${money(remaining)}`}
                />
                <span className="muted">Unpaid balance: {money(remaining)} ETB</span>
              </label>
              <label className="field">
                <span>Payment method / account</span>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  disabled={busy}
                  required={Number(payAmount || 0) > 0}
                >
                  {methods.map((m) => (
                    <option key={m.id} value={m.name}>{m.name}</option>
                  ))}
                </select>
              </label>
            </>
          ) : (
            <p className="muted">This purchase is fully paid.</p>
          )}
          {error ? <p className="error">{error}</p> : null}
          <div className="modal-actions">
            <button type="button" className="btn secondary" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="btn success" disabled={busy}>
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
  const [warehouseId, setWarehouseId] = useState("");
  const [dontDeliver, setDontDeliver] = useState(false);
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
  const [formOpen, setFormOpen] = useState(false);
  const [showAllColumns, setShowAllColumns] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(min-width: 900px)").matches,
  );
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 899px)").matches,
  );
  const [showAnalysis, setShowAnalysis] = useState(
    () => typeof window === "undefined" || !window.matchMedia("(max-width: 899px)").matches,
  );

  const subtotal = lines.reduce((sum, line) => sum + lineAmount(line), 0);
  const grandTotal = withVat(subtotal);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const mq = window.matchMedia("(max-width: 899px)");
    const sync = () => {
      const mobile = mq.matches;
      setIsMobile(mobile);
      setShowAnalysis(!mobile);
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    setPaidAmount(grandTotal ? grandTotal.toFixed(2) : "");
  }, [grandTotal]);

  const loadLookups = async () => {
    const [s, p, w, m, team] = await Promise.all([
      api("/api/suppliers", { query: { status: "ACTIVE" } }).catch(() => ({ data: { suppliers: [] } })),
      api("/api/products", { query: { limit: 100, status: "ACTIVE" } }),
      api("/api/warehouses"),
      api("/api/payment-methods", { query: { status: "ACTIVE" } }),
      owner ? api("/api/team") : Promise.resolve({ data: { salesmen: [] } }),
    ]);
    const supplierRows = (s.data.suppliers || []).filter((row) => row.name !== "Walk-in");
    const methodRows = m.data.paymentMethods || [];
    const warehouseRows = w.data.warehouses || [];
    const preferredStore =
      warehouseRows.find((row) => String(row.name).toLowerCase() === "main store") ||
      warehouseRows[0] ||
      null;
    setSuppliers(supplierRows);
    setProducts(p.data.products || []);
    setWarehouses(warehouseRows);
    setMethods(methodRows);
    setSalesmen(team.data.salesmen || []);
    if (!supplierRows.length) {
      setParty("walkin");
      setSupplierId("");
    } else {
      setSupplierId((prev) => prev || supplierRows[0]?.id || "");
    }
    setWarehouseId((prev) => prev || preferredStore?.id || "");
    setDeliverWarehouseId((prev) => prev || preferredStore?.id || "");
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
          deliverToStore: !dontDeliver,
          warehouseId: dontDeliver ? null : warehouseId || null,
          items,
        },
      });
      setLines([emptyLine()]);
      setWalkInName("");
      setDontDeliver(false);
      setFormOpen(false);
      await Promise.all([loadLookups(), loadRecords()]);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const saveUpdate = async (row, payload) => {
    setBusy(true);
    setModalError("");
    try {
      const remaining = Math.max(0, Number(row.remainingBalance || 0));
      const payAmount = Number(payload.payAmount || 0);
      if (payAmount < 0) {
        throw new Error("Amount to pay cannot be negative");
      }
      if (payAmount > remaining + 0.001) {
        throw new Error(`Amount to pay cannot exceed unpaid ${money(remaining)} ETB`);
      }
      if (owner) {
        await api(`/api/purchase-orders/items/${row.id}`, {
          method: "PATCH",
          body: {
            deliveryStatus: payload.deliveryStatus,
            warehouseId: payload.warehouseId,
            quantity: payload.quantity,
          },
        });
      }
      if (payAmount > 0) {
        await api(`/api/purchase-orders/${row.purchaseOrderId}/payments`, {
          method: "POST",
          body: {
            amount: payAmount,
            paymentMethod: payload.paymentMethod,
          },
        });
      }
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

  const unpaidTotal = unpaidFromLines(report?.lines || []);

  if (!report && !error) {
    return <InventoryLoading message="Loading inventory..." />;
  }

  return (
    <div className="purchase-page">
      <div className="topbar">
        <h1 style={{ margin: 0 }}>Purchases</h1>
        <div className="row-actions">
          {formOpen ? (
            <button
              type="button"
              className="btn secondary"
              onClick={() => {
                setFormOpen(false);
                setError("");
              }}
            >
              Close form
            </button>
          ) : can(user, "purchasing", "CREATE") ? (
            <button type="button" className="btn danger" onClick={() => setFormOpen(true)}>
              Add new purchase
            </button>
          ) : null}
          {isMobile ? (
            <button
              type="button"
              className="btn secondary"
              onClick={() => setShowAnalysis((open) => !open)}
            >
              {showAnalysis ? "Hide analysis" : "Show analysis"}
            </button>
          ) : null}
          {can(user, "purchasing", "CREATE") ? (
            <Link className="btn secondary" to="/buy/import">
              Import from Excel
            </Link>
          ) : null}
        </div>
      </div>

      {showAnalysis ? (
        <section className="purchase-analytics">
          <article className="analytics-card">
            <span>Not delivered</span>
            <b>{summary.notDelivered.count}</b>
            <small>Waiting for the store</small>
            {itemChips(summary.notDelivered.items)}
          </article>
          <article className="analytics-card">
            <span>On loading</span>
            <b>{summary.onLoading.count}</b>
            <small>In progress</small>
            {itemChips(summary.onLoading.items)}
          </article>
          <article className="analytics-card">
            <span>Delivered</span>
            <b>{summary.delivered.count}</b>
            <small>Already in warehouse</small>
            {itemChips(summary.delivered.items)}
          </article>
          <article className="analytics-card">
            <span>Unpaid</span>
            <b>{money(unpaidTotal)}</b>
            <small>ETB still outstanding</small>
          </article>
        </section>
      ) : null}

      {formOpen ? (
        <form className="card" onSubmit={submit}>
          <div className="grid split" style={{ marginTop: 4 }}>
            <PartySelectField
              options={suppliers.map((s) => ({ id: s.id, name: s.name }))}
              party={party}
              onPartyChange={setParty}
              valueId={supplierId}
              onValueIdChange={setSupplierId}
              walkInName={walkInName}
              onWalkInNameChange={setWalkInName}
              selectLabel="Supplier"
              walkInLabel="Walk-in seller (not in list)"
              walkInNameLabel="Walk-in seller name"
              walkInPlaceholder="Name of the person you bought from"
              emptySelectText="No suppliers yet"
              registerTo="/customers?type=SUPPLIER"
              registerLabel="Register supplier"
            />
            <label className="field">
              <span>Payment method</span>
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
            <div className="field">
              <label className="check-inline party-walkin-check" style={{ marginBottom: 8 }}>
                <input
                  type="checkbox"
                  checked={dontDeliver}
                  onChange={(e) => setDontDeliver(e.target.checked)}
                />
                <span>Don&apos;t deliver to store</span>
              </label>
              {!dontDeliver ? (
                <label className="field" style={{ margin: 0 }}>
                  <span>Deliver into store</span>
                  <select
                    value={warehouseId}
                    onChange={(e) => setWarehouseId(e.target.value)}
                    required
                  >
                    <option value="">Select store</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                  <small className="muted">
                    Stock goes into this store when you save. Default is Main store.
                  </small>
                </label>
              ) : (
                <small className="muted">
                  Purchase is saved as not delivered. You can deliver into a store later.
                </small>
              )}
            </div>
          </div>

          <h3>Items bought</h3>
          <LineEditor
            products={products}
            showStock={false}
            lines={lines}
            onChange={setLines}
            priceKey="purchasePrice"
            addLabel="Add other item"
            addClassName="btn success add-item-btn"
          />

          <VatSummary lines={lines} products={products} label="Grand total cost" />

          {error ? <p className="error">{error}</p> : null}
          <div className="row-actions" style={{ marginTop: 16 }}>
            <button
              type="button"
              className="btn secondary"
              disabled={busy}
              onClick={() => {
                setFormOpen(false);
                setError("");
              }}
            >
              Cancel
            </button>
            <button className="btn success" disabled={busy}>
              {busy ? "Saving purchase…" : "Save purchase"}
            </button>
          </div>
        </form>
      ) : null}

      <div className="card" style={{ marginTop: formOpen ? 18 : 0 }}>
        <div className="catalog-list-head">
          <h3 style={{ margin: 0 }}>Purchase records</h3>
          <button
            type="button"
            className="btn"
            onClick={() => setShowAllColumns((next) => !next)}
          >
            {showAllColumns ? "Basic columns" : "Show all columns"}
          </button>
        </div>
        <div className="toolbar purchase-filters">
          <label className="field">
            <span>From</span>
            <input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
          </label>
          <label className="field">
            <span>To</span>
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
            <span>Payment</span>
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
              <span>Staff</span>
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
        {error && !formOpen ? <p className="error">{error}</p> : null}
        {owner && summary.undeliveredCount > 0 ? (
          <div className="toolbar purchase-filters" style={{ marginTop: 0 }}>
            <label className="field">
              <span>Deliver all into</span>
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
              className="btn"
              disabled={busy || !deliverWarehouseId}
              onClick={deliverAll}
            >
              {busy ? "Updating…" : `Deliver all (${summary.undeliveredCount})`}
            </button>
          </div>
        ) : null}
        <div className={`table-wrap purchase-table ${showAllColumns ? "is-expanded" : "is-compact"}`}>
          <table>
            <thead>
              <tr>
                {showAllColumns ? <th>Date</th> : null}
                <th>Item name</th>
                <th>Quantity</th>
                {showAllColumns ? <th>Unit price</th> : null}
                {showAllColumns ? <th>Amount</th> : null}
                <th>Cost with VAT</th>
                {showAllColumns ? <th>Bought from</th> : null}
                {showAllColumns ? <th>Staff</th> : null}
                <th>Paid</th>
                <th>Unpaid</th>
                {showAllColumns ? <th>Method</th> : null}
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(report?.lines || []).map((row) => (
                <tr key={row.id}>
                  {showAllColumns ? <td>{row.date}</td> : null}
                  <td><strong>{row.productName}</strong></td>
                  <td>{qty(row.quantity)} {row.unit}</td>
                  {showAllColumns ? <td>{money(row.unitPrice)} ETB</td> : null}
                  {showAllColumns ? <td>{money(row.totalPrice)} ETB</td> : null}
                  <td>{money(withVat(row.totalPrice))} ETB</td>
                  {showAllColumns ? <td>{row.party || "—"}</td> : null}
                  {showAllColumns ? <td>{row.salesman || "—"}</td> : null}
                  <td>{money(row.paidAmount)} ETB</td>
                  <td>{money(row.remainingBalance)} ETB</td>
                  {showAllColumns ? <td>{row.paymentMethod || "—"}</td> : null}
                  <td>{STATUS_LABEL[row.deliveryStatus] || row.deliveryStatus}</td>
                  <td>
                    <button
                      type="button"
                      className="btn success"
                      onClick={() => {
                        setModalError("");
                        setEditing(row);
                      }}
                    >
                      Update
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(report?.lines || []).length === 0 ? <p className="empty muted">No purchases for this filter.</p> : null}
        {report?.totals ? (
          <p className="totals-box" style={{ marginTop: 12 }}>
            Filtered cost with VAT: <strong>{money(withVat(report.totals.amount))} ETB</strong>
            {" · "}
            Quantity: <strong>{qty(report.totals.quantity)}</strong>
          </p>
        ) : null}
      </div>

      {editing ? (
        <UpdateModal
          row={editing}
          warehouses={warehouses}
          methods={methods}
          owner={owner}
          busy={busy}
          error={modalError}
          onClose={() => {
            if (!busy) {
              setEditing(null);
              setModalError("");
            }
          }}
          onSave={saveUpdate}
        />
      ) : null}
    </div>
  );
}
