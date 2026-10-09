import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate, useLocation, Link } from 'react-router-dom';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function Register() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const navigate = useNavigate();
  const location = useLocation();

  // OTP step. Login sends unverified users here with { verifyEmail } so they can finish verifying.
  const [otpEmail, setOtpEmail] = useState(location.state?.verifyEmail || '');
  const [otp, setOtp] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const otpInputRef = useRef(null);

  // Resend countdown
  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  useEffect(() => {
    if (otpEmail && otpInputRef.current) otpInputRef.current.focus();
  }, [otpEmail]);

  const passwordLongEnough = password.length >= 8;
  const passwordHasNumber = /\d/.test(password);
  const passwordValid = passwordLongEnough && passwordHasNumber;

  const handleRegister = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (!passwordValid) {
      setMessage({
        type: 'error',
        text: 'Password must be at least 8 characters and include at least one number.'
      });
      return;
    }

    setLoading(true);

    try {
      const res = await axios.post(`${API_BASE_URL}/api/auth/register`, {
        name: fullName,
        email,
        password,
      });

      // Account exists but is unverified — move on to the code entry step
      setOtpEmail(res.data.email || email.trim().toLowerCase());
      setOtp('');
      setCooldown(res.data.retryAfter || 60);
      setMessage({ type: 'success', text: res.data.message || 'We sent a 6-digit code to your email.' });
    } catch (err) {
      if (err.response?.data?.retryAfter) setCooldown(err.response.data.retryAfter);
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Registration failed. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (!/^\d{6}$/.test(otp)) {
      setMessage({ type: 'error', text: 'Enter the 6-digit code from your email.' });
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/api/auth/verify-email`, { email: otpEmail, otp });
      setMessage({ type: 'success', text: 'Email verified! Redirecting to login...' });
      setTimeout(() => navigate('/login'), 1200);
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Verification failed. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setMessage({ type: '', text: '' });
    try {
      const res = await axios.post(`${API_BASE_URL}/api/auth/resend-otp`, { email: otpEmail });
      setCooldown(res.data.retryAfter || 60);
      setOtp('');
      setMessage({ type: 'success', text: 'A new code has been sent to your email.' });
    } catch (err) {
      if (err.response?.data?.retryAfter) setCooldown(err.response.data.retryAfter);
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Could not resend the code. Please try again.'
      });
    }
  };

  const backToSignup = () => {
    setOtpEmail('');
    setOtp('');
    setMessage({ type: '', text: '' });
  };

  return (
    <div className="min-h-screen bg-[#f8f7f4] flex items-center justify-center p-4 w-full font-sans">
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
            PETCARE PORTAL
          </p>
        </div>

        {/* Right Side - Register Form */}
        <div className="p-8 md:p-12 flex flex-col justify-center bg-white">
          <h2 className="text-2xl font-bold text-stone-900">
            {otpEmail ? 'Verify your email' : 'Create your PetCare account'}
          </h2>
          <p className="text-stone-500 text-xs mt-1 mb-6">
            {otpEmail
              ? <>Enter the 6-digit code we sent to <span className="font-semibold text-stone-700">{otpEmail}</span></>
              : 'Set up your clinic profile to get started'}
          </p>

          {/* Toast / Inline Notification Alert */}
          {message.text && (
            <div className={`mb-4 p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between ${
              message.type === 'success' 
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              <span>{message.text}</span>
              <button 
                type="button" 
                onClick={() => setMessage({ type: '', text: '' })} 
                className="text-stone-400 hover:text-stone-600 font-bold ml-2"
              >
                ✕
              </button>
            </div>
          )}

          {otpEmail ? (
            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold tracking-wider text-stone-700 uppercase mb-1.5">
                  VERIFICATION CODE
                </label>
                <input
                  ref={otpInputRef}
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
                <p className="text-[11px] text-stone-400 mt-2">The code expires in 10 minutes.</p>
              </div>

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className={`w-full text-white font-bold py-3.5 px-4 rounded-xl text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer ${
                  loading || otp.length !== 6 ? 'bg-stone-400 cursor-not-allowed' : 'bg-[#48634e] hover:bg-[#3b5240]'
                }`}
              >
                {loading ? 'VERIFYING...' : 'VERIFY EMAIL'}
              </button>

              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={cooldown > 0}
                  className={`font-bold uppercase tracking-wider ${cooldown > 0 ? 'text-stone-400 cursor-not-allowed' : 'text-[#48634e] hover:opacity-80 cursor-pointer'}`}
                >
                  {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
                </button>
                <button
                  type="button"
                  onClick={backToSignup}
                  className="font-bold uppercase tracking-wider text-stone-500 hover:text-stone-800 cursor-pointer"
                >
                  Change email
                </button>
              </div>
            </form>
          ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold tracking-wider text-stone-700 uppercase mb-1.5">
                FULL NAME
              </label>
              <input
                type="text"
                placeholder="Alex Johnson"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                disabled={loading}
                className="w-full px-4 py-3 rounded-lg border border-stone-200 text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#48634e]/20 focus:border-[#48634e] transition-all text-sm disabled:bg-stone-50"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold tracking-wider text-stone-700 uppercase mb-1.5">
                EMAIL ADDRESS
              </label>
              <input
                type="email"
                placeholder="alex@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="w-full px-4 py-3 rounded-lg border border-stone-200 text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#48634e]/20 focus:border-[#48634e] transition-all text-sm disabled:bg-stone-50"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold tracking-wider text-stone-700 uppercase mb-1.5">
                PASSWORD
              </label>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  minLength={8}
                  className="w-full px-4 py-3 pr-16 rounded-lg border border-stone-200 text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#48634e]/20 focus:border-[#48634e] transition-all text-sm disabled:bg-stone-50"
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
                <li className={`text-[11px] font-medium flex items-center gap-1.5 ${passwordLongEnough ? 'text-[#48634e]' : 'text-stone-400'}`}>
                  <span>{passwordLongEnough ? '✓' : '•'}</span> At least 8 characters
                </li>
                <li className={`text-[11px] font-medium flex items-center gap-1.5 ${passwordHasNumber ? 'text-[#48634e]' : 'text-stone-400'}`}>
                  <span>{passwordHasNumber ? '✓' : '•'}</span> At least one number
                </li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full text-white font-bold py-3.5 px-4 rounded-xl text-xs uppercase tracking-wider shadow-sm transition-all mt-2 cursor-pointer ${
                loading ? 'bg-stone-400 cursor-not-allowed' : 'bg-[#48634e] hover:bg-[#3b5240]'
              }`}
            >
              {loading ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT'}
            </button>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-stone-200"></div>
              <span className="flex-shrink mx-4 text-[10px] font-bold text-stone-400 uppercase tracking-widest">OR</span>
              <div className="flex-grow border-t border-stone-200"></div>
            </div>

            <Link
              to="/login"
              className="w-full block text-center bg-white border border-stone-200 hover:bg-stone-50 text-stone-800 font-bold py-3.5 px-4 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer"
            >
              SIGN IN
            </Link>
          </form>
          )}
        </div>

      </div>
    </div>
  );
}

export default Register;