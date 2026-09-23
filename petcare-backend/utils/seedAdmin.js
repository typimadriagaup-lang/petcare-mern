const bcrypt = require('bcryptjs');
const User = require('../models/User');

// Credentials come from .env so they can be changed without touching code.
const ADMIN_NAME = process.env.ADMIN_NAME || 'Clinic Admin';
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@petcare.com').toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

/**
 * Makes sure the pre-created clinic admin account always exists.
 * Runs on every server start:
 *  - if the account is missing, it is created
 *  - if it exists but isn't flagged as admin, the role is corrected
 */
async function seedAdmin() {
  try {
    const existing = await User.findOne({ email: ADMIN_EMAIL });

    if (existing) {
      if (existing.role !== 'Clinic Admin') {
        existing.role = 'Clinic Admin';
        await existing.save();
        console.log(`Admin role restored for ${ADMIN_EMAIL}`);
      } else {
        console.log(`Admin account ready: ${ADMIN_EMAIL}`);
      }
      return existing;
    }

    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

    const admin = await User.create({
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      password: hashedPassword,
      role: 'Clinic Admin'
    });

    console.log('=========================================');
    console.log(' Admin account created');
    console.log(` Email:    ${ADMIN_EMAIL}`);
    console.log(` Password: ${ADMIN_PASSWORD}`);
    console.log('=========================================');

    return admin;
  } catch (err) {
    console.error('Could not seed admin account:', err.message);
  }
}

module.exports = seedAdmin;
