const router = require("express").Router();

const { validateBody } = require("../../shared/middlewares/validate.wrapper");
const {
  loginLimiter,
  refreshLimiter,
} = require("../../shared/middlewares/rateLimit.middleware");
const authenticate = require("./auth.middleware");
const controller = require("./auth.controller");
const {
  loginSchema,
  changePasswordSchema,
} = require("./auth.validation");

router.post(
  "/login",
  loginLimiter,
  validateBody(loginSchema),
  controller.login,
);

router.post("/refresh", refreshLimiter, controller.refresh);

router.post("/logout", controller.logout);

router.get("/me", authenticate, controller.me);

router.post(
  "/change-password",
  authenticate,
  validateBody(changePasswordSchema),
  controller.changePassword,
);

module.exports = router;
