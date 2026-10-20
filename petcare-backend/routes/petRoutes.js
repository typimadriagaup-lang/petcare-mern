const express = require('express');
const router = express.Router();
const Pet = require('../models/Pet');
const MedicalRecord = require('../models/MedicalRecord');
const Reminder = require('../models/Reminder');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const { protect, isStaffUser, isAdminUser } = require('../middleware/auth');
const { logActivity } = require('../utils/activity');

// Owner of the pet, or (when allowed) staff
async function ownsPet(req, petId) {
  return !!(await Pet.exists({ _id: petId, owner: req.userId }));
}


const PET_TYPES = ['Dog', 'Cat', 'Rabbit', 'Bird', 'Hamster', 'Other'];
const NAME_RE = /^[\p{L}][\p{L} '\-.]{1,29}$/u;

// "3 years 2 months" / "5 months" from a YYYY-MM-DD birthdate
function ageFromBirthdate(birthdate) {
  const b = new Date(`${birthdate}T00:00:00`);
  if (isNaN(b)) return '';
  const now = new Date();
  let months = (now.getFullYear() - b.getFullYear()) * 12 + (now.getMonth() - b.getMonth());
  if (now.getDate() < b.getDate()) months -= 1;
  if (months < 0) months = 0;
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (y === 0) return m <= 1 ? (m === 0 ? 'Under 1 month' : '1 month') : `${m} months`;
  const yPart = `${y} ${y === 1 ? 'year' : 'years'}`;
  return m === 0 ? yPart : `${yPart} ${m} ${m === 1 ? 'month' : 'months'}`;
}

// Validates the fields that are present. Returns an error message or null.
function validatePet(b) {
  if ('name' in b && !NAME_RE.test(String(b.name || '').trim())) {
    return 'Pet name must be 2–30 characters and use letters only (spaces, hyphens and apostrophes are fine).';
  }
  if ('type' in b && !PET_TYPES.includes(b.type)) return 'Please choose a valid pet type.';
  if ('breed' in b) {
    const br = String(b.breed || '').trim();
    if (br.length < 2 || br.length > 40) return 'Please choose or enter a breed (2–40 characters).';
  }
  if ('birthdate' in b && b.birthdate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(b.birthdate) || isNaN(new Date(`${b.birthdate}T00:00:00`))) {
      return 'Birthdate is not a valid date.';
    }
    const d = new Date(`${b.birthdate}T00:00:00`);
    const oldest = new Date(); oldest.setFullYear(oldest.getFullYear() - 30);
    if (d > new Date()) return 'Birthdate can’t be in the future.';
    if (d < oldest) return 'Birthdate can’t be more than 30 years ago.';
  }
  if ('weight' in b) {
    const w = parseFloat(String(b.weight));
    if (!(w > 0 && w <= 150)) return 'Weight must be greater than 0 and at most 150 kg.';
  }
  if ('sex' in b && b.sex && !['Male', 'Female'].includes(b.sex)) return 'Sex must be Male or Female.';
  if ('color' in b && String(b.color || '').length > 40) return 'Color / markings is too long (40 characters max).';
  if ('allergies' in b && String(b.allergies || '').length > 300) return 'Allergies / conditions is too long (300 characters max).';
  return null;
}

