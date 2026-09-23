import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { logout as clearSession, roleLabel } from '../utils/auth';

const EMPTY_PROFILE = { firstName: '', lastName: '', email: '', phone: '', city: '', role: 'Pet Owner', avatar: '' };
const FALLBACK_AVATAR = 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=120&q=80';
const MAX_PHOTO_BYTES = 3 * 1024 * 1024; // 3MB, keeps the base64 payload reasonable

function Profile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [savedProfile, setSavedProfile] = useState(EMPTY_PROFILE);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(!!localStorage.getItem('token'));
  const fileInputRef = React.useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    axios.get('http://localhost:5000/api/users/me', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => {
        const [firstName, ...rest] = (res.data.name || '').split(' ');
        const loaded = {
          firstName: firstName || '',
          lastName: rest.join(' ') || '',
          email: res.data.email || '',
          phone: res.data.phone || '',
          city: res.data.city || '',
          role: res.data.role || 'Pet Owner',
          avatar: res.data.avatar || ''
        };
        setProfile(loaded);
        setSavedProfile(loaded);

        // Sync local storage and dispatch event so Sidebar updates instantly
        try {
          const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
          const updatedUser = {
            ...storedUser,
            name: res.data.name || `${loaded.firstName} ${loaded.lastName}`.trim(),
            firstName: loaded.firstName,
            lastName: loaded.lastName,
            email: loaded.email,
            role: loaded.role,
            avatar: loaded.avatar
          };
          localStorage.setItem('user', JSON.stringify(updatedUser));
          window.dispatchEvent(new Event('userUpdated'));
        } catch (e) {
          console.error('Failed to sync profile to localStorage:', e);
        }

        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching profile:', err);
        if (err.response?.status === 401) setLoggedIn(false);
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    const token = localStorage.getItem('token');
    try {
      const fullName = `${profile.firstName} ${profile.lastName}`.trim();
      await axios.put('http://localhost:5000/api/users/me',
        { name: fullName, phone: profile.phone, city: profile.city, avatar: profile.avatar },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSavedProfile(profile);

      // Save updated details to localStorage and notify Sidebar to sync immediately
      try {
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        const updatedUser = {
          ...storedUser,
          name: fullName,
          firstName: profile.firstName,
          lastName: profile.lastName,
          phone: profile.phone,
          city: profile.city,
          avatar: profile.avatar
        };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        window.dispatchEvent(new Event('userUpdated'));
      } catch (e) {
        console.error('Failed to save user in localStorage:', e);
      }

      alert('Profile updated!');
    } catch (err) {
      alert(err.response?.data?.message || 'Could not save profile');
    }
  };

  const handleAvatarPick = (e) => {
    const file = e.target.files?.[0];
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
    reader.onload = () => setProfile((p) => ({ ...p, avatar: reader.result }));
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCancel = () => {
    setProfile(savedProfile);
  };

  const handleLogout = () => {
    clearSession();
    navigate('/login');
  };

  if (!loggedIn) {
    return (
      <div className="p-6 md:p-8 bg-[#f8f7f4] min-h-screen font-sans text-stone-800">
        <div className="bg-white p-8 rounded-3xl border border-stone-100 text-sm text-stone-500 max-w-md">
          Log in to view and edit your profile.
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="p-8 text-stone-500 font-medium">Loading your profile...</div>;
  }

  const hasChanges = JSON.stringify(profile) !== JSON.stringify(savedProfile);

  return (
    <div className="p-6 md:p-8 bg-[#f8f7f4] min-h-screen font-sans text-stone-800">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-900">Profile</h1>
        <p className="text-xs text-stone-400 mt-1">Manage your personal information and account details.</p>
      </div>

      <div className="max-w-4xl">
        {/* Profile Form Card */}
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-stone-100 shadow-sm">
          <h2 className="text-lg font-bold text-stone-900 mb-6">Personal Details</h2>

          <div className="flex items-center space-x-4 mb-8">
            <div className="relative">
              <img
                src={profile.avatar || FALLBACK_AVATAR}
                alt="avatar"
                className="w-16 h-16 rounded-full object-cover border border-stone-200"
              />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-sm">{profile.firstName} {profile.lastName}</h3>
              <p className="text-xs text-stone-400">
                {profile.role === 'Clinic Admin'
                  ? 'Clinic Administrator Account'
                  : profile.role === 'Moderator'
                  ? 'Veterinary Staff Account'
                  : 'Primary Pet Parent Account'}
              </p>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarPick} className="hidden" />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-[10px] font-bold text-[#48634e] hover:underline cursor-pointer uppercase tracking-wider mt-1 block"
              >
                EDIT AVATAR
              </button>
            </div>
          </div>

          <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
            <div>
              <span className="text-[10px] font-bold text-stone-400 tracking-wider uppercase block mb-3">PERSONAL INFORMATION</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">First Name</label>
                  <input type="text" value={profile.firstName}
                    onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                    className="w-full p-3 bg-[#f9f9f8] border border-stone-200 rounded-xl text-xs text-stone-800 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Last Name</label>
                  <input type="text" value={profile.lastName}
                    onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                    className="w-full p-3 bg-[#f9f9f8] border border-stone-200 rounded-xl text-xs text-stone-800 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Email Address</label>
                  <input type="email" value={profile.email} disabled
                    className="w-full p-3 bg-[#f9f9f8] border border-stone-200 rounded-xl text-xs text-stone-400 outline-none cursor-not-allowed" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Phone Number</label>
                  <input type="text" value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    placeholder="+63 912 345 6789"
                    className="w-full p-3 bg-[#f9f9f8] border border-stone-200 rounded-xl text-xs text-stone-800 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">City/Municipality</label>
                  <input type="text" value={profile.city}
                    onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                    className="w-full p-3 bg-[#f9f9f8] border border-stone-200 rounded-xl text-xs text-stone-800 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Role</label>
                  <input type="text" value={roleLabel(profile.role)} disabled
                    className="w-full p-3 bg-[#f9f9f8] border border-stone-200 rounded-xl text-xs text-stone-400 outline-none cursor-not-allowed" />
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-stone-100">
              <button
                type="button"
                onClick={handleLogout}
                className="px-5 py-2.5 border border-red-200 text-red-600 hover:bg-red-50 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
              >
                Log Out
              </button>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={!hasChanges}
                  className={`px-5 py-2.5 border font-bold text-xs uppercase tracking-wider rounded-xl transition-all ${
                    hasChanges
                      ? 'border-stone-200 hover:bg-stone-50 text-stone-800 cursor-pointer'
                      : 'border-stone-100 text-stone-300 cursor-not-allowed'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!hasChanges}
                  className={`px-5 py-2.5 font-bold text-xs uppercase tracking-wider rounded-xl transition-all ${
                    hasChanges
                      ? 'bg-[#48634e] hover:bg-[#3b5240] text-white cursor-pointer'
                      : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                  }`}
                >
                  SAVE CHANGES
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Profile;