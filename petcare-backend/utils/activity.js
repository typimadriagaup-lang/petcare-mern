const ActivityLog = require('../models/ActivityLog');

/**
 * Records who did what. Never throws: a logging problem must not break the
 * action itself.   logActivity(req, 'appointment.approve', 'Approved Grooming for Max')
 */
async function logActivity(req, action, details = '') {
  try {
    await ActivityLog.create({
      actor: req.user?._id,
      actorName: req.user?.name || '',
      actorRole: req.user?.role || '',
      action,
      details: String(details).slice(0, 300)
    });
  } catch (err) {
    console.error('Could not write activity log:', err.message);
  }
}

module.exports = { logActivity };
