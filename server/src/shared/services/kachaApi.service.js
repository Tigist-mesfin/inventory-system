const env = require("../../config/env");
const AppError = require("../errors/AppError");

const TERMINAL_STATUSES = new Set([
  "PROCESSED",
  "CANCELED",
  "CANCELLED",
  "EXPIRED",
  "FAILED",
]);

const normalizeStatus = (raw) => {
  const status = String(raw || "")
    .trim()
    .toUpperCase();
  if (status === "CANCELLED") return "CANCELED";
  return status;
};

const isConfigured = () =>
  Boolean(
    env.KACHA_ENABLED &&
      env.KACHA_API_BASE_URL &&
      env.KACHA_API_USERNAME &&
      env.KACHA_API_PASSWORD,
  );

const assertConfigured = () => {
  if (!env.KACHA_ENABLED) {
    throw AppError.badRequest(
      "Kacha integration is disabled",
      "KACHA_DISABLED",
    );
  }
  if (!env.KACHA_API_USERNAME || !env.KACHA_API_PASSWORD) {
    throw AppError.badRequest(
      "Kacha API credentials are not configured",
      "KACHA_NOT_CONFIGURED",
    );
  }
  if (!env.KACHA_API_BASE_URL) {
    throw AppError.badRequest(
      "Kacha API base URL is not configured",
      "KACHA_NOT_CONFIGURED",
    );
  }
};

const basicAuthHeader = () => {
  const token = Buffer.from(
    `${env.KACHA_API_USERNAME}:${env.KACHA_API_PASSWORD}`,
    "utf8",
  ).toString("base64");
  return `Basic ${token}`;
};

const parseJsonSafe = async (res) => {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
};

const kachaFetch = async (method, path, body) => {
  assertConfigured();
  const url = `${env.KACHA_API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  let res;
  try {
    res = await fetch(url, {
      method,
      headers: {
        Authorization: basicAuthHeader(),
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    throw AppError.badRequest(
      `Unable to reach Kacha API: ${err.message || "network error"}`,
      "KACHA_NETWORK_ERROR",
    );
  }

  const data = await parseJsonSafe(res);
  return { ok: res.ok, status: res.status, data };
};

/**
 * Exchange Mini App window.session token for verified full_name + phone.
 * Token is single-use (~5 minutes) per Kacha docs.
 */
const exchangeSessionToken = async (sessionToken) => {
  const token = String(sessionToken || "").trim();
  if (!token) {
    throw AppError.badRequest(
      "Kacha session token is required",
      "KACHA_SESSION_MISSING",
    );
  }

  const { ok, status, data } = await kachaFetch(
    "POST",
    "/orgs/miniapps/user_kyc",
    { session_token: token },
  );

  if (ok && data?.full_name && data?.phone) {
    return {
      fullName: String(data.full_name).trim(),
      phone: String(data.phone).trim(),
    };
  }

  const detail =
    data?.detail ||
    data?.session_token?.[0] ||
    data?.error?.detail ||
    data?.message ||
    "Invalid or expired Kacha session";

  if (status === 401) {
    throw AppError.unauthorized(
      "Kacha rejected Mini App credentials",
      "KACHA_AUTH_FAILED",
    );
  }
  if (status === 400) {
    throw AppError.unauthorized(String(detail), "KACHA_SESSION_INVALID");
  }
  throw AppError.badRequest(String(detail), "KACHA_KYC_FAILED");
};

/**
 * Create an in-app payment request. Returns the payment `reference` for
 * window.KachaSuperApp.requestPayment({ reference }).
 *
 * Per Kacha docs:
 * - `trace_number` = merchant unique id (we generate)
 * - response `reference` / `id` = value passed to the superapp bridge
 * - callback `reference` = merchant original reference (trace_number)
 * - callback `ext_reference` = Kacha internal reference
 */
const requestInAppPayment = async ({
  phone,
  amount,
  traceNumber,
  reason,
  callbackUrl,
}) => {
  const callback = String(callbackUrl || env.KACHA_CALLBACK_URL || "").trim();
  if (!callback) {
    throw AppError.badRequest(
      "Kacha callback URL is not configured",
      "KACHA_CALLBACK_MISSING",
    );
  }

  const { ok, status, data } = await kachaFetch(
    "POST",
    "/orgs/payment/request/in_app",
    {
      callback_url: callback,
      phone: String(phone).trim(),
      amount: Number(amount),
      trace_number: String(traceNumber).trim(),
      reason: String(reason || "payment").trim(),
    },
  );

  if (ok && data?.reference) {
    return {
      reference: String(data.reference),
      id: data.id != null ? String(data.id) : String(data.reference),
      phone: data.phone != null ? String(data.phone) : String(phone),
      amount: data.amount != null ? Number(data.amount) : Number(amount),
      traceNumber: data.trace_number != null
        ? String(data.trace_number)
        : String(traceNumber),
      status: normalizeStatus(data.status || "PENDING"),
      fee: data.fee != null ? Number(data.fee) : 0,
      message: data.message || data.detail || null,
      raw: data,
    };
  }

  const err = data?.error || data || {};
  const detail =
    err.detail || err.message || data?.detail || "Kacha payment request failed";
  const code = err.message || "KACHA_PAYMENT_REQUEST_FAILED";

  if (status === 401) {
    throw AppError.unauthorized(
      "Kacha rejected Mini App credentials",
      "KACHA_AUTH_FAILED",
    );
  }
  throw AppError.badRequest(String(detail), String(code).slice(0, 64));
};

/**
 * Official status lookup by merchant trace_number (documented Status API).
 * Used to reconcile callbacks — no invented signature scheme.
 */
const getPaymentStatusByTrace = async (traceNumber) => {
  const { ok, data } = await kachaFetch(
    "GET",
    `/orgs/payment/status?trace_number=${encodeURIComponent(String(traceNumber).trim())}`,
  );
  if (!ok || !data) {
    return null;
  }
  return {
    status: normalizeStatus(data.status),
    amount: data.amount != null ? Number(data.amount) : null,
    id: data.id != null ? String(data.id) : null,
    raw: data,
  };
};

module.exports = {
  isConfigured,
  assertConfigured,
  exchangeSessionToken,
  requestInAppPayment,
  getPaymentStatusByTrace,
  normalizeStatus,
  TERMINAL_STATUSES,
};
