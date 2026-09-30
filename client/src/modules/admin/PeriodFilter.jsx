import { useMemo, useState } from "react";

const PRESETS = [
  { id: "all", label: "All time" },
  { id: "today", label: "Today" },
  { id: "this_week", label: "This week" },
  { id: "this_month", label: "This month" },
];

function toInputDate(value) {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

/**
 * Period chips + optional custom from/to. Calls onChange({ period, from, to }).
 */
export default function PeriodFilter({ value, onChange, showCustom = true }) {
  const period = value?.period || "all";
  const [from, setFrom] = useState(value?.from || "");
  const [to, setTo] = useState(value?.to || "");

  const query = useMemo(() => {
    if (period === "custom") {
      return { period: "custom", from: from || undefined, to: to || undefined };
    }
    return { period };
  }, [period, from, to]);

  const setPeriod = (next) => {
    onChange?.({ ...query, period: next, from: next === "custom" ? from : undefined, to: next === "custom" ? to : undefined });
  };

  return (
    <div className="admin-period">
      <div className="period-chips">
        {PRESETS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`btn chip ${period === item.id ? "" : "secondary"}`}
            onClick={() => setPeriod(item.id)}
          >
            {item.label}
          </button>
        ))}
        {showCustom ? (
          <button
            type="button"
            className={`btn chip ${period === "custom" ? "" : "secondary"}`}
            onClick={() => setPeriod("custom")}
          >
            Date range
          </button>
        ) : null}
      </div>
      {showCustom && period === "custom" ? (
        <div className="admin-date-range">
          <label>
            From
            <input
              type="date"
              value={toInputDate(from)}
              onChange={(e) => {
                const next = e.target.value;
                setFrom(next);
                onChange?.({ period: "custom", from: next || undefined, to: to || undefined });
              }}
            />
          </label>
          <label>
            To
            <input
              type="date"
              value={toInputDate(to)}
              onChange={(e) => {
                const next = e.target.value;
                setTo(next);
                onChange?.({ period: "custom", from: from || undefined, to: next || undefined });
              }}
            />
          </label>
        </div>
      ) : null}
    </div>
  );
}

export function periodQuery(filters) {
  if (!filters) return {};
  if (filters.period === "custom") {
    return {
      period: "custom",
      from: filters.from || undefined,
      to: filters.to || undefined,
    };
  }
  if (!filters.period || filters.period === "all") return { period: "all" };
  return { period: filters.period };
}
