const express = require('express');
const router = express.Router();
const Appointment = require('../models/Appointment');
const Reminder = require('../models/Reminder');
const MedicalRecord = require('../models/MedicalRecord');
const Pet = require('../models/Pet');
const ClinicService = require('../models/ClinicService');
const { createFollowUp } = require('../utils/followUps');
const User = require('../models/User');
const { protect, requireStaff, isStaffUser, isAdminUser } = require('../middleware/auth');
const { getSettings, fmt12 } = require('../utils/settings');
const { logActivity } = require('../utils/activity');

// Pet owners may send at most BOOKING_LIMIT appointment requests per rolling
// timer. The timer starts at their first booking; once it runs out (24h later)
// the count resets. Cancelling an appointment does NOT give a slot back.
const BOOKING_WINDOW_MS = 24 * 60 * 60 * 1000;
const STAFF = ['Clinic Admin', 'Moderator'];

function limitInfo(user, BOOKING_LIMIT) {
  const now = Date.now();
  const start = user.bookingWindowStart ? user.bookingWindowStart.getTime() : null;
  if (!start || start + BOOKING_WINDOW_MS <= now) {
    return { limit: BOOKING_LIMIT, used: 0, remaining: BOOKING_LIMIT, resetsAt: null };
  }
  const used = Math.min(user.bookingCount || 0, BOOKING_LIMIT);
  return {
    limit: BOOKING_LIMIT,
    used,
    remaining: BOOKING_LIMIT - used,
    resetsAt: new Date(start + BOOKING_WINDOW_MS).toISOString()
  };
}

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
router.get('/', protect, async (req, res) => {
  try {
    const filter = {};
    if (req.query.approvalStatus) filter.approvalStatus = req.query.approvalStatus;

    // Pet owners only ever see their own pets' appointments, whatever the query says.
    // Staff see the whole clinic unless they ask for ?mine=true.
    if (!isStaffUser(req) || req.query.mine === 'true') {
      const myPets = await Pet.find({ owner: req.userId }).select('_id');
      filter.pet = { $in: myPets.map((p) => p._id) };
    }

    const appointments = await Appointment.find(filter).sort({ createdAt: -1 });

    // Attach each pet's Pet ID so same-named pets can be told apart
    const pets = await Pet.find({ _id: { $in: appointments.map((a) => a.pet).filter(Boolean) } }).select('petId');
    const codeById = new Map(pets.map((p) => [String(p._id), p.petId || '']));
    res.json(appointments.map((a) => ({ ...a.toObject(), petCode: codeById.get(String(a.pet)) || '' })));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// How many bookings the signed-in pet owner has left, and when the timer resets
router.get('/limit', protect, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(401).json({ message: 'User not found' });
    const settings = await getSettings();
    res.json(limitInfo(user, settings.bookingLimit));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create appointment (used by the "Quick Book" form) — always starts as Pending.
// Rate limited to BOOKING_LIMIT per 24h for pet owners.
router.post('/', protect, async (req, res) => {
  const { pet, petName, date, time, clinicBranch, service } = req.body;

  // Always check against the real current date server-side — a disabled
  // datepicker on the frontend can still be bypassed by a direct API call.
  const todayStr = new Date().toISOString().slice(0, 10);
  if (!date || date < todayStr) {
    return res.status(400).json({ message: 'You can\u2019t book an appointment in the past.' });
  }

  // Clinic hours come from the admin's settings (checked before a booking slot is used up)
  const settings = await getSettings();
  const BOOKING_LIMIT = settings.bookingLimit;
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(time || '')) || time < settings.openTime || time > settings.closeTime) {
    return res.status(400).json({
      message: `Appointments are only available between ${fmt12(settings.openTime)} and ${fmt12(settings.closeTime)}.`
    });
  }

  // The service has to be offered for this kind of pet (e.g. no spay/neuter for a bird)
  if (pet && service) {
    const [petDoc, svc] = await Promise.all([
      Pet.findById(pet).select('type name'),
      ClinicService.findOne({ name: service })
    ]);
    if (petDoc && svc && svc.petTypes?.length && !svc.petTypes.includes(petDoc.type)) {
      return res.status(400).json({ message: `${service} isn\u2019t offered for ${petDoc.type} pets.` });
    }
  }

  // A pet owner can only book for their own pet
  if (pet) {
    const mine = await Pet.exists({ _id: pet, owner: req.userId });
    const me = await User.findById(req.userId).select('role');
    if (!mine && !['Clinic Admin', 'Moderator'].includes(me?.role)) {
      return res.status(403).json({ message: 'That pet doesn\u2019t belong to you.' });
    }
  }

  let user;
  let consumedSlot = false;
  try {
    user = await User.findById(req.userId);
    if (!user) return res.status(401).json({ message: 'User not found' });

    if (!STAFF.includes(user.role)) {
      const now = new Date();
      const cutoff = new Date(now.getTime() - BOOKING_WINDOW_MS);

      // 1) Timer finished (or never started) -> start a fresh window with a zero count
      await User.updateOne(
        { _id: user._id, $or: [{ bookingWindowStart: null }, { bookingWindowStart: { $lte: cutoff } }] },
        { $set: { bookingWindowStart: now, bookingCount: 0 } }
      );

      // 2) Atomically take a slot only if one is left (safe against double-clicks / parallel requests)
      const updated = await User.findOneAndUpdate(
        { _id: user._id, bookingCount: { $lt: BOOKING_LIMIT } },
        { $inc: { bookingCount: 1 } },
        { new: true }
      );

      if (!updated) {
        const fresh = await User.findById(user._id);
        const info = limitInfo(fresh, BOOKING_LIMIT);
        const retryAfter = Math.max(1, Math.ceil((new Date(info.resetsAt).getTime() - Date.now()) / 1000));
        res.set('Retry-After', String(retryAfter));
        return res.status(429).json({
          message: `You\u2019ve reached the limit of ${BOOKING_LIMIT} appointment requests per 24 hours.`,
          ...info,
          retryAfter
        });
      }
      consumedSlot = true;
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
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
    const info = limitInfo(await User.findById(user._id), BOOKING_LIMIT);
    res.status(201).json({ ...savedAppt.toObject(), bookingLimit: info });
  } catch (err) {
    // the booking failed, so don't charge the owner a slot for it
    if (consumedSlot) await User.updateOne({ _id: user._id, bookingCount: { $gt: 0 } }, { $inc: { bookingCount: -1 } });
    res.status(400).json({ message: err.message });
  }
});

// APPROVE — clinic admin accepts the request and a reminder is generated
router.put('/:id/approve', requireStaff, async (req, res) => {
  try {
    const appt = await Appointment.findById(req.params.id);
    if (!appt) return res.status(404).json({ message: 'Appointment not found' });

    appt.approvalStatus = 'Approved';
    appt.status = 'Scheduled';
    appt.declineReason = '';
    appt.decidedAt = new Date();
    await appt.save();

    const reminder = await createReminderFor(appt);
    await logActivity(req, 'appointment.approve', `Approved ${appt.service} for ${appt.petName} on ${appt.date}`);

    res.json({ appointment: appt, reminder });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DECLINE — clinic admin rejects the request, any reminder is removed
router.put('/:id/decline', requireStaff, async (req, res) => {
  try {
    const appt = await Appointment.findById(req.params.id);
    if (!appt) return res.status(404).json({ message: 'Appointment not found' });

    appt.approvalStatus = 'Declined';
    appt.status = 'Cancelled';
    appt.declineReason = req.body.reason || '';
    appt.decidedAt = new Date();
    await appt.save();

    await Reminder.deleteOne({ appointment: appt._id });
    await logActivity(req, 'appointment.decline', `Declined ${appt.service} for ${appt.petName} on ${appt.date}${appt.declineReason ? ` (${appt.declineReason})` : ''}`);

    res.json(appt);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Reschedule / update status. Marking the clinic queue as Done also closes
// out the appointment and generates the pet's medical record automatically.
router.put('/:id', requireStaff, async (req, res) => {
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
      // schedule the next visit (e.g. rabies in a year, deworming in 3 months)
      if (medicalRecord) {
        await createFollowUp({
          petId: medicalRecord.pet, petName: updated.petName, text: updated.service,
          doneDate: updated.date, clinic: updated.clinicBranch, recordId: medicalRecord._id
        });
      }
    }

    res.json({ ...updated.toObject(), medicalRecord });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Cancel (delete) an appointment and its reminder
router.delete('/:id', protect, async (req, res) => {
  try {
    const appt = await Appointment.findById(req.params.id);
    if (!appt) return res.status(404).json({ message: 'Appointment not found' });

    // Allowed: the Clinic Admin, or the owner of the pet it was booked for
    if (!isAdminUser(req)) {
      const owns = appt.pet && await Pet.exists({ _id: appt.pet, owner: req.userId });
      if (!owns) return res.status(403).json({ message: 'You can\u2019t remove this appointment.' });
    }

    const deleted = await Appointment.findByIdAndDelete(req.params.id);
    await Reminder.deleteOne({ appointment: deleted._id });
    if (isAdminUser(req)) await logActivity(req, 'appointment.delete', `Deleted ${deleted.service} for ${deleted.petName} on ${deleted.date}`);

    res.json({ message: 'Appointment cancelled' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
