const express = require('express');
const router = express.Router();
const MedicalRecord = require('../models/MedicalRecord');
const Pet = require('../models/Pet');
const Reminder = require('../models/Reminder');
const { createFollowUp } = require('../utils/followUps');
const { protect, requireStaff, requireAdmin, isStaffUser } = require('../middleware/auth');
const { logActivity } = require('../utils/activity');

// Get all medical records, newest first — shaped to match the frontend card fields directly.
// Pass ?mine=true with a Bearer token to scope this to the logged-in owner's pets only
// (used by the pet-owner Medical Records page); admins call this without the flag to see
// the clinic's full history.
router.get('/', protect, async (req, res) => {
  try {
    let filter = {};
    // Owners only ever see their own pets' records; staff see all unless ?mine=true
    if (!isStaffUser(req) || req.query.mine === 'true') {
      const myPets = await Pet.find({ owner: req.userId }).select('_id');
      filter = { pet: { $in: myPets.map((p) => p._id) } };
    }

    const records = await MedicalRecord.find(filter)
      .populate('pet', 'name petId')
      .sort({ createdAt: -1 });

    const shaped = records.map((r) => ({
      _id: r._id,
      title: r.title,
      clinic: r.clinic,
      summary: r.summary,
      date: r.date,
      pet: r.pet?.name || 'Unknown',
      petId: r.pet?._id,
      petCode: r.pet?.petId || '',
      recordType: r.recordType,
      source: r.source
    }));

    res.json(shaped);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all medical records for one pet
router.get('/pet/:petId', protect, async (req, res) => {
  try {
    if (!isStaffUser(req)) {
      const mine = await Pet.exists({ _id: req.params.petId, owner: req.userId });
      if (!mine) return res.status(403).json({ message: 'That pet doesn\u2019t belong to you.' });
    }
    const records = await MedicalRecord.find({ pet: req.params.petId }).sort({ createdAt: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a new medical record
router.post('/', requireStaff, async (req, res) => {
  const { pet, title, clinic, summary, date, recordType } = req.body;

  try {
    const newRecord = new MedicalRecord({ pet, title, clinic, summary, date, recordType });
    const saved = await newRecord.save();
    await logActivity(req, 'record.add', `Added record "${saved.title}"`);
    const petDoc = await Pet.findById(saved.pet).select('name');
    await createFollowUp({
      petId: saved.pet, petName: petDoc?.name, text: saved.title,
      doneDate: saved.date, clinic: saved.clinic, recordId: saved._id
    });
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update a medical record
router.put('/:id', requireStaff, async (req, res) => {
  try {
    const updated = await MedicalRecord.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: 'Record not found' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete a medical record
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const deleted = await MedicalRecord.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Record not found' });
    await Reminder.deleteMany({ record: deleted._id, status: { $ne: 'Done' } }); // its open follow-up goes too
    await logActivity(req, 'record.delete', `Deleted record "${deleted.title}"`);
    res.json({ message: 'Record deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
