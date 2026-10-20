const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { isFrozen, frozenMessage } = require('../utils/freeze');

const ADMIN_ROLE = 'Clinic Admin';
const MODERATOR_ROLE = 'Moderator';
const STAFF_ROLES = [ADMIN_ROLE, MODERATOR_ROLE];

/**
 * Requires a valid token. The account is looked up in the database on every
 * request, so a disabled or deleted account is locked out immediately and the
 * role always comes from the database, never from the token alone.
 * Sets req.userId and req.user ({ _id, name, email, role }).
 */
async function protect(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided, access denied' });
  }

  const token = authHeader.split(' ')[1];

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }

  try {
    const user = await User.findById(decoded.id).select('name email role active frozenUntil freezeReason');
    if (!user) return res.status(401).json({ message: 'Account no longer exists' });
    if (user.active === false) {
      return res.status(403).json({ message: 'This account has been disabled. Please contact the clinic administrator.' });
    }
    if (isFrozen(user) && !STAFF_ROLES.includes(user.role)) {
      return res.status(403).json({ message: frozenMessage(user), frozen: true });
    }
    req.userId = String(user._id);
    req.user = { _id: user._id, name: user.name, email: user.email, role: user.role };
    next();
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

const requireAuth = protect;

// Clinic Admin or Moderator (Veterinary Staff)
function requireStaff(req, res, next) {
  protect(req, res, () => {
    if (!STAFF_ROLES.includes(req.user.role)) {
      return res.status(403).json({ message: 'This action is for clinic staff only.' });
    }
    next();
  });
}

// Clinic Admin only
function requireAdmin(req, res, next) {
  protect(req, res, () => {
    if (req.user.role !== ADMIN_ROLE) {
      return res.status(403).json({ message: 'Only the Clinic Admin can do this.' });
    }
    next();
  });
}

const isStaffUser = (req) => !!req.user && STAFF_ROLES.includes(req.user.role);
const isAdminUser = (req) => !!req.user && req.user.role === ADMIN_ROLE;

// Reads the token if present, but doesn't block the request if it's missing.
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.userId = decoded.id;
    } catch (err) {
      // ignore invalid token, treat as guest
    }
  }
  next();
}

module.exports = {
  protect, requireAuth, requireStaff, requireAdmin, optionalAuth,
  isStaffUser, isAdminUser, ADMIN_ROLE, MODERATOR_ROLE, STAFF_ROLES
};
