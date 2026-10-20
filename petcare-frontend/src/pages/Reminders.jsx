import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { isAdmin } from '../utils/auth';
import { downloadIcs, googleCalendarUrl } from '../utils/calendar';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Attaches the logged-in user's token so the backend can scope results to them
const authHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const CATEGORY_OPTIONS = ['Vaccination', 'Deworming', 'Flea & Tick', 'Medication', 'Checkup', 'Nutrition', 'Grooming', 'Appointment'];
const TYPE_ICON = { Dog: '🐶', Cat: '🐱', Rabbit: '🐰', Bird: '🐦', Hamster: '🐹', Other: '🐾' };

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const daysBetween = (from, to) => Math.round((new Date(`${to}T00:00:00`) - new Date(`${from}T00:00:00`)) / 86400000);

// "today", "tomorrow", "in 5 days", "3 days overdue"
function relativeDue(dueDate) {
  if (!dueDate) return '';
  const d = daysBetween(todayStr(), dueDate);
  if (d === 0) return 'today';
  if (d === 1) return 'tomorrow';
  if (d > 1) return `in ${d} days`;
  if (d === -1) return '1 day overdue';
  return `${-d} days overdue`;
}

const calendarEvent = (rem) => ({
  title: `${rem.title}${rem.pet ? ` — ${rem.pet}` : ''}`,
  date: rem.dueDate,
  time: rem.time,
  location: rem.clinic,
  description: `PetCare reminder${rem.petCode ? ` (${rem.petCode})` : ''}`
});

// Small "Add to calendar" button with a Google / .ics choice
function CalendarButton({ rem }) {
  const [open, setOpen] = useState(false);
  if (!rem.dueDate) return null;
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} title="Add to calendar" className="px-3 py-1.5 bg-[#f9f9f8] hover:bg-stone-100 text-stone-600 font-bold text-[11px] uppercase tracking-wider rounded-lg transition-all cursor-pointer">
        📅 CALENDAR
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-44 bg-white border border-stone-200 rounded-xl shadow-lg z-20 overflow-hidden text-[11px] font-semibold text-stone-700" onMouseLeave={() => setOpen(false)}>
          <a href={googleCalendarUrl(calendarEvent(rem))} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)} className="block px-3 py-2 hover:bg-stone-50">Google Calendar</a>
          <button onClick={() => { downloadIcs(calendarEvent(rem)); setOpen(false); }} className="block w-full text-left px-3 py-2 hover:bg-stone-50 cursor-pointer">Apple / Outlook (.ics)</button>
        </div>
      )}
    </div>
  );
}

