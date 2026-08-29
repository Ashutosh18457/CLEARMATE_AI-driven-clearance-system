let nodemailer;
try {
  nodemailer = require('nodemailer');
} catch (e) {
  nodemailer = null;
}
const logger = require('../config/logger');

/**
 * Creates and returns a Nodemailer transporter based on environment variables.
 */
const createTransporter = () => {
  // 1. Gmail SMTP or Custom SMTP Service
  if (nodemailer && process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT) || 587,
      secure: Number(process.env.EMAIL_PORT) === 465, // true for 465, false for 587
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  // 2. Gmail service shortcut
  if (nodemailer && process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }

  // 3. Fallback: Development logger transporter
  return {
    sendMail: async (options) => {
      logger.info(`📧 [DEV EMAIL FALLBACK] Email would be sent to: ${options.to}`);
      logger.info(`📧 Subject: ${options.subject}`);
      logger.info(`📧 Body:\n${options.text || options.html}`);
      return { messageId: `dev-mock-${Date.now()}` };
    },
  };
};

// ══════════════════════════════════════════════
// SHARED EMAIL HELPERS
// ══════════════════════════════════════════════

const EMAIL_FROM = () =>
  `"${process.env.EMAIL_FROM_NAME || 'ClearMate'}" <${process.env.EMAIL_FROM || process.env.EMAIL_USER || 'no-reply@sbjit.edu.in'}>`;

const baseStyle = `
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; }
  .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
  .header { text-align: center; margin-bottom: 24px; }
  .logo { display: inline-block; width: 44px; height: 44px; background: #4f46e5; border-radius: 10px; color: #ffffff; font-weight: bold; font-size: 20px; line-height: 44px; text-align: center; }
  .title { font-size: 20px; font-weight: 700; color: #0f172a; margin-top: 12px; }
  .content { color: #334155; font-size: 14px; line-height: 1.6; margin-bottom: 24px; }
  .btn-container { text-align: center; margin: 28px 0; }
  .btn { display: inline-block; background-color: #4f46e5; color: #ffffff !important; font-weight: 600; font-size: 14px; text-decoration: none; padding: 12px 28px; border-radius: 8px; box-shadow: 0 2px 4px rgba(79, 70, 229, 0.25); }
  .footer { font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 16px; margin-top: 24px; text-align: center; }
  .warning { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px; font-size: 12px; color: #92400e; border-radius: 4px; margin: 16px 0; }
  .alert-red { background: #fef2f2; border-left: 4px solid #ef4444; padding: 12px; font-size: 13px; color: #991b1b; border-radius: 4px; margin: 16px 0; }
  .alert-green { background: #f0fdf4; border-left: 4px solid #22c55e; padding: 12px; font-size: 13px; color: #166534; border-radius: 4px; margin: 16px 0; }
  .alert-blue { background: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px; font-size: 13px; color: #1e40af; border-radius: 4px; margin: 16px 0; }
`;

const footerHtml = `<div class="footer">&copy; ${new Date().getFullYear()} ClearMate AI-Driven Clearance System. All rights reserved.</div>`;

// ══════════════════════════════════════════════
// PASSWORD RESET EMAIL
// ══════════════════════════════════════════════

/**
 * Sends a password reset email to the user.
 * @param {Object} options
 * @param {string} options.email - Recipient email address
 * @param {string} options.resetUrl - Full password reset URL with token
 * @param {string} options.name - User's full name
 */
