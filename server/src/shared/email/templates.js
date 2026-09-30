const emailConfig = require("../../config/email");

const layout = (title, bodyHtml) => `
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
            <tr>
              <td style="background:#111827;padding:20px 32px;">
                <span style="color:#ffffff;font-size:18px;font-weight:bold;">${emailConfig.from.name}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;color:#1f2937;font-size:15px;line-height:1.6;">
                <h2 style="margin:0 0 16px;font-size:20px;color:#111827;">${title}</h2>
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px;background:#f9fafb;color:#9ca3af;font-size:12px;">
                This is an automated message from ${emailConfig.from.name}. Please do not reply.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;

const templates = {
  welcome: ({ fullName } = {}) => {
    const name = fullName || "there";
    return {
      subject: `Welcome to ${emailConfig.from.name}!`,
      html: layout(
        "Welcome aboard!",
        `<p>Hi ${name},</p><p>Your account has been created successfully.</p>`,
      ),
      text: `Hi ${name}, your ${emailConfig.from.name} account has been created successfully.`,
    };
  },

  passwordReset: ({ fullName, code, expiryMinutes = 10 } = {}) => {
    const name = fullName || "there";
    return {
      subject: "Reset your password",
      html: layout(
        "Password reset request",
        `<p>Hi ${name},</p><p>Use the code below to reset your password. It expires in ${expiryMinutes} minutes.</p><p style="font-size:28px;letter-spacing:8px;font-weight:bold;text-align:center;">${code}</p>`,
      ),
      text: `Hi ${name}, your password reset code is ${code}. It expires in ${expiryMinutes} minutes.`,
    };
  },

  notification: ({ fullName, title, message } = {}) => {
    const name = fullName || "there";
    return {
      subject: title || "Notification",
      html: layout(
        title || "Notification",
        `<p>Hi ${name},</p><p>${message || ""}</p>`,
      ),
      text: `Hi ${name}, ${message || ""}`,
    };
  },
};

module.exports = templates;
