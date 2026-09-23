const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// REGISTER / SIGN UP
router.post('/register', async (req, res) => {
  try {
    const { name, password } = req.body;
    const email = (req.body.email || '').trim().toLowerCase();

    if (!password || password.length < 8 || !/\d/.test(password)) {
      return res.status(400).json({ message: 'Password must be at least 8 characters and include at least one number.' });
    }

    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);

    // Sign-ups are always regular pet owners. The admin account is seeded
    // separately by utils/seedAdmin.js and can't be created from this form.
    user = new User({ name, email, password: hashedPassword, role: 'Pet Owner' });

    await user.save();
    res.status(201).json({ message: 'User registered successfully!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { password } = req.body;
    const email = (req.body.email || '').trim().toLowerCase();

    // Lookup is case-insensitive so older mixed-case records still work
    const user =
      (await User.findOne({ email })) ||
      (await User.findOne({ email: req.body.email }));

    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    // role is sent back so the frontend knows which dashboard to open
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
