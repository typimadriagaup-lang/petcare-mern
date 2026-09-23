/**
 * Manual admin seeder.
 * Usage:  npm run seed:admin
 *
 * Not normally needed — the server seeds the admin on every start.
 * Handy if you ever wipe the users collection.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const seedAdmin = require('../utils/seedAdmin');

(async () => {
  await connectDB();
  await seedAdmin();
  await mongoose.connection.close();
  process.exit(0);
})();
