const router = require("express").Router();

const {
  validateBody,
  validateQuery,
  validateParams,
} = require("../../../shared/middlewares/validate.wrapper");
const authenticate = require("../auth.middleware");
const { authorizePermission } = require("../auth.middleware");
const controller = require("./role.controller");
const {
  listQuerySchema,
  idParamSchema,
  createSchema,
  updateSchema,
  setPermissionsSchema,
} = require("./role.validation");

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

router.put(
  "/:id/permissions",
  authorizePermission("auth", "UPDATE"),
  validateParams(idParamSchema),
  validateBody(setPermissionsSchema),
  controller.setPermissions,
);

router.delete(
  "/:id",
  authorizePermission("auth", "DELETE"),
  validateParams(idParamSchema),
  controller.remove,
);

module.exports = router;
