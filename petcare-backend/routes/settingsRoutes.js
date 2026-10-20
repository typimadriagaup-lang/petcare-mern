const express = require('express');
const router = express.Router();
const ClinicSettings = require('../models/ClinicSettings');
const { requireAdmin } = require('../middleware/auth');
const { getSettings } = require('../utils/settings');
const { logActivity } = require('../utils/activity');

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

// Everyone can read the clinic hours (the booking form needs them)
router.get('/', async (req, res) => {
  res.json(await getSettings());
});

// Clinic Admin only
router.put('/', requireAdmin, async (req, res) => {
  try {
    const current = await getSettings();
    const b = req.body || {};
    const next = {
      clinicName: b.clinicName !== undefined ? String(b.clinicName).trim() : current.clinicName,
      openTime: b.openTime !== undefined ? String(b.openTime) : current.openTime,
      closeTime: b.closeTime !== undefined ? String(b.closeTime) : current.closeTime,
      slotMinutes: b.slotMinutes !== undefined ? Number(b.slotMinutes) : current.slotMinutes,
      bookingLimit: b.bookingLimit !== undefined ? Number(b.bookingLimit) : current.bookingLimit
    };

    if (next.clinicName.length < 2 || next.clinicName.length > 60) {
      return res.status(400).json({ message: 'Clinic name must be 2–60 characters.' });
    }
    if (!TIME_RE.test(next.openTime) || !TIME_RE.test(next.closeTime)) {
      return res.status(400).json({ message: 'Opening and closing times must be valid times.' });
    }
    if (next.openTime >= next.closeTime) {
      return res.status(400).json({ message: 'Closing time must be later than opening time.' });
    }
    if (![15, 30, 60].includes(next.slotMinutes)) {
      return res.status(400).json({ message: 'Appointment slots can be 15, 30 or 60 minutes.' });
    }
    if (!Number.isInteger(next.bookingLimit) || next.bookingLimit < 1 || next.bookingLimit > 20) {
      return res.status(400).json({ message: 'The booking limit must be a whole number from 1 to 20.' });
    }

    await ClinicSettings.findOneAndUpdate({ key: 'main' }, next, { upsert: true, new: true });
    await logActivity(req, 'settings.update',
      `Hours ${next.openTime}–${next.closeTime}, ${next.slotMinutes}-min slots, ${next.bookingLimit} bookings per 24h`);
    res.json(next);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
