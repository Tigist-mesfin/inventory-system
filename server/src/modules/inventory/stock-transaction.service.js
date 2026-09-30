const paginate = require("../../shared/helpers/pagination.helper");
const stockTransactionRepository = require("./stock-transaction.repository");
const tenant = require("../../shared/helpers/tenant.helper");

exports.list = async (query, user) => {
  const { page, limit, offset } = paginate(query);
  const where = stockTransactionRepository.searchWhere(query);
  tenant.applyCompany(where, user);
  tenant.applyWarehouse(where, user);
  const { rows, count } = await stockTransactionRepository.findAndCount({
    where,
    limit,
    offset,
  });
  return paginate.buildResult("transactions", rows, count, page, limit);
};
