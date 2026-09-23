import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { isAdmin } from '../utils/auth';

// Attaches the logged-in user's token so the backend can scope results to them
const authHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const CATEGORY_OPTIONS = ['Vaccination', 'Nutrition', 'Grooming', 'Appointment'];

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
  const [newReminder, setNewReminder] = useState({
    pet: '', petName: '', title: '', dueDate: '', time: '', clinic: '', category: 'Vaccination'
  });

  const loadReminders = () => {
    axios.get(`http://localhost:5000/api/reminders${scopeParam}`, { headers: authHeaders() })
      .then((res) => {
        setReminders(res.data);
        setLoading(false);
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
    axios.get(`http://localhost:5000/api/pets${petsParam}`, { headers: authHeaders() })
      .then((res) => setPets(res.data))
      .catch((err) => console.error('Error fetching pets:', err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const overdue = reminders.filter((r) => r.status === 'Overdue');
  const upcoming = reminders.filter((r) => r.status !== 'Overdue' && r.status !== 'Done');
  const unreadCount = reminders.filter((r) => !r.read && r.status !== 'Done').length;

  const markStatus = async (id, status) => {
    try {
      await axios.put(`http://localhost:5000/api/reminders/${id}`, { status }, { headers: authHeaders() });
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
      await axios.put(`http://localhost:5000/api/reminders/${rem._id}`,
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
      await axios.delete(`http://localhost:5000/api/reminders/${id}`, { headers: authHeaders() });
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
      await axios.put(`http://localhost:5000/api/reminders/mark-all-read${scopeParam}`, {}, { headers: authHeaders() });
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
      await axios.post('http://localhost:5000/api/reminders', newReminder, { headers: authHeaders() });
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
        <div className="flex space-x-3">
          <button
            onClick={markAllRead}
            disabled={unreadCount === 0}
            className="px-4 py-2.5 bg-white border border-stone-200 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
          >
            MARK ALL READ{unreadCount > 0 ? ` (${unreadCount})` : ''}
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2.5 bg-[#48634e] hover:bg-[#3b5240] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
          >
            + SET REMINDER
          </button>
        </div>
      </div>

      {loading && <div className="text-sm text-stone-400 mb-4">Loading reminders...</div>}

      {/* Overdue Alert Banners */}
      {overdue.length > 0 && (
        <div className="mb-8 space-y-3">
          <div className="flex items-center space-x-2 text-xs font-bold text-red-600 mb-2 uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-red-600"></span>
            <span>OVERDUE</span>
          </div>
          {overdue.map((rem) => (
            <div key={rem._id} className="p-6 bg-[#fef2f2] border border-red-200 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-red-900 text-sm">{rem.title}</h3>
                <p className="text-xs text-red-600 mt-0.5">{rem.pet} is currently overdue since {rem.dueDate}</p>
              </div>
              <div className="flex space-x-2">
                <button onClick={() => markStatus(rem._id, 'Done')} className="px-4 py-2 bg-white border border-red-200 hover:bg-red-50 text-red-700 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer">
                  DISMISS
                </button>
                <button onClick={() => bookNow(rem)} className="px-4 py-2 bg-[#991b1b] hover:bg-[#7f1d1d] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer">
                  BOOK NOW
                </button>
                <button onClick={() => setConfirmDeleteId(rem._id)} title="Remove reminder" className="px-3 py-2 bg-white border border-red-200 hover:bg-red-50 text-red-400 hover:text-red-700 rounded-xl transition-all cursor-pointer">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upcoming List */}
      <div>
        <span className="text-[10px] font-bold text-stone-400 tracking-wider uppercase block mb-3">UPCOMING</span>
        <div className="space-y-3">
          {upcoming.length === 0 && !loading && (
            <div className="bg-white p-6 rounded-2xl border border-stone-100 text-sm text-stone-400 text-center">
              No upcoming reminders.
            </div>
          )}
          {upcoming.map((rem) => (
            <div key={rem._id} className="bg-white p-4 rounded-2xl border border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center space-x-4">
                {!rem.read && <span className="w-2 h-2 rounded-full bg-[#48634e] flex-shrink-0" title="Unread"></span>}
                <span className="px-3 py-1 bg-[#f9f9f8] border border-stone-200/60 rounded-lg text-[11px] font-bold text-stone-600">
                  {rem.pet}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-xs text-stone-900">{rem.title}</h4>
                    {rem.source === 'Appointment' && (
                      <span className="px-2 py-0.5 rounded-full bg-[#ebf0eb] text-[#48634e] text-[9px] font-bold uppercase tracking-wider">
                        Approved visit
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-stone-400">{rem.date} • {rem.clinic}</p>
                </div>
              </div>
              <div className="flex space-x-2 self-end sm:self-center">
                <button onClick={() => snoozeReminder(rem)} className="px-3.5 py-1.5 bg-[#f9f9f8] hover:bg-stone-100 text-stone-600 font-bold text-[11px] uppercase tracking-wider rounded-lg transition-all cursor-pointer">
                  SNOOZE
                </button>
                <button onClick={() => markStatus(rem._id, 'Done')} className="px-3.5 py-1.5 bg-[#48634e] hover:bg-[#3b5240] text-white font-bold text-[11px] uppercase tracking-wider rounded-lg transition-all cursor-pointer">
                  SCHEDULE
                </button>
                <button onClick={() => setConfirmDeleteId(rem._id)} title="Remove reminder" className="px-2.5 py-1.5 bg-[#f9f9f8] hover:bg-red-50 text-stone-400 hover:text-red-600 rounded-lg transition-all cursor-pointer">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

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
                    <option key={p._id} value={p._id}>{p.name}</option>
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
