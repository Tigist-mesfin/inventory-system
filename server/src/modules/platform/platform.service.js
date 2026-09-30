const { Op } = require("sequelize");
const models = require("../../database/models");
const sequelize = require("../../config/db");

const { Company, User, Role, Sale, PurchaseOrder, Warehouse } = models;

const startOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const startOfMonth = (date = new Date()) => {
  const d = startOfDay(date);
  d.setDate(1);
  return d;
};

const startOfNextDay = (date) => addDays(startOfDay(date), 1);

/**
 * Build { from, toExclusive } from period presets or custom ISO dates.
 */
const resolveRange = ({ period, from, to } = {}) => {
  const now = new Date();
  const today = startOfDay(now);

  if (period === "today") {
    return { from: today, toExclusive: startOfNextDay(today), label: "today" };
  }
  if (period === "this_week") {
    return { from: addDays(today, -6), toExclusive: startOfNextDay(today), label: "this_week" };
  }
  if (period === "this_month") {
    return { from: startOfMonth(today), toExclusive: startOfNextDay(today), label: "this_month" };
  }
  if (from || to) {
    const fromDate = from ? startOfDay(from) : null;
    const toExclusive = to ? startOfNextDay(to) : null;
    return { from: fromDate, toExclusive, label: "custom" };
  }
  return { from: null, toExclusive: null, label: "all" };
};

const companyCreatedWhere = (range) => {
  if (!range.from && !range.toExclusive) return {};
  const createdAt = {};
  if (range.from) createdAt[Op.gte] = range.from;
  if (range.toExclusive) createdAt[Op.lt] = range.toExclusive;
  return { createdAt };
};

const getSalesmanRoleId = async () => {
  const role = await Role.findOne({ where: { name: "SALESMAN" } });
  return role?.id || null;
};

const getOwnerRoleId = async () => {
  const role = await Role.findOne({ where: { name: "COMPANY_OWNER" } });
  return role?.id || null;
};

const attachWarehouseCounts = async (companies) => {
  const ids = companies.map((c) => c.id).filter(Boolean);
  if (!ids.length) return companies.map((c) => ({ ...c, warehouseCount: 0 }));

  const rows = await Warehouse.findAll({
    attributes: ["companyId", [sequelize.fn("COUNT", sequelize.col("id")), "count"]],
    where: { companyId: { [Op.in]: ids } },
    group: ["companyId"],
    raw: true,
  });
  const map = new Map(rows.map((row) => [row.companyId, Number(row.count || 0)]));
  return companies.map((company) => ({
    ...company,
    warehouseCount: map.get(company.id) || 0,
  }));
};

exports.getOverview = async (query = {}) => {
  const range = resolveRange(query);
  const companyWhere = companyCreatedWhere(range);
  const salesmanRoleId = await getSalesmanRoleId();

  const saleWhere = { status: "COMPLETED" };
  const purchaseWhere = { status: { [Op.ne]: "CANCELLED" } };
  if (range.from || range.toExclusive) {
    saleWhere.saleDate = {};
    purchaseWhere.orderDate = {};
    if (range.from) {
      saleWhere.saleDate[Op.gte] = range.from;
      purchaseWhere.orderDate[Op.gte] = range.from;
    }
    if (range.toExclusive) {
      saleWhere.saleDate[Op.lt] = range.toExclusive;
      purchaseWhere.orderDate[Op.lt] = range.toExclusive;
    }
  }

  const [
    totalCompanies,
    companiesInRange,
    totalSalesmen,
    recentCompanies,
    salesAgg,
    purchaseAgg,
  ] = await Promise.all([
    Company.count(),
    Object.keys(companyWhere).length ? Company.count({ where: companyWhere }) : Company.count(),
    salesmanRoleId
      ? User.count({ where: { roleId: salesmanRoleId, status: { [Op.ne]: "INACTIVE" } } })
      : 0,
    Company.findAll({
      where: companyWhere,
      order: [["createdAt", "DESC"]],
      limit: 12,
      attributes: ["id", "name", "phone", "address", "status", "createdAt"],
    }),
    Sale.findAll({
      attributes: [
        [sequelize.fn("COUNT", sequelize.col("id")), "count"],
        [sequelize.fn("COALESCE", sequelize.fn("SUM", sequelize.col("totalAmount")), 0), "total"],
      ],
      where: saleWhere,
      raw: true,
    }),
    PurchaseOrder.findAll({
      attributes: [
        [sequelize.fn("COUNT", sequelize.col("id")), "count"],
        [sequelize.fn("COALESCE", sequelize.fn("SUM", sequelize.col("totalAmount")), 0), "total"],
      ],
      where: purchaseWhere,
      raw: true,
    }),
  ]);

  return {
    period: range.label,
    from: range.from,
    to: range.toExclusive ? addDays(range.toExclusive, -1) : null,
    totals: {
      companies: totalCompanies,
      companiesInPeriod: companiesInRange,
      salesmen: totalSalesmen,
      salesCount: Number(salesAgg[0]?.count || 0),
      salesTotal: Number(salesAgg[0]?.total || 0),
      purchaseCount: Number(purchaseAgg[0]?.count || 0),
      purchaseTotal: Number(purchaseAgg[0]?.total || 0),
    },
    recentCompanies: await attachWarehouseCounts(
      recentCompanies.map((row) => row.toJSON()),
    ),
  };
};

