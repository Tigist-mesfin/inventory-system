const catchAsync = require("../../../shared/helpers/catchAsync.helper");
const { sendSuccess } = require("../../../shared/helpers/response.helper");
const productService = require("./product.service");

exports.list = catchAsync(async (req, res) => {
  const result = await productService.list(req.query, req.user);
  sendSuccess(res, {
    data: { products: result.products },
    meta: result.meta,
    message: "Products retrieved",
  });
});

exports.getById = catchAsync(async (req, res) => {
  const product = await productService.getById(req.params.id, req.user);
  sendSuccess(res, { data: { product }, message: "Product retrieved" });
});

exports.create = catchAsync(async (req, res) => {
  const product = await productService.create(req.body, req.user);
  sendSuccess(res, {
    data: { product },
    message: "Product created",
    statusCode: 201,
  });
});

exports.update = catchAsync(async (req, res) => {
  const product = await productService.update(
    req.params.id,
    req.body,
    req.user,
  );
  sendSuccess(res, { data: { product }, message: "Product updated" });
});

exports.priceHistory = catchAsync(async (req, res) => {
  const history = await productService.priceHistory(req.params.id, req.user);
  sendSuccess(res, {
    data: { history },
    message: "Price history retrieved",
  });
});

exports.history = catchAsync(async (req, res) => {
  const history = await productService.history(req.params.id, req.query, req.user);
  sendSuccess(res, {
    data: { history },
    message: "Item history retrieved",
  });
});

exports.remove = catchAsync(async (req, res) => {
  await productService.remove(req.params.id, req.user);
  sendSuccess(res, { data: null, message: "Product deleted" });
});
