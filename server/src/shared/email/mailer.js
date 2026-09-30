// src/shared/email/mailer.js
const nodemailer = require("nodemailer");
const emailConfig = require("../../config/email");
const AppError = require("../errors/AppError");

let transporter;

const getTransporter = () => {
  if (!emailConfig.isConfigured) {
    throw new AppError(
      "SMTP is not configured (SMTP_HOST/SMTP_USER/SMTP_PASSWORD)",
      500,
      "EMAIL_CONFIG_ERROR",
    );
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.secure,
      auth: emailConfig.auth,
    });
  }

  return transporter;
};

/**
 * Low-level send — every template/convenience function in email.service.js
 * funnels through here, so retry/logging/error-shape only lives in one place.
 */
const sendMail = async ({ to, subject, html, text, cc, bcc, replyTo, attachments }) => {
  if (!to || !subject || (!html && !text)) {
    throw AppError.badRequest(
      "to, subject and html or text are required",
      "EMAIL_MISSING_PARAMS",
    );
  }

  const tx = getTransporter();

  try {
    const info = await tx.sendMail({
      from: `"${emailConfig.from.name}" <${emailConfig.from.address}>`,
      to,
      cc,
      bcc,
      replyTo,
      subject,
      html,
      text,
      attachments,
    });
    console.log(`✅ Email sent to ${to} (${subject}): ${info.messageId}`);
    return info;
  } catch (error) {
    if (error instanceof AppError) throw error;
    console.error(`❌ Email failed for ${to} (${subject}):`, error.message);
    throw new AppError(
      error.message || "Failed to send email",
      502,
      "EMAIL_SEND_ERROR",
    );
  }
};

/** Verifies SMTP credentials/connectivity — useful for a startup check or admin diagnostics endpoint. */
const verifyConnection = () => getTransporter().verify();

module.exports = { sendMail, verifyConnection };
