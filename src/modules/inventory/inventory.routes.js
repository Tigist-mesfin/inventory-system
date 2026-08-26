const router = require("express").Router();

const {
  validateQuery,
  validateParams,
} = require("../../shared/middlewares/validate.wrapper");
const authenticate = require("../auth/auth.middleware");
const { authorizePermission } = require("../auth/auth.middleware");
const controller = require("./inventory.controller");
const { listQuerySchema, idParamSchema } = require("./inventory.validation");

router.use(authenticate);

router.get(
  "/",
  authorizePermission("inventory", "READ"),
  validateQuery(listQuerySchema),
  controller.list,
);

router.get(
  "/overview",
  authorizePermission("inventory", "READ"),
  controller.overview,
);

router.get(
  "/:id",
  authorizePermission("inventory", "READ"),
  validateParams(idParamSchema),
  controller.getById,
);

module.exports = router;
