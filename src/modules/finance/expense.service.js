const { Op } = require("sequelize");
const paginate = require("../../shared/helpers/pagination.helper");
const decimal = require("../../shared/helpers/decimal.helper");
const tenant = require("../../shared/helpers/tenant.helper");
const models = require("../../database/models");
const expenseRepository = require("./expense.repository");
const otherIncomeService = require("./other-income.service");

const { Sale, StockTransaction } = models;
const vat = require("../../shared/helpers/vat.helper");

const marginPct = (part, whole) => {
  if (decimal.isZeroMoney(whole)) return "0.00";
  return ((Number(part) / Number(whole)) * 100).toFixed(2);
};

const resolvedVat = (taxAmount, netAmount) => {
  if (taxAmount != null && decimal.cmpMoney(taxAmount, 0) > 0) {
    return decimal.money(taxAmount);
  }
  return vat.vatOf(netAmount);
};

const emptyToNull = (value) => {
  if (value === undefined) return undefined;
  if (value === "") return null;
  return value;
};

const pad2 = (n) => String(n).padStart(2, "0");

const localDayKey = (date = new Date()) => {
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

const calendarDayKey = (value) => {
  if (value == null || value === "") return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const iso = value.toISOString();
    if (iso.endsWith("T00:00:00.000Z")) return iso.slice(0, 10);
    return localDayKey(value);
  }
  const raw = String(value).trim();
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
};

const startOfUtcDay = (value) => {
  const key = calendarDayKey(value) || localDayKey(value);
  return new Date(`${key}T00:00:00.000Z`);
};

const startOfNextUtcDay = (value) => {
  const key = calendarDayKey(value) || localDayKey(value);
  const [year, month, day] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + 1));
};

const dateKey = (value) => calendarDayKey(value) || localDayKey(new Date(value));

const PERIOD_LABELS = {
  today: "Today",
  this_week: "This week",
  this_month: "This month",
  last_month: "Last month",
  this_year: "This year",
  custom: "Custom dates",
  all_time: "All time",
  all: "All time",
};

/** Half-open UTC day range: >= fromDay 00:00Z and < (toDay + 1) 00:00Z */
exports.resolvePeriod = (query = {}) => {
  const now = new Date();
  const period =
    query.period || (query.from || query.to ? "custom" : "this_month");
  const todayKey = localDayKey(now);
  let from;
  let to;
  let unbounded = false;

  if (period === "today") {
    from = startOfUtcDay(todayKey);
    to = startOfNextUtcDay(todayKey);
  } else if (period === "this_week") {
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
    from = startOfUtcDay(localDayKey(weekStart));
    to = startOfNextUtcDay(todayKey);
  } else if (period === "last_month") {
    const firstThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    from = startOfUtcDay(localDayKey(firstLastMonth));
    to = startOfUtcDay(localDayKey(firstThisMonth));
  } else if (period === "this_year") {
    from = startOfUtcDay(`${now.getFullYear()}-01-01`);
    to = startOfNextUtcDay(todayKey);
  } else if (period === "all_time" || period === "all") {
    unbounded = true;
    from = null;
    to = startOfNextUtcDay(todayKey);
  } else if (period === "custom") {
    from = query.from
      ? startOfUtcDay(query.from)
      : startOfUtcDay(localDayKey(new Date(now.getFullYear(), now.getMonth(), 1)));
    to = query.to ? startOfNextUtcDay(query.to) : startOfNextUtcDay(todayKey);
  } else {
    from = startOfUtcDay(localDayKey(new Date(now.getFullYear(), now.getMonth(), 1)));
    to = startOfNextUtcDay(todayKey);
  }

  return {
    period: period === "all" ? "all_time" : period,
    label: PERIOD_LABELS[period] || PERIOD_LABELS.this_month,
    from,
    to,
    toExclusive: true,
    unbounded,
  };
};

exports.list = async (query, user) => {
  const { page, limit, offset } = paginate(query, { defaultLimit: 50, maxLimit: 200 });
  const where = expenseRepository.searchWhere({
    search: query.search,
    category: query.category,
    paymentMethod: query.paymentMethod || undefined,
    from: query.from ? startOfUtcDay(query.from) : undefined,
    to: query.to ? startOfNextUtcDay(query.to) : undefined,
    toExclusive: true,
  });
  tenant.applyCompany(where, user);
  const { rows, count } = await expenseRepository.findAndCount({
    where,
    limit,
    offset,
  });
  return paginate.buildResult("expenses", rows, count, page, limit);
};

