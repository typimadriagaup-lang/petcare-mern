const express = require('express');
const router = express.Router();
const Reminder = require('../models/Reminder');
const Pet = require('../models/Pet');
const { protect, isStaffUser } = require('../middleware/auth');

// Owner may touch a reminder if its pet is theirs (or it isn't tied to a pet); staff may touch any
async function canTouch(req, reminder) {
  if (isStaffUser(req)) return true;
  if (!reminder.pet) return true;
  return !!(await Pet.exists({ _id: reminder.pet, owner: req.userId }));
}

// Get reminders, soonest due first.
// Pass ?mine=true with a Bearer token to get only the logged-in owner's
// reminders (their pets' reminders) — used by the pet-owner Reminders page.
// Called without ?mine (clinic staff) it returns every reminder clinic-wide.
router.get('/', protect, async (req, res) => {
  try {
    const filter = {};
    if (!isStaffUser(req) || req.query.mine === 'true') {
      const myPets = await Pet.find({ owner: req.userId }).select('_id');
      filter.pet = { $in: myPets.map((p) => p._id) };
    }

    const staff = isStaffUser(req) && req.query.mine !== 'true';
    const reminders = await Reminder.find(filter)
      .populate({ path: 'pet', select: 'name petId type owner', populate: { path: 'owner', select: 'name email phone' } })
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
        petCode: r.pet?.petId || '',
        petType: r.pet?.type || '',
        title: r.title,
        dueDate: r.dueDate,                  // used by Dashboard.jsx
        date: r.time ? `Due ${r.dueDate} at ${r.time}` : `Due ${r.dueDate}`,
        clinic: r.clinic,
        category: r.category,
        status,
        read: r.read,
        source: r.source,
        time: r.time || '',
        completedAt: r.completedAt || null,
        appointmentId: r.appointment || null,
        // clinic staff see who to contact about an overdue reminder
        ...(staff && r.pet?.owner ? {
          ownerName: r.pet.owner.name,
          ownerEmail: r.pet.owner.email,
          ownerPhone: r.pet.owner.phone || ''
        } : {})
      };
    });

    res.json(shaped);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a reminder (tags it to one of the logged-in owner's own pets, when a
// pet id is supplied, so it shows up correctly under ?mine=true)
router.post('/', protect, async (req, res) => {
  const { pet, petName, title, dueDate, time, clinic, category, status } = req.body;

  try {
    if (pet && !isStaffUser(req)) {
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
router.put('/mark-all-read', protect, async (req, res) => {
  try {
    const filter = {};
    if (!isStaffUser(req) || req.query.mine === 'true') {
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
router.put('/:id', protect, async (req, res) => {
  try {
    const current = await Reminder.findById(req.params.id);
    if (!current) return res.status(404).json({ message: 'Reminder not found' });
    if (!(await canTouch(req, current))) return res.status(403).json({ message: 'That reminder isn\u2019t yours.' });

    // Only these fields can be changed from the app
    const changes = {};
    ['title', 'dueDate', 'time', 'clinic', 'category', 'status', 'read'].forEach((k) => {
      if (req.body[k] !== undefined) changes[k] = req.body[k];
    });
    if (changes.status === 'Done') changes.completedAt = new Date();
    if (changes.status && changes.status !== 'Done') changes.completedAt = null;
    // moved to a new date (snooze) -> the email reminders can go out again
    if (changes.dueDate && changes.dueDate !== current.dueDate) { changes.notified3d = false; changes.notifiedDue = false; }

    const updated = await Reminder.findByIdAndUpdate(req.params.id, changes, { new: true, runValidators: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete a reminder
router.delete('/:id', protect, async (req, res) => {
  try {
    const current = await Reminder.findById(req.params.id);
    if (!current) return res.status(404).json({ message: 'Reminder not found' });
    if (!(await canTouch(req, current))) return res.status(403).json({ message: 'That reminder isn\u2019t yours.' });
    await Reminder.findByIdAndDelete(req.params.id);
    res.json({ message: 'Reminder deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
