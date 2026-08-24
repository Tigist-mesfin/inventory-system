const ms = require("ms");
const env = require("../../config/env");

const baseCookieOptions = {
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: "strict",
  path: "/",
};

// Derived from the same env values jwt.helper.js signs tokens with, so the
// cookie can never silently outlive (or expire before) the JWT it holds.
const ACCESS_TOKEN_MAX_AGE = ms(env.JWT_ACCESS_EXPIRES_IN);
const REFRESH_TOKEN_MAX_AGE = ms(env.JWT_REFRESH_EXPIRES_IN);

exports.setAuthCookies = (res, { accessToken, refreshToken }) => {
  if (accessToken) {
    res.cookie("accessToken", accessToken, {
      ...baseCookieOptions,
      maxAge: ACCESS_TOKEN_MAX_AGE,
    });
  }
  if (refreshToken) {
    res.cookie("refreshToken", refreshToken, {
      ...baseCookieOptions,
      maxAge: REFRESH_TOKEN_MAX_AGE,
    });
  }
};

exports.clearAuthCookies = (res) => {
  res.clearCookie("accessToken", baseCookieOptions);
  res.clearCookie("refreshToken", baseCookieOptions);
};
