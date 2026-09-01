const router = require("express").Router();
const { validateBody } = require("../../shared/middlewares/validate.wrapper");
const authenticate = require("../auth/auth.middleware");
const { authorizeOwner } = require("../auth/auth.middleware");
const controller = require("./company.controller");
const { updateSchema } = require("./company.validation");

router.use(authenticate);

router.get("/", authorizeOwner(), controller.get);
router.patch(
  "/",
  authorizeOwner(),
  validateBody(updateSchema),
  controller.update,
);

module.exports = router;
