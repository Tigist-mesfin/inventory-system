const catchAsync = require("../../shared/helpers/catchAsync.helper");
const { sendSuccess } = require("../../shared/helpers/response.helper");
const kachaPaymentService = require("./kacha-payment.service");

exports.createPaymentRequest = catchAsync(async (req, res) => {
  const result = await kachaPaymentService.createPaymentRequest(
    req.params.id,
    req.user,
    req.body || {},
  );
  sendSuccess(res, {
    data: result,
    message: result.reused
      ? "Existing Kacha payment request"
      : "Kacha payment request created",
    statusCode: result.reused ? 200 : 201,
  });
});

exports.getPayment = catchAsync(async (req, res) => {
  const payment = await kachaPaymentService.getPayment(
    req.params.paymentId,
    req.user,
  );
  sendSuccess(res, {
    data: { payment },
    message: "Success",
  });
});

exports.listPaymentsForSale = catchAsync(async (req, res) => {
  const payments = await kachaPaymentService.listPaymentsForSale(
    req.params.id,
    req.user,
  );
  sendSuccess(res, {
    data: { payments },
    message: "Success",
  });
});
