const axios = require("axios");
const AppError = require("../errors/AppError");

const isConfigured = () =>
  Boolean(process.env.GEEZ_SMS_URL && process.env.GEEZ_SMS_TOKEN);

/**
 * Send an OTP SMS via GeezSMS.
 * GeezSMS generates and delivers a 4-digit OTP; this service returns
 * response.data.code so callers can persist that same value.
 *
 * Auth services/controllers must call this module — never axios/GeezSMS directly.
 *
 * @param {string} phone - Normalized phone (e.g. 2519xxxxxxxx)
 * @returns {Promise<string>} 4-digit OTP from GeezSMS (response.data.code)
 */
const sendOtp = async (phone) => {
  if (!phone) {
    throw AppError.badRequest("Phone number is required", "SMS_PHONE_REQUIRED");
  }

  if (!isConfigured()) {
    throw new AppError(
      "SMS is not configured (GEEZ_SMS_URL / GEEZ_SMS_TOKEN)",
      500,
      "SMS_CONFIG_ERROR",
    );
  }

  let response;
  try {
    response = await axios.post(
      process.env.GEEZ_SMS_URL,
      { phone },
      {
        headers: {
          "X-GeezSMS-Key": process.env.GEEZ_SMS_TOKEN,
          "Content-Type": "application/json",
        },
        timeout: 15000,
      },
    );
  } catch (err) {
    const status = err.response?.status;
    const remoteMessage =
      err.response?.data?.message ||
      err.response?.data?.error ||
      err.message;

    if (process.env.NODE_ENV !== "production") {
      console.error("[sms] GeezSMS request failed:", {
        status,
        message: remoteMessage,
        phone,
      });
    } else {
      console.error("[sms] GeezSMS request failed:", { status, phone });
    }

    if (status === 429) {
      throw AppError.tooMany(
        "SMS provider rate limit reached. Please try again shortly.",
        "SMS_RATE_LIMITED",
      );
    }

    throw new AppError(
      "Failed to send SMS. Please try again later.",
      status && status >= 400 && status < 500 ? status : 502,
      "SMS_SEND_FAILED",
    );
  }

  const code = response?.data?.code;
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
    console.log(`[sms] OTP sent to ${phone}: ${otp}`);
  }

  return otp;
};

module.exports = {
  sendOtp,
  isConfigured,
};
