const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Pet = require('../models/Pet');
const Appointment = require('../models/Appointment');
const MedicalRecord = require('../models/MedicalRecord');
const Reminder = require('../models/Reminder');
const { requireAdmin, STAFF_ROLES } = require('../middleware/auth');
const { logActivity } = require('../utils/activity');
const { FREEZE_DAYS, isFrozen, fmtDate } = require('../utils/freeze');

// Account enforcement for pet-owner accounts. Clinic Admin only.
router.use(requireAdmin);

const DAY_MS = 24 * 60 * 60 * 1000;

const shape = (u, petCount = 0) => {
  const frozen = isFrozen(u);
  return {
    _id: u._id,
    name: u.name,
    email: u.email,
    phone: u.phone || '',
    createdAt: u.createdAt,
    petCount,
    disabled: u.active === false,
    frozen,
    frozenUntil: frozen ? u.frozenUntil : null,
    daysLeft: frozen ? Math.ceil((new Date(u.frozenUntil) - Date.now()) / DAY_MS) : 0,
    freezeReason: frozen ? u.freezeReason : '',
    frozenAt: frozen ? u.frozenAt : null,
    frozenBy: frozen ? u.frozenBy : '',
    freezeCount: u.freezeCount || 0
  };
};

// Loads a pet-owner account; staff accounts and the admin's own account are off limits here
async function findOwner(req, res) {
  const target = await User.findById(req.params.id);
  if (!target) { res.status(404).json({ message: 'Account not found.' }); return null; }
  if (String(target._id) === req.userId) { res.status(400).json({ message: 'You can\u2019t do this to your own account.' }); return null; }
  if (STAFF_ROLES.includes(target.role)) { res.status(403).json({ message: 'Staff accounts are managed under Staff accounts.' }); return null; }
  return target;
}

// List every pet-owner account (frozen ones first)
router.get('/', async (req, res) => {
  try {
    const users = await User.find({ role: { $nin: STAFF_ROLES } }).sort({ createdAt: -1 });
    const counts = await Pet.aggregate([
      { $match: { owner: { $in: users.map((u) => u._id) } } },
      { $group: { _id: '$owner', n: { $sum: 1 } } }
    ]);
    const byOwner = new Map(counts.map((c) => [String(c._id), c.n]));
    const rows = users.map((u) => shape(u, byOwner.get(String(u._id)) || 0));
    rows.sort((a, b) => Number(b.frozen) - Number(a.frozen));
    res.json({ freezeDays: FREEZE_DAYS, accounts: rows });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Freeze for 30 days. A reason is required so there is a record of why.
router.post('/:id/freeze', async (req, res) => {
  try {
    const reason = String(req.body.reason || '').trim();
    if (reason.length < 5 || reason.length > 200) {
      return res.status(400).json({ message: 'Please give the rule that was broken (5\u2013200 characters).' });
    }
    const target = await findOwner(req, res);
    if (!target) return;
    if (isFrozen(target)) {
      return res.status(409).json({ message: `${target.name} is already frozen until ${fmtDate(target.frozenUntil)}.` });
    }

    target.frozenAt = new Date();
    target.frozenUntil = new Date(Date.now() + FREEZE_DAYS * DAY_MS);
    target.freezeReason = reason;
    target.frozenBy = req.user.name;
    target.freezeCount = (target.freezeCount || 0) + 1;
    await target.save();

    await logActivity(req, 'account.freeze', `Froze ${target.name} (${target.email}) for ${FREEZE_DAYS} days: ${reason}`);
    res.json(shape(target, await Pet.countDocuments({ owner: target._id })));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Lift a freeze early
router.post('/:id/unfreeze', async (req, res) => {
  try {
    const target = await findOwner(req, res);
    if (!target) return;
    if (!isFrozen(target)) return res.status(400).json({ message: `${target.name} isn\u2019t frozen.` });

    target.frozenUntil = null;
    target.frozenAt = null;
    target.freezeReason = '';
    target.frozenBy = '';
    await target.save();

    await logActivity(req, 'account.unfreeze', `Lifted the freeze on ${target.name} (${target.email})`);
    res.json(shape(target, await Pet.countDocuments({ owner: target._id })));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Permanently delete the account and everything it owns (pets, their records, reminders and appointments)
router.delete('/:id', async (req, res) => {
  try {
    const target = await findOwner(req, res);
    if (!target) return;

    const pets = await Pet.find({ owner: target._id }).select('_id');
    const petIds = pets.map((p) => p._id);
    await Promise.all([
      MedicalRecord.deleteMany({ pet: { $in: petIds } }),
      Reminder.deleteMany({ pet: { $in: petIds } }),
      Appointment.deleteMany({ pet: { $in: petIds } }),
      Pet.deleteMany({ owner: target._id })
    ]);
    await target.deleteOne();

    await logActivity(req, 'account.delete', `Deleted account ${target.name} (${target.email}) and ${petIds.length} pet(s)`);
    res.json({ message: 'Account deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
