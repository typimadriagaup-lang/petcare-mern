import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { logout as clearSession, roleLabel } from '../utils/auth';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const EMPTY_PROFILE = { firstName: '', lastName: '', email: '', phone: '', city: '', role: 'Pet Owner', avatar: '' };
const MAX_PHOTO_BYTES = 3 * 1024 * 1024; // 3MB

// Philippine mobile: stored as +639XXXXXXXXX, user types the 10 digits after +63
const phoneDigits = (p) => {
  let d = String(p || '').replace(/\D/g, '');
  if (d.startsWith('63')) d = d.slice(2);
  else if (d.startsWith('0')) d = d.slice(1);
  return d.slice(0, 10);
};

function Profile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [savedProfile, setSavedProfile] = useState(EMPTY_PROFILE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loggedIn, setLoggedIn] = useState(!!localStorage.getItem('token'));
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      setLoggedIn(false);
      return;
    }

    axios.get(`${API_BASE_URL}/api/users/me`, {
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

        // Sync local storage and dispatch event so Sidebar/Navbar updates instantly
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
    setSaving(true);
    setMessage({ type: '', text: '' });

    if (profile.phone && !/^9\d{9}$/.test(phoneDigits(profile.phone))) {
      setMessage({ type: 'error', text: 'Enter a valid PH mobile number: +63 followed by 10 digits starting with 9.' });
      setSaving(false);
      return;
    }

    try {
      const fullName = `${profile.firstName} ${profile.lastName}`.trim();
      
      const res = await axios.put(`${API_BASE_URL}/api/users/me`,
        { name: fullName, phone: phoneDigits(profile.phone) ? '+63' + phoneDigits(profile.phone) : '', city: profile.city, avatar: profile.avatar },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Re-normalize returned data to guarantee exact sync with backend response
      const updatedData = res.data.user || res.data;
      const [fName, ...lNameArr] = (updatedData.name || fullName).split(' ');
      
      const syncedProfile = {
        firstName: fName || profile.firstName,
        lastName: lNameArr.join(' ') || profile.lastName,
        email: updatedData.email || profile.email,
        phone: updatedData.phone || profile.phone,
        city: updatedData.city || profile.city,
        role: updatedData.role || profile.role,
        avatar: updatedData.avatar || profile.avatar
      };

      setProfile(syncedProfile);
      setSavedProfile(syncedProfile);

      // Save updated details to localStorage and notify all active listeners
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      const updatedUser = {
        ...storedUser,
        name: fullName,
        firstName: syncedProfile.firstName,
        lastName: syncedProfile.lastName,
        phone: syncedProfile.phone,
        city: syncedProfile.city,
        avatar: syncedProfile.avatar
      };
      
      localStorage.setItem('user', JSON.stringify(updatedUser));
      window.dispatchEvent(new Event('userUpdated'));
      window.dispatchEvent(new Event('storage'));

      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Could not save profile. Please try again.'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarPick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please choose a valid image file.' });
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setMessage({ type: 'error', text: 'Image is too large — please choose one under 3MB.' });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setProfile((p) => ({ ...p, avatar: reader.result }));
      setMessage({ type: '', text: '' });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCancel = () => {
    setProfile(savedProfile);
    setMessage({ type: '', text: '' });
  };

  const handleLogout = () => {
    clearSession();
    navigate('/');
  };

  if (!loggedIn) {
    return (
      <div className="p-6 md:p-8 page-bg min-h-screen font-sans text-stone-800">
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
    <div className="p-6 md:p-8 page-bg min-h-screen font-sans text-stone-800">
      <div className="mb-6 max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold text-[#2d4a36]">Profile</h1>
        <p className="text-sm text-[#48634e]/80 mt-1">Manage your personal information and account details.</p>
      </div>

      <div className="max-w-5xl mx-auto">
        {/* Toast / Inline Feedback Message */}
        {message.text && (
          <div className={`mb-4 p-4 rounded-2xl text-xs font-semibold flex items-center justify-between ${
            message.type === 'success' 
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            <span>{message.text}</span>
            <button 
              type="button" 
              onClick={() => setMessage({ type: '', text: '' })} 
              className="text-stone-400 hover:text-stone-600 font-bold ml-4"
            >
              ✕
            </button>
          </div>
        )}

        {/* Profile Form Card */}
        <div className="bg-white p-8 md:p-12 rounded-3xl border-2 border-[#48634e]/40 shadow-md">
          <h2 className="text-2xl font-bold text-[#2d4a36] mb-8">Personal Details</h2>

          <div className="flex items-center space-x-6 mb-10">
            <div className="relative">
              {profile.avatar ? (
                <img
                  src={profile.avatar}
                  alt="avatar"
                  className="w-28 h-28 rounded-full object-cover border-4 border-[#48634e]"
                />
              ) : (
                <div className="w-28 h-28 rounded-full bg-[#e2ece5] border-4 border-[#48634e] flex items-center justify-center text-[#48634e] font-bold text-3xl">
                  {profile.firstName ? profile.firstName[0].toUpperCase() : 'U'}
                </div>
              )}
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-xl">{profile.firstName} {profile.lastName}</h3>
              <p className="text-sm text-stone-500">
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
                className="text-xs font-bold text-[#48634e] hover:underline cursor-pointer uppercase tracking-wider mt-2 block"
              >
                EDIT AVATAR
              </button>
            </div>
          </div>

          <form className="space-y-8" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
            <div>
              <span className="text-xs font-bold text-[#48634e] tracking-wider uppercase block mb-4">PERSONAL INFORMATION</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-2">First Name</label>
                  <input type="text" value={profile.firstName}
                    onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                    className="w-full px-4 py-4 bg-[#f6f9f7] border-2 border-[#b7c9bb] focus:border-[#48634e] rounded-xl text-base text-stone-800 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-2">Last Name</label>
                  <input type="text" value={profile.lastName}
                    onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                    className="w-full px-4 py-4 bg-[#f6f9f7] border-2 border-[#b7c9bb] focus:border-[#48634e] rounded-xl text-base text-stone-800 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-2">Email Address</label>
                  <input type="email" value={profile.email} disabled
                    className="w-full px-4 py-4 bg-[#f6f9f7] border-2 border-[#b7c9bb] focus:border-[#48634e] rounded-xl text-base text-stone-400 outline-none cursor-not-allowed" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-2">Phone Number</label>
                  <div className="flex items-center bg-[#f6f9f7] border-2 border-[#b7c9bb] rounded-xl overflow-hidden focus-within:border-[#48634e]">
                    <span className="pl-4 pr-2 text-base font-semibold text-stone-600 select-none">+63</span>
                    <input type="tel" inputMode="numeric" maxLength={10} value={phoneDigits(profile.phone)}
                      onChange={(e) => {
                        const d = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setProfile({ ...profile, phone: d ? '+63' + d : '' });
                      }}
                      onKeyDown={(e) => {
                        const allowed = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
                        if (!/^\d$/.test(e.key) && !allowed.includes(e.key) && !e.ctrlKey && !e.metaKey) e.preventDefault();
                      }}
                      placeholder="9123456789"
                      className="w-full py-4 pr-4 bg-transparent text-base text-stone-800 outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-2">City/Municipality</label>
                  <input type="text" value={profile.city}
                    onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                    className="w-full px-4 py-4 bg-[#f6f9f7] border-2 border-[#b7c9bb] focus:border-[#48634e] rounded-xl text-base text-stone-800 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-2">Role</label>
                  <input type="text" value={roleLabel(profile.role)} disabled
                    className="w-full px-4 py-4 bg-[#f6f9f7] border-2 border-[#b7c9bb] focus:border-[#48634e] rounded-xl text-base text-stone-400 outline-none cursor-not-allowed" />
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-6 border-t-2 border-[#48634e]/25">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(true)}
                className="px-7 py-3.5 border-2 border-red-300 text-red-600 hover:bg-red-50 font-bold text-sm uppercase tracking-wider rounded-xl transition-all cursor-pointer"
              >
                Log Out
              </button>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={!hasChanges || saving}
                  className={`px-7 py-3.5 border-2 font-bold text-sm uppercase tracking-wider rounded-xl transition-all ${
                    hasChanges && !saving
                      ? 'border-[#48634e] hover:bg-[#e2ece5] text-[#48634e] cursor-pointer'
                      : 'border-[#d5e0d8] text-stone-300 cursor-not-allowed'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!hasChanges || saving}
                  className={`px-7 py-3.5 font-bold text-sm uppercase tracking-wider rounded-xl transition-all ${
                    hasChanges && !saving
                      ? 'bg-[#48634e] hover:bg-[#3b5240] text-white cursor-pointer'
                      : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                  }`}
                >
                  {saving ? 'SAVING...' : 'SAVE CHANGES'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-stone-100 shadow-xl text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-500 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </div>

            <h3 className="text-lg font-bold text-stone-900 mb-2">Sign Out</h3>
            <p className="text-xs text-stone-500 mb-6">Are you sure you want to log out of your account?</p>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Profile;