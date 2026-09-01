import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, money, qty, resolveAppName } from "../../api/client";
import { can, isOwner } from "../../auth/access";
import { useAuth } from "../../auth/AuthContext";
import ItemRecordActions from "../catalog/ItemRecordActions";
import InventoryLoading from "../../components/InventoryLoading";

const STATUS_LABEL = {
  NOT_DELIVERED: "Not delivered",
  ON_LOADING: "On loading",
  DELIVERED: "Delivered",
};

const pad = (n) => String(n).padStart(2, "0");
const isoLocal = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const csvEscape = (value) => {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
};

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const dateText = (value) => {
  if (!value) return "—";
  return String(value).slice(0, 10);
};

const variantText = (product) =>
  [product?.brand, product?.size, product?.color].filter(Boolean).join(" · ");

const storeQty = (row, warehouseId) => {
  if (!warehouseId) return Number(row.quantity || 0);
  const store = (row.stores || []).find((item) => item.warehouseId === warehouseId);
  return Number(store?.quantity || 0);
};

const storesText = (row) =>
  (row.stores || [])
    .map((store) => `${store.name}: ${qty(store.quantity)}`)
    .join("; ") || "—";

const searchHay = (row) =>
  [
    row.product?.name,
    row.productName,
    row.product?.sku,
    row.product?.brand,
    row.product?.size,
    row.product?.color,
    row.party,
    row.document,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

const rankItems = (list, search) => {
  const term = String(search || "").trim().toLowerCase();
  if (!term) return list;
  const starts = [];
  const contains = [];
  for (const row of list) {
    const name = String(row.product?.name || row.productName || "").toLowerCase();
    const sku = String(row.product?.sku || "").toLowerCase();
    const hay = searchHay(row);
    if (name.startsWith(term) || sku.startsWith(term)) starts.push(row);
    else if (hay.includes(term)) contains.push(row);
  }
  return [...starts, ...contains];
};

function AdjustStockModal({
  row,
  warehouses,
  defaultWarehouseId,
  undeliveredQty,
  busy,
  onClose,
  onSave,
}) {
  const [warehouseId, setWarehouseId] = useState(
    defaultWarehouseId || warehouses[0]?.id || "",
  );
  const current = storeQty(row, warehouseId);
  const [quantity, setQuantity] = useState(String(current));
  const nextQty = Number(quantity);
  const diff = Number.isFinite(nextQty) ? nextQty - current : 0;

  useEffect(() => {
    setQuantity(String(storeQty(row, warehouseId)));
  }, [row, warehouseId]);

  const submit = (event) => {
    event.preventDefault();
    if (!warehouseId) return;
    onSave({
      productId: row.productId,
      warehouseId,
      quantity: Number(quantity),
    });
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <h2>Adjust stock</h2>
        <p className="muted">
          {row.product?.name}
          {row.product?.unit ? ` · ${row.product.unit}` : ""}
        </p>
        <form onSubmit={submit}>
          <label className="field">
            <span>Store</span>
            <select
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              disabled={busy}
              required
            >
              {warehouses.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>In this store now</span>
            <input value={`${qty(current)} ${row.product?.unit || ""}`.trim()} readOnly />
          </label>
          <label className="field">
            <span>New quantity</span>
            <input
              type="number"
              min="0"
              step="0.001"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              disabled={busy}
              required
              autoFocus
            />
          </label>
          <p className="muted" style={{ margin: 0 }}>
            Undelivered purchases: {qty(undeliveredQty)} {row.product?.unit || ""}
            {diff > 0
              ? ` · raising by ${qty(diff)} delivers that amount from purchases`
              : diff < 0
                ? ` · lowering by ${qty(Math.abs(diff))} corrects store count`
                : ""}
          </p>
          <div className="modal-actions">
            <button type="button" className="btn secondary" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="btn" disabled={busy || !warehouseId}>
              {busy ? "Saving…" : "Save quantity"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function StockPage() {
  const { user } = useAuth();
  const owner = isOwner(user);
  const [items, setItems] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [undelivered, setUndelivered] = useState([]);
  const [stockView, setStockView] = useState("delivered");
  const [showAllColumns, setShowAllColumns] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(min-width: 900px)").matches,
  );
  const [deliverWarehouseId, setDeliverWarehouseId] = useState("");
  const [rowWarehouse, setRowWarehouse] = useState({});
  const [adjusting, setAdjusting] = useState(null);
  const [overview, setOverview] = useState({
    stores: [],
    lowStockCount: 0,
    undeliveredCount: 0,
  });
  const [filters, setFilters] = useState({
    search: "",
    warehouseId: "",
    from: "",
    to: "",
    lowStock: false,
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  const loadOverview = async () => {
    const res = await api("/api/inventory/overview");
    setOverview(res.data.overview);
  };

  const loadUndelivered = async () => {
    const res = await api("/api/inventory/undelivered");
    const rows = res.data.items || [];
    setUndelivered(rows);
    return rows;
  };

  const load = async () => {
    try {
      setError("");
      const query = {
        warehouseId: filters.warehouseId,
        from: filters.from,
        to: filters.to,
        limit: 500,
      };
      if (filters.lowStock) query.lowStock = true;
      const res = await api("/api/inventory/by-item", { query });
      setItems(res.data.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setReady(true);
    }
  };

  const refresh = async () => {
    await Promise.all([load(), loadOverview(), loadUndelivered().catch(() => [])]);
  };

  useEffect(() => {
    api("/api/warehouses")
      .then((res) => {
        const rows = res.data.warehouses || [];
        setWarehouses(rows);
        setDeliverWarehouseId((prev) => prev || rows[0]?.id || "");
      })
      .catch(() => {});
    loadOverview().catch((err) => setError(err.message));
    loadUndelivered().catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [filters.warehouseId, filters.from, filters.to, filters.lowStock]);

  const undeliveredByProduct = useMemo(() => {
    const map = new Map();
    for (const row of undelivered) {
      const leftover = Number(row.remainingQuantity ?? row.quantity ?? 0);
      const prev = map.get(row.productId) || {
        productId: row.productId,
        productName: row.productName,
        unit: row.unit,
        remaining: 0,
      };
      prev.remaining += leftover;
      map.set(row.productId, prev);
    }
    return map;
  }, [undelivered]);

  const visibleDelivered = useMemo(
    () => rankItems(items, filters.search),
    [items, filters.search],
  );

  const visibleUndelivered = useMemo(
    () =>
      rankItems(
        undelivered.map((row) => ({
          ...row,
          product: { name: row.productName, sku: "", unit: row.unit },
        })),
        filters.search,
      ),
    [undelivered, filters.search],
  );

  const totals = useMemo(() => {
    if (stockView === "undelivered") {
      const units = visibleUndelivered.reduce(
        (sum, row) => sum + Number(row.remainingQuantity ?? row.quantity ?? 0),
        0,
      );
      return { count: visibleUndelivered.length, units };
    }
    const units = visibleDelivered.reduce((sum, row) => sum + Number(row.quantity || 0), 0);
    return { count: visibleDelivered.length, units };
  }, [stockView, visibleDelivered, visibleUndelivered]);

  const storeCards = warehouses.length
    ? warehouses.map((store) => {
        const stats = overview.stores.find((row) => row.warehouseId === store.id) || {
          itemCount: 0,
          quantity: 0,
        };
        return {
          id: store.id,
          name: store.name,
          itemCount: stats.itemCount,
          quantity: stats.quantity,
        };
      })
    : overview.stores;

  const defaultAdjustWarehouse = (row) =>
    filters.warehouseId ||
    row.stores?.[0]?.warehouseId ||
    deliverWarehouseId ||
    warehouses[0]?.id ||
    "";

  const deliverAll = async () => {
    if (!deliverWarehouseId) return;
    setBusy(true);
    setError("");
    try {
      await api("/api/purchase-orders/deliver-all", {
        method: "POST",
        body: { warehouseId: deliverWarehouseId },
      });
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const deliverOne = async (row) => {
    const warehouseId = rowWarehouse[row.id] || deliverWarehouseId;
    if (!warehouseId) {
      setError("Choose a store to deliver into");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api(`/api/purchase-orders/items/${row.id}`, {
        method: "PATCH",
        body: {
          deliveryStatus: "DELIVERED",
          warehouseId,
          quantity: Number(row.quantity),
        },
      });
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const saveAdjust = async (payload) => {
    setBusy(true);
    setError("");
    try {
      await api("/api/inventory/adjust-on-hand", {
        method: "POST",
        body: payload,
      });
      setAdjusting(null);
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const exportRows = useMemo(() => {
    if (stockView === "undelivered") {
      return visibleUndelivered.map((row) => {
        const base = {
          Item: row.productName || "",
          Remaining: Number(row.remainingQuantity ?? row.quantity ?? 0),
        };
        if (!showAllColumns) return base;
        return {
          ...base,
          Ordered: Number(row.quantity || 0),
          Unit: row.unit || "",
          "Bought from": row.party || "",
          Date: dateText(row.date),
          Status: STATUS_LABEL[row.deliveryStatus] || row.deliveryStatus || "",
        };
      });
    }
    return visibleDelivered.map((row) => {
      const base = {
        Item: row.product?.name || "",
        Quantity: storeQty(row, filters.warehouseId),
        "Selling Price": Number(row.product?.sellingPrice || 0),
        "Last Purchase Price": Number(row.product?.purchasePrice || 0),
      };
      if (!showAllColumns) return base;
      return {
        ...base,
        Unit: row.product?.unit || "",
        Stores: storesText(row),
        Delivered: dateText(row.lastDeliveredAt),
      };
    });
  }, [
    stockView,
    visibleDelivered,
    visibleUndelivered,
    showAllColumns,
    filters.warehouseId,
  ]);

  const exportExcel = () => {
    if (!exportRows.length) {
      setError(
        stockView === "undelivered"
          ? "No undelivered rows to export"
          : "No stock to export for this filter",
      );
      return;
    }
    setError("");
    const headers = Object.keys(exportRows[0]);
    const body = [
      headers.join(","),
      ...exportRows.map((row) => headers.map((key) => csvEscape(row[key])).join(",")),
    ].join("\r\n");
    const stamp = isoLocal(new Date());
    downloadBlob(
      new Blob([`\uFEFF${body}`], { type: "text/csv;charset=utf-8" }),
      `stock-export-${stamp}.csv`,
    );
  };

  const exportPdf = async () => {
    if (!exportRows.length) {
      setError(
        stockView === "undelivered"
          ? "No undelivered rows to export"
          : "No stock to export for this filter",
      );
      return;
    }
    setError("");
    const escapeHtml = (value) =>
      String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    const appName = escapeHtml(await resolveAppName());
    const headers = Object.keys(exportRows[0]);
    const head = headers.map((key) => `<th>${escapeHtml(key)}</th>`).join("");
    const moneyKeys = new Set(["Selling Price", "Last Purchase Price"]);
    const body = exportRows
      .map(
        (row) =>
          `<tr>${headers
            .map((key) => {
              const value = row[key];
              const text =
                typeof value === "number"
                  ? Number(value).toLocaleString(undefined, {
                      minimumFractionDigits: moneyKeys.has(key) ? 2 : 0,
                      maximumFractionDigits: moneyKeys.has(key) ? 2 : 3,
                    })
                  : String(value ?? "");
              return `<td>${escapeHtml(text)}</td>`;
            })
            .join("")}</tr>`,
      )
      .join("");
    const title =
      stockView === "undelivered" ? "Undelivered purchases" : "Live stock";
    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)} export</title>
  <style>
    @page { margin: 16mm 12mm 18mm; }
    body { font-family: Arial, sans-serif; color: #122; margin: 0; padding: 0 0 36px; }
    h1 { font-size: 18px; margin: 0 0 8px; }
    p { margin: 0 0 16px; color: #456; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th, td { border: 1px solid #ccd; padding: 6px 8px; text-align: left; }
    th { background: #f3f6f6; }
    .app-name {
      margin-top: 28px;
      padding-top: 12px;
      border-top: 1px solid #ccd;
      text-align: center;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.04em;
    }
    @media print {
      .app-name {
        position: fixed;
        left: 0;
        right: 0;
        bottom: 0;
        margin: 0;
        padding: 8px 0;
        border-top: 1px solid #ccd;
        background: #fff;
      }
    }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p>${totals.count} item${totals.count === 1 ? "" : "s"} · ${escapeHtml(qty(totals.units))} units</p>
  <table>
    <thead><tr>${head}</tr></thead>
    <tbody>${body}</tbody>
  </table>
  <footer class="app-name">${appName}</footer>
</body>
</html>`;
    const popup = window.open("", "_blank", "width=1000,height=720");
    if (!popup) {
      setError("Allow pop-ups to export PDF");
      return;
    }
    popup.document.open();
    popup.document.write(html);
    popup.document.close();
    popup.focus();
    const triggerPrint = () => {
      try {
        popup.print();
      } catch {
        setError("Could not open the print dialog");
      }
    };
    if (popup.document.readyState === "complete") {
      window.setTimeout(triggerPrint, 200);
    } else {
      popup.onload = () => window.setTimeout(triggerPrint, 200);
    }
  };

  if (!ready) return <InventoryLoading message="Loading inventory..." />;

  return (
    <>
      <div className="topbar">
        <div>
          <h1 style={{ margin: 0 }}>Live stock</h1>
          <p className="muted">On-hand quantity by item, after purchases are delivered to a store.</p>
        </div>
      </div>

      <section className="purchase-analytics stock-analytics">
        {storeCards.map((store) => (
          <button
            type="button"
            key={store.id || store.warehouseId}
            className={`analytics-card is-action${
              stockView === "delivered" && filters.warehouseId === (store.id || store.warehouseId)
                ? " is-selected"
                : ""
            }`}
            onClick={() => {
              setStockView("delivered");
              setFilters((prev) => ({
                ...prev,
                warehouseId:
                  prev.warehouseId === (store.id || store.warehouseId)
                    ? ""
                    : store.id || store.warehouseId,
              }));
            }}
          >
            <span>{store.name}</span>
            <b>{store.itemCount}</b>
            <small>{qty(store.quantity)} in store</small>
          </button>
        ))}
        <button
          type="button"
          className={`analytics-card is-action${
            stockView === "delivered" && filters.lowStock ? " is-selected" : ""
          }`}
          onClick={() => {
            setStockView("delivered");
            setFilters((prev) => ({ ...prev, lowStock: !prev.lowStock }));
          }}
        >
          <span>Low stock</span>
          <b>{overview.lowStockCount}</b>
          <small>
            {overview.lowStockCount === 1
              ? "1 item is low"
              : `${overview.lowStockCount} items are low`}
          </small>
        </button>
        <button
          type="button"
          className={`analytics-card is-action${stockView === "undelivered" ? " is-selected" : ""}`}
          onClick={() => setStockView("undelivered")}
        >
          <span>Undelivered</span>
          <b>{overview.undeliveredCount}</b>
          <small>Bought, not yet in a store</small>
        </button>
      </section>

      <div className="catalog-list-head">
        <div className="stock-view-tabs">
          <button
            type="button"
            className={`btn ${stockView === "delivered" ? "" : "secondary"}`}
            onClick={() => setStockView("delivered")}
          >
            Delivered to store
          </button>
          <button
            type="button"
            className={`btn ${stockView === "undelivered" ? "" : "secondary"}`}
            onClick={() => setStockView("undelivered")}
          >
            Undelivered
          </button>
        </div>
        <button
          type="button"
          className={`btn ${showAllColumns ? "secondary" : ""}`}
          onClick={() => setShowAllColumns((next) => !next)}
        >
          {showAllColumns ? "Basic columns" : "Show all columns"}
        </button>
      </div>

      <div className="toolbar purchase-filters">
        <label className="field stock-search">
          <span>Search item</span>
          <input
            type="search"
            placeholder="Type to find an item"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            autoComplete="off"
          />
        </label>
        {stockView === "delivered" ? (
          <>
            <label className="field">
              <span>Warehouse</span>
              <select
                value={filters.warehouseId}
                onChange={(e) => setFilters({ ...filters, warehouseId: e.target.value })}
              >
                <option value="">All stores</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Delivered from</span>
              <input
                type="date"
                value={filters.from}
                onChange={(e) => setFilters({ ...filters, from: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Delivered to</span>
              <input
                type="date"
                value={filters.to}
                onChange={(e) => setFilters({ ...filters, to: e.target.value })}
              />
            </label>
            <button
              type="button"
              className={`btn ${filters.lowStock ? "" : "secondary"}`}
              onClick={() => setFilters({ ...filters, lowStock: !filters.lowStock })}
            >
              Low stock only
            </button>
          </>
        ) : owner ? (
          <>
            <label className="field">
              <span>Deliver into</span>
              <select
                value={deliverWarehouseId}
                onChange={(e) => setDeliverWarehouseId(e.target.value)}
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="btn"
              disabled={busy || !deliverWarehouseId || undelivered.length === 0}
              onClick={deliverAll}
            >
              {busy ? "Updating…" : `Deliver all (${undelivered.length})`}
            </button>
          </>
        ) : null}
      </div>

      {error ? <p className="error">{error}</p> : null}

      <p className="totals-box" style={{ marginBottom: 12 }}>
        <strong>{totals.count}</strong> item{totals.count === 1 ? "" : "s"} ·{" "}
        <strong>{qty(totals.units)}</strong>{" "}
        {stockView === "undelivered" ? "units not yet in store" : "units on hand"}
      </p>

      <div className="sale-table-actions no-print" style={{ marginBottom: 12 }}>
        <button type="button" className="btn chip secondary" onClick={exportExcel}>
          Export to Excel
        </button>
        <button type="button" className="btn chip secondary" onClick={exportPdf}>
          Export to PDF
        </button>
        {can(user, "inventory", "UPDATE") || can(user, "inventory", "CREATE") ? (
          <Link className="btn chip secondary" to="/stock/import">
            Import from Excel
          </Link>
        ) : null}
      </div>

      {stockView === "delivered" ? (
        <div className={`stock-list ${showAllColumns ? "is-expanded" : "is-compact"}`}>
          <div className="stock-rows">
            {visibleDelivered.map((row) => (
              <article
                key={row.productId}
                className={`stock-row${row.isLowStock ? " is-low" : ""}`}
              >
                <div className="stock-row-main">
                  <div className="stock-row-name">{row.product?.name}</div>
                  <div className="muted">
                    {qty(storeQty(row, filters.warehouseId))} {row.product?.unit}
                    {row.isLowStock ? " · Low" : ""}
                    {" · "}
                    Sell {money(row.product?.sellingPrice)} · Buy{" "}
                    {money(row.product?.purchasePrice)}
                  </div>
                </div>
                <span className="stock-row-qty">
                  {qty(storeQty(row, filters.warehouseId))}
                </span>
                <button
                  type="button"
                  className="btn"
                  disabled={busy}
                  onClick={() => setAdjusting(row)}
                >
                  Adjust
                </button>
              </article>
            ))}
          </div>

          <div className="card table-wrap product-table stock-table">
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Quantity</th>
                  <th>Selling Price</th>
                  <th>Last Purchase Price</th>
                  {showAllColumns ? <th>Unit</th> : null}
                  {showAllColumns ? <th>In each store</th> : null}
                  {showAllColumns ? <th>Delivered</th> : null}
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {visibleDelivered.map((row) => (
                  <tr key={row.productId} className={row.isLowStock ? "low-stock" : undefined}>
                    <td>
                      <strong>{row.product?.name}</strong>
                      {row.isLowStock ? (
                        <span className="pill danger" style={{ marginLeft: 8 }}>
                          Low
                        </span>
                      ) : null}
                      <div className="muted">
                        {row.product?.sku}
                        {variantText(row.product) ? ` · ${variantText(row.product)}` : ""}
                      </div>
                    </td>
                    <td>{qty(storeQty(row, filters.warehouseId))}</td>
                    <td>{money(row.product?.sellingPrice)} ETB</td>
                    <td>{money(row.product?.purchasePrice)} ETB</td>
                    {showAllColumns ? <td>{row.product?.unit}</td> : null}
                    {showAllColumns ? (
                      <td style={{ whiteSpace: "normal" }}>
                        {(row.stores || []).length === 0 ? (
                          "—"
                        ) : (
                          (row.stores || []).map((store) => (
                            <div key={store.warehouseId}>
                              {store.name}: {qty(store.quantity)} {row.product?.unit}
                            </div>
                          ))
                        )}
                      </td>
                    ) : null}
                    {showAllColumns ? <td>{dateText(row.lastDeliveredAt)}</td> : null}
                    <td>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="btn"
                          disabled={busy}
                          onClick={() => setAdjusting(row)}
                        >
                          Adjust
                        </button>
                        {showAllColumns ? (
                          <ItemRecordActions
                            productId={row.productId}
                            productName={row.product?.name}
                            onDeleted={() => {
                              refresh();
                            }}
                            onError={setError}
                          />
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {visibleDelivered.length === 0 ? (
            <p className="empty muted">
              {filters.search.trim()
                ? "No items match that search."
                : "No delivered stock for this filter."}
            </p>
          ) : null}
        </div>
      ) : (
        <div className={`stock-list ${showAllColumns ? "is-expanded" : "is-compact"}`}>
          {!owner ? (
            <p className="muted">Only the company owner can mark purchases delivered.</p>
          ) : null}
          <div className="stock-rows">
            {visibleUndelivered.map((row) => (
              <article key={row.id} className="stock-row">
                <div className="stock-row-main">
                  <div className="stock-row-name">{row.productName}</div>
                  <div className="muted">
                    {qty(row.remainingQuantity ?? row.quantity)} {row.unit}
                    {showAllColumns ? ` · ${row.party}` : ""}
                  </div>
                </div>
                <span className="stock-row-qty">
                  {qty(row.remainingQuantity ?? row.quantity)}
                </span>
                {owner ? (
                  <button
                    type="button"
                    className="btn"
                    disabled={busy || !deliverWarehouseId}
                    onClick={() => deliverOne(row)}
                  >
                    Deliver
                  </button>
                ) : null}
              </article>
            ))}
          </div>

          <div className="card table-wrap product-table stock-table">
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Remaining</th>
                  {showAllColumns ? <th>Ordered</th> : null}
                  {showAllColumns ? <th>Bought from</th> : null}
                  {showAllColumns ? <th>Date</th> : null}
                  {showAllColumns ? <th>Status</th> : null}
                  {owner ? <th>Deliver into</th> : null}
                  {owner ? <th></th> : null}
                </tr>
              </thead>
              <tbody>
                {visibleUndelivered.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.productName}</strong>
                      <div className="muted">{row.document || ""}</div>
                    </td>
                    <td>
                      {qty(row.remainingQuantity ?? row.quantity)} {row.unit}
                    </td>
                    {showAllColumns ? (
                      <td>{qty(row.quantity)} {row.unit}</td>
                    ) : null}
                    {showAllColumns ? <td>{row.party || "—"}</td> : null}
                    {showAllColumns ? <td>{dateText(row.date)}</td> : null}
                    {showAllColumns ? (
                      <td>{STATUS_LABEL[row.deliveryStatus] || row.deliveryStatus}</td>
                    ) : null}
                    {owner ? (
                      <td>
                        <select
                          value={rowWarehouse[row.id] || deliverWarehouseId}
                          onChange={(e) =>
                            setRowWarehouse((prev) => ({ ...prev, [row.id]: e.target.value }))
                          }
                          disabled={busy}
                        >
                          {warehouses.map((w) => (
                            <option key={w.id} value={w.id}>{w.name}</option>
                          ))}
                        </select>
                      </td>
                    ) : null}
                    {owner ? (
                      <td>
                        <button
                          type="button"
                          className="btn"
                          disabled={busy || !(rowWarehouse[row.id] || deliverWarehouseId)}
                          onClick={() => deliverOne(row)}
                        >
                          Deliver
                        </button>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {visibleUndelivered.length === 0 ? (
            <p className="empty muted">
              {filters.search.trim()
                ? "No items match that search."
                : "No undelivered purchases."}
            </p>
          ) : null}
        </div>
      )}

      {adjusting ? (
        <AdjustStockModal
          row={adjusting}
          warehouses={warehouses}
          defaultWarehouseId={defaultAdjustWarehouse(adjusting)}
          undeliveredQty={undeliveredByProduct.get(adjusting.productId)?.remaining || 0}
          busy={busy}
          onClose={() => !busy && setAdjusting(null)}
          onSave={saveAdjust}
        />
      ) : null}
    </>
  );
}
