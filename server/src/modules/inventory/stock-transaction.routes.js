const router = require("express").Router();

const { validateQuery } = require("../../shared/middlewares/validate.wrapper");
const authenticate = require("../auth/auth.middleware");
const { authorizePermission } = require("../auth/auth.middleware");
const controller = require("./stock-transaction.controller");
const { listQuerySchema } = require("./stock-transaction.validation");

router.use(authenticate);

router.get(
  "/",
  authorizePermission("inventory", "READ"),
  validateQuery(listQuerySchema),
  controller.list,
);

module.exports = router;
