import { useEffect, useState } from "react";
import { api, money } from "../../api/client";
import InventoryLoading from "../../components/InventoryLoading";

export default function InsightsPage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api("/api/insights/dashboard").then((res) => setData(res.data.dashboard));
  }, []);

  if (!data) return <InventoryLoading message="Loading inventory..." />;

  return (
    <>
      <h1>Salespeople & follow-up</h1>
      <p className="muted">Who sold what, who hasn’t bought, and which SKUs need a discount.</p>
      <section className="card">
        <h3>Salesperson performance</h3>
        {data.salespersonPerformance.map((row) => (
          <div key={row.user?.id || row.userId} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0" }}>
            <strong>{row.user?.fullName || "Unknown"}</strong>
            <span>{row.invoiceCount} invoices · {money(row.totalAmount)}</span>
          </div>
        ))}
      </section>
      <section className="card" style={{ marginTop: 16 }}>
        <h3>Quiet customers</h3>
        {data.followUpCustomers.map((row) => (
          <div key={row.id} style={{ padding: "8px 0" }}>
            <strong>{row.name}</strong>
            <div className="muted">{row.phone} · {row.businessName}</div>
            {row.phone ? (
              <a className="btn secondary" href={`https://wa.me/${row.phone.replace(/\D/g, "")}?text=${encodeURIComponent("Just checking in — need stock this week?")}`} target="_blank" rel="noreferrer">
                Remind on WhatsApp
              </a>
            ) : null}
          </div>
        ))}
      </section>
    </>
  );
}
