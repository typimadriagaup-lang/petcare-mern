const mongoose = require('mongoose');

// One document per named sequence (e.g. "pet"); $inc keeps numbers unique even under concurrent requests
const CounterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 }
});

module.exports = mongoose.model('Counter', CounterSchema);
