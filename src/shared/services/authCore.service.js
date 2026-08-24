// Actor-agnostic login/refresh logic. Auth services supply lookup functions,
// role claim, and active checks; this module owns password comparison and
// token signing so those pieces never drift across actors.
const bcrypt = require("bcrypt");
const AppError = require("../errors/AppError");
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} = require("../helpers/jwt.helper");

const resolveRole = (role, record) =>
  typeof role === "function" ? role(record) : role;

/**
 * @param {object} params
 * @param {(identifier: string) => Promise<object|null>} params.findWithPassword
 * @param {string} params.identifier
 * @param {string} params.password
 * @param {string|((record: object) => string)} params.role - JWT role claim (e.g. role name)
 * @param {string} params.type - JWT actor-type claim (currently always "USER")
 * @param {(record: object) => boolean} params.isActive
 */
exports.loginWithPassword = async ({
  findWithPassword,
  identifier,
  password,
  role,
  type,
  isActive,
}) => {
  const record = await findWithPassword(identifier);
  if (!record || !isActive(record))
    throw AppError.unauthorized("Invalid credentials");

  const match = await bcrypt.compare(password, record.password);
  if (!match) throw AppError.unauthorized("Invalid credentials");

  const accessToken = signAccessToken({
    id: record.id,
    role: resolveRole(role, record),
    type,
  });
  const refreshToken = signRefreshToken({ id: record.id, type });

  return { record, accessToken, refreshToken };
};

/**
 * @param {object} params
 * @param {string} params.token
 * @param {string} params.type
 * @param {(id: string) => Promise<object|null>} params.findById
 * @param {(record: object) => boolean} params.isActive
 * @param {string|((record: object) => string)} params.role
 */
exports.refreshAccessToken = async ({
  token,
  type,
  findById,
  isActive,
  role,
}) => {
  let decoded;
  try {
    decoded = verifyRefreshToken(token);
  } catch {
    throw AppError.unauthorized("Invalid refresh token");
  }
  if (decoded.type !== type) throw AppError.unauthorized("Invalid refresh token");

  const record = await findById(decoded.id);
  if (!record || !isActive(record))
    throw AppError.unauthorized("Account not active");

  const accessToken = signAccessToken({
    id: record.id,
    role: resolveRole(role, record),
    type,
  });
  return { accessToken };
};
