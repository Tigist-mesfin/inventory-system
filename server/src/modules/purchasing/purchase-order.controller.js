const catchAsync = require("../../shared/helpers/catchAsync.helper");
const { sendSuccess } = require("../../shared/helpers/response.helper");
const AppError = require("../../shared/errors/AppError");
const purchaseOrderService = require("./purchase-order.service");

exports.list = catchAsync(async (req, res) => {
  const result = await purchaseOrderService.list(req.query, req.user);
  sendSuccess(res, {
    data: { purchaseOrders: result.purchaseOrders },
    meta: result.meta,
    message: "Purchase orders retrieved",
  });
});

exports.getById = catchAsync(async (req, res) => {
  const purchaseOrder = await purchaseOrderService.getById(req.params.id, req.user);
  sendSuccess(res, { data: { purchaseOrder }, message: "Purchase order retrieved" });
});

exports.create = catchAsync(async (req, res) => {
  const purchaseOrder = await purchaseOrderService.create(req.body, req.user);
  sendSuccess(res, {
    data: { purchaseOrder },
    message: "Purchase order created",
    statusCode: 201,
  });
});

exports.update = catchAsync(async (req, res) => {
  const purchaseOrder = await purchaseOrderService.update(
    req.params.id,
    req.body,
    req.user,
  );
  sendSuccess(res, { data: { purchaseOrder }, message: "Purchase order updated" });
});

exports.cancel = catchAsync(async (req, res) => {
  const purchaseOrder = await purchaseOrderService.cancel(req.params.id, req.user);
  sendSuccess(res, { data: { purchaseOrder }, message: "Purchase order cancelled" });
});

exports.undeliveredSummary = catchAsync(async (req, res) => {
  const summary = await purchaseOrderService.undeliveredSummary(req.user);
  sendSuccess(res, {
    data: summary,
    message: "Purchase delivery summary retrieved",
  });
});

exports.updateItemDelivery = catchAsync(async (req, res) => {
  const result = await purchaseOrderService.updateItemDelivery(
    req.params.itemId,
    req.body,
    req.user,
  );
  sendSuccess(res, {
    data: result,
    message: "Purchase item delivery updated",
  });
});

exports.recordPayment = catchAsync(async (req, res) => {
  const purchaseOrder = await purchaseOrderService.recordPayment(
    req.params.id,
    req.body,
    req.user,
  );
  sendSuccess(res, { data: { purchaseOrder }, message: "Purchase payment recorded" });
});

exports.deliverAll = catchAsync(async (req, res) => {
  const result = await purchaseOrderService.deliverAll(req.body, req.user);
  sendSuccess(res, {
    data: result,
    message: result.deliveredCount
      ? `${result.deliveredCount} purchased item(s) delivered to store`
      : "No undelivered purchased items",
  });
});

exports.downloadImportTemplate = catchAsync(async (req, res) => {
  const buffer = purchaseOrderService.buildImportTemplate();
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="purchase-import-sample.xlsx"',
  );
  res.send(buffer);
});

exports.importFromExcel = catchAsync(async (req, res) => {
  if (!req.file?.buffer) {
    throw AppError.badRequest("Choose an Excel file to upload");
  }
  const result = await purchaseOrderService.importFromExcel(req.file.buffer, req.user);
  sendSuccess(res, {
    data: result,
    message: result.importedCount
      ? `Imported ${result.importedCount} purchase(s)`
      : "No purchases were imported",
  });
});
