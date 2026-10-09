const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, default: '' },
  city: { type: String, default: '' },
  avatar: { type: String, default: '' }, // stored as a base64 data URL
  role: { type: String, default: 'Pet Owner' },

  // Email verification. Defaults to true so accounts that existed before OTP
  // verification (and the seeded admin/moderator) keep working; the register
  // route explicitly sets it to false for new sign-ups.
  emailVerified: { type: Boolean, default: true },
  otpHash: { type: String, default: '', select: false },
  otpExpiresAt: { type: Date, default: null },
  otpAttempts: { type: Number, default: 0 },
  otpLastSentAt: { type: Date, default: null },

  // Appointment booking rate limit (see routes/appointmentRoutes.js)
  bookingWindowStart: { type: Date, default: null },
  bookingCount: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
