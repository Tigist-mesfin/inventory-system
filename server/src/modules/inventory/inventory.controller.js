const catchAsync = require("../../shared/helpers/catchAsync.helper");
const { sendSuccess } = require("../../shared/helpers/response.helper");
const AppError = require("../../shared/errors/AppError");
const inventoryService = require("./inventory.service");

exports.list = catchAsync(async (req, res) => {
  const result = await inventoryService.list(req.query, req.user);
  sendSuccess(res, {
    data: { inventory: result.inventory },
    meta: result.meta,
    message: "Inventory retrieved",
  });
});

exports.overview = catchAsync(async (req, res) => {
  const overview = await inventoryService.overview(req.user);
  sendSuccess(res, { data: { overview }, message: "Stock overview retrieved" });
});

exports.listUndelivered = catchAsync(async (req, res) => {
  const items = await inventoryService.listUndelivered(req.user);
  sendSuccess(res, {
    data: { items },
    message: "Undelivered purchases retrieved",
  });
});

exports.listByItem = catchAsync(async (req, res) => {
  const result = await inventoryService.listByItem(req.query, req.user);
  sendSuccess(res, {
    data: { items: result.items },
    meta: result.meta,
    message: "Live stock by item retrieved",
  });
});

exports.getById = catchAsync(async (req, res) => {
  const inventory = await inventoryService.getById(req.params.id, req.user);
  sendSuccess(res, { data: { inventory }, message: "Inventory retrieved" });
});

exports.listLots = catchAsync(async (req, res) => {
  const result = await inventoryService.listLots(req.query, req.user);
  sendSuccess(res, {
    data: result,
    message: "Purchase lots retrieved",
  });
});

exports.adjustOnHand = catchAsync(async (req, res) => {
  const inventory = await inventoryService.adjustOnHand(req.body, req.user);
  sendSuccess(res, {
    data: { inventory },
    message: "Stock quantity updated",
  });
});

exports.downloadImportTemplate = catchAsync(async (req, res) => {
  const buffer = inventoryService.buildImportTemplate();
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="stock-import-sample.xlsx"',
  );
  res.send(buffer);
});

exports.importFromExcel = catchAsync(async (req, res) => {
  if (!req.file?.buffer) {
    throw AppError.badRequest("Choose an Excel file to upload");
  }
  const result = await inventoryService.importFromExcel(req.file.buffer, req.user);
  sendSuccess(res, {
    data: result,
    message: result.importedCount
      ? `Imported ${result.importedCount} stock row(s)`
      : "No stock rows were imported",
  });
});