exports.listCompanies = async (query = {}) => {
  const range = resolveRange(query);
  const where = companyCreatedWhere(range);
  if (query.status) where.status = query.status;
  if (query.search) {
    const q = String(query.search).trim();
    where[Op.or] = [
      { name: { [Op.like]: `%${q}%` } },
      { phone: { [Op.like]: `%${q}%` } },
    ];
  }

  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(Math.max(Number(query.limit) || 100, 1), 100);
  const offset = (page - 1) * limit;

  const salesmanRoleId = await getSalesmanRoleId();
  const ownerRoleId = await getOwnerRoleId();

  const { rows: companies, count: total } = await Company.findAndCountAll({
    where,
    order: [["createdAt", "DESC"]],
    attributes: ["id", "name", "phone", "address", "status", "createdAt", "updatedAt"],
    limit,
    offset,
  });

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const pagination = {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };

  const companyIds = companies.map((c) => c.id);
  if (!companyIds.length) {
    return {
      period: range.label,
      from: range.from,
      to: range.toExclusive ? addDays(range.toExclusive, -1) : null,
      companies: [],
      pagination,
    };
  }

  const [owners, salesmanCounts, warehouseCounts, salesByCompany, purchasesByCompany] = await Promise.all([
    ownerRoleId
      ? User.findAll({
          where: { roleId: ownerRoleId, companyId: { [Op.in]: companyIds } },
          attributes: ["id", "fullName", "username", "phone", "companyId", "status", "createdAt"],
        })
      : [],
    salesmanRoleId
      ? User.findAll({
          attributes: ["companyId", [sequelize.fn("COUNT", sequelize.col("id")), "count"]],
          where: { roleId: salesmanRoleId, companyId: { [Op.in]: companyIds } },
          group: ["companyId"],
          raw: true,
        })
      : [],
    Warehouse.findAll({
      attributes: ["companyId", [sequelize.fn("COUNT", sequelize.col("id")), "count"]],
      where: { companyId: { [Op.in]: companyIds } },
      group: ["companyId"],
      raw: true,
    }),
    Sale.findAll({
      attributes: [
        "companyId",
        [sequelize.fn("COUNT", sequelize.col("id")), "count"],
        [sequelize.fn("COALESCE", sequelize.fn("SUM", sequelize.col("totalAmount")), 0), "total"],
      ],
      where: { status: "COMPLETED", companyId: { [Op.in]: companyIds } },
      group: ["companyId"],
      raw: true,
    }),
    PurchaseOrder.findAll({
      attributes: [
        "companyId",
        [sequelize.fn("COUNT", sequelize.col("id")), "count"],
        [sequelize.fn("COALESCE", sequelize.fn("SUM", sequelize.col("totalAmount")), 0), "total"],
      ],
      where: {
        status: { [Op.ne]: "CANCELLED" },
        companyId: { [Op.in]: companyIds },
      },
      group: ["companyId"],
      raw: true,
    }),
  ]);

  const ownerByCompany = new Map();
  for (const owner of owners) {
    if (!ownerByCompany.has(owner.companyId)) {
      ownerByCompany.set(owner.companyId, owner.toJSON());
    }
  }
  const salesmanMap = new Map(
    salesmanCounts.map((row) => [row.companyId, Number(row.count || 0)]),
  );
  const warehouseMap = new Map(
    warehouseCounts.map((row) => [row.companyId, Number(row.count || 0)]),
  );
  const salesMap = new Map(
    salesByCompany.map((row) => [
      row.companyId,
      { count: Number(row.count || 0), total: Number(row.total || 0) },
    ]),
  );
  const purchaseMap = new Map(
    purchasesByCompany.map((row) => [
      row.companyId,
      { count: Number(row.count || 0), total: Number(row.total || 0) },
    ]),
  );

  return {
    period: range.label,
    from: range.from,
    to: range.toExclusive ? addDays(range.toExclusive, -1) : null,
    companies: companies.map((company) => {
      const plain = company.toJSON();
      return {
        ...plain,
        owner: ownerByCompany.get(plain.id) || null,
        salesmanCount: salesmanMap.get(plain.id) || 0,
        warehouseCount: warehouseMap.get(plain.id) || 0,
        sales: salesMap.get(plain.id) || { count: 0, total: 0 },
        purchases: purchaseMap.get(plain.id) || { count: 0, total: 0 },
      };
    }),
    pagination,
  };
};

