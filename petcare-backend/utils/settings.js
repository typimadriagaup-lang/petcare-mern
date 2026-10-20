const ClinicSettings = require('../models/ClinicSettings');

const DEFAULTS = { clinicName: 'Dagupan Animal Clinic', openTime: '08:00', closeTime: '17:00', slotMinutes: 30, bookingLimit: 5 };

// Returns the clinic settings (falls back to defaults if the database is unreachable)
async function getSettings() {
  try {
    const doc = await ClinicSettings.findOneAndUpdate(
      { key: 'main' },
      { $setOnInsert: { key: 'main' } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    return {
      clinicName: doc.clinicName, openTime: doc.openTime, closeTime: doc.closeTime,
      slotMinutes: doc.slotMinutes, bookingLimit: doc.bookingLimit
    };
  } catch (err) {
    return { ...DEFAULTS };
  }
}

const fmt12 = (t) => {
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};

module.exports = { getSettings, fmt12, DEFAULTS };
