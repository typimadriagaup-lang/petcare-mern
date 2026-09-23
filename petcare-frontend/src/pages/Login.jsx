import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function Login({ onLoginSuccess, onNavigateToSignUp }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', { email, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));

      setSuccess('Login Successful!');
      if (onLoginSuccess) onLoginSuccess();

      // Short delay before navigating so the user sees the in-app success banner
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 700);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f7f4] flex items-center justify-center p-4 w-full">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-md overflow-hidden grid grid-cols-1 md:grid-cols-2 min-h-[520px]">
        
        {/* Left Side Banner with New Logo */}
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
          <h2 className="text-2xl font-bold text-stone-900">Sign in to PetCare</h2>
          <p className="text-stone-500 text-xs mt-1 mb-6">Enter your credentials to access your dashboard</p>

          {/* In-App Error Notification */}
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium text-center">
              {error}
            </div>
          )}

          {/* In-App Success Notification */}
          {success && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-medium text-center flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              {success}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
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
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-[11px] font-bold tracking-wider text-stone-700 uppercase">
                  PASSWORD
                </label>
                <a href="#forgot" className="text-xs font-medium text-stone-500 hover:text-stone-800 hover:underline">
                  Forgot password?
                </a>
              </div>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
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
            </div>

            <button
              type="submit"
              disabled={!!success}
              className="w-full bg-[#48634e] hover:bg-[#3b5240] text-white font-bold py-3.5 px-4 rounded-xl text-xs uppercase tracking-wider shadow-sm transition-all mt-2 cursor-pointer disabled:opacity-50"
            >
              SIGN IN
            </button>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-stone-200"></div>
              <span className="flex-shrink mx-4 text-[10px] font-bold text-stone-400 uppercase tracking-widest">OR</span>
              <div className="flex-grow border-t border-stone-200"></div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/register')}
              className="w-full bg-white border border-stone-200 hover:bg-stone-50 text-stone-800 font-bold py-3.5 px-4 rounded-xl text-xs uppercase tracking-wider transition-all text-center cursor-pointer"
            >
              CLINIC SIGN UP
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}

export default Login;