exports.getPerformance = async (query = {}) => {
  const range = resolveRange(query);
  const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 50);

  const saleWhere = { status: "COMPLETED" };
  const purchaseWhere = { status: { [Op.ne]: "CANCELLED" } };
  if (range.from || range.toExclusive) {
    saleWhere.saleDate = {};
    purchaseWhere.orderDate = {};
    if (range.from) {
      saleWhere.saleDate[Op.gte] = range.from;
      purchaseWhere.orderDate[Op.gte] = range.from;
    }
    if (range.toExclusive) {
      saleWhere.saleDate[Op.lt] = range.toExclusive;
      purchaseWhere.orderDate[Op.lt] = range.toExclusive;
    }
  }

  const [salesRows, purchaseRows] = await Promise.all([
    Sale.findAll({
      attributes: [
        "companyId",
        [sequelize.fn("COUNT", sequelize.col("id")), "count"],
        [sequelize.fn("COALESCE", sequelize.fn("SUM", sequelize.col("totalAmount")), 0), "total"],
      ],
      where: { ...saleWhere, companyId: { [Op.ne]: null } },
      group: ["companyId"],
      order: [[sequelize.literal("total"), "DESC"]],
      limit,
      raw: true,
    }),
    PurchaseOrder.findAll({
      attributes: [
        "companyId",
        [sequelize.fn("COUNT", sequelize.col("id")), "count"],
        [sequelize.fn("COALESCE", sequelize.fn("SUM", sequelize.col("totalAmount")), 0), "total"],
      ],
      where: { ...purchaseWhere, companyId: { [Op.ne]: null } },
      group: ["companyId"],
      order: [[sequelize.literal("total"), "DESC"]],
      limit,
      raw: true,
    }),
  ]);

  const ids = [
    ...new Set([
      ...salesRows.map((r) => r.companyId),
      ...purchaseRows.map((r) => r.companyId),
    ]),
  ].filter(Boolean);

  const companies = ids.length
    ? await Company.findAll({
        where: { id: { [Op.in]: ids } },
        attributes: ["id", "name", "phone", "status"],
      })
    : [];
  const companyMap = new Map(companies.map((c) => [c.id, c.toJSON()]));

  const mapRows = (rows) =>
    rows.map((row) => ({
      companyId: row.companyId,
      company: companyMap.get(row.companyId) || null,
      count: Number(row.count || 0),
      total: Number(row.total || 0),
    }));

  return {
    period: range.label,
    from: range.from,
    to: range.toExclusive ? addDays(range.toExclusive, -1) : null,
    topSalesCompanies: mapRows(salesRows),
    topBuyingCompanies: mapRows(purchaseRows),
  };
};

exports.listOwners = async (query = {}) => {
  const range = resolveRange(query);
  const ownerRoleId = await getOwnerRoleId();
  if (!ownerRoleId) return { period: range.label, owners: [] };

  const userWhere = { roleId: ownerRoleId };
  if (range.from || range.toExclusive) {
    userWhere.createdAt = {};
    if (range.from) userWhere.createdAt[Op.gte] = range.from;
    if (range.toExclusive) userWhere.createdAt[Op.lt] = range.toExclusive;
  }

  const owners = await User.findAll({
    where: userWhere,
    include: [
      {
        model: Company,
        as: "company",
        attributes: ["id", "name", "phone", "address", "status", "createdAt"],
        required: false,
      },
    ],
    order: [["createdAt", "DESC"]],
    attributes: ["id", "fullName", "username", "phone", "status", "companyId", "createdAt", "lastLoginAt"],
  });

  return {
    period: range.label,
    from: range.from,
    to: range.toExclusive ? addDays(range.toExclusive, -1) : null,
    owners: owners.map((row) => row.toJSON()),
  };
};
