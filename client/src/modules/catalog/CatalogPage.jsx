import { useEffect, useMemo, useRef, useState } from "react";
import { api, money } from "../../api/client";
import ItemRecordActions from "./ItemRecordActions";
import InventoryLoading from "../../components/InventoryLoading";

const emptyForm = () => ({
  name: "",
  unit: "PCS",
  brand: "",
  serialNumber: "",
  color: "",
  sellingPrice: "",
});

const UNITS = [
  { name: "Piece", code: "PCS" },
  { name: "Unit", code: "UNIT" },
  { name: "Kilogram", code: "KG" },
  { name: "Gram", code: "G" },
  { name: "Ton", code: "TON" },
  { name: "Liter", code: "L" },
  { name: "Milliliter", code: "ML" },
  { name: "Meter", code: "M" },
  { name: "Centimeter", code: "CM" },
  { name: "Kilometer", code: "KM" },
  { name: "Square Meter", code: "M2" },
  { name: "Cubic Meter", code: "M3" },
  { name: "Box", code: "BOX" },
  { name: "Carton", code: "CTN" },
  { name: "Pack", code: "PACK" },
  { name: "Pair", code: "PAIR" },
  { name: "Set", code: "SET" },
  { name: "Dozen", code: "DOZ" },
  { name: "Roll", code: "ROLL" },
  { name: "Bag", code: "BAG" },
  { name: "Bottle", code: "BTL" },
  { name: "Can", code: "CAN" },
  { name: "Bucket", code: "BUCKET" },
  { name: "Sack", code: "SACK" },
];

const LEGACY_UNITS = {
  LITER: "L",
  LITRE: "L",
  PIECE: "PCS",
  DOZEN: "DOZ",
  BOTTLE: "BTL",
  CARTON: "CTN",
};

const unitLabel = (code) => {
  const match = UNITS.find((u) => u.code === code);
  return match ? `${match.name} (${match.code})` : code || "—";
};

const normalizeUnit = (value) => {
  const raw = String(value || "PCS").trim();
  if (!raw) return "PCS";
  const mapped = LEGACY_UNITS[raw.toUpperCase()];
  if (mapped) return mapped;
  const found = UNITS.find(
    (u) =>
      u.code.toLowerCase() === raw.toLowerCase() ||
      u.name.toLowerCase() === raw.toLowerCase(),
  );
  return found?.code || raw.toUpperCase();
};

const rankUnits = (units, query) => {
  const needle = String(query || "").trim().toLowerCase();
  if (!needle) return units;
  const starts = [];
  const contains = [];
  const rest = [];
  for (const unit of units) {
    const name = unit.name.toLowerCase();
    const code = unit.code.toLowerCase();
    if (name.startsWith(needle) || code.startsWith(needle)) starts.push(unit);
    else if (name.includes(needle) || code.includes(needle)) contains.push(unit);
    else rest.push(unit);
  }
  return [...starts, ...contains, ...rest];
};

