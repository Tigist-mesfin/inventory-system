const catchAsync = require("../../shared/helpers/catchAsync.helper");
const { sendSuccess } = require("../../shared/helpers/response.helper");
const models = require("../../database/models");
const tenant = require("../../shared/helpers/tenant.helper");

const { CompanyProfile } = models;

const toPublic = (row) => {
  if (!row) {
    return { name: "", address: "", phone: "", email: "", tin: "" };
  }
  const plain = row.toJSON();
  return {
    id: plain.id,
    name: plain.name || "",
    address: plain.address || "",
    phone: plain.phone || "",
    email: plain.email || "",
    tin: plain.tin || "",
  };
};

const getOrCreate = async (user) => {
  const companyId = tenant.requireCompanyId(user);
  let row = await CompanyProfile.findOne({ where: { companyId } });
  if (!row) {
    row = await CompanyProfile.create({
      companyId,
      name: user.company?.name || null,
      phone: user.company?.phone || null,
      address: user.company?.address || null,
    });
  }
  return row;
};

exports.get = catchAsync(async (req, res) => {
  const row = await getOrCreate(req.user);
  sendSuccess(res, {
    data: { company: toPublic(row) },
    message: "Company profile retrieved",
  });
});

exports.update = catchAsync(async (req, res) => {
  const row = await getOrCreate(req.user);
  const fields = ["name", "address", "phone", "email", "tin"];
  for (const field of fields) {
    if (req.body[field] !== undefined) {
      row[field] = req.body[field] === "" ? null : req.body[field];
    }
  }
  await row.save();
  sendSuccess(res, {
    data: { company: toPublic(row) },
    message: "Company profile updated",
  });
});