const sendPasswordResetEmail = async ({ email, resetUrl, name }) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: EMAIL_FROM(),
    to: email,
    subject: 'ClearMate — Secure Password Reset Request',
    text: `Hello ${name || 'User'},\n\nYou requested to reset your ClearMate password.\n\nPlease click on the following link to reset your password (valid for 15 minutes):\n${resetUrl}\n\nIf you did not request this password reset, please ignore this email and your password will remain unchanged.\n\nBest regards,\nClearMate Security Team`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>${baseStyle}</style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">CM</div>
            <div class="title">ClearMate Password Reset</div>
          </div>
          <div class="content">
            <p>Hello <strong>${name || 'User'}</strong>,</p>
            <p>We received a request to reset your password for your ClearMate account (<strong>${email}</strong>).</p>
            <div class="btn-container">
              <a href="${resetUrl}" class="btn" target="_blank">Reset My Password</a>
            </div>
            <div class="warning">
              ⏳ <strong>Security Notice:</strong> This reset link is valid for <strong>15 minutes only</strong>. If you did not make this request, you can safely ignore this email.
            </div>
            <p style="font-size: 12px; color: #64748b;">If the button above does not work, copy and paste this URL into your browser:<br>
            <a href="${resetUrl}" style="color: #4f46e5; word-break: break-all;">${resetUrl}</a></p>
          </div>
          ${footerHtml}
        </div>
      </body>
      </html>
    `,
  };

  return await transporter.sendMail(mailOptions);
};

// ══════════════════════════════════════════════
// CLEARANCE EVENT EMAIL TEMPLATES
// ══════════════════════════════════════════════

/**
 * Sends email to student when a clearance item/section is rejected.
 */
const sendClearanceRejectionEmail = async ({ email, name, itemTitle, stage, remarks }) => {
  const transporter = createTransporter();
  return transporter.sendMail({
    from: EMAIL_FROM(),
    to: email,
    subject: `ClearMate — Clearance Rejected at ${stage}`,
    html: `<!DOCTYPE html><html><head><style>${baseStyle}</style></head><body>
      <div class="container">
        <div class="header"><div class="logo">CM</div><div class="title">Clearance Rejected</div></div>
        <div class="content">
          <p>Hello <strong>${name}</strong>,</p>
          <p>Your clearance item <strong>"${itemTitle}"</strong> was <strong>rejected</strong> during the <strong>${stage}</strong> stage.</p>
          <div class="alert-red">
            📝 <strong>Remarks:</strong> ${remarks || 'No specific remarks provided.'}
          </div>
          <p>Please resolve the issue and re-initiate your clearance from the student portal.</p>
        </div>
        ${footerHtml}
      </div></body></html>`,
  }).catch((err) => logger.error('Failed to send rejection email', { email, error: err.message }));
};

/**
 * Sends email to student when clearance is fully completed.
 */
const sendClearanceCompletedEmail = async ({ email, name }) => {
  const transporter = createTransporter();
  return transporter.sendMail({
    from: EMAIL_FROM(),
    to: email,
    subject: 'ClearMate — Clearance Complete! 🎓',
    html: `<!DOCTYPE html><html><head><style>${baseStyle}</style></head><body>
      <div class="container">
        <div class="header"><div class="logo">CM</div><div class="title">Clearance Complete! 🎓</div></div>
        <div class="content">
          <p>Hello <strong>${name}</strong>,</p>
          <div class="alert-green">
            ✅ <strong>Congratulations!</strong> Your semester clearance has been fully approved by all reviewers including the HOD.
          </div>
          <p>Your clearance certificate will be generated shortly. You can download it from your student portal.</p>
        </div>
        ${footerHtml}
      </div></body></html>`,
  }).catch((err) => logger.error('Failed to send completion email', { email, error: err.message }));
};

/**
 * Sends email to a teacher when a new clearance item needs their review.
 */
const sendReviewRequestEmail = async ({ email, name, studentName, itemTitle }) => {
  const transporter = createTransporter();
  return transporter.sendMail({
    from: EMAIL_FROM(),
    to: email,
    subject: `ClearMate — New Clearance Review: ${itemTitle}`,
    html: `<!DOCTYPE html><html><head><style>${baseStyle}</style></head><body>
      <div class="container">
        <div class="header"><div class="logo">CM</div><div class="title">New Clearance Review</div></div>
        <div class="content">
          <p>Hello <strong>${name}</strong>,</p>
          <div class="alert-blue">
            📋 Student <strong>${studentName}</strong> has initiated clearance. Please review <strong>"${itemTitle}"</strong>.
          </div>
          <p>Log in to your ClearMate dashboard to approve or reject this item.</p>
        </div>
        ${footerHtml}
      </div></body></html>`,
  }).catch((err) => logger.error('Failed to send review request email', { email, error: err.message }));
};

module.exports = {
  sendPasswordResetEmail,
  sendClearanceRejectionEmail,
  sendClearanceCompletedEmail,
  sendReviewRequestEmail,
};
