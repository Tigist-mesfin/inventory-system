const router = require("express").Router();

const {
  validateBody,
  validateQuery,
  validateParams,
} = require("../../shared/middlewares/validate.wrapper");
const authenticate = require("../auth/auth.middleware");
const { authorizePermission } = require("../auth/auth.middleware");
const controller = require("./stock-adjustment.controller");
const {
  listQuerySchema,
  idParamSchema,
  createSchema,
  updateSchema,
} = require("./stock-adjustment.validation");

router.use(authenticate);

router.get("/", authorizePermission("inventory", "READ"), validateQuery(listQuerySchema), controller.list);
router.get("/:id", authorizePermission("inventory", "READ"), validateParams(idParamSchema), controller.getById);
router.post("/", authorizePermission("inventory", "CREATE"), validateBody(createSchema), controller.create);
router.patch("/:id", authorizePermission("inventory", "UPDATE"), validateParams(idParamSchema), validateBody(updateSchema), controller.update);
router.post("/:id/complete", authorizePermission("inventory", "APPROVE"), validateParams(idParamSchema), controller.complete);
router.post("/:id/cancel", authorizePermission("inventory", "UPDATE"), validateParams(idParamSchema), controller.cancel);

module.exports = router;
