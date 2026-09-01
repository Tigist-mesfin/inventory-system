import { useState } from "react";
import { Link } from "react-router-dom";
import { api, downloadAuthenticated } from "../../api/client";

const SAMPLE_COLUMNS = [
  { name: "Date", note: "Purchase date. Empty = today." },
  { name: "Item name", note: "Needed to save a row. Creates the item if it is new." },
  { name: "Quantity", note: "Empty = 1." },
  { name: "Unit", note: "Empty = PCS." },
  { name: "Unit price", note: "Empty uses Amount, or Cost with VAT, or 0." },
  { name: "Amount", note: "Optional. Used if unit price is empty." },
  { name: "Cost with VAT", note: "Optional. Used if unit price and amount are empty." },
  { name: "Bought from", note: "Supplier or walk-in name. Empty = Imported." },
  { name: "Staff", note: "Optional note only." },
  { name: "Paid", note: "Empty = 0." },
  { name: "Unpaid", note: "Optional. Calculated automatically." },
  { name: "Method", note: "Payment method. Empty = your first method." },
  { name: "Status", note: "Not delivered, On loading, or Delivered. Empty = not delivered." },
];

export default function PurchaseImportPage() {
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const downloadSample = async () => {
    setError("");
    try {
      await downloadAuthenticated(
        "/api/purchase-orders/import-template",
        "purchase-import-sample.xlsx",
      );
    } catch (err) {
      setError(err.message);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!file) {
      setError("Choose an Excel file first");
      return;
    }
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await api("/api/purchase-orders/import", {
        method: "POST",
        formData,
      });
      setResult(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="purchase-import-page">
      <div className="topbar">
        <h1 style={{ margin: 0 }}>Import purchases</h1>
        <Link className="btn" to="/buy">
          Back to purchases
        </Link>
      </div>

      <section className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Sample Excel</h3>
        <p className="muted">
          Download the sample, fill the rows in Excel, then upload it. Every column is optional except that a row needs an item name to be saved.
        </p>
        <button type="button" className="btn" onClick={downloadSample}>
          Download sample Excel
        </button>
        <div className="table-wrap" style={{ marginTop: 16 }}>
          <table>
            <thead>
              <tr>
                <th>Column</th>
                <th>If left empty</th>
              </tr>
            </thead>
            <tbody>
              {SAMPLE_COLUMNS.map((column) => (
                <tr key={column.name}>
                  <td><strong>{column.name}</strong></td>
                  <td>{column.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <form className="card" onSubmit={submit}>
        <h3 style={{ marginTop: 0 }}>Upload Excel</h3>
        <label className="field">
          <span>Excel file (.xlsx, .xls, or .csv)</span>
          <input
            type="file"
            accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
          />
        </label>
        {error ? <p className="error">{error}</p> : null}
        <button className="btn" style={{ marginTop: 16 }} disabled={busy}>
          {busy ? "Importing…" : "Import purchases"}
        </button>
      </form>

      {result ? (
        <section className="card" style={{ marginTop: 16 }}>
          <h3 style={{ marginTop: 0 }}>Import result</h3>
          <p>
            Saved <strong>{result.importedCount}</strong>
            {" · "}
            Skipped <strong>{result.skippedCount}</strong>
          </p>
          {result.imported?.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Row</th>
                    <th>Item</th>
                    <th>Purchase</th>
                  </tr>
                </thead>
                <tbody>
                  {result.imported.map((row) => (
                    <tr key={`${row.rowNumber}-${row.orderNumber}`}>
                      <td>{row.rowNumber}</td>
                      <td>{row.itemName}</td>
                      <td>{row.orderNumber}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {result.skipped?.length ? (
            <div className="table-wrap" style={{ marginTop: 12 }}>
              <table>
                <thead>
                  <tr>
                    <th>Row</th>
                    <th>Why it was skipped</th>
                  </tr>
                </thead>
                <tbody>
                  {result.skipped.map((row) => (
                    <tr key={`skip-${row.rowNumber}-${row.reason}`}>
                      <td>{row.rowNumber}</td>
                      <td>{row.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
