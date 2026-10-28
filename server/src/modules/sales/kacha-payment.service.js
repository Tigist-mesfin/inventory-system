const crypto = require("crypto");
const { Op } = require("sequelize");
const AppError = require("../../shared/errors/AppError");
const sequelize = require("../../config/db");
const models = require("../../database/models");
const tenant = require("../../shared/helpers/tenant.helper");
const decimal = require("../../shared/helpers/decimal.helper");
const phoneNormalize = require("../../shared/helpers/phoneNormalize.helper");
const kachaApi = require("../../shared/services/kachaApi.service");
const saleService = require("./sale.service");
const saleRepository = require("./sale.repository");

const { KachaPayment } = models;

const toPublic = (row) => {
  const plain = typeof row.toJSON === "function" ? row.toJSON() : { ...row };
  return {
    id: plain.id,
    saleId: plain.saleId,
    companyId: plain.companyId || null,
    traceNumber: plain.traceNumber,
    reference: plain.kachaReference,
    extReference: plain.extReference || null,
    phone: plain.phone,
    amount: plain.amount,
    reason: plain.reason,
    status: plain.status,
    appliedAt: plain.appliedAt || null,
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
  };
};

const remainingOf = (sale) =>
  decimal.subMoney(sale.totalAmount || 0, sale.paidAmount || 0);

const makeTraceNumber = () => {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `IMS${stamp}${rand}`.slice(0, 32);
};

const resolvePayerPhone = (user) => {
  const phone = phoneNormalize(user?.phone) || String(user?.phone || "").trim();
  if (!phone) {
    throw AppError.badRequest(
      "Your account has no phone number for Kacha payment",
      "KACHA_PHONE_MISSING",
    );
  }
  return phone;
};

/**
 * Start an in-app Kacha payment for a sale.
 * Amount is computed from trusted sale totals — never from the client.
 * Phone comes from the authenticated account (Kacha KYC or matching login).
 */
exports.createPaymentRequest = async (saleId, user, extras = {}) => {
  kachaApi.assertConfigured();
  const phone = resolvePayerPhone(user);

  const sale = await saleRepository.findById(saleId);
  tenant.assertOwned(user, sale, "Sale not found");
  tenant.assertWarehouseAccess(user, sale.warehouseId);

  if (sale.status === "CANCELLED" || sale.status === "REFUNDED") {
    throw AppError.badRequest("Cannot pay a cancelled or refunded sale");
  }
  if (sale.status !== "DRAFT" && sale.status !== "COMPLETED") {
    throw AppError.badRequest("Sale is not payable via Kacha");
  }

  let amount;
  if (sale.status === "DRAFT") {
    amount = decimal.money(sale.totalAmount);
  } else {
    amount = remainingOf(sale);
  }
  if (decimal.cmpMoney(amount, 0) <= 0) {
    throw AppError.badRequest("Sale is already fully paid");
  }

  // Optional partial amount only when completing a remaining balance on COMPLETED sales.
  if (
    extras.amount != null &&
    extras.amount !== "" &&
    sale.status === "COMPLETED"
  ) {
    const requested = decimal.money(extras.amount);
    if (decimal.cmpMoney(requested, 0) <= 0) {
      throw AppError.badRequest("Amount must be positive");
    }
    if (decimal.cmpMoney(requested, amount) > 0) {
      throw AppError.badRequest("Amount exceeds the remaining balance");
    }
    amount = requested;
  }

  const pending = await KachaPayment.findOne({
    where: { saleId: sale.id, status: "PENDING" },
  });
  if (pending) {
    if (pending.kachaReference) {
      return {
        payment: toPublic(pending),
        bridge: { reference: pending.kachaReference },
        reused: true,
      };
    }
  }

  const traceNumber = makeTraceNumber();
  const reason =
    String(extras.reason || "").trim() ||
    `Invoice ${sale.invoiceNumber}`;

  const payment = await KachaPayment.create({
    companyId: sale.companyId,
    saleId: sale.id,
    initiatedBy: user.id,
    traceNumber,
    phone,
    amount,
    reason,
    status: "PENDING",
    requestPayload: null,
  });

  let kachaResult;
  try {
    kachaResult = await kachaApi.requestInAppPayment({
      phone,
      amount: Number(amount),
      traceNumber,
      reason,
    });
  } catch (err) {
    payment.status = "FAILED";
    payment.callbackPayload = {
      error: err.message,
      code: err.errorCode || null,
    };
    await payment.save();
    throw err;
  }

  payment.kachaReference = kachaResult.reference;
  payment.requestPayload = {
    id: kachaResult.id,
    reference: kachaResult.reference,
    traceNumber: kachaResult.traceNumber,
    status: kachaResult.status,
    fee: kachaResult.fee,
    // Do not persist raw secrets; store non-sensitive response fields only.
    phone: kachaResult.phone,
    amount: kachaResult.amount,
    message: kachaResult.message,
  };
  if (kachaResult.status && kachaResult.status !== "PENDING") {
    payment.status = kachaApi.normalizeStatus(kachaResult.status);
    if (payment.status === "CANCELLED") payment.status = "CANCELED";
    if (!["PENDING", "PROCESSED", "CANCELED", "EXPIRED", "FAILED"].includes(payment.status)) {
      payment.status = "PENDING";
    }
  }
  await payment.save();

  // Mark sale payment method for audit without completing / stocking yet.
  if (sale.paymentMethod !== "Kacha") {
    sale.paymentMethod = "Kacha";
    await sale.save();
  }

  return {
    payment: toPublic(payment),
    bridge: { reference: payment.kachaReference },
    reused: false,
  };
};

