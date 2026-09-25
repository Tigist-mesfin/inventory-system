import { useEffect, useMemo, useRef, useState } from "react";
import { money, qty, VAT_RATE, vatOf, withVat } from "../api/client";

export const emptyLine = () => ({ productId: "", quantity: "", unitPrice: "" });

export const lineAmount = (line) =>
  Number(line.quantity || 0) * Number(line.unitPrice || 0);

const rankByName = (items, query, getName) => {
  const needle = String(query || "").trim().toLowerCase();
  if (!needle) return items;
  const starts = [];
  const contains = [];
  for (const item of items) {
    const name = String(getName(item) || "").toLowerCase();
    if (name.startsWith(needle)) starts.push(item);
    else if (name.includes(needle)) contains.push(item);
  }
  return [...starts, ...contains];
};

function ItemPicker({
  products,
  value,
  onChange,
  stockByProduct = {},
  showStock = true,
  inStockOnly = false,
  emptyText = "No item matches that name.",
}) {
  const wrapRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const listed = useMemo(() => {
    if (!inStockOnly) return products;
    return products.filter((p) => Number(stockByProduct[p.id] || 0) > 0);
  }, [products, stockByProduct, inStockOnly]);
  const selected = listed.find((p) => String(p.id) === String(value))
    || products.find((p) => String(p.id) === String(value));
  const options = useMemo(
    () => rankByName(listed, query, (p) => p.name),
    [listed, query],
  );

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

  const choose = (productId) => {
    onChange(String(productId));
    setOpen(false);
    setQuery("");
  };

  return (
    <div className="item-picker" ref={wrapRef}>
      <input
        className="item-picker-input"
        value={open ? query : selected?.name || ""}
        onChange={(e) => {
          setQuery(e.target.value);
          if (!open) setOpen(true);
        }}
        onFocus={() => {
          setOpen(true);
          setQuery("");
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (options[0]) choose(options[0].id);
          }
          if (e.key === "Escape") {
            setOpen(false);
            setQuery("");
          }
        }}
        placeholder={listed.length ? "Type item name…" : "No items in this store"}
        autoComplete="off"
        required={!value}
        disabled={!listed.length && !value}
      />
      {open ? (
        <div className="item-picker-menu">
          {options.length === 0 ? (
            <p className="muted" style={{ margin: 0, padding: "10px 12px" }}>
              {listed.length ? emptyText : "No items with quantity in this store."}
            </p>
          ) : (
            <ul>
              {options.map((p) => {
                const stock = stockByProduct[p.id];
                const stockText =
                  showStock && stock != null
                    ? ` — ${qty(stock)} ${p.unit || "unit"} in store`
                    : "";
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      className={String(p.id) === String(value) ? "is-selected" : ""}
                      onClick={() => choose(p.id)}
                    >
                      {p.name}{stockText}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function VatSummary({ lines, products, label = "Grand total" }) {
  const filled = lines.filter((line) => line.productId);
  const subtotal = filled.reduce((sum, line) => sum + lineAmount(line), 0);
  return (
    <div className="totals-box" style={{ marginTop: 16 }}>
      {filled.map((line, index) => {
        const product = products?.find((p) => p.id === line.productId);
        const net = lineAmount(line);
        return (
          <div key={`${line.productId}-${index}`}>
            {product?.name || "Item"}: <strong>{money(net)} ETB</strong>
            <span className="muted">
              {" "}
              + VAT {VAT_RATE}% {money(vatOf(net))} = {money(withVat(net))} ETB
            </span>
          </div>
        );
      })}
      <p>
        Subtotal: <strong>{money(subtotal)} ETB</strong>
      </p>
      <p>
        VAT {VAT_RATE}%: <strong>{money(vatOf(subtotal))} ETB</strong>
      </p>
      <p style={{ marginBottom: 0 }}>
        {label}: <strong>{money(withVat(subtotal))} ETB</strong>
      </p>
    </div>
  );
}

export default function LineEditor({
  products,
  stockByProduct = {},
  showStock = true,
  inStockOnly = false,
  emptyText,
  lines,
  onChange,
  priceKey = "purchasePrice",
  lockPrice = false,
  qtyOnly = false,
  addLabel = "Add another item",
  addClassName = "btn secondary",
  afterLine,
}) {
  const update = (index, patch) => {
    const next = lines.map((line, i) => (i === index ? { ...line, ...patch } : line));
    onChange(next);
  };

  const pickProduct = (index, productId) => {
    const product = products.find((p) => String(p.id) === String(productId));
    update(index, {
      productId: String(productId),
      unitPrice: product ? Number(product[priceKey] || 0) : "",
    });
  };

  return (
    <div className="line-stack">
      {lines.map((line, index) => {
        const product = products.find((p) => String(p.id) === String(line.productId));
        const unit = product?.unit || "unit";
        const onHand = stockByProduct[line.productId] ?? stockByProduct[String(line.productId)];
        const availableLabel =
          onHand == null ? "—" : `${qty(onHand)} ${unit}`;
        return (
          <div key={index} className="line-card">
            <div className="line-head">
              <strong>Item {index + 1}</strong>
              {lines.length > 1 ? (
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => onChange(lines.filter((_, i) => i !== index))}
                >
                  Remove
                </button>
              ) : null}
            </div>
            <label className="field">
              <span>Item</span>
              <ItemPicker
                products={products}
                value={line.productId}
                onChange={(productId) => pickProduct(index, productId)}
                stockByProduct={stockByProduct}
                showStock={showStock}
                inStockOnly={inStockOnly}
                emptyText={emptyText}
              />
            </label>
            <div className="grid line-grid">
              <label className="field">
                <span>Quantity {product ? `(${unit})` : ""}</span>
                <input
  type="number"
  min="0.001"
  step="0.001"
  max={onHand != null ? onHand : undefined}
  value={line.quantity}
  onChange={(e) => {
    e.currentTarget.setCustomValidity("");
    update(index, { quantity: e.target.value });
  }}
  onInvalid={(e) => {
    if (e.currentTarget.validity.rangeOverflow && onHand != null) {
      e.currentTarget.setCustomValidity(
        `Only ${qty(onHand)} ${unit} are available.`
      );
    }
  }}
  required
/>
                {showStock && product ? (
                  <span className="stock-hint">Available in store: {availableLabel}</span>
                ) : null}
              </label>
            <label className="field">
              <span>Unit price (ETB)</span>
              {lockPrice ? (
                <input value={line.unitPrice} readOnly />
              ) : (
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={line.unitPrice}
                  onChange={(e) => update(index, { unitPrice: e.target.value })}
                  required
                />
              )}
            </label>
            </div>
            <div className="line-foot">
              <span>
                {product ? `${product.name} total` : "Line total"}:{" "}
                <strong>{money(lineAmount(line))} ETB</strong>
                <span className="muted">
                  {" "}
                  + VAT {VAT_RATE}% {money(vatOf(lineAmount(line)))} ={" "}
                  {money(withVat(lineAmount(line)))} ETB
                </span>
              </span>
            </div>
            {typeof afterLine === "function" ? afterLine(line, index) : null}
          </div>
        );
      })}
      <button
        type="button"
        className={addClassName}
        onClick={() => onChange([...lines, emptyLine()])}
        disabled={inStockOnly && !products.some((p) => Number(stockByProduct[p.id] || 0) > 0)}
      >
        {addLabel}
      </button>
    </div>
  );
}
