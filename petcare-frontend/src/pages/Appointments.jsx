import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLocation } from 'react-router-dom';
import { isAdmin } from '../utils/auth';
import AppointmentApprovals from './AppointmentApprovals';

const authHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Pet owner view — calendar, upcoming list and the Quick Book form
function OwnerAppointments() {
  const today = new Date();
  const [calendarMonth, setCalendarMonth] = useState(today.getMonth()); // 0-11
  const [calendarYear, setCalendarYear] = useState(today.getFullYear());

  // "Book now" from an overdue Reminder card arrives here with the pet +
  // clinic already known, so we can hand them straight to the form.
  const location = useLocation();
  const bookNowState = location.state || {};

  const [pets, setPets] = useState([]);
  const [services, setServices] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [form, setForm] = useState({
    pet: bookNowState.petId || '',
    petName: bookNowState.petName || '',
    service: 'Annual Wellness Check',
    clinicBranch: bookNowState.clinic || 'Dogwood Animal Clinic',
    date: '',
    time: ''
  });

  const loadAppointments = () => {
    axios.get('http://localhost:5000/api/appointments?mine=true', { headers: authHeaders() })
      .then((res) => setAppointments(res.data))
      .catch((err) => console.error('Error fetching appointments:', err));
  };

  useEffect(() => {
    // Only the logged-in owner's own pets — not every pet in the clinic
    axios.get('http://localhost:5000/api/pets?mine=true', { headers: authHeaders() })
      .then((res) => {
        setPets(res.data);
        // Don't stomp on a pet that "Book now" from Reminders already picked for us
        if (res.data.length > 0) {
          setForm((f) => f.pet ? f : ({ ...f, pet: res.data[0]._id, petName: res.data[0].name }));
        }
      })
      .catch((err) => console.error('Error fetching pets:', err));

    // Service options mirror whatever the clinic admin has configured
    // under Admin Clinic > Clinic Services, so the two stay in sync.
    axios.get('http://localhost:5000/api/clinic/services')
      .then((res) => {
        setServices(res.data);
        if (res.data.length > 0) setForm((f) => ({ ...f, service: res.data[0].name }));
      })
      .catch((err) => console.error('Error fetching services:', err));

    loadAppointments();
  }, []);


  // Completed visits drop off; everything else stays visible with its approval badge
  const upcoming = appointments.filter((a) => a.status !== 'Completed');

  const badgeFor = (appt) => {
    const state = appt.approvalStatus || 'Pending';
    if (state === 'Approved') return { label: 'Approved', className: 'bg-[#ebf0eb] text-[#48634e]' };
    if (state === 'Declined') return { label: 'Declined', className: 'bg-red-50 text-red-600' };
    return { label: 'Pending approval', className: 'bg-amber-50 text-amber-700' };
  };

  const handleBook = async (e) => {
    e.preventDefault();
    if (!form.date) {
      alert('Pick a date for the appointment');
      return;
    }
    if (form.date < todayStr) {
      alert('You can\u2019t book an appointment in the past — please choose today or a later date.');
      return;
    }
    try {
      await axios.post('http://localhost:5000/api/appointments', form, { headers: authHeaders() });
      loadAppointments();
      alert('Request sent! The clinic will review and confirm your appointment.');
    } catch (err) {
      alert(err.response?.data?.message || 'Could not book appointment');
    }
  };

  const cancelAppt = async (id) => {
    try {
      await axios.delete(`http://localhost:5000/api/appointments/${id}`, { headers: authHeaders() });
      loadAppointments();
    } catch (err) {
      console.error('Error cancelling appointment:', err);
    }
  };

  // --- Calendar helpers ---
  const pad2 = (n) => String(n).padStart(2, '0');
  const todayStr = `${today.getFullYear()}-${pad2(today.getMonth() + 1)}-${pad2(today.getDate())}`;

  const goPrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear((y) => y - 1);
    } else {
      setCalendarMonth((m) => m - 1);
    }
  };
  const goNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear((y) => y + 1);
    } else {
      setCalendarMonth((m) => m + 1);
    }
  };

  const monthLabel = new Date(calendarYear, calendarMonth, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  // JS getDay(): 0=Sun..6=Sat. Convert so the grid (Mon..Sun) starts on the right weekday.
  const firstWeekdayMonBased = (new Date(calendarYear, calendarMonth, 1).getDay() + 6) % 7;
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Appointment dates in this month, so the calendar reflects your real bookings
  const datesWithAppointments = new Set(
    appointments
      .filter((a) => a.date && a.date.startsWith(`${calendarYear}-${pad2(calendarMonth + 1)}`))
      .map((a) => a.date)
  );

  const isToday = (day) =>
    day === today.getDate() && calendarMonth === today.getMonth() && calendarYear === today.getFullYear();

  const selectCalendarDay = (day) => {
    const dateStr = `${calendarYear}-${pad2(calendarMonth + 1)}-${pad2(day)}`;
    if (dateStr < todayStr) return; // can't book a visit in the past
    setForm((f) => ({ ...f, date: dateStr }));
  };

  return (
    <div className="p-6 md:p-8 bg-[#f8f7f4] min-h-screen font-sans text-stone-800">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Appointments</h1>
          <p className="text-xs text-stone-400 mt-1">Manage dates, upcoming checkups, and book new clinic visits.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Calendar Widget */}
        <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-stone-100 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-bold text-stone-900 text-base">{monthLabel}</h2>
            <div className="flex space-x-1">
              <button onClick={goPrevMonth} className="p-1.5 bg-[#f9f9f8] hover:bg-stone-100 rounded-lg text-stone-600 cursor-pointer"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/></svg></button>
              <button onClick={goNextMonth} className="p-1.5 bg-[#f9f9f8] hover:bg-stone-100 rounded-lg text-stone-600 cursor-pointer"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg></button>
            </div>
          </div>

          <div className="grid grid-cols-7 text-center text-xs font-semibold text-stone-400 mb-4">
            <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
          </div>

          <div className="grid grid-cols-7 text-center text-xs gap-y-3 font-semibold text-stone-700">
            {Array.from({ length: firstWeekdayMonBased }).map((_, i) => <span key={`pad-${i}`}></span>)}
            {calendarDays.map(day => {
              const dateStr = `${calendarYear}-${pad2(calendarMonth + 1)}-${pad2(day)}`;
              const isPast = dateStr < todayStr;
              const hasAppt = datesWithAppointments.has(dateStr);
              const selected = form.date === dateStr;
              return (
                <div key={day} className="flex justify-center items-center">
                  <button
                    type="button"
                    onClick={() => selectCalendarDay(day)}
                    disabled={isPast}
                    title={isPast ? 'Past dates can\u2019t be booked' : hasAppt ? 'You have an appointment on this day' : 'Set as Quick Book date'}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                      isPast
                        ? 'text-stone-300 cursor-not-allowed'
                        : selected
                        ? 'bg-[#48634e] text-white font-bold cursor-pointer'
                        : hasAppt
                        ? 'bg-[#ebf0eb] text-[#48634e] font-bold ring-1 ring-[#48634e]/40 cursor-pointer'
                        : isToday(day)
                        ? 'text-[#48634e] font-bold ring-1 ring-[#48634e]/40 cursor-pointer'
                        : 'hover:bg-stone-100 cursor-pointer'
                    }`}
                  >
                    {day}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Action Sidebar */}
        <div className="lg:col-span-5 space-y-6">
          {/* Upcoming Section */}
          <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm">
            <h3 className="font-bold text-stone-900 text-sm mb-4">Upcoming</h3>
            <div className="space-y-3">
              {upcoming.length === 0 && (
                <p className="text-xs text-stone-400 text-center py-2">No upcoming appointments.</p>
              )}
              {upcoming.map((appt) => {
                const badge = badgeFor(appt);
                return (
                  <div key={appt._id} className="p-4 bg-[#f9f9f8] rounded-2xl border border-stone-100">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-xs text-stone-900">{appt.service}</h4>
                      <span className="text-[11px] font-bold text-stone-500">{appt.date}</span>
                    </div>
                    <p className="text-[11px] text-stone-400 mt-1">{appt.petName} • {appt.clinicBranch}</p>
                    <span className={`inline-block mt-2 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${badge.className}`}>
                      {badge.label}
                    </span>
                    {appt.approvalStatus === 'Declined' && appt.declineReason && (
                      <p className="text-[11px] text-red-500 mt-1.5">Reason: {appt.declineReason}</p>
                    )}
                    <div className="flex space-x-3 mt-3 text-[11px] font-bold">
                      <button className="text-stone-500 hover:text-stone-800">Reschedule</button>
                      <button onClick={() => cancelAppt(appt._id)} className="text-red-600 hover:text-red-700">
                        {appt.approvalStatus === 'Declined' ? 'Remove' : 'Cancel'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Book Section */}
          <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm">
            <h3 className="font-bold text-stone-900 text-sm mb-4">Quick Book</h3>
            <form onSubmit={handleBook} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-stone-400 tracking-wider uppercase mb-1.5">SELECT PET</label>
                <select
                  value={form.pet}
                  onChange={(e) => {
                    const chosen = pets.find((p) => p._id === e.target.value);
                    setForm({ ...form, pet: e.target.value, petName: chosen ? chosen.name : '' });
                  }}
                  className="w-full p-3 bg-[#f9f9f8] border border-stone-200 rounded-xl text-xs font-semibold text-stone-700 outline-none"
                >
                  {pets.length === 0 && <option value="">No pets yet</option>}
                  {pets.map((p) => (
                    <option key={p._id} value={p._id}>{p.name} ({p.breed})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-stone-400 tracking-wider uppercase mb-1.5">SERVICE TYPE</label>
                <select
                  value={form.service}
                  onChange={(e) => setForm({ ...form, service: e.target.value })}
                  className="w-full p-3 bg-[#f9f9f8] border border-stone-200 rounded-xl text-xs font-semibold text-stone-700 outline-none"
                >
                  {services.length === 0 && <option value="">No services yet</option>}
                  {services.map((s) => (
                    <option key={s._id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-stone-400 tracking-wider uppercase mb-1.5">DATE</label>
                <input
                  type="date"
                  value={form.date}
                  min={todayStr}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full p-3 bg-[#f9f9f8] border border-stone-200 rounded-xl text-xs font-semibold text-stone-700 outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-stone-400 tracking-wider uppercase mb-1.5">TIME</label>
                <input
                  type="time"
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                  className="w-full p-3 bg-[#f9f9f8] border border-stone-200 rounded-xl text-xs font-semibold text-stone-700 outline-none"
                />
              </div>

              <button type="submit" className="w-full py-3 bg-[#48634e] hover:bg-[#3b5240] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer">
                CONTINUE
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

// Clinic admins get the approval queue instead of the booking view
function Appointments() {
  return isAdmin() ? <AppointmentApprovals /> : <OwnerAppointments />;
}

export default Appointments;
