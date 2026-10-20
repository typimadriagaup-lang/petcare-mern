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

function buildContent(name, otp, minutes, purpose = 'verify') {
  const isReset = purpose === 'reset';
  const safeName = String(name || 'there').replace(/[<>&"]/g, '');
  const label = isReset ? 'password reset' : 'verification';
  const heading = isReset ? 'Reset your password' : 'Verify your email';
  const intro = isReset
    ? 'enter this code to choose a new password for your PetCare account.'
    : 'enter this code to finish creating your PetCare account.';
  const ignore = isReset
    ? "If you didn't ask to reset your password, you can ignore this email."
    : "If you didn't create an account, you can ignore this email.";

  const subject = `${otp} is your PetCare ${label} code`;
  const text = `Hi ${name || 'there'},\n\nYour PetCare ${label} code is ${otp}. It expires in ${minutes} minutes.\n\n${ignore}`;
  const html = `
      <div style="font-family:Arial,sans-serif;max-width:420px;margin:auto;padding:24px;color:#1c1917">
        <h2 style="margin:0 0 8px">${heading}</h2>
        <p style="color:#57534e;font-size:14px">Hi ${safeName}, ${intro}</p>
        <div style="font-size:32px;font-weight:700;letter-spacing:8px;background:#ebf0eb;color:#48634e;text-align:center;padding:16px;border-radius:12px;margin:20px 0">${otp}</div>
        <p style="color:#78716c;font-size:12px">This code expires in ${minutes} minutes. ${ignore}</p>
      </div>`;
  return { subject, text, html };
}

// "PetCare <no-reply@petcare.com>"  ->  { name: 'PetCare', email: 'no-reply@petcare.com' }
function parseSender(value) {
  const m = String(value || '').match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  if (m) return { name: m[1].replace(/^"|"$/g, '') || 'PetCare', email: m[2].trim() };
  return { name: 'PetCare', email: String(value || '').trim() };
}

/**
 * Sends through Brevo's HTTPS API. Hosts like Render's free tier block SMTP
 * ports (587/465), but HTTPS (443) always works.
 * Needs BREVO_API_KEY and a verified sender (BREVO_SENDER_EMAIL) in Brevo.
 */
async function sendViaBrevo(to, content) {
  const senderEmail = process.env.BREVO_SENDER_EMAIL || parseSender(process.env.MAIL_FROM).email;
  const senderName = process.env.BREVO_SENDER_NAME || 'PetCare';
  if (!senderEmail) throw new Error('BREVO_SENDER_EMAIL is not set.');

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY,
      'content-type': 'application/json',
      accept: 'application/json'
    },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [{ email: to }],
      subject: content.subject,
      htmlContent: content.html,
      textContent: content.text
    })
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Brevo email failed (${res.status}): ${detail}`);
  }
}

/**
 * Delivers an email. Order of preference: Brevo HTTPS API -> SMTP -> console log (development only).
 */
async function deliver(to, content, devNote) {
  if (process.env.BREVO_API_KEY) {
    await sendViaBrevo(to, content);
    return;
  }

  const t = getTransporter();

  if (!t) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Email is not configured on the server.');
    }
    console.log(`[DEV] Email not configured. ${devNote} for ${to}`);
    return;
  }

  await t.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to,
    subject: content.subject,
    text: content.text,
    html: content.html
  });
}

// Sends a 6-digit code: purpose 'verify' (sign-up, default) or 'reset' (forgot password).
async function sendOtpEmail(to, name, otp, minutes, purpose = 'verify') {
  const content = buildContent(name, otp, minutes, purpose);
  await deliver(to, content, `${purpose === 'reset' ? 'Password reset' : 'Verification'} code: ${otp}`);
}

const esc = (s) => String(s ?? '').replace(/[<>&"]/g, '');

// items: [{ pet, title, dueDate, when }]   when = "today" | "in 3 days" ...
async function sendReminderEmail(to, name, items) {
  const subject = items.length === 1
    ? `Reminder: ${items[0].title} for ${items[0].pet} is due ${items[0].when}`
    : `You have ${items.length} PetCare reminders coming up`;
  const text =
    `Hi ${name || 'there'},\n\n` +
    items.map((i) => `- ${i.pet}: ${i.title} (${i.dueDate}, ${i.when})`).join('\n') +
    `\n\nBook a visit or manage your reminders in PetCare.\nYou can turn these emails off on the Reminders page.`;
  const rows = items.map((i) =>
    `<li style="margin:6px 0"><b>${esc(i.pet)}</b> &mdash; ${esc(i.title)}<br><span style="color:#78716c;font-size:12px">${esc(i.dueDate)} &middot; ${esc(i.when)}</span></li>`
  ).join('');
  const html = `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;color:#1c1917">
        <h2 style="margin:0 0 8px">Upcoming PetCare reminders</h2>
        <p style="color:#57534e;font-size:14px">Hi ${esc(name || 'there')}, here is what is coming up:</p>
        <ul style="padding-left:18px;font-size:14px">${rows}</ul>
        <p style="color:#78716c;font-size:12px">Open PetCare to book a visit or manage your reminders. You can turn these emails off on the Reminders page.</p>
      </div>`;
  await deliver(to, { subject, text, html }, `Reminder email "${subject}"`);
}

module.exports = { sendOtpEmail, sendReminderEmail };
