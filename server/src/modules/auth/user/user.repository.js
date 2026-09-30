const { Op } = require("sequelize");
const models = require("../../../database/models");
const { rolePermissionInclude } = require("../../../shared/middlewares/auth.middleware");
const authRepository = require("../auth.repository");

const { User, Role } = models;

const userInclude = [
  {
    ...rolePermissionInclude,
    required: false,
  },
];

const publicUser = (user) => authRepository.toPublicUser(user);

exports.toPublicUser = publicUser;

exports.findAndCount = async ({ where, limit, offset }) => {
  const { rows, count } = await User.findAndCountAll({
    where,
    include: userInclude,
    limit,
    offset,
    order: [["createdAt", "DESC"]],
    distinct: true,
  });
  return { rows: rows.map(publicUser), count };
};

exports.searchWhere = ({ search, status, roleId }) => {
  const where = {};
  if (status) where.status = status;
  if (roleId) where.roleId = roleId;
  if (search) {
    const like = { [Op.like]: `%${search}%` };
    where[Op.or] = [{ username: like }, { fullName: like }, { phone: like }];
  }
  return where;
};

exports.findById = async (id) =>
  User.findByPk(id, { include: userInclude });

exports.findByUsername = async (username) =>
  User.findOne({ where: { username } });

exports.create = async (payload) => {
  const created = await User.create(payload);
  return User.findByPk(created.id, { include: userInclude });
};

exports.save = async (user) => {
  await user.save();
  return User.findByPk(user.id, { include: userInclude });
};

exports.destroy = async (user) => user.destroy();

exports.countActiveAdmins = async (adminRoleId, excludeUserId) => {
  const where = { roleId: adminRoleId, status: "ACTIVE" };
  if (excludeUserId) where.id = { [Op.ne]: excludeUserId };
  return User.count({ where });
};

exports.findAdminRole = async () => Role.findOne({ where: { name: "ADMIN" } });

exports.countByRoleId = async (roleId) => User.count({ where: { roleId } });
