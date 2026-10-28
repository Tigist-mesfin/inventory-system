const express = require("express");
const catchAsync = require("../../shared/helpers/catchAsync.helper");
const { sendSuccess } = require("../../shared/helpers/response.helper");
const AppError = require("../../shared/errors/AppError");
const kachaPaymentService = require("../sales/kacha-payment.service");

const router = express.Router();

/**
 * Kacha payment status callback.
 *
 * Documented payload (Swagger):
 * {
 *   "ext_reference": "<Kacha internal reference>",
 *   "reference": "<merchant original reference / trace_number>",
 *   "status": "PROCESSED" | "CANCELED" | "FAILED" | "EXPIRED" | ...
 * }
 *
 * Official docs do not publish a callback signature algorithm. Do not invent one.
 * Application-level verification: reference association, stored amount, and
 * optional Status API reconciliation inside the payment service.
 */
router.post(
  "/payment",
  catchAsync(async (req, res) => {
    const body = req.body || {};
    if (!body.reference && !body.ext_reference && !body.extReference) {
      throw AppError.badRequest(
        "Missing Kacha payment reference",
        "KACHA_CALLBACK_INVALID",
      );
    }
    if (!body.status) {
      throw AppError.badRequest(
        "Missing Kacha payment status",
        "KACHA_CALLBACK_INVALID",
      );
    }

    const result = await kachaPaymentService.handleCallback(body);
    sendSuccess(res, {
      data: {
        payment: result.payment,
        duplicate: result.duplicate,
        saleId: result.sale?.id || result.payment.saleId,
      },
      message: result.duplicate
        ? "Callback already applied"
        : "Callback processed",
    });
  }),
);

module.exports = router;
