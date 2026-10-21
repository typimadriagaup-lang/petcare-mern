import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { authHeaders, isFullAdmin } from '../utils/auth';
import { API_URL } from '../config';

const PET_TYPES = ['Dog', 'Cat', 'Rabbit', 'Bird', 'Hamster', 'Other'];

// Tick-boxes for which pet types a service is offered for
function TypePicker({ value, onChange }) {
  const toggle = (t) => onChange(value.includes(t) ? value.filter((x) => x !== t) : [...value, t]);
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
      {PET_TYPES.map((t) => (
        <label key={t} className="flex items-center gap-1.5 text-[11px] font-semibold text-stone-600 cursor-pointer">
          <input type="checkbox" checked={value.includes(t)} onChange={() => toggle(t)} className="accent-[#48634e]" />
          {t}
        </label>
      ))}
    </div>
  );
}

function AdminClinic() {
  const canEditServices = isFullAdmin(); // Veterinary Staff can view services but not change them
  const [services, setServices] = useState([]);
  const [queue, setQueue] = useState([]);
  const [stats, setStats] = useState({ todaysAppointments: 0, totalPatients: 0, activeServices: 0, pendingRecords: 0, pendingApprovals: 0, totalUsers: 0 });
  const [loading, setLoading] = useState(true);
  const [newService, setNewService] = useState('');
  const [newTypes, setNewTypes] = useState([...PET_TYPES]); // all ticked = offered for every pet type
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [editingTypes, setEditingTypes] = useState([...PET_TYPES]);
  const [newDays, setNewDays] = useState('');
  const [editingDays, setEditingDays] = useState('');

  const loadAll = () => {
    Promise.all([
      axios.get(`${API_URL}/api/clinic/dashboard`, { headers: authHeaders() }),
      axios.get(`${API_URL}/api/clinic/services`)
    ])
      .then(([dashRes, servicesRes]) => {
        setStats(dashRes.data.stats);
        setQueue(dashRes.data.queue);
        setServices(servicesRes.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error loading clinic data:', err);
        setLoading(false);
      });
  };

  useEffect(loadAll, []);

  const addService = async (e) => {
    e.preventDefault();
    if (!newService.trim()) return;
    if (newTypes.length === 0) { alert('Pick at least one pet type for this service.'); return; }
    try {
      await axios.post(`${API_URL}/api/clinic/services`, { name: newService.trim(), petTypes: newTypes, ...(newDays !== '' ? { followUpDays: Number(newDays) } : {}) }, { headers: authHeaders() });
      setNewService('');
      setNewTypes([...PET_TYPES]);
      setNewDays('');
      loadAll();
    } catch (err) {
      alert(err.response?.data?.message || 'Could not add service');
    }
  };

  const startEdit = (service) => {
    setEditingId(service._id);
    setEditingName(service.name);
    setEditingTypes(service.petTypes?.length ? service.petTypes : [...PET_TYPES]);
    setEditingDays(typeof service.followUpDays === 'number' ? String(service.followUpDays) : '');
  };

  const saveEdit = async (id) => {
    if (editingTypes.length === 0) { alert('Pick at least one pet type for this service.'); return; }
    try {
      await axios.put(`${API_URL}/api/clinic/services/${id}`, { name: editingName, petTypes: editingTypes, ...(editingDays !== '' ? { followUpDays: Number(editingDays) } : {}) }, { headers: authHeaders() });
      setEditingId(null);
      loadAll();
    } catch (err) {
      alert(err.response?.data?.message || 'Could not update service');
    }
  };

  const deleteService = async (id) => {
    try {
      await axios.delete(`${API_URL}/api/clinic/services/${id}`, { headers: authHeaders() });
      loadAll();
    } catch (err) {
      alert(err.response?.data?.message || 'Could not delete service');
    }
  };

  const updateQueueStatus = async (id, queueStatus) => {
    try {
      await axios.put(`${API_URL}/api/appointments/${id}`, { queueStatus }, { headers: authHeaders() });
      loadAll();
    } catch (err) {
      console.error('Error updating queue status:', err);
    }
  };

  return (
    <div className="p-6 md:p-8 page-bg min-h-screen font-sans text-stone-800">

      {/* Clinic Header Banner */}
      <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 bg-[#ebf0eb] rounded-2xl flex items-center justify-center text-[#48634e] flex-shrink-0">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0v-5a2 2 0 012-2h2a2 2 0 012 2v5m-6 0h6" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-stone-900 tracking-tight">
              Dagupan Animal Clinic
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            to="/medical-records"
            className="px-4 py-2.5 bg-white border border-stone-200 text-stone-600 hover:border-stone-300 hover:text-stone-900 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
          >
            Medical Records
          </Link>
          <Link
            to="/appointments"
            className="relative px-4 py-2.5 bg-[#48634e] hover:bg-[#3b5240] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
          >
            Review Appointments
            {!loading && stats.pendingApprovals > 0 && (
              <span className="absolute -top-2 -right-2 bg-amber-500 text-white text-[10px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center">
                {stats.pendingApprovals}
              </span>
            )}
          </Link>
        </div>
      </div>

      {stats.pendingApprovals > 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold rounded-2xl p-4 mb-6 flex items-center justify-between">
          <span>
            {stats.pendingApprovals} appointment{stats.pendingApprovals > 1 ? 's' : ''} waiting on your approval.
          </span>
          <Link to="/appointments" className="underline font-bold hover:text-amber-900">Review now</Link>
        </div>
      )}

      {/* Stats Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
        <div className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm">
          <div className="text-2xl font-extrabold text-stone-900 leading-none">{loading ? '—' : stats.todaysAppointments}</div>
          <div className="text-xs text-stone-400 font-medium mt-1.5">Today's Appointments</div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm">
          <div className="text-2xl font-extrabold text-stone-900 leading-none">{loading ? '—' : stats.totalPatients}</div>
          <div className="text-xs text-stone-400 font-medium mt-1.5">Total Patients</div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm">
          <div className="text-2xl font-extrabold text-stone-900 leading-none">{loading ? '—' : stats.totalUsers}</div>
          <div className="text-xs text-stone-400 font-medium mt-1.5">Total Users</div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm">
          <div className="text-2xl font-extrabold text-stone-900 leading-none">{loading ? '—' : stats.activeServices}</div>
          <div className="text-xs text-stone-400 font-medium mt-1.5">Active Services</div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm">
          <div className="text-2xl font-extrabold text-stone-900 leading-none">{loading ? '—' : stats.pendingRecords}</div>
          <div className="text-xs text-stone-400 font-medium mt-1.5">Total Records</div>
        </div>
        <div className={`p-5 rounded-2xl border shadow-sm ${!loading && stats.pendingApprovals > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-stone-100'}`}>
          <div className={`text-2xl font-extrabold leading-none ${!loading && stats.pendingApprovals > 0 ? 'text-amber-700' : 'text-stone-900'}`}>{loading ? '—' : stats.pendingApprovals}</div>
          <div className={`text-xs font-medium mt-1.5 ${!loading && stats.pendingApprovals > 0 ? 'text-amber-700' : 'text-stone-400'}`}>Pending Approvals</div>
        </div>
      </div>

      {/* Main Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">

        {/* Clinic Services Column */}
        <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-stone-100 shadow-sm">
          <h2 className="text-lg font-bold text-stone-900 mb-4">Clinic Services</h2>

          {!canEditServices && (
            <p className="text-[11px] text-stone-400 mb-4">View only &mdash; only the Clinic Admin can add, rename or remove services.</p>
          )}

          {canEditServices && (
          <form onSubmit={addService} className="mb-4 space-y-3">
            <div className="flex gap-2">
              <input
                value={newService}
                onChange={(e) => setNewService(e.target.value)}
                placeholder="New service name"
                className="flex-1 p-3 bg-[#f9f9f8] border border-stone-200 rounded-xl text-xs text-stone-800 outline-none"
              />
              <button type="submit" className="px-4 py-2 bg-[#48634e] hover:bg-[#3b5240] text-white font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer">
                Add
              </button>
            </div>
            <div>
              <span className="block text-[10px] font-bold text-stone-400 uppercase mb-1.5">Offered for</span>
              <TypePicker value={newTypes} onChange={setNewTypes} />
            </div>
            <div>
              <span className="block text-[10px] font-bold text-stone-400 uppercase mb-1.5">Remind the owner to come back after (days)</span>
              <input type="number" min="0" max="3650" value={newDays} onChange={(e) => setNewDays(e.target.value)}
                placeholder="e.g. 90 (0 = no reminder)" className="w-48 p-2 bg-[#f9f9f8] border border-stone-200 rounded-lg text-xs outline-none" />
            </div>
          </form>
          )}

          <div className="space-y-3">
            {!loading && services.length === 0 && (
              <p className="text-xs text-stone-400 text-center py-4">No services yet — add one above.</p>
            )}
            {services.map((service) => (
              <div
                key={service._id}
                className="flex items-center justify-between gap-3 p-3.5 bg-[#f9f9f8] rounded-2xl border border-stone-100 text-sm"
              >
                {editingId === service._id ? (
                  <div className="flex-1 space-y-2">
                    <input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="w-full p-2 bg-white border border-stone-200 rounded-lg text-xs"
                    />
                    <TypePicker value={editingTypes} onChange={setEditingTypes} />
                    <div className="flex items-center gap-2 text-[11px] font-semibold text-stone-600">
                      <span>Remind after</span>
                      <input type="number" min="0" max="3650" value={editingDays} onChange={(e) => setEditingDays(e.target.value)}
                        placeholder="days" className="w-20 p-1.5 bg-white border border-stone-200 rounded-lg text-xs outline-none" />
                      <span className="text-stone-400">days (0 = none)</span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <span className="font-semibold text-stone-800">{service.name}</span>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {(service.petTypes?.length ? service.petTypes : ['All pets']).map((t) => (
                        <span key={t} className="px-2 py-0.5 bg-[#e2ebe2] text-[#48634e] rounded-full text-[10px] font-bold">{t}</span>
                      ))}
                      {service.followUpDays > 0 && (
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full text-[10px] font-bold">↻ remind after {service.followUpDays} days</span>
                      )}
                    </div>
                  </div>
                )}
                {canEditServices && (
                <div className="flex space-x-3 text-xs font-semibold">
                  {editingId === service._id ? (
                    <button onClick={() => saveEdit(service._id)} className="text-[#48634e] hover:underline cursor-pointer">Save</button>
                  ) : (
                    <button onClick={() => startEdit(service)} className="text-stone-500 hover:text-stone-800 cursor-pointer">Edit</button>
                  )}
                  <button onClick={() => deleteService(service._id)} className="text-red-500 hover:text-red-700 cursor-pointer">Delete</button>
                </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Appointment Queue Column */}
        <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-stone-100 shadow-sm">
          <h2 className="text-lg font-bold text-stone-900 mb-4">Today's Appointment Queue</h2>
          <div className="space-y-3">
            {!loading && queue.length === 0 && (
              <p className="text-xs text-stone-400 text-center py-4">No appointments scheduled for today.</p>
            )}
            {queue.map((item) => {
              let statusStyle = "bg-[#ebf0eb] text-[#48634e]";
              if (item.queueStatus === 'Done') {
                statusStyle = "bg-[#dcfce7] text-[#15803d]";
              } else if (item.queueStatus === 'In Progress') {
                statusStyle = "bg-[#fef3c7] text-[#b45309]";
              }

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
                  <select
                    value={item.queueStatus}
                    onChange={(e) => updateQueueStatus(item._id, e.target.value)}
                    className={`px-3 py-1 rounded-full text-[11px] font-bold tracking-tight border-none outline-none cursor-pointer ${statusStyle}`}
                  >
                    <option value="Waiting">Waiting</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Done">Done</option>
                  </select>
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
}

export default AdminClinic;
