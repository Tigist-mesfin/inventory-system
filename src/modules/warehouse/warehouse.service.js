const { Op } = require("sequelize");
const AppError = require("../../shared/errors/AppError");
const paginate = require("../../shared/helpers/pagination.helper");
const phoneNormalize = require("../../shared/helpers/phoneNormalize.helper");
const tenant = require("../../shared/helpers/tenant.helper");
const warehouseRepository = require("./warehouse.repository");

const emptyToNull = (value) => {
  if (value === undefined) return undefined;
  if (value === "") return null;
  return value;
};

exports.list = async (query, user) => {
  const { page, limit, offset } = paginate(query);
  const where = warehouseRepository.searchWhere(query);
  tenant.applyCompany(where, user);
  const ids = tenant.warehouseIdsOf(user);
  if (ids) where.id = ids.length ? { [Op.in]: ids } : null;
  const { rows, count } = await warehouseRepository.findAndCount({
    where,
    limit,
    offset,
  });
  return paginate.buildResult("warehouses", rows, count, page, limit);
};

exports.getById = async (id, user) => {
  const warehouse = await warehouseRepository.findById(id);
  tenant.assertOwned(user, warehouse, "Warehouse not found");
  tenant.assertWarehouseAccess(user, warehouse.id);
  return warehouseRepository.toPublic(warehouse);
};

exports.create = async (payload, user) => {
  const companyId = tenant.companyIdOf(user);
  if (await warehouseRepository.findByName(payload.name, companyId)) {
    throw AppError.conflict("name is already in use");
  }

  let code = String(payload.code || "").trim();
  if (!code) {
    const base =
      String(payload.name)
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "")
        .slice(0, 8) || "WH";
    code = base;
    let n = 1;
    while (await warehouseRepository.findByCode(code, companyId)) {
      code = `${base}${n}`.slice(0, 32);
      n += 1;
    }
  } else if (await warehouseRepository.findByCode(code, companyId)) {
    throw AppError.conflict("code is already in use");
  }

  const warehouse = await warehouseRepository.create({
    name: payload.name,
    code,
    address: payload.address ?? null,
    managerName: emptyToNull(payload.managerName) ?? null,
    phone: payload.phone
      ? phoneNormalize(payload.phone) || payload.phone
      : null,
    status: payload.status || "ACTIVE",
    companyId,
  });
  return warehouseRepository.toPublic(warehouse);
};

exports.update = async (id, payload, user) => {
  const warehouse = await warehouseRepository.findById(id);
  tenant.assertOwned(user, warehouse, "Warehouse not found");
  const companyId = tenant.companyIdOf(user);

  if (payload.name && payload.name !== warehouse.name) {
    if (await warehouseRepository.findByName(payload.name, companyId)) {
      throw AppError.conflict("name is already in use");
    }
    warehouse.name = payload.name;
  }
  if (payload.code && payload.code !== warehouse.code) {
    if (await warehouseRepository.findByCode(payload.code, companyId)) {
      throw AppError.conflict("code is already in use");
    }
    warehouse.code = payload.code;
  }
  if (payload.address !== undefined) warehouse.address = payload.address;
  if (payload.managerName !== undefined) {
    warehouse.managerName = emptyToNull(payload.managerName);
  }
  if (payload.phone !== undefined) {
    warehouse.phone = payload.phone
      ? phoneNormalize(payload.phone) || payload.phone
      : null;
  }
  if (payload.status !== undefined) warehouse.status = payload.status;

  const saved = await warehouseRepository.save(warehouse);
  return warehouseRepository.toPublic(saved);
};

exports.remove = async (id, user) => {
  const warehouse = await warehouseRepository.findById(id);
  tenant.assertOwned(user, warehouse, "Warehouse not found");

  const refs = await warehouseRepository.countOperationalReferences(id);
  const total = Object.values(refs).reduce((sum, n) => sum + n, 0);
  if (total > 0) {
    throw AppError.conflict(
      "Warehouse is referenced by operational records and cannot be deleted; deactivate it instead",
    );
  }

  try {
    await warehouseRepository.destroy(warehouse);
  } catch (err) {
    if (err.name === "SequelizeForeignKeyConstraintError") {
      throw AppError.conflict(
        "Warehouse is referenced by operational records and cannot be deleted; deactivate it instead",
      );
    }
    throw err;
  }

  return { deleted: true };
};
