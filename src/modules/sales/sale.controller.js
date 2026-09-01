const catchAsync = require("../../shared/helpers/catchAsync.helper");
const { sendSuccess } = require("../../shared/helpers/response.helper");
const AppError = require("../../shared/errors/AppError");
const saleService = require("./sale.service");

exports.list = catchAsync(async (req, res) => {
  const result = await saleService.list(req.query, req.user);
  sendSuccess(res, {
    data: { sales: result.sales },
    meta: result.meta,
    message: "Sales retrieved",
  });
});

exports.getById = catchAsync(async (req, res) => {
  const sale = await saleService.getById(req.params.id, req.user);
  sendSuccess(res, { data: { sale }, message: "Sale retrieved" });
});

exports.getPublicInvoice = catchAsync(async (req, res) => {
  const result = await saleService.getPublicInvoice(req.params.token);
  sendSuccess(res, { data: result, message: "Invoice retrieved" });
});

exports.create = catchAsync(async (req, res) => {
  const sale = await saleService.create(req.body, req.user);
  sendSuccess(res, {
    data: { sale },
    message: "Sale created",
    statusCode: 201,
  });
});

exports.update = catchAsync(async (req, res) => {
  const sale = await saleService.update(req.params.id, req.body, req.user);
  sendSuccess(res, { data: { sale }, message: "Sale updated" });
});

exports.complete = catchAsync(async (req, res) => {
  const sale = await saleService.complete(req.params.id, req.user, req.body);
  sendSuccess(res, { data: { sale }, message: "Sale completed" });
});

exports.recordPayment = catchAsync(async (req, res) => {
  const sale = await saleService.recordPayment(req.params.id, req.body, req.user);
  sendSuccess(res, { data: { sale }, message: "Sale payment recorded" });
});

exports.revise = catchAsync(async (req, res) => {
  const sale = await saleService.revise(req.params.id, req.body, req.user);
  sendSuccess(res, { data: { sale }, message: "Sale updated" });
});

exports.cancel = catchAsync(async (req, res) => {
  const sale = await saleService.cancel(req.params.id, req.user);
  sendSuccess(res, { data: { sale }, message: "Sale cancelled" });
});

exports.quote = catchAsync(async (req, res) => {
  const quote = await saleService.quote(req.query, req.user);
  sendSuccess(res, { data: { quote }, message: "Price quoted" });
});

exports.downloadImportTemplate = catchAsync(async (req, res) => {
  const buffer = saleService.buildImportTemplate();
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="sale-import-sample.xlsx"',
  );
  res.send(buffer);
});

exports.importFromExcel = catchAsync(async (req, res) => {
  if (!req.file?.buffer) {
    throw AppError.badRequest("Choose an Excel file to upload");
  }
  const result = await saleService.importFromExcel(req.file.buffer, req.user);
  sendSuccess(res, {
    data: result,
    message: result.importedCount
      ? `Imported ${result.importedCount} sale(s)`
      : "No sales were imported",
  });
});
