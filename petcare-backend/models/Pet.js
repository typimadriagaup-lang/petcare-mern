const mongoose = require('mongoose');

const PetSchema = new mongoose.Schema({
  petId: { type: String, unique: true, sparse: true, index: true }, // e.g. PC-000123, assigned automatically
  name: { type: String, required: true },
  type: { type: String, required: true }, // Dog, Cat, etc.
  breed: { type: String, required: true },
  age: { type: String, required: true },
  weight: { type: String, required: true },
  birthdate: { type: String, default: '' },     // YYYY-MM-DD; age is derived from this
  sex: { type: String, default: '' },           // Male | Female
  neutered: { type: Boolean, default: false },  // neutered / spayed
  color: { type: String, default: '' },
  allergies: { type: String, default: '' },
  image: { type: String, default: '' },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  ownerName: { type: String, default: '' },
  status: { type: String, default: 'Up to Date' } // Up to Date | Vaccine Due
}, { timestamps: true });

// New pets get their unique Pet ID automatically (never editable afterwards)
PetSchema.pre('save', async function () {
  if (this.isNew && !this.petId) {
    const { nextPetId } = require('../utils/petId');
    this.petId = await nextPetId();
  }
});

module.exports = mongoose.model('Pet', PetSchema);
