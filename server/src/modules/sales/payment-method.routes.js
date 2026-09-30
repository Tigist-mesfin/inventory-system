const router = require("express").Router();
const {
  validateBody,
  validateQuery,
  validateParams,
} = require("../../shared/middlewares/validate.wrapper");
const authenticate = require("../auth/auth.middleware");
const { authorizePermission } = require("../auth/auth.middleware");
const controller = require("./payment-method.controller");

router.use(authenticate);

router.get(
  "/",
  authorizePermission("sales", "READ"),
  validateQuery(controller.listQuerySchema),
  controller.list,
);
router.post(
  "/",
  authorizePermission("sales", "UPDATE"),
  validateBody(controller.createSchema),
  controller.create,
);
router.patch(
  "/:id",
  authorizePermission("sales", "UPDATE"),
  validateParams(controller.idParamSchema),
  validateBody(controller.updateSchema),
  controller.update,
);

module.exports = router;
