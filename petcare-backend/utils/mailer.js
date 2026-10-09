let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;

  const nodemailer = require('nodemailer'); // loaded lazily so dev mode works without SMTP
  const port = Number(SMTP_PORT) || 587;
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS }
  });
  return transporter;
}

/**
 * Sends the sign-up verification code. When SMTP isn't configured, the code is
 * logged to the console (development only) so the flow can still be tested.
 */
async function sendOtpEmail(to, name, otp, minutes) {
  const t = getTransporter();

  if (!t) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Email is not configured on the server.');
    }
    console.log(`[DEV] SMTP not configured. Verification code for ${to}: ${otp}`);
    return;
  }

  await t.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to,
    subject: `${otp} is your PetCare verification code`,
    text: `Hi ${name || 'there'},\n\nYour PetCare verification code is ${otp}. It expires in ${minutes} minutes.\n\nIf you didn't create an account, you can ignore this email.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:420px;margin:auto;padding:24px;color:#1c1917">
        <h2 style="margin:0 0 8px">Verify your email</h2>
        <p style="color:#57534e;font-size:14px">Hi ${String(name || 'there').replace(/[<>&"]/g, '')}, enter this code to finish creating your PetCare account.</p>
        <div style="font-size:32px;font-weight:700;letter-spacing:8px;background:#ebf0eb;color:#48634e;text-align:center;padding:16px;border-radius:12px;margin:20px 0">${otp}</div>
        <p style="color:#78716c;font-size:12px">This code expires in ${minutes} minutes. If you didn't create an account, you can ignore this email.</p>
      </div>`
  });
}

module.exports = { sendOtpEmail };
