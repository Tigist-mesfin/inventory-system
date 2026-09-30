const router = require("express").Router();
const multer = require("multer");

const {
  validateQuery,
  validateParams,
  validateBody,
} = require("../../shared/middlewares/validate.wrapper");
const wrapUpload = require("../../shared/middlewares/upload.middleware");
const authenticate = require("../auth/auth.middleware");
const { authorizePermission } = require("../auth/auth.middleware");
const controller = require("./inventory.controller");
const {
  listQuerySchema,
  idParamSchema,
  lotsQuerySchema,
  adjustOnHandSchema,
} = require("./inventory.validation");

const excelUpload = wrapUpload(
  multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter(req, file, cb) {
      const name = String(file.originalname || "").toLowerCase();
      if (name.endsWith(".xlsx") || name.endsWith(".xls") || name.endsWith(".csv")) {
        return cb(null, true);
      }
      cb(new Error("Upload an Excel (.xlsx) or CSV file"));
    },
  }).single("file"),
);

router.use(authenticate);

router.get(
  "/",
  authorizePermission("inventory", "READ"),
  validateQuery(listQuerySchema),
  controller.list,
);

router.get(
  "/overview",
  authorizePermission("inventory", "READ"),
  controller.overview,
);

router.get(
  "/undelivered",
  authorizePermission("inventory", "READ"),
  controller.listUndelivered,
);

router.get(
  "/by-item",
  authorizePermission("inventory:READ", "sales:READ", "sales:CREATE"),
  validateQuery(listQuerySchema),
  controller.listByItem,
);

router.get(
  "/lots",
  authorizePermission("inventory:READ", "sales:READ", "purchasing:READ"),
  validateQuery(lotsQuerySchema),
  controller.listLots,
);

router.get(
  "/import-template",
  authorizePermission("inventory:UPDATE", "inventory:CREATE"),
  controller.downloadImportTemplate,
);

router.post(
  "/import",
  authorizePermission("inventory:UPDATE", "inventory:CREATE"),
  excelUpload,
  controller.importFromExcel,
);

router.post(
  "/adjust-on-hand",
  authorizePermission("inventory:UPDATE", "inventory:CREATE", "inventory:READ"),
  validateBody(adjustOnHandSchema),
  controller.adjustOnHand,
);

router.get(
  "/:id",
  authorizePermission("inventory", "READ"),
  validateParams(idParamSchema),
  controller.getById,
);

module.exports = router;
