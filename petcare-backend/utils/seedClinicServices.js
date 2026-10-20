const ClinicService = require('../models/ClinicService');

// These are the services pet owners can pick from when booking an appointment.
// Seeding them here means the Admin Clinic "Clinic Services" list starts in
// sync with what's actually offered on the Appointments booking form.
// petTypes = which kinds of pet the service is offered for ([] = every type).
const DEFAULT_SERVICES = [
  { name: 'Annual Wellness Check', petTypes: [], followUpDays: 365 },
  { name: 'General Consultation / Check-up', petTypes: [], followUpDays: 0 },
  { name: 'Vaccination Booster', petTypes: ['Dog', 'Cat', 'Rabbit'], followUpDays: 365 },
  { name: 'Anti-Rabies Vaccination', petTypes: ['Dog', 'Cat'], followUpDays: 365 },
  { name: 'Puppy / Kitten Starter Package', petTypes: ['Dog', 'Cat'], followUpDays: 21 },
  { name: 'Deworming', petTypes: ['Dog', 'Cat', 'Rabbit'], followUpDays: 90 },
  { name: 'Flea & Tick Treatment', petTypes: ['Dog', 'Cat', 'Rabbit'], followUpDays: 30 },
  { name: 'Spay / Neuter (Kapon)', petTypes: ['Dog', 'Cat', 'Rabbit'], followUpDays: 14 },
  { name: 'Grooming', petTypes: ['Dog', 'Cat', 'Rabbit'], followUpDays: 0 }
];

/**
 * Makes sure each default service exists at least once (case-insensitive),
 * without creating duplicates. Services created before pet types existed
 * (no petTypes field yet) get the default types once; after that the admin's
 * choices are never overwritten.
 */
async function seedClinicServices() {
  try {
    const existing = await ClinicService.find().lean();
    const byName = new Map(existing.map((s) => [s.name.trim().toLowerCase(), s]));

    const missing = DEFAULT_SERVICES.filter((d) => !byName.has(d.name.toLowerCase()));
    if (missing.length > 0) {
      await ClinicService.insertMany(missing);
      console.log(`Seeded clinic services: ${missing.map((m) => m.name).join(', ')}`);
    }

    for (const d of DEFAULT_SERVICES) {
      const found = byName.get(d.name.toLowerCase());
      if (!found) continue;
      const fill = {};
      if (found.petTypes === undefined) fill.petTypes = d.petTypes;
      if (found.followUpDays === undefined) fill.followUpDays = d.followUpDays;
      if (Object.keys(fill).length) await ClinicService.updateOne({ _id: found._id }, { $set: fill });
    }
  } catch (err) {
    console.error('Could not seed clinic services:', err.message);
  }
}

module.exports = seedClinicServices;
