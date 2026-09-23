import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import { getCurrentUser, isAdmin, roleLabel } from '../utils/auth';

function Sidebar() {
  const location = useLocation();
  const [user, setUser] = useState(() => getCurrentUser());
  const admin = isAdmin();

  // Listen for local storage updates or custom auth events
  useEffect(() => {
    const handleUserUpdate = () => {
      setUser(getCurrentUser());
    };

    window.addEventListener('storage', handleUserUpdate);
    window.addEventListener('userUpdated', handleUserUpdate);

    // Safely fetch full user profile on mount to load avatar without breaking session
    const token = localStorage.getItem('token');
    if (token) {
      axios
        .get('http://localhost:5000/api/users/me', {
          headers: { Authorization: `Bearer ${token}` }
        })
        .then((res) => {
          const fullUserData = res.data?.user || res.data;
          if (fullUserData && typeof fullUserData === 'object') {
            const current = getCurrentUser() || {};
            const updatedUser = { ...current, ...fullUserData };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            setUser(updatedUser);
          }
        })
        .catch((err) => {
          // Catch errors silently so failure to fetch avatar will NOT redirect to login
          console.warn('Background profile sync skipped:', err.message);
        });
    }

    return () => {
      window.removeEventListener('storage', handleUserUpdate);
      window.removeEventListener('userUpdated', handleUserUpdate);
    };
  }, []);

  // Dynamically resolve name
  const userName = user?.name || 
    (user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Guest');

  // Check all common user photo / avatar key variations
  const userAvatar = 
    user?.avatar || 
    user?.avatarUrl || 
    user?.avatar_url || 
    user?.image || 
    user?.photo || 
    user?.photoURL || 
    user?.photo_url || 
    user?.picture || 
    user?.profilePic || 
    user?.profile_picture || 
    user?.profilePicture || 
    `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=E2ECE5&color=2D4A36&bold=true`;

  // Dynamically resolve role — real accounts always carry their own role
  // string (e.g. "Moderator", "Clinic Admin") from the database; roleLabel()
  // turns "Moderator" into the friendlier "Veterinary Staff" for display.
  const userRole = roleLabel(user?.role) || (admin ? 'Clinic Admin' : 'Pet Owner');

  const links = [
    { to: '/dashboard', label: 'Dashboard' },
    ...(admin
      ? [
          { to: '/admin', label: 'Admin Clinic' },
          { to: '/patients', label: 'Patients' }
        ]
      : [
          { to: '/my-pets', label: 'My Pets' }
        ]),
    { to: '/medical-records', label: 'Medical Records' },
    { to: '/appointments', label: 'Appointments' },
    { to: '/reminders', label: 'Reminders' },
    { to: '/profile', label: 'Profile' }
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-top">
        <div className="flex items-center gap-3 px-4 py-4 mb-2">
          <img 
            src="/petcarelogo.png" 
            alt="PetCare Logo" 
            className="w-12 h-12 object-contain rounded-lg"
          />
          <span className="text-xl font-bold flex items-center h-12">PetCare</span>
        </div>
        <div className="nav-links">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={location.pathname === link.to ? 'active' : ''}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div> 

      <div className="sidebar-footer">
        <img 
          src={userAvatar} 
          alt={userName} 
          className="user-avatar" 
        />
        <div className="user-info">
          <p className="user-name">{userName}</p>
          <p className="user-role">{userRole}</p>
        </div>
      </div>
    </div>
  );
}

export default Sidebar;