import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, authHeaders } from '../utils/auth';
import { API_URL } from '../config';

const APPT_API = `${API_URL}/api/appointments`;

function Dashboard() {
  const navigate = useNavigate();
  const admin = getCurrentUser();

  const [stats, setStats] = useState({
    todaysAppointments: 0,
    totalPatients: 0,
    activeServices: 0,
    pendingApprovals: 0
  });
  const [queue, setQueue] = useState([]);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const loadAll = () => {
    Promise.all([
      axios.get(`${API_URL}/api/clinic/dashboard`, { headers: authHeaders() }),
      axios.get(APPT_API, { params: { approvalStatus: 'Pending' }, headers: authHeaders() })
    ])
      .then(([dashRes, pendingRes]) => {
        setStats(dashRes.data.stats);
        setQueue(dashRes.data.queue);
        setPending(pendingRes.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error loading dashboard data:', err);
        setLoading(false);
      });
  };

  useEffect(loadAll, []);

  const decide = async (id, action) => {
    setBusyId(id);
    try {
      await axios.put(`${APPT_API}/${id}/${action}`, {}, { headers: authHeaders() });
      loadAll();
    } catch (err) {
      alert(err.response?.data?.message || `Could not ${action} the appointment`);
    } finally {
      setBusyId(null);
    }
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const firstName = (admin?.name || 'Doctor').split(' ')[0];

  return (
    <div className="p-6 md:p-8 page-bg min-h-screen font-sans text-stone-800">

      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-stone-900 tracking-tight">
            {greeting}, {firstName}
          </h1>
          <p className="text-stone-500 text-sm mt-1">Here's what's happening at your clinic today.</p>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <button
          onClick={() => navigate('/appointments')}
          className={`text-left bg-white p-5 rounded-2xl border shadow-sm flex items-center space-x-4 transition-all cursor-pointer ${
            stats.pendingApprovals > 0 ? 'border-amber-200 hover:border-amber-300' : 'border-stone-100 hover:border-stone-200'
          }`}
        >
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
            stats.pendingApprovals > 0 ? 'bg-amber-50 text-amber-600' : 'bg-[#ebf0eb] text-[#48634e]'
          }`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-stone-900 leading-none">
              {loading ? '—' : stats.pendingApprovals}
            </div>
            <div className="text-xs text-stone-500 font-medium mt-1">Pending Approvals</div>
          </div>
        </button>

        <div className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 bg-[#ebf0eb] text-[#48634e] rounded-xl flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-stone-900 leading-none">
              {loading ? '—' : stats.todaysAppointments}
            </div>
            <div className="text-xs text-stone-500 font-medium mt-1">Today's Appointments</div>
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
              {loading ? '—' : stats.totalPatients}
            </div>
            <div className="text-xs text-stone-500 font-medium mt-1">Total Patients</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 bg-[#ebf0eb] text-[#48634e] rounded-xl flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0v-5a2 2 0 012-2h2a2 2 0 012 2v5m-6 0h6" />
            </svg>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-stone-900 leading-none">
              {loading ? '—' : stats.activeServices}
            </div>
            <div className="text-xs text-stone-500 font-medium mt-1">Active Services</div>
          </div>
        </div>
      </div>

      {/* Main Content Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column (2 Cols Wide) */}
        <div className="lg:col-span-2 space-y-6">

          {/* Pending Approvals Card */}
          <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-stone-900">Needs Your Approval</h2>
              {pending.length > 0 && (
                <button
                  onClick={() => navigate('/appointments')}
                  className="text-xs font-bold text-[#48634e] hover:underline cursor-pointer"
                >
                  View all
                </button>
              )}
            </div>

            <div className="space-y-3">
              {!loading && pending.length === 0 && (
                <p className="text-xs text-stone-400 text-center py-4">No pending booking requests. You're all caught up.</p>
              )}
              {pending.slice(0, 4).map((appt) => (
                <div
                  key={appt._id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-[#f9f9f8] rounded-2xl border border-stone-100"
                >
                  <div>
                    <h3 className="text-sm font-bold text-stone-900">{appt.service}</h3>
                    <p className="text-xs text-stone-500 mt-0.5">
                      {appt.petName} • {appt.date}{appt.time ? ` at ${appt.time}` : ''}
                    </p>
                  </div>
                  <div className="flex space-x-2 self-end sm:self-center">
                    <button
                      onClick={() => decide(appt._id, 'decline')}
                      disabled={busyId === appt._id}
                      className="px-3.5 py-1.5 bg-white border border-red-200 hover:bg-red-50 text-red-600 font-bold text-[11px] uppercase tracking-wider rounded-lg transition-all cursor-pointer disabled:opacity-50"
                    >
                      Decline
                    </button>
                    <button
                      onClick={() => decide(appt._id, 'approve')}
                      disabled={busyId === appt._id}
                      className="px-3.5 py-1.5 bg-[#48634e] hover:bg-[#3b5240] text-white font-bold text-[11px] uppercase tracking-wider rounded-lg transition-all cursor-pointer disabled:opacity-50"
                    >
                      Accept
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Today's Queue Card */}
          <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-stone-900">Today's Queue</h2>
              <button
                onClick={() => navigate('/admin')}
                className="text-xs font-bold text-[#48634e] hover:underline cursor-pointer"
              >
                Manage
              </button>
            </div>
            <div className="space-y-3">
              {!loading && queue.length === 0 && (
                <p className="text-xs text-stone-400 text-center py-4">No approved appointments for today yet.</p>
              )}
              {queue.slice(0, 5).map((item) => {
                let statusStyle = 'bg-[#ebf0eb] text-[#48634e]';
                if (item.queueStatus === 'Done') statusStyle = 'bg-[#dcfce7] text-[#15803d]';
                else if (item.queueStatus === 'In Progress') statusStyle = 'bg-[#fef3c7] text-[#b45309]';

                return (
                  <div
                    key={item._id}
                    className="flex items-center justify-between p-3.5 bg-[#f9f9f8] rounded-2xl border border-stone-100 text-sm"
                  >
                    <div className="flex items-center space-x-4">
                      <span className="text-xs font-semibold text-stone-500 w-12">{item.time}</span>
                      <div>
                        <div className="font-bold text-stone-900">{item.pet}</div>
                        <div className="text-xs text-stone-400">{item.service}</div>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-[11px] font-bold tracking-tight ${statusStyle}`}>
                      {item.queueStatus}
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
                Review appointment requests
              </button>
              <button
                onClick={() => navigate('/admin')}
                className="w-full text-left px-4 py-3 bg-[#f9f9f8] hover:bg-stone-100 rounded-xl text-sm font-semibold text-stone-700 transition-all cursor-pointer"
              >
                Manage services & queue
              </button>
              <button
                onClick={() => navigate('/medical-records')}
                className="w-full text-left px-4 py-3 bg-[#f9f9f8] hover:bg-stone-100 rounded-xl text-sm font-semibold text-stone-700 transition-all cursor-pointer"
              >
                Open medical records
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

export default Dashboard;
