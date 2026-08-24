const jwt = require('jsonwebtoken');
const env = require('../../config/env');

exports.signAccessToken = (payload) =>
  jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_EXPIRES_IN });

exports.signRefreshToken = (payload) =>
  jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRES_IN });

exports.verifyAccessToken = (token) => jwt.verify(token, env.JWT_ACCESS_SECRET);
exports.verifyRefreshToken = (token) => jwt.verify(token, env.JWT_REFRESH_SECRET);
