import { useEffect, useState } from "react";
import { api } from "../../api/client";
import InventoryLoading from "../../components/InventoryLoading";

export default function TransfersPage() {
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [form, setForm] = useState({ sourceWarehouseId: "", destinationWarehouseId: "", productId: "", quantity: 1 });
  const [ready, setReady] = useState(false);

  const load = async () => {
    const [w, p, t] = await Promise.all([
      api("/api/warehouses"),
      api("/api/products", { query: { limit: 100 } }),
      api("/api/stock-transfers"),
    ]);
    setWarehouses(w.data.warehouses);
    setProducts(p.data.products);
    setTransfers(t.data.transfers);
    setForm((prev) => ({
      ...prev,
      sourceWarehouseId: w.data.warehouses[0]?.id || "",
      destinationWarehouseId: w.data.warehouses[1]?.id || w.data.warehouses[0]?.id || "",
    }));
  };

  useEffect(() => {
    load()
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  if (!ready) return <InventoryLoading message="Loading inventory..." />;

  return (
    <>
      <h1>Branch transfers</h1>
      <p className="muted">Move stock between shops in one step. Source out, destination in, no lost in-transit qty.</p>
      <form
        className="card"
        onSubmit={async (e) => {
          e.preventDefault();
          const created = await api("/api/stock-transfers", {
            method: "POST",
            body: {
              sourceWarehouseId: form.sourceWarehouseId,
              destinationWarehouseId: form.destinationWarehouseId,
              items: [{ productId: form.productId, quantity: Number(form.quantity) }],
            },
          });
          await api(`/api/stock-transfers/${created.data.transfer.id}/complete`, { method: "POST" });
          load();
        }}
      >
        <div className="grid split">
          <select value={form.sourceWarehouseId} onChange={(e) => setForm({ ...form, sourceWarehouseId: e.target.value })}>
            {warehouses.map((w) => <option key={w.id} value={w.id}>From {w.name}</option>)}
          </select>
          <select value={form.destinationWarehouseId} onChange={(e) => setForm({ ...form, destinationWarehouseId: e.target.value })}>
            {warehouses.map((w) => <option key={w.id} value={w.id}>To {w.name}</option>)}
          </select>
          <select value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })} required>
            <option value="">Product</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
        </div>
        <button className="btn" style={{ marginTop: 12 }}>Transfer now</button>
      </form>
      <div className="card table-wrap" style={{ marginTop: 16 }}>
        <table>
          <thead><tr><th>Number</th><th>From</th><th>To</th><th>Status</th></tr></thead>
          <tbody>
            {transfers.map((t) => (
              <tr key={t.id}>
                <td>{t.transferNumber}</td>
                <td>{t.sourceWarehouse?.name}</td>
                <td>{t.destinationWarehouse?.name}</td>
                <td>{t.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
