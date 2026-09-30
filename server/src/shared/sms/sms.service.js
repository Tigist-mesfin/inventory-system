const axios = require("axios");
const AppError = require("../errors/AppError");

/** Documented GeezSMS OTP endpoint (shortcode_id is optional). */
const DEFAULT_OTP_URL = "https://api.geezsms.com/api/v1/sms/otp";
/** Documented GeezSMS plain SMS send endpoint. */
const DEFAULT_SEND_URL = "https://api.geezsms.com/api/v1/sms/send";

const MAX_SMS_CHARS = 335;

const isConfigured = () => Boolean(process.env.GEEZ_SMS_TOKEN);

const otpUrl = () =>
  (process.env.GEEZ_SMS_URL && String(process.env.GEEZ_SMS_URL).trim()) ||
  DEFAULT_OTP_URL;

const sendUrl = () =>
  (process.env.GEEZ_SMS_SEND_URL && String(process.env.GEEZ_SMS_SEND_URL).trim()) ||
  DEFAULT_SEND_URL;

const normalizeEthPhone = (phone) => {
  if (!phone) return null;
  const normalized = String(phone).trim().replace(/^\+/, "");
  if (!/^2519\d{8}$/.test(normalized)) return null;
  return normalized;
};

const tokenParams = () => {
  const params = {
    token: String(process.env.GEEZ_SMS_TOKEN).trim(),
  };
  const shortcodeId = process.env.GEEZ_SMS_SHORTCODE_ID
    ? String(process.env.GEEZ_SMS_SHORTCODE_ID).trim()
    : "";
  if (shortcodeId) params.shortcode_id = shortcodeId;
  return params;
};

const mapGeezError = (err, url, phone) => {
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
      phone,
    });
  } else {
    console.error("[sms] GeezSMS request failed:", { status, phone });
  }

  if (status === 429) {
    return AppError.tooMany(
      "SMS provider rate limit reached. Please try again shortly.",
      "SMS_RATE_LIMITED",
    );
  }

  const tokenHint =
    typeof remoteMessage === "string" &&
    /token not found|api not found/i.test(remoteMessage)
      ? " Check GEEZ_SMS_TOKEN at https://geezsms.com/#/api"
      : "";

  return new AppError(
    `Failed to send SMS.${tokenHint}`,
    status && status >= 400 && status < 500 ? status : 502,
    "SMS_SEND_FAILED",
  );
};

/**
 * Build plain SMS text from title + body (GeezSMS has no separate title field).
 */
const formatMessage = (title, body) => {
  const t = String(title || "").trim();
  const b = String(body || "").trim();
  if (!t && !b) return "";
  if (!t) return b;
  if (!b) return t;
  return `${t}\n\n${b}`;
};

/**
 * Send an OTP SMS via GeezSMS.
 * @param {string} phone - Normalized phone starting with 2519
 * @returns {Promise<string>} 4-digit OTP from GeezSMS (response.data.code)
 */
const sendOtp = async (phone) => {
  if (!phone) {
    throw AppError.badRequest("Phone number is required", "SMS_PHONE_REQUIRED");
  }

  const normalized = normalizeEthPhone(phone);
  if (!normalized) {
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

  const params = { ...tokenParams(), phone: normalized };
  const url = otpUrl();
  let response;
  try {
    response = await axios.get(url, { params, timeout: 15000 });
  } catch (err) {
    throw mapGeezError(err, url, normalized);
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

/**
 * Send a plain text SMS via GeezSMS (/api/v1/sms/send).
 * @param {string} phone
 * @param {string} message - max 335 chars
 */
const sendMessage = async (phone, message) => {
  if (!phone) {
    throw AppError.badRequest("Phone number is required", "SMS_PHONE_REQUIRED");
  }

  const normalized = normalizeEthPhone(phone);
  if (!normalized) {
    throw AppError.badRequest(
      "Phone must be a valid Ethiopian mobile number (2519xxxxxxxx)",
      "SMS_PHONE_INVALID",
    );
  }

  const msg = String(message || "").trim();
  if (!msg) {
    throw AppError.badRequest("Message is required", "SMS_MESSAGE_REQUIRED");
  }
  if (msg.length > MAX_SMS_CHARS) {
    throw AppError.badRequest(
      `Message must be at most ${MAX_SMS_CHARS} characters`,
      "SMS_MESSAGE_TOO_LONG",
    );
  }

  if (!isConfigured()) {
    throw new AppError(
      "SMS is not configured (GEEZ_SMS_TOKEN)",
      500,
      "SMS_CONFIG_ERROR",
    );
  }

  const params = { ...tokenParams(), phone: normalized, msg };
  const url = sendUrl();
  try {
    await axios.get(url, { params, timeout: 20000 });
  } catch (err) {
    throw mapGeezError(err, url, normalized);
  }

  if (process.env.NODE_ENV !== "production") {
    console.log(`[sms] Message sent to ${normalized} (${msg.length} chars)`);
  }

  return { phone: normalized, length: msg.length };
};

module.exports = {
  sendOtp,
  sendMessage,
  formatMessage,
  normalizeEthPhone,
  isConfigured,
  MAX_SMS_CHARS,
};
