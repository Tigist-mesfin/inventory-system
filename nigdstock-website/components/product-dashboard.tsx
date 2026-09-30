export function ProductDashboard() {
  const rows = [
    { sku: "NS-1001", name: "Bottled Water 1L", qty: 420, status: "Healthy", tone: "ok" },
    { sku: "NS-2044", name: "Cooking Oil 5L", qty: 38, status: "Low", tone: "warn" },
    { sku: "NS-3180", name: "Rice 25kg", qty: 156, status: "Healthy", tone: "ok" },
    { sku: "NS-4412", name: "Soap Bar Pack", qty: 12, status: "Reorder", tone: "danger" },
  ] as const;

  return (
    <div className="relative fade-up" style={{ animationDelay: "120ms" }}>
      <div
        className="absolute -inset-4 rounded-[28px] bg-gradient-to-br from-green-100/80 via-transparent to-navy-800/10 blur-2xl"
        aria-hidden
      />
      <figure className="relative overflow-hidden rounded-[22px] border border-line bg-white shadow-[var(--shadow-lg)]">
        <figcaption className="flex items-center justify-between gap-3 border-b border-line bg-surface px-4 py-3 sm:px-5">
          <div>
            <p className="text-sm font-semibold text-navy-900">
              Inventory dashboard illustration
            </p>
            <p className="text-xs text-muted">
              Demonstration UI — sample data, not live customer records
            </p>
          </div>
          <span className="rounded-full bg-green-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-green-700">
            Demo
          </span>
        </figcaption>

        <div className="grid gap-3 border-b border-line p-4 sm:grid-cols-3 sm:p-5">
          {[
            { label: "SKUs tracked", value: "1,284" },
            { label: "On-hand units", value: "18.4k" },
            { label: "Low-stock items", value: "26" },
          ].map((metric) => (
            <div
              key={metric.label}
              className="rounded-xl border border-line bg-surface-2/70 px-3 py-3"
            >
              <p className="text-xs text-muted">{metric.label}</p>
              <p className="mt-1 font-heading text-2xl text-navy-900">
                {metric.value}
              </p>
            </div>
          ))}
        </div>

        <div className="grid gap-4 p-4 lg:grid-cols-[1.2fr_0.8fr] lg:p-5">
          <div className="overflow-hidden rounded-xl border border-line">
            <div className="border-b border-line bg-surface px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted">
              Stock levels
            </div>
            <table className="w-full text-left text-sm">
              <thead className="bg-white text-xs text-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">SKU</th>
                  <th className="px-3 py-2 font-medium">Product</th>
                  <th className="px-3 py-2 font-medium">Qty</th>
                  <th className="hidden px-3 py-2 font-medium sm:table-cell">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.sku} className="border-t border-line/80">
                    <td className="px-3 py-2.5 font-mono text-xs text-muted">
                      {row.sku}
                    </td>
                    <td className="px-3 py-2.5 text-navy-900">{row.name}</td>
                    <td className="px-3 py-2.5 font-semibold">{row.qty}</td>
                    <td className="hidden px-3 py-2.5 sm:table-cell">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          row.tone === "ok"
                            ? "bg-green-100 text-green-700"
                            : row.tone === "warn"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-red-100 text-red-700"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3">
            <div className="rounded-xl border border-line bg-surface p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Weekly stock movement
              </p>
              <div
                className="mt-3 flex h-28 items-end gap-2"
                role="img"
                aria-label="Demonstration bar chart of weekly stock movement"
              >
                {[42, 58, 36, 70, 48, 82, 64].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t-md bg-gradient-to-t from-green-700 to-green-500"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { title: "Receiving", detail: "12 POs open" },
                { title: "Transfers", detail: "3 in progress" },
                { title: "Warehouses", detail: "4 locations" },
                { title: "AI insight", detail: "8 items at risk" },
              ].map((card) => (
                <div
                  key={card.title}
                  className="rounded-xl border border-line bg-white p-3"
                >
                  <p className="text-xs text-muted">{card.title}</p>
                  <p className="mt-1 text-sm font-semibold text-navy-900">
                    {card.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </figure>
    </div>
  );
}
