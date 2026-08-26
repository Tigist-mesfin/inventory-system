const AppError = require("../../shared/errors/AppError");
const paginate = require("../../shared/helpers/pagination.helper");
const decimal = require("../../shared/helpers/decimal.helper");
const inventoryRepository = require("./inventory.repository");
const tenant = require("../../shared/helpers/tenant.helper");
const purchaseOrderService = require("../purchasing/purchase-order.service");

exports.list = async (query, user) => {
  const { page, limit, offset } = paginate(query, { defaultLimit: 100, maxLimit: 200 });
  const where = inventoryRepository.buildWhere(query);
  tenant.applyCompany(where, user);
  tenant.applyWarehouse(where, user);
  const productWhere = inventoryRepository.buildProductWhere(query);
  const { rows, count } = await inventoryRepository.findAndCount({
    where,
    productWhere,
    limit: query.lowStock ? 500 : limit,
    offset: query.lowStock ? 0 : offset,
  });

  const filtered = query.lowStock
    ? rows.filter((row) => row.isLowStock)
    : rows;

  if (query.lowStock) {
    const start = (page - 1) * limit;
    const pageRows = filtered.slice(start, start + limit);
    return paginate.buildResult(
      "inventory",
      pageRows,
      filtered.length,
      page,
      limit,
    );
  }

  return paginate.buildResult("inventory", filtered, count, page, limit);
};

exports.getById = async (id, user) => {
  const row = await inventoryRepository.findById(id);
  tenant.assertOwned(user, row, "Inventory record not found");
  tenant.assertWarehouseAccess(user, row.warehouseId);
  return inventoryRepository.toPublic(row);
};

exports.availableOf = (row) =>
  decimal.available(row.quantity, row.reservedQuantity);

exports.overview = async (user) => {
  const where = {};
  tenant.applyWarehouse(where, user);
  const rows = await inventoryRepository.findAllForOverview(where);
  const byStore = new Map();
  let lowStockCount = 0;

  for (const row of rows) {
    const warehouseId = row.warehouseId;
    const name = row.warehouse?.name || "Store";
    if (!byStore.has(warehouseId)) {
      byStore.set(warehouseId, {
        warehouseId,
        name,
        itemCount: 0,
        quantity: decimal.qty(0),
      });
    }
    const store = byStore.get(warehouseId);
    if (decimal.cmpQty(row.available, 0) > 0) {
      store.itemCount += 1;
      store.quantity = decimal.addQty(store.quantity, row.available);
    }
    if (row.isLowStock) lowStockCount += 1;
  }

  const delivery = await purchaseOrderService.undeliveredSummary(user);
  return {
    stores: [...byStore.values()].sort((a, b) => a.name.localeCompare(b.name)),
    lowStockCount,
    undeliveredCount: delivery.undeliveredCount || 0,
    notDeliveredCount: delivery.notDelivered?.count || 0,
  };
};
