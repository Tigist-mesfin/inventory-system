const router = require("express").Router();

const { validateBody, validateQuery, validateParams } = require("../../../shared/middlewares/validate.wrapper");
const authenticate = require("../../auth/auth.middleware");
const { authorizePermission } = require("../../auth/auth.middleware");
const controller = require("./product.controller");
const {
  listQuerySchema,
  idParamSchema,
  createSchema,
  updateSchema,
  historyQuerySchema,
} = require("./product.validation");

router.use(authenticate);

router.get(
  "/",
  authorizePermission("catalog", "READ"),
  validateQuery(listQuerySchema),
  controller.list,
);

router.get(
  "/:id/history",
  authorizePermission("catalog:READ", "inventory:READ", "sales:READ", "purchasing:READ"),
  validateParams(idParamSchema),
  validateQuery(historyQuerySchema),
  controller.history,
);

router.get(
  "/:id/price-history",
  authorizePermission("catalog", "READ"),
  validateParams(idParamSchema),
  controller.priceHistory,
);

router.get(
  "/:id",
  authorizePermission("catalog", "READ"),
  validateParams(idParamSchema),
  controller.getById,
);

router.post(
  "/",
  authorizePermission("catalog", "CREATE"),
  validateBody(createSchema),
  controller.create,
);

router.patch(
  "/:id",
  authorizePermission("catalog", "UPDATE"),
  validateParams(idParamSchema),
  validateBody(updateSchema),
  controller.update,
);

router.delete(
  "/:id",
  authorizePermission("catalog", "DELETE"),
  validateParams(idParamSchema),
  controller.remove,
);

module.exports = router;
