const paginate = require("../../shared/helpers/pagination.helper");
const decimal = require("../../shared/helpers/decimal.helper");
const tenant = require("../../shared/helpers/tenant.helper");
const otherIncomeRepository = require("./other-income.repository");

const emptyToNull = (value) => {
  if (value === undefined) return undefined;
  if (value === "") return null;
  return value;
};

const pad2 = (n) => String(n).padStart(2, "0");

/** Local calendar YYYY-MM-DD (what “today” means on this server). */
const localDayKey = (date = new Date()) => {
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

/**
 * Business day for date-only fields stored as UTC midnight (Joi / DATE inputs).
 * Prefer the UTC calendar day when the instant is exactly UTC midnight.
 */
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
};

/**
 * Inclusive calendar-day ranges as half-open UTC intervals:
 * >= fromDay 00:00:00Z and < (toDay + 1) 00:00:00Z
 */
const resolvePeriod = (query = {}) => {
  const now = new Date();
  const period =
    query.period || (query.from || query.to ? "custom" : "this_month");
  const todayKey = localDayKey(now);
  let from;
  let to;

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
    period,
    label: PERIOD_LABELS[period] || PERIOD_LABELS.this_month,
    from,
    to,
    toExclusive: true,
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
    from: query.from ? startOfUtcDay(query.from) : undefined,
    to: query.to ? startOfNextUtcDay(query.to) : undefined,
    toExclusive: true,
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
    toExclusive: true,
  });
  tenant.applyCompany(where, user);
  const rows = await otherIncomeRepository.findAll({ where });
  return { period: range, ...summarizeIncomes(rows) };
};

exports.totalForPeriod = async (range, user) => {
  const where = otherIncomeRepository.searchWhere({
    from: range.from,
    to: range.to,
    toExclusive: Boolean(range.toExclusive),
  });
  tenant.applyCompany(where, user);
  const rows = await otherIncomeRepository.findAll({ where });
  return rows.reduce(
    (sum, row) => decimal.addMoney(sum, row.amount),
    decimal.money(0),
  );
};
