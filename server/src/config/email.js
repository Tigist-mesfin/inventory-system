const env = require("./env");

const emailConfig = {
  host: env.SMTP_HOST,
  port: Number(env.SMTP_PORT) || 587,
  secure: env.SMTP_SECURE === "true",
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASSWORD,
  },
  from: {
    name: env.EMAIL_FROM_NAME || "Inventory Management System",
    address: env.EMAIL_FROM_ADDRESS,
  },
};

emailConfig.isConfigured = Boolean(
  emailConfig.host &&
    emailConfig.auth.user &&
    emailConfig.auth.pass &&
    emailConfig.from.address,
);

if (!emailConfig.isConfigured) {
  console.warn(
    "⚠️ SMTP is not configured — email sending will fail until set.",
  );
}

module.exports = emailConfig;
