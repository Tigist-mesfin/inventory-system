const router = require("express").Router();

router.use("/auth", require("./auth/auth.routes"));
router.use("/users", require("./auth/user/user.routes"));
router.use("/team", require("./auth/team/team.routes"));
router.use("/roles", require("./auth/role/role.routes"));
router.use("/permissions", require("./auth/permission/permission.routes"));
router.use(
  "/role-permissions",
  require("./auth/role-permission/role-permission.routes"),
);
router.use(require("./catalog"));
router.use("/warehouses", require("./warehouse/warehouse.routes"));
router.use("/inventory", require("./inventory/inventory.routes"));
router.use(
  "/stock-transactions",
  require("./inventory/stock-transaction.routes"),
);
router.use("/stock-transfers", require("./inventory/stock-transfer.routes"));
router.use(
  "/stock-adjustments",
  require("./inventory/stock-adjustment.routes"),
);
router.use(
  "/purchase-orders",
  require("./purchasing/purchase-order.routes"),
);
router.use("/stock-receipts", require("./purchasing/stock-receipt.routes"));
router.use(
  "/supplier-payments",
  require("./purchasing/supplier-payment.routes"),
);
router.use("/sales", require("./sales/sale.routes"));
router.use("/customers", require("./sales/customer.routes"));
router.use("/customer-orders", require("./sales/customer-order.routes"));
router.use("/payment-methods", require("./sales/payment-method.routes"));
router.use("/shop", require("./shop/shop.routes"));
router.use("/insights", require("./insights/insights.routes"));
router.use("/expenses", require("./finance/expense.routes"));
router.use("/other-incomes", require("./finance/other-income.routes"));
router.use("/ai", require("./ai/ai.routes"));
router.use("/company-profile", require("./system/company.routes"));
router.use("/platform", require("./platform/platform.routes"));

module.exports = router;
