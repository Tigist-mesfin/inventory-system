const router = require("express").Router();

const {
  validateBody,
  validateQuery,
  validateParams,
} = require("../../shared/middlewares/validate.wrapper");
const authenticate = require("../auth/auth.middleware");
const { authorizePermission } = require("../auth/auth.middleware");
const controller = require("./expense.controller");
const {
  listQuerySchema,
  reportQuerySchema,
  incomeQuerySchema,
  idParamSchema,
  createSchema,
  updateSchema,
} = require("./expense.validation");

router.use(authenticate);

router.get(
  "/",
  authorizePermission("finance", "READ"),
  validateQuery(listQuerySchema),
  controller.list,
);

router.get(
  "/report",
  authorizePermission("finance", "READ"),
  validateQuery(reportQuerySchema),
  controller.report,
);

router.get(
  "/income-statement",
  authorizePermission("finance", "READ"),
  validateQuery(incomeQuerySchema),
  controller.incomeStatement,
);

router.get(
  "/:id",
  authorizePermission("finance", "READ"),
  validateParams(idParamSchema),
  controller.getById,
);

router.post(
  "/",
  authorizePermission("finance", "CREATE"),
  validateBody(createSchema),
  controller.create,
);

router.patch(
  "/:id",
  authorizePermission("finance", "UPDATE"),
  validateParams(idParamSchema),
  validateBody(updateSchema),
  controller.update,
);

router.delete(
  "/:id",
  authorizePermission("finance", "DELETE"),
  validateParams(idParamSchema),
  controller.remove,
);

module.exports = router;
