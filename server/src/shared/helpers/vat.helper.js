const decimal = require("./decimal.helper");
const env = require("../../config/env");

const DEFAULT_RATE = 15;

const rate = () => {
  const n = Number(env.VAT_RATE);
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_RATE;
};

const vatOf = (amount) => decimal.percentOf(amount, rate());

const withVat = (amount) => decimal.addMoney(amount, vatOf(amount));

const apply = (subtotal, discountAmount = 0) => {
  const discount = decimal.money(discountAmount || 0);
  const taxable =
    decimal.cmpMoney(discount, subtotal) >= 0
      ? decimal.money(0)
      : decimal.subMoney(subtotal, discount);
  const taxAmount = vatOf(taxable);
  return {
    vatRate: rate(),
    taxableAmount: taxable,
    taxAmount,
    discountAmount: discount,
    totalAmount: decimal.addMoney(taxable, taxAmount),
  };
};

const decorateLine = (totalPrice) => {
  const net = decimal.money(totalPrice || 0);
  const vatAmount = vatOf(net);
  return {
    vatRate: rate(),
    vatAmount,
    totalWithVat: decimal.addMoney(net, vatAmount),
  };
};

module.exports = {
  rate,
  vatOf,
  withVat,
  apply,
  decorateLine,
};
