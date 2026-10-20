const ClinicService = require('../models/ClinicService');
const Reminder = require('../models/Reminder');

// Used when a service has no follow-up interval of its own (set under Admin Clinic > Clinic Services).
// Order matters: the first match wins.
const KEYWORD_RULES = [
  { re: /rabies/i,                     days: 365, title: 'Anti-rabies booster due',    category: 'Vaccination' },
  { re: /starter/i,                    days: 21,  title: 'Next vaccine dose due',      category: 'Vaccination' },
  { re: /vaccin|booster/i,             days: 365, title: 'Vaccination booster due',    category: 'Vaccination' },
  { re: /deworm/i,                     days: 90,  title: 'Deworming due',              category: 'Deworming' },
  { re: /flea|tick/i,                  days: 30,  title: 'Flea & tick treatment due',  category: 'Flea & Tick' },
  { re: /spay|neuter|kapon|surger/i,   days: 14,  title: 'Post-surgery check-up',      category: 'Checkup' },
  { re: /wellness/i,                   days: 365, title: 'Annual wellness check due',  category: 'Checkup' }
];

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// YYYY-MM-DD in Philippine time
const todayManila = () => new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);

function addDays(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  if (isNaN(d)) return null;
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// What (if anything) should be scheduled after this service / record title?
async function ruleFor(text) {
  const keyword = KEYWORD_RULES.find((r) => r.re.test(text));
  const svc = await ClinicService.findOne({ name: new RegExp(`^${escapeRe(text.trim())}$`, 'i') }).lean();

  if (svc && typeof svc.followUpDays === 'number') {
    if (svc.followUpDays <= 0) return null; // the admin turned follow-ups off for this service
    return {
      days: svc.followUpDays,
      title: keyword?.title || `${svc.name} due`,
      category: keyword?.category || 'Checkup'
    };
  }
  return keyword || null;
}

/**
 * Schedules the "come back for the next one" reminder after a visit or record.
 * One follow-up per source record, so saving the same record twice never duplicates it.
 */
async function createFollowUp({ petId, petName, text, doneDate, clinic, recordId }) {
  try {
    if (!petId || !text || !doneDate) return null;
    const rule = await ruleFor(String(text));
    if (!rule) return null;

    const dueDate = addDays(doneDate, rule.days);
    if (!dueDate) return null;

    // Already have an open reminder for the same thing? Don't pile on another.
    const open = await Reminder.findOne({
      pet: petId, title: rule.title, status: { $ne: 'Done' }, dueDate: { $gte: doneDate }
    });
    if (open) return open;

    const payload = {
      pet: petId,
      petName: petName || '',
      title: rule.title,
      dueDate,
      clinic: clinic || '',
      category: rule.category,
      status: dueDate < todayManila() ? 'Overdue' : 'Upcoming',
      source: 'Follow-up',
      record: recordId || null
    };

    if (recordId) {
      return await Reminder.findOneAndUpdate({ record: recordId }, { $setOnInsert: payload }, { upsert: true, new: true });
    }
    return await Reminder.create(payload);
  } catch (err) {
    console.error('Could not create follow-up reminder:', err.message);
    return null;
  }
}

module.exports = { createFollowUp, KEYWORD_RULES, todayManila, addDays };
