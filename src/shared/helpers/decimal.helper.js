const QTY_SCALE = 3;
const MONEY_SCALE = 2;

const toScaled = (value, scale) => {
  if (value === null || value === undefined || value === "") return 0n;
  const str = String(value).trim();
  if (!str || str === ".") return 0n;
  const negative = str.startsWith("-");
  const raw = negative ? str.slice(1) : str;
  const [intRaw, fracRaw = ""] = raw.split(".");
  const intPart = intRaw.replace(/\D/g, "") || "0";
  const extra = fracRaw.replace(/\D/g, "");
  const kept = extra.slice(0, scale);
  const nextDigit = Number(extra[scale] || 0);
  let n =
    BigInt(intPart) * 10n ** BigInt(scale) +
    BigInt(kept.padEnd(scale, "0") || "0");
  if (nextDigit >= 5) n += 1n;
  return negative ? -n : n;
};

const fromScaled = (n, scale) => {
  const negative = n < 0n;
  const abs = negative ? -n : n;
  const base = 10n ** BigInt(scale);
  const intPart = abs / base;
  const frac = (abs % base).toString().padStart(scale, "0");
  const formatted = `${intPart}.${frac}`;
  return negative ? `-${formatted}` : formatted;
};

const qty = (value) => fromScaled(toScaled(value, QTY_SCALE), QTY_SCALE);
const money = (value) => fromScaled(toScaled(value, MONEY_SCALE), MONEY_SCALE);

const addQty = (a, b) =>
  fromScaled(toScaled(a, QTY_SCALE) + toScaled(b, QTY_SCALE), QTY_SCALE);
const subQty = (a, b) =>
  fromScaled(toScaled(a, QTY_SCALE) - toScaled(b, QTY_SCALE), QTY_SCALE);
const addMoney = (a, b) =>
  fromScaled(toScaled(a, MONEY_SCALE) + toScaled(b, MONEY_SCALE), MONEY_SCALE);
const subMoney = (a, b) =>
  fromScaled(toScaled(a, MONEY_SCALE) - toScaled(b, MONEY_SCALE), MONEY_SCALE);

const cmpQty = (a, b) => {
  const diff = toScaled(a, QTY_SCALE) - toScaled(b, QTY_SCALE);
  if (diff < 0n) return -1;
  if (diff > 0n) return 1;
  return 0;
};

const cmpMoney = (a, b) => {
  const diff = toScaled(a, MONEY_SCALE) - toScaled(b, MONEY_SCALE);
  if (diff < 0n) return -1;
  if (diff > 0n) return 1;
  return 0;
};

const isZeroQty = (value) => toScaled(value, QTY_SCALE) === 0n;
const isNegativeQty = (value) => toScaled(value, QTY_SCALE) < 0n;
const isZeroMoney = (value) => toScaled(value, MONEY_SCALE) === 0n;

const available = (quantity, reservedQuantity = 0) =>
  subQty(quantity, reservedQuantity);

const lineTotal = (quantity, unitPrice, discountAmount = 0) => {
  const qtyMilli = toScaled(quantity, QTY_SCALE);
  const priceCents = toScaled(unitPrice, MONEY_SCALE);
  const productCents = (qtyMilli * priceCents) / 10n ** BigInt(QTY_SCALE);
  const discounted = productCents - toScaled(discountAmount, MONEY_SCALE);
  if (discounted < 0n) return money(0);
  return fromScaled(discounted, MONEY_SCALE);
};

const weightedAverage = (onHandQty, onHandCost, inboundQty, inboundCost) => {
  const onHand = toScaled(onHandQty, QTY_SCALE);
  if (onHand === 0n) return money(inboundCost);
  const inbound = toScaled(inboundQty, QTY_SCALE);
  const totalQty = onHand + inbound;
  if (totalQty === 0n) return money(onHandCost);
  const onHandCents = toScaled(onHandCost, MONEY_SCALE);
  const inboundCents = toScaled(inboundCost, MONEY_SCALE);
  const avg = (onHand * onHandCents + inbound * inboundCents) / totalQty;
  return fromScaled(avg, MONEY_SCALE);
};

const percentOf = (amount, percent) => {
  const cents = toScaled(amount, MONEY_SCALE);
  const pct = toScaled(percent, MONEY_SCALE);
  const denom = 100n * 10n ** BigInt(MONEY_SCALE);
  const result = (cents * pct + denom / 2n) / denom;
  return fromScaled(result, MONEY_SCALE);
};

module.exports = {
  QTY_SCALE,
  MONEY_SCALE,
  qty,
  money,
  addQty,
  subQty,
  addMoney,
  subMoney,
  cmpQty,
  cmpMoney,
  isZeroQty,
  isNegativeQty,
  isZeroMoney,
  available,
  lineTotal,
  weightedAverage,
  percentOf,
};
