const router = require("express").Router();
const {
  validateBody,
  validateQuery,
} = require("../../shared/middlewares/validate.wrapper");
const authenticate = require("../auth/auth.middleware");
const { authorizePermission } = require("../auth/auth.middleware");
const { aiChatLimiter } = require("../../shared/middlewares/rateLimit.middleware");
const controller = require("./ai.controller");
const { chatSchema, filtersQuerySchema } = require("./ai.validation");

const gate = authorizePermission(
  "insights:READ",
  "sales:READ",
  "inventory:READ",
  "finance:READ",
  "purchasing:READ",
);

router.use(authenticate);
router.use(gate);

router.post("/chat", aiChatLimiter, validateBody(chatSchema), controller.chat);
router.get("/dashboard", validateQuery(filtersQuerySchema), controller.dashboard);
router.get("/analytics/profit/products", validateQuery(filtersQuerySchema), controller.profitProducts);
router.get("/analytics/profit/warehouses", validateQuery(filtersQuerySchema), controller.profitWarehouses);
router.get("/analytics/profit/salesmen", validateQuery(filtersQuerySchema), controller.profitSalesmen);
router.get("/analytics/sales", validateQuery(filtersQuerySchema), controller.sales);
router.get("/analytics/inventory", validateQuery(filtersQuerySchema), controller.inventory);
router.get("/analytics/stock-risk", validateQuery(filtersQuerySchema), controller.stockRisk);
router.get("/analytics/dead-stock", validateQuery(filtersQuerySchema), controller.deadStock);
router.get("/analytics/purchase", validateQuery(filtersQuerySchema), controller.purchase);
router.get("/analytics/transfers", validateQuery(filtersQuerySchema), controller.transfers);
router.get("/analytics/profit/losses", validateQuery(filtersQuerySchema), controller.lossProducts);

module.exports = router;
