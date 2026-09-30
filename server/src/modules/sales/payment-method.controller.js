const Joi = require("joi");
const catchAsync = require("../../shared/helpers/catchAsync.helper");
const { sendSuccess } = require("../../shared/helpers/response.helper");
const AppError = require("../../shared/errors/AppError");
const tenant = require("../../shared/helpers/tenant.helper");
const models = require("../../database/models");
const {
  normalizeName,
  nameKey,
  paymentMethodWhere,
  dedupePaymentMethods,
  toPublicPaymentMethod,
  ensureDefaultPaymentMethods,
} = require("./payment-method.defaults");

const { PaymentMethod } = models;
const uuid = () => Joi.string().uuid({ version: "uuidv4" });
const { Op } = require("sequelize");

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

exports.list = catchAsync(async (req, res) => {
  await ensureDefaultPaymentMethods();
  const extra = {};
  if (req.query.status) extra.status = req.query.status;
  const rows = await PaymentMethod.findAll({
    where: paymentMethodWhere(req.user, extra),
    order: [["name", "ASC"]],
  });
  const paymentMethods = dedupePaymentMethods(rows).map(toPublicPaymentMethod);
  sendSuccess(res, {
    data: { paymentMethods },
    message: "Payment methods retrieved",
  });
});

exports.create = catchAsync(async (req, res) => {
  await ensureDefaultPaymentMethods();
  const name = normalizeName(req.body.name);
  const companyId = tenant.requireCompanyId(req.user);
  const key = nameKey(name);

  const scoped = await PaymentMethod.findAll({
    where: paymentMethodWhere(req.user),
  });
  const clash = scoped.find((row) => nameKey(row.name) === key);
  if (clash) {
    throw AppError.conflict(
      clash.companyId
        ? "Payment method already exists"
        : "That name is already a system default payment method",
    );
  }

  const created = await PaymentMethod.create({
    name,
    status: req.body.status || "ACTIVE",
    companyId,
  });
  sendSuccess(res, {
    data: { paymentMethod: toPublicPaymentMethod(created) },
    message: "Payment method created",
    statusCode: 201,
  });
});

exports.update = catchAsync(async (req, res) => {
  const row = await PaymentMethod.findByPk(req.params.id);
  if (!row) throw AppError.notFound("Payment method not found");
  if (!row.companyId) {
    throw AppError.forbidden("System default payment methods cannot be changed");
  }
  tenant.assertOwned(req.user, row, "Payment method not found");

  if (req.body.name) {
    const name = normalizeName(req.body.name);
    const key = nameKey(name);
    const others = await PaymentMethod.findAll({
      where: {
        id: { [Op.ne]: row.id },
        ...paymentMethodWhere(req.user),
      },
    });
    if (others.some((other) => nameKey(other.name) === key)) {
      throw AppError.conflict("Payment method already exists");
    }
    row.name = name;
  }
  if (req.body.status) row.status = req.body.status;
  await row.save();
  sendSuccess(res, {
    data: { paymentMethod: toPublicPaymentMethod(row) },
    message: "Payment method updated",
  });
});
