const { Op } = require("sequelize");
const models = require("../../database/models");

const { OtherIncome, User } = models;

const toPublic = (row) => {
  if (!row) return null;
  const plain = typeof row.toJSON === "function" ? row.toJSON() : { ...row };
  return {
    id: plain.id,
    incomeDate: plain.incomeDate,
    receivedFrom: plain.receivedFrom,
    reason: plain.reason,
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

exports.searchWhere = ({ search, paymentMethod, from, to }) => {
  const where = {};
  if (paymentMethod) where.paymentMethod = paymentMethod;
  if (from || to) {
    where.incomeDate = {};
    if (from) where.incomeDate[Op.gte] = from;
    if (to) where.incomeDate[Op.lte] = to;
  }
  if (search) {
    const like = { [Op.like]: `%${search}%` };
    where[Op.or] = [
      { receivedFrom: like },
      { reason: like },
      { notes: like },
      { paymentMethod: like },
    ];
  }
  return where;
};

const includeCreator = {
  model: User,
  as: "creator",
  attributes: ["id", "fullName", "username"],
};

exports.findAndCount = async ({ where, limit, offset }) => {
  const { rows, count } = await OtherIncome.findAndCountAll({
    where,
    include: [includeCreator],
    limit,
    offset,
    order: [
      ["incomeDate", "DESC"],
      ["createdAt", "DESC"],
    ],
  });
  return { rows: rows.map(toPublic), count };
};

exports.findAll = async ({ where }) =>
  OtherIncome.findAll({
    where,
    include: [includeCreator],
    order: [
      ["incomeDate", "DESC"],
      ["createdAt", "DESC"],
    ],
  });

exports.findById = async (id) =>
  OtherIncome.findByPk(id, { include: [includeCreator] });

exports.create = async (payload) => OtherIncome.create(payload);

exports.save = async (row) => {
  await row.save();
  return row;
};

exports.destroy = async (row) => row.destroy();
