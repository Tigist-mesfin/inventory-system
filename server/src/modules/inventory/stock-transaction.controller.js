const catchAsync = require("../../shared/helpers/catchAsync.helper");
const { sendSuccess } = require("../../shared/helpers/response.helper");
const stockTransactionService = require("./stock-transaction.service");

exports.list = catchAsync(async (req, res) => {
  const result = await stockTransactionService.list(req.query, req.user);
  sendSuccess(res, {
    data: { transactions: result.transactions },
    meta: result.meta,
    message: "Stock transactions retrieved",
  });
});
