import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { authHeaders } from '../utils/auth';
import { API_URL } from '../config';

const API = `${API_URL}/api/appointments`;

function AppointmentApprovals() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('Pending');
  const [busyId, setBusyId] = useState(null);

  const loadAppointments = () => {
    axios.get(API, { headers: authHeaders() })
      .then((res) => {
        setAppointments(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching appointments:', err);
        setLoading(false);
      });
  };

  useEffect(loadAppointments, []);

  const byStatus = (status) =>
    appointments.filter((a) => (a.approvalStatus || 'Pending') === status);

  const pending = byStatus('Pending');
  const approved = byStatus('Approved');
  const declined = byStatus('Declined');

  const visible = tab === 'Pending' ? pending : tab === 'Approved' ? approved : declined;

  const decide = async (id, action) => {
    let reason = '';

    if (action === 'decline') {
      reason = window.prompt('Reason for declining (optional):') || '';
    }

    setBusyId(id);
    try {
      await axios.put(`${API}/${id}/${action}`, action === 'decline' ? { reason } : {}, { headers: authHeaders() });
      loadAppointments();
    } catch (err) {
      alert(err.response?.data?.message || `Could not ${action} the appointment`);
    } finally {
      setBusyId(null);
    }
  };

  // Marks the visit as finished — closes out the appointment and generates
  // the pet's medical record automatically (handled server-side).
  const markDone = async (id) => {
    setBusyId(id);
    try {
      await axios.put(`${API}/${id}`, { queueStatus: 'Done' }, { headers: authHeaders() });
      loadAppointments();
    } catch (err) {
      alert(err.response?.data?.message || 'Could not mark this appointment as done');
    } finally {
      setBusyId(null);
    }
  };

  const tabs = [
    { key: 'Pending', label: 'Pending', count: pending.length },
    { key: 'Approved', label: 'Approved', count: approved.length },
    { key: 'Declined', label: 'Declined', count: declined.length }
  ];

  return (
    <div className="p-6 md:p-8 page-bg min-h-screen font-sans text-stone-800">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-900">Appointment Requests</h1>
        <p className="text-xs text-stone-400 mt-1">
          Review booking requests from pet owners. Approving one schedules the visit and sends the owner a reminder.
        </p>
      </div>

      {/* Status tabs */}
      <div className="flex space-x-2 mb-6">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              tab === t.key
                ? 'bg-[#48634e] text-white'
                : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-100'
            }`}
          >
            {t.label}
            <span
              className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                tab === t.key ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-500'
              }`}
            >
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {loading && <div className="text-sm text-stone-400 mb-4">Loading requests...</div>}

      <div className="space-y-3">
        {!loading && visible.length === 0 && (
          <div className="bg-white p-6 rounded-2xl border border-stone-100 text-sm text-stone-400 text-center">
            No {tab.toLowerCase()} requests.
          </div>
        )}

        {visible.map((appt) => (
          <div
            key={appt._id}
            className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4"
          >
            <div className="flex items-start space-x-4">
              <span className="px-3 py-1 bg-[#f9f9f8] border border-stone-200/60 rounded-lg text-[11px] font-bold text-stone-600 whitespace-nowrap">
                {appt.petName}{appt.petCode ? ` · ${appt.petCode}` : ''}
              </span>
              <div>
                <h4 className="font-bold text-sm text-stone-900">{appt.service}</h4>
                <p className="text-[11px] text-stone-400 mt-0.5">
                  {appt.date}{appt.time ? ` at ${appt.time}` : ''} • {appt.clinicBranch}
                </p>
                {appt.approvalStatus === 'Declined' && appt.declineReason && (
                  <p className="text-[11px] text-red-500 mt-1">Reason: {appt.declineReason}</p>
                )}
              </div>
            </div>

            {appt.approvalStatus === 'Pending' || !appt.approvalStatus ? (
              <div className="flex space-x-2 self-end lg:self-center">
                <button
                  onClick={() => decide(appt._id, 'decline')}
                  disabled={busyId === appt._id}
                  className="px-4 py-2 bg-white border border-red-200 hover:bg-red-50 text-red-600 font-bold text-[11px] uppercase tracking-wider rounded-xl transition-all cursor-pointer disabled:opacity-50"
                >
                  DECLINE
                </button>
                <button
                  onClick={() => decide(appt._id, 'approve')}
                  disabled={busyId === appt._id}
                  className="px-4 py-2 bg-[#48634e] hover:bg-[#3b5240] text-white font-bold text-[11px] uppercase tracking-wider rounded-xl transition-all cursor-pointer disabled:opacity-50"
                >
                  ACCEPT
                </button>
              </div>
            ) : appt.approvalStatus === 'Approved' && appt.status !== 'Completed' ? (
              <div className="flex items-center space-x-3 self-end lg:self-center">
                <span className="px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#ebf0eb] text-[#48634e]">
                  Approved
                </span>
                <button
                  onClick={() => markDone(appt._id)}
                  disabled={busyId === appt._id}
                  className="px-4 py-2 bg-[#48634e] hover:bg-[#3b5240] text-white font-bold text-[11px] uppercase tracking-wider rounded-xl transition-all cursor-pointer disabled:opacity-50"
                >
                  DONE
                </button>
              </div>
            ) : appt.approvalStatus === 'Approved' && appt.status === 'Completed' ? (
              <span className="self-end lg:self-center px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#dcfce7] text-[#15803d]">
                Completed
              </span>
            ) : (
              <span className="self-end lg:self-center px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-50 text-red-600">
                {appt.approvalStatus}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default AppointmentApprovals;
