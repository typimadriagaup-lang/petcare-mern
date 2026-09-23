import React, { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [resetLink, setResetLink] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await axios.post('http://localhost:5000/api/auth/forgot-password', { email });
      setSent(true);

      // This project doesn't send real emails yet, so the backend hands the
      // link straight back here for the demo. In production this response
      // would only contain a generic confirmation message.
      if (res.data.resetToken) {
        setResetLink(`${window.location.origin}/reset-password?token=${res.data.resetToken}`);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Something went wrong. Please try again.');
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
          {!sent ? (
            <>
              <h2 className="text-2xl font-bold text-stone-900">Reset your password</h2>
              <p className="text-stone-500 text-xs mt-1 mb-8">
                Enter the email on your account and we'll help you get back in.
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
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

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-[#48634e] hover:bg-[#3b5240] text-white font-bold py-3.5 px-4 rounded-xl text-xs uppercase tracking-wider shadow-sm transition-all mt-2 cursor-pointer disabled:opacity-60"
                >
                  {submitting ? 'SENDING...' : 'SEND RESET LINK'}
                </button>

                <Link
                  to="/login"
                  className="w-full block text-center text-xs font-bold text-stone-500 hover:text-stone-800 pt-2"
                >
                  Back to sign in
                </Link>
              </form>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-stone-900">Check your details</h2>
              <p className="text-stone-500 text-xs mt-1 mb-6">
                If an account exists for <span className="font-semibold text-stone-700">{email}</span>, a reset link has been created. It expires in 30 minutes.
              </p>

              {resetLink && (
                <div className="mb-6 p-4 bg-[#f9f9f8] border border-stone-200 rounded-xl">
                  <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-2">
                    Demo mode — no email service is set up yet, so here's your link:
                  </p>
                  <Link
                    to={resetLink.replace(window.location.origin, '')}
                    className="text-xs font-bold text-[#48634e] hover:underline break-all"
                  >
                    {resetLink}
                  </Link>
                </div>
              )}

              <Link
                to="/login"
                className="w-full block text-center bg-white border border-stone-200 hover:bg-stone-50 text-stone-800 font-bold py-3.5 px-4 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                BACK TO SIGN IN
              </Link>
            </>
          )}
        </div>

      </div>
    </div>
  );
}

export default ForgotPassword;
