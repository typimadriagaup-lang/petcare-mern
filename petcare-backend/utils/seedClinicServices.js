const ClinicService = require('../models/ClinicService');

// These are the services pet owners can pick from when booking an appointment.
// Seeding them here means the Admin Clinic "Clinic Services" list starts in
// sync with what's actually offered on the Appointments booking form.
const DEFAULT_SERVICES = ['Annual Wellness Check', 'Vaccination Booster', 'Grooming'];

/**
 * Makes sure each default service exists at least once (case-insensitive),
 * without creating duplicates or touching services the admin already added.
 */
async function seedClinicServices() {
  try {
    const existing = await ClinicService.find();
    const existingNames = new Set(existing.map((s) => s.name.trim().toLowerCase()));

    const missing = DEFAULT_SERVICES.filter((name) => !existingNames.has(name.toLowerCase()));
    if (missing.length > 0) {
      await ClinicService.insertMany(missing.map((name) => ({ name })));
      console.log(`Seeded clinic services: ${missing.join(', ')}`);
    }
  } catch (err) {
    console.error('Could not seed clinic services:', err.message);
  }
}

module.exports = seedClinicServices;
