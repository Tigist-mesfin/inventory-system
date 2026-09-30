const router = require("express").Router();

router.get("/products", (req, res) => {
  res.status(403).json({
    success: false,
    error: { code: "FORBIDDEN", message: "Customers cannot browse or place orders. Staff record orders after login." },
  });
});

router.post("/orders", (req, res) => {
  res.status(403).json({
    success: false,
    error: { code: "FORBIDDEN", message: "Customers cannot place orders. Ask staff to record the order." },
  });
});

module.exports = router;
