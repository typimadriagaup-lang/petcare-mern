import React, { useState, useEffect } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { isAdmin } from '../utils/auth';

const authHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const RECORD_TYPES = ['Vaccination', 'Treatment', 'Surgery'];

function MedicalRecords() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const admin = isAdmin();

  const [viewMode, setViewMode] = useState('list'); // 'list' | 'grid'
  const [openRecord, setOpenRecord] = useState(null);

  // Draft = what the checkboxes currently show; applied = what's actually filtering the list.
  // They're separate so the list only updates once "Apply Filter" is clicked.
  const [draftPets, setDraftPets] = useState([]);
  const [draftTypes, setDraftTypes] = useState([]);
  const [appliedPets, setAppliedPets] = useState([]);
  const [appliedTypes, setAppliedTypes] = useState([]);

  const loadRecords = () => {
    // Admins see the clinic's full history; pet owners see only their own pets' records.
    const url = admin
      ? 'http://localhost:5000/api/medical-records'
      : 'http://localhost:5000/api/medical-records?mine=true';

    axios.get(url, { headers: authHeaders() })
      .then((res) => {
        setRecords(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching medical records:', err);
        setLoading(false);
      });
  };

  useEffect(loadRecords, [admin]);

  const petNames = [...new Set(records.map((r) => r.pet))];

  const togglePet = (name) => {
    setDraftPets((prev) => (prev.includes(name) ? prev.filter((p) => p !== name) : [...prev, name]));
  };
  const toggleType = (type) => {
    setDraftTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
  };
  const applyFilter = () => {
    setAppliedPets(draftPets);
    setAppliedTypes(draftTypes);
  };
  const clearFilter = () => {
    setDraftPets([]);
    setDraftTypes([]);
    setAppliedPets([]);
    setAppliedTypes([]);
  };

  const filtered = records.filter((r) => {
    const petOk = appliedPets.length === 0 || appliedPets.includes(r.pet);
    const typeOk = appliedTypes.length === 0 || appliedTypes.includes(r.recordType);
    return petOk && typeOk;
  });

  const deleteRecord = async (id) => {
    if (!window.confirm('Delete this medical record? This cannot be undone.')) return;
    try {
      await axios.delete(`http://localhost:5000/api/medical-records/${id}`, { headers: authHeaders() });
      setRecords((prev) => prev.filter((r) => r._id !== id));
      if (openRecord?._id === id) setOpenRecord(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Could not delete record');
    }
  };

  const filtersActive = appliedPets.length > 0 || appliedTypes.length > 0;

  // Excel export — admins/moderators export the full clinic history they can
  // see, pet owners only ever have their own pets' records loaded into
  // `records` to begin with, so this naturally stays scoped per role. It
  // respects whatever filter is currently applied, same list shown on screen.
  const exportToExcel = () => {
    if (filtered.length === 0) {
      alert('No records to export.');
      return;
    }

    const rows = filtered.map((r) => ({
      Pet: r.pet,
      Title: r.title,
      'Record Type': r.recordType,
      Date: r.date,
      Clinic: r.clinic,
      Summary: r.summary,
      Source: r.source === 'Appointment' ? 'From visit' : 'Manual entry'
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = [
      { wch: 14 }, // Pet
      { wch: 22 }, // Title
      { wch: 14 }, // Record Type
      { wch: 12 }, // Date
      { wch: 22 }, // Clinic
      { wch: 50 }, // Summary
      { wch: 14 }  // Source
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Medical Records');

    const todayStr = new Date().toISOString().slice(0, 10);
    const scopeLabel = admin ? 'clinic' : 'my-pets';
    XLSX.writeFile(workbook, `medical-records-${scopeLabel}-${todayStr}.xlsx`);
  };

  return (
    <div className="p-6 md:p-8 bg-[#f8f7f4] min-h-screen font-sans text-stone-800">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Medical Records</h1>
          <p className="text-xs text-stone-400 mt-1">
            {admin ? 'Full clinic history across every patient.' : 'Your pets\u2019 medical history.'}
          </p>
        </div>
        <div className="flex space-x-1 bg-white p-1 rounded-xl border border-stone-200">
          <button
            onClick={() => setViewMode('list')}
            title="List view"
            className={`p-2 rounded-lg cursor-pointer transition-colors ${viewMode === 'list' ? 'bg-[#ebf0eb] text-[#48634e]' : 'text-stone-400 hover:text-stone-600'}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>
          </button>
          <button
            onClick={() => setViewMode('grid')}
            title="Grid view"
            className={`p-2 rounded-lg cursor-pointer transition-colors ${viewMode === 'grid' ? 'bg-[#ebf0eb] text-[#48634e]' : 'text-stone-400 hover:text-stone-600'}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Record Cards */}
        <div className="lg:col-span-8">
          {loading && (
            <div className="bg-white p-6 rounded-3xl border border-stone-100 text-sm text-stone-400 text-center">
              Loading records...
            </div>
          )}
          {!loading && records.length === 0 && (
            <div className="bg-white p-6 rounded-3xl border border-stone-100 text-sm text-stone-400 text-center">
              No medical records yet.
            </div>
          )}
          {!loading && records.length > 0 && filtered.length === 0 && (
            <div className="bg-white p-6 rounded-3xl border border-stone-100 text-sm text-stone-400 text-center">
              No records match your filter. <button onClick={clearFilter} className="text-[#48634e] font-bold underline cursor-pointer">Clear filter</button>
            </div>
          )}

          <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 gap-4' : 'space-y-4'}>
            {filtered.map((rec) => (
              <div key={rec._id} className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm relative">
                <div className="flex justify-between items-start">
                  <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                    <span className="w-2 h-2 rounded-full bg-[#48634e]"></span>
                    <h3 className="font-bold text-stone-900 text-base">{rec.title}</h3>
                    {rec.source === 'Appointment' && (
                      <span className="px-2 py-0.5 rounded-full bg-[#ebf0eb] text-[#48634e] text-[9px] font-bold uppercase tracking-wider">
                        From visit
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-stone-400 font-medium whitespace-nowrap ml-2">{rec.date}</span>
                </div>
                <p className="text-xs text-stone-400 mt-1 mb-3">{rec.clinic}</p>
                <p className="text-xs text-stone-600 leading-relaxed mb-4">{rec.summary}</p>
                <div className="flex justify-between items-center">
                  <span className="px-3 py-1 bg-[#f9f9f8] border border-stone-200/60 rounded-lg text-[11px] font-bold text-stone-600">
                    {rec.pet}
                  </span>
                  <div className="flex items-center gap-3">
                    {admin && (
                      <button
                        onClick={() => deleteRecord(rec._id)}
                        className="text-xs font-bold text-red-500 hover:underline cursor-pointer"
                      >
                        Delete
                      </button>
                    )}
                    <button
                      onClick={() => setOpenRecord(rec)}
                      className="text-xs font-bold text-[#48634e] hover:underline cursor-pointer"
                    >
                      View Record →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Filter and Export Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm">
            <h3 className="font-bold text-stone-900 text-sm mb-4">Filter Records</h3>

            <div className="space-y-4">
              <div>
                <span className="text-[10px] font-bold text-stone-400 tracking-wider uppercase block mb-2">PETS</span>
                <div className="space-y-2 text-xs font-medium text-stone-700">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" checked={draftPets.length === 0} onChange={() => setDraftPets([])} className="rounded accent-[#48634e]" />
                    <span>All Pets</span>
                  </label>
                  {petNames.map((name) => (
                    <label key={name} className="flex items-center space-x-2 cursor-pointer">
                      <input type="checkbox" checked={draftPets.includes(name)} onChange={() => togglePet(name)} className="rounded accent-[#48634e]" />
                      <span>{name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-stone-400 tracking-wider uppercase block mb-2">RECORD TYPE</span>
                <div className="space-y-2 text-xs font-medium text-stone-700">
                  {RECORD_TYPES.map((type) => (
                    <label key={type} className="flex items-center space-x-2 cursor-pointer">
                      <input type="checkbox" checked={draftTypes.includes(type)} onChange={() => toggleType(type)} className="rounded accent-[#48634e]" />
                      <span>{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button
                onClick={applyFilter}
                className="w-full py-3 bg-[#48634e] hover:bg-[#3b5240] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer mt-2"
              >
                APPLY FILTER
              </button>
              {filtersActive && (
                <button
                  onClick={clearFilter}
                  className="w-full py-2 text-stone-500 hover:text-stone-700 font-bold text-[11px] uppercase tracking-wider cursor-pointer"
                >
                  Clear filter
                </button>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm">
            <span className="text-[10px] font-bold text-stone-400 tracking-wider uppercase block mb-3">EXPORT RECORDS</span>
            <div className="space-y-2.5">
              <button
                onClick={exportToExcel}
                className="w-full py-3 border border-stone-200 hover:bg-stone-50 text-stone-800 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
              >
                Convert to Excel File
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Record Detail Modal */}
      {openRecord && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setOpenRecord(null)}
        >
          <div
            className="bg-white rounded-3xl shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-1">
              <h3 className="font-bold text-stone-900 text-lg">{openRecord.title}</h3>
              <button onClick={() => setOpenRecord(null)} className="text-stone-400 hover:text-stone-600 cursor-pointer text-lg leading-none">✕</button>
            </div>
            <p className="text-xs text-stone-400 mb-4">{openRecord.date} • {openRecord.clinic}</p>

            <div className="space-y-3 text-sm">
              <div>
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1">Pet</span>
                <span className="font-semibold text-stone-800">{openRecord.pet}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1">Record Type</span>
                <span className="font-semibold text-stone-800">{openRecord.recordType}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1">Summary</span>
                <p className="text-stone-600 leading-relaxed">{openRecord.summary}</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              {admin && (
                <button
                  onClick={() => deleteRecord(openRecord._id)}
                  className="px-4 py-2 bg-white border border-red-200 hover:bg-red-50 text-red-600 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                >
                  Delete
                </button>
              )}
              <button
                onClick={() => setOpenRecord(null)}
                className="px-4 py-2 bg-[#48634e] hover:bg-[#3b5240] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MedicalRecords;
