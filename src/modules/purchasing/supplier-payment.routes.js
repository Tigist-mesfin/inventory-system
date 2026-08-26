const router = require("express").Router();

const {
  validateBody,
  validateQuery,
} = require("../../shared/middlewares/validate.wrapper");
const authenticate = require("../auth/auth.middleware");
const { authorizePermission } = require("../auth/auth.middleware");
const controller = require("./supplier-payment.controller");
const { listQuerySchema, createSchema } = require("./supplier-payment.validation");

router.use(authenticate);

router.get(
  "/",
  authorizePermission("purchasing", "READ"),
  validateQuery(listQuerySchema),
  controller.list,
);

router.post(
  "/",
  authorizePermission("purchasing", "CREATE"),
  validateBody(createSchema),
  controller.create,
);

module.exports = router;
