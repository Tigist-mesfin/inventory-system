import { useEffect, useMemo, useState } from "react";
import { api, money } from "../../api/client";
import TradeTabs from "./TradeTabs";
import InventoryLoading from "../../components/InventoryLoading";

export default function LedgerPage() {
  const [tab, setTab] = useState("credit");
  const [ledger, setLedger] = useState({ credits: [], debits: [], creditTotal: 0, debitTotal: 0 });
  const [methods, setMethods] = useState([]);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [collect, setCollect] = useState({ customerId: "", amount: "", paymentMethod: "" });
  const [pay, setPay] = useState({ purchaseOrderId: "", amount: "", paymentMethod: "" });

  const load = async () => {
    const [l, m] = await Promise.all([
      api("/api/insights/ledger"),
      api("/api/payment-methods", { query: { status: "ACTIVE" } }),
    ]);
    const methodRows = m.data.paymentMethods || [];
    setMethods(methodRows);
    setLedger(l.data.ledger || { credits: [], debits: [], creditTotal: 0, debitTotal: 0 });
    setCollect((prev) => ({
      ...prev,
      paymentMethod: prev.paymentMethod || methodRows[0]?.name || "",
    }));
    setPay((prev) => ({
      ...prev,
      paymentMethod: prev.paymentMethod || methodRows[0]?.name || "",
    }));
  };

  useEffect(() => {
    load()
      .catch((err) => setError(err.message))
      .finally(() => setReady(true));
  }, []);

  const customersOpen = useMemo(() => {
    const map = {};
    (ledger.credits || []).forEach((row) => {
      if (!row.customerId) return;
      if (!map[row.customerId]) {
        map[row.customerId] = { id: row.customerId, name: row.partyName, remaining: 0 };
      }
      map[row.customerId].remaining += Number(row.remainingBalance || 0);
    });
    return Object.values(map);
  }, [ledger.credits]);

  const pickCustomer = (customerId) => {
    const row = customersOpen.find((c) => c.id === customerId);
    setCollect({
      customerId,
      amount: row ? Number(row.remaining).toFixed(2) : "",
      paymentMethod: collect.paymentMethod || methods[0]?.name || "",
    });
  };

  const pickPurchase = (purchaseOrderId) => {
    const row = (ledger.debits || []).find((d) => d.id === purchaseOrderId);
    setPay({
      purchaseOrderId,
      amount: row ? Number(row.remainingBalance).toFixed(2) : "",
      paymentMethod: pay.paymentMethod || row?.paymentMethod || methods[0]?.name || "",
    });
  };

  const submitCollect = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(`/api/customers/${collect.customerId}/payments`, {
        method: "POST",
        body: {
          amount: Number(collect.amount),
          method: collect.paymentMethod,
        },
      });
      setCollect({ customerId: "", amount: "", paymentMethod: methods[0]?.name || "" });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const submitPay = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(`/api/purchase-orders/${pay.purchaseOrderId}/payments`, {
        method: "POST",
        body: {
          amount: Number(pay.amount),
          paymentMethod: pay.paymentMethod,
        },
      });
      setPay({ purchaseOrderId: "", amount: "", paymentMethod: methods[0]?.name || "" });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const collectRow = async (row) => {
    const method = collect.paymentMethod || methods[0]?.name;
    if (!method) {
      setError("Add a payment method first");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api(`/api/sales/${row.id}/payments`, {
        method: "POST",
        body: { amount: Number(row.remainingBalance), paymentMethod: method },
      });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (!ready) return <InventoryLoading message="Loading inventory..." />;

  return (
    <>
      <div className="topbar">
        <div>
          <h1 style={{ margin: 0 }}>Debit & credit</h1>
          <p className="muted">
            Credit is unpaid money customers owe you. Debit is unpaid money you still owe suppliers.
          </p>
        </div>
      </div>

      <section className="grid stats" style={{ marginBottom: 16 }}>
        <article className="card stat-card">
          <span className="muted">Total unpaid (credit)</span>
          <b>{money(ledger.creditTotal)} ETB</b>
          <small>Customers still to pay</small>
        </article>
        <article className="card stat-card">
          <span className="muted">Must to pay (debit)</span>
          <b>{money(ledger.debitTotal)} ETB</b>
          <small>Supplier balances still open</small>
        </article>
      </section>

      <div className="seg" style={{ marginBottom: 16 }}>
        <button type="button" className={`btn ${tab === "credit" ? "" : "secondary"}`} onClick={() => setTab("credit")}>
          Credit
        </button>
        <button type="button" className={`btn ${tab === "debit" ? "" : "secondary"}`} onClick={() => setTab("debit")}>
          Debit
        </button>
      </div>

      {tab === "credit" ? (
        <>
          <form className="card" onSubmit={submitCollect}>
            <h3>Collect remaining payment</h3>
            <div className="grid split">
              <label className="field">
                <span>Customer</span>
                <select
                  value={collect.customerId}
                  onChange={(e) => pickCustomer(e.target.value)}
                  required
                >
                  <option value="">Select customer</option>
                  {customersOpen.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} · remaining {money(c.remaining)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Amount to collect</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={collect.amount}
                  onChange={(e) => setCollect({ ...collect, amount: e.target.value })}
                  required
                />
              </label>
              <label className="field">
                <span>Payment method</span>
                <select
                  value={collect.paymentMethod}
                  onChange={(e) => setCollect({ ...collect, paymentMethod: e.target.value })}
                  required
                >
                  {methods.map((m) => (
                    <option key={m.id} value={m.name}>{m.name}</option>
                  ))}
                </select>
              </label>
            </div>
            {error ? <p className="error" style={{ marginTop: 12 }}>{error}</p> : null}
            <button className="btn saffron" style={{ marginTop: 12 }} disabled={busy}>
              {busy ? "Saving…" : "Collect payment"}
            </button>
          </form>

          <div className="card table-wrap" style={{ marginTop: 16 }}>
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Paid</th>
                  <th>Remaining</th>
                  <th>Invoice</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {(ledger.credits || []).map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.partyName}</strong>
                      <div className="muted">{row.partyPhone}</div>
                    </td>
                    <td>{row.items || "—"}</td>
                    <td>{money(row.paidAmount)} ETB</td>
                    <td><strong>{money(row.remainingBalance)} ETB</strong></td>
                    <td>{row.document}</td>
                    <td>
                      <button type="button" className="btn saffron" disabled={busy} onClick={() => collectRow(row)}>
                        Collect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(ledger.credits || []).length === 0 ? (
              <p className="empty muted">No unpaid customer payments.</p>
            ) : null}
          </div>
        </>
      ) : (
        <>
          <form className="card" onSubmit={submitPay}>
            <h3>Pay remaining supplier balance</h3>
            <div className="grid split">
              <label className="field">
                <span>Purchase / supplier</span>
                <select
                  value={pay.purchaseOrderId}
                  onChange={(e) => pickPurchase(e.target.value)}
                  required
                >
                  <option value="">Select unpaid purchase</option>
                  {(ledger.debits || []).map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.partyName} · {row.document} · remaining {money(row.remainingBalance)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Amount to pay</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={pay.amount}
                  onChange={(e) => setPay({ ...pay, amount: e.target.value })}
                  required
                />
              </label>
              <label className="field">
                <span>Payment method</span>
                <select
                  value={pay.paymentMethod}
                  onChange={(e) => setPay({ ...pay, paymentMethod: e.target.value })}
                  required
                >
                  {methods.map((m) => (
                    <option key={m.id} value={m.name}>{m.name}</option>
                  ))}
                </select>
              </label>
            </div>
            {error ? <p className="error" style={{ marginTop: 12 }}>{error}</p> : null}
            <button className="btn saffron" style={{ marginTop: 12 }} disabled={busy}>
              {busy ? "Saving…" : "Pay supplier"}
            </button>
          </form>

          <div className="card table-wrap" style={{ marginTop: 16 }}>
            <table>
              <thead>
                <tr>
                  <th>Supplier</th>
                  <th>Items bought</th>
                  <th>Paid</th>
                  <th>Still to pay</th>
                  <th>Purchase #</th>
                </tr>
              </thead>
              <tbody>
                {(ledger.debits || []).map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.partyName}</strong>
                      <div className="muted">{row.partyPhone}</div>
                    </td>
                    <td>{row.items || "—"}</td>
                    <td>{money(row.paidAmount)} ETB</td>
                    <td><strong>{money(row.remainingBalance)} ETB</strong></td>
                    <td>{row.document}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(ledger.debits || []).length === 0 ? (
              <p className="empty muted">No unpaid supplier balances.</p>
            ) : null}
          </div>
        </>
      )}
    </>
  );
}
