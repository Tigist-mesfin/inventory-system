const { Op } = require("sequelize");
const models = require("../../database/models");

const { Expense, User } = models;

const toPublic = (row) => {
  if (!row) return null;
  const plain = typeof row.toJSON === "function" ? row.toJSON() : { ...row };
  return {
    id: plain.id,
    expenseDate: plain.expenseDate,
    category: plain.category,
    description: plain.description,
    amount: plain.amount,
    paymentMethod: plain.paymentMethod,
    notes: plain.notes,
    createdBy: plain.createdBy,
    creator: plain.creator
      ? {
          id: plain.creator.id,
          fullName: plain.creator.fullName,
          username: plain.creator.username,
        }
      : null,
    createdAt: plain.createdAt,
  };
};

exports.toPublic = toPublic;

exports.searchWhere = ({
  search,
  category,
  paymentMethod,
  from,
  to,
  toExclusive = false,
}) => {
  const where = {};
  if (category) where.category = category;
  if (paymentMethod) where.paymentMethod = paymentMethod;
  if (from || to) {
    where.expenseDate = {};
    if (from) where.expenseDate[Op.gte] = from;
    if (to) where.expenseDate[toExclusive ? Op.lt : Op.lte] = to;
  }
  if (search) {
    const like = { [Op.like]: `%${search}%` };
    where[Op.or] = [{ description: like }, { notes: like }, { paymentMethod: like }];
  }
  return where;
};

const includeCreator = {
  model: User,
  as: "creator",
  attributes: ["id", "fullName", "username"],
};

exports.findAndCount = async ({ where, limit, offset }) => {
  const { rows, count } = await Expense.findAndCountAll({
    where,
    include: [includeCreator],
    limit,
    offset,
    order: [["expenseDate", "DESC"], ["createdAt", "DESC"]],
  });
  return { rows: rows.map(toPublic), count };
};

exports.findAll = async ({ where }) =>
  Expense.findAll({
    where,
    include: [includeCreator],
    order: [["expenseDate", "DESC"], ["createdAt", "DESC"]],
  });

exports.findById = async (id) =>
  Expense.findByPk(id, { include: [includeCreator] });

exports.create = async (payload) => Expense.create(payload);

exports.save = async (expense) => {
  await expense.save();
  return expense;
};

exports.destroy = async (expense) => expense.destroy();
