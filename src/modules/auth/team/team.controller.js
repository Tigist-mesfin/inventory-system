const catchAsync = require("../../../shared/helpers/catchAsync.helper");
const { sendSuccess } = require("../../../shared/helpers/response.helper");
const teamService = require("./team.service");

exports.list = catchAsync(async (req, res) => {
  const salesmen = await teamService.list(req.user);
  sendSuccess(res, { data: { salesmen }, message: "Salesmen retrieved" });
});

exports.create = catchAsync(async (req, res) => {
  const salesman = await teamService.create(req.user, req.body);
  sendSuccess(res, {
    data: { salesman },
    message: "Salesman created",
    statusCode: 201,
  });
});

exports.update = catchAsync(async (req, res) => {
  const salesman = await teamService.update(req.user, req.params.id, req.body);
  sendSuccess(res, { data: { salesman }, message: "Salesman updated" });
});
