require("dotenv").config();

module.exports = {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  APP_URL: process.env.APP_URL,
  APP_NAME: process.env.APP_NAME || "Inventory Management System",
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:5173",

  DB_HOST: process.env.DB_HOST,
  DB_PORT: parseInt(process.env.DB_PORT, 10),
  DB_NAME: process.env.DB_NAME,
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD,

  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN,
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN,

  ADMIN_SEED_FULLNAME: process.env.ADMIN_SEED_FULLNAME,
  ADMIN_SEED_USERNAME: process.env.ADMIN_SEED_USERNAME,
  ADMIN_SEED_PASSWORD: process.env.ADMIN_SEED_PASSWORD,
  ADMIN_SEED_PHONE: process.env.ADMIN_SEED_PHONE,

  DEMO_COMPANY_NAME:
    process.env.DEMO_COMPANY_NAME || "Abdu Building Materials",
  DEMO_COMPANY_USERNAME: process.env.DEMO_COMPANY_USERNAME || "abdu",
  DEMO_COMPANY_PASSWORD: process.env.DEMO_COMPANY_PASSWORD || "123456",
  DEMO_COMPANY_PHONE: process.env.DEMO_COMPANY_PHONE || "251911223344",
  DEMO_COMPANY_ADDRESS:
    process.env.DEMO_COMPANY_ADDRESS || "Merkato, Addis Ababa",

  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_SECURE: process.env.SMTP_SECURE,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASSWORD: process.env.SMTP_PASSWORD,
  EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME,
  EMAIL_FROM_ADDRESS: process.env.EMAIL_FROM_ADDRESS,

  AI_PROVIDER: process.env.AI_PROVIDER || "local",
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
  OPENAI_MODEL: process.env.OPENAI_MODEL || "gpt-4o-mini",
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
  GEMINI_MODEL: process.env.GEMINI_MODEL || "gemini-3.6-flash",

  VAT_RATE: parseFloat(process.env.VAT_RATE || "15"),
  COOKIE_SECURE:
    process.env.COOKIE_SECURE === "true" ||
    (process.env.NODE_ENV === "production" &&
      process.env.COOKIE_SECURE !== "false"),
  COOKIE_SAMESITE: (
    process.env.COOKIE_SAMESITE ||
    (process.env.NODE_ENV === "production" ? "none" : "lax")
  ).toLowerCase(),
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || "*",

  GEEZ_SMS_URL: process.env.GEEZ_SMS_URL || "",
  GEEZ_SMS_TOKEN: process.env.GEEZ_SMS_TOKEN || "",
  LOG_OTP: process.env.LOG_OTP === "true",
};
