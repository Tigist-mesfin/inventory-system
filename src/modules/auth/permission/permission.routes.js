const router = require("express").Router();

const {
  validateBody,
  validateQuery,
  validateParams,
} = require("../../../shared/middlewares/validate.wrapper");
const authenticate = require("../auth.middleware");
const { authorizePermission } = require("../auth.middleware");
const controller = require("./permission.controller");
const {
  listQuerySchema,
  idParamSchema,
  createSchema,
  updateSchema,
} = require("./permission.validation");

router.use(authenticate);

router.get(
  "/",
  authorizePermission("auth", "READ"),
  validateQuery(listQuerySchema),
  controller.list,
);

router.get(
  "/:id",
  authorizePermission("auth", "READ"),
  validateParams(idParamSchema),
  controller.getById,
);

router.post(
  "/",
  authorizePermission("auth", "CREATE"),
  validateBody(createSchema),
  controller.create,
);

router.patch(
  "/:id",
  authorizePermission("auth", "UPDATE"),
  validateParams(idParamSchema),
  validateBody(updateSchema),
  controller.update,
);

router.delete(
  "/:id",
  authorizePermission("auth", "DELETE"),
  validateParams(idParamSchema),
  controller.remove,
);

module.exports = router;
