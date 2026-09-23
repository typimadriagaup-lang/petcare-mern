import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

function Register() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const passwordLongEnough = password.length >= 8;
  const passwordHasNumber = /\d/.test(password);
  const passwordValid = passwordLongEnough && passwordHasNumber;

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!passwordValid) {
      alert('Password must be at least 8 characters and include at least one number.');
      return;
    }

    try {
      await axios.post('http://localhost:5000/api/auth/register', {
        name: fullName,
        email,
        password,
      });
      alert('Account created successfully! Please sign in.');
      navigate('/login');
    } catch (err) {
      alert(err.response?.data?.message || 'Registration failed');
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
            PETCARE PORTAL
          </p>
        </div>

        {/* Right Side - Register Form */}
        <div className="p-8 md:p-12 flex flex-col justify-center bg-white">
          <h2 className="text-2xl font-bold text-stone-900">Create your PetCare account</h2>
          <p className="text-stone-500 text-xs mt-1 mb-6">Set up your clinic profile to get started</p>

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
                className="w-full px-4 py-3 rounded-lg border border-stone-200 text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#48634e]/20 focus:border-[#48634e] transition-all text-sm"
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
                className="w-full px-4 py-3 rounded-lg border border-stone-200 text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#48634e]/20 focus:border-[#48634e] transition-all text-sm"
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
                  minLength={8}
                  className="w-full px-4 py-3 pr-16 rounded-lg border border-stone-200 text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#48634e]/20 focus:border-[#48634e] transition-all text-sm"
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
              className="w-full bg-[#48634e] hover:bg-[#3b5240] text-white font-bold py-3.5 px-4 rounded-xl text-xs uppercase tracking-wider shadow-sm transition-all mt-2 cursor-pointer"
            >
              CREATE ACCOUNT
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
        </div>

      </div>
    </div>
  );
}

export default Register;