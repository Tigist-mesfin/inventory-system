const AppError = require("../../../shared/errors/AppError");
const paginate = require("../../../shared/helpers/pagination.helper");
const phoneNormalize = require("../../../shared/helpers/phoneNormalize.helper");
const supplierRepository = require("./supplier.repository");
const tenant = require("../../../shared/helpers/tenant.helper");

const emptyToNull = (value) => {
  if (value === undefined) return undefined;
  if (value === "") return null;
  return value;
};

const normalizeOptionalPhone = (phone) => {
  if (phone === undefined) return undefined;
  if (!phone) return null;
  return phoneNormalize(phone) || phone;
};

exports.list = async (query, user) => {
  const { page, limit, offset } = paginate(query);
  const where = supplierRepository.searchWhere(query);
  tenant.applyCompany(where, user);
  const { rows, count } = await supplierRepository.findAndCount({
    where,
    limit,
    offset,
  });
  return paginate.buildResult("suppliers", rows, count, page, limit);
};

exports.getById = async (id, user) => {
  const supplier = await supplierRepository.findById(id);
  tenant.assertOwned(user, supplier, "Supplier not found");
  return supplierRepository.toPublic(supplier);
};

exports.create = async (payload, transaction, user) => {
  const supplier = await supplierRepository.create({
    name: payload.name,
    contactPerson: emptyToNull(payload.contactPerson) ?? null,
    email: emptyToNull(payload.email) ?? null,
    phone: normalizeOptionalPhone(payload.phone) ?? null,
    address: payload.address ?? null,
    paymentTerms: emptyToNull(payload.paymentTerms) ?? null,
    status: payload.status || "ACTIVE",
    companyId: tenant.companyIdOf(user),
  }, transaction);
  return supplierRepository.toPublic(supplier);
};

exports.update = async (id, payload) => {
  const supplier = await supplierRepository.findById(id);
  if (!supplier) throw AppError.notFound("Supplier not found");

  if (payload.name !== undefined) supplier.name = payload.name;
  if (payload.contactPerson !== undefined) {
    supplier.contactPerson = emptyToNull(payload.contactPerson);
  }
  if (payload.email !== undefined) supplier.email = emptyToNull(payload.email);
  if (payload.phone !== undefined) {
    supplier.phone = normalizeOptionalPhone(payload.phone);
  }
  if (payload.address !== undefined) supplier.address = payload.address;
  if (payload.paymentTerms !== undefined) {
    supplier.paymentTerms = emptyToNull(payload.paymentTerms);
  }
  if (payload.status !== undefined) supplier.status = payload.status;

  const saved = await supplierRepository.save(supplier);
  return supplierRepository.toPublic(saved);
};

exports.remove = async (id) => {
  const supplier = await supplierRepository.findById(id);
  if (!supplier) throw AppError.notFound("Supplier not found");

  const poCount = await supplierRepository.countPurchaseOrders(id);
  if (poCount > 0) {
    throw AppError.conflict(
      "Supplier is referenced by purchase orders and cannot be deleted; deactivate it instead",
    );
  }

  try {
    await supplierRepository.destroy(supplier);
  } catch (err) {
    if (err.name === "SequelizeForeignKeyConstraintError") {
      throw AppError.conflict(
        "Supplier is referenced by other records and cannot be deleted; deactivate it instead",
      );
    }
    throw err;
  }

  return { deleted: true };
};
