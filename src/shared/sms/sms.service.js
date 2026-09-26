const axios = require("axios");
const AppError = require("../errors/AppError");

/** Documented GeezSMS OTP endpoint (shortcode_id is optional). */
const DEFAULT_OTP_URL = "https://api.geezsms.com/api/v1/sms/otp";

const isConfigured = () => Boolean(process.env.GEEZ_SMS_TOKEN);

const otpUrl = () =>
  (process.env.GEEZ_SMS_URL && String(process.env.GEEZ_SMS_URL).trim()) ||
  DEFAULT_OTP_URL;

/**
 * Send an OTP SMS via GeezSMS.
 * GeezSMS generates and delivers a 4-digit OTP; this service returns
 * response.data.code so callers can persist that same value.
 *
 * Auth services/controllers must call this module — never axios/GeezSMS directly.
 *
 * API (GET query params — shortcode_id optional):
 *   https://api.geezsms.com/api/v1/sms/otp?token=...&phone=2519...
 *
 * @param {string} phone - Normalized phone starting with 2519
 * @returns {Promise<string>} 4-digit OTP from GeezSMS (response.data.code)
 */
const sendOtp = async (phone) => {
  if (!phone) {
    throw AppError.badRequest("Phone number is required", "SMS_PHONE_REQUIRED");
  }

  const normalized = String(phone).trim().replace(/^\+/, "");
  if (!/^2519\d{8}$/.test(normalized)) {
    throw AppError.badRequest(
      "Phone must be a valid Ethiopian mobile number (2519xxxxxxxx)",
      "SMS_PHONE_INVALID",
    );
  }

  if (!isConfigured()) {
    throw new AppError(
      "SMS is not configured (GEEZ_SMS_TOKEN)",
      500,
      "SMS_CONFIG_ERROR",
    );
  }

  // Docs: token + phone required; shortcode_id optional (Geez default shortcode used).
  const params = {
    token: String(process.env.GEEZ_SMS_TOKEN).trim(),
    phone: normalized,
  };

  const shortcodeId = process.env.GEEZ_SMS_SHORTCODE_ID
    ? String(process.env.GEEZ_SMS_SHORTCODE_ID).trim()
    : "";
  if (shortcodeId) {
    params.shortcode_id = shortcodeId;
  }

  const url = otpUrl();
  let response;
  try {
    response = await axios.get(url, {
      params,
      timeout: 15000,
    });
  } catch (err) {
    const status = err.response?.status;
    const data = err.response?.data;
    const remoteMessage =
      (typeof data?.msg === "string" && data.msg) ||
      (typeof data?.message === "string" && data.message) ||
      (typeof data?.error === "string" && data.error) ||
      err.message;

    if (process.env.NODE_ENV !== "production") {
      console.error("[sms] GeezSMS request failed:", {
        status,
        message: remoteMessage,
        data,
        url,
        phone: normalized,
        usedShortcode: Boolean(shortcodeId),
      });
    } else {
      console.error("[sms] GeezSMS request failed:", { status, phone: normalized });
    }

    if (status === 429) {
      throw AppError.tooMany(
        "SMS provider rate limit reached. Please try again shortly.",
        "SMS_RATE_LIMITED",
      );
    }

    // GeezSMS often returns 404 + "API Not found" / "API token not found" for bad tokens.
    const tokenHint =
      typeof remoteMessage === "string" &&
      /token not found|api not found/i.test(remoteMessage)
        ? " Check GEEZ_SMS_TOKEN at https://geezsms.com/#/api"
        : "";

    throw new AppError(
      `Failed to send SMS.${tokenHint}`,
      status && status >= 400 && status < 500 ? status : 502,
      "SMS_SEND_FAILED",
    );
  }

  const code = response?.data?.code ?? response?.data?.data?.code;
  if (code == null || String(code).trim() === "") {
    throw new AppError(
      "SMS provider did not return an OTP code.",
      502,
      "SMS_OTP_MISSING",
    );
  }

  const otp = String(code).trim();
  if (!/^\d{4}$/.test(otp)) {
    throw new AppError(
      "SMS provider returned an unexpected OTP format.",
      502,
      "SMS_OTP_INVALID_FORMAT",
    );
  }

  if (process.env.LOG_OTP === "true" && process.env.NODE_ENV !== "production") {
    console.log(`[sms] OTP sent to ${normalized}: ${otp}`);
  }

  return otp;
};

module.exports = {
  sendOtp,
  isConfigured,
};
