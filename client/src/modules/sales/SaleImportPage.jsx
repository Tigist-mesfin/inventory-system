import { useState } from "react";
import { Link } from "react-router-dom";
import { api, downloadAuthenticated } from "../../api/client";

const SAMPLE_COLUMNS = [
  { name: "Date", note: "Sale date. Empty = today." },
  { name: "Item name", note: "Required. Must match an existing catalog item." },
  { name: "Quantity", note: "Empty = 1." },
  { name: "Unit price", note: "Selling price. Or use Cost with VAT." },
  { name: "Cost with VAT", note: "Optional. Used if unit price is empty." },
  { name: "Customer", note: "Registered customer name or walk-in. Empty = walk-in." },
  { name: "Payment method", note: "Empty = your first payment method." },
  { name: "Paid amount", note: "Empty = fully paid." },
  { name: "Remaining", note: "Optional. Used if paid amount is empty." },
];

export default function SaleImportPage() {
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const downloadSample = async () => {
    setError("");
    try {
      await downloadAuthenticated(
        "/api/sales/import-template",
        "sale-import-sample.xlsx",
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
      const response = await api("/api/sales/import", {
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
        <h1 style={{ margin: 0 }}>Import sales</h1>
        <Link className="btn" to="/sell">
          Back to sales
        </Link>
      </div>

      <section className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Empty sample Excel</h3>
        <p className="muted">
          Download the empty sample, fill the rows in Excel, then upload it. Item name is required and the item must already exist with stock in a store.
        </p>
        <button type="button" className="btn" onClick={downloadSample}>
          Download empty sample Excel
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
          {busy ? "Importing…" : "Import sales"}
        </button>
      </form>

      {result ? (
        <section className="card" style={{ marginTop: 16 }}>
          <h3 style={{ marginTop: 0 }}>Import result</h3>
          <p>
            Saved <strong>{result.importedCount}</strong>
            {result.skippedCount != null ? (
              <> · skipped <strong>{result.skippedCount}</strong></>
            ) : null}
          </p>
          {(result.imported || []).length ? (
            <div className="table-wrap" style={{ marginTop: 12 }}>
              <table>
                <thead>
                  <tr>
                    <th>Row</th>
                    <th>Invoice</th>
                    <th>Item</th>
                  </tr>
                </thead>
                <tbody>
                  {result.imported.map((row) => (
                    <tr key={`${row.rowNumber}-${row.invoiceNumber || row.id}`}>
                      <td>{row.rowNumber}</td>
                      <td>{row.invoiceNumber || "—"}</td>
                      <td>{row.itemName || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {(result.skipped || []).length ? (
            <div className="table-wrap" style={{ marginTop: 12 }}>
              <table>
                <thead>
                  <tr>
                    <th>Row</th>
                    <th>Reason</th>
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
          <Link className="btn saffron" style={{ marginTop: 16 }} to="/sell">
            Open sales list
          </Link>
        </section>
      ) : null}
    </div>
  );
}
