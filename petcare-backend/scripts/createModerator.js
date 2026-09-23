/**
 * Manual moderator (staff) seeder.
 * Usage:  npm run seed:moderator
 *
 * Not normally needed — the server seeds the moderator account on every start.
 * Handy if you ever wipe the users collection.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const seedModerator = require('../utils/seedModerator');

(async () => {
  await connectDB();
  await seedModerator();
  await mongoose.connection.close();
  process.exit(0);
})();
