const paginate = require("../../shared/helpers/pagination.helper");
const decimal = require("../../shared/helpers/decimal.helper");
const tenant = require("../../shared/helpers/tenant.helper");
const otherIncomeRepository = require("./other-income.repository");

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

const resolvePeriod = (query = {}) => {
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
  const { page, limit, offset } = paginate(query, {
    defaultLimit: 50,
    maxLimit: 200,
  });
  const where = otherIncomeRepository.searchWhere({
    search: query.search,
    paymentMethod: query.paymentMethod || undefined,
    from: query.from ? startOfDay(query.from) : undefined,
    to: query.to ? endOfDay(query.to) : undefined,
  });
  tenant.applyCompany(where, user);
  const { rows, count } = await otherIncomeRepository.findAndCount({
    where,
    limit,
    offset,
  });
  return paginate.buildResult("incomes", rows, count, page, limit);
};

exports.getById = async (id, user) => {
  const row = await otherIncomeRepository.findById(id);
  tenant.assertOwned(user, row, "Other income not found");
  return otherIncomeRepository.toPublic(row);
};

exports.create = async (payload, user) => {
  const created = await otherIncomeRepository.create({
    companyId: tenant.requireCompanyId(user),
    createdBy: user.id,
    incomeDate: payload.incomeDate,
    receivedFrom: payload.receivedFrom,
    reason: payload.reason,
    amount: decimal.money(payload.amount),
    paymentMethod: emptyToNull(payload.paymentMethod),
    notes: emptyToNull(payload.notes),
  });
  return otherIncomeRepository.toPublic(
    await otherIncomeRepository.findById(created.id),
  );
};

exports.update = async (id, payload, user) => {
  const row = await otherIncomeRepository.findById(id);
  tenant.assertOwned(user, row, "Other income not found");
  if (payload.incomeDate !== undefined) row.incomeDate = payload.incomeDate;
  if (payload.receivedFrom !== undefined) row.receivedFrom = payload.receivedFrom;
  if (payload.reason !== undefined) row.reason = payload.reason;
  if (payload.amount !== undefined) row.amount = decimal.money(payload.amount);
  if (payload.paymentMethod !== undefined) {
    row.paymentMethod = emptyToNull(payload.paymentMethod);
  }
  if (payload.notes !== undefined) row.notes = emptyToNull(payload.notes);
  await otherIncomeRepository.save(row);
  return otherIncomeRepository.toPublic(
    await otherIncomeRepository.findById(row.id),
  );
};

exports.remove = async (id, user) => {
  const row = await otherIncomeRepository.findById(id);
  tenant.assertOwned(user, row, "Other income not found");
  await otherIncomeRepository.destroy(row);
};

const summarizeIncomes = (rows) => {
  const byDateMap = new Map();
  const byMethodMap = new Map();
  let total = decimal.money(0);

  for (const row of rows) {
    const amount = decimal.money(row.amount);
    total = decimal.addMoney(total, amount);

    const day = dateKey(row.incomeDate);
    const dayRow = byDateMap.get(day) || {
      date: day,
      count: 0,
      amount: decimal.money(0),
    };
    dayRow.count += 1;
    dayRow.amount = decimal.addMoney(dayRow.amount, amount);
    byDateMap.set(day, dayRow);

    const method = row.paymentMethod || "Unspecified";
    const methodRow = byMethodMap.get(method) || {
      paymentMethod: method,
      count: 0,
      amount: decimal.money(0),
    };
    methodRow.count += 1;
    methodRow.amount = decimal.addMoney(methodRow.amount, amount);
    byMethodMap.set(method, methodRow);
  }

  return {
    incomes: rows.map(otherIncomeRepository.toPublic),
    byDate: [...byDateMap.values()].sort((a, b) => b.date.localeCompare(a.date)),
    byPaymentMethod: [...byMethodMap.values()].sort((a, b) =>
      a.paymentMethod.localeCompare(b.paymentMethod),
    ),
    totals: {
      count: rows.length,
      amount: total,
    },
  };
};

exports.report = async (query, user) => {
  const range = resolvePeriod(query);
  const where = otherIncomeRepository.searchWhere({
    paymentMethod: query.paymentMethod || undefined,
    from: range.from,
    to: range.to,
  });
  tenant.applyCompany(where, user);
  const rows = await otherIncomeRepository.findAll({ where });
  return { period: range, ...summarizeIncomes(rows) };
};

exports.totalForPeriod = async (range, user) => {
  const where = otherIncomeRepository.searchWhere({
    from: range.from,
    to: range.to,
  });
  tenant.applyCompany(where, user);
  const rows = await otherIncomeRepository.findAll({ where });
  return rows.reduce(
    (sum, row) => decimal.addMoney(sum, row.amount),
    decimal.money(0),
  );
};
