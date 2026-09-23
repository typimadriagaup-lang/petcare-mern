const express = require('express');
const router = express.Router();
const Pet = require('../models/Pet');
const MedicalRecord = require('../models/MedicalRecord');
const Reminder = require('../models/Reminder');
const User = require('../models/User');
const { optionalAuth } = require('../middleware/auth');

// Get pets. Pass ?mine=true with a Bearer token to get only the logged-in
// owner's pets (used by the My Pets page); otherwise returns every pet.
router.get('/', optionalAuth, async (req, res) => {
  try {
    const filter = (req.query.mine === 'true' && req.userId) ? { owner: req.userId } : {};
    const pets = await Pet.find(filter).populate('owner', 'name').sort({ createdAt: -1 });

    // Prefer the real, current name of whoever the pet is linked to — this
    // also self-heals older pets stuck on the schema's old "Maria Santos"
    // default, without needing a data migration.
    const shaped = pets.map((p) => {
      const obj = p.toObject();
      obj.ownerName = obj.owner?.name || obj.ownerName || 'Unknown owner';
      obj.owner = obj.owner?._id || obj.owner || null;
      return obj;
    });

    res.json(shaped);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add new pet (tags it to the logged-in owner if a token was sent, and
// stamps the owner's real name so Patients/Admin Clinic show who it's
// actually theirs to rather than a leftover placeholder)
router.post('/', optionalAuth, async (req, res) => {
  const { name, type, breed, age, weight, image, ownerName } = req.body;

  let resolvedOwnerName = ownerName || 'Unknown owner';
  if (req.userId) {
    const user = await User.findById(req.userId).select('name');
    if (user?.name) resolvedOwnerName = user.name;
  }

  const newPet = new Pet({
    name,
    type,
    breed,
    age,
    weight,
    image,
    owner: req.userId || undefined,
    ownerName: resolvedOwnerName
  });

  try {
    const savedPet = await newPet.save();
    res.status(201).json(savedPet);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update a pet (e.g. vaccination status)
router.put('/:id', async (req, res) => {
  try {
    const updated = await Pet.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: 'Pet not found' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete a pet — also cleans up its medical records and reminders so
// nothing is left pointing at a pet that no longer exists.
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Pet.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Pet not found' });

    await Promise.all([
      MedicalRecord.deleteMany({ pet: req.params.id }),
      Reminder.deleteMany({ pet: req.params.id })
    ]);

    res.json({ message: 'Pet deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
