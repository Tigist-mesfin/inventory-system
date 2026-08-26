import { useEffect, useState } from "react";
import { api } from "../../api/client";

const emptyForm = () => ({
  name: "",
  unit: "KG",
  brand: "",
  serialNumber: "",
  color: "",
  sellingPrice: "",
});

const UNITS = [
  { value: "KG", label: "kg" },
  { value: "LITER", label: "liter" },
  { value: "PCS", label: "piece" },
  { value: "SACK", label: "sack" },
  { value: "BOX", label: "box" },
];

export default function CatalogPage() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");

  const load = () =>
    api("/api/products", { query: { limit: 100 } }).then((res) => setProducts(res.data.products || []));

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  const reset = () => {
    setEditingId(null);
    setForm(emptyForm());
  };

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const body = {
        name: form.name,
        unit: form.unit,
        brand: form.brand || null,
        serialNumber: form.serialNumber || null,
        color: form.color || null,
        sellingPrice: Number(form.sellingPrice || 0),
      };
      if (editingId) {
        await api(`/api/products/${editingId}`, { method: "PATCH", body });
      } else {
        await api("/api/products", { method: "POST", body });
      }
      reset();
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (product) => {
    setEditingId(product.id);
    setForm({
      name: product.name,
      unit: product.unit || "KG",
      brand: product.brand || "",
      serialNumber: product.barcode || "",
      color: product.color || "",
      sellingPrice: product.sellingPrice ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const remove = async (product) => {
    if (!window.confirm(`Delete ${product.name}? This only works if it has no purchase or sale history.`)) return;
    setError("");
    try {
      await api(`/api/products/${product.id}`, { method: "DELETE" });
      if (editingId === product.id) reset();
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const visible = products.filter((p) => {
    const hay = `${p.name} ${p.brand || ""} ${p.color || ""} ${p.barcode || ""}`.toLowerCase();
    return hay.includes(query.toLowerCase());
  });

  return (
    <div className="catalog-page">
      <div className="topbar">
        <div>
          <h1 style={{ margin: 0 }}>Item registration</h1>
          <p className="muted">Register items with name, unit, and selling price.</p>
        </div>
      </div>

      <form className="card catalog-form" onSubmit={submit}>
        <div className="catalog-form-head">
          <h2 style={{ margin: 0 }}>{editingId ? "Edit item" : "New item"}</h2>
          {editingId ? (
            <button type="button" className="btn secondary" onClick={reset}>Cancel edit</button>
          ) : null}
        </div>
        <div className="catalog-fields">
          <label className="field">
            <span>Item name</span>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </label>
          <label className="field">
            <span>Unit</span>
            <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} required>
              {UNITS.map((u) => (
                <option key={u.value} value={u.value}>{u.label}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Selling price (ETB)</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.sellingPrice}
              onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })}
              placeholder="Price the customer pays"
              required
            />
          </label>
          <label className="field">
            <span>Brand <em>(optional)</em></span>
            <input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="e.g. FreshFarm" />
          </label>
          <label className="field">
            <span>Serial number <em>(optional)</em></span>
            <input value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} placeholder="Optional serial / code" />
          </label>
          <label className="field">
            <span>Color <em>(optional)</em></span>
            <input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} placeholder="e.g. Red" />
          </label>
        </div>
        {error ? <p className="error">{error}</p> : null}
        <button className="btn saffron catalog-submit" disabled={busy}>
          {busy ? "Saving…" : editingId ? "Save changes" : "Register item"}
        </button>
      </form>

      <section className="card catalog-list">
        <div className="catalog-list-head">
          <h2 style={{ margin: 0 }}>Registered items</h2>
          <input
            className="catalog-search"
            placeholder="Search item, brand, color…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="product-cards">
          {visible.map((p) => (
            <article key={p.id} className="product-card">
              <div className="product-card-top">
                <div>
                  <h3>{p.name}</h3>
                </div>
                <span className="unit-badge">{p.unit}</span>
              </div>
              <dl className="product-meta">
                <div>
                  <dt>Sell price</dt>
                  <dd>{p.sellingPrice} ETB</dd>
                </div>
                <div>
                  <dt>Serial</dt>
                  <dd>{p.barcode || "—"}</dd>
                </div>
                <div>
                  <dt>Color</dt>
                  <dd>{p.color || "—"}</dd>
                </div>
              </dl>
              <div className="row-actions">
                <button type="button" className="btn secondary" onClick={() => startEdit(p)}>Edit</button>
                <button type="button" className="btn danger" onClick={() => remove(p)}>Delete</button>
              </div>
            </article>
          ))}
        </div>

        <div className="table-wrap product-table">
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Unit</th>
                <th>Sell price</th>
                <th>Brand</th>
                <th>Serial</th>
                <th>Color</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((p) => (
                <tr key={p.id}>
                  <td><strong>{p.name}</strong></td>
                  <td>{p.unit}</td>
                  <td>{p.sellingPrice}</td>
                  <td>{p.brand || "—"}</td>
                  <td>{p.barcode || "—"}</td>
                  <td>{p.color || "—"}</td>
                  <td className="row-actions">
                    <button type="button" className="btn secondary" onClick={() => startEdit(p)}>Edit</button>
                    <button type="button" className="btn danger" onClick={() => remove(p)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {visible.length === 0 ? <p className="empty muted">No items match this search.</p> : null}
      </section>
    </div>
  );
}