exports.getPayment = async (paymentId, user) => {
  const payment = await KachaPayment.findByPk(paymentId);
  if (!payment) throw AppError.notFound("Kacha payment not found");
  const sale = await saleRepository.findById(payment.saleId);
  tenant.assertOwned(user, sale, "Kacha payment not found");
  return toPublic(payment);
};

exports.listPaymentsForSale = async (saleId, user) => {
  const sale = await saleRepository.findById(saleId);
  tenant.assertOwned(user, sale, "Sale not found");
  const rows = await KachaPayment.findAll({
    where: { saleId },
    order: [["createdAt", "DESC"]],
  });
  return rows.map(toPublic);
};

const findPaymentForCallback = async (payload, transaction) => {
  const reference = String(payload.reference || "").trim();
  const extReference = String(payload.ext_reference || payload.extReference || "").trim();

  const or = [];
  if (reference) {
    or.push({ traceNumber: reference });
    or.push({ kachaReference: reference });
  }
  if (extReference) {
    or.push({ extReference });
    or.push({ kachaReference: extReference });
    or.push({ traceNumber: extReference });
  }
  if (!or.length) return null;

  return KachaPayment.findOne({
    where: { [Op.or]: or },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
};

/**
 * Apply a Kacha payment callback.
 * Official docs document callback body fields only — no signature algorithm.
 * We verify association, amount, and (when possible) status via the Status API,
 * then apply sale completion / payment exactly once.
 */
exports.handleCallback = async (payload) => {
  const status = kachaApi.normalizeStatus(payload?.status);
  if (!status) {
    throw AppError.badRequest("Missing payment status", "KACHA_CALLBACK_INVALID");
  }

  return sequelize.transaction(async (transaction) => {
    const payment = await findPaymentForCallback(payload || {}, transaction);
    if (!payment) {
      throw AppError.notFound("Unknown Kacha payment reference", "KACHA_PAYMENT_UNKNOWN");
    }

    // Idempotent: already applied terminal state.
    if (payment.appliedAt) {
      return {
        payment: toPublic(payment),
        duplicate: true,
        sale: null,
      };
    }

    if (
      payment.status !== "PENDING" &&
      kachaApi.TERMINAL_STATUSES.has(payment.status)
    ) {
      payment.appliedAt = payment.appliedAt || new Date();
      payment.callbackPayload = payload;
      await payment.save({ transaction });
      return {
        payment: toPublic(payment),
        duplicate: true,
        sale: null,
      };
    }

    const extReference = String(
      payload.ext_reference || payload.extReference || "",
    ).trim();
    if (extReference && !payment.extReference) {
      payment.extReference = extReference;
    }

    // Soft verification via documented Status API when credentials work.
    // Never invent an undocumented signature check.
    if (status === "PROCESSED") {
      try {
        const remote = await kachaApi.getPaymentStatusByTrace(payment.traceNumber);
        if (remote?.status && remote.status !== "PROCESSED") {
          throw AppError.badRequest(
            `Kacha status API reports ${remote.status}, not PROCESSED`,
            "KACHA_STATUS_MISMATCH",
          );
        }
        if (
          remote?.amount != null &&
          decimal.cmpMoney(remote.amount, payment.amount) !== 0
        ) {
          throw AppError.badRequest(
            "Kacha status amount does not match the payment record",
            "KACHA_AMOUNT_MISMATCH",
          );
        }
      } catch (err) {
        if (err instanceof AppError && err.errorCode?.startsWith("KACHA_")) {
          throw err;
        }
        // Network / lookup failures: still accept PROCESSED only if amounts
        // match our stored record and references associate correctly.
      }
    }

    payment.callbackPayload = payload;
    payment.status =
      status === "CANCELLED" ? "CANCELED" : status;
    if (!["PENDING", "PROCESSED", "CANCELED", "EXPIRED", "FAILED"].includes(payment.status)) {
      payment.status = "FAILED";
    }

    let salePublic = null;

    if (payment.status === "PROCESSED") {
      const sale = await saleRepository.findByIdForUpdate(
        payment.saleId,
        transaction,
      );
      if (!sale) {
        throw AppError.notFound("Sale not found for Kacha payment");
      }

      const expected = decimal.money(payment.amount);
      if (decimal.cmpMoney(expected, 0) <= 0) {
        throw AppError.badRequest("Invalid stored payment amount");
      }

      const authRepository = require("../auth/auth.repository");
      const actor = await authRepository.findById(payment.initiatedBy);
      if (!actor) {
        throw AppError.badRequest("Payment initiator no longer exists");
      }

      if (sale.status === "DRAFT") {
        // Complete with trusted amount; stock posts here, not on dialog open.
        salePublic = await saleService.complete(
          sale.id,
          actor,
          {
            paidAmount: expected,
            paymentMethod: "Kacha",
            payFrom: "DIRECT",
          },
          { transaction },
        );
      } else if (sale.status === "COMPLETED") {
        const remaining = remainingOf(sale);
        if (decimal.cmpMoney(expected, remaining) > 0) {
          throw AppError.badRequest(
            "Callback amount exceeds remaining balance",
            "KACHA_AMOUNT_MISMATCH",
          );
        }
        salePublic = await saleService.recordPayment(
          sale.id,
          { amount: expected, paymentMethod: "Kacha" },
          actor,
          { transaction },
        );
      } else {
        throw AppError.badRequest(
          `Cannot apply Kacha payment to sale in status ${sale.status}`,
        );
      }
    }

    payment.appliedAt = new Date();
    await payment.save({ transaction });

    return {
      payment: toPublic(payment),
      duplicate: false,
      sale: salePublic,
    };
  });
};

exports.toPublic = toPublic;