exports.getById = async (id, user) => {
  const expense = await expenseRepository.findById(id);
  tenant.assertOwned(user, expense, "Expense not found");
  return expenseRepository.toPublic(expense);
};

exports.create = async (payload, user) => {
  const expense = await expenseRepository.create({
    companyId: tenant.requireCompanyId(user),
    createdBy: user.id,
    expenseDate: payload.expenseDate,
    category: payload.category,
    description: payload.description,
    amount: decimal.money(payload.amount),
    paymentMethod: emptyToNull(payload.paymentMethod),
    notes: emptyToNull(payload.notes),
  });
  return expenseRepository.toPublic(await expenseRepository.findById(expense.id));
};

exports.update = async (id, payload, user) => {
  const expense = await expenseRepository.findById(id);
  tenant.assertOwned(user, expense, "Expense not found");
  if (payload.expenseDate !== undefined) expense.expenseDate = payload.expenseDate;
  if (payload.category !== undefined) expense.category = payload.category;
  if (payload.description !== undefined) expense.description = payload.description;
  if (payload.amount !== undefined) expense.amount = decimal.money(payload.amount);
  if (payload.paymentMethod !== undefined) {
    expense.paymentMethod = emptyToNull(payload.paymentMethod);
  }
  if (payload.notes !== undefined) expense.notes = emptyToNull(payload.notes);
  await expenseRepository.save(expense);
  return expenseRepository.toPublic(await expenseRepository.findById(expense.id));
};

exports.remove = async (id, user) => {
  const expense = await expenseRepository.findById(id);
  tenant.assertOwned(user, expense, "Expense not found");
  await expenseRepository.destroy(expense);
};

const summarizeExpenses = (rows) => {
  const byDateMap = new Map();
  const byCategoryMap = new Map();
  let total = decimal.money(0);

  for (const row of rows) {
    const amount = decimal.money(row.amount);
    total = decimal.addMoney(total, amount);

    const day = dateKey(row.expenseDate);
    const dayRow = byDateMap.get(day) || { date: day, count: 0, amount: decimal.money(0) };
    dayRow.count += 1;
    dayRow.amount = decimal.addMoney(dayRow.amount, amount);
    byDateMap.set(day, dayRow);

    const cat = row.category;
    const catRow = byCategoryMap.get(cat) || {
      category: cat,
      count: 0,
      amount: decimal.money(0),
    };
    catRow.count += 1;
    catRow.amount = decimal.addMoney(catRow.amount, amount);
    byCategoryMap.set(cat, catRow);
  }

  return {
    expenses: rows.map(expenseRepository.toPublic),
    byDate: [...byDateMap.values()].sort((a, b) => b.date.localeCompare(a.date)),
    byCategory: [...byCategoryMap.values()].sort((a, b) => a.category.localeCompare(b.category)),
    totals: { count: rows.length, amount: total },
  };
};

exports.report = async (query, user) => {
  const range = exports.resolvePeriod(query);
  const where = expenseRepository.searchWhere({
    category: query.category,
    paymentMethod: query.paymentMethod || undefined,
    from: range.from,
    to: range.to,
    toExclusive: true,
  });
  tenant.applyCompany(where, user);
  const rows = await expenseRepository.findAll({ where });
  return { period: range, ...summarizeExpenses(rows) };
};

