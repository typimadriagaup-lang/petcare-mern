import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5MB picked, then shrunk before saving
const PHOTO_SIZE = 400;                  // saved as a 400x400 square

const PET_TYPES = ['Dog', 'Cat', 'Rabbit', 'Bird', 'Hamster', 'Other'];
const TYPE_ICON = { Dog: '🐶', Cat: '🐱', Rabbit: '🐰', Bird: '🐦', Hamster: '🐹', Other: '🐾' };

const BREEDS = {
  Dog: [
    'Aspin (Mixed breed)', 'Shih Tzu', 'Labrador Retriever', 'Golden Retriever', 'Pomeranian', 'Poodle',
    'Pug', 'Chihuahua', 'Siberian Husky', 'Beagle', 'Bulldog', 'French Bulldog', 'German Shepherd',
    'Belgian Malinois', 'Dachshund', 'Rottweiler', 'Corgi', 'Maltese', 'Yorkshire Terrier', 'Doberman',
    'Great Dane', 'Boxer', 'Cocker Spaniel', 'Jack Russell Terrier', 'Samoyed', 'Akita', 'Chow Chow', 'Dalmatian'
  ],
  Cat: [
    'Puspin (Domestic Short Hair)', 'Persian', 'Siamese', 'Maine Coon', 'British Shorthair', 'Ragdoll',
    'Bengal', 'Scottish Fold', 'Sphynx', 'Russian Blue', 'American Shorthair', 'Birman', 'Abyssinian', 'Munchkin'
  ],
  Rabbit: ['Holland Lop', 'Netherland Dwarf', 'Mini Rex', 'Lionhead', 'Mixed breed'],
  Bird: ['Parakeet', 'Cockatiel', 'Lovebird', 'Canary', 'Parrot', 'Finch'],
  Hamster: ['Syrian', 'Dwarf', 'Roborovski', 'Chinese'],
  Other: []
};

