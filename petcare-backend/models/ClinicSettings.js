const mongoose = require('mongoose');

// A single document (key: 'main') holding the clinic-wide settings the admin can change
const ClinicSettingsSchema = new mongoose.Schema({
  key: { type: String, default: 'main', unique: true },
  clinicName: { type: String, default: 'Dagupan Animal Clinic' },
  openTime: { type: String, default: '08:00' },    // HH:MM, 24-hour
  closeTime: { type: String, default: '17:00' },
  slotMinutes: { type: Number, default: 30 },      // 15 | 30 | 60
  bookingLimit: { type: Number, default: 5 }       // requests per owner per 24 hours
}, { timestamps: true });

module.exports = mongoose.model('ClinicSettings', ClinicSettingsSchema);
