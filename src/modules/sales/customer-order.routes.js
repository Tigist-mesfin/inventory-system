const router = require("express").Router();
const {
  validateBody,
  validateQuery,
  validateParams,
} = require("../../shared/middlewares/validate.wrapper");
const authenticate = require("../auth/auth.middleware");
const { authorizePermission } = require("../auth/auth.middleware");
const controller = require("./customer-order.controller");
const {
  listQuerySchema,
  idParamSchema,
  updateSchema,
  createSchema,
  approveSchema,
  statusSchema,
  paymentSchema,
} = require("./customer-order.validation");

router.use(authenticate);

router.get("/", authorizePermission("sales", "READ"), validateQuery(listQuerySchema), controller.list);
router.post(
  "/",
  authorizePermission("sales", "CREATE"),
  validateBody(createSchema),
  controller.create,
);
router.get("/:id", authorizePermission("sales", "READ"), validateParams(idParamSchema), controller.getById);
router.patch("/:id", authorizePermission("sales", "UPDATE"), validateParams(idParamSchema), validateBody(updateSchema), controller.updatePending);
router.post("/:id/approve", authorizePermission("sales", "APPROVE"), validateParams(idParamSchema), validateBody(approveSchema), controller.approve);
router.patch("/:id/status", authorizePermission("sales", "UPDATE"), validateParams(idParamSchema), validateBody(statusSchema), controller.updateStatus);
router.post("/:id/payments", authorizePermission("sales", "UPDATE"), validateParams(idParamSchema), validateBody(paymentSchema), controller.recordPayment);

module.exports = router;
