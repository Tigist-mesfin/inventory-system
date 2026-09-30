const router = require("express").Router();

const { validateQuery } = require("../../shared/middlewares/validate.wrapper");
const authenticate = require("../auth/auth.middleware");
const { authorizePermission } = require("../auth/auth.middleware");
const controller = require("./insights.controller");
const { marketplaceQuerySchema, tradeReportQuerySchema } = require("./insights.validation");

router.use(authenticate);

router.get(
  "/dashboard",
  authorizePermission(
    "sales:READ",
    "purchasing:READ",
    "inventory:READ",
    "insights:READ",
    "finance:READ",
  ),
  controller.dashboard,
);

router.get(
  "/marketplace",
  authorizePermission("insights", "READ"),
  validateQuery(marketplaceQuerySchema),
  controller.marketplace,
);

router.get(
  "/sales-report",
  authorizePermission("sales:READ", "insights:READ"),
  validateQuery(tradeReportQuerySchema),
  controller.salesReport,
);

router.get(
  "/ledger",
  authorizePermission("sales:READ", "purchasing:READ"),
  controller.ledger,
);

router.get(
  "/purchases-report",
  authorizePermission("purchasing:READ", "insights:READ"),
  validateQuery(tradeReportQuerySchema),
  controller.purchasesReport,
);

router.get(
  "/item-profit-report",
  authorizePermission("sales:READ", "purchasing:READ", "insights:READ"),
  validateQuery(tradeReportQuerySchema),
  controller.itemProfitReport,
);

router.get(
  "/vat-report",
  authorizePermission("sales:READ", "purchasing:READ", "insights:READ"),
  validateQuery(tradeReportQuerySchema),
  controller.vatReport,
);

module.exports = router;