function UnitSelect({ value, onChange }) {
  const wrapRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = UNITS.find((u) => u.code === value);
  const options = useMemo(() => {
    const list = UNITS.slice();
    if (value && !list.some((u) => u.code === value)) {
      list.unshift({ name: value, code: value });
    }
    return rankUnits(list, query);
  }, [query, value]);

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

  const choose = (code) => {
    onChange(code);
    setOpen(false);
    setQuery("");
  };

  return (
    <div className="unit-select" ref={wrapRef}>
      <button
        type="button"
        className="unit-select-trigger"
        onClick={() => setOpen((next) => !next)}
      >
        {selected ? `${selected.name} (${selected.code})` : unitLabel(value)}
      </button>
      {open ? (
        <div className="unit-select-menu">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (options[0]) choose(options[0].code);
              }
              if (e.key === "Escape") {
                setOpen(false);
                setQuery("");
              }
            }}
            placeholder="Type d for Dozen…"
          />
          <ul>
            {options.map((unit) => (
              <li key={unit.code}>
                <button
                  type="button"
                  className={unit.code === value ? "is-selected" : ""}
                  onClick={() => choose(unit.code)}
                >
                  {unit.name} ({unit.code})
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export default function CatalogPage() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [ready, setReady] = useState(false);
  const [showAllColumns, setShowAllColumns] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(min-width: 900px)").matches,
  );

  const load = () =>
    api("/api/products", { query: { limit: 100 } }).then((res) => setProducts(res.data.products || []));

  useEffect(() => {
    load()
      .catch((err) => setError(err.message))
      .finally(() => setReady(true));
  }, []);

  const reset = () => {
    setEditingId(null);
    setForm(emptyForm());
    setFormOpen(false);
  };

  const openForm = () => {
    setError("");
    setFormOpen(true);
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
      unit: normalizeUnit(product.unit),
      brand: product.brand || "",
      serialNumber: product.barcode || "",
      color: product.color || "",
      sellingPrice: product.sellingPrice ?? "",
    });
    setFormOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const afterDelete = (product) => {
    if (editingId === product.id) reset();
    load().catch((err) => setError(err.message));
  };

  const visible = products.filter((p) => {
    const hay = `${p.name} ${p.brand || ""} ${p.color || ""} ${p.barcode || ""}`.toLowerCase();
    return hay.includes(query.toLowerCase());
  });

  if (!ready) return <InventoryLoading message="Loading inventory..." />;

  return (
    <div className="catalog-page">
      <div className="topbar">
        <div>
          <h1 style={{ margin: 0 }}>Item registration</h1>
          <p className="muted">Registered items first. Open the form only when you need to add one.</p>
        </div>
        {formOpen ? (
          <button type="button" className="btn secondary" onClick={reset}>
            Close form
          </button>
        ) : (
          <button type="button" className="btn success catalog-register-btn" onClick={openForm}>
            Register item
          </button>
        )}
      </div>

      {formOpen ? (
        <form className="card catalog-form" onSubmit={submit}>
          <div className="catalog-form-head">
            <h2 style={{ margin: 0 }}>{editingId ? "Edit item" : "New item"}</h2>
            {editingId ? (
              <button type="button" className="btn secondary" onClick={reset}>
                Cancel edit
              </button>
            ) : null}
          </div>
          <div className="catalog-fields">
            <label className="field">
              <span>Item name</span>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </label>
            <label className="field">
              <span>Unit</span>
              <UnitSelect value={form.unit} onChange={(unit) => setForm({ ...form, unit })} />
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
              <input
                value={form.brand}
                onChange={(e) => setForm({ ...form, brand: e.target.value })}
                placeholder="e.g. FreshFarm"
              />
            </label>
            <label className="field">
              <span>Serial number <em>(optional)</em></span>
              <input
                value={form.serialNumber}
                onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
                placeholder="Optional serial / code"
              />
            </label>
            <label className="field">
              <span>Color <em>(optional)</em></span>
              <input
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                placeholder="e.g. Red"
              />
            </label>
          </div>
          {error ? <p className="error">{error}</p> : null}
          <button className="btn success catalog-submit" disabled={busy}>
            {busy ? "Saving…" : editingId ? "Save changes" : "Register item"}
          </button>
        </form>
      ) : null}

      <section className="card catalog-list">
        <div className="catalog-list-head">
          <h2 style={{ margin: 0 }}>Registered items</h2>
          <div className="catalog-list-tools">
            <input
              className="catalog-search"
              placeholder="Search item, brand, color…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button
              type="button"
              className={`btn ${showAllColumns ? "secondary" : "ghost"}`}
              onClick={() => setShowAllColumns((next) => !next)}
            >
              {showAllColumns ? "Minimize columns" : "Show all columns"}
            </button>
          </div>
        </div>

        <div className={`product-cards ${showAllColumns ? "is-expanded" : "is-compact"}`}>
          {visible.map((p) => (
            <article key={p.id} className="product-card">
              <div className="product-card-top">
                <div>
                  <h3>{p.name}</h3>
                  <p className="product-price">{money(p.sellingPrice)} ETB</p>
                </div>
              </div>
              {showAllColumns ? (
                <dl className="product-meta">
                  <div>
                    <dt>Unit</dt>
                    <dd>{unitLabel(normalizeUnit(p.unit))}</dd>
                  </div>
                  <div>
                    <dt>Brand</dt>
                    <dd>{p.brand || "—"}</dd>
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
              ) : null}
              <div className="row-actions">
                <ItemRecordActions
                  productId={p.id}
                  productName={p.name}
                  showEdit
                  onEdit={() => startEdit(p)}
                  onDeleted={() => afterDelete(p)}
                  onError={setError}
                />
              </div>
            </article>
          ))}
        </div>

        <div className={`table-wrap product-table ${showAllColumns ? "is-expanded" : "is-compact"}`}>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Sell price</th>
                {showAllColumns ? (
                  <>
                    <th>Unit</th>
                    <th>Brand</th>
                    <th>Serial</th>
                    <th>Color</th>
                  </>
                ) : null}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((p) => (
                <tr key={p.id}>
                  <td><strong>{p.name}</strong></td>
                  <td>{money(p.sellingPrice)} ETB</td>
                  {showAllColumns ? (
                    <>
                      <td>{unitLabel(normalizeUnit(p.unit))}</td>
                      <td>{p.brand || "—"}</td>
                      <td>{p.barcode || "—"}</td>
                      <td>{p.color || "—"}</td>
                    </>
                  ) : null}
                  <td className="row-actions">
                    <ItemRecordActions
                      productId={p.id}
                      productName={p.name}
                      showEdit
                      onEdit={() => startEdit(p)}
                      onDeleted={() => afterDelete(p)}
                      onError={setError}
                    />
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
