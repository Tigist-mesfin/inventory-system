const { Op, fn, col, literal } = require("sequelize");
const models = require("../../database/models");
const decimal = require("../../shared/helpers/decimal.helper");
const tenant = require("../../shared/helpers/tenant.helper");

const {
  Sale,
  SaleItem,
  Product,
  Inventory,
  Warehouse,
  Customer,
  PurchaseOrder,
  PurchaseOrderItem,
  User,
  Category,
  Supplier,
} = models;

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

exports.dashboard = async (user) => {
  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = addDays(todayStart, -6);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const completedWhere = { status: "COMPLETED" };
  tenant.applyCompany(completedWhere, user);
  tenant.applyWarehouse(completedWhere, user);

  const [todaySales, weekSales, monthSales, allCompleted] = await Promise.all([
    Sale.findAll({
      where: { ...completedWhere, saleDate: { [Op.gte]: todayStart } },
    }),
    Sale.findAll({
      where: { ...completedWhere, saleDate: { [Op.gte]: weekStart } },
    }),
    Sale.findAll({
      where: { ...completedWhere, saleDate: { [Op.gte]: monthStart } },
    }),
    Sale.findAll({ where: completedWhere, attributes: ["id", "totalAmount", "paidAmount", "paymentMethod", "dueDate", "customerId", "createdBy", "saleDate"] }),
  ]);

  const sumSales = (rows) =>
    rows.reduce((sum, row) => decimal.addMoney(sum, row.totalAmount), decimal.money(0));

  const bestSellers = await SaleItem.findAll({
    attributes: [
      "productId",
      [fn("SUM", col("quantity")), "soldQuantity"],
      [fn("SUM", col("totalPrice")), "soldAmount"],
    ],
    include: [
      {
        model: Sale,
        as: "sale",
        attributes: [],
        where: completedWhere,
      },
      {
        model: Product,
        as: "product",
        attributes: ["id", "sku", "name", "brand", "size", "color"],
      },
    ],
    group: ["SaleItem.productId", "product.id"],
    order: [[literal("soldQuantity"), "DESC"]],
    limit: 8,
  });

  const inventoryWhere = {};
  tenant.applyWarehouse(inventoryWhere, user);
  const inventoryRows = await Inventory.findAll({
    where: inventoryWhere,
    include: [
      {
        model: Product,
        as: "product",
        attributes: [
          "id",
          "sku",
          "name",
          "brand",
          "size",
          "color",
          "reorderLevel",
          "sellingPrice",
        ],
      },
      { model: Warehouse, as: "warehouse", attributes: ["id", "name", "code"] },
    ],
  });

  const lowStock = inventoryRows
    .map((row) => {
      const plain = row.toJSON();
      const available = decimal.available(plain.quantity, plain.reservedQuantity);
      return {
        ...plain,
        available,
        isLowStock: decimal.cmpQty(available, plain.product?.reorderLevel || 0) <= 0,
      };
    })
    .filter((row) => row.isLowStock && decimal.cmpQty(row.available, 0) >= 0)
    .slice(0, 12);

  const cutoff = addDays(now, -90);
  const recentSaleItems = await SaleItem.findAll({
    attributes: ["productId"],
    include: [
      {
        model: Sale,
        as: "sale",
        attributes: [],
        where: { ...completedWhere, saleDate: { [Op.gte]: cutoff } },
      },
    ],
    group: ["productId"],
  });
  const movingIds = new Set(recentSaleItems.map((r) => r.productId));
  const deadStock = inventoryRows
    .filter((row) => {
      const available = decimal.available(row.quantity, row.reservedQuantity);
      return decimal.cmpQty(available, 0) > 0 && !movingIds.has(row.productId);
    })
    .slice(0, 12)
    .map((row) => {
      const plain = row.toJSON();
      return {
        ...plain,
        available: decimal.available(plain.quantity, plain.reservedQuantity),
        recommendation: "Discount or transfer this slow-moving SKU",
      };
    });

  const overdueCredit = allCompleted.filter(
    (sale) =>
      sale.paymentMethod === "CREDIT" &&
      sale.dueDate &&
      new Date(sale.dueDate) < now &&
      decimal.cmpMoney(decimal.subMoney(sale.totalAmount, sale.paidAmount), 0) > 0,
  );

  const creditOutstanding = allCompleted
    .filter((s) => s.paymentMethod === "CREDIT")
    .reduce(
      (sum, sale) =>
        decimal.addMoney(sum, decimal.subMoney(sale.totalAmount, sale.paidAmount)),
      decimal.money(0),
    );

  const posWhere = { status: { [Op.in]: ["APPROVED", "PARTIALLY_RECEIVED", "COMPLETED"] } };
  tenant.applyCompany(posWhere, user);
  const pos = await PurchaseOrder.findAll({
    where: posWhere,
  });
  const supplierPayables = pos.reduce(
    (sum, po) => decimal.addMoney(sum, decimal.subMoney(po.totalAmount, po.paidAmount || 0)),
    decimal.money(0),
  );

  const salespersonMap = new Map();
  for (const sale of allCompleted) {
    const current = salespersonMap.get(sale.createdBy) || {
      userId: sale.createdBy,
      invoiceCount: 0,
      totalAmount: decimal.money(0),
    };
    current.invoiceCount += 1;
    current.totalAmount = decimal.addMoney(current.totalAmount, sale.totalAmount);
    salespersonMap.set(sale.createdBy, current);
  }
  const users = await User.findAll({
    where: { id: [...salespersonMap.keys()] },
    attributes: ["id", "fullName", "username"],
  });
  const salespersonPerformance = users.map((user) => ({
    user: { id: user.id, fullName: user.fullName, username: user.username },
    ...salespersonMap.get(user.id),
  }));

  const followUpWhere = { status: "ACTIVE" };
  tenant.applyCompany(followUpWhere, user);
  const followUps = await Customer.findAll({
    where: followUpWhere,
    limit: 200,
  });
  const followUpCutoff = addDays(now, -30);
  const followUpCustomers = [];
  for (const customer of followUps) {
    const last = await Sale.findOne({
      where: { customerId: customer.id, status: "COMPLETED" },
      order: [["saleDate", "DESC"]],
    });
    if (!last || new Date(last.saleDate) < followUpCutoff) {
      followUpCustomers.push({
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        businessName: customer.businessName,
        lastPurchaseAt: last ? last.saleDate : null,
      });
    }
    if (followUpCustomers.length >= 8) break;
  }

  return {
    sales: {
      today: { count: todaySales.length, total: sumSales(todaySales) },
      week: { count: weekSales.length, total: sumSales(weekSales) },
      month: { count: monthSales.length, total: sumSales(monthSales) },
    },
    creditOutstanding,
    supplierPayables,
    overdueCreditCount: overdueCredit.length,
    bestSellers: bestSellers.map((row) => {
      const plain = row.toJSON();
      return {
        product: plain.product,
        soldQuantity: plain.soldQuantity,
        soldAmount: plain.soldAmount,
      };
    }),
    lowStock,
    deadStock,
    salespersonPerformance,
    followUpCustomers,
  };
};

