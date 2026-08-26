const catchAsync = require("../../shared/helpers/catchAsync.helper");
const { sendSuccess } = require("../../shared/helpers/response.helper");
const supplierPaymentService = require("./supplier-payment.service");

exports.list = catchAsync(async (req, res) => {
  const result = await supplierPaymentService.list(req.query, req.user);
  sendSuccess(res, {
    data: { payments: result.payments },
    meta: result.meta,
    message: "Supplier payments retrieved",
  });
});

exports.create = catchAsync(async (req, res) => {
  const payment = await supplierPaymentService.create(req.body, req.user);
  sendSuccess(res, {
    data: { payment },
    message: "Supplier payment recorded",
    statusCode: 201,
  });
});
