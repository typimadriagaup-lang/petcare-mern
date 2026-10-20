const mongoose = require('mongoose');

// One row per important action by staff (approvals, deletions, settings, accounts…)
const ActivityLogSchema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  actorName: { type: String, default: '' },
  actorRole: { type: String, default: '' },
  action: { type: String, required: true },   // e.g. "appointment.approve"
  details: { type: String, default: '' }
}, { timestamps: true });

ActivityLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ActivityLog', ActivityLogSchema);
