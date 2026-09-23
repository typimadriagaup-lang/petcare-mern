const express = require('express');
const router = express.Router();
const ClinicService = require('../models/ClinicService');

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
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    const saved = await new ClinicService({ name }).save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Rename / update a service
router.put('/:id', async (req, res) => {
  try {
    const updated = await ClinicService.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: 'Service not found' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete a service
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await ClinicService.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Service not found' });
    res.json({ message: 'Service deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
