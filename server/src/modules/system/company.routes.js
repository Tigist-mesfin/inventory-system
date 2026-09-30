const router = require("express").Router();
const { validateBody } = require("../../shared/middlewares/validate.wrapper");
const authenticate = require("../auth/auth.middleware");
const { authorizeOwner, authorizePermission } = require("../auth/auth.middleware");
const controller = require("./company.controller");
const { updateSchema } = require("./company.validation");

router.use(authenticate);

// Read is needed for invoices/proformas (salesmen included). Edit stays owner-only.
router.get(
  "/",
  authorizePermission(
    "sales:READ",
    "sales:CREATE",
    "purchasing:READ",
    "customers:READ",
  ),
  controller.get,
);
router.patch(
  "/",
  authorizeOwner(),
  validateBody(updateSchema),
  controller.update,
);

module.exports = router;
