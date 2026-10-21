import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser } from '../utils/auth';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const APPT_API = `${API_URL}/api/appointments`;

function UserDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => getCurrentUser());

  const [appointments, setAppointments] = useState([]);
  const [pets, setPets] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State and Ref for Notification Dropdown
  const [showNotifs, setShowNotifs] = useState(false);
  const notifRef = useRef(null);

  // Synchronize state when profile updates in Profile.jsx
  useEffect(() => {
    const syncUser = () => {
      setUser(getCurrentUser());
    };

    window.addEventListener('userUpdated', syncUser);
    window.addEventListener('storage', syncUser);

    return () => {
      window.removeEventListener('userUpdated', syncUser);
      window.removeEventListener('storage', syncUser);
    };
  }, []);

  // Close notification dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifs(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadUserData = () => {
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      axios.get(APPT_API, { headers }),
      axios.get(`${API_URL}/api/pets`, { headers }),
      axios.get(`${API_URL}/api/reminders`, { headers })
    ])
      .then(([apptRes, petsRes, remindersRes]) => {
        const userId = user?._id || user?.id;
        const userEmail = user?.email;

        // Filter pets belonging strictly to the logged-in user
        const allPets = Array.isArray(petsRes.data) ? petsRes.data : [];
        const myPets = allPets.filter(p => {
          const ownerId = p.owner?._id || p.owner || p.userId || p.user;
          return ownerId === userId || p.ownerEmail === userEmail || p.email === userEmail;
        });

        // Get names of the user's pets for fallback filtering
        const myPetNames = myPets.map(p => p.name?.toLowerCase());

        // Filter appointments belonging strictly to the user or their pets
        const allAppts = Array.isArray(apptRes.data) ? apptRes.data : [];
        const myAppts = allAppts.filter(a => {
          const apptUserId = a.user?._id || a.user || a.userId;
          const matchesUser = apptUserId === userId;
          const matchesPet = a.petName && myPetNames.includes(a.petName.toLowerCase());
          return matchesUser || matchesPet;
        });

        // Filter reminders belonging to user or user's pets
        const allReminders = Array.isArray(remindersRes.data) ? remindersRes.data : [];
        const myReminders = allReminders.filter(r => {
          const remUserId = r.user?._id || r.user || r.userId;
          const matchesUser = remUserId === userId;
          const matchesPet = r.pet && myPetNames.includes(r.pet.toLowerCase());
          return matchesUser || matchesPet;
        });

        setAppointments(myAppts);
        setPets(myPets);
        setReminders(myReminders);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error loading user dashboard data:', err);
        setLoading(false);
      });
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(loadUserData, [user?._id, user?.id]);

  const markReminderDone = async (id) => {
    const token = localStorage.getItem('token');
    try {
      await axios.put(`${API_URL}/api/reminders/${id}`, { status: 'Done' }, { headers: { Authorization: `Bearer ${token}` } });
      loadUserData();
    } catch (err) {
      console.error('Error updating reminder status:', err);
    }
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const firstName = (user?.firstName || user?.name || 'Pet Owner').split(' ')[0];

  const upcomingAppointments = appointments.filter(a => a.queueStatus !== 'Done' && a.approvalStatus !== 'Declined');
  const activeReminders = reminders.filter(r => r.status !== 'Done');
  const totalNotifCount = upcomingAppointments.length + activeReminders.length;

  return (
    <div className="p-6 md:p-8 page-bg min-h-screen font-sans text-stone-800">
      
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-stone-900 tracking-tight">
            {greeting}, {firstName}
          </h1>
          <p className="text-stone-500 text-sm mt-1">Here is the status of your pets and appointments.</p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Notification Button & Dropdown Container */}
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => setShowNotifs((prev) => !prev)}
              className="relative p-2.5 bg-white hover:bg-stone-100 text-stone-700 rounded-xl border border-stone-200 transition-all cursor-pointer shadow-sm flex items-center justify-center"
              title="Notifications"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {totalNotifCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
              )}
            </button>

            {/* Dropdown Menu */}
            {showNotifs && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl border border-stone-200 shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="p-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
                  <h3 className="font-bold text-stone-900 text-sm">Notifications</h3>
                  <span className="text-[10px] font-bold bg-[#ebf0eb] text-[#48634e] px-2 py-0.5 rounded-full">
                    {totalNotifCount} Active
                  </span>
                </div>

                <div className="max-h-80 overflow-y-auto p-2 space-y-2 divide-y divide-stone-100">
                  {totalNotifCount === 0 && (
                    <div className="py-6 text-center text-xs text-stone-400">
                      No new notifications
                    </div>
                  )}

                  {/* Upcoming Appointments List */}
                  {upcomingAppointments.length > 0 && (
                    <div className="pt-2 first:pt-0">
                      <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-stone-400">
                        Upcoming Appointments ({upcomingAppointments.length})
                      </p>
                      {upcomingAppointments.map((appt) => (
                        <div key={appt._id} className="p-2.5 rounded-xl hover:bg-stone-50 transition-colors">
                          <div className="flex justify-between items-start">
                            <span className="font-bold text-xs text-stone-900">{appt.service}</span>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-stone-100 text-stone-600">
                              {appt.approvalStatus || appt.queueStatus || 'Scheduled'}
                            </span>
                          </div>
                          <p className="text-[11px] text-stone-500 mt-0.5">
                            {appt.petName ? `${appt.petName} • ` : ''}{appt.date}{appt.time ? ` at ${appt.time}` : ''}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Active Care Reminders */}
                  {activeReminders.length > 0 && (
                    <div className="pt-2">
                      <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-stone-400">
                        Care Reminders ({activeReminders.length})
                      </p>
                      {activeReminders.map((rem) => (
                        <div key={rem._id} className="p-2.5 rounded-xl hover:bg-stone-50 transition-colors">
                          <div className="font-bold text-xs text-stone-900">{rem.title}</div>
                          <p className="text-[11px] text-stone-500 mt-0.5">
                            {rem.pet ? `${rem.pet} • ` : ''}Due: {rem.dueDate || rem.date}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => navigate('/appointments')}
            className="px-4 py-2.5 bg-[#48634e] hover:bg-[#3b5240] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm"
          >
            Book Appointment
          </button>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 bg-[#ebf0eb] text-[#48634e] rounded-xl flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-stone-900 leading-none">
              {loading ? '—' : upcomingAppointments.length}
            </div>
            <div className="text-xs text-stone-500 font-medium mt-1">Upcoming Appointments</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 bg-[#ebf0eb] text-[#48634e] rounded-xl flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-stone-900 leading-none">
              {loading ? '—' : pets.length}
            </div>
            <div className="text-xs text-stone-500 font-medium mt-1">Registered Pets</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 bg-[#ebf0eb] text-[#48634e] rounded-xl flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-stone-900 leading-none">
              {loading ? '—' : appointments.length}
            </div>
            <div className="text-xs text-stone-500 font-medium mt-1">Total History</div>
          </div>
        </div>
      </div>

      {/* Main Content Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column (2 Cols Wide) */}
        <div className="lg:col-span-2 space-y-6">

          {/* Active Reminders Card */}
          <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-stone-900">Pet Care Reminders</h2>
              <button
                onClick={() => navigate('/reminders')}
                className="text-xs font-bold text-[#48634e] hover:underline cursor-pointer"
              >
                View all
              </button>
            </div>

            <div className="space-y-3">
              {!loading && activeReminders.length === 0 && (
                <p className="text-xs text-stone-400 text-center py-4">No active reminders for your pets.</p>
              )}
              {activeReminders.slice(0, 4).map((rem) => {
                const isOverdue = rem.status === 'Overdue';
                return (
                  <div
                    key={rem._id}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl border ${
                      isOverdue ? 'bg-[#fef2f2] border-red-200' : 'bg-[#f9f9f8] border-stone-100'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className={`text-sm font-bold ${isOverdue ? 'text-red-900' : 'text-stone-900'}`}>
                          {rem.title}
                        </h3>
                        {isOverdue && (
                          <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[9px] font-bold uppercase tracking-wider">
                            Overdue
                          </span>
                        )}
                      </div>
                      <p className={`text-xs mt-0.5 ${isOverdue ? 'text-red-600' : 'text-stone-500'}`}>
                        {rem.pet ? `${rem.pet} • ` : ''}Due: {rem.dueDate || rem.date}
                      </p>
                    </div>

                    <div className="flex space-x-2 self-end sm:self-center">
                      <button
                        onClick={() => markReminderDone(rem._id)}
                        className={`px-3.5 py-1.5 font-bold text-[11px] uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                          isOverdue
                            ? 'bg-red-600 hover:bg-red-700 text-white'
                            : 'bg-[#48634e] hover:bg-[#3b5240] text-white'
                        }`}
                      >
                        Mark Done
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Appointments Card */}
          <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-stone-900">Your Appointments</h2>
            </div>
            <div className="space-y-3">
              {!loading && appointments.length === 0 && (
                <p className="text-xs text-stone-400 text-center py-4">You have no appointments booked yet.</p>
              )}
              {appointments.slice(0, 5).map((appt) => {
                let badgeStyle = 'bg-[#ebf0eb] text-[#48634e]';
                if (appt.approvalStatus === 'Pending') badgeStyle = 'bg-amber-50 text-amber-600';
                else if (appt.approvalStatus === 'Declined') badgeStyle = 'bg-red-50 text-red-600';

                return (
                  <div
                    key={appt._id}
                    className="flex items-center justify-between p-3.5 bg-[#f9f9f8] rounded-2xl border border-stone-100 text-sm"
                  >
                    <div>
                      <div className="font-bold text-stone-900">{appt.service}</div>
                      <div className="text-xs text-stone-500 mt-0.5">
                        {appt.petName} • {appt.date}{appt.time ? ` at ${appt.time}` : ''}
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-[11px] font-bold tracking-tight ${badgeStyle}`}>
                      {appt.approvalStatus || appt.queueStatus || 'Scheduled'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Right Column (1 Col Wide) */}
        <div>
          <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm">
            <h2 className="text-lg font-bold text-stone-900 mb-4">Quick Links</h2>
            <div className="space-y-2">
              <button
                onClick={() => navigate('/appointments')}
                className="w-full text-left px-4 py-3 bg-[#f9f9f8] hover:bg-stone-100 rounded-xl text-sm font-semibold text-stone-700 transition-all cursor-pointer"
              >
                Book a new appointment
              </button>
              <button
                onClick={() => navigate('/my-pets')}
                className="w-full text-left px-4 py-3 bg-[#f9f9f8] hover:bg-stone-100 rounded-xl text-sm font-semibold text-stone-700 transition-all cursor-pointer"
              >
                View my pets
              </button>
              <button
                onClick={() => navigate('/reminders')}
                className="w-full text-left px-4 py-3 bg-[#f9f9f8] hover:bg-stone-100 rounded-xl text-sm font-semibold text-stone-700 transition-all cursor-pointer"
              >
                View Reminders
              </button>
              <button
                onClick={() => navigate('/profile')}
                className="w-full text-left px-4 py-3 bg-[#f9f9f8] hover:bg-stone-100 rounded-xl text-sm font-semibold text-stone-700 transition-all cursor-pointer"
              >
                Account settings
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default UserDashboard;