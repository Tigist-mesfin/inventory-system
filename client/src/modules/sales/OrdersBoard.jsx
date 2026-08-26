import { useEffect, useState } from "react";
import { api, money, qty } from "../../api/client";

const STATUS_LABEL = {
  PENDING: "Pending",
  ON_LOADING: "On loading",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

const PAY_LABEL = {
  UNPAID: "Not paid",
  PARTIAL: "Partially paid",
  PAID: "Paid",
};

function ApproveModal({ order, warehouses, methods, busy, error, onClose, onSave }) {
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id || "");
  const [paymentMethodId, setPaymentMethodId] = useState(methods[0]?.id || "");
  const [paidAmount, setPaidAmount] = useState(order.totalAmount);
  const [status, setStatus] = useState("ON_LOADING");
  const [items, setItems] = useState(
    (order.items || []).map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      name: item.product?.name,
      unit: item.product?.unit,
      unitPrice: item.unitPrice,
    })),
  );

  const submit = (event) => {
    event.preventDefault();
    onSave(order.id, {
      warehouseId,
      paymentMethodId,
      paidAmount: Number(paidAmount),
      status,
      items: items.map((item) => ({
        productId: item.productId,
        quantity: Number(item.quantity),
      })),
    });
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div className="modal-card" role="dialog" onClick={(e) => e.stopPropagation()}>
        <h2>Approve {order.orderNumber}</h2>
        <p className="muted">{order.customerName} · {order.customerPhone}</p>
        <form onSubmit={submit}>
          {(items || []).map((item, index) => (
            <label key={item.productId} className="field">
              <span>{item.name} amount ({item.unit})</span>
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
          ))}
          <label className="field">
            <span>Warehouse to sell from</span>
            <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} required>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Payment method</span>
            <select value={paymentMethodId} onChange={(e) => setPaymentMethodId(e.target.value)} required>
              {methods.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Amount paid (ETB)</span>
            <input type="number" min="0" step="0.01" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} required />
          </label>
          <label className="field">
            <span>Delivery status</span>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="ON_LOADING">On loading</option>
              <option value="DELIVERED">Delivered</option>
            </select>
          </label>
          {error ? <p className="error">{error}</p> : null}
          <div className="modal-actions">
            <button type="button" className="btn secondary" onClick={onClose} disabled={busy}>Cancel</button>
            <button type="submit" className="btn saffron" disabled={busy}>{busy ? "Saving…" : "Approve and sell"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function OrdersBoard({ reloadKey = 0 }) {
  const [orders, setOrders] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [methods, setMethods] = useState([]);
  const [filters, setFilters] = useState({ status: "", paymentStatus: "", search: "" });
  const [error, setError] = useState("");
  const [modalError, setModalError] = useState("");
  const [busy, setBusy] = useState(false);
  const [approving, setApproving] = useState(null);
  const [payOrder, setPayOrder] = useState(null);
  const [payAmount, setPayAmount] = useState("");

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
        setMethods(m.data.paymentMethods || []);
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, [filters.status, filters.paymentStatus, reloadKey]);

  const approve = async (id, body) => {
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
    try {
      await api(`/api/customer-orders/${id}/status`, { method: "PATCH", body: { status } });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const addPayment = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      await api(`/api/customer-orders/${payOrder.id}/payments`, {
        method: "POST",
        body: { amount: Number(payAmount) },
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
      <p className="muted">Approve a pending order to deduct stock and record the sale.</p>
      <div className="toolbar">
        <input
          placeholder="Search name, phone, order #"
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          onKeyDown={(e) => e.key === "Enter" && load()}
        />
        <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option value="">All statuses</option>
          {Object.entries(STATUS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <select value={filters.paymentStatus} onChange={(e) => setFilters({ ...filters, paymentStatus: e.target.value })}>
          <option value="">All payments</option>
          {Object.entries(PAY_LABEL).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <button className="btn secondary" onClick={load}>Search</button>
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
                <td>{order.orderNumber}</td>
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
                <td>{money(order.totalAmount)} ETB</td>
                <td>
                  {PAY_LABEL[order.paymentStatus]}
                  <div className="muted">
                    Paid {money(order.paidAmount)} · left {money(order.remainingBalance)}
                  </div>
                </td>
                <td>{STATUS_LABEL[order.status]}</td>
                <td>
                  {order.status === "PENDING" ? (
                    <button type="button" className="btn saffron" onClick={() => { setModalError(""); setApproving(order); }}>
                      Approve
                    </button>
                  ) : (
                    <div className="row-actions">
                      {order.status !== "DELIVERED" ? (
                        <button type="button" className="btn secondary" disabled={busy} onClick={() => setStatus(order.id, "DELIVERED")}>
                          Mark delivered
                        </button>
                      ) : null}
                      {order.paymentStatus !== "PAID" ? (
                        <button type="button" className="btn secondary" onClick={() => { setPayOrder(order); setPayAmount(order.remainingBalance); }}>
                          Record payment
                        </button>
                      ) : null}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 ? <p className="empty muted">No customer orders yet.</p> : null}
      </div>

      {approving ? (
        <ApproveModal
          order={approving}
          warehouses={warehouses}
          methods={methods}
          busy={busy}
          error={modalError}
          onClose={() => !busy && setApproving(null)}
          onSave={approve}
        />
      ) : null}

      {payOrder ? (
        <div className="modal-backdrop" onClick={() => !busy && setPayOrder(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>Record payment</h2>
            <p className="muted">Remaining {money(payOrder.remainingBalance)} ETB</p>
            <form onSubmit={addPayment}>
              <label className="field">
                <span>Amount</span>
                <input type="number" min="0.01" step="0.01" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} required />
              </label>
              <div className="modal-actions">
                <button type="button" className="btn secondary" onClick={() => setPayOrder(null)}>Cancel</button>
                <button className="btn saffron" disabled={busy}>Save</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
