const mongoose = require('mongoose');

const MedicalRecordSchema = new mongoose.Schema({
  pet: { type: mongoose.Schema.Types.ObjectId, ref: 'Pet', required: true },
  title: { type: String, required: true },   // e.g. "Wellness Check"
  clinic: { type: String, required: true },  // e.g. "Dogwood Animal Clinic - Dr. Reyes"
  summary: { type: String, required: true }, // notes/description
  date: { type: String, required: true },
  recordType: { type: String, default: 'Treatment' }, // Vaccination | Treatment | Surgery — for filters

  // Set when the record was generated automatically from a completed appointment
  appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', default: null },
  source: { type: String, default: 'Manual' } // Manual | Appointment
}, { timestamps: true });

module.exports = mongoose.model('MedicalRecord', MedicalRecordSchema);
