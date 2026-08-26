const AppError = require("../../../shared/errors/AppError");
const paginate = require("../../../shared/helpers/pagination.helper");
const categoryRepository = require("./category.repository");
const tenant = require("../../../shared/helpers/tenant.helper");

exports.list = async (query, user) => {
  const { page, limit, offset } = paginate(query);
  const where = categoryRepository.searchWhere(query);
  tenant.applyCompany(where, user);
  const { rows, count } = await categoryRepository.findAndCount({
    where,
    limit,
    offset,
  });
  return paginate.buildResult("categories", rows, count, page, limit);
};

exports.getById = async (id, user) => {
  const category = await categoryRepository.findById(id);
  tenant.assertOwned(user, category, "Category not found");
  return categoryRepository.toPublic(category);
};

exports.create = async (payload, user) => {
  const companyId = tenant.companyIdOf(user);
  const existing = await categoryRepository.findByName(payload.name, companyId);
  if (existing) throw AppError.conflict("name is already in use");

  const category = await categoryRepository.create({
    name: payload.name,
    description: payload.description || null,
    status: payload.status || "ACTIVE",
    companyId,
  });
  return categoryRepository.toPublic(category);
};

exports.update = async (id, payload, user) => {
  const category = await categoryRepository.findById(id);
  tenant.assertOwned(user, category, "Category not found");
  const companyId = tenant.companyIdOf(user);

  if (payload.name && payload.name !== category.name) {
    const taken = await categoryRepository.findByName(payload.name, companyId);
    if (taken) throw AppError.conflict("name is already in use");
    category.name = payload.name;
  }

  if (payload.description !== undefined) {
    category.description = payload.description || null;
  }
  if (payload.status !== undefined) category.status = payload.status;

  const saved = await categoryRepository.save(category);
  return categoryRepository.toPublic(saved);
};

exports.remove = async (id, user) => {
  const category = await categoryRepository.findById(id);
  tenant.assertOwned(user, category, "Category not found");

  const productCount = await categoryRepository.countProducts(id);
  if (productCount > 0) {
    throw AppError.conflict(
      "Category is referenced by products and cannot be deleted; deactivate it instead",
    );
  }

  try {
    await categoryRepository.destroy(category);
  } catch (err) {
    if (err.name === "SequelizeForeignKeyConstraintError") {
      throw AppError.conflict(
        "Category is referenced by products and cannot be deleted; deactivate it instead",
      );
    }
    throw err;
  }

  return { deleted: true };
};