exports.marketplace = async ({ search, warehouseId, brand, size, color }, user) => {
  const productWhere = { status: "ACTIVE" };
  tenant.applyCompany(productWhere, user);
  if (brand) productWhere.brand = { [Op.like]: `%${brand}%` };
  if (size) productWhere.size = { [Op.like]: `%${size}%` };
  if (color) productWhere.color = { [Op.like]: `%${color}%` };
  if (search) {
    const like = { [Op.like]: `%${search}%` };
    productWhere[Op.or] = [
      { name: like },
      { sku: like },
      { brand: like },
      { size: like },
      { color: like },
    ];
  }

  const inventoryWhere = {};
  if (warehouseId) {
    tenant.assertWarehouseAccess(user, warehouseId);
    inventoryWhere.warehouseId = warehouseId;
  } else {
    tenant.applyWarehouse(inventoryWhere, user);
  }

  const rows = await Inventory.findAll({
    where: inventoryWhere,
    include: [
      {
        model: Product,
        as: "product",
        where: productWhere,
        required: true,
        include: [{ model: Category, as: "category", attributes: ["id", "name"] }],
      },
      { model: Warehouse, as: "warehouse", attributes: ["id", "name", "code", "address"] },
    ],
    limit: 80,
    order: [[{ model: Product, as: "product" }, "name", "ASC"]],
  });

  return rows.map((row) => {
    const plain = row.toJSON();
    const available = decimal.available(plain.quantity, plain.reservedQuantity);
    const location = plain.warehouse?.address?.city || plain.warehouse?.name;
    return {
      productId: plain.productId,
      sku: plain.product.sku,
      name: plain.product.name,
      brand: plain.product.brand,
      size: plain.product.size,
      color: plain.product.color,
      category: plain.product.category,
      sellingPrice: plain.product.sellingPrice,
      available,
      warehouse: {
        id: plain.warehouse.id,
        name: plain.warehouse.name,
        code: plain.warehouse.code,
        location,
      },
    };
  }).filter((row) => decimal.cmpQty(row.available, 0) > 0);
};

