const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const env = require('../../config/env');

const PASSWORD_RESET_PURPOSE = "PASSWORD_RESET";
const PASSWORD_RESET_EXPIRES_IN = "15m";

exports.signAccessToken = (payload) =>
  jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_EXPIRES_IN });

exports.signRefreshToken = (payload) =>
  jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRES_IN });

exports.verifyAccessToken = (token) => jwt.verify(token, env.JWT_ACCESS_SECRET);
exports.verifyRefreshToken = (token) => jwt.verify(token, env.JWT_REFRESH_SECRET);

/** Short-lived token issued only after a verified PASSWORD_RESET OTP. */
exports.signPasswordResetToken = ({ id }) =>
  jwt.sign(
    { id, purpose: PASSWORD_RESET_PURPOSE, type: "USER" },
    env.JWT_ACCESS_SECRET,
    { expiresIn: PASSWORD_RESET_EXPIRES_IN },
  );

exports.verifyPasswordResetToken = (token) => {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
  if (decoded.purpose !== PASSWORD_RESET_PURPOSE || !decoded.id) {
    const err = new Error("Invalid password reset token");
    err.name = "JsonWebTokenError";
    throw err;
  }
  return decoded;
};

const uuidToBuf = (id) => Buffer.from(String(id).replace(/-/g, ""), "hex");

const bufToUuid = (buf) => {
  const hex = buf.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

const signCompact = (kind, id) => {
  const idBuf = uuidToBuf(id);
  if (idBuf.length !== 16) {
    throw new Error("Invalid id for share token");
  }
  const mac = crypto
    .createHmac("sha256", env.JWT_ACCESS_SECRET)
    .update(`${kind}:${idBuf.toString("hex")}`)
    .digest()
    .subarray(0, 8);
  return Buffer.concat([idBuf, mac]).toString("base64url");
};

const readCompact = (kind, token) => {
  if (!token || String(token).includes(".")) return null;
  let buf;
  try {
    buf = Buffer.from(String(token), "base64url");
  } catch {
    return null;
  }
  if (buf.length !== 24) return null;
  const idBuf = buf.subarray(0, 16);
  const mac = buf.subarray(16);
  const expected = crypto
    .createHmac("sha256", env.JWT_ACCESS_SECRET)
    .update(`${kind}:${idBuf.toString("hex")}`)
    .digest()
    .subarray(0, 8);
  if (!crypto.timingSafeEqual(mac, expected)) return null;
  return bufToUuid(idBuf);
};

exports.signProformaToken = (orderId) => signCompact("proforma", orderId);

exports.verifyProformaToken = (token) => {
  const orderId = readCompact("proforma", token);
  if (orderId) return { typ: "proforma", oid: orderId };
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
  return payload;
};

exports.signInvoiceToken = (saleId) => signCompact("invoice", saleId);

exports.verifyInvoiceToken = (token) => {
  const saleId = readCompact("invoice", token);
  if (saleId) return { typ: "invoice", sid: saleId };
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
  return payload;
};
