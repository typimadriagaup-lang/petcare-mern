import React from 'react';
import { useNavigate } from 'react-router-dom';

function SignInConsent() {
  const navigate = useNavigate();

  const handleAccept = () => {
    // User agreed to privacy terms -> proceeding to Sign Up form
    localStorage.setItem('hasConsented', 'true');
    navigate('/register');
  };

  const handleDecline = () => {
    // User declined -> sending back to Home Page
    localStorage.removeItem('hasConsented');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#f1f5f2] flex flex-col justify-center items-center p-4 font-sans text-stone-800">
      <div className="bg-white rounded-3xl shadow-xl overflow-hidden w-full max-w-3xl flex flex-col md:flex-row border border-stone-100">
        
        {/* Left Branding Panel */}
        <div className="bg-[#e2ebe2] md:w-5/12 p-8 flex flex-col justify-between items-center text-center min-h-[300px] md:min-h-[460px]">
          <div />
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-[#48634e] rounded-2xl flex items-center justify-center text-white mb-4 shadow-sm">
              <svg className="w-9 h-9" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-5 1c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-5-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm.3 11.2c-.4-.2-.9-.2-1.3 0-1.7.9-3.7 1.4-5.7 1.4-1.2 0-2.4-.2-3.5-.6-.5-.2-1.1 0-1.3.5-.2.5 0 1.1.5 1.3 1.4.6 2.9.8 4.3.8 2.4 0 4.8-.6 6.9-1.7.5-.2.7-.8.5-1.3-.2-.3-.6-.5-1-.4z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-stone-900 tracking-tight">PetCare</h2>
          </div>
          <p className="text-[10px] font-bold text-stone-400 tracking-widest uppercase">PRODUCTION DESIGNED VET PORTAL</p>
        </div>

        {/* Right Content Panel */}
        <div className="md:w-7/12 p-8 flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold text-stone-400 block mb-1 uppercase tracking-wider">
              Step 1 of 2: Account Terms
            </span>
            <h1 className="text-2xl font-bold text-stone-900 mb-4">Your privacy matters</h1>
            <p className="text-xs text-stone-500 leading-relaxed mb-6">
              Before creating your account, please review how PetCare uses your data to support your pets' care.
            </p>

            <div className="space-y-4 mb-6">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-[#f9f9f8] border border-stone-200/60 rounded-xl text-[#48634e] flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-bold text-xs text-stone-900">Information We Collect</h4>
                  <p className="text-[11px] text-stone-400 mt-0.5">Contact details, pet profiles, appointment requests, and medical histories.</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="p-2 bg-[#f9f9f8] border border-stone-200/60 rounded-xl text-[#48634e] flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-bold text-xs text-stone-900">Data Protection</h4>
                  <p className="text-[11px] text-stone-400 mt-0.5">Used strictly to manage clinical visits and share necessary medical records with your veterinary care team.</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <p className="text-[10px] text-stone-400 leading-tight mb-4">
              By clicking Accept & Continue, you agree to our terms and can proceed with registration.
            </p>
            <div className="space-y-2">
              <button
                onClick={handleAccept}
                className="w-full py-3 bg-[#48634e] hover:bg-[#3b5240] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
              >
                ACCEPT & CONTINUE TO SIGN UP
              </button>
              <button
                onClick={handleDecline}
                className="w-full py-3 bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
              >
                DECLINE & GO BACK
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default SignInConsent;