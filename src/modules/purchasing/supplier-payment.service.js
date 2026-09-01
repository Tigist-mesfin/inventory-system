const { Op } = require("sequelize");
const sequelize = require("../../config/db");
const AppError = require("../../shared/errors/AppError");
const paginate = require("../../shared/helpers/pagination.helper");
const decimal = require("../../shared/helpers/decimal.helper");
const models = require("../../database/models");
const tenant = require("../../shared/helpers/tenant.helper");

const { SupplierPayment, Supplier, PurchaseOrder, User } = models;

exports.list = async (query, user) => {
  const { page, limit, offset } = paginate(query);
  const where = {};
  tenant.applyCompany(where, user);
  if (query.supplierId) where.supplierId = query.supplierId;
  const { rows, count } = await SupplierPayment.findAndCountAll({
    where,
    include: [
      { model: Supplier, as: "supplier", attributes: ["id", "name"] },
      {
        model: PurchaseOrder,
        as: "purchaseOrder",
        attributes: ["id", "orderNumber", "totalAmount", "paidAmount"],
        required: false,
      },
      { model: User, as: "recorder", attributes: ["id", "fullName", "username"] },
    ],
    limit,
    offset,
    order: [["paidAt", "DESC"]],
  });
  return paginate.buildResult(
    "payments",
    rows.map((row) => row.toJSON()),
    count,
    page,
    limit,
  );
};

exports.create = async (payload, user) => {
  const userId = user.id;
  const supplier = await Supplier.findByPk(payload.supplierId);
  tenant.assertOwned(user, supplier, "Supplier not found");

  return sequelize.transaction(async (transaction) => {
    if (payload.purchaseOrderId) {
      const po = await PurchaseOrder.findByPk(payload.purchaseOrderId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!po || po.supplierId !== payload.supplierId) {
        throw AppError.badRequest("Purchase order not found for this supplier");
      }
      tenant.assertOwned(user, po, "Purchase order not found");
      const nextPaid = decimal.addMoney(po.paidAmount || 0, payload.amount);
      if (decimal.cmpMoney(nextPaid, po.totalAmount) > 0) {
        throw AppError.badRequest("Payment exceeds remaining supplier balance");
      }
      po.paidAmount = nextPaid;
      await po.save({ transaction });
    } else {
      let remaining = decimal.money(payload.amount);
      const orders = await PurchaseOrder.findAll({
        where: {
          supplierId: payload.supplierId,
          companyId: tenant.requireCompanyId(user),
          status: { [Op.ne]: "CANCELLED" },
        },
        lock: transaction.LOCK.UPDATE,
        transaction,
        order: [["dueDate", "ASC"], ["orderDate", "ASC"]],
      });
      for (const po of orders) {
        if (decimal.cmpMoney(remaining, 0) <= 0) break;
        const open = decimal.subMoney(po.totalAmount, po.paidAmount || 0);
        if (decimal.cmpMoney(open, 0) <= 0) continue;
        const apply = decimal.cmpMoney(remaining, open) > 0 ? open : remaining;
        po.paidAmount = decimal.addMoney(po.paidAmount || 0, apply);
        await po.save({ transaction });
        remaining = decimal.subMoney(remaining, apply);
      }
      if (decimal.cmpMoney(remaining, 0) > 0) {
        throw AppError.badRequest("Payment exceeds outstanding supplier balance");
      }
    }

    const payment = await SupplierPayment.create(
      {
        supplierId: payload.supplierId,
        purchaseOrderId: payload.purchaseOrderId || null,
        recordedBy: userId,
        companyId: tenant.companyIdOf(user),
        amount: decimal.money(payload.amount),
        method: payload.method,
        paidAt: payload.paidAt || new Date(),
        dueDate: payload.dueDate || null,
        notes: payload.notes || null,
      },
      { transaction },
    );
    return payment.toJSON();
  });
};
