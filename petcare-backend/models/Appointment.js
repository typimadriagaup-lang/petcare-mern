const mongoose = require('mongoose');

const AppointmentSchema = new mongoose.Schema({
  pet: { type: mongoose.Schema.Types.ObjectId, ref: 'Pet' },
  petName: { type: String, required: true },
  date: { type: String, required: true },
  time: { type: String, default: '' },
  clinicBranch: { type: String, required: true },
  service: { type: String, required: true },
  status: { type: String, default: 'Scheduled' }, // Scheduled | Completed | Cancelled

  // Clinic admin approval. Every booking starts as Pending and only becomes
  // visible as a real appointment (and a reminder) once it is Approved.
  approvalStatus: { type: String, default: 'Pending' }, // Pending | Approved | Declined
  declineReason: { type: String, default: '' },
  decidedAt: { type: Date, default: null },

  queueStatus: { type: String, default: 'Waiting' } // Waiting | In Progress | Done
}, { timestamps: true });

module.exports = mongoose.model('Appointment', AppointmentSchema);