const dateKey = (value) => new Date(value).toISOString().slice(0, 10);

const endOfDay = (value) => {
  const date = new Date(value);
  if (String(value).length <= 10) date.setHours(23, 59, 59, 999);
  return date;
};

const summarizeLines = (lines) => {
  const byItemMap = new Map();
  const byDateMap = new Map();
  let totalQty = decimal.qty(0);
  let totalAmount = decimal.money(0);

  for (const line of lines) {
    const qty = decimal.qty(line.quantity);
    const amount = decimal.money(line.totalPrice);
    totalQty = decimal.addQty(totalQty, qty);
    totalAmount = decimal.addMoney(totalAmount, amount);

    const itemKey = line.productId;
    const item = byItemMap.get(itemKey) || {
      productId: line.productId,
      name: line.productName,
      unit: line.unit,
      quantity: decimal.qty(0),
      amount: decimal.money(0),
    };
    item.quantity = decimal.addQty(item.quantity, qty);
    item.amount = decimal.addMoney(item.amount, amount);
    byItemMap.set(itemKey, item);

    const day = line.date;
    const dayRow = byDateMap.get(day) || {
      date: day,
      quantity: decimal.qty(0),
      amount: decimal.money(0),
    };
    dayRow.quantity = decimal.addQty(dayRow.quantity, qty);
    dayRow.amount = decimal.addMoney(dayRow.amount, amount);
    byDateMap.set(day, dayRow);
  }

  return {
    lines,
    byItem: [...byItemMap.values()].sort((a, b) => a.name.localeCompare(b.name)),
    byDate: [...byDateMap.values()].sort((a, b) => b.date.localeCompare(a.date)),
    totals: { quantity: totalQty, amount: totalAmount },
  };
};

