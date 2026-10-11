import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate, useLocation, Navigate, Link } from 'react-router-dom';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Step after "Create account": the user types the 6-digit code that was
// emailed to the address they registered with.
function VerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || '';

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(location.state?.retryAfter || 0);
  const [message, setMessage] = useState(
    location.state?.fresh ? { type: 'success', text: `We sent a 6-digit code to ${email}.` } : { type: '', text: '' }
  );
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // Opened directly with no email to verify -> back to sign up
  if (!email) return <Navigate to="/register" replace />;

  const handleVerify = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (!/^\d{6}$/.test(otp)) {
      setMessage({ type: 'error', text: 'Enter the 6-digit code from your email.' });
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/api/auth/verify-email`, { email, otp });
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
      const res = await axios.post(`${API_BASE_URL}/api/auth/resend-otp`, { email });
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

  return (
    <div className="min-h-screen bg-[#f8f7f4] flex items-center justify-center p-4 w-full font-sans">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-md overflow-hidden grid grid-cols-1 md:grid-cols-2 min-h-[520px]">

        {/* Left Side Banner */}
        <div className="bg-[#ebf0eb] p-8 flex flex-col justify-between items-center text-center">
          <div />
          <img src="/petcarelogo.png" alt="PetCare Logo" className="w-56 h-auto object-contain mb-2 rounded-xl" />
          <p className="text-[11px] font-bold tracking-widest text-stone-500 uppercase pb-2">PETCARE PORTAL</p>
        </div>

        {/* Right Side - OTP form */}
        <div className="p-8 md:p-12 flex flex-col justify-center bg-white">
          <h2 className="text-2xl font-bold text-stone-900">Verify your email</h2>
          <p className="text-stone-500 text-xs mt-1 mb-6">
            Enter the 6-digit code we sent to <span className="font-semibold text-stone-700">{email}</span>
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

          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold tracking-wider text-stone-700 uppercase mb-1.5">
                VERIFICATION CODE
              </label>
              <input
                ref={inputRef}
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

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className={`w-full text-white font-bold py-3.5 px-4 rounded-xl text-xs uppercase tracking-wider shadow-sm transition-all ${
                loading || otp.length !== 6 ? 'bg-stone-400 cursor-not-allowed' : 'bg-[#48634e] hover:bg-[#3b5240] cursor-pointer'
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
              <Link to="/register" className="font-bold uppercase tracking-wider text-stone-500 hover:text-stone-800">
                Change email
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default VerifyEmail;
