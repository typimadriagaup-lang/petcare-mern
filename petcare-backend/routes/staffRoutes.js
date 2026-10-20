const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { requireAdmin, MODERATOR_ROLE, STAFF_ROLES } = require('../middleware/auth');
const { logActivity } = require('../utils/activity');

// Every route here is Clinic Admin only
router.use(requireAdmin);

const shape = (u) => ({
  _id: u._id, name: u.name, email: u.email, role: u.role,
  active: u.active !== false, createdAt: u.createdAt
});

// List staff accounts
router.get('/', async (req, res) => {
  try {
    const staff = await User.find({ role: { $in: STAFF_ROLES } }).sort({ createdAt: 1 });
    res.json(staff.map(shape));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a Moderator (Veterinary Staff) account
router.post('/', async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = req.body.password;

    if (!/^\p{L}[\p{L} '\-.]{1,39}$/u.test(name)) {
      return res.status(400).json({ message: 'Name must be 2–40 letters.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'Enter a valid email address.' });
    }
    if (typeof password !== 'string' || password.length < 8 || !/\d/.test(password) || /\s/.test(password)) {
      return res.status(400).json({ message: 'Password must be at least 8 characters with a number and no spaces.' });
    }
    if (await User.findOne({ email })) {
      return res.status(409).json({ message: 'An account with that email already exists.' });
    }

    const created = await User.create({
      name, email, role: MODERATOR_ROLE, emailVerified: true, active: true,
      password: await bcrypt.hash(password, 10)
    });
    await logActivity(req, 'staff.create', `Created staff account for ${name} (${email})`);
    res.status(201).json(shape(created));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Only Moderators can be changed here, never the admin or yourself
async function findModerator(req, res) {
  const target = await User.findById(req.params.id);
  if (!target) { res.status(404).json({ message: 'Account not found.' }); return null; }
  if (String(target._id) === req.userId) { res.status(400).json({ message: 'You can’t change your own account here.' }); return null; }
  if (target.role !== MODERATOR_ROLE) { res.status(403).json({ message: 'Only Veterinary Staff accounts can be changed here.' }); return null; }
  return target;
}

// Disable or re-enable an account
router.patch('/:id/active', async (req, res) => {
  try {
    const target = await findModerator(req, res);
    if (!target) return;
    target.active = !!req.body.active;
    await target.save();
    await logActivity(req, target.active ? 'staff.enable' : 'staff.disable', `${target.active ? 'Enabled' : 'Disabled'} ${target.name} (${target.email})`);
    res.json(shape(target));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Remove an account
router.delete('/:id', async (req, res) => {
  try {
    const target = await findModerator(req, res);
    if (!target) return;
    await target.deleteOne();
    await logActivity(req, 'staff.delete', `Removed staff account ${target.name} (${target.email})`);
    res.json({ message: 'Account removed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
