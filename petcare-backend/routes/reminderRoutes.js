const express = require('express');
const router = express.Router();
const Reminder = require('../models/Reminder');
const Pet = require('../models/Pet');
const { optionalAuth } = require('../middleware/auth');

// Get reminders, soonest due first.
// Pass ?mine=true with a Bearer token to get only the logged-in owner's
// reminders (their pets' reminders) — used by the pet-owner Reminders page.
// Called without ?mine (clinic staff) it returns every reminder clinic-wide.
router.get('/', optionalAuth, async (req, res) => {
  try {
    const filter = {};
    if (req.query.mine === 'true' && req.userId) {
      const myPets = await Pet.find({ owner: req.userId }).select('_id');
      filter.pet = { $in: myPets.map((p) => p._id) };
    }

    const reminders = await Reminder.find(filter)
      .populate('pet', 'name')
      .sort({ dueDate: 1 });

    const today = new Date().toISOString().slice(0, 10);

    const shaped = reminders.map((r) => {
      const name = r.pet?.name || r.petName || 'Unknown';

      // Anything still open but past its due date is reported as Overdue
      const status =
        r.status !== 'Done' && r.dueDate < today ? 'Overdue' : r.status;

      return {
        _id: r._id,
        pet: name,                           // used by Reminders.jsx
        petName: name,                       // used by Dashboard.jsx
        petId: r.pet?._id,
        title: r.title,
        dueDate: r.dueDate,                  // used by Dashboard.jsx
        date: r.time ? `Due ${r.dueDate} at ${r.time}` : `Due ${r.dueDate}`,
        clinic: r.clinic,
        category: r.category,
        status,
        read: r.read,
        source: r.source,
        appointmentId: r.appointment || null
      };
    });

    res.json(shaped);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a reminder (tags it to one of the logged-in owner's own pets, when a
// pet id is supplied, so it shows up correctly under ?mine=true)
router.post('/', optionalAuth, async (req, res) => {
  const { pet, petName, title, dueDate, time, clinic, category, status } = req.body;

  try {
    if (pet && req.userId) {
      const owned = await Pet.exists({ _id: pet, owner: req.userId });
      if (!owned) return res.status(403).json({ message: 'That pet doesn\u2019t belong to you' });
    }

    const newReminder = new Reminder({ pet: pet || undefined, petName, title, dueDate, time, clinic, category, status });
    const saved = await newReminder.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Mark every reminder in view as read (scoped the same way as the GET list —
// ?mine=true marks only the logged-in owner's own reminders as read).
router.put('/mark-all-read', optionalAuth, async (req, res) => {
  try {
    const filter = {};
    if (req.query.mine === 'true' && req.userId) {
      const myPets = await Pet.find({ owner: req.userId }).select('_id');
      filter.pet = { $in: myPets.map((p) => p._id) };
    }

    await Reminder.updateMany(filter, { read: true });
    res.json({ message: 'All reminders marked read' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update a reminder (e.g. mark done, snooze)
router.put('/:id', async (req, res) => {
  try {
    const updated = await Reminder.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: 'Reminder not found' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete a reminder
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Reminder.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Reminder not found' });
    res.json({ message: 'Reminder deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
