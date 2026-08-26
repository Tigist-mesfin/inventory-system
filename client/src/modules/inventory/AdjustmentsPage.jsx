import { useEffect, useState } from "react";
import { api } from "../../api/client";

export default function AdjustmentsPage() {
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ warehouseId: "", productId: "", actualQuantity: 0, reason: "Damaged / returned count" });

  const load = async () => {
    const [w, p, a] = await Promise.all([
      api("/api/warehouses"),
      api("/api/products", { query: { limit: 100 } }),
      api("/api/stock-adjustments"),
    ]);
    setWarehouses(w.data.warehouses);
    setProducts(p.data.products);
    setRows(a.data.adjustments);
    setForm((prev) => ({ ...prev, warehouseId: w.data.warehouses[0]?.id || "" }));
  };

  useEffect(() => { load().catch(() => {}); }, []);

  return (
    <>
      <h1>Damaged, returns & counts</h1>
      <p className="muted">Keep damaged and returned goods out of “normal” stock by setting actual on-hand.</p>
      <form
        className="card"
        onSubmit={async (e) => {
          e.preventDefault();
          const created = await api("/api/stock-adjustments", {
            method: "POST",
            body: {
              warehouseId: form.warehouseId,
              reason: form.reason,
              items: [{ productId: form.productId, actualQuantity: Number(form.actualQuantity), reason: form.reason }],
            },
          });
          await api(`/api/stock-adjustments/${created.data.adjustment.id}/complete`, { method: "POST" });
          load();
        }}
      >
        <div className="grid split">
          <select value={form.warehouseId} onChange={(e) => setForm({ ...form, warehouseId: e.target.value })}>
            {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
          <select value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })} required>
            <option value="">Product</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input type="number" min="0" value={form.actualQuantity} onChange={(e) => setForm({ ...form, actualQuantity: e.target.value })} />
          <input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
        </div>
        <button className="btn" style={{ marginTop: 12 }}>Set actual quantity</button>
      </form>
      <div className="card table-wrap" style={{ marginTop: 16 }}>
        <table>
          <thead><tr><th>Number</th><th>Reason</th><th>Status</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.adjustmentNumber}</td>
                <td>{r.reason}</td>
                <td>{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
