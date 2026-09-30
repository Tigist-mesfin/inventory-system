const decimal = require("../../shared/helpers/decimal.helper");

exports.grossProfit = (revenue, cogs) =>
  decimal.subMoney(revenue || 0, cogs || 0);

exports.marginPct = (profit, revenue) => {
  if (decimal.isZeroMoney(revenue)) return null;
  const pct =
    (Number(decimal.money(profit)) / Number(decimal.money(revenue))) * 100;
  if (!Number.isFinite(pct)) return null;
  return pct.toFixed(2);
};

exports.percentChange = (current, previous) => {
  if (decimal.isZeroMoney(previous)) {
    if (decimal.isZeroMoney(current)) return "0.00";
    return null;
  }
  const delta = decimal.subMoney(current, previous);
  return exports.marginPct(delta, previous);
};

exports.daysRemaining = (onHand, avgDaily) => {
  const daily = Number(avgDaily || 0);
  const qty = Number(onHand || 0);
  if (!(daily > 0)) return null;
  return Math.floor(qty / daily);
};

exports.recommendedQty = (
  avgDaily,
  daysCover = 21,
  onHand = 0,
  reorderQuantity = 0,
) => {
  const need = Math.max(
    0,
    Number(avgDaily || 0) * Number(daysCover || 21) - Number(onHand || 0),
  );
  const reorder = Number(reorderQuantity || 0);
  if (reorder > 0 && need > 0) return Math.max(need, reorder);
  return Number(need.toFixed(3));
};