// Keeps only the fields a client may set, trimmed
function cleanPet(b) {
  const out = {};
  ['name', 'type', 'breed', 'birthdate', 'weight', 'sex', 'color', 'allergies', 'age', 'image', 'status']
    .forEach((k) => { if (k in b && b[k] !== undefined) out[k] = typeof b[k] === 'string' ? b[k].trim() : b[k]; });
  if ('neutered' in b) out.neutered = !!b.neutered;
  if (out.birthdate) out.age = ageFromBirthdate(out.birthdate);
  return out;
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Get pets. Pass ?mine=true with a Bearer token to get only the logged-in
// owner's pets (used by the My Pets page); otherwise returns every pet.
router.get('/', protect, async (req, res) => {
  try {
    // Owners only ever get their own pets; staff get every pet unless ?mine=true
    const filter = (!isStaffUser(req) || req.query.mine === 'true') ? { owner: req.userId } : {};
    const pets = await Pet.find(filter).populate('owner', 'name').sort({ createdAt: -1 });

    // Prefer the real, current name of whoever the pet is linked to — this
    // also self-heals older pets stuck on the schema's old "Maria Santos"
    // default, without needing a data migration.
    const shaped = pets.map((p) => {
      const obj = p.toObject();
      obj.ownerName = obj.owner?.name || obj.ownerName || 'Unknown owner';
      obj.owner = obj.owner?._id || obj.owner || null;
      if (obj.birthdate) obj.age = ageFromBirthdate(obj.birthdate); // never goes stale
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
router.post('/', protect, async (req, res) => {
  const data = cleanPet(req.body);
  const problem = validatePet({ ...data, name: data.name, type: data.type, breed: data.breed, weight: data.weight });
  if (problem) return res.status(400).json({ message: problem });
  if (!data.birthdate && !data.age) return res.status(400).json({ message: 'Please enter the pet’s birthdate.' });

  let resolvedOwnerName = req.body.ownerName || 'Unknown owner';
  if (req.userId) {
    const user = await User.findById(req.userId).select('name');
    if (user?.name) resolvedOwnerName = user.name;

    // Same owner, same name + breed -> almost certainly a double entry
    const dup = await Pet.findOne({
      owner: req.userId,
      name: new RegExp(`^${escapeRe(data.name)}$`, 'i'),
      breed: new RegExp(`^${escapeRe(data.breed)}$`, 'i')
    });
    if (dup) return res.status(409).json({ message: `You already have a ${data.breed} named ${dup.name}.` });
  }


  try {
    const savedPet = await new Pet({
      ...data,
      weight: /kg$/i.test(String(data.weight)) ? data.weight : `${data.weight} kg`,
      owner: req.userId || undefined,
      ownerName: resolvedOwnerName
    }).save();
    res.status(201).json(savedPet);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update a pet (e.g. vaccination status)
router.put('/:id', protect, async (req, res) => {
  try {
    const data = cleanPet(req.body);
    const problem = validatePet(data);
    if (problem) return res.status(400).json({ message: problem });
    if ('weight' in data && !/kg$/i.test(String(data.weight))) data.weight = `${data.weight} kg`;

    const current = await Pet.findById(req.params.id);
    if (!current) return res.status(404).json({ message: 'Pet not found' });
    if (!isStaffUser(req) && String(current.owner) !== req.userId) {
      return res.status(403).json({ message: 'That pet doesn\u2019t belong to you.' });
    }

    const name = data.name || current.name;
    const breed = data.breed || current.breed;
    if (current.owner && ('name' in data || 'breed' in data)) {
      const dup = await Pet.findOne({
        _id: { $ne: current._id },
        owner: current.owner,
        name: new RegExp(`^${escapeRe(name)}$`, 'i'),
        breed: new RegExp(`^${escapeRe(breed)}$`, 'i')
      });
      if (dup) return res.status(409).json({ message: `You already have a ${breed} named ${dup.name}.` });
    }

    const updated = await Pet.findByIdAndUpdate(req.params.id, data, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Appointments that are still ahead for a pet (not done, cancelled or declined)
const upcomingFilterFor = (petId, todayStr) => ({
  pet: petId,
  date: { $gte: todayStr },
  status: { $nin: ['Completed', 'Cancelled'] },
  approvalStatus: { $ne: 'Declined' }
});

// How many upcoming appointments a pet has (the My Pets page asks before deleting)
router.get('/:id/upcoming', protect, async (req, res) => {
  try {
    if (!isStaffUser(req) && !(await ownsPet(req, req.params.id))) {
      return res.status(403).json({ message: 'That pet doesn\u2019t belong to you.' });
    }
    const todayStr = new Date().toISOString().slice(0, 10);
    const upcoming = await Appointment.countDocuments(upcomingFilterFor(req.params.id, todayStr));
    res.json({ upcoming });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete a pet — also cleans up its medical records and reminders so
// nothing is left pointing at a pet that no longer exists.
router.delete('/:id', protect, async (req, res) => {
  try {
    // Allowed: the Clinic Admin, or the owner of this pet. Moderators can't delete other people's pets.
    if (!isAdminUser(req) && !(await ownsPet(req, req.params.id))) {
      return res.status(403).json({ message: 'Only the pet\u2019s owner or the Clinic Admin can delete a pet.' });
    }
    const todayStr = new Date().toISOString().slice(0, 10);
    const upcomingFilter = upcomingFilterFor(req.params.id, todayStr);

    const deleted = await Pet.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Pet not found' });

    await Appointment.updateMany(upcomingFilter, { $set: { status: 'Cancelled' } });
    if (isAdminUser(req) && String(deleted.owner) !== req.userId) await logActivity(req, 'pet.delete', `Deleted pet "${deleted.name}" (${deleted.ownerName || 'unknown owner'})`);

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
