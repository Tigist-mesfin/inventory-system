const router = require("express").Router();

const {
  validateBody,
  validateQuery,
  validateParams,
} = require("../../shared/middlewares/validate.wrapper");
const authenticate = require("../auth/auth.middleware");
const { authorizePermission } = require("../auth/auth.middleware");
const controller = require("./customer.controller");
const {
  listQuerySchema,
  idParamSchema,
  createSchema,
  updateSchema,
  pricesSchema,
  paymentSchema,
} = require("./customer.validation");

router.use(authenticate);

router.get(
  "/",
  authorizePermission("customers", "READ"),
  validateQuery(listQuerySchema),
  controller.list,
);

router.get(
  "/:id",
  authorizePermission("customers", "READ"),
  validateParams(idParamSchema),
  controller.getById,
);

router.post(
  "/",
  authorizePermission("customers", "CREATE"),
  validateBody(createSchema),
  controller.create,
);

router.patch(
  "/:id",
  authorizePermission("customers", "UPDATE"),
  validateParams(idParamSchema),
  validateBody(updateSchema),
  controller.update,
);

router.delete(
  "/:id",
  authorizePermission("customers", "DELETE"),
  validateParams(idParamSchema),
  controller.remove,
);

router.put(
  "/:id/prices",
  authorizePermission("customers", "UPDATE"),
  validateParams(idParamSchema),
  validateBody(pricesSchema),
  controller.setPrices,
);

router.post(
  "/:id/payments",
  authorizePermission("customers", "CREATE"),
  validateParams(idParamSchema),
  validateBody(paymentSchema),
  controller.recordPayment,
);

module.exports = router;
