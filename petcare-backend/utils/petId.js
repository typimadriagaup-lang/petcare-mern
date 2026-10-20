const Counter = require('../models/Counter');
const Pet = require('../models/Pet');

const PREFIX = 'PC-';
const format = (n) => `${PREFIX}${String(n).padStart(6, '0')}`; // PC-000001

async function nextPetId() {
  const c = await Counter.findOneAndUpdate({ _id: 'pet' }, { $inc: { seq: 1 } }, { new: true, upsert: true });
  return format(c.seq);
}

// Gives every pet created before Pet IDs existed an ID (oldest first). Safe to run on every start.
async function backfillPetIds() {
  try {
    const missing = await Pet.find({ $or: [{ petId: { $exists: false } }, { petId: null }, { petId: '' }] })
      .sort({ createdAt: 1 }).select('_id');
    if (!missing.length) return;

    // Make sure the counter starts above any ID already handed out
    const last = await Pet.findOne({ petId: new RegExp(`^${PREFIX}\\d+$`) }).sort({ petId: -1 }).select('petId');
    if (last) {
      const n = parseInt(last.petId.slice(PREFIX.length), 10);
      await Counter.findOneAndUpdate({ _id: 'pet' }, { $max: { seq: n } }, { upsert: true });
    }
    for (const p of missing) {
      await Pet.updateOne({ _id: p._id }, { $set: { petId: await nextPetId() } });
    }
    console.log(`Assigned Pet IDs to ${missing.length} existing pet(s)`);
  } catch (err) {
    console.error('Pet ID backfill failed:', err.message);
  }
}

module.exports = { nextPetId, backfillPetIds };
