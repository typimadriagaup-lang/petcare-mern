// Helpers for the 30-day account freeze
const FREEZE_DAYS = 30;                 // default length
const FREEZE_OPTIONS = [1, 7, 30];     // lengths the admin can choose from

const isFrozen = (u) => !!u && !!u.frozenUntil && new Date(u.frozenUntil) > new Date();

const fmtDate = (d) =>
  new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Manila' });

const frozenMessage = (u) =>
  `Your account is frozen until ${fmtDate(u.frozenUntil)} for violating the PetCare website rules.` +
  (u.freezeReason ? ` Reason: ${u.freezeReason.replace(/[.\s]+$/, '')}.` : '') +
  ' Please contact the clinic administrator if you think this is a mistake.';

module.exports = { FREEZE_DAYS, FREEZE_OPTIONS, isFrozen, fmtDate, frozenMessage };
