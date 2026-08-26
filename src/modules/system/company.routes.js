const router = require("express").Router();
const { validateBody } = require("../../shared/middlewares/validate.wrapper");
const authenticate = require("../auth/auth.middleware");
const { authorizePermission } = require("../auth/auth.middleware");
const controller = require("./company.controller");
const { updateSchema } = require("./company.validation");

router.use(authenticate);

router.get("/", authorizePermission("sales", "READ"), controller.get);
router.patch(
  "/",
  authorizePermission("sales", "UPDATE"),
  validateBody(updateSchema),
  controller.update,
);

module.exports = router;
