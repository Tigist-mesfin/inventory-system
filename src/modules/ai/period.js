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

const LABELS = {
  today: "Today",
  yesterday: "Yesterday",
  this_week: "This week",
  last_week: "Last week",
  this_month: "This month",
  last_month: "Last month",
  this_year: "This year",
  last_year: "Last year",
  custom: "Custom dates",
};

exports.LABELS = LABELS;

exports.resolvePeriod = (query = {}) => {
  const now = new Date();
  const period =
    query.period || (query.from || query.to ? "custom" : "this_month");
  let from;
  let to = endOfDay(now);

  if (period === "today") {
    from = startOfDay(now);
  } else if (period === "yesterday") {
    from = startOfDay(now);
    from.setDate(from.getDate() - 1);
    to = endOfDay(from);
  } else if (period === "this_week") {
    from = startOfDay(now);
    from.setDate(from.getDate() - 6);
  } else if (period === "last_week") {
    to = startOfDay(now);
    to.setDate(to.getDate() - 7);
    to = endOfDay(to);
    from = startOfDay(to);
    from.setDate(from.getDate() - 6);
  } else if (period === "last_month") {
    from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    to = endOfDay(new Date(now.getFullYear(), now.getMonth(), 0));
  } else if (period === "this_year") {
    from = new Date(now.getFullYear(), 0, 1);
  } else if (period === "last_year") {
    from = new Date(now.getFullYear() - 1, 0, 1);
    to = endOfDay(new Date(now.getFullYear() - 1, 11, 31));
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
    label: LABELS[period] || LABELS.this_month,
    from,
    to,
    fromKey: from.toISOString().slice(0, 10),
    toKey: to.toISOString().slice(0, 10),
  };
};

exports.previousPeriod = (range) => {
  const ms = range.to.getTime() - range.from.getTime();
  const to = new Date(range.from.getTime() - 1);
  const from = new Date(to.getTime() - ms);
  return {
    period: "previous",
    label: "Previous period",
    from,
    to,
    fromKey: from.toISOString().slice(0, 10),
    toKey: to.toISOString().slice(0, 10),
  };
};

exports.startOfDay = startOfDay;
exports.endOfDay = endOfDay;
