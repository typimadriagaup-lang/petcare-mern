const Reminder = require('../models/Reminder');
const { sendReminderEmail } = require('./mailer');
const { todayManila, addDays } = require('./followUps');

const SEND_FROM_HOUR = 8; // Philippine time: don't email people in the middle of the night

/**
 * Emails pet owners about reminders that are 1-3 days away and ones due today.
 * Each reminder emails at most twice (a heads-up, then the day itself), and an
 * owner gets ONE email per run listing everything, not one per reminder.
 * Owners can switch these off (User.reminderEmails).
 */
async function runReminderEmails() {
  try {
    const nowManila = new Date(Date.now() + 8 * 3600 * 1000);
    if (nowManila.getUTCHours() < SEND_FROM_HOUR) return;

    const today = todayManila();
    const soon = addDays(today, 3);

    const due = await Reminder.find({
      status: { $ne: 'Done' },
      pet: { $ne: null },
      $or: [
        { dueDate: today, notifiedDue: false },
        { dueDate: { $gt: today, $lte: soon }, notified3d: false }
      ]
    }).populate({ path: 'pet', select: 'name petId owner', populate: { path: 'owner', select: 'name email reminderEmails emailVerified' } });

    // group by owner
    const byOwner = new Map();
    for (const r of due) {
      const owner = r.pet?.owner;
      if (!owner?.email || owner.reminderEmails === false || owner.emailVerified === false) continue;
      const key = String(owner._id);
      if (!byOwner.has(key)) byOwner.set(key, { owner, reminders: [] });
      byOwner.get(key).reminders.push(r);
    }

    for (const { owner, reminders } of byOwner.values()) {
      const items = reminders.map((r) => {
        const days = Math.round((new Date(`${r.dueDate}T00:00:00Z`) - new Date(`${today}T00:00:00Z`)) / 86400000);
        return {
          pet: r.pet.name,
          title: r.title,
          dueDate: r.time ? `${r.dueDate} at ${r.time}` : r.dueDate,
          when: days <= 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`
        };
      });
      try {
        await sendReminderEmail(owner.email, owner.name, items);
        await Reminder.updateMany(
          { _id: { $in: reminders.map((r) => r._id) } },
          { $set: { notified3d: true } }
        );
        // the ones due today are finished with email altogether
        await Reminder.updateMany({ _id: { $in: reminders.filter((r) => r.dueDate === today).map((r) => r._id) } }, { $set: { notifiedDue: true } });
      } catch (err) {
        console.error(`Reminder email to ${owner.email} failed:`, err.message);
      }
    }
  } catch (err) {
    console.error('Reminder email job failed:', err.message);
  }
}

// Check shortly after start-up, then every hour.
function startReminderEmailJob() {
  setTimeout(runReminderEmails, 30 * 1000);
  setInterval(runReminderEmails, 60 * 60 * 1000);
}

module.exports = { startReminderEmailJob, runReminderEmails };
