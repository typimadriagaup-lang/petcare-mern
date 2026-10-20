// Helpers for reading and updating the signed-in user saved by Login.jsx / Profile.jsx

export const ADMIN_ROLE = 'Clinic Admin';
export const MODERATOR_ROLE = 'Moderator';

// Staff accounts — anyone who runs the clinic side of the app rather than
// booking as a pet owner. A Moderator IS the veterinary staff: they're the
// one who approves/declines incoming appointment requests, so they get the
// same clinic dashboard, appointment-approval access, and navigation as a
// full Clinic Admin, never the customer-facing Pet Owner experience.
export const STAFF_ROLES = [ADMIN_ROLE, MODERATOR_ROLE];

// Human-friendly label for a stored role value. The DB/role string stays
// "Moderator" (so existing accounts and logic don't break), but everywhere
// it's shown on screen it reads "Veterinary Staff" so it's clear what the
// role actually is.
export function roleLabel(role) {
  if (role === MODERATOR_ROLE) return 'Veterinary Staff';
  return role || 'Pet Owner';
}

export function getCurrentUser() {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// Save or overwrite user data in localStorage & trigger event to update Sidebar instantly
export function setCurrentUser(user) {
  try {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
    window.dispatchEvent(new Event('userUpdated'));
  } catch (error) {
    console.error('Failed to set user in localStorage:', error);
  }
}

// Safely merge user updates (such as avatar, name, or role) with existing user data
export function updateCurrentUser(updates) {
  const current = getCurrentUser() || {};
  const updated = { ...current, ...updates };
  setCurrentUser(updated);
  return updated;
}

export function isLoggedIn() {
  return !!localStorage.getItem('token');
}

// True for any staff account (Clinic Admin or Moderator). Named isAdmin()
// because that's what the rest of the app already gates on — a Moderator
// should be treated exactly like an admin/staff account here, never like a
// Pet Owner "user" account.
export function isAdmin() {
  const user = getCurrentUser();
  return STAFF_ROLES.includes(user?.role);
}

// True only for the full Clinic Admin role, for the rare case something
// should be restricted to admins specifically and not moderators.
export function isFullAdmin() {
  const user = getCurrentUser();
  return user?.role === ADMIN_ROLE;
}

export function isModerator() {
  const user = getCurrentUser();
  return user?.role === MODERATOR_ROLE;
}

export function homePathFor(user) {
  return STAFF_ROLES.includes(user?.role) ? '/dashboard' : '/my-pets';
}

export function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.dispatchEvent(new Event('userUpdated'));
}
// Authorization header for API calls that need the signed-in user
export function authHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}
