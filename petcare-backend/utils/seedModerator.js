const bcrypt = require('bcryptjs');
const User = require('../models/User');

// Credentials come from .env so they can be changed without touching code.
const MODERATOR_NAME = process.env.MODERATOR_NAME || 'Veterinary Staff';
const MODERATOR_EMAIL = (process.env.MODERATOR_EMAIL || 'moderator@petcare.com').toLowerCase();
const MODERATOR_PASSWORD = process.env.MODERATOR_PASSWORD || 'moderator123';

/**
 * Makes sure the pre-created moderator (veterinary staff) account always
 * exists. A Moderator is staff, not a pet owner — same as seedAdmin.js, it
 * runs on every server start:
 *  - if the account is missing, it is created
 *  - if it exists but isn't flagged as a moderator, the role is corrected
 */
async function seedModerator() {
  try {
    const existing = await User.findOne({ email: MODERATOR_EMAIL });

    if (existing) {
      if (existing.role !== 'Moderator') {
        existing.role = 'Moderator';
        await existing.save();
        console.log(`Moderator role restored for ${MODERATOR_EMAIL}`);
      } else {
        console.log(`Moderator account ready: ${MODERATOR_EMAIL}`);
      }
      return existing;
    }

    const hashedPassword = await bcrypt.hash(MODERATOR_PASSWORD, 10);

    const moderator = await User.create({
      name: MODERATOR_NAME,
      email: MODERATOR_EMAIL,
      password: hashedPassword,
      role: 'Moderator'
    });

    console.log('=========================================');
    console.log(' Moderator (staff) account created');
    console.log(` Email:    ${MODERATOR_EMAIL}`);
    console.log(` Password: ${MODERATOR_PASSWORD}`);
    console.log('=========================================');

    return moderator;
  } catch (err) {
    console.error('Could not seed moderator account:', err.message);
  }
}

module.exports = seedModerator;