exports.incomeStatement = async (query, user) => {
  const range = exports.resolvePeriod(query);
  const saleWhere = { status: "COMPLETED" };
  tenant.applyCompany(saleWhere, user);
  tenant.applyWarehouse(saleWhere, user);
  if (!range.unbounded && (range.from || range.to)) {
    saleWhere.saleDate = {};
    if (range.from) saleWhere.saleDate[Op.gte] = range.from;
    if (range.to) saleWhere.saleDate[Op.lt] = range.to;
  }

  const sales = await Sale.findAll({
    where: saleWhere,
    attributes: [
      "id",
      "subtotal",
      "discountAmount",
      "taxAmount",
      "totalAmount",
      "saleDate",
    ],
  });

  let salesRevenue = decimal.money(0);
  let salesDiscount = decimal.money(0);
  let salesVatCollected = decimal.money(0);
  let salesTotalWithVat = decimal.money(0);

  for (const sale of sales) {
    const net = decimal.money(sale.subtotal || sale.totalAmount || 0);
    const discount = decimal.money(sale.discountAmount || 0);
    const vatAmount = resolvedVat(sale.taxAmount, net);
    const total =
      decimal.cmpMoney(sale.totalAmount || 0, 0) > 0
        ? decimal.money(sale.totalAmount)
        : vat.withVat(net);
    salesRevenue = decimal.addMoney(salesRevenue, net);
    salesDiscount = decimal.addMoney(salesDiscount, discount);
    salesVatCollected = decimal.addMoney(salesVatCollected, vatAmount);
    salesTotalWithVat = decimal.addMoney(salesTotalWithVat, total);
  }

  let cogs = decimal.money(0);
  if (sales.length) {
    const txs = await StockTransaction.findAll({
      where: {
        type: "SALE",
        referenceType: "SALE",
        referenceId: { [Op.in]: sales.map((sale) => sale.id) },
      },
      attributes: ["quantity", "unitCost"],
    });
    cogs = txs.reduce(
      (sum, tx) =>
        decimal.addMoney(sum, decimal.lineTotal(tx.quantity, tx.unitCost || 0)),
      decimal.money(0),
    );
  }

  const expenseWhere = {};
  if (!range.unbounded && (range.from || range.to)) {
    expenseWhere.expenseDate = {};
    if (range.from) expenseWhere.expenseDate[Op.gte] = range.from;
    if (range.to) expenseWhere.expenseDate[Op.lt] = range.to;
  }
  tenant.applyCompany(expenseWhere, user);
  const expenses = await expenseRepository.findAll({ where: expenseWhere });
  const expenseSummary = summarizeExpenses(expenses);

  const otherIncomeRange = range.unbounded
    ? { from: new Date(2000, 0, 1), to: range.to, toExclusive: true }
    : range;
  const otherIncome = await otherIncomeService.totalForPeriod(
    otherIncomeRange,
    user,
  );

  const grossProfit = decimal.subMoney(salesRevenue, cogs);
  const operatingExpenses = expenseSummary.totals.amount;
  const operatingProfit = decimal.subMoney(grossProfit, operatingExpenses);
  const totalRevenue = decimal.addMoney(salesRevenue, otherIncome);
  const netIncome = decimal.addMoney(operatingProfit, otherIncome);

  return {
    period: {
      ...range,
      from: range.from || null,
      to: range.to || null,
    },
    vatRate: vat.rate(),
    notes: {
      revenueBasis:
        "Sales revenue uses completed sale subtotals (net of line discounts stored on the sale). VAT is tracked separately and is not subtracted again from net profit.",
      cogsBasis:
        "COGS uses stock_transactions unitCost snapshots for SALE postings (inventory WAC / FIFO cost at sale time), not purchase-order totals.",
      purchasesNote:
        "Inventory purchases are assets until sold; they are not treated as operating expenses on this statement.",
      otherIncomeNote:
        "Other income is shown after operating profit and is also included in Total Revenue for summary cards.",
    },
    sales: {
      label: "Sales revenue",
      count: sales.length,
      amount: salesRevenue,
      discountAmount: salesDiscount,
      vatCollected: salesVatCollected,
      totalWithVat: salesTotalWithVat,
      pctOfRevenue: marginPct(salesRevenue, totalRevenue),
    },
    cogs: {
      label: "Cost of goods sold",
      amount: cogs,
      pctOfRevenue: marginPct(cogs, salesRevenue),
    },
    grossProfit: {
      label: "Gross profit",
      amount: grossProfit,
      marginPct: marginPct(grossProfit, salesRevenue),
    },
    operatingExpenses: {
      label: "Operating expenses",
      amount: operatingExpenses,
      byCategory: expenseSummary.byCategory,
      pctOfRevenue: marginPct(operatingExpenses, salesRevenue),
    },
    operatingProfit: {
      label: "Operating profit",
      amount: operatingProfit,
      marginPct: marginPct(operatingProfit, salesRevenue),
    },
    otherIncome: {
      label: "Other income",
      amount: otherIncome,
      pctOfRevenue: marginPct(otherIncome, totalRevenue),
    },
    totalRevenue: {
      label: "Total revenue",
      amount: totalRevenue,
    },
    netIncome: {
      label: "Net income",
      amount: netIncome,
      marginPct: marginPct(netIncome, totalRevenue),
      result: decimal.cmpMoney(netIncome, 0) < 0 ? "LOSS" : "PROFIT",
    },
  };
};
