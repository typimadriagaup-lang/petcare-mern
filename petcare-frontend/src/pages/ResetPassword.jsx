import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { API_URL } from '../config';

// 8+ characters and at least one digit — kept in sync with the backend rule
const PASSWORD_RULE = /^(?=.*\d).{8,}$/;
const PASSWORD_RULE_MESSAGE = 'Password must be at least 8 characters and include at least one number.';

function ResetPassword() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const newPasswordValid = PASSWORD_RULE.test(newPassword);
  const passwordsMatch = newPassword === confirmPassword;
  const formValid = newPasswordValid && passwordsMatch;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched(true);
    if (!formValid) return;

    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/api/auth/reset-password`, {
        email,
        oldPassword,
        newPassword
      });
      alert('Password updated! Please sign in with your new password.');
      navigate('/login');
    } catch (err) {
      console.error('Reset password request failed:', err);
      alert(err.response?.data?.message || 'Could not reset password');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f7f4] flex items-center justify-center p-4 w-full">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-md overflow-hidden grid grid-cols-1 md:grid-cols-2 min-h-[520px]">

        {/* Left Side Banner */}
        <div className="bg-[#ebf0eb] p-8 flex flex-col justify-between items-center text-center">
          <div />
          <div className="flex flex-col items-center">
            <img
              src="/petcarelogo.png"
              alt="PetCare Logo"
              className="w-56 h-auto object-contain mb-2 rounded-xl"
            />
          </div>
          <p className="text-[11px] font-bold tracking-widest text-stone-500 uppercase pb-2">
            PetCare Portal
          </p>
        </div>

        {/* Right Side Form */}
        <div className="p-8 md:p-12 flex flex-col justify-center bg-white">
          <h2 className="text-2xl font-bold text-stone-900">Reset your password</h2>
          <p className="text-stone-500 text-xs mt-1 mb-8">
            Enter your email and current password, then choose a new one.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold tracking-wider text-stone-700 uppercase mb-1.5">
                EMAIL ADDRESS
              </label>
              <input
                type="email"
                placeholder="maria@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg border border-stone-200 text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#48634e]/20 focus:border-[#48634e] transition-all text-sm"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold tracking-wider text-stone-700 uppercase mb-1.5">
                CURRENT PASSWORD
              </label>
              <input
                type={showPasswords ? 'text' : 'password'}
                placeholder="••••••••••••"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg border border-stone-200 text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#48634e]/20 focus:border-[#48634e] transition-all text-sm"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold tracking-wider text-stone-700 uppercase mb-1.5">
                NEW PASSWORD
              </label>
              <input
                type={showPasswords ? 'text' : 'password'}
                placeholder="••••••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                onBlur={() => setTouched(true)}
                required
                className={`w-full px-4 py-3 rounded-lg border text-stone-800 focus:outline-none focus:ring-2 transition-all text-sm ${
                  touched && !newPasswordValid
                    ? 'border-red-300 focus:ring-red-100 focus:border-red-400'
                    : 'border-stone-200 focus:ring-[#48634e]/20 focus:border-[#48634e]'
                }`}
              />
              <p className={`text-[11px] mt-1.5 ${touched && !newPasswordValid ? 'text-red-500' : 'text-stone-400'}`}>
                {PASSWORD_RULE_MESSAGE}
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-bold tracking-wider text-stone-700 uppercase mb-1.5">
                CONFIRM NEW PASSWORD
              </label>
              <input
                type={showPasswords ? 'text' : 'password'}
                placeholder="••••••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onBlur={() => setTouched(true)}
                required
                className={`w-full px-4 py-3 rounded-lg border text-stone-800 focus:outline-none focus:ring-2 transition-all text-sm ${
                  touched && !passwordsMatch
                    ? 'border-red-300 focus:ring-red-100 focus:border-red-400'
                    : 'border-stone-200 focus:ring-[#48634e]/20 focus:border-[#48634e]'
                }`}
              />
              {touched && !passwordsMatch && (
                <p className="text-[11px] mt-1.5 text-red-500">Passwords don't match.</p>
              )}
            </div>

            <label className="flex items-center space-x-2 text-xs text-stone-500 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showPasswords}
                onChange={(e) => setShowPasswords(e.target.checked)}
                className="rounded accent-[#48634e]"
              />
              <span>Show passwords</span>
            </label>

            <button
              type="submit"
              disabled={submitting}
              className={`w-full font-bold py-3.5 px-4 rounded-xl text-xs uppercase tracking-wider shadow-sm transition-all mt-2 ${
                touched && !formValid
                  ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                  : 'bg-[#48634e] hover:bg-[#3b5240] text-white cursor-pointer'
              }`}
            >
              {submitting ? 'UPDATING...' : 'UPDATE PASSWORD'}
            </button>

            <Link
              to="/login"
              className="w-full block text-center text-xs font-bold text-stone-500 hover:text-stone-800 pt-2"
            >
              Back to sign in
            </Link>
          </form>
        </div>

      </div>
    </div>
  );
}

export default ResetPassword;
