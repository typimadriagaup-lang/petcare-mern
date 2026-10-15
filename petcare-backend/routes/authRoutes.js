const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { sendOtpEmail } = require('../utils/mailer');

const OTP_TTL_MINUTES = 10;       // how long a code stays valid
const OTP_MAX_ATTEMPTS = 5;       // wrong guesses before the code is burned
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;

// Codes are stored hashed (HMAC), never in plain text.
const hashOtp = (email, otp) =>
  crypto.createHmac('sha256', process.env.JWT_SECRET).update(`${email}:${otp}`).digest('hex');

/**
 * Generates a fresh 6-digit code on the user, saves it and emails it.
 * Returns the seconds the client should wait before asking for another one.
 */
async function issueOtp(user) {
  const otp = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  user.otpHash = hashOtp(user.email, otp);
  user.otpExpiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
  user.otpAttempts = 0;
  user.otpLastSentAt = new Date();
  await user.save();
  await sendOtpEmail(user.email, user.name, otp, OTP_TTL_MINUTES);
  return OTP_RESEND_COOLDOWN_MS / 1000;
}

// REGISTER / SIGN UP — creates an unverified account and emails a 6-digit code
router.post('/register', async (req, res) => {
  try {
    const { password } = req.body;
    const firstName = String(req.body.firstName || '').trim();
    const lastName = String(req.body.lastName || '').trim();

    // Names: letters only, at least 2 letters each
    const NAME_RE = /^\p{L}{2,}$/u;
    if (!NAME_RE.test(firstName)) {
      return res.status(400).json({ message: 'First name must be letters only, at least 2 letters.' });
    }
    if (!NAME_RE.test(lastName)) {
      return res.status(400).json({ message: 'Last name must be letters only, at least 2 letters.' });
    }
    const name = `${firstName} ${lastName}`;

    if (typeof password === 'string' && /\s/.test(password)) {
      return res.status(400).json({ message: 'Password cannot contain spaces.' });
    }
    const email = (req.body.email || '').trim().toLowerCase();

    if (!password || password.length < 8 || !/\d/.test(password)) {
      return res.status(400).json({ message: 'Password must be at least 8 characters and include at least one number.' });
    }

    let user = await User.findOne({ email });
    if (user && user.emailVerified) return res.status(400).json({ message: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);

    if (user) {
      // Signed up before but never verified: let them retry with updated details.
      if (user.otpLastSentAt && Date.now() - user.otpLastSentAt.getTime() < OTP_RESEND_COOLDOWN_MS) {
        const wait = Math.ceil((OTP_RESEND_COOLDOWN_MS - (Date.now() - user.otpLastSentAt.getTime())) / 1000);
        return res.status(429).json({ message: `Please wait ${wait}s before requesting another code.`, retryAfter: wait });
      }
      user.name = name;
      user.password = hashedPassword;
    } else {
      // Sign-ups are always regular pet owners. The admin account is seeded
      // separately by utils/seedAdmin.js and can't be created from this form.
      user = new User({ name, email, password: hashedPassword, role: 'Pet Owner', emailVerified: false });
    }

    let retryAfter;
    try {
      retryAfter = await issueOtp(user);
    } catch (mailErr) {
      console.error('Could not send verification email:', mailErr.message);
      return res.status(502).json({ message: 'We couldn\u2019t send the verification email. Please try again shortly.' });
    }

    res.status(201).json({
      message: `We sent a 6-digit code to ${email}.`,
      email,
      requiresVerification: true,
      retryAfter
    });
  } catch (err) {
    res.status(500).json({ message: `Server error: ${err.message}`, error: err.message });
  }
});

// VERIFY EMAIL — checks the OTP and activates the account
router.post('/verify-email', async (req, res) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    const otp = String(req.body.otp || '').trim();

    const user = await User.findOne({ email }).select('+otpHash');
    if (!user) return res.status(400).json({ message: 'Invalid or expired code.' });
    if (user.emailVerified) return res.json({ message: 'Email already verified. You can sign in.' });

    if (!user.otpHash || !user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      return res.status(400).json({ message: 'This code has expired. Please request a new one.' });
    }
    if (user.otpAttempts >= OTP_MAX_ATTEMPTS) {
      return res.status(429).json({ message: 'Too many incorrect attempts. Please request a new code.' });
    }

    const expected = Buffer.from(user.otpHash, 'hex');
    const given = Buffer.from(hashOtp(email, otp), 'hex');
    if (!/^\d{6}$/.test(otp) || !crypto.timingSafeEqual(expected, given)) {
      user.otpAttempts += 1;
      await user.save();
      const left = OTP_MAX_ATTEMPTS - user.otpAttempts;
      return res.status(400).json({
        message: left > 0
          ? `Incorrect code. ${left} attempt${left === 1 ? '' : 's'} left.`
          : 'Too many incorrect attempts. Please request a new code.'
      });
    }

    user.emailVerified = true;
    user.otpHash = '';
    user.otpExpiresAt = null;
    user.otpAttempts = 0;
    await user.save();

    res.json({ message: 'Email verified! You can now sign in.' });
  } catch (err) {
    res.status(500).json({ message: `Server error: ${err.message}`, error: err.message });
  }
});

// RESEND OTP — 60s cooldown between codes
router.post('/resend-otp', async (req, res) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    const user = await User.findOne({ email });

    // Same response whether or not the account exists, so this can't be used
    // to discover which emails are registered.
    const generic = { message: 'If that account is awaiting verification, a new code has been sent.', retryAfter: OTP_RESEND_COOLDOWN_MS / 1000 };
    if (!user || user.emailVerified) return res.json(generic);

    if (user.otpLastSentAt) {
      const elapsed = Date.now() - user.otpLastSentAt.getTime();
      if (elapsed < OTP_RESEND_COOLDOWN_MS) {
        const wait = Math.ceil((OTP_RESEND_COOLDOWN_MS - elapsed) / 1000);
        return res.status(429).json({ message: `Please wait ${wait}s before requesting another code.`, retryAfter: wait });
      }
    }

    try {
      await issueOtp(user);
    } catch (mailErr) {
      console.error('Could not send verification email:', mailErr.message);
      return res.status(502).json({ message: 'We couldn\u2019t send the verification email. Please try again shortly.' });
    }
    res.json(generic);
  } catch (err) {
    res.status(500).json({ message: `Server error: ${err.message}`, error: err.message });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { password } = req.body;
    const email = (req.body.email || '').trim().toLowerCase();

    // Lookup is case-insensitive so older mixed-case records still work
    const user =
      (await User.findOne({ email })) ||
      (await User.findOne({ email: req.body.email }));

    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    if (user.emailVerified === false) {
      return res.status(403).json({
        message: 'Please verify your email before signing in.',
        needsVerification: true,
        email: user.email
      });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    // role is sent back so the frontend knows which dashboard to open
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    res.status(500).json({ message: `Server error: ${err.message}`, error: err.message });
  }
});

module.exports = router;
