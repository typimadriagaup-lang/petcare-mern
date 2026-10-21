import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { isFullAdmin } from '../utils/auth';
import { API_URL } from '../config';

const TYPE_ICON = { Dog: '🐶', Cat: '🐱', Rabbit: '🐰', Bird: '🐦', Hamster: '🐹', Other: '🐾' };

// Pet photo, or the same default icon My Pets shows (by pet type) when none was uploaded
function PetAvatar({ pet, size = 'w-12 h-12', text = 'text-xl', border = 'border border-stone-200' }) {
  return pet.image ? (
    <img src={pet.image} alt={pet.name} className={`${size} rounded-full object-cover ${border}`} />
  ) : (
    <div className={`${size} ${text} rounded-full bg-[#ebf0eb] ${border} flex items-center justify-center shrink-0`}>
      {TYPE_ICON[pet.type] || '🐾'}
    </div>
  );
}
const RECORD_TYPES = ['Vaccination', 'Treatment', 'Surgery'];
const DEFAULT_CLINIC = 'Dagupan Animal Clinic';

const authHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const EMPTY_RECORD = { title: '', recordType: 'Treatment', date: '', clinic: DEFAULT_CLINIC, summary: '' };

// Staff-only view: every registered patient (pet), searchable by name/owner,
// with the ability to add a brand-new health record or edit/delete an
// existing one for whichever pet is selected. This is where a Moderator
// (veterinary staff) actually manages health records, on top of the
// clinic-wide list/delete they already have on the Medical Records page.
function Patients() {
  const canDelete = isFullAdmin(); // only the Clinic Admin can delete pets and records
  const [pets, setPets] = useState([]);
  const [selectedPet, setSelectedPet] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [showAddForm, setShowAddForm] = useState(false);
  const [newRecord, setNewRecord] = useState(EMPTY_RECORD);
  const [savingRecord, setSavingRecord] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editingRecord, setEditingRecord] = useState(EMPTY_RECORD);

  const [petToDelete, setPetToDelete] = useState(null); // pet object pending delete confirmation
  const [deletingPet, setDeletingPet] = useState(false);

  const loadPets = () => {
    // No ?mine=true — staff see every patient in the clinic, not just their own.
    axios.get(`${API_URL}/api/pets`, { headers: authHeaders() })
      .then((res) => {
        setPets(res.data);
        if (res.data.length > 0) setSelectedPet((prev) => prev || res.data[0]._id);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching pets:', err);
        setLoading(false);
      });
  };

  useEffect(loadPets, []);

  const loadRecords = () => {
    if (!selectedPet) return;
    axios.get(`${API_URL}/api/medical-records/pet/${selectedPet}`, { headers: authHeaders() })
      .then((res) => setRecords(res.data))
      .catch((err) => console.error('Error fetching medical records:', err));
  };

  useEffect(loadRecords, [selectedPet]);

  const currentPet = pets.find((p) => p._id === selectedPet);

  const filteredPets = pets.filter((p) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return p.name.toLowerCase().includes(q) || (p.ownerName || '').toLowerCase().includes(q) || (p.petId || '').toLowerCase().includes(q);
  });

  const selectPet = (id) => {
    setSelectedPet(id);
    setShowAddForm(false);
    setEditingId(null);
  };

  const startAdd = () => {
    setEditingId(null);
    setNewRecord({ ...EMPTY_RECORD, date: new Date().toISOString().slice(0, 10) });
    setShowAddForm(true);
  };

  const submitAdd = async (e) => {
    e.preventDefault();
    if (!selectedPet) return;
    setSavingRecord(true);
    try {
      await axios.post(
        `${API_URL}/api/medical-records`,
        { ...newRecord, pet: selectedPet },
        { headers: authHeaders() }
      );
      setShowAddForm(false);
      setNewRecord(EMPTY_RECORD);
      loadRecords();
    } catch (err) {
      alert(err.response?.data?.message || 'Could not add health record');
    } finally {
      setSavingRecord(false);
    }
  };

  const startEdit = (rec) => {
    setShowAddForm(false);
    setEditingId(rec._id);
    setEditingRecord({
      title: rec.title,
      recordType: rec.recordType,
      date: rec.date,
      clinic: rec.clinic,
      summary: rec.summary
    });
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    setSavingRecord(true);
    try {
      await axios.put(
        `${API_URL}/api/medical-records/${editingId}`,
        editingRecord,
        { headers: authHeaders() }
      );
      setEditingId(null);
      loadRecords();
    } catch (err) {
      alert(err.response?.data?.message || 'Could not update health record');
    } finally {
      setSavingRecord(false);
    }
  };

  const deleteRecord = async (id) => {
    if (!window.confirm('Delete this health record? This cannot be undone.')) return;
    try {
      await axios.delete(`${API_URL}/api/medical-records/${id}`, { headers: authHeaders() });
      setRecords((prev) => prev.filter((r) => r._id !== id));
    } catch (err) {
      alert(err.response?.data?.message || 'Could not delete record');
    }
  };

  const deletePet = async (petId) => {
    setDeletingPet(true);
    try {
      await axios.delete(`${API_URL}/api/pets/${petId}`, { headers: authHeaders() });
      setPets((prev) => {
        const remaining = prev.filter((p) => p._id !== petId);
        setSelectedPet((current) => (current === petId ? (remaining[0]?._id || null) : current));
        return remaining;
      });
      setShowAddForm(false);
      setEditingId(null);
      setPetToDelete(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Could not delete pet');
    } finally {
      setDeletingPet(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-stone-500 font-medium">Loading patients...</div>;
  }

  return (
    <div className="p-6 md:p-8 page-bg min-h-screen font-sans text-stone-800">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-900">Patients</h1>
        <p className="text-xs text-stone-400 mt-1">Every registered pet in the clinic — view their info and manage health records.</p>
      </div>

      {pets.length === 0 ? (
        <div className="bg-white p-8 rounded-3xl border border-stone-100 text-sm text-stone-500 text-center">
          No patients registered yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Pet Selector Column */}
          <div className="md:col-span-4 space-y-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by pet or owner name..."
              className="w-full p-3 bg-white border border-stone-200 rounded-xl text-xs text-stone-800 outline-none mb-1"
            />
            {filteredPets.length === 0 && (
              <p className="text-xs text-stone-400 text-center py-4">No pets match "{search}".</p>
            )}
            {filteredPets.map((pet) => (
              <div
                key={pet._id}
                onClick={() => selectPet(pet._id)}
                className={`flex items-center space-x-3.5 p-4 rounded-2xl border cursor-pointer transition-all ${
                  selectedPet === pet._id
                    ? 'bg-white border-stone-200 shadow-sm'
                    : 'bg-transparent border-transparent hover:bg-white/60'
                }`}
              >
                <PetAvatar pet={pet} />
                <div>
                  <h3 className="text-sm font-bold text-stone-900">{pet.name}</h3>
                  <p className="text-xs text-stone-400">{pet.breed} · {pet.ownerName || 'Unknown owner'}</p>
                  {pet.petId && <p className="text-[10px] font-bold text-[#48634e] tracking-wider">{pet.petId}</p>}
                </div>
              </div>
            ))}
          </div>

          {/* Pet Details Card */}
          {currentPet && (
            <div className="md:col-span-8 bg-white p-6 md:p-8 rounded-3xl border border-stone-100 shadow-sm">
              <div className="flex items-center justify-between mb-8 pb-6 border-b border-stone-100">
                <div className="flex items-center space-x-5">
                  <PetAvatar pet={currentPet} size="w-20 h-20" text="text-3xl" border="border-2 border-stone-100" />
                  <div>
                    <h2 className="text-2xl font-bold text-stone-900">{currentPet.name}</h2>
                    {currentPet.petId && <span className="inline-block mt-1 px-2 py-0.5 bg-[#e2ebe2] text-[#48634e] rounded-md text-[10px] font-extrabold tracking-wider">PET ID · {currentPet.petId}</span>}
                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-stone-400 font-medium mt-1">
                      <div><span className="block uppercase tracking-wider text-[10px] text-stone-400">TYPE</span> <span className="text-stone-700 font-semibold">{currentPet.type}</span></div>
                      <div><span className="block uppercase tracking-wider text-[10px] text-stone-400">BREED</span> <span className="text-stone-700 font-semibold">{currentPet.breed}</span></div>
                      <div><span className="block uppercase tracking-wider text-[10px] text-stone-400">AGE</span> <span className="text-stone-700 font-semibold">{currentPet.age}</span></div>
                      <div><span className="block uppercase tracking-wider text-[10px] text-stone-400">WEIGHT</span> <span className="text-stone-700 font-semibold">{currentPet.weight}</span></div>
                      <div><span className="block uppercase tracking-wider text-[10px] text-stone-400">OWNER</span> <span className="text-stone-700 font-semibold">{currentPet.ownerName || 'Unknown'}</span></div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {canDelete && (
                  <button
                    onClick={() => setPetToDelete(currentPet)}
                    className="px-4 py-2.5 bg-white border border-red-200 hover:bg-red-50 text-red-600 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer whitespace-nowrap"
                  >
                    Delete Pet
                  </button>
                  )}
                  <button
                    onClick={startAdd}
                    className="px-4 py-2.5 bg-[#48634e] hover:bg-[#3b5240] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer whitespace-nowrap"
                  >
                    + Add Record
                  </button>
                </div>
              </div>

              {showAddForm && (
                <form onSubmit={submitAdd} className="bg-[#f9f9f8] p-5 rounded-2xl border border-stone-100 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Title</label>
                    <input required value={newRecord.title}
                      onChange={(e) => setNewRecord({ ...newRecord, title: e.target.value })}
                      placeholder="e.g. Rabies Vaccination"
                      className="w-full p-2.5 bg-white border border-stone-200 rounded-lg text-xs" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Record Type</label>
                    <select value={newRecord.recordType}
                      onChange={(e) => setNewRecord({ ...newRecord, recordType: e.target.value })}
                      className="w-full p-2.5 bg-white border border-stone-200 rounded-lg text-xs">
                      {RECORD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Date</label>
                    <input required type="date" value={newRecord.date}
                      onChange={(e) => setNewRecord({ ...newRecord, date: e.target.value })}
                      className="w-full p-2.5 bg-white border border-stone-200 rounded-lg text-xs" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Clinic</label>
                    <input required value={newRecord.clinic}
                      onChange={(e) => setNewRecord({ ...newRecord, clinic: e.target.value })}
                      className="w-full p-2.5 bg-white border border-stone-200 rounded-lg text-xs" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Notes / Summary</label>
                    <textarea required value={newRecord.summary}
                      onChange={(e) => setNewRecord({ ...newRecord, summary: e.target.value })}
                      rows={2}
                      className="w-full p-2.5 bg-white border border-stone-200 rounded-lg text-xs" />
                  </div>
                  <div className="sm:col-span-2 flex gap-2 justify-end">
                    <button type="button" onClick={() => setShowAddForm(false)}
                      className="px-4 py-2 text-stone-500 hover:text-stone-700 font-bold text-[11px] uppercase tracking-wider cursor-pointer">
                      Cancel
                    </button>
                    <button type="submit" disabled={savingRecord}
                      className="px-4 py-2 bg-[#48634e] hover:bg-[#3b5240] text-white font-bold text-[11px] uppercase tracking-wider rounded-xl cursor-pointer disabled:opacity-50">
                      {savingRecord ? 'Saving...' : 'Save Record'}
                    </button>
                  </div>
                </form>
              )}

              {/* Health Records Table */}
              <div className="bg-[#f9f9f8] rounded-2xl border border-stone-100 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="text-stone-400 uppercase tracking-wider border-b border-stone-100">
                    <tr>
                      <th className="p-4 font-semibold">Record</th>
                      <th className="p-4 font-semibold">Type</th>
                      <th className="p-4 font-semibold">Date</th>
                      <th className="p-4 font-semibold">Clinic</th>
                      <th className="p-4 font-semibold">Notes</th>
                      <th className="p-4 font-semibold"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-stone-700 font-medium">
                    {records.map((rec) =>
                      editingId === rec._id ? (
                        <tr key={rec._id} className="bg-white">
                          <td className="p-3">
                            <input value={editingRecord.title}
                              onChange={(e) => setEditingRecord({ ...editingRecord, title: e.target.value })}
                              className="w-full p-2 bg-[#f9f9f8] border border-stone-200 rounded-lg text-xs" />
                          </td>
                          <td className="p-3">
                            <select value={editingRecord.recordType}
                              onChange={(e) => setEditingRecord({ ...editingRecord, recordType: e.target.value })}
                              className="w-full p-2 bg-[#f9f9f8] border border-stone-200 rounded-lg text-xs">
                              {RECORD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </td>
                          <td className="p-3">
                            <input type="date" value={editingRecord.date}
                              onChange={(e) => setEditingRecord({ ...editingRecord, date: e.target.value })}
                              className="w-full p-2 bg-[#f9f9f8] border border-stone-200 rounded-lg text-xs" />
                          </td>
                          <td className="p-3">
                            <input value={editingRecord.clinic}
                              onChange={(e) => setEditingRecord({ ...editingRecord, clinic: e.target.value })}
                              className="w-full p-2 bg-[#f9f9f8] border border-stone-200 rounded-lg text-xs" />
                          </td>
                          <td className="p-3">
                            <input value={editingRecord.summary}
                              onChange={(e) => setEditingRecord({ ...editingRecord, summary: e.target.value })}
                              className="w-full p-2 bg-[#f9f9f8] border border-stone-200 rounded-lg text-xs" />
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <button onClick={submitEdit} disabled={savingRecord} className="text-[#48634e] font-bold hover:underline cursor-pointer mr-3 disabled:opacity-50">Save</button>
                            <button onClick={() => setEditingId(null)} className="text-stone-400 font-bold hover:underline cursor-pointer">Cancel</button>
                          </td>
                        </tr>
                      ) : (
                        <tr key={rec._id}>
                          <td className="p-4 font-bold text-stone-900">{rec.title}</td>
                          <td className="p-4 text-stone-500">{rec.recordType}</td>
                          <td className="p-4 text-stone-500">{rec.date}</td>
                          <td className="p-4 text-stone-500">{rec.clinic}</td>
                          <td className="p-4 text-stone-500 max-w-xs truncate" title={rec.summary}>{rec.summary}</td>
                          <td className="p-4 whitespace-nowrap text-right">
                            <button onClick={() => startEdit(rec)} className="text-stone-500 hover:text-stone-800 font-bold cursor-pointer mr-3">Edit</button>
                            {canDelete && <button onClick={() => deleteRecord(rec._id)} className="text-red-500 hover:text-red-700 font-bold cursor-pointer">Delete</button>}
                          </td>
                        </tr>
                      )
                    )}
                    {records.length === 0 && (
                      <tr><td colSpan="6" className="p-4 text-stone-400 text-center">No health records yet — add the first one above.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete Pet Confirmation Modal */}
      {petToDelete && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => !deletingPet && setPetToDelete(null)}
        >
          <div
            className="bg-white rounded-3xl shadow-xl max-w-sm w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-stone-900 text-lg mb-2">Delete {petToDelete.name}?</h3>
            <p className="text-sm text-stone-500 leading-relaxed mb-6">
              This also removes {petToDelete.name}'s health records and reminders. This cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setPetToDelete(null)}
                disabled={deletingPet}
                className="px-4 py-2 text-stone-500 hover:text-stone-700 font-bold text-xs uppercase tracking-wider cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => deletePet(petToDelete._id)}
                disabled={deletingPet}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer disabled:opacity-50"
              >
                {deletingPet ? 'Deleting...' : 'Delete Pet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Patients;
