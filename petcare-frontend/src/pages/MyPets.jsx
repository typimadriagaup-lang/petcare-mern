import React, { useState, useEffect } from 'react';
import axios from 'axios';

const MAX_PHOTO_BYTES = 3 * 1024 * 1024; // 3MB

const authHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const readImageFile = (file, onDone) => {
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    alert('Please choose an image file');
    return;
  }
  if (file.size > MAX_PHOTO_BYTES) {
    alert('That image is too large — please choose one under 3MB.');
    return;
  }
  const reader = new FileReader();
  reader.onload = () => onDone(reader.result);
  reader.readAsDataURL(file);
};

function MyPets() {
  const [pets, setPets] = useState([]);
  const [selectedPet, setSelectedPet] = useState(null);
  const [activeTab, setActiveTab] = useState('Vaccinations');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPet, setNewPet] = useState({ name: '', type: 'Dog', breed: '', ageYears: '', weightKg: '', image: '' });

  const loadPets = () => {
    axios.get('http://localhost:5000/api/pets?mine=true', { headers: authHeaders() })
      .then((res) => {
        setPets(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching pets:', err);
        setLoading(false);
      });
  };

  useEffect(loadPets, []);

  useEffect(() => {
    if (!selectedPet) return;
    axios.get(`http://localhost:5000/api/medical-records/pet/${selectedPet}`)
      .then((res) => setRecords(res.data))
      .catch((err) => console.error('Error fetching medical records:', err));
  }, [selectedPet]);

  const currentPet = pets.find((p) => p._id === selectedPet);
  const vaccinations = records.filter((r) => r.recordType === 'Vaccination');
  const medicalHistory = records.filter((r) => r.recordType !== 'Vaccination');

  const handleAddPet = async (e) => {
    e.preventDefault();
    const years = Number(newPet.ageYears);
    const petToSave = {
      name: newPet.name,
      type: newPet.type,
      breed: newPet.breed,
      age: `${newPet.ageYears} ${years === 1 ? 'year' : 'years'}`,
      weight: `${newPet.weightKg} kg`,
      image: newPet.image
    };
    try {
      const res = await axios.post('http://localhost:5000/api/pets', petToSave, { headers: authHeaders() });
      setPets((prev) => [res.data, ...prev]);
      setSelectedPet(res.data._id);
      setShowAddForm(false);
      setNewPet({ name: '', type: 'Dog', breed: '', ageYears: '', weightKg: '', image: '' });
    } catch (err) {
      alert(err.response?.data?.message || 'Could not add pet');
    }
  };

  const updatePetPhoto = async (petId, dataUrl) => {
    try {
      const res = await axios.put(`http://localhost:5000/api/pets/${petId}`, { image: dataUrl }, { headers: authHeaders() });
      setPets((prev) => prev.map((p) => (p._id === petId ? res.data : p)));
    } catch (err) {
      alert(err.response?.data?.message || 'Could not update photo');
    }
  };

  if (loading) {
    return <div className="p-8 text-stone-500 font-medium">Loading your pets...</div>;
  }

  return (
    <div className="p-6 md:p-8 bg-[#f8f7f4] min-h-screen font-sans text-stone-800">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-stone-900">My Pets</h1>
        <button
          onClick={() => setShowAddForm((v) => !v)}
          className="px-4 py-2 bg-[#48634e] hover:bg-[#3b5240] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
        >
          + ADD PET
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddPet} className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm mb-6 grid grid-cols-2 sm:grid-cols-6 gap-3 items-end">
          <div className="flex flex-col items-center">
            <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1 self-start">Photo</label>
            <label className="cursor-pointer">
              {newPet.image ? (
                <img
                  src={newPet.image}
                  alt="Pet preview"
                  className="w-12 h-12 rounded-full object-cover border border-stone-200 hover:opacity-80 transition-opacity"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-400 hover:bg-stone-200 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <circle cx="12" cy="13" r="3" />
                  </svg>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => readImageFile(e.target.files?.[0], (dataUrl) => setNewPet((p) => ({ ...p, image: dataUrl })))}
              />
            </label>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Name</label>
            <input required value={newPet.name} onChange={(e) => setNewPet({ ...newPet, name: e.target.value })}
              className="w-full p-2.5 bg-[#f9f9f8] border border-stone-200 rounded-lg text-xs" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Type</label>
            <select value={newPet.type} onChange={(e) => setNewPet({ ...newPet, type: e.target.value })}
              className="w-full p-2.5 bg-[#f9f9f8] border border-stone-200 rounded-lg text-xs">
              <option value="Dog">Dog</option>
              <option value="Cat">Cat</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Breed</label>
            <input required value={newPet.breed} onChange={(e) => setNewPet({ ...newPet, breed: e.target.value })}
              className="w-full p-2.5 bg-[#f9f9f8] border border-stone-200 rounded-lg text-xs" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Age (years)</label>
            <input required type="number" min="0" step="1" value={newPet.ageYears}
              onChange={(e) => setNewPet({ ...newPet, ageYears: e.target.value })}
              className="w-full p-2.5 bg-[#f9f9f8] border border-stone-200 rounded-lg text-xs" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Weight (kg)</label>
            <input required type="number" min="0" step="0.1" value={newPet.weightKg}
              onChange={(e) => setNewPet({ ...newPet, weightKg: e.target.value })}
              className="w-full p-2.5 bg-[#f9f9f8] border border-stone-200 rounded-lg text-xs" />
          </div>
          <button type="submit" className="col-span-2 sm:col-span-6 mt-2 py-2.5 bg-[#48634e] hover:bg-[#3b5240] text-white font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer">
            Save Pet
          </button>
        </form>
      )}

      {pets.length === 0 ? (
        <div className="bg-white p-8 rounded-3xl border border-stone-100 text-sm text-stone-500 text-center">
          No pets yet — add your first one above.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Pet Selector Column */}
          <div className="md:col-span-4 space-y-3">
            {pets.map((pet) => (
              <div
                key={pet._id}
                onClick={() => setSelectedPet(pet._id)}
                className={`flex items-center space-x-3.5 p-4 rounded-2xl border cursor-pointer transition-all ${
                  selectedPet === pet._id
                    ? 'bg-white border-stone-200 shadow-sm'
                    : 'bg-transparent border-transparent hover:bg-white/60'
                }`}
              >
                {pet.image ? (
                  <img src={pet.image} alt={pet.name} className="w-12 h-12 rounded-full object-cover border border-stone-200" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-400">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-bold text-stone-900">{pet.name}</h3>
                  <p className="text-xs text-stone-400">{pet.breed}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Pet Details Card */}
          {currentPet ? (
            <div className="md:col-span-8 bg-white p-6 md:p-8 rounded-3xl border border-stone-100 shadow-sm">
              <div className="flex items-center space-x-5 mb-8 pb-6 border-b border-stone-100">
                <label className="relative cursor-pointer group" title="Change photo">
                  {currentPet.image ? (
                    <img src={currentPet.image} alt={currentPet.name} className="w-20 h-20 rounded-full object-cover border-2 border-stone-100" />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-stone-100 border-2 border-stone-100 flex items-center justify-center text-stone-400">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <circle cx="12" cy="13" r="3" />
                      </svg>
                    </div>
                  )}
                  <span className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[9px] font-bold uppercase tracking-wider">
                    Change
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => readImageFile(e.target.files?.[0], (dataUrl) => updatePetPhoto(currentPet._id, dataUrl))}
                  />
                </label>
                <div>
                  <h2 className="text-2xl font-bold text-stone-900">{currentPet.name}</h2>
                  <div className="flex space-x-6 text-xs text-stone-400 font-medium mt-1">
                    <div><span className="block uppercase tracking-wider text-[10px] text-stone-400">BREED</span> <span className="text-stone-700 font-semibold">{currentPet.breed}</span></div>
                    <div><span className="block uppercase tracking-wider text-[10px] text-stone-400">AGE</span> <span className="text-stone-700 font-semibold">{currentPet.age}</span></div>
                    <div><span className="block uppercase tracking-wider text-[10px] text-stone-400">WEIGHT</span> <span className="text-stone-700 font-semibold">{currentPet.weight}</span></div>
                  </div>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex space-x-6 border-b border-stone-100 mb-6 text-xs font-semibold">
                {['Vaccinations', 'Medical History', 'Deworming', 'Documents'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`pb-3 transition-all cursor-pointer ${
                      activeTab === tab
                        ? 'text-[#48634e] border-b-2 border-[#48634e] font-bold'
                        : 'text-stone-400 hover:text-stone-600'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Table Data */}
              {(activeTab === 'Vaccinations' || activeTab === 'Medical History') ? (
                <div className="bg-[#f9f9f8] rounded-2xl border border-stone-100 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="text-stone-400 uppercase tracking-wider border-b border-stone-100">
                      <tr>
                        <th className="p-4 font-semibold">{activeTab === 'Vaccinations' ? 'Vaccine' : 'Record'}</th>
                        <th className="p-4 font-semibold">Date</th>
                        <th className="p-4 font-semibold">Clinic</th>
                        <th className="p-4 font-semibold">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 text-stone-700 font-medium">
                      {(activeTab === 'Vaccinations' ? vaccinations : medicalHistory).map((rec) => (
                        <tr key={rec._id}>
                          <td className="p-4 font-bold text-stone-900">{rec.title}</td>
                          <td className="p-4 text-stone-500">{rec.date}</td>
                          <td className="p-4 text-stone-500">{rec.clinic}</td>
                          <td className="p-4 text-stone-500">{rec.summary}</td>
                        </tr>
                      ))}
                      {(activeTab === 'Vaccinations' ? vaccinations : medicalHistory).length === 0 && (
                        <tr><td colSpan="4" className="p-4 text-stone-400 text-center">No records yet</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="bg-[#f9f9f8] rounded-2xl border border-stone-100 p-6 text-xs text-stone-400 text-center">
                  Nothing here yet.
                </div>
              )}
            </div>
          ) : (
            <div className="md:col-span-8 bg-white p-8 rounded-3xl border border-stone-100 shadow-sm flex items-center justify-center text-stone-400 text-sm font-medium">
              Select a pet on the left to view details.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default MyPets;