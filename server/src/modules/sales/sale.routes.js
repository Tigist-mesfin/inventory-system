const router = require("express").Router();
const Joi = require("joi");

const {
  validateBody,
  validateQuery,
  validateParams,
} = require("../../shared/middlewares/validate.wrapper");
const wrapUpload = require("../../shared/middlewares/upload.middleware");
const multer = require("multer");
const authenticate = require("../auth/auth.middleware");
const { authorizePermission } = require("../auth/auth.middleware");
const controller = require("./sale.controller");
const {
  listQuerySchema,
  idParamSchema,
  shareTokenParamSchema,
  createSchema,
  updateSchema,
  completeSchema,
  paySchema,
  reviseSchema,
  syncSchema,
} = require("./sale.validation");

const quoteQuerySchema = Joi.object({
  customerId: Joi.string().uuid({ version: "uuidv4" }),
  productId: Joi.string().uuid({ version: "uuidv4" }).required(),
  quantity: Joi.number().min(0.001).precision(3).required(),
});

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

router.get(
  "/share/:token",
  validateParams(shareTokenParamSchema),
  controller.getPublicInvoice,
);

router.use(authenticate);

router.get(
  "/",
  authorizePermission("sales", "READ"),
  validateQuery(listQuerySchema),
  controller.list,
);

router.get(
  "/quote",
  authorizePermission("sales", "READ"),
  validateQuery(quoteQuerySchema),
  controller.quote,
);

router.get(
  "/import-template",
  authorizePermission("sales", "CREATE"),
  controller.downloadImportTemplate,
);

router.post(
  "/import",
  authorizePermission("sales", "CREATE"),
  excelUpload,
  controller.importFromExcel,
);

router.post(
  "/sync",
  authorizePermission("sales", "CREATE"),
  validateBody(syncSchema),
  controller.sync,
);

router.get(
  "/:id",
  authorizePermission("sales", "READ"),
  validateParams(idParamSchema),
  controller.getById,
);

router.post(
  "/",
  authorizePermission("sales", "CREATE"),
  validateBody(createSchema),
  controller.create,
);

router.patch(
  "/:id",
  authorizePermission("sales", "UPDATE"),
  validateParams(idParamSchema),
  validateBody(updateSchema),
  controller.update,
);

router.post(
  "/:id/complete",
  authorizePermission("sales:APPROVE", "sales:CREATE"),
  validateParams(idParamSchema),
  validateBody(completeSchema),
  controller.complete,
);

router.post(
  "/:id/payments",
  authorizePermission("sales", "CREATE"),
  validateParams(idParamSchema),
  validateBody(paySchema),
  controller.recordPayment,
);

router.post(
  "/:id/revise",
  authorizePermission("sales", "UPDATE"),
  validateParams(idParamSchema),
  validateBody(reviseSchema),
  controller.revise,
);

router.post(
  "/:id/cancel",
  authorizePermission("sales", "UPDATE"),
  validateParams(idParamSchema),
  controller.cancel,
);

module.exports = router;