function Reminders() {
  const navigate = useNavigate();
  const admin = isAdmin();

  // Pet owners only ever see their own pets' reminders; clinic staff see
  // every reminder clinic-wide, matching how Appointments/My Pets scope data.
  const scopeParam = admin ? '' : '?mine=true';

  const [reminders, setReminders] = useState([]);
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [petFilter, setPetFilter] = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [showDone, setShowDone] = useState(false);
  const [emailOn, setEmailOn] = useState(true);
  const [newReminder, setNewReminder] = useState({
    pet: '', petName: '', title: '', dueDate: '', time: '', clinic: '', category: 'Vaccination'
  });

  const loadReminders = () => {
    axios.get(`${API_URL}/api/reminders${scopeParam}`, { headers: authHeaders() })
      .then((res) => {
        setReminders(res.data);
        setLoading(false);
        window.dispatchEvent(new Event('remindersUpdated')); // refreshes the sidebar badge
      })
      .catch((err) => {
        console.error('Error fetching reminders:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadReminders();

    // Pets for the "Set Reminder" form's pet picker — owners only get their
    // own pets, staff can pick from every registered pet.
    const petsParam = admin ? '' : '?mine=true';
    axios.get(`${API_URL}/api/pets${petsParam}`, { headers: authHeaders() })
      .then((res) => setPets(res.data))
      .catch((err) => console.error('Error fetching pets:', err));

    if (!admin) {
      axios.get(`${API_URL}/api/users/me`, { headers: authHeaders() })
        .then((res) => setEmailOn(res.data.reminderEmails !== false))
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const matches = (r) =>
    (!petFilter || String(r.petId || r.pet) === petFilter) &&
    (catFilter === 'All' || r.category === catFilter);

  const visible = reminders.filter(matches);
  const overdue = visible.filter((r) => r.status === 'Overdue');
  const upcoming = visible.filter((r) => r.status !== 'Overdue' && r.status !== 'Done');
  const completed = visible
    .filter((r) => r.status === 'Done')
    .sort((a, b) => String(b.completedAt || b.dueDate).localeCompare(String(a.completedAt || a.dueDate)));
  const unreadCount = reminders.filter((r) => !r.read && r.status !== 'Done').length;

  // pets that actually have reminders (for the filter dropdown)
  const petOptions = [];
  reminders.forEach((r) => {
    const key = String(r.petId || r.pet);
    if (!petOptions.some((p) => p.key === key)) petOptions.push({ key, name: r.pet, code: r.petCode });
  });
  const categoriesInUse = ['All', ...CATEGORY_OPTIONS.filter((c) => reminders.some((r) => r.category === c))];

  // upcoming grouped by pet (staff see every pet; owners see their own)
  const groups = [];
  upcoming.forEach((r) => {
    const key = String(r.petId || r.pet || 'none');
    let g = groups.find((x) => x.key === key);
    if (!g) { g = { key, name: r.pet || 'Not tied to a pet', code: r.petCode, type: r.petType, items: [] }; groups.push(g); }
    g.items.push(r);
  });

  // clinic staff: overdue grouped by owner so they know who to contact
  const overdueByOwner = [];
  if (admin) {
    overdue.forEach((r) => {
      const key = r.ownerEmail || r.ownerName || 'unknown';
      let g = overdueByOwner.find((x) => x.key === key);
      if (!g) { g = { key, name: r.ownerName || 'Unknown owner', email: r.ownerEmail, phone: r.ownerPhone, items: [] }; overdueByOwner.push(g); }
      g.items.push(r);
    });
  }

  const toggleEmails = async () => {
    const next = !emailOn;
    setEmailOn(next);
    try {
      await axios.put(`${API_URL}/api/users/me`, { reminderEmails: next }, { headers: authHeaders() });
    } catch (err) {
      setEmailOn(!next);
      alert(err.response?.data?.message || 'Could not change email reminders');
    }
  };

  const markStatus = async (id, status) => {
    try {
      await axios.put(`${API_URL}/api/reminders/${id}`, { status }, { headers: authHeaders() });
      loadReminders();
    } catch (err) {
      console.error('Error updating reminder:', err);
    }
  };

  // Pushes a reminder's due date out a week and clears its Overdue state,
  // so it drops back into the Upcoming list instead of nagging today.
  const snoozeReminder = async (rem) => {
    const base = new Date(rem.dueDate);
    if (isNaN(base.getTime())) return;
    base.setDate(base.getDate() + 7);
    const newDueDate = base.toISOString().slice(0, 10);
    try {
      await axios.put(`${API_URL}/api/reminders/${rem._id}`,
        { dueDate: newDueDate, status: 'Upcoming' },
        { headers: authHeaders() });
      loadReminders();
    } catch (err) {
      console.error('Error snoozing reminder:', err);
    }
  };

  const removeReminder = async (id) => {
    setDeleting(true);
    try {
      await axios.delete(`${API_URL}/api/reminders/${id}`, { headers: authHeaders() });
      setConfirmDeleteId(null);
      loadReminders();
    } catch (err) {
      console.error('Error removing reminder:', err);
      alert(err.response?.data?.message || 'Could not remove reminder');
    } finally {
      setDeleting(false);
    }
  };

  const markAllRead = async () => {
    try {
      await axios.put(`${API_URL}/api/reminders/mark-all-read${scopeParam}`, {}, { headers: authHeaders() });
      loadReminders();
    } catch (err) {
      console.error('Error marking reminders read:', err);
    }
  };

  const bookNow = (rem) => {
    // Hand the pet + clinic straight to the booking flow so the owner isn't
    // retyping what the reminder already knows.
    navigate('/appointments', { state: { petId: rem.petId, petName: rem.pet, clinic: rem.clinic } });
  };

  const handlePetSelect = (petId) => {
    const p = pets.find((p) => p._id === petId);
    setNewReminder((f) => ({ ...f, pet: petId, petName: p ? p.name : '' }));
  };

  const submitReminder = async (e) => {
    e.preventDefault();
    if (!newReminder.title || !newReminder.dueDate) {
      alert('Please add a title and due date.');
      return;
    }
    setSaving(true);
    try {
      await axios.post(`${API_URL}/api/reminders`, newReminder, { headers: authHeaders() });
      setShowAddForm(false);
      setNewReminder({ pet: '', petName: '', title: '', dueDate: '', time: '', clinic: '', category: 'Vaccination' });
      loadReminders();
    } catch (err) {
      alert(err.response?.data?.message || 'Could not save reminder');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 md:p-8 bg-[#f8f7f4] min-h-screen font-sans text-stone-800">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Reminders</h1>
          <p className="text-xs text-stone-400 mt-1">Approved appointments, vaccination deadlines, and parasite schedules.</p>
        </div>
        <div className="flex flex-wrap justify-end gap-3">
          {!admin && (
            <button
              onClick={toggleEmails}
              title="We email you 3 days before and on the day a reminder is due"
              className="px-4 py-2.5 bg-white border border-stone-200 hover:bg-stone-50 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
            >
              ✉️ EMAIL REMINDERS: <span className={emailOn ? 'text-[#48634e]' : 'text-stone-400'}>{emailOn ? 'ON' : 'OFF'}</span>
            </button>
          )}
          <button
            onClick={markAllRead}
            disabled={unreadCount === 0}
            className="px-4 py-2.5 bg-white border border-stone-200 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
          >
            MARK ALL READ{unreadCount > 0 ? ` (${unreadCount})` : ''}
          </button>
          {!admin && (
            <button
              onClick={() => setShowAddForm(true)}
              className="px-4 py-2.5 bg-[#48634e] hover:bg-[#3b5240] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
            >
              + SET REMINDER
            </button>
          )}
        </div>
      </div>

      {loading && <div className="text-sm text-stone-400 mb-4">Loading reminders...</div>}

      {/* Filters */}
      {reminders.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <select
            value={petFilter}
            onChange={(e) => setPetFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-semibold text-stone-700 outline-none"
          >
            <option value="">All pets</option>
            {petOptions.map((p) => <option key={p.key} value={p.key}>{p.name}{p.code ? ` · ${p.code}` : ''}</option>)}
          </select>
          <div className="flex flex-wrap gap-2">
            {categoriesInUse.map((c) => (
              <button
                key={c}
                onClick={() => setCatFilter(c)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-bold cursor-pointer transition-all ${catFilter === c ? 'bg-[#48634e] text-white' : 'bg-white border border-stone-200 text-stone-500 hover:bg-stone-50'}`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Overdue — staff see it grouped by owner (who to contact); owners see their own items */}
      {overdue.length > 0 && (
        <div className="mb-8 space-y-3">
          <div className="flex items-center space-x-2 text-xs font-bold text-red-600 mb-2 uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-red-600"></span>
            <span>OVERDUE{admin ? ` · ${overdueByOwner.length} owner${overdueByOwner.length === 1 ? '' : 's'} to contact` : ''}</span>
          </div>

          {admin ? (
            overdueByOwner.map((g) => (
              <div key={g.key} className="p-5 bg-[#fef2f2] border border-red-200 rounded-3xl">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <h3 className="font-bold text-red-900 text-sm">{g.name}</h3>
                  <div className="flex flex-wrap gap-3 text-xs font-semibold">
                    {g.phone && <a href={`tel:${g.phone}`} className="text-red-700 hover:underline">📞 {g.phone}</a>}
                    {g.email && <a href={`mailto:${g.email}`} className="text-red-700 hover:underline">✉️ {g.email}</a>}
                  </div>
                </div>
                <div className="space-y-2">
                  {g.items.map((rem) => (
                    <div key={rem._id} className="flex flex-wrap items-center justify-between gap-2 bg-white/70 rounded-xl px-3 py-2 text-xs">
                      <span>
                        <b className="text-red-900">{rem.pet}</b>{rem.petCode ? <span className="text-red-400"> · {rem.petCode}</span> : null}
                        <span className="text-red-800"> — {rem.title}</span>
                      </span>
                      <span className="text-red-600 font-semibold">{relativeDue(rem.dueDate)} ({rem.dueDate})</span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            overdue.map((rem) => {
              const isAppointment = rem.source === 'Appointment' || rem.category === 'Appointment';

              return (
                <div key={rem._id} className="p-6 bg-[#fef2f2] border border-red-200 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-red-900 text-sm">{rem.title}</h3>
                    <p className="text-xs text-red-600 mt-0.5">
                      {rem.pet ? `${rem.pet}${rem.petCode ? ` (${rem.petCode})` : ''} is` : 'This item is'} {relativeDue(rem.dueDate)} — it was due {rem.dueDate}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => markStatus(rem._id, 'Done')} className="px-4 py-2 bg-white border border-red-200 hover:bg-red-50 text-red-700 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer">
                      DISMISS
                    </button>

                    {/* Book a visit for anything the clinic can do; MARK DONE for the rest */}
                    <button onClick={() => bookNow(rem)} className="px-4 py-2 bg-[#991b1b] hover:bg-[#7f1d1d] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer">
                      BOOK NOW
                    </button>
                    {!isAppointment && (
                      <button onClick={() => markStatus(rem._id, 'Done')} className="px-4 py-2 bg-[#48634e] hover:bg-[#3b5240] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer">
                        MARK DONE
                      </button>
                    )}

                    <button onClick={() => setConfirmDeleteId(rem._id)} title="Remove reminder" className="px-3 py-2 bg-white border border-red-200 hover:bg-red-50 text-red-400 hover:text-red-700 rounded-xl transition-all cursor-pointer">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Upcoming, grouped by pet */}
      <div>
        <span className="text-[10px] font-bold text-stone-400 tracking-wider uppercase block mb-3">UPCOMING</span>

        {upcoming.length === 0 && !loading && (
          <div className="bg-white p-8 rounded-2xl border border-stone-100 text-center">
            <div className="text-3xl mb-2">🐾</div>
            <p className="text-sm font-semibold text-stone-700">
              {reminders.length === 0 ? 'No reminders yet' : visible.length === 0 ? 'Nothing matches these filters' : 'You’re all caught up'}
            </p>
            <p className="text-xs text-stone-400 mt-1">
              {admin
                ? 'Reminders appear here when visits are approved and records are added.'
                : 'Add a reminder yourself, or book a visit and we’ll remind you when it’s time.'}
            </p>
            {!admin && (
              <div className="flex justify-center gap-2 mt-4">
                <button onClick={() => setShowAddForm(true)} className="px-4 py-2 bg-[#48634e] hover:bg-[#3b5240] text-white font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer">+ Set reminder</button>
                <button onClick={() => navigate('/appointments')} className="px-4 py-2 bg-white border border-stone-200 hover:bg-stone-50 font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer">Book an appointment</button>
              </div>
            )}
          </div>
        )}

        <div className="space-y-6">
          {groups.map((g) => (
            <div key={g.key}>
              <div className="flex items-center gap-2 mb-2 px-1">
                <span className="w-7 h-7 rounded-full bg-[#ebf0eb] flex items-center justify-center text-sm">{TYPE_ICON[g.type] || '🐾'}</span>
                <h3 className="text-sm font-bold text-stone-900">{g.name}</h3>
                {g.code && <span className="px-2 py-0.5 bg-[#e2ebe2] text-[#48634e] rounded-md text-[10px] font-extrabold tracking-wider">{g.code}</span>}
                <span className="text-[11px] text-stone-400">{g.items.length} reminder{g.items.length === 1 ? '' : 's'}</span>
              </div>
              <div className="space-y-3">
                {g.items.map((rem) => (
                  <div key={rem._id} className="bg-white p-4 rounded-2xl border border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                    <div className="flex items-center space-x-4">
                      {!rem.read && <span className="w-2 h-2 rounded-full bg-[#48634e] flex-shrink-0" title="Unread"></span>}
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-bold text-xs text-stone-900">{rem.title}</h4>
                          <span className="px-2 py-0.5 rounded-full bg-[#f1f1ef] text-stone-500 text-[9px] font-bold uppercase tracking-wider">{rem.category}</span>
                          {rem.source === 'Appointment' && (
                            <span className="px-2 py-0.5 rounded-full bg-[#ebf0eb] text-[#48634e] text-[9px] font-bold uppercase tracking-wider">
                              Approved visit
                            </span>
                          )}
                          {rem.source === 'Follow-up' && (
                            <span className="px-2 py-0.5 rounded-full bg-[#ebf0eb] text-[#48634e] text-[9px] font-bold uppercase tracking-wider">
                              Auto follow-up
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-stone-400">
                          <b className={daysBetween(todayStr(), rem.dueDate) <= 3 ? 'text-amber-600' : 'text-stone-500'}>{relativeDue(rem.dueDate)}</b>
                          {' · '}{rem.dueDate}{rem.time ? ` at ${rem.time}` : ''}{rem.clinic ? ` • ${rem.clinic}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 self-end sm:self-center">
                      <CalendarButton rem={rem} />
                      {!admin && rem.category !== 'Appointment' && (
                        <button onClick={() => bookNow(rem)} className="px-3.5 py-1.5 bg-[#f9f9f8] hover:bg-stone-100 text-stone-600 font-bold text-[11px] uppercase tracking-wider rounded-lg transition-all cursor-pointer">
                          BOOK
                        </button>
                      )}
                      <button onClick={() => snoozeReminder(rem)} className="px-3.5 py-1.5 bg-[#f9f9f8] hover:bg-stone-100 text-stone-600 font-bold text-[11px] uppercase tracking-wider rounded-lg transition-all cursor-pointer">
                        SNOOZE
                      </button>
                      <button onClick={() => markStatus(rem._id, 'Done')} className="px-3.5 py-1.5 bg-[#48634e] hover:bg-[#3b5240] text-white font-bold text-[11px] uppercase tracking-wider rounded-lg transition-all cursor-pointer">
                        MARK DONE
                      </button>
                      <button onClick={() => setConfirmDeleteId(rem._id)} title="Remove reminder" className="px-2.5 py-1.5 bg-[#f9f9f8] hover:bg-red-50 text-stone-400 hover:text-red-600 rounded-lg transition-all cursor-pointer">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Completed (collapsed by default) */}
      {completed.length > 0 && (
        <div className="mt-8">
          <button onClick={() => setShowDone((v) => !v)} className="text-[10px] font-bold text-stone-400 hover:text-stone-600 tracking-wider uppercase cursor-pointer">
            {showDone ? '▾' : '▸'} COMPLETED ({completed.length})
          </button>
          {showDone && (
            <div className="space-y-2 mt-3">
              {completed.map((rem) => (
                <div key={rem._id} className="bg-white/70 p-3 rounded-2xl border border-stone-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-stone-500">
                    <b className="text-stone-700">{rem.pet}</b>{rem.petCode ? ` · ${rem.petCode}` : ''} — <span className="line-through">{rem.title}</span>
                  </span>
                  <span className="flex items-center gap-3 text-stone-400">
                    <span>{rem.completedAt ? `Done ${new Date(rem.completedAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}` : `Was due ${rem.dueDate}`}</span>
                    <button onClick={() => markStatus(rem._id, 'Upcoming')} className="font-bold text-[#48634e] hover:underline cursor-pointer">UNDO</button>
                    <button onClick={() => setConfirmDeleteId(rem._id)} className="font-bold text-red-400 hover:text-red-600 cursor-pointer">REMOVE</button>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Set Reminder modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-bold text-stone-900 mb-4">Set a reminder</h2>
            <form onSubmit={submitReminder} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Pet</label>
                <select
                  value={newReminder.pet}
                  onChange={(e) => handlePetSelect(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-stone-200 rounded-xl text-sm"
                >
                  <option value="">— Not tied to a registered pet —</option>
                  {pets.map((p) => (
                    <option key={p._id} value={p._id}>{p.name}{p.petId ? ` · ${p.petId}` : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Title</label>
                <input
                  type="text"
                  value={newReminder.title}
                  onChange={(e) => setNewReminder((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Rabies Booster"
                  className="w-full mt-1 px-3 py-2 border border-stone-200 rounded-xl text-sm"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Due date</label>
                  <input
                    type="date"
                    value={newReminder.dueDate}
                    onChange={(e) => setNewReminder((f) => ({ ...f, dueDate: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 border border-stone-200 rounded-xl text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Time</label>
                  <input
                    type="time"
                    value={newReminder.time}
                    onChange={(e) => setNewReminder((f) => ({ ...f, time: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 border border-stone-200 rounded-xl text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Clinic</label>
                <input
                  type="text"
                  value={newReminder.clinic}
                  onChange={(e) => setNewReminder((f) => ({ ...f, clinic: e.target.value }))}
                  placeholder="e.g. Dogwood Animal Clinic"
                  className="w-full mt-1 px-3 py-2 border border-stone-200 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Category</label>
                <select
                  value={newReminder.category}
                  onChange={(e) => setNewReminder((f) => ({ ...f, category: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 border border-stone-200 rounded-xl text-sm"
                >
                  {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 bg-white border border-stone-200 hover:bg-stone-50 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-[#48634e] hover:bg-[#3b5240] disabled:opacity-60 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                >
                  {saving ? 'Saving…' : 'Save reminder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Remove-reminder confirmation */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-lg font-bold text-stone-900 mb-2">Remove this reminder?</h2>
            <p className="text-sm text-stone-500 mb-6">This can’t be undone.</p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2 bg-white border border-stone-200 hover:bg-stone-50 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => removeReminder(confirmDeleteId)}
                disabled={deleting}
                className="px-4 py-2 bg-[#991b1b] hover:bg-[#7f1d1d] disabled:opacity-60 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
              >
                {deleting ? 'Removing…' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Reminders;