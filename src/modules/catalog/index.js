const router = require("express").Router();

router.use("/categories", require("./category/category.routes"));
router.use("/suppliers", require("./supplier/supplier.routes"));
router.use("/products", require("./product/product.routes"));

module.exports = router;
