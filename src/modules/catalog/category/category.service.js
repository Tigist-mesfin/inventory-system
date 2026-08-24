const AppError = require("../../../shared/errors/AppError");
const paginate = require("../../../shared/helpers/pagination.helper");
const categoryRepository = require("./category.repository");

exports.list = async (query) => {
  const { page, limit, offset } = paginate(query);
  const where = categoryRepository.searchWhere(query);
  const { rows, count } = await categoryRepository.findAndCount({
    where,
    limit,
    offset,
  });
  return paginate.buildResult("categories", rows, count, page, limit);
};

exports.getById = async (id) => {
  const category = await categoryRepository.findById(id);
  if (!category) throw AppError.notFound("Category not found");
  return categoryRepository.toPublic(category);
};

exports.create = async (payload) => {
  const existing = await categoryRepository.findByName(payload.name);
  if (existing) throw AppError.conflict("name is already in use");

  const category = await categoryRepository.create({
    name: payload.name,
    description: payload.description || null,
    status: payload.status || "ACTIVE",
  });
  return categoryRepository.toPublic(category);
};

exports.update = async (id, payload) => {
  const category = await categoryRepository.findById(id);
  if (!category) throw AppError.notFound("Category not found");

  if (payload.name && payload.name !== category.name) {
    const taken = await categoryRepository.findByName(payload.name);
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

exports.remove = async (id) => {
  const category = await categoryRepository.findById(id);
  if (!category) throw AppError.notFound("Category not found");

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
