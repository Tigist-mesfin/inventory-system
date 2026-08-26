const { Op } = require("sequelize");
const paginate = require("../../shared/helpers/pagination.helper");
const decimal = require("../../shared/helpers/decimal.helper");
const tenant = require("../../shared/helpers/tenant.helper");
const models = require("../../database/models");
const expenseRepository = require("./expense.repository");

const { Sale, StockTransaction } = models;

const emptyToNull = (value) => {
  if (value === undefined) return undefined;
  if (value === "") return null;
  return value;
};

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfDay = (value) => {
  const date = new Date(value);
  if (String(value).length <= 10) date.setHours(23, 59, 59, 999);
  return date;
};

const dateKey = (value) => new Date(value).toISOString().slice(0, 10);

const PERIOD_LABELS = {
  today: "Today",
  this_week: "This week",
  this_month: "This month",
  last_month: "Last month",
  this_year: "This year",
  custom: "Custom dates",
};

exports.resolvePeriod = (query = {}) => {
  const now = new Date();
  const period =
    query.period || (query.from || query.to ? "custom" : "this_month");
  let from;
  let to = endOfDay(now);

  if (period === "today") {
    from = startOfDay(now);
  } else if (period === "this_week") {
    from = startOfDay(now);
    from.setDate(from.getDate() - 6);
  } else if (period === "last_month") {
    from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    to = endOfDay(new Date(now.getFullYear(), now.getMonth(), 0));
  } else if (period === "this_year") {
    from = new Date(now.getFullYear(), 0, 1);
  } else if (period === "custom") {
    from = query.from
      ? startOfDay(query.from)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    to = query.to ? endOfDay(query.to) : endOfDay(now);
  } else {
    from = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  return {
    period,
    label: PERIOD_LABELS[period] || PERIOD_LABELS.this_month,
    from,
    to,
  };
};

exports.list = async (query, user) => {
  const { page, limit, offset } = paginate(query, { defaultLimit: 50, maxLimit: 200 });
  const where = expenseRepository.searchWhere({
    search: query.search,
    category: query.category,
    from: query.from ? startOfDay(query.from) : undefined,
    to: query.to ? endOfDay(query.to) : undefined,
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
    from: range.from,
    to: range.to,
  });
  tenant.applyCompany(where, user);
  const rows = await expenseRepository.findAll({ where });
  return { period: range, ...summarizeExpenses(rows) };
};

exports.incomeStatement = async (query, user) => {
  const range = exports.resolvePeriod(query);
  const saleWhere = {
    status: "COMPLETED",
    saleDate: { [Op.gte]: range.from, [Op.lte]: range.to },
  };
  tenant.applyCompany(saleWhere, user);
  tenant.applyWarehouse(saleWhere, user);

  const sales = await Sale.findAll({
    where: saleWhere,
    attributes: ["id", "totalAmount", "saleDate"],
  });

  const revenue = sales.reduce(
    (sum, sale) => decimal.addMoney(sum, sale.totalAmount),
    decimal.money(0),
  );

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
      (sum, tx) => decimal.addMoney(sum, decimal.lineTotal(tx.quantity, tx.unitCost || 0)),
      decimal.money(0),
    );
  }

  const expenseWhere = {
    expenseDate: { [Op.gte]: range.from, [Op.lte]: range.to },
  };
  tenant.applyCompany(expenseWhere, user);
  const expenses = await expenseRepository.findAll({ where: expenseWhere });
  const expenseSummary = summarizeExpenses(expenses);

  const grossProfit = decimal.subMoney(revenue, cogs);
  const operatingExpenses = expenseSummary.totals.amount;
  const netIncome = decimal.subMoney(grossProfit, operatingExpenses);

  return {
    period: range,
    sales: {
      label: "Sales",
      count: sales.length,
      amount: revenue,
    },
    cogs: {
      label: "Cost of goods sold",
      amount: cogs,
    },
    grossProfit: {
      label: "Gross profit",
      amount: grossProfit,
    },
    operatingExpenses: {
      label: "Operating expenses",
      amount: operatingExpenses,
      byCategory: expenseSummary.byCategory,
    },
    netIncome: {
      label: "Net income",
      amount: netIncome,
    },
  };
};
