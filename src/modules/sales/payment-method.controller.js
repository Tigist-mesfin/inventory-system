const Joi = require("joi");
const catchAsync = require("../../shared/helpers/catchAsync.helper");
const { sendSuccess } = require("../../shared/helpers/response.helper");
const AppError = require("../../shared/errors/AppError");
const tenant = require("../../shared/helpers/tenant.helper");
const models = require("../../database/models");

const { PaymentMethod } = models;
const uuid = () => Joi.string().uuid({ version: "uuidv4" });

exports.listQuerySchema = Joi.object({
  status: Joi.string().valid("ACTIVE", "INACTIVE"),
});

exports.createSchema = Joi.object({
  name: Joi.string().trim().min(2).max(64).required(),
  status: Joi.string().valid("ACTIVE", "INACTIVE"),
});

exports.updateSchema = Joi.object({
  name: Joi.string().trim().min(2).max(64),
  status: Joi.string().valid("ACTIVE", "INACTIVE"),
}).min(1);

exports.idParamSchema = Joi.object({ id: uuid().required() });

const toPublic = (row) => {
  const plain = row.toJSON();
  return {
    id: plain.id,
    name: plain.name,
    status: plain.status,
    createdAt: plain.createdAt,
  };
};

exports.list = catchAsync(async (req, res) => {
  const { Op } = require("sequelize");
  const companyId = tenant.companyIdOf(req.user);
  const where = {};
  if (req.query.status) where.status = req.query.status;
  if (companyId) {
    where[Op.or] = [{ companyId }, { companyId: null }];
  }
  const rows = await PaymentMethod.findAll({ where, order: [["name", "ASC"]] });
  sendSuccess(res, {
    data: { paymentMethods: rows.map(toPublic) },
    message: "Payment methods retrieved",
  });
});

exports.create = catchAsync(async (req, res) => {
  const name = req.body.name.trim();
  const existing = await PaymentMethod.findOne({
    where: { name, companyId: tenant.companyIdOf(req.user) },
  });
  if (existing) throw AppError.conflict("Payment method already exists");
  const created = await PaymentMethod.create({
    name,
    status: req.body.status || "ACTIVE",
    companyId: tenant.companyIdOf(req.user),
  });
  sendSuccess(res, {
    data: { paymentMethod: toPublic(created) },
    message: "Payment method created",
    statusCode: 201,
  });
});

exports.update = catchAsync(async (req, res) => {
  const row = await PaymentMethod.findByPk(req.params.id);
  tenant.assertOwned(req.user, row, "Payment method not found");
  if (req.body.name) row.name = req.body.name.trim();
  if (req.body.status) row.status = req.body.status;
  await row.save();
  sendSuccess(res, { data: { paymentMethod: toPublic(row) }, message: "Payment method updated" });
});
