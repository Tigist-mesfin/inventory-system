const router = require("express").Router();

const {
  validateBody,
  validateQuery,
  validateParams,
} = require("../../shared/middlewares/validate.wrapper");
const authenticate = require("../auth/auth.middleware");
const { authorizePermission } = require("../auth/auth.middleware");
const controller = require("./customer.controller");
const {
  listQuerySchema,
  idParamSchema,
  createSchema,
  updateSchema,
  pricesSchema,
  paymentSchema,
  walletRechargeSchema,
  walletListQuerySchema,
} = require("./customer.validation");

router.use(authenticate);

router.get(
  "/",
  authorizePermission("customers:READ", "sales:READ"),
  validateQuery(listQuerySchema),
  controller.list,
);

router.get(
  "/wallets",
  authorizePermission("customers", "READ"),
  controller.listWallets,
);

router.get(
  "/wallet-transactions",
  authorizePermission("customers", "READ"),
  validateQuery(walletListQuerySchema),
  controller.listWalletTransactions,
);

router.get(
  "/:id",
  authorizePermission("customers", "READ"),
  validateParams(idParamSchema),
  controller.getById,
);

router.post(
  "/",
  authorizePermission("customers", "CREATE"),
  validateBody(createSchema),
  controller.create,
);

router.patch(
  "/:id",
  authorizePermission("customers", "UPDATE"),
  validateParams(idParamSchema),
  validateBody(updateSchema),
  controller.update,
);

router.delete(
  "/:id",
  authorizePermission("customers", "DELETE"),
  validateParams(idParamSchema),
  controller.remove,
);

router.put(
  "/:id/prices",
  authorizePermission("customers", "UPDATE"),
  validateParams(idParamSchema),
  validateBody(pricesSchema),
  controller.setPrices,
);

router.post(
  "/:id/payments",
  authorizePermission("customers", "CREATE"),
  validateParams(idParamSchema),
  validateBody(paymentSchema),
  controller.recordPayment,
);

router.post(
  "/:id/wallet",
  authorizePermission("customers", "CREATE"),
  validateParams(idParamSchema),
  validateBody(walletRechargeSchema),
  controller.rechargeWallet,
);

module.exports = router;
