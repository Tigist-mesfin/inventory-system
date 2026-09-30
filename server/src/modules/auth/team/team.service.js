const sequelize = require("../../../config/db");
const { Op } = require("sequelize");
const AppError = require("../../../shared/errors/AppError");
const phoneNormalize = require("../../../shared/helpers/phoneNormalize.helper");
const tenant = require("../../../shared/helpers/tenant.helper");
const models = require("../../../database/models");
const authRepository = require("../auth.repository");

const { User, Role, Permission, UserWarehouse, UserPermission, Warehouse } = models;

const ensureSalesmanRole = async () => {
  let role = await Role.findOne({ where: { name: "SALESMAN" } });
  if (!role) {
    role = await Role.create({
      name: "SALESMAN",
      description: "Store salesman with assigned module access",
      status: "ACTIVE",
    });
  }
  return role;
};

const assertOwner = (actor) => {
  if (!tenant.isOwner(actor)) {
    throw AppError.forbidden("Only the company owner can manage salesmen");
  }
};

const resolvePermissions = async (names = []) => {
  if (!names.length) return [];
  const rows = await Permission.findAll({
    where: { name: { [Op.in]: names }, status: "ACTIVE" },
  });
  return rows;
};

const setAccess = async (userId, { allWarehouses, warehouseIds, permissions }, transaction) => {
  if (allWarehouses !== undefined) {
    await User.update({ allWarehouses: Boolean(allWarehouses) }, { where: { id: userId }, transaction });
  }
  if (warehouseIds) {
    await UserWarehouse.destroy({ where: { userId }, transaction });
    if (!allWarehouses && warehouseIds.length) {
      await UserWarehouse.bulkCreate(
        warehouseIds.map((warehouseId) => ({ userId, warehouseId })),
        { transaction },
      );
    }
  }
  if (permissions) {
    const rows = await resolvePermissions(permissions);
    await UserPermission.destroy({ where: { userId }, transaction });
    if (rows.length) {
      await UserPermission.bulkCreate(
        rows.map((permission) => ({ userId, permissionId: permission.id })),
        { transaction },
      );
    }
  }
};

const toTeamUser = async (userId) => {
  const user = await User.findByPk(userId, {
    include: require("../../../shared/middlewares/auth.middleware").userAccessInclude,
  });
  return authRepository.toPublicUser(user);
};

exports.list = async (actor) => {
  assertOwner(actor);
  const role = await ensureSalesmanRole();
  const rows = await User.findAll({
    where: { companyId: actor.companyId, roleId: role.id },
    include: require("../../../shared/middlewares/auth.middleware").userAccessInclude,
    order: [["fullName", "ASC"]],
  });
  return rows.map((row) => authRepository.toPublicUser(row));
};

exports.create = async (actor, payload) => {
  assertOwner(actor);
  const phone = phoneNormalize(payload.phone) || payload.phone;
  const taken = await User.unscoped().findOne({
    where: { [Op.or]: [{ username: phone }, { phone }] },
  });
  if (taken) throw AppError.conflict("This phone / username is already in use");

  if (!payload.allWarehouses && !(payload.warehouseIds || []).length) {
    throw AppError.badRequest("Assign a store or allow all stores");
  }
  if (payload.warehouseIds?.length) {
    const count = await Warehouse.count({
      where: { id: { [Op.in]: payload.warehouseIds }, companyId: actor.companyId },
    });
    if (count !== payload.warehouseIds.length) {
      throw AppError.badRequest("One or more stores do not belong to this company");
    }
  }

  const role = await ensureSalesmanRole();
  const created = await sequelize.transaction(async (transaction) => {
    const user = await User.create(
      {
        fullName: payload.fullName,
        username: phone,
        phone,
        password: payload.password,
        roleId: role.id,
        companyId: actor.companyId,
        allWarehouses: Boolean(payload.allWarehouses),
        status: "ACTIVE",
      },
      { transaction },
    );
    await setAccess(
      user.id,
      {
        allWarehouses: payload.allWarehouses,
        warehouseIds: payload.warehouseIds || [],
        permissions: payload.permissions || [],
      },
      transaction,
    );
    return user.id;
  });
  return toTeamUser(created);
};

exports.update = async (actor, id, payload) => {
  assertOwner(actor);
  const user = await User.findByPk(id);
  if (!user || user.companyId !== actor.companyId) {
    throw AppError.notFound("Salesman not found");
  }
  if (payload.fullName) user.fullName = payload.fullName;
  if (payload.phone) {
    const phone = phoneNormalize(payload.phone) || payload.phone;
    user.phone = phone;
    user.username = phone;
  }
  if (payload.status) user.status = payload.status;
  if (payload.password) user.password = payload.password;
  await sequelize.transaction(async (transaction) => {
    await user.save({ transaction });
    await setAccess(
      user.id,
      {
        allWarehouses: payload.allWarehouses,
        warehouseIds: payload.warehouseIds,
        permissions: payload.permissions,
      },
      transaction,
    );
  });
  return toTeamUser(id);
};