exports.salesReport = async ({ from, to, productId, paymentMethod, paymentStatus, search, createdBy } = {}, user) => {
  const saleWhere = { status: "COMPLETED" };
  tenant.applyCompany(saleWhere, user);
  tenant.applyWarehouse(saleWhere, user);
  if (from || to) {
    saleWhere.saleDate = {};
    if (from) saleWhere.saleDate[Op.gte] = from;
    if (to) saleWhere.saleDate[Op.lte] = endOfDay(to);
  }
  if (paymentMethod) saleWhere.paymentMethod = paymentMethod;
  if (createdBy) saleWhere.createdBy = createdBy;
  if (search) {
    const like = { [Op.like]: `%${search}%` };
    saleWhere[Op.or] = [{ invoiceNumber: like }, { customerName: like }, { customerPhone: like }];
  }
  const itemWhere = {};
  if (productId) itemWhere.productId = productId;

  const rows = await SaleItem.findAll({
    where: itemWhere,
    include: [
      {
        model: Sale,
        as: "sale",
        attributes: ["id", "invoiceNumber", "saleDate", "customerName", "status", "paidAmount", "totalAmount", "paymentMethod"],
        where: saleWhere,
      },
      { model: Product, as: "product", attributes: ["id", "name", "unit", "sku"] },
    ],
    order: [[{ model: Sale, as: "sale" }, "saleDate", "DESC"]],
  });

  const lines = rows
    .map((row) => {
      const plain = row.toJSON();
      const paid = plain.sale.paidAmount;
      const total = plain.sale.totalAmount;
      const payStatus =
        decimal.cmpMoney(paid, 0) <= 0
          ? "UNPAID"
          : decimal.cmpMoney(paid, total) >= 0
            ? "PAID"
            : "PARTIAL";
      return {
        id: plain.id,
        date: dateKey(plain.sale.saleDate),
        document: plain.sale.invoiceNumber,
        party: plain.sale.customerName || "Walk-in",
        productId: plain.productId,
        productName: plain.product?.name,
        unit: plain.product?.unit,
        quantity: plain.quantity,
        unitPrice: plain.unitPrice,
        totalPrice: plain.totalPrice,
        paymentMethod: plain.sale.paymentMethod,
        paymentStatus: payStatus,
        paidAmount: paid,
        remainingBalance: decimal.subMoney(total, paid),
      };
    })
    .filter((line) => !paymentStatus || line.paymentStatus === paymentStatus);
  return summarizeLines(lines);
};

exports.purchasesReport = async ({ from, to, productId, paymentMethod, createdBy } = {}, user) => {
  const poWhere = { status: { [Op.ne]: "CANCELLED" } };
  tenant.applyCompany(poWhere, user);
  if (from || to) {
    poWhere.orderDate = {};
    if (from) poWhere.orderDate[Op.gte] = from;
    if (to) poWhere.orderDate[Op.lte] = endOfDay(to);
  }
  if (paymentMethod) poWhere.paymentMethod = paymentMethod;
  if (createdBy) poWhere.createdBy = createdBy;
  const itemWhere = {};
  if (productId) itemWhere.productId = productId;

  const rows = await PurchaseOrderItem.findAll({
    where: itemWhere,
    include: [
      {
        model: PurchaseOrder,
        as: "purchaseOrder",
        attributes: [
          "id",
          "orderNumber",
          "orderDate",
          "notes",
          "status",
          "paidAmount",
          "totalAmount",
          "paymentMethod",
          "createdBy",
        ],
        where: poWhere,
        include: [
          { model: models.Supplier, as: "supplier", attributes: ["id", "name"] },
          { model: User, as: "creator", attributes: ["id", "fullName", "username"] },
        ],
      },
      { model: Product, as: "product", attributes: ["id", "name", "unit", "sku"] },
      { model: Warehouse, as: "warehouse", attributes: ["id", "name", "code"] },
    ],
    order: [[{ model: PurchaseOrder, as: "purchaseOrder" }, "orderDate", "DESC"]],
  });

  const lines = rows.map((row) => {
    const plain = row.toJSON();
    const notes = plain.purchaseOrder?.notes || "";
    const walkIn = notes.startsWith("Walk-in:") ? notes : null;
    const paid = plain.purchaseOrder.paidAmount || 0;
    const total = plain.purchaseOrder.totalAmount || 0;
    const payStatus =
      decimal.cmpMoney(paid, 0) <= 0
        ? "UNPAID"
        : decimal.cmpMoney(paid, total) >= 0
          ? "PAID"
          : "PARTIAL";
    return {
      id: plain.id,
      purchaseOrderId: plain.purchaseOrder.id,
      date: dateKey(plain.purchaseOrder.orderDate),
      document: plain.purchaseOrder.orderNumber,
      party: walkIn ? walkIn.replace("Walk-in:", "Walk-in") : plain.purchaseOrder.supplier?.name,
      salesman: plain.purchaseOrder.creator?.fullName || plain.purchaseOrder.creator?.username || "",
      productId: plain.productId,
      productName: plain.product?.name,
      unit: plain.product?.unit,
      quantity: plain.quantity,
      receivedQuantity: plain.receivedQuantity,
      unitPrice: plain.unitPrice,
      totalPrice: plain.totalPrice,
      deliveryStatus: plain.deliveryStatus || "NOT_DELIVERED",
      warehouseId: plain.warehouseId || null,
      warehouseName: plain.warehouse?.name || null,
      paymentMethod: plain.purchaseOrder.paymentMethod || null,
      paidAmount: paid,
      remainingBalance: decimal.subMoney(total, paid),
      paymentStatus: payStatus,
    };
  });
  const report = summarizeLines(lines);
  report.undeliveredCount = lines.filter(
    (line) => line.deliveryStatus !== "DELIVERED",
  ).length;
  return report;
};

