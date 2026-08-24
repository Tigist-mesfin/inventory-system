const paginate = (query, opts = {}) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(
    Math.max(parseInt(query.limit, 10) || opts.defaultLimit || 20, 1),
    opts.maxLimit || 100,
  );
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

paginate.buildResult = (dataKey, rows, count, page, limit) => ({
  [dataKey]: rows,
  meta: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
});

module.exports = paginate;
