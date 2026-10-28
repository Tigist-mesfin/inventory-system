const router = require("express").Router();

router.use("/kacha", require("./kacha.webhook"));

module.exports = router;
