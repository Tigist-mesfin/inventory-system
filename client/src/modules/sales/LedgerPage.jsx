import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, money } from "../../api/client";
import InventoryLoading from "../../components/InventoryLoading";

const normName = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const partyLabel = (row) => String(row.partyName || "").trim() || "Walk-in";

export default function LedgerPage() {
  const [tab, setTab] = useState("credit");
  const [ledger, setLedger] = useState({ credits: [], debits: [], creditTotal: 0, debitTotal: 0 });
  const [methods, setMethods] = useState([]);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [collect, setCollect] = useState({
    byName: false,
    saleId: "",
    walkInName: "",
    amount: "",
    paymentMethod: "",
  });
  const [pay, setPay] = useState({
    byName: false,
    purchaseOrderId: "",
    walkInName: "",
    amount: "",
    paymentMethod: "",
  });

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

  const debits = ledger.debits || [];

  useEffect(() => {
    load()
      .catch((err) => setError(err.message))
      .finally(() => setReady(true));
  }, []);

  const credits = ledger.credits || [];

  const partyNames = useMemo(() => {
    const map = {};
    credits.forEach((row) => {
      const name = partyLabel(row);
      const key = normName(name);
      if (!map[key]) map[key] = { name, remaining: 0 };
      map[key].remaining += Number(row.remainingBalance || 0);
    });
    return Object.values(map);
  }, [credits]);

  const findCreditsByName = (name) => {
    const key = normName(name);
    if (!key) return [];
    const exact = credits.filter((row) => normName(partyLabel(row)) === key);
    if (exact.length) {
      return exact.sort((a, b) => String(a.date).localeCompare(String(b.date)));
    }
    const soft = credits.filter((row) => {
      const label = normName(partyLabel(row));
      return label.includes(key) || key.includes(label);
    });
    return soft.sort((a, b) => String(a.date).localeCompare(String(b.date)));
  };

  const pickSale = (saleId) => {
    const row = credits.find((c) => String(c.id) === String(saleId));
    setCollect((prev) => ({
      ...prev,
      byName: false,
      saleId,
      walkInName: "",
      amount: row ? Number(row.remainingBalance).toFixed(2) : "",
      paymentMethod: prev.paymentMethod || methods[0]?.name || "",
    }));
  };

  const pickWalkInName = (name) => {
    const rows = findCreditsByName(name);
    const remaining = rows.reduce((sum, row) => sum + Number(row.remainingBalance || 0), 0);
    setCollect((prev) => ({
      ...prev,
      byName: true,
      saleId: "",
      walkInName: name,
      amount: remaining > 0 ? remaining.toFixed(2) : prev.amount,
      paymentMethod: prev.paymentMethod || methods[0]?.name || "",
    }));
  };

  const supplierNames = useMemo(() => {
    const map = {};
    debits.forEach((row) => {
      const name = partyLabel(row);
      const key = normName(name);
      if (!map[key]) map[key] = { name, remaining: 0 };
      map[key].remaining += Number(row.remainingBalance || 0);
    });
    return Object.values(map);
  }, [debits]);

  const findDebitsByName = (name) => {
    const key = normName(name);
    if (!key) return [];
    const exact = debits.filter((row) => normName(partyLabel(row)) === key);
    if (exact.length) {
      return exact.sort((a, b) => String(a.date).localeCompare(String(b.date)));
    }
    const soft = debits.filter((row) => {
      const label = normName(partyLabel(row));
      return label.includes(key) || key.includes(label);
    });
    return soft.sort((a, b) => String(a.date).localeCompare(String(b.date)));
  };

  const pickPurchase = (purchaseOrderId) => {
    const row = debits.find((d) => String(d.id) === String(purchaseOrderId));
    setPay((prev) => ({
      ...prev,
      byName: false,
      purchaseOrderId,
      walkInName: "",
      amount: row ? Number(row.remainingBalance).toFixed(2) : "",
      paymentMethod: prev.paymentMethod || row?.paymentMethod || methods[0]?.name || "",
    }));
  };

  const pickWalkInSupplier = (name) => {
    const rows = findDebitsByName(name);
    const remaining = rows.reduce((sum, row) => sum + Number(row.remainingBalance || 0), 0);
    setPay((prev) => ({
      ...prev,
      byName: true,
      purchaseOrderId: "",
      walkInName: name,
      amount: remaining > 0 ? remaining.toFixed(2) : prev.amount,
      paymentMethod: prev.paymentMethod || methods[0]?.name || "",
    }));
  };

  const allocatePayments = async (rows, amount, method, kind) => {
    if (!rows.length) {
      throw new Error(
        kind === "debit"
          ? "No unpaid debit matches that name. Select the purchase from the list."
          : "No unpaid credit matches that name. Select the invoice from the list, or use Collect on the row.",
      );
    }
    let left = Number(amount);
    for (const row of rows) {
      if (left <= 0) break;
      const payAmt = Math.min(left, Number(row.remainingBalance || 0));
      if (payAmt <= 0) continue;
      if (kind === "debit") {
        await api(`/api/purchase-orders/${row.id}/payments`, {
          method: "POST",
          body: { amount: payAmt, paymentMethod: method },
        });
      } else {
        await api(`/api/sales/${row.id}/payments`, {
          method: "POST",
          body: { amount: payAmt, paymentMethod: method },
        });
      }
      left = Number((left - payAmt).toFixed(2));
    }
    if (left > 0.009) {
      throw new Error(`Only part of the amount could be applied. ${money(left)} ETB left unmatched.`);
    }
  };

  const submitCollect = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const method = collect.paymentMethod || methods[0]?.name;
      const amount = Number(collect.amount);
      if (!method) throw new Error("Add a payment method first");
      if (!(amount > 0)) throw new Error("Enter an amount to collect");

      if (collect.byName || (!collect.saleId && collect.walkInName)) {
        const name = String(collect.walkInName || "").trim();
        if (!name) throw new Error("Enter a customer name, or select an unpaid invoice");
        await allocatePayments(findCreditsByName(name), amount, method, "credit");
      } else {
        if (!collect.saleId) throw new Error("Select an unpaid invoice, or type a customer name");
        const row = credits.find((c) => String(c.id) === String(collect.saleId));
        if (!row) throw new Error("Select an unpaid invoice");
        await api(`/api/sales/${row.id}/payments`, {
          method: "POST",
          body: { amount, paymentMethod: method },
        });
      }

      setCollect({
        byName: false,
        saleId: "",
        walkInName: "",
        amount: "",
        paymentMethod: methods[0]?.name || "",
      });
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
      const method = pay.paymentMethod || methods[0]?.name;
      const amount = Number(pay.amount);
      if (!method) throw new Error("Add a payment method first");
      if (!(amount > 0)) throw new Error("Enter an amount to pay");

      if (pay.byName || (!pay.purchaseOrderId && pay.walkInName)) {
        const name = String(pay.walkInName || "").trim();
        if (!name) throw new Error("Enter a supplier name, or select an unpaid purchase");
        await allocatePayments(findDebitsByName(name), amount, method, "debit");
      } else {
        if (!pay.purchaseOrderId) throw new Error("Select an unpaid purchase, or type a supplier name");
        await api(`/api/purchase-orders/${pay.purchaseOrderId}/payments`, {
          method: "POST",
          body: { amount, paymentMethod: method },
        });
      }

      setPay({
        byName: false,
        purchaseOrderId: "",
        walkInName: "",
        amount: "",
        paymentMethod: methods[0]?.name || "",
      });
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

  const noCredits = credits.length === 0;
  const noDebits = debits.length === 0;

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

      <div className="pay-checks" style={{ marginBottom: 16 }}>
        <label className="check-option">
          <input
            type="checkbox"
            checked={tab === "credit"}
            onChange={() => setTab("credit")}
          />
          <span>Credit</span>
        </label>
        <label className="check-option">
          <input
            type="checkbox"
            checked={tab === "debit"}
            onChange={() => setTab("debit")}
          />
          <span>Debit</span>
        </label>
      </div>

      {tab === "credit" ? (
        <>
          <form className="card" onSubmit={submitCollect}>
            <h3>Collect remaining payment</h3>
            <div className="grid split">
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <div className="pay-checks" style={{ marginTop: 0, marginBottom: 8 }}>
                  <label className="check-option">
                    <input
                      type="checkbox"
                      checked={!collect.byName}
                      onChange={() =>
                        setCollect((prev) => ({
                          ...prev,
                          byName: false,
                          walkInName: "",
                        }))
                      }
                    />
                    <span>From unpaid list</span>
                  </label>
                  <label className="check-option">
                    <input
                      type="checkbox"
                      checked={collect.byName || noCredits}
                      onChange={() =>
                        setCollect((prev) => ({
                          ...prev,
                          byName: true,
                          saleId: "",
                        }))
                      }
                    />
                    <span>Type customer name</span>
                  </label>
                </div>

                {!collect.byName && !noCredits ? (
                  <label className="field" style={{ margin: 0 }}>
                    <span className="party-select-label-row">
                      <span>Unpaid invoice</span>
                      <Link className="party-register-link" to="/customers?type=CUSTOMER">
                        Register customer
                      </Link>
                    </span>
                    <select
                      value={collect.saleId}
                      onChange={(e) => pickSale(e.target.value)}
                      required
                    >
                      <option value="">Select unpaid invoice</option>
                      {credits.map((row) => (
                        <option key={row.id} value={row.id}>
                          {partyLabel(row)}
                          {row.customerId ? "" : " (unregistered)"}
                          {" · "}
                          {row.document}
                          {" · remaining "}
                          {money(row.remainingBalance)}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <label className="field" style={{ margin: 0 }}>
                    <span className="party-select-label-row">
                      <span>Customer name</span>
                      <Link className="party-register-link" to="/customers?type=CUSTOMER">
                        Register customer
                      </Link>
                    </span>
                    <input
                      list="ledger-party-names"
                      value={collect.walkInName}
                      onChange={(e) => pickWalkInName(e.target.value)}
                      placeholder="Type name from the unpaid list"
                      required
                    />
                    <datalist id="ledger-party-names">
                      {partyNames.map((p) => (
                        <option key={p.name} value={p.name}>
                          remaining {money(p.remaining)}
                        </option>
                      ))}
                    </datalist>
                    {noCredits ? (
                      <small className="muted">
                        No unpaid credit yet. Register a customer, or collect after a credit sale.
                      </small>
                    ) : (
                      <small className="muted">
                        Works for registered and unregistered names shown in the table below.
                      </small>
                    )}
                  </label>
                )}
              </div>

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
            <button className="btn saffron" style={{ marginTop: 12 }} disabled={busy || noCredits}>
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
                {credits.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong>{partyLabel(row)}</strong>
                      {!row.customerId ? (
                        <div className="muted">Unregistered</div>
                      ) : null}
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
            {noCredits ? (
              <p className="empty muted">No unpaid customer payments.</p>
            ) : null}
          </div>
        </>
      ) : (
        <>
          <form className="card" onSubmit={submitPay}>
            <h3>Pay remaining supplier balance</h3>
            <div className="grid split">
              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <div className="pay-checks" style={{ marginTop: 0, marginBottom: 8 }}>
                  <label className="check-option">
                    <input
                      type="checkbox"
                      checked={!pay.byName}
                      onChange={() =>
                        setPay((prev) => ({
                          ...prev,
                          byName: false,
                          walkInName: "",
                        }))
                      }
                    />
                    <span>From unpaid list</span>
                  </label>
                  <label className="check-option">
                    <input
                      type="checkbox"
                      checked={pay.byName || noDebits}
                      onChange={() =>
                        setPay((prev) => ({
                          ...prev,
                          byName: true,
                          purchaseOrderId: "",
                        }))
                      }
                    />
                    <span>Walk-in supplier</span>
                  </label>
                </div>

                {!pay.byName && !noDebits ? (
                  <label className="field" style={{ margin: 0 }}>
                    <span className="party-select-label-row">
                      <span>Unpaid purchase</span>
                      <Link className="party-register-link" to="/customers?type=SUPPLIER">
                        Register supplier
                      </Link>
                    </span>
                    <select
                      value={pay.purchaseOrderId}
                      onChange={(e) => pickPurchase(e.target.value)}
                      required
                    >
                      <option value="">Select unpaid purchase</option>
                      {debits.map((row) => (
                        <option key={row.id} value={row.id}>
                          {partyLabel(row)}
                          {row.isWalkIn ? " (walk-in)" : ""}
                          {" · "}
                          {row.document}
                          {" · remaining "}
                          {money(row.remainingBalance)}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <label className="field" style={{ margin: 0 }}>
                    <span className="party-select-label-row">
                      <span>Supplier name</span>
                      <Link className="party-register-link" to="/customers?type=SUPPLIER">
                        Register supplier
                      </Link>
                    </span>
                    <input
                      list="ledger-supplier-names"
                      value={pay.walkInName}
                      onChange={(e) => pickWalkInSupplier(e.target.value)}
                      placeholder="Type walk-in supplier name"
                      required
                    />
                    <datalist id="ledger-supplier-names">
                      {supplierNames.map((p) => (
                        <option key={p.name} value={p.name}>
                          remaining {money(p.remaining)}
                        </option>
                      ))}
                    </datalist>
                    {noDebits ? (
                      <small className="muted">
                        No unpaid debit yet. Register a supplier, or pay after a credit purchase.
                      </small>
                    ) : (
                      <small className="muted">
                        Type the walk-in supplier name from the unpaid list below.
                      </small>
                    )}
                  </label>
                )}
              </div>
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
            <button className="btn saffron" style={{ marginTop: 12 }} disabled={busy || noDebits}>
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
                {debits.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong>{partyLabel(row)}</strong>
                      {row.isWalkIn ? <div className="muted">Walk-in</div> : null}
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
            {noDebits ? (
              <p className="empty muted">No unpaid supplier balances.</p>
            ) : null}
          </div>
        </>
      )}
    </>
  );
}
