const mongoose = require('mongoose');

const ClinicServiceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  active: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('ClinicService', ClinicServiceSchema);
