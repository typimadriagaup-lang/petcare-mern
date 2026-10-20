const mongoose = require('mongoose');

const ClinicServiceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  active: { type: Boolean, default: true },
  // Pet types this service is offered for (Dog, Cat, ...). Empty = offered for every pet type.
  petTypes: { type: [String], default: [] },
  // Days after a visit before the owner is reminded to come back. 0 = no follow-up reminder.
  // Left unset on older services, which then fall back to sensible keyword defaults.
  followUpDays: { type: Number, min: 0, max: 3650 }
}, { timestamps: true });

module.exports = mongoose.model('ClinicService', ClinicServiceSchema);
