const router = require("express").Router();
const {
  validateBody,
  validateParams,
} = require("../../../shared/middlewares/validate.wrapper");
const authenticate = require("../auth.middleware");
const { authorizePermission } = require("../auth.middleware");
const Joi = require("joi");
const controller = require("./team.controller");
const { createSalesmanSchema, updateSalesmanSchema } = require("./team.validation");

router.use(authenticate);

router.get("/", authorizePermission("auth", "READ"), controller.list);
router.post(
  "/",
  authorizePermission("auth", "CREATE"),
  validateBody(createSalesmanSchema),
  controller.create,
);
router.patch(
  "/:id",
  authorizePermission("auth", "UPDATE"),
  validateParams(Joi.object({ id: Joi.string().uuid({ version: "uuidv4" }).required() })),
  validateBody(updateSalesmanSchema),
  controller.update,
);

module.exports = router;
