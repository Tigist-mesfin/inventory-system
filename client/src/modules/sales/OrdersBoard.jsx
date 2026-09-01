import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, money, qty, VAT_RATE, vatOf, withVat } from "../../api/client";
import { can } from "../../auth/access";
import { useAuth } from "../../auth/AuthContext";

const STATUS_LABEL = {
  PENDING: "Pending",
  ON_LOADING: "Sold",
  DELIVERED: "Sent",
  CANCELLED: "Rejected",
};

const PAY_LABEL = {
  UNPAID: "Not paid",
  PARTIAL: "Partially paid",
  PAID: "Paid",
};

function AddToSalesModal({
  order,
  warehouses,
  methods,
  busy,
  error,
  initialStatus = "SOLD",
  onClose,
  onSave,
}) {
  const [warehouseId, setWarehouseId] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState(methods[0]?.id || "");
  const [paidAmount, setPaidAmount] = useState(order.totalAmount);
  const [status, setStatus] = useState(initialStatus === "DELIVERED" ? "DELIVERED" : "SOLD");
  const [stockByStore, setStockByStore] = useState({});
  const [items, setItems] = useState(
    (order.items || []).map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      name: item.product?.name,
      unit: item.product?.unit,
      unitPrice: item.unitPrice,
    })),
  );

  useEffect(() => {
    if (!paymentMethodId && methods[0]?.id) setPaymentMethodId(methods[0].id);
  }, [methods, paymentMethodId]);

  useEffect(() => {
    let cancelled = false;
    api("/api/inventory", { query: { limit: 500 } })
      .then((res) => {
        if (cancelled) return;
        const map = {};
        for (const row of res.data.inventory || []) {
          const key = `${row.productId}|${row.warehouseId}`;
          map[key] = Number(row.available ?? row.quantity ?? 0);
        }
        setStockByStore(map);

        const scored = warehouses.map((warehouse) => {
          let ok = true;
          let total = 0;
          for (const item of order.items || []) {
            const onHand = map[`${item.productId}|${warehouse.id}`] || 0;
            total += onHand;
            if (onHand < Number(item.quantity || 0)) ok = false;
          }
          return { warehouse, ok, total };
        });
        scored.sort((a, b) => Number(b.ok) - Number(a.ok) || b.total - a.total);
        const best = scored.find((row) => row.ok) || scored[0];
        if (best?.warehouse?.id) setWarehouseId(best.warehouse.id);
        else if (warehouses[0]?.id) setWarehouseId(warehouses[0].id);
      })
      .catch(() => {
        if (!cancelled && warehouses[0]?.id) setWarehouseId(warehouses[0].id);
      });
    return () => {
      cancelled = true;
    };
  }, [order, warehouses]);

  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0),
    0,
  );
  const vatAmount = vatOf(subtotal);
  const totalDue = withVat(subtotal);

  useEffect(() => {
    setPaidAmount(totalDue.toFixed(2));
  }, [totalDue]);

  const submit = (event) => {
    event.preventDefault();
    if (!warehouses.length) {
      return;
    }
    const saleItems = items
      .filter((item) => item.productId)
      .map((item) => ({
        productId: item.productId,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
      }));
    if (!saleItems.length) {
      return;
    }
    onSave(order.id, {
      warehouseId: warehouseId || warehouses[0]?.id,
      paymentMethodId: paymentMethodId || methods[0]?.id || null,
      paidAmount: Number(paidAmount),
      status: status === "DELIVERED" ? "DELIVERED" : "SOLD",
      items: saleItems,
    });
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div className="modal-card" role="dialog" onClick={(e) => e.stopPropagation()}>
        <h2>Add to sales · {order.orderNumber}</h2>
        <p className="muted">{order.customerName} · {order.customerPhone}</p>
        <form onSubmit={submit}>
          {(items || []).map((item, index) => {
            const onHand = warehouseId
              ? stockByStore[`${item.productId}|${warehouseId}`] || 0
              : 0;
            return (
              <label key={item.productId} className="field">
                <span>
                  {item.name} amount ({item.unit})
                  {warehouseId ? (
                    <em> · in selected store: {qty(onHand)}</em>
                  ) : null}
                </span>
                <input
                  type="number"
                  min="0.001"
                  step="0.001"
                  value={item.quantity}
                  onChange={(e) => {
                    const next = items.map((row, i) =>
                      i === index ? { ...row, quantity: e.target.value } : row,
                    );
                    setItems(next);
                  }}
                />
              </label>
            );
          })}
          <div className="totals-box" style={{ margin: "12px 0" }}>
            <div>
              Subtotal: <strong>{money(subtotal)} ETB</strong>
            </div>
            <div>
              VAT {VAT_RATE}%: <strong>{money(vatAmount)} ETB</strong>
            </div>
            <div>
              Total due: <strong>{money(totalDue)} ETB</strong>
            </div>
          </div>
          <label className="field">
            <span>Warehouse to sell from</span>
            <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} required>
              {!warehouses.length ? (
                <option value="">No warehouses — add a store first</option>
              ) : null}
              {warehouses.map((w) => {
                const covers = (order.items || []).every((item) => {
                  const onHand = stockByStore[`${item.productId}|${w.id}`] || 0;
                  return onHand >= Number(item.quantity || 0);
                });
                return (
                  <option key={w.id} value={w.id}>
                    {w.name}
                    {covers ? " · has stock" : " · low/no stock"}
                  </option>
                );
              })}
            </select>
          </label>
          <label className="field">
            <span>Payment method</span>
            <select
              value={paymentMethodId}
              onChange={(e) => setPaymentMethodId(e.target.value)}
              required={methods.length > 0}
            >
              {!methods.length ? (
                <option value="">No payment methods — add one first</option>
              ) : null}
              {methods.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Amount paid (ETB)</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value)}
              required
            />
          </label>
          <label className="field">
            <span>Status after sale</span>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="SOLD">Sold</option>
              <option value="DELIVERED">Sent</option>
            </select>
          </label>
          {error ? <p className="error">{error}</p> : null}
          <div className="modal-actions">
            <button type="button" className="btn secondary" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="btn saffron" disabled={busy}>
              {busy ? "Saving…" : "Add to sales"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function OrdersBoard({ reloadKey = 0 }) {
  const { user } = useAuth();
  const canApprove = can(user, "sales", "APPROVE");
  const canUpdate = can(user, "sales", "UPDATE");
  const [orders, setOrders] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [methods, setMethods] = useState([]);
  const [filters, setFilters] = useState({ status: "", paymentStatus: "", search: "" });
  const [error, setError] = useState("");
  const [modalError, setModalError] = useState("");
  const [busy, setBusy] = useState(false);
  const [approving, setApproving] = useState(null);
  const [approveStatus, setApproveStatus] = useState("SOLD");
  const [payOrder, setPayOrder] = useState(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethodId, setPayMethodId] = useState("");

  const load = async () => {
    const query = { limit: 100 };
    if (filters.status) query.status = filters.status;
    if (filters.paymentStatus) query.paymentStatus = filters.paymentStatus;
    if (filters.search) query.search = filters.search;
    const res = await api("/api/customer-orders", { query });
    setOrders(res.data.orders || []);
  };

  useEffect(() => {
    Promise.all([
      api("/api/warehouses"),
      api("/api/payment-methods", { query: { status: "ACTIVE" } }),
    ])
      .then(([w, m]) => {
        setWarehouses(w.data.warehouses || []);
        const list = m.data.paymentMethods || [];
        setMethods(list);
        if (list[0]?.id) setPayMethodId(list[0].id);
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, [filters.status, filters.paymentStatus, reloadKey]);

  const addToSales = async (id, body) => {
    setBusy(true);
    setModalError("");
    try {
      await api(`/api/customer-orders/${id}/approve`, { method: "POST", body });
      setApproving(null);
      await load();
    } catch (err) {
      setModalError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (id, status) => {
    setBusy(true);
    setError("");
    try {
      await api(`/api/customer-orders/${id}/status`, { method: "PATCH", body: { status } });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const openPay = (order) => {
    setError("");
    setPayOrder(order);
    const left = Number(order.remainingBalance || 0);
    setPayAmount(left > 0 ? left.toFixed(2) : "");
    setPayMethodId(order.paymentMethod?.id || methods[0]?.id || "");
  };

  const addPayment = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const remaining = Number(payOrder.remainingBalance || 0);
      const typed = Number(payAmount);
      if (!(remaining > 0) && !(typed > 0)) {
        throw new Error("Nothing left to pay on this order");
      }
      await api(`/api/customer-orders/${payOrder.id}/payments`, {
        method: "POST",
        body: {
          amount: Number((typed > 0 ? typed : remaining).toFixed(2)),
          paymentMethodId: payMethodId || methods[0]?.id || undefined,
          payRemaining: true,
        },
      });
      setPayOrder(null);
      setPayAmount("");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card" style={{ marginBottom: 18 }}>
      <h3 style={{ marginTop: 0 }}>Orders</h3>
      <p className="muted">
        Add a pending order to sales to deduct stock and create the invoice. Then mark Sold,
        Sent, or Rejected.
      </p>
      <div className="toolbar">
        <input
          placeholder="Search name, phone, order #"
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          onKeyDown={(e) => e.key === "Enter" && load()}
        />
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
        >
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="SOLD">Sold</option>
          <option value="DELIVERED">Sent</option>
          <option value="REJECTED">Rejected</option>
        </select>
        <select
          value={filters.paymentStatus}
          onChange={(e) => setFilters({ ...filters, paymentStatus: e.target.value })}
        >
          <option value="">All payments</option>
          {Object.entries(PAY_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button className="btn secondary" onClick={load}>
          Search
        </button>
      </div>
      {error ? <p className="error">{error}</p> : null}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Deliver</th>
              <th>Items</th>
              <th>Total</th>
              <th>Payment</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td>
                  {order.orderNumber}
                  {order.sale?.invoiceNumber ? (
                    <div className="muted">Sale {order.sale.invoiceNumber}</div>
                  ) : null}
                </td>
                <td>
                  {order.customerName}
                  <div className="muted">{order.customerPhone}</div>
                </td>
                <td>{String(order.deliveryDate).slice(0, 10)}</td>
                <td>
                  {(order.items || []).map((item) => (
                    <div key={item.id}>
                      {item.product?.name}: {qty(item.quantity)} {item.product?.unit}
                    </div>
                  ))}
                </td>
                <td>
                  {money(order.totalAmount)} ETB
                  <div className="muted">
                    VAT {VAT_RATE}%{" "}
                    {money(order.taxAmount != null ? order.taxAmount : vatOf(order.subtotal))}
                  </div>
                </td>
                <td>
                  {PAY_LABEL[order.paymentStatus]}
                  <div className="muted">
                    Paid {money(order.paidAmount)} · left {money(order.remainingBalance)}
                  </div>
                </td>
                <td>
                  <strong>{STATUS_LABEL[order.status] || order.status}</strong>
                  {order.status === "PENDING" && (canApprove || canUpdate) ? (
                    <div className="muted" style={{ marginTop: 6 }}>
                      <select
                        value=""
                        disabled={busy}
                        onChange={(e) => {
                          const next = e.target.value;
                          if (!next) return;
                          if ((next === "SOLD" || next === "DELIVERED") && canApprove) {
                            setModalError("");
                            setApproveStatus(next);
                            setApproving(order);
                          } else if (next === "REJECTED" && canUpdate) {
                            setStatus(order.id, "REJECTED");
                          }
                        }}
                      >
                        <option value="">Change status…</option>
                        {canApprove ? <option value="SOLD">Sold (add to sales)</option> : null}
                        {canApprove ? <option value="DELIVERED">Sent (add to sales)</option> : null}
                        {canUpdate ? <option value="REJECTED">Rejected</option> : null}
                      </select>
                    </div>
                  ) : order.status !== "CANCELLED" && order.status !== "PENDING" && canUpdate ? (
                    <div className="muted" style={{ marginTop: 6 }}>
                      <select
                        value={order.status === "DELIVERED" ? "DELIVERED" : "SOLD"}
                        disabled={busy}
                        onChange={(e) => setStatus(order.id, e.target.value)}
                      >
                        <option value="SOLD">Sold</option>
                        <option value="DELIVERED">Sent</option>
                      </select>
                    </div>
                  ) : null}
                </td>
                <td>
                  <div className="row-actions">
                    <Link className="btn secondary" to={`/orders/${order.id}/proforma`}>
                      Proforma
                    </Link>
                    {order.status === "PENDING" && canApprove ? (
                      <button
                        type="button"
                        className="btn saffron"
                        onClick={() => {
                          setModalError("");
                          setApproveStatus("SOLD");
                          setApproving(order);
                        }}
                      >
                        Add to sales
                      </button>
                    ) : null}
                    {order.saleId && order.paymentStatus !== "PAID" && canUpdate ? (
                      <button type="button" className="btn secondary" onClick={() => openPay(order)}>
                        Record payment
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 ? <p className="empty muted">No customer orders yet.</p> : null}
      </div>

      {approving ? (
        <AddToSalesModal
          order={approving}
          warehouses={warehouses}
          methods={methods}
          busy={busy}
          error={modalError}
          initialStatus={approveStatus}
          onClose={() => !busy && setApproving(null)}
          onSave={addToSales}
        />
      ) : null}

      {payOrder ? (
        <div className="modal-backdrop" onClick={() => !busy && setPayOrder(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>Record payment</h2>
            <p className="muted">
              {payOrder.orderNumber} · Remaining {money(payOrder.remainingBalance)} ETB
            </p>
            <form onSubmit={addPayment}>
              <label className="field">
                <span>Payment method</span>
                <select
                  value={payMethodId}
                  onChange={(e) => setPayMethodId(e.target.value)}
                >
                  {methods.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Amount</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  required
                />
              </label>
              {error ? <p className="error">{error}</p> : null}
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => setPayOrder(null)}
                  disabled={busy}
                >
                  Cancel
                </button>
                <button type="submit" className="btn saffron" disabled={busy}>
                  {busy ? "Saving…" : "Pay remaining"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
