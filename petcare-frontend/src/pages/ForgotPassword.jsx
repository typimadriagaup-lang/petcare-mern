import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Same rule as sign-up: 8+ characters, at least one number, no spaces
const hasLength = (p) => p.length >= 8;
const hasNumber = (p) => /\d/.test(p);

const inputCls =
  'w-full px-4 py-3 rounded-lg border border-stone-200 text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#48634e]/20 focus:border-[#48634e] transition-all text-sm disabled:bg-stone-50';
const labelCls = 'block text-[11px] font-bold tracking-wider text-stone-700 uppercase mb-1.5';

// Step 1: ask for the account email  ->  Step 2: enter the emailed code + a new password
function ForgotPassword() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [message, setMessage] = useState({ type: '', text: '' });
  const otpRef = useRef(null);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  useEffect(() => {
    if (step === 2 && otpRef.current) otpRef.current.focus();
  }, [step]);

  const errorText = (err, fallback) =>
    err.response?.data?.message ||
    (err.response ? `${fallback} (error ${err.response.status}).` : 'Cannot reach the server. Make sure the backend is running.');

  const sendCode = async (e) => {
    if (e) e.preventDefault();
    setMessage({ type: '', text: '' });
    setLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const res = await axios.post(`${API_URL}/api/auth/forgot-password`, { email: cleanEmail });
      setEmail(cleanEmail);
      setCooldown(res.data.retryAfter || 60);
      setOtp('');
      setStep(2);
      setMessage({ type: 'success', text: res.data.message });
    } catch (err) {
      setMessage({ type: 'error', text: errorText(err, 'Could not send the code') });
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (cooldown > 0) return;
    await sendCode();
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (!/^\d{6}$/.test(otp)) {
      setMessage({ type: 'error', text: 'Enter the 6-digit code from your email.' });
      return;
    }
    if (!hasLength(newPassword) || !hasNumber(newPassword)) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters and include at least one number.' });
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_URL}/api/auth/reset-password`, { email, otp, newPassword });
      setMessage({ type: 'success', text: 'Password updated! Redirecting to sign in...' });
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setMessage({ type: 'error', text: errorText(err, 'Could not reset the password') });
    } finally {
      setLoading(false);
    }
  };

  const noSpaces = (value) => value.replace(/\s/g, '');
  const blockSpace = (e) => { if (e.key === ' ') e.preventDefault(); };

  return (
    <div className="min-h-screen bg-[#f8f7f4] flex items-center justify-center p-4 w-full font-sans">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-md overflow-hidden grid grid-cols-1 md:grid-cols-2 min-h-[520px]">

        {/* Left Side Banner */}
        <div className="bg-[#ebf0eb] p-8 flex flex-col justify-between items-center text-center">
          <div />
          <img src="/petcarelogo.png" alt="PetCare Logo" className="w-56 h-auto object-contain mb-2 rounded-xl" />
          <p className="text-[11px] font-bold tracking-widest text-stone-500 uppercase pb-2">PETCARE PORTAL</p>
        </div>

        {/* Right Side */}
        <div className="p-8 md:p-12 flex flex-col justify-center bg-white">
          <h2 className="text-2xl font-bold text-stone-900">Reset your password</h2>
          <p className="text-stone-500 text-xs mt-1 mb-6">
            {step === 1
              ? "Enter the email on your account and we'll send you a 6-digit code."
              : <>Enter the code we sent to <span className="font-semibold text-stone-700">{email}</span> and choose a new password.</>}
          </p>

          {message.text && (
            <div className={`mb-4 p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              <span>{message.text}</span>
              <button type="button" onClick={() => setMessage({ type: '', text: '' })} className="text-stone-400 hover:text-stone-600 font-bold ml-2">✕</button>
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={sendCode} className="space-y-4">
              <div>
                <label className={labelCls}>EMAIL ADDRESS</label>
                <input
                  type="email"
                  placeholder="alex@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className={inputCls}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className={`w-full text-white font-bold py-3.5 px-4 rounded-xl text-xs uppercase tracking-wider shadow-sm transition-all ${
                  loading ? 'bg-stone-400 cursor-not-allowed' : 'bg-[#48634e] hover:bg-[#3b5240] cursor-pointer'
                }`}
              >
                {loading ? 'SENDING...' : 'SEND CODE'}
              </button>
              <Link
                to="/login"
                className="w-full block text-center bg-white border border-stone-200 hover:bg-stone-50 text-stone-800 font-bold py-3.5 px-4 rounded-xl text-xs uppercase tracking-wider transition-all"
              >
                BACK TO SIGN IN
              </Link>
            </form>
          ) : (
            <form onSubmit={resetPassword} className="space-y-4">
              <div>
                <label className={labelCls}>VERIFICATION CODE</label>
                <input
                  ref={otpRef}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  disabled={loading}
                  className="w-full px-4 py-3 rounded-lg border border-stone-200 text-stone-800 text-center text-2xl font-bold tracking-[0.5em] placeholder-stone-300 focus:outline-none focus:ring-2 focus:ring-[#48634e]/20 focus:border-[#48634e] transition-all disabled:bg-stone-50"
                />
                <p className="text-[11px] text-stone-400 mt-2">The code expires in 10 minutes. Check your spam folder if you don&apos;t see it.</p>
              </div>

              <div>
                <label className={labelCls}>NEW PASSWORD</label>
                <div className="relative flex items-center">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(noSpaces(e.target.value))}
                    onKeyDown={blockSpace}
                    disabled={loading}
                    className={`${inputCls} pr-16`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 text-xs font-bold text-[#48634e] hover:opacity-80 transition-opacity uppercase tracking-wider"
                  >
                    {showPassword ? 'HIDE' : 'SHOW'}
                  </button>
                </div>
                <ul className="mt-2 space-y-1">
                  <li className={`text-[11px] font-medium flex items-center gap-1.5 ${hasLength(newPassword) ? 'text-[#48634e]' : 'text-stone-400'}`}>
                    <span>{hasLength(newPassword) ? '✓' : '•'}</span> At least 8 characters
                  </li>
                  <li className={`text-[11px] font-medium flex items-center gap-1.5 ${hasNumber(newPassword) ? 'text-[#48634e]' : 'text-stone-400'}`}>
                    <span>{hasNumber(newPassword) ? '✓' : '•'}</span> At least one number
                  </li>
                </ul>
              </div>

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className={`w-full text-white font-bold py-3.5 px-4 rounded-xl text-xs uppercase tracking-wider shadow-sm transition-all ${
                  loading || otp.length !== 6 ? 'bg-stone-400 cursor-not-allowed' : 'bg-[#48634e] hover:bg-[#3b5240] cursor-pointer'
                }`}
              >
                {loading ? 'UPDATING...' : 'RESET PASSWORD'}
              </button>

              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={resend}
                  disabled={cooldown > 0 || loading}
                  className={`font-bold uppercase tracking-wider ${cooldown > 0 ? 'text-stone-400 cursor-not-allowed' : 'text-[#48634e] hover:opacity-80 cursor-pointer'}`}
                >
                  {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
                </button>
                <button
                  type="button"
                  onClick={() => { setStep(1); setMessage({ type: '', text: '' }); }}
                  className="font-bold uppercase tracking-wider text-stone-500 hover:text-stone-800 cursor-pointer"
                >
                  Change email
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