const NAME_RE = /^[\p{L}][\p{L} '\-.]{1,29}$/u;

const emptyForm = {
  name: '', type: 'Dog', breed: '', breedOther: false, birthdate: '', weightKg: '',
  sex: '', neutered: false, color: '', allergies: '', image: ''
};

// ---------- helpers ----------
const authHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const toISO = (d) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const todayISO = () => toISO(new Date());
const oldestISO = () => { const d = new Date(); d.setFullYear(d.getFullYear() - 30); return toISO(d); };

// "3 years 2 months" from a YYYY-MM-DD birthdate
const ageText = (birthdate) => {
  if (!birthdate) return '';
  const b = new Date(`${birthdate}T00:00:00`);
  if (isNaN(b)) return '';
  const now = new Date();
  let months = (now.getFullYear() - b.getFullYear()) * 12 + (now.getMonth() - b.getMonth());
  if (now.getDate() < b.getDate()) months -= 1;
  if (months < 0) return '';
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (y === 0) return m === 0 ? 'Under 1 month' : `${m} ${m === 1 ? 'month' : 'months'}`;
  const yPart = `${y} ${y === 1 ? 'year' : 'years'}`;
  return m === 0 ? yPart : `${yPart} ${m} ${m === 1 ? 'month' : 'months'}`;
};

// Reads the picked image, centre-crops it to a square and shrinks it (keeps the database light)
const processImageFile = (file, onDone) => {
  if (!file) return;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    toast.error('Please choose a JPG, PNG or WEBP image.');
    return;
  }
  if (file.size > MAX_PHOTO_BYTES) {
    toast.error('That image is too large — please choose one under 5MB.');
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const side = Math.min(img.width, img.height);
      const sx = (img.width - side) / 2;
      const sy = (img.height - side) / 2;
      const canvas = document.createElement('canvas');
      canvas.width = PHOTO_SIZE;
      canvas.height = PHOTO_SIZE;
      canvas.getContext('2d').drawImage(img, sx, sy, side, side, 0, 0, PHOTO_SIZE, PHOTO_SIZE);
      onDone(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => toast.error('That image could not be read.');
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
};

const validate = (f, pets, editingId) => {
  const errors = {};
  const name = f.name.trim();
  if (!NAME_RE.test(name)) errors.name = 'Use 2–30 letters (spaces, hyphens and apostrophes are fine).';
  if (!f.type) errors.type = 'Choose a type.';
  const breed = f.breed.trim();
  if (breed.length < 2) errors.breed = f.breedOther ? 'Type the breed (at least 2 letters).' : 'Choose a breed, or pick "Other" if it isn\u2019t listed.';
  if (!f.birthdate) errors.birthdate = 'Enter your pet’s birthdate.';
  else if (f.birthdate > todayISO()) errors.birthdate = 'Birthdate can’t be in the future.';
  else if (f.birthdate < oldestISO()) errors.birthdate = 'Birthdate can’t be more than 30 years ago.';
  const w = parseFloat(f.weightKg);
  if (!(w > 0 && w <= 150)) errors.weightKg = 'Enter a weight between 0.1 and 150 kg.';
  if (!errors.name && !errors.breed) {
    const dup = pets.find((p) =>
      p._id !== editingId &&
      p.name.trim().toLowerCase() === name.toLowerCase() &&
      p.breed.trim().toLowerCase() === breed.toLowerCase());
    if (dup) errors.name = `You already have a ${dup.breed} named ${dup.name}.`;
  }
  return errors;
};

const inputCls = (err) =>
  `w-full p-2.5 bg-[#f9f9f8] border rounded-lg text-xs outline-none focus:border-[#48634e] ${err ? 'border-red-400' : 'border-stone-200'}`;
const labelCls = 'block text-[10px] font-bold text-stone-400 uppercase mb-1';

const FieldError = ({ msg }) => (msg ? <p className="text-[10px] text-red-600 mt-1">{msg}</p> : null);

// ---------- breed picker: searchable list + an "Other (not listed)" choice ----------
const OTHER_LABEL = 'Other (not listed)';
const cleanBreed = (v) => v.replace(/[^\p{L}\s'\-.()]/gu, '');

function BreedPicker({ type, breed, other, onPick, onOther, onType, error }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapRef = useRef(null);
  const list = BREEDS[type] || [];
  const listless = list.length === 0; // e.g. type "Other": nothing to pick from
  const q = search.trim().toLowerCase();
  const matches = list.filter((b) => b.toLowerCase().includes(q));

  useEffect(() => {
    const close = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) { setOpen(false); setSearch(''); } };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  if (listless) {
    return (
      <>
        <input
          value={breed}
          onChange={(e) => onType(cleanBreed(e.target.value))}
          maxLength={40}
          placeholder="Type the breed"
          className={inputCls(error)}
        />
      </>
    );
  }

  const shown = open ? search : (other ? OTHER_LABEL : breed);

  return (
    <>
      <div className="relative" ref={wrapRef}>
        <input
          value={shown}
          onChange={(e) => setSearch(cleanBreed(e.target.value))}
          onFocus={() => { setSearch(''); setOpen(true); }}
          placeholder="Search or choose a breed"
          maxLength={40}
          autoComplete="off"
          className={inputCls(error && !other)}
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 text-[10px]">▼</span>
        {open && (
          <ul className="absolute z-20 mt-1 w-full max-h-52 overflow-auto bg-white border border-stone-200 rounded-lg shadow-lg text-xs">
            {matches.map((b) => (
              <li
                key={b}
                onMouseDown={(e) => { e.preventDefault(); onPick(b); setOpen(false); setSearch(''); }}
                className={`px-3 py-2 hover:bg-[#ebf0eb] cursor-pointer ${!other && b === breed ? 'bg-[#ebf0eb] font-bold' : ''}`}
              >
                {b}
              </li>
            ))}
            {matches.length === 0 && (
              <li className="px-3 py-2 text-stone-400">No match &mdash; choose &ldquo;Other&rdquo; below</li>
            )}
            {/* Always available, even while searching */}
            <li
              onMouseDown={(e) => { e.preventDefault(); onOther(); setOpen(false); setSearch(''); }}
              className={`sticky bottom-0 px-3 py-2 border-t border-stone-200 bg-stone-50 font-bold text-[#48634e] hover:bg-[#ebf0eb] cursor-pointer ${other ? 'bg-[#ebf0eb]' : ''}`}
            >
              {OTHER_LABEL}
            </li>
          </ul>
        )}
      </div>
      {other && (
        <input
          value={breed}
          onChange={(e) => onType(cleanBreed(e.target.value))}
          maxLength={40}
          autoFocus
          placeholder="Type the breed"
          className={`${inputCls(error)} mt-2`}
        />
      )}
    </>
  );
}

// ---------- avatar ----------
function PetAvatar({ pet, size = 'w-12 h-12', text = 'text-xl' }) {
  return pet.image ? (
    <img src={pet.image} alt={pet.name} className={`${size} rounded-full object-cover border border-stone-200`} />
  ) : (
    <div className={`${size} ${text} rounded-full bg-[#ebf0eb] border border-stone-200 flex items-center justify-center`}>
      {TYPE_ICON[pet.type] || '🐾'}
    </div>
  );
}

function MyPets() {
  const [pets, setPets] = useState([]);
  const [selectedPet, setSelectedPet] = useState(null);
  const [activeTab, setActiveTab] = useState('Vaccinations');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [justAdded, setJustAdded] = useState(null);
  const [deleteState, setDeleteState] = useState(null); // { pet, upcoming, busy }
  const formRef = useRef(null);

  const loadPets = () => {
    axios.get(`${API_URL}/api/pets?mine=true`, { headers: authHeaders() })
      .then((res) => { setPets(res.data); setLoading(false); })
      .catch((err) => { console.error('Error fetching pets:', err); setLoading(false); });
  };
  useEffect(loadPets, []);

  useEffect(() => {
    if (!selectedPet) return;
    axios.get(`${API_URL}/api/medical-records/pet/${selectedPet}`, { headers: authHeaders() })
      .then((res) => setRecords(res.data))
      .catch((err) => console.error('Error fetching medical records:', err));
  }, [selectedPet]);

  const currentPet = pets.find((p) => p._id === selectedPet);
  const vaccinations = records.filter((r) => r.recordType === 'Vaccination');
  const medicalHistory = records.filter((r) => r.recordType !== 'Vaccination');

  const set = (patch) => {
    setForm((f) => ({ ...f, ...patch }));
    setErrors((e) => {
      const next = { ...e };
      Object.keys(patch).forEach((k) => delete next[k]);
      if ('name' in patch || 'breed' in patch) delete next.name;
      return next;
    });
  };

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setErrors({});
    setJustAdded(null);
    setShowForm(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const openEdit = (pet) => {
    setEditingId(pet._id);
    setForm({
      name: pet.name || '',
      type: pet.type || 'Dog',
      breed: pet.breed || '',
      breedOther: !!pet.breed && (BREEDS[pet.type] || []).length > 0 && !(BREEDS[pet.type] || []).includes(pet.breed),
      birthdate: pet.birthdate || '',
      weightKg: parseFloat(pet.weight) ? String(parseFloat(pet.weight)) : '',
      sex: pet.sex || '',
      neutered: !!pet.neutered,
      color: pet.color || '',
      allergies: pet.allergies || '',
      image: pet.image || ''
    });
    setErrors({});
    setJustAdded(null);
    setShowForm(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setErrors({});
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const found = validate(form, pets, editingId);
    if (Object.keys(found).length) {
      setErrors(found);
      toast.warning('Please fix the highlighted fields.');
      return;
    }
    const payload = {
      name: form.name.trim(),
      type: form.type,
      breed: form.breed.trim(),
      birthdate: form.birthdate,
      weight: `${parseFloat(form.weightKg)} kg`,
      sex: form.sex,
      neutered: form.neutered,
      color: form.color.trim(),
      allergies: form.allergies.trim(),
      image: form.image
    };
    setSaving(true);
    try {
      if (editingId) {
        const res = await axios.put(`${API_URL}/api/pets/${editingId}`, payload, { headers: authHeaders() });
        setPets((prev) => prev.map((p) => (p._id === editingId ? { ...p, ...res.data } : p)));
        toast.success(`${res.data.name} updated`);
        closeForm();
        loadPets();
      } else {
        const res = await axios.post(`${API_URL}/api/pets`, payload, { headers: authHeaders() });
        setPets((prev) => [res.data, ...prev]);
        setSelectedPet(res.data._id);
        setJustAdded(res.data);
        toast.success(`${res.data.name} was added`);
        closeForm();
        loadPets();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save the pet. Is the backend running?');
    } finally {
      setSaving(false);
    }
  };

  const updatePetPhoto = async (petId, dataUrl) => {
    try {
      const res = await axios.put(`${API_URL}/api/pets/${petId}`, { image: dataUrl }, { headers: authHeaders() });
      setPets((prev) => prev.map((p) => (p._id === petId ? { ...p, ...res.data } : p)));
      toast.success('Photo updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update the photo');
    }
  };

  // Delete: ask the server about upcoming appointments, then confirm in a dialog
  const startDelete = async (pet) => {
    let upcoming = 0;
    try {
      const res = await axios.get(`${API_URL}/api/pets/${pet._id}/upcoming`, { headers: authHeaders() });
      upcoming = res.data.upcoming || 0;
    } catch (err) {
      // If the check fails we still ask for confirmation
    }
    setDeleteState({ pet, upcoming, busy: false });
  };

  const afterDelete = (pet) => {
    setPets((prev) => prev.filter((p) => p._id !== pet._id));
    if (selectedPet === pet._id) setSelectedPet(null);
    setDeleteState(null);
    toast.success(`${pet.name} was removed`);
  };

  const confirmDelete = async () => {
    const { pet } = deleteState;
    setDeleteState((d) => ({ ...d, busy: true }));
    try {
      await axios.delete(`${API_URL}/api/pets/${pet._id}`, { headers: authHeaders() });
      afterDelete(pet);
    } catch (err) {
      setDeleteState(null);
      toast.error(err.response?.data?.message || 'Could not delete the pet');
    }
  };

  if (loading) {
    return <div className="p-8 text-stone-500 font-medium">Loading your pets...</div>;
  }

  const formAge = ageText(form.birthdate);

  return (
    <div className="p-6 md:p-8 bg-[#f8f7f4] min-h-screen font-sans text-stone-800">
      <ToastContainer position="top-right" autoClose={3500} />

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-stone-900">My Pets</h1>
        {!showForm && (
          <button
            onClick={openAdd}
            className="px-4 py-2 bg-[#48634e] hover:bg-[#3b5240] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
          >
            + ADD PET
          </button>
        )}
      </div>

      {/* Success banner with next step */}
      {justAdded && !showForm && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-semibold text-emerald-800">
            {justAdded.name} is all set! Want to book a visit?
          </p>
          <div className="flex items-center gap-3">
            <Link
              to="/appointments"
              state={{ petId: justAdded._id }}
              className="px-4 py-2 bg-[#48634e] hover:bg-[#3b5240] text-white font-bold text-[11px] uppercase tracking-wider rounded-xl"
            >
              Book an appointment
            </Link>
            <button onClick={() => setJustAdded(null)} className="text-stone-400 hover:text-stone-600 font-bold text-xs cursor-pointer">✕</button>
          </div>
        </div>
      )}

      {/* Add / edit form */}
      {showForm && (
        <form
          ref={formRef}
          onSubmit={handleSave}
          noValidate
          className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm mb-6"
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-bold text-stone-900">{editingId ? 'Edit pet' : 'Add a new pet'}</h2>
            <button type="button" onClick={closeForm} className="text-xs font-bold uppercase tracking-wider text-stone-400 hover:text-stone-700 cursor-pointer">
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            {/* Photo */}
            <div className="md:col-span-2 flex flex-col items-center">
              <span className={`${labelCls} self-start`}>Photo</span>
              <label className="cursor-pointer text-center">
                {form.image ? (
                  <img src={form.image} alt="Pet preview" className="w-24 h-24 rounded-full object-cover border-2 border-stone-200 hover:opacity-80 transition-opacity" />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-[#ebf0eb] border-2 border-dashed border-stone-300 flex flex-col items-center justify-center text-stone-400 hover:bg-stone-100 transition-colors">
                    <span className="text-2xl">{TYPE_ICON[form.type] || '🐾'}</span>
                    <span className="text-[9px] font-bold uppercase mt-1">Add photo</span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => { processImageFile(e.target.files?.[0], (d) => set({ image: d })); e.target.value = ''; }}
                />
              </label>
              {form.image ? (
                <button type="button" onClick={() => set({ image: '' })} className="mt-2 text-[10px] font-bold uppercase text-red-500 hover:text-red-700 cursor-pointer">
                  Remove
                </button>
              ) : (
                <p className="text-[10px] text-stone-400 mt-2 text-center">JPG, PNG or WEBP, up to 5MB. Cropped to a square.</p>
              )}
            </div>

            {/* Fields */}
            <div className="md:col-span-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>Name *</label>
                <input
                  value={form.name}
                  maxLength={30}
                  onChange={(e) => set({ name: e.target.value.replace(/[^\p{L} '\-.]/gu, '') })}
                  className={inputCls(errors.name)}
                />
                <FieldError msg={errors.name} />
              </div>

              <div>
                <label className={labelCls}>Type *</label>
                <select
                  value={form.type}
                  onChange={(e) => set({ type: e.target.value, breed: '', breedOther: false })}
                  className={inputCls(errors.type)}
                >
                  {PET_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label className={labelCls}>Breed *</label>
                <BreedPicker
                  type={form.type}
                  breed={form.breed}
                  other={form.breedOther}
                  onPick={(b) => set({ breed: b, breedOther: false })}
                  onOther={() => set({ breed: '', breedOther: true })}
                  onType={(v) => set({ breed: v })}
                  error={errors.breed}
                />
                <FieldError msg={errors.breed} />
              </div>

              <div>
                <label className={labelCls}>Birthdate *</label>
                <input
                  type="date"
                  value={form.birthdate}
                  min={oldestISO()}
                  max={todayISO()}
                  onChange={(e) => set({ birthdate: e.target.value })}
                  className={inputCls(errors.birthdate)}
                />
                {formAge && !errors.birthdate && <p className="text-[10px] text-stone-400 mt-1">Age: {formAge}</p>}
                <FieldError msg={errors.birthdate} />
              </div>

              <div>
                <label className={labelCls}>Weight (kg) *</label>
                <input
                  type="number"
                  min="0.1"
                  max="150"
                  step="0.1"
                  value={form.weightKg}
                  onChange={(e) => set({ weightKg: e.target.value })}
                  className={inputCls(errors.weightKg)}
                />
                <FieldError msg={errors.weightKg} />
              </div>

              <div>
                <label className={labelCls}>Sex</label>
                <select value={form.sex} onChange={(e) => set({ sex: e.target.value })} className={inputCls()}>
                  <option value="">Not specified</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
                <label className="flex items-center gap-2 mt-2 text-[11px] text-stone-600 font-medium cursor-pointer">
                  <input type="checkbox" checked={form.neutered} onChange={(e) => set({ neutered: e.target.checked })} className="accent-[#48634e]" />
                  Neutered / spayed
                </label>
              </div>

              <div>
                <label className={labelCls}>Color / markings</label>
                <input value={form.color} maxLength={40} onChange={(e) => set({ color: e.target.value })} className={inputCls()} placeholder="e.g. Black with white paws" />
              </div>

              <div className="sm:col-span-2 lg:col-span-3">
                <label className={labelCls}>Allergies / health conditions</label>
                <textarea
                  value={form.allergies}
                  maxLength={300}
                  rows={2}
                  onChange={(e) => set({ allergies: e.target.value })}
                  className={inputCls()}
                  placeholder="Anything the clinic should know before a visit"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="submit"
              disabled={saving}
              className={`flex-1 py-3 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all ${saving ? 'bg-stone-400 cursor-not-allowed' : 'bg-[#48634e] hover:bg-[#3b5240] cursor-pointer'}`}
            >
              {saving ? 'SAVING...' : editingId ? 'SAVE CHANGES' : 'SAVE PET'}
            </button>
            <button
              type="button"
              onClick={closeForm}
              className="px-6 py-3 bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {pets.length === 0 ? (
        <div className="bg-white p-8 rounded-3xl border border-stone-100 text-sm text-stone-500 text-center">
          No pets yet &mdash; add your first one with the <span className="font-bold">+ ADD PET</span> button.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Pet list */}
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
                <PetAvatar pet={pet} />
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-stone-900 truncate">{pet.name}</h3>
                  <p className="text-xs text-stone-400 truncate">{pet.breed}{pet.age ? ` · ${pet.age}` : ''}</p>
                  {pet.petId && <p className="text-[10px] font-bold text-[#48634e] tracking-wider">{pet.petId}</p>}
                </div>
              </div>
            ))}
          </div>

          {/* Details */}
          {currentPet ? (
            <div className="md:col-span-8 bg-white p-6 md:p-8 rounded-3xl border border-stone-100 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4 mb-8 pb-6 border-b border-stone-100">
                <div className="flex items-center space-x-5">
                  <label className="relative cursor-pointer group" title="Change photo">
                    <PetAvatar pet={currentPet} size="w-20 h-20" text="text-3xl" />
                    <span className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[9px] font-bold uppercase tracking-wider">
                      Change
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => { processImageFile(e.target.files?.[0], (d) => updatePetPhoto(currentPet._id, d)); e.target.value = ''; }}
                    />
                  </label>
                  <div>
                    <h2 className="text-2xl font-bold text-stone-900">{currentPet.name}</h2>
                    {currentPet.petId && <span className="inline-block mt-1 px-2 py-0.5 bg-[#e2ebe2] text-[#48634e] rounded-md text-[10px] font-extrabold tracking-wider">PET ID · {currentPet.petId}</span>}
                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-stone-400 font-medium mt-1">
                      <div><span className="block uppercase tracking-wider text-[10px]">BREED</span><span className="text-stone-700 font-semibold">{currentPet.breed}</span></div>
                      <div><span className="block uppercase tracking-wider text-[10px]">AGE</span><span className="text-stone-700 font-semibold">{currentPet.age}</span></div>
                      <div><span className="block uppercase tracking-wider text-[10px]">WEIGHT</span><span className="text-stone-700 font-semibold">{currentPet.weight}</span></div>
                      {currentPet.sex && (
                        <div><span className="block uppercase tracking-wider text-[10px]">SEX</span><span className="text-stone-700 font-semibold">{currentPet.sex}{currentPet.neutered ? (currentPet.sex === 'Female' ? ' · Spayed' : ' · Neutered') : ''}</span></div>
                      )}
                      {currentPet.color && (
                        <div><span className="block uppercase tracking-wider text-[10px]">COLOR</span><span className="text-stone-700 font-semibold">{currentPet.color}</span></div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    to="/appointments"
                    state={{ petId: currentPet._id }}
                    className="px-3.5 py-2 bg-[#48634e] hover:bg-[#3b5240] text-white font-bold text-[11px] uppercase tracking-wider rounded-xl"
                  >
                    Book
                  </Link>
                  <button
                    onClick={() => openEdit(currentPet)}
                    className="px-3.5 py-2 bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 font-bold text-[11px] uppercase tracking-wider rounded-xl cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => startDelete(currentPet)}
                    className="px-3.5 py-2 bg-white border border-red-200 hover:bg-red-50 text-red-600 font-bold text-[11px] uppercase tracking-wider rounded-xl cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {currentPet.allergies && (
                <div className="mb-6 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                  <span className="font-bold uppercase tracking-wider text-[10px] block mb-0.5">Allergies / conditions</span>
                  {currentPet.allergies}
                </div>
              )}

              {/* Tabs */}
              <div className="flex space-x-6 border-b border-stone-100 mb-6 text-xs font-semibold">
                {['Vaccinations', 'Medical History', 'Deworming', 'Documents'].map((tab) => (
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

      {/* Delete confirmation */}
      {deleteState && !deleteState.busy && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-base font-bold text-stone-900">Delete {deleteState.pet.name}?</h3>
            <p className="text-xs text-stone-500 mt-2">
              This also removes their medical records and reminders. This can&apos;t be undone.
            </p>
            {deleteState.upcoming > 0 && (
              <p className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-800">
                {deleteState.pet.name} has {deleteState.upcoming} upcoming appointment{deleteState.upcoming === 1 ? '' : 's'}. {deleteState.upcoming === 1 ? 'It' : 'They'} will be cancelled.
              </p>
            )}
            <div className="flex gap-3 mt-5">
              <button onClick={confirmDelete} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer">
                Delete
              </button>
              <button onClick={() => setDeleteState(null)} className="flex-1 py-2.5 bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer">
                Keep
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MyPets;
