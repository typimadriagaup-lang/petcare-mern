const express = require('express');
const router = express.Router();
const Appointment = require('../models/Appointment');
const Reminder = require('../models/Reminder');
const MedicalRecord = require('../models/MedicalRecord');
const Pet = require('../models/Pet');
const { optionalAuth } = require('../middleware/auth');

/**
 * Creates (or refreshes) the reminder that belongs to an approved appointment.
 * Reminders are keyed by the appointment id so approving twice won't duplicate.
 */
async function createReminderFor(appt) {
  const today = new Date().toISOString().slice(0, 10);

  const payload = {
    pet: appt.pet || null,
    petName: appt.petName,
    title: `${appt.service} appointment`,
    dueDate: appt.date,
    time: appt.time || '',
    clinic: appt.clinicBranch,
    category: 'Appointment',
    status: appt.date < today ? 'Overdue' : 'Upcoming',
    appointment: appt._id,
    source: 'Appointment'
  };

  try {
    return await Reminder.findOneAndUpdate(
      { appointment: appt._id },
      payload,
      { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
    );
  } catch (err) {
    console.error(`Could not create reminder for appointment ${appt._id}:`, err.message);
    return null;
  }
}

/**
 * Creates (or refreshes) the medical record generated once a visit is marked
 * Done in the clinic queue. Keyed by appointment id so it won't duplicate,
 * and only runs for appointments tied to a registered pet (not a free-text name).
 */
async function createMedicalRecordFor(appt) {
  let petId = appt.pet;

  // Older appointments booked before pet IDs were tracked only have a name —
  // best-effort match it to a registered pet so the record still gets created.
  if (!petId && appt.petName) {
    const escaped = appt.petName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = await Pet.findOne({ name: new RegExp(`^${escaped}$`, 'i') });
    if (match) petId = match._id;
  }

  if (!petId) return null;

  const service = appt.service || 'Clinic visit';
  const recordType = /vacc/i.test(service) ? 'Vaccination' : /surger/i.test(service) ? 'Surgery' : 'Treatment';

  const payload = {
    pet: petId,
    title: service,
    clinic: appt.clinicBranch,
    summary: `Completed ${service.toLowerCase()} visit${appt.time ? ` at ${appt.time}` : ''}.`,
    date: appt.date,
    recordType,
    appointment: appt._id,
    source: 'Appointment'
  };

  try {
    return await MedicalRecord.findOneAndUpdate(
      { appointment: appt._id },
      payload,
      { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
    );
  } catch (err) {
    console.error(`Could not create medical record for appointment ${appt._id}:`, err.message);
    return null;
  }
}

// Get all appointments (newest first).
// Optional filters: /api/appointments?approvalStatus=Pending
// and ?mine=true with a Bearer token, to scope this to the logged-in owner's
// pets only (used by the pet-owner Appointments page). Admin approval screens
// call this without ?mine so they see every clinic-wide request.
router.get('/', optionalAuth, async (req, res) => {
  try {
    const filter = {};
    if (req.query.approvalStatus) filter.approvalStatus = req.query.approvalStatus;

    if (req.query.mine === 'true' && req.userId) {
      const myPets = await Pet.find({ owner: req.userId }).select('_id');
      filter.pet = { $in: myPets.map((p) => p._id) };
    }

    const appointments = await Appointment.find(filter).sort({ createdAt: -1 });
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create appointment (used by the "Quick Book" form) — always starts as Pending
router.post('/', async (req, res) => {
  const { pet, petName, date, time, clinicBranch, service } = req.body;

  // Always check against the real current date server-side — a disabled
  // datepicker on the frontend can still be bypassed by a direct API call.
  const todayStr = new Date().toISOString().slice(0, 10);
  if (!date || date < todayStr) {
    return res.status(400).json({ message: 'You can\u2019t book an appointment in the past.' });
  }

  const newAppt = new Appointment({
    pet: pet || undefined,
    petName,
    date,
    time,
    clinicBranch,
    service,
    approvalStatus: 'Pending'
  });

  try {
    const savedAppt = await newAppt.save();
    res.status(201).json(savedAppt);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// APPROVE — clinic admin accepts the request and a reminder is generated
router.put('/:id/approve', async (req, res) => {
  try {
    const appt = await Appointment.findById(req.params.id);
    if (!appt) return res.status(404).json({ message: 'Appointment not found' });

    appt.approvalStatus = 'Approved';
    appt.status = 'Scheduled';
    appt.declineReason = '';
    appt.decidedAt = new Date();
    await appt.save();

    const reminder = await createReminderFor(appt);

    res.json({ appointment: appt, reminder });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DECLINE — clinic admin rejects the request, any reminder is removed
router.put('/:id/decline', async (req, res) => {
  try {
    const appt = await Appointment.findById(req.params.id);
    if (!appt) return res.status(404).json({ message: 'Appointment not found' });

    appt.approvalStatus = 'Declined';
    appt.status = 'Cancelled';
    appt.declineReason = req.body.reason || '';
    appt.decidedAt = new Date();
    await appt.save();

    await Reminder.deleteOne({ appointment: appt._id });

    res.json(appt);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Reschedule / update status. Marking the clinic queue as Done also closes
// out the appointment and generates the pet's medical record automatically.
router.put('/:id', async (req, res) => {
  try {
    const payload = { ...req.body };
    if (payload.queueStatus === 'Done') {
      payload.status = 'Completed';
    }

    const updated = await Appointment.findByIdAndUpdate(req.params.id, payload, { new: true });
    if (!updated) return res.status(404).json({ message: 'Appointment not found' });

    // keep the linked reminder in sync when an approved visit is moved
    if (updated.approvalStatus === 'Approved') await createReminderFor(updated);

    let medicalRecord = null;
    if (updated.queueStatus === 'Done') {
      // the reminder has served its purpose once the visit actually happened
      await Reminder.findOneAndUpdate({ appointment: updated._id }, { status: 'Done' });
      medicalRecord = await createMedicalRecordFor(updated);
    }

    res.json({ ...updated.toObject(), medicalRecord });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Cancel (delete) an appointment and its reminder
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Appointment.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Appointment not found' });

    await Reminder.deleteOne({ appointment: deleted._id });

    res.json({ message: 'Appointment cancelled' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
