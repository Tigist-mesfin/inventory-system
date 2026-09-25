const { Op } = require("sequelize");
const AppError = require("../errors/AppError");
const phoneNormalize = require("../helpers/phoneNormalize.helper");
const smsService = require("../sms/sms.service");
const models = require("../../database/models");

const OTP_PURPOSES = Object.freeze({
  REGISTRATION: "REGISTRATION",
  PASSWORD_RESET: "PASSWORD_RESET",
  LOGIN: "LOGIN",
});

const OTP_EXPIRY_MS = 5 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

const assertPurpose = (purpose) => {
  if (!Object.values(OTP_PURPOSES).includes(purpose)) {
    throw AppError.badRequest(
      "Invalid OTP purpose",
      "OTP_PURPOSE_INVALID",
    );
  }
};

const normalizePhoneOrThrow = (phone) => {
  const normalized = phoneNormalize(phone) || String(phone || "").trim();
  if (!normalized) {
    throw AppError.badRequest("Enter a valid phone number", "OTP_PHONE_INVALID");
  }
  return normalized;
};

/**
 * Invalidate all unused OTPs for the same user/phone/purpose scope.
 */
const invalidatePreviousOtps = async ({
  userId = null,
  phone,
  purpose,
  transaction,
} = {}) => {
  const where = {
    phone,
    purpose,
    used: false,
  };
  if (userId) where.userId = userId;

  await models.Otp.update(
    { used: true },
    { where, transaction },
  );
};

/**
 * Enforce resend cooldown for the same phone + purpose.
 */
const assertResendAllowed = async ({ phone, purpose }) => {
  const latest = await models.Otp.findOne({
    where: { phone, purpose },
    order: [["createdAt", "DESC"]],
  });

  if (!latest) return;

  const elapsed = Date.now() - new Date(latest.createdAt).getTime();
  if (elapsed < OTP_RESEND_COOLDOWN_MS) {
    const retryAfterSec = Math.ceil((OTP_RESEND_COOLDOWN_MS - elapsed) / 1000);
    throw AppError.tooMany(
      `Please wait ${retryAfterSec}s before requesting another OTP.`,
      "OTP_RESEND_COOLDOWN",
    );
  }
};

/**
 * Request a new OTP from GeezSMS, invalidate prior unused codes, and store it.
 *
 * @param {object} params
 * @param {string|null} [params.userId]
 * @param {string} params.phone
 * @param {string} params.purpose - REGISTRATION | PASSWORD_RESET | LOGIN
 * @returns {Promise<{ expiresAt: Date, phone: string, purpose: string }>}
 */
const sendOtp = async ({ userId = null, phone, purpose }) => {
  assertPurpose(purpose);
  const normalizedPhone = normalizePhoneOrThrow(phone);

  await assertResendAllowed({ phone: normalizedPhone, purpose });

  const code = await smsService.sendOtp(normalizedPhone);

  await invalidatePreviousOtps({
    userId,
    phone: normalizedPhone,
    purpose,
  });

  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

  await models.Otp.create({
    userId,
    phone: normalizedPhone,
    otp: code,
    purpose,
    expiresAt,
    used: false,
    attemptCount: 0,
  });

  return {
    phone: normalizedPhone,
    purpose,
    expiresAt,
  };
};

/**
 * Verify an OTP for the given user/phone/purpose.
 * Distinguishes not-found, already-used, expired, incorrect, and max attempts.
 *
 * @param {object} params
 * @param {string|null} [params.userId]
 * @param {string} params.phone
 * @param {string} params.purpose
 * @param {string|number} params.code
 * @returns {Promise<{ verified: true, otpId: string, userId: string|null }>}
 */
const verifyOtp = async ({ userId = null, phone, purpose, code }) => {
  assertPurpose(purpose);
  const normalizedPhone = normalizePhoneOrThrow(phone);
  const submitted = String(code ?? "").trim();

  if (!/^\d{4}$/.test(submitted)) {
    throw AppError.badRequest("Enter a valid 4-digit OTP", "OTP_FORMAT_INVALID");
  }

  const where = {
    phone: normalizedPhone,
    purpose,
  };
  if (userId) where.userId = userId;

  const record = await models.Otp.findOne({
    where,
    order: [["createdAt", "DESC"]],
  });

  if (!record) {
    throw AppError.badRequest(
      "OTP not found. Request a new code.",
      "OTP_NOT_FOUND",
    );
  }

  if (record.used) {
    throw AppError.badRequest(
      "OTP has already been used",
      "OTP_ALREADY_USED",
    );
  }

  if (new Date(record.expiresAt).getTime() <= Date.now()) {
    throw AppError.badRequest("OTP has expired", "OTP_EXPIRED");
  }

  if (record.attemptCount >= OTP_MAX_ATTEMPTS) {
    await record.update({ used: true });
    throw AppError.tooMany(
      "Too many incorrect OTP attempts. Request a new code.",
      "OTP_MAX_ATTEMPTS",
    );
  }

  if (record.otp !== submitted) {
    const nextAttempts = record.attemptCount + 1;
    const exhausted = nextAttempts >= OTP_MAX_ATTEMPTS;
    await record.update({
      attemptCount: nextAttempts,
      used: exhausted ? true : record.used,
    });

    if (exhausted) {
      throw AppError.tooMany(
        "Too many incorrect OTP attempts. Request a new code.",
        "OTP_MAX_ATTEMPTS",
      );
    }

    throw AppError.badRequest("Incorrect OTP", "OTP_INCORRECT");
  }

  await record.update({ used: true });

  return {
    verified: true,
    otpId: record.id,
    userId: record.userId || null,
  };
};

module.exports = {
  OTP_PURPOSES,
  OTP_EXPIRY_MS,
  OTP_RESEND_COOLDOWN_MS,
  OTP_MAX_ATTEMPTS,
  sendOtp,
  verifyOtp,
  invalidatePreviousOtps,
  normalizePhoneOrThrow,
};
