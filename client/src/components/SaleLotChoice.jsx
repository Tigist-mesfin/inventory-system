import { useEffect, useMemo, useState } from "react";
import { api, qty } from "../api/client";

const dateText = (value) => {
  if (!value) return "—";
  return String(value).slice(0, 10);
};

export default function SaleLotChoice({
  warehouseId,
  productId,
  productName,
  quantity,
  unit,
  fifo = true,
  picks = {},
  onFifoChange,
  onPicksChange,
}) {
  const [lots, setLots] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (fifo || !warehouseId || !productId) {
      setLots([]);
      return undefined;
    }
    let cancelled = false;
    api("/api/inventory/lots", { query: { productId, warehouseId, quantity } })
      .then((res) => {
        if (cancelled) return;
        setLots(res.data.batches || []);
        setError("");
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [fifo, warehouseId, productId, quantity]);

  const recent = useMemo(
    () =>
      [...lots]
        .sort((a, b) => String(b.purchaseDate || "").localeCompare(String(a.purchaseDate || "")))
        .slice(0, 5),
    [lots],
  );

  const selectedQty = Object.values(picks).reduce(
    (sum, value) => sum + Number(value || 0),
    0,
  );
  const needed = Number(quantity || 0);

  if (!productId) return null;

  return (
    <div className="sale-lot-choice">
      <label className="check-option">
        <input
          type="checkbox"
          checked={fifo}
          onChange={(e) => onFifoChange(e.target.checked)}
        />
        Use FIFO (oldest purchase first)
      </label>
      {fifo ? (
        <p className="muted" style={{ margin: "6px 0 0" }}>
          This item will sell from the oldest purchase in this store.
        </p>
      ) : (
        <>
          <p className="muted" style={{ margin: "8px 0 8px" }}>
            Recent 5 purchases in this store. Choose the lot this sale should take from.
          </p>
          {error ? <p className="error">{error}</p> : null}
          {recent.length === 0 ? (
            <p className="muted">No purchase lots in this store yet.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th></th>
                    <th>Item</th>
                    <th>Qty left</th>
                    <th>Purchase date</th>
                    <th>Sell qty</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((batch) => (
                    <tr key={batch.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={Number(picks[batch.id] || 0) > 0}
                          onChange={(e) => {
                            const next = { ...picks };
                            if (e.target.checked) {
                              const left = Math.max(0, needed - selectedQty);
                              const take = Math.min(
                                Number(batch.remainingQuantity || 0),
                                left || Number(batch.remainingQuantity || 0),
                              );
                              next[batch.id] = take || 1;
                            } else {
                              delete next[batch.id];
                            }
                            onPicksChange(next);
                          }}
                        />
                      </td>
                      <td>{productName}</td>
                      <td>
                        {qty(batch.remainingQuantity)} {unit}
                      </td>
                      <td>{dateText(batch.purchaseDate)}</td>
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
          <p className={Number(selectedQty.toFixed(3)) === Number(needed.toFixed(3)) ? "muted" : "error"}>
            Selected {qty(selectedQty)} of {qty(needed)} {unit}
          </p>
        </>
      )}
    </div>
  );
}
