const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// Get logged-in user's profile
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update logged-in user's profile
router.put('/me', protect, async (req, res) => {
  try {
    const { name, phone, city, avatar } = req.body;
    const update = { name, phone, city };
    // Only touch avatar if the request actually sent one, so other saves don't wipe it out
    if (avatar !== undefined) update.avatar = avatar;

    const updated = await User.findByIdAndUpdate(
      req.userId,
      update,
      { new: true }
    ).select('-password');

    if (!updated) return res.status(404).json({ message: 'User not found' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
