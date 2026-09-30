const router = require("express").Router();
const authenticate = require("../auth/auth.middleware");
const { authorizePlatformAdmin } = require("../../shared/middlewares/platformAdmin.middleware");
const {
  validateQuery,
  validateBody,
  validateParams,
} = require("../../shared/middlewares/validate.wrapper");
const {
  filtersQuerySchema,
  singleSmsSchema,
  bulkSmsSchema,
  smsJobParamsSchema,
  companyIdParamsSchema,
} = require("./platform.validation");
const controller = require("./platform.controller");

router.use(authenticate);
router.use(authorizePlatformAdmin);

router.get("/overview", validateQuery(filtersQuerySchema), controller.overview);
router.get("/companies", validateQuery(filtersQuerySchema), controller.companies);
router.get("/performance", validateQuery(filtersQuerySchema), controller.performance);
router.get("/owners", validateQuery(filtersQuerySchema), controller.owners);

router.post(
  "/companies/:companyId/sms",
  validateParams(companyIdParamsSchema),
  validateBody(singleSmsSchema),
  controller.sendCompanySms,
);
router.post("/sms/bulk", validateBody(bulkSmsSchema), controller.bulkCompanySms);
router.get(
  "/sms/jobs/:jobId",
  validateParams(smsJobParamsSchema),
  controller.smsJob,
);

module.exports = router;
