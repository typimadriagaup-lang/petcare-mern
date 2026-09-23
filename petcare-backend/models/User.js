const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, default: '' },
  city: { type: String, default: '' },
  avatar: { type: String, default: '' }, // stored as a base64 data URL
  role: { type: String, default: 'Pet Owner' }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
