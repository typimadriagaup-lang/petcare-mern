const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, default: '' },
  city: { type: String, default: '' },
  avatar: { type: String, default: '' }, // stored as a base64 data URL
  role: { type: String, default: 'Pet Owner' },
  active: { type: Boolean, default: true }, // false = account disabled by the Clinic Admin

  // Email verification. Defaults to true so accounts that existed before OTP
  // verification (and the seeded admin/moderator) keep working; the register
  // route explicitly sets it to false for new sign-ups.
  emailVerified: { type: Boolean, default: true },
  otpHash: { type: String, default: '', select: false },
  otpExpiresAt: { type: Date, default: null },
  otpAttempts: { type: Number, default: 0 },
  otpLastSentAt: { type: Date, default: null },

  // Forgot-password code (kept separate from the sign-up code above)
  resetOtpHash: { type: String, default: '', select: false },
  resetOtpExpiresAt: { type: Date, default: null },
  resetOtpAttempts: { type: Number, default: 0 },
  resetOtpLastSentAt: { type: Date, default: null },

  // 30-day freeze for breaking the website rules (see routes/accountRoutes.js).
  // A freeze simply lapses when frozenUntil passes; nothing has to run to lift it.
  frozenUntil: { type: Date, default: null },
  frozenAt: { type: Date, default: null },
  freezeReason: { type: String, default: '' },
  frozenBy: { type: String, default: '' },
  freezeCount: { type: Number, default: 0 },

  // Email me when a reminder is 3 days away and on the day (see utils/reminderEmails.js)
  reminderEmails: { type: Boolean, default: true },

  // Appointment booking rate limit (see routes/appointmentRoutes.js)
  bookingWindowStart: { type: Date, default: null },
  bookingCount: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
