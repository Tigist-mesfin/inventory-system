const router = require("express").Router();

const {
  validateBody,
  validateQuery,
  validateParams,
} = require("../../shared/middlewares/validate.wrapper");
const authenticate = require("../auth/auth.middleware");
const { authorizePermission } = require("../auth/auth.middleware");
const controller = require("./stock-receipt.controller");
const {
  listQuerySchema,
  idParamSchema,
  createSchema,
  updateSchema,
} = require("./stock-receipt.validation");

router.use(authenticate);

router.get("/", authorizePermission("purchasing", "READ"), validateQuery(listQuerySchema), controller.list);
router.get("/:id", authorizePermission("purchasing", "READ"), validateParams(idParamSchema), controller.getById);
router.post("/", authorizePermission("purchasing", "CREATE"), validateBody(createSchema), controller.create);
router.patch("/:id", authorizePermission("purchasing", "UPDATE"), validateParams(idParamSchema), validateBody(updateSchema), controller.update);
router.post("/:id/complete", authorizePermission("purchasing", "APPROVE"), validateParams(idParamSchema), controller.complete);
router.post("/:id/cancel", authorizePermission("purchasing", "UPDATE"), validateParams(idParamSchema), controller.cancel);

module.exports = router;
