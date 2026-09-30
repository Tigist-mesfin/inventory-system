const router = require("express").Router();

const {
  validateBody,
  validateQuery,
  validateParams,
} = require("../../shared/middlewares/validate.wrapper");
const authenticate = require("../auth/auth.middleware");
const { authorizePermission } = require("../auth/auth.middleware");
const controller = require("./warehouse.controller");
const {
  listQuerySchema,
  idParamSchema,
  createSchema,
  updateSchema,
} = require("./warehouse.validation");

router.use(authenticate);

router.get(
  "/",
  authorizePermission(
    "warehouse:READ",
    "sales:READ",
    "sales:CREATE",
    "inventory:READ",
    "purchasing:READ",
    "purchasing:CREATE",
  ),
  validateQuery(listQuerySchema),
  controller.list,
);

router.get(
  "/:id",
  authorizePermission("warehouse", "READ"),
  validateParams(idParamSchema),
  controller.getById,
);

router.post(
  "/",
  authorizePermission("warehouse", "CREATE"),
  validateBody(createSchema),
  controller.create,
);

router.patch(
  "/:id",
  authorizePermission("warehouse", "UPDATE"),
  validateParams(idParamSchema),
  validateBody(updateSchema),
  controller.update,
);

router.delete(
  "/:id",
  authorizePermission("warehouse", "DELETE"),
  validateParams(idParamSchema),
  controller.remove,
);

module.exports = router;
