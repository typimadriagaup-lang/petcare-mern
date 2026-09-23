const mongoose = require('mongoose');

const PetSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, required: true }, // Dog, Cat, etc.
  breed: { type: String, required: true },
  age: { type: String, required: true },
  weight: { type: String, required: true },
  image: { type: String, default: '' },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  ownerName: { type: String, default: '' },
  status: { type: String, default: 'Up to Date' } // Up to Date | Vaccine Due
}, { timestamps: true });

module.exports = mongoose.model('Pet', PetSchema);
