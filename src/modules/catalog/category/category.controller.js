const catchAsync = require("../../../shared/helpers/catchAsync.helper");
const { sendSuccess } = require("../../../shared/helpers/response.helper");
const categoryService = require("./category.service");

exports.list = catchAsync(async (req, res) => {
  const result = await categoryService.list(req.query);
  sendSuccess(res, {
    data: { categories: result.categories },
    meta: result.meta,
    message: "Categories retrieved",
  });
});

exports.getById = catchAsync(async (req, res) => {
  const category = await categoryService.getById(req.params.id);
  sendSuccess(res, { data: { category }, message: "Category retrieved" });
});

exports.create = catchAsync(async (req, res) => {
  const category = await categoryService.create(req.body);
  sendSuccess(res, {
    data: { category },
    message: "Category created",
    statusCode: 201,
  });
});

exports.update = catchAsync(async (req, res) => {
  const category = await categoryService.update(req.params.id, req.body);
  sendSuccess(res, { data: { category }, message: "Category updated" });
});

exports.remove = catchAsync(async (req, res) => {
  await categoryService.remove(req.params.id);
  sendSuccess(res, { data: null, message: "Category deleted" });
});
