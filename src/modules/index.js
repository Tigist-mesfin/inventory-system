const router = require("express").Router();

router.use("/auth", require("./auth/auth.routes"));
router.use("/users", require("./auth/user/user.routes"));
router.use("/roles", require("./auth/role/role.routes"));
router.use("/permissions", require("./auth/permission/permission.routes"));
router.use(
  "/role-permissions",
  require("./auth/role-permission/role-permission.routes"),
);
router.use(require("./catalog"));

module.exports = router;
