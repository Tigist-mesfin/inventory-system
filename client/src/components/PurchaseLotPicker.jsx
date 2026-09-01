import { useEffect, useMemo, useState } from "react";
import { api, money, qty } from "../api/client";

const STATUS_LABEL = {
  NOT_DELIVERED: "Not delivered",
  ON_LOADING: "On loading",
  DELIVERED: "Delivered",
};

const dateText = (value) => {
  if (!value) return "—";
  return String(value).slice(0, 10);
};

export default function PurchaseLotPicker({
  warehouseId,
  productId,
  productName,
  quantity,
  unit,
  sellingPrice,
  method = "SIMPLE",
  picks = {},
  onMethodChange,
  onPicksChange,
}) {
  const [showPurchases, setShowPurchases] = useState(false);
  const [batches, setBatches] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const manual = method === "MANUAL";

  useEffect(() => {
    if (!warehouseId || !productId) {
      setBatches([]);
      setPurchases([]);
      setPreview(null);
      return undefined;
    }
    let cancelled = false;
    const query = { productId, warehouseId };
    if (quantity) query.quantity = quantity;
    api("/api/inventory/lots", { query })
      .then((res) => {
        if (cancelled) return;
        setBatches(res.data.batches || []);
        setPurchases(res.data.purchases || []);
        setPreview(res.data.preview || null);
        setError("");
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [warehouseId, productId, quantity]);

  const selectedCost = useMemo(() => {
    if (manual) {
      return batches.reduce((sum, batch) => {
        const take = Number(picks[batch.id] || 0);
        return sum + take * Number(batch.unitCost || 0);
      }, 0);
    }
    if (preview && Number(preview.shortfall || 0) <= 0) {
      return Number(preview.totalCost || 0);
    }
    return 0;
  }, [manual, picks, batches, preview]);

  const revenue = Number(quantity || 0) * Number(sellingPrice || 0);
  const profit = revenue - selectedCost;
  const selectedQty = Object.values(picks).reduce((sum, value) => sum + Number(value || 0), 0);

  if (!productId) return null;

  return (
    <div className="lot-picker">
      <div className="lot-picker-head">
        <strong>{productName || "Item"}</strong>
        <span className="pill">{qty(quantity)} {unit}</span>
      </div>
      <p className="muted" style={{ margin: "8px 0 10px" }}>
        FIFO: the oldest delivered purchase in this store is sold first. You can leave this automatic.
      </p>
      <label className="check-option">
        <input
          type="checkbox"
          checked={manual}
          onChange={(e) => onMethodChange(e.target.checked ? "MANUAL" : "SIMPLE")}
        />
        Choose purchases myself
      </label>
      {error ? <p className="error">{error}</p> : null}

      <button
        type="button"
        className="btn ghost"
        style={{ marginTop: 10 }}
        onClick={() => setShowPurchases((v) => !v)}
      >
        {showPurchases ? "Hide purchases" : "See purchases"}
      </button>

      {showPurchases ? (
        purchases.length === 0 ? (
          <p className="muted">
            No purchase records yet. Remaining qty appears after the store keeper delivers this item.
          </p>
        ) : (
          <div className="table-wrap" style={{ marginTop: 10 }}>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Purchase #</th>
                  <th>From</th>
                  <th>Cost</th>
                  <th>Remaining</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((row) => (
                  <tr key={row.id}>
                    <td>{dateText(row.purchaseDate)}</td>
                    <td>{row.document || "—"}</td>
                    <td>{row.supplier}</td>
                    <td>{money(row.unitCost)} ETB</td>
                    <td>{qty(row.remainingQuantity)} {unit}</td>
                    <td>{STATUS_LABEL[row.deliveryStatus] || row.deliveryStatus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : null}

      {manual ? (
        <>
          <h4 style={{ margin: "14px 0 8px" }}>Pick remaining lots</h4>
          {batches.length === 0 ? (
            <p className="muted">Nothing remaining in this store. Deliver a purchase first.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th></th>
                    <th>Date</th>
                    <th>Cost</th>
                    <th>Remaining</th>
                    <th>Sell qty</th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map((batch) => (
                    <tr key={batch.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={Number(picks[batch.id] || 0) > 0}
                          onChange={(e) => {
                            const next = { ...picks };
                            if (e.target.checked) next[batch.id] = next[batch.id] || 1;
                            else delete next[batch.id];
                            onPicksChange(next);
                          }}
                        />
                      </td>
                      <td>{dateText(batch.purchaseDate)}</td>
                      <td>{money(batch.unitCost)} ETB</td>
                      <td>{qty(batch.remainingQuantity)} {unit}</td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          step="0.001"
                          max={Number(batch.remainingQuantity)}
                          value={picks[batch.id] || ""}
                          onChange={(e) =>
                            onPicksChange({ ...picks, [batch.id]: e.target.value })
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className={Number(selectedQty) === Number(quantity || 0) ? "muted" : "error"}>
            Selected {qty(selectedQty)} of {qty(quantity || 0)} {unit}
          </p>
        </>
      ) : preview && Number(preview.shortfall || 0) > 0 ? (
        <p className="error">Short by {qty(preview.shortfall)} {unit} in this store.</p>
      ) : null}

      {selectedCost > 0 ? (
        <div className="totals-box" style={{ marginTop: 10 }}>
          Cost {money(selectedCost)} ETB · Sale {money(revenue)} ETB · Profit {money(profit)} ETB
        </div>
      ) : null}
    </div>
  );
}
