const AppError = require("../errors/AppError");
const { sendMail, verifyConnection } = require("./mailer");
const templates = require("./templates");

const sendTemplateEmail = async (templateName, to, data = {}) => {
  const build = templates[templateName];
  if (!build) {
    throw AppError.badRequest(
      `Unknown email template: ${templateName}`,
      "EMAIL_TEMPLATE_NOT_FOUND",
    );
  }
  const { subject, html, text } = build(data);
  return sendMail({ to, subject, html, text });
};

module.exports = {
  sendEmail: sendMail,
  sendTemplateEmail,
  verifyConnection,
  sendWelcomeEmail: (to, data) => sendTemplateEmail("welcome", to, data),
  sendPasswordResetEmail: (to, data) =>
    sendTemplateEmail("passwordReset", to, data),
  sendNotificationEmail: (to, data) =>
    sendTemplateEmail("notification", to, data),
};
