const express = require('express');
const router = express.Router();
const ClinicService = require('../models/ClinicService');
const { requireAdmin } = require('../middleware/auth');
const { logActivity } = require('../utils/activity');

const PET_TYPES = ['Dog', 'Cat', 'Rabbit', 'Bird', 'Hamster', 'Other'];

// Returns a clean petTypes array (or an error). An empty list means "every pet type".
function cleanTypes(input) {
  if (input === undefined) return { value: undefined };
  if (!Array.isArray(input) || input.some((t) => !PET_TYPES.includes(t))) {
    return { error: 'Please choose valid pet types.' };
  }
  const unique = [...new Set(input)];
  return { value: unique.length === PET_TYPES.length ? [] : unique };
}

// Days until the owner is reminded to come back (0 = never). undefined = leave as is.
function cleanDays(input) {
  if (input === undefined || input === null || input === '') return { value: undefined };
  const n = Number(input);
  if (!Number.isInteger(n) || n < 0 || n > 3650) return { error: 'Follow-up days must be a whole number from 0 to 3650.' };
  return { value: n };
}

// Get all clinic services
router.get('/', async (req, res) => {
  try {
    const services = await ClinicService.find().sort({ createdAt: 1 });
    res.json(services);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add a new service
router.post('/', requireAdmin, async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const types = cleanTypes(req.body.petTypes);
    if (types.error) return res.status(400).json({ message: types.error });
    const days = cleanDays(req.body.followUpDays);
    if (days.error) return res.status(400).json({ message: days.error });
    const saved = await new ClinicService({ name, petTypes: types.value || [], followUpDays: days.value }).save();
    await logActivity(req, 'service.add', `Added service "${saved.name}"`);
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Rename / update a service
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const types = cleanTypes(req.body.petTypes);
    if (types.error) return res.status(400).json({ message: types.error });
    const changes = {};
    if (req.body.name !== undefined) changes.name = String(req.body.name).trim();
    if (req.body.active !== undefined) changes.active = !!req.body.active;
    if (types.value !== undefined) changes.petTypes = types.value;
    const days = cleanDays(req.body.followUpDays);
    if (days.error) return res.status(400).json({ message: days.error });
    if (days.value !== undefined) changes.followUpDays = days.value;
    const updated = await ClinicService.findByIdAndUpdate(req.params.id, changes, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ message: 'Service not found' });
    await logActivity(req, 'service.update', `Updated service "${updated.name}"`);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete a service
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const deleted = await ClinicService.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Service not found' });
    await logActivity(req, 'service.delete', `Deleted service "${deleted.name}"`);
    res.json({ message: 'Service deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