const itemNames = (items = []) =>
  items
    .map((item) => item.product?.name)
    .filter(Boolean)
    .join(", ");

exports.ledger = async (user) => {
  const saleWhere = {
    status: "COMPLETED",
    [Op.and]: literal("`Sale`.`paidAmount` < `Sale`.`totalAmount`"),
  };
  tenant.applyCompany(saleWhere, user);
  tenant.applyWarehouse(saleWhere, user);
  const poWhere = {
    status: { [Op.ne]: "CANCELLED" },
    [Op.and]: literal(
      "`PurchaseOrder`.`paidAmount` < `PurchaseOrder`.`totalAmount`",
    ),
  };
  tenant.applyCompany(poWhere, user);
  const [sales, orders] = await Promise.all([
    Sale.findAll({
      where: saleWhere,
      include: [
        {
          model: SaleItem,
          as: "items",
          include: [{ model: Product, as: "product", attributes: ["id", "name", "unit"] }],
        },
        {
          model: Customer,
          as: "customer",
          attributes: ["id", "name", "phone"],
          required: false,
        },
      ],
      order: [["saleDate", "ASC"]],
    }),
    PurchaseOrder.findAll({
      where: poWhere,
      include: [
        {
          model: PurchaseOrderItem,
          as: "items",
          include: [{ model: Product, as: "product", attributes: ["id", "name", "unit"] }],
        },
        { model: Supplier, as: "supplier", attributes: ["id", "name", "phone"] },
      ],
      order: [["orderDate", "ASC"]],
    }),
  ]);

  const credits = sales.map((sale) => {
    const plain = sale.toJSON();
    const remaining = decimal.subMoney(plain.totalAmount, plain.paidAmount || 0);
    return {
      id: plain.id,
      date: plain.saleDate,
      document: plain.invoiceNumber,
      partyName: plain.customerName || plain.customer?.name || "Walk-in",
      partyPhone: plain.customerPhone || plain.customer?.phone || "",
      customerId: plain.customerId || null,
      items: itemNames(plain.items),
      totalAmount: plain.totalAmount,
      paidAmount: plain.paidAmount,
      remainingBalance: remaining,
      paymentMethod: plain.paymentMethod,
    };
  });

  const debits = orders.map((order) => {
    const plain = order.toJSON();
    const remaining = decimal.subMoney(plain.totalAmount, plain.paidAmount || 0);
    return {
      id: plain.id,
      date: plain.orderDate,
      document: plain.orderNumber,
      partyName: plain.supplier?.name || "Supplier",
      partyPhone: plain.supplier?.phone || "",
      supplierId: plain.supplierId,
      items: itemNames(plain.items),
      totalAmount: plain.totalAmount,
      paidAmount: plain.paidAmount,
      remainingBalance: remaining,
      paymentMethod: plain.paymentMethod,
    };
  });

  const creditTotal = credits.reduce(
    (sum, row) => decimal.addMoney(sum, row.remainingBalance),
    decimal.money(0),
  );
  const debitTotal = debits.reduce(
    (sum, row) => decimal.addMoney(sum, row.remainingBalance),
    decimal.money(0),
  );

  return { creditTotal, debitTotal, credits, debits };
};
