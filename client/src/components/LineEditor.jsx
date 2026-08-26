import { money, qty } from "../api/client";

export const emptyLine = () => ({ productId: "", quantity: "", unitPrice: "" });

export const lineAmount = (line) =>
  Number(line.quantity || 0) * Number(line.unitPrice || 0);

export default function LineEditor({
  products,
  stockByProduct = {},
  showStock = true,
  lines,
  onChange,
  priceKey = "purchasePrice",
  lockPrice = false,
}) {
  const update = (index, patch) => {
    const next = lines.map((line, i) => (i === index ? { ...line, ...patch } : line));
    onChange(next);
  };

  const pickProduct = (index, productId) => {
    const product = products.find((p) => p.id === productId);
    update(index, {
      productId,
      unitPrice: product ? Number(product[priceKey] || 0) : "",
    });
  };

  return (
    <div className="line-stack">
      {lines.map((line, index) => {
        const product = products.find((p) => p.id === line.productId);
        const unit = product?.unit || "unit";
        const onHand = stockByProduct[line.productId];
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
              <select
                value={line.productId}
                onChange={(e) => pickProduct(index, e.target.value)}
                required
              >
                <option value="">Select item</option>
                {products.map((p) => {
                  const stock = stockByProduct[p.id];
                  const stockText =
                    stock == null ? "" : ` — ${qty(stock)} ${p.unit || "unit"} in store`;
                  return (
                    <option key={p.id} value={p.id}>
                      {p.name}{stockText}
                    </option>
                  );
                })}
              </select>
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
                  onChange={(e) => update(index, { quantity: e.target.value })}
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
              </span>
            </div>
          </div>
        );
      })}
      <button type="button" className="btn secondary" onClick={() => onChange([...lines, emptyLine()])}>
        Add another item
      </button>
    </div>
  );
}
