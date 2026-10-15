import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function SignOutConfirmation({ onSignOut, onCancel }) {
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      if (onSignOut) {
        await onSignOut();
      } else {
        localStorage.removeItem('token');
        navigate('/login');
      }
    } catch (err) {
      console.error('Error signing out:', err);
    } finally {
      setSigningOut(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f7f4] flex flex-col justify-center items-center p-4 font-sans text-stone-800">
      <div className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3 self-start max-w-3xl mx-auto w-full">
        PetCare sign-out confirmation
      </div>

      <div className="bg-white rounded-3xl shadow-xl overflow-hidden w-full max-w-3xl flex flex-col md:flex-row border border-stone-100">
        {/* Left Branding Panel */}
        <div className="bg-[#ebf0eb] md:w-5/12 p-8 flex flex-col justify-between items-center text-center min-h-[280px] md:min-h-[420px]">
          <div></div>
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-[#48634e] rounded-2xl flex items-center justify-center text-white mb-4 shadow-sm">
              <svg className="w-9 h-9" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-5 1c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-5-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm.3 11.2c-.4-.2-.9-.2-1.3 0-1.7.9-3.7 1.4-5.7 1.4-1.2 0-2.4-.2-3.5-.6-.5-.2-1.1 0-1.3.5-.2.5 0 1.1.5 1.3 1.4.6 2.9.8 4.3.8 2.4 0 4.8-.6 6.9-1.7.5-.2.7-.8.5-1.3-.2-.3-.6-.5-1-.4z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-stone-900 tracking-tight">PetCare</h2>
          </div>
          <p className="text-[10px] font-bold text-stone-400 tracking-widest uppercase">
            PRODUCTION DESIGNED VET PORTAL
          </p>
        </div>

        {/* Right Content Form */}
        <div className="md:w-7/12 p-8 flex flex-col justify-between">
          <div>
            <div className="w-9 h-9 rounded-full bg-[#fef3c7] text-[#d97706] flex items-center justify-center mb-4">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-stone-900 mb-2">Are you sure you want to sign out?</h1>
            <p className="text-xs text-stone-400 leading-relaxed mb-6">
              Signing out will end your current session and remove access to your pets' information until you sign in again.
            </p>

            <div className="p-4 bg-[#f9f9f8] border border-stone-200/60 rounded-2xl flex items-start space-x-3 mb-6">
              <svg className="w-4 h-4 text-stone-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <p className="text-[11px] text-stone-500 leading-snug">
                You are currently signed in. Choose Cancel to stay signed in, or Sign Out to end your session.
              </p>
            </div>
          </div>

          <div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <button
                type="button"
                onClick={handleCancel}
                className="py-3 bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer text-center"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                disabled={signingOut}
                className="py-3 bg-[#48634e] hover:bg-[#3b5240] disabled:opacity-60 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer text-center"
              >
                {signingOut ? 'SIGNING OUT…' : 'SIGN OUT'}
              </button>
            </div>

            <p className="text-[10px] text-stone-400 text-center">
              Using a shared device? Choose Sign Out to end your session before closing this window.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SignOutConfirmation;