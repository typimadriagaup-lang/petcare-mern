const express = require('express');
const router = express.Router();
const MedicalRecord = require('../models/MedicalRecord');
const Pet = require('../models/Pet');
const { optionalAuth } = require('../middleware/auth');

// Get all medical records, newest first — shaped to match the frontend card fields directly.
// Pass ?mine=true with a Bearer token to scope this to the logged-in owner's pets only
// (used by the pet-owner Medical Records page); admins call this without the flag to see
// the clinic's full history.
router.get('/', optionalAuth, async (req, res) => {
  try {
    let filter = {};
    if (req.query.mine === 'true' && req.userId) {
      const myPets = await Pet.find({ owner: req.userId }).select('_id');
      filter = { pet: { $in: myPets.map((p) => p._id) } };
    }

    const records = await MedicalRecord.find(filter)
      .populate('pet', 'name')
      .sort({ createdAt: -1 });

    const shaped = records.map((r) => ({
      _id: r._id,
      title: r.title,
      clinic: r.clinic,
      summary: r.summary,
      date: r.date,
      pet: r.pet?.name || 'Unknown',
      petId: r.pet?._id,
      recordType: r.recordType,
      source: r.source
    }));

    res.json(shaped);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all medical records for one pet
router.get('/pet/:petId', async (req, res) => {
  try {
    const records = await MedicalRecord.find({ pet: req.params.petId }).sort({ createdAt: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a new medical record
router.post('/', async (req, res) => {
  const { pet, title, clinic, summary, date, recordType } = req.body;

  try {
    const newRecord = new MedicalRecord({ pet, title, clinic, summary, date, recordType });
    const saved = await newRecord.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update a medical record
router.put('/:id', async (req, res) => {
  try {
    const updated = await MedicalRecord.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: 'Record not found' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete a medical record
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await MedicalRecord.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Record not found' });
    res.json({ message: 'Record deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
