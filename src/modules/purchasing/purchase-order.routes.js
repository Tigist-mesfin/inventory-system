const router = require("express").Router();
const multer = require("multer");

const {
  validateBody,
  validateQuery,
  validateParams,
} = require("../../shared/middlewares/validate.wrapper");
const wrapUpload = require("../../shared/middlewares/upload.middleware");
const authenticate = require("../auth/auth.middleware");
const { authorizePermission } = require("../auth/auth.middleware");
const controller = require("./purchase-order.controller");
const {
  listQuerySchema,
  idParamSchema,
  itemIdParamSchema,
  createSchema,
  updateSchema,
  updateItemSchema,
  deliverAllSchema,
  paySchema,
} = require("./purchase-order.validation");

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
  "/undelivered-summary",
  authorizePermission("purchasing", "READ"),
  controller.undeliveredSummary,
);
router.get(
  "/import-template",
  authorizePermission("purchasing", "CREATE"),
  controller.downloadImportTemplate,
);
router.post(
  "/import",
  authorizePermission("purchasing", "CREATE"),
  excelUpload,
  controller.importFromExcel,
);
router.post(
  "/deliver-all",
  authorizePermission("purchasing", "UPDATE"),
  validateBody(deliverAllSchema),
  controller.deliverAll,
);
router.patch(
  "/items/:itemId",
  authorizePermission("purchasing", "UPDATE"),
  validateParams(itemIdParamSchema),
  validateBody(updateItemSchema),
  controller.updateItemDelivery,
);
router.get("/", authorizePermission("purchasing", "READ"), validateQuery(listQuerySchema), controller.list);
router.get("/:id", authorizePermission("purchasing", "READ"), validateParams(idParamSchema), controller.getById);
router.post("/", authorizePermission("purchasing", "CREATE"), validateBody(createSchema), controller.create);
router.patch("/:id", authorizePermission("purchasing", "UPDATE"), validateParams(idParamSchema), validateBody(updateSchema), controller.update);
router.post(
  "/:id/payments",
  authorizePermission("purchasing:CREATE", "purchasing:UPDATE"),
  validateParams(idParamSchema),
  validateBody(paySchema),
  controller.recordPayment,
);
router.post("/:id/cancel", authorizePermission("purchasing", "UPDATE"), validateParams(idParamSchema), controller.cancel);

module.exports = router;
