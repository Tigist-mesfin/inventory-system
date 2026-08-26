const router = require("express").Router();
const Joi = require("joi");

const {
  validateBody,
  validateQuery,
  validateParams,
} = require("../../shared/middlewares/validate.wrapper");
const authenticate = require("../auth/auth.middleware");
const { authorizePermission } = require("../auth/auth.middleware");
const controller = require("./sale.controller");
const {
  listQuerySchema,
  idParamSchema,
  createSchema,
  updateSchema,
  completeSchema,
  paySchema,
} = require("./sale.validation");

const quoteQuerySchema = Joi.object({
  customerId: Joi.string().uuid({ version: "uuidv4" }),
  productId: Joi.string().uuid({ version: "uuidv4" }).required(),
  quantity: Joi.number().min(0.001).precision(3).required(),
});

router.use(authenticate);

router.get(
  "/",
  authorizePermission("sales", "READ"),
  validateQuery(listQuerySchema),
  controller.list,
);

router.get(
  "/quote",
  authorizePermission("sales", "READ"),
  validateQuery(quoteQuerySchema),
  controller.quote,
);

router.get(
  "/:id",
  authorizePermission("sales", "READ"),
  validateParams(idParamSchema),
  controller.getById,
);

router.post(
  "/",
  authorizePermission("sales", "CREATE"),
  validateBody(createSchema),
  controller.create,
);

router.patch(
  "/:id",
  authorizePermission("sales", "UPDATE"),
  validateParams(idParamSchema),
  validateBody(updateSchema),
  controller.update,
);

router.post(
  "/:id/complete",
  authorizePermission("sales", "APPROVE"),
  validateParams(idParamSchema),
  validateBody(completeSchema),
  controller.complete,
);

router.post(
  "/:id/payments",
  authorizePermission("sales", "CREATE"),
  validateParams(idParamSchema),
  validateBody(paySchema),
  controller.recordPayment,
);

router.post(
  "/:id/cancel",
  authorizePermission("sales", "UPDATE"),
  validateParams(idParamSchema),
  controller.cancel,
);

module.exports = router;
