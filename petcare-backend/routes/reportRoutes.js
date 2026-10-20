const express = require('express');
const router = express.Router();
const Appointment = require('../models/Appointment');
const Pet = require('../models/Pet');
const User = require('../models/User');
const MedicalRecord = require('../models/MedicalRecord');
const ActivityLog = require('../models/ActivityLog');
const { requireAdmin } = require('../middleware/auth');

router.use(requireAdmin);

const isoDay = (d) => d.toISOString().slice(0, 10);

// Numbers for the Reports tab. ?days=30 (7, 30 or 90)
router.get('/summary', async (req, res) => {
  try {
    const days = [7, 30, 90].includes(Number(req.query.days)) ? Number(req.query.days) : 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [appts, totalPets, owners, newOwners, records, newRecords] = await Promise.all([
      Appointment.find({ createdAt: { $gte: since } }).select('approvalStatus status service createdAt'),
      Pet.countDocuments(),
      User.countDocuments({ role: 'Pet Owner' }),
      User.countDocuments({ role: 'Pet Owner', createdAt: { $gte: since } }),
      MedicalRecord.countDocuments(),
      MedicalRecord.countDocuments({ createdAt: { $gte: since } })
    ]);

    const count = (arr, fn) => arr.filter(fn).length;
    const byService = {};
    appts.forEach((a) => { byService[a.service] = (byService[a.service] || 0) + 1; });

    // requests per day for the chart
    const perDay = {};
    for (let i = days - 1; i >= 0; i--) perDay[isoDay(new Date(Date.now() - i * 86400000))] = 0;
    appts.forEach((a) => { const k = isoDay(a.createdAt); if (k in perDay) perDay[k] += 1; });

    const decided = count(appts, (a) => a.approvalStatus !== 'Pending');
    res.json({
      days,
      appointments: {
        total: appts.length,
        pending: count(appts, (a) => a.approvalStatus === 'Pending'),
        approved: count(appts, (a) => a.approvalStatus === 'Approved'),
        declined: count(appts, (a) => a.approvalStatus === 'Declined'),
        completed: count(appts, (a) => a.status === 'Completed'),
        approvalRate: decided ? Math.round((count(appts, (a) => a.approvalStatus === 'Approved') / decided) * 100) : null
      },
      byService: Object.entries(byService).map(([service, total]) => ({ service, total })).sort((a, b) => b.total - a.total),
      perDay: Object.entries(perDay).map(([date, total]) => ({ date, total })),
      totals: { pets: totalPets, owners, newOwners, records, newRecords }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Activity log, newest first. ?limit=100&action=appointment
router.get('/activity', async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 500);
    const filter = {};
    if (req.query.action) {
      const prefix = String(req.query.action).replace(/[^a-z.]/gi, '');
      filter.action = new RegExp(`^${prefix}`);
    }
    const logs = await ActivityLog.find(filter).sort({ createdAt: -1 }).limit(limit);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
