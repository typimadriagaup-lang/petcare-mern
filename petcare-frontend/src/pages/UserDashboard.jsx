import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser } from '../utils/auth';

const APPT_API = 'http://localhost:5000/api/appointments';

function UserDashboard() {
  const navigate = useNavigate();
  const user = getCurrentUser();

  const [appointments, setAppointments] = useState([]);
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadUserData = () => {
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      axios.get(APPT_API, { headers }),
      axios.get('http://localhost:5000/api/pets', { headers })
    ])
      .then(([apptRes, petsRes]) => {
        const userId = user?._id || user?.id;
        const userEmail = user?.email;

        // Filter pets belonging strictly to the logged-in user
        const allPets = Array.isArray(petsRes.data) ? petsRes.data : [];
        const myPets = allPets.filter(p => {
          const ownerId = p.owner?._id || p.owner || p.userId || p.user;
          return ownerId === userId || p.ownerEmail === userEmail || p.email === userEmail;
        });

        // Get names of the user's pets for fallback appointment mapping
        const myPetNames = myPets.map(p => p.name?.toLowerCase());

        // Filter appointments belonging strictly to the user or their pets
        const allAppts = Array.isArray(apptRes.data) ? apptRes.data : [];
        const myAppts = allAppts.filter(a => {
          const apptUserId = a.user?._id || a.user || a.userId;
          const matchesUser = apptUserId === userId;
          const matchesPet = a.petName && myPetNames.includes(a.petName.toLowerCase());
          return matchesUser || matchesPet;
        });

        setAppointments(myAppts);
        setPets(myPets);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error loading user dashboard data:', err);
        setLoading(false);
      });
  };
   
   // eslint-disable-next-line react-hooks/exhaustive-deps
   useEffect(loadUserData, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const firstName = (user?.name || 'Pet Owner').split(' ')[0];

  const upcomingAppointments = appointments.filter(a => a.queueStatus !== 'Done' && a.approvalStatus !== 'Declined');

  return (
    <div className="p-6 md:p-8 bg-[#f8f7f4] min-h-screen font-sans text-stone-800">
      
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-stone-900 tracking-tight">
            {greeting}, {firstName}
          </h1>
          <p className="text-stone-500 text-sm mt-1">Here is the status of your pets and appointments.</p>
        </div>
        <button
          onClick={() => navigate('/appointments')}
          className="px-4 py-2.5 bg-[#48634e] hover:bg-[#3b5240] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm"
        >
          Book Appointment
        </button>
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