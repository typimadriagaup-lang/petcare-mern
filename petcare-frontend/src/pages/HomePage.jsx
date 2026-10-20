import React from 'react';
import { useNavigate } from 'react-router-dom';

function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="bg-[#f1f5f2] min-h-screen font-sans text-stone-900 selection:bg-[#ebf0eb] selection:text-[#48634e]">
      
      {/* Navigation Bar */}
      <nav className="max-w-7xl mx-auto px-6 md:px-12 py-6 flex items-center justify-between">
        {/* Logo */}
        <div 
          onClick={() => navigate('/')}
          className="flex items-center space-x-3 cursor-pointer group"
        >
          <img 
            src="/petcarelogo.png" 
            alt="PetCare Logo" 
            className="w-10 h-10 object-contain rounded-2xl shadow-sm"
            onError={(e) => {
              e.target.onerror = null;
              e.target.style.display = 'none';
            }}
          />
          <span className="text-xl font-black tracking-tight text-stone-900">PetCare</span>
        </div>

        {/* Nav Links */}
        <div className="hidden md:flex items-center space-x-8 text-sm font-medium text-stone-600">
          <button onClick={() => navigate('/')} className="text-stone-900 font-bold hover:text-[#48634e] transition-colors cursor-pointer">Home</button>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/login')}
            className="px-5 py-2.5 bg-[#48634e] hover:bg-[#3b5240] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm hover:shadow"
          >
            Login / Sign Up
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 md:px-12 pt-8 pb-16 md:pt-16 md:pb-24 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        
        {/* Left Hero Content */}
        <div className="lg:col-span-6 space-y-6">
          <div className="inline-flex items-center space-x-2 px-3 py-1 bg-[#e2ebe2] text-[#48634e] rounded-full text-xs font-bold uppercase tracking-wider">
            <span>✨ Healthier Pets, Happier Lives</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-black text-stone-900 tracking-tight leading-[1.1]">
            Your Pet's Health <br />
            <span className="text-[#48634e]">Our Priority</span>
          </h1>

          <p className="text-stone-600 text-base md:text-lg leading-relaxed max-w-xl">
            PetCare is a centralized multi-clinic platform that helps pet owners manage their pet's health records, vaccinations, appointments, and more — all in one place.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 pt-4">
            <button
              onClick={() => navigate('/consent')}
              className="px-8 py-4 bg-[#48634e] hover:bg-[#3b5240] text-white font-bold text-xs uppercase tracking-widest rounded-2xl transition-all cursor-pointer shadow-md hover:shadow-lg text-center"
            >
              Get Started →
            </button>

            <div className="inline-flex items-center justify-center space-x-2 px-4 py-3 bg-white rounded-2xl border border-stone-100 shadow-sm text-xs font-bold text-[#48634e]">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="uppercase tracking-wider">Open Daily</span>
              <span className="text-stone-600 font-semibold normal-case tracking-normal">8:00 AM – 5:00 PM</span>
            </div>
          </div>
        </div>

        {/* Right Hero Image Container */}
        <div className="lg:col-span-6 relative flex justify-center">
          <div className="relative w-full max-w-lg aspect-[4/3] bg-gradient-to-br from-[#d4e2d4] to-[#e4ede4] rounded-[3rem] overflow-hidden shadow-xl border-4 border-white flex flex-col items-center justify-center p-4">
            <img 
              src="/catanddog.png" 
              alt="Cat and Dog" 
              className="w-full h-full object-cover rounded-[2.5rem]"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'https://placehold.co/600x450/dce6dc/48634e?text=Cat+and+Dog';
              }}
            />

            {/* Floating decorative badge */}
            <div className="absolute top-6 right-6 bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl shadow-lg border border-stone-100 flex items-center space-x-2 text-xs font-bold text-[#48634e]">
              <span>💚</span>
              <span>Trusted Veterinary Care</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid Section */}
      <section id="services" className="max-w-7xl mx-auto px-6 md:px-12 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          <div className="bg-white/90 backdrop-blur-sm p-8 rounded-3xl border border-emerald-100/50 shadow-sm hover:shadow-md transition-all group">
            <div className="w-12 h-12 bg-[#e2ebe2] text-[#48634e] rounded-2xl flex items-center justify-center mb-6 group-hover:bg-[#48634e] group-hover:text-white transition-all text-xl">
              📅
            </div>
            <h3 className="font-bold text-lg text-stone-900 mb-2">Book Appointments</h3>
            <p className="text-sm text-stone-500 leading-relaxed">
              Schedule and edit trusted veterinary clinics easily online.
            </p>
          </div>

          <div className="bg-white/90 backdrop-blur-sm p-8 rounded-3xl border border-emerald-100/50 shadow-sm hover:shadow-md transition-all group">
            <div className="w-12 h-12 bg-[#e2ebe2] text-[#48634e] rounded-2xl flex items-center justify-center mb-6 group-hover:bg-[#48634e] group-hover:text-white transition-all text-xl">
              📋
            </div>
            <h3 className="font-bold text-lg text-stone-900 mb-2">Track Health Records</h3>
            <p className="text-sm text-stone-500 leading-relaxed">
              Keep all your pet's medical history and checkups in one place.
            </p>
          </div>

          <div className="bg-white/90 backdrop-blur-sm p-8 rounded-3xl border border-emerald-100/50 shadow-sm hover:shadow-md transition-all group">
            <div className="w-12 h-12 bg-[#e2ebe2] text-[#48634e] rounded-2xl flex items-center justify-center mb-6 group-hover:bg-[#48634e] group-hover:text-white transition-all text-xl">
              🔔
            </div>
            <h3 className="font-bold text-lg text-stone-900 mb-2">Vaccination Reminders</h3>
            <p className="text-sm text-stone-500 leading-relaxed">
              Never miss important vaccination and medication reminders again.
            </p>
          </div>

          <div className="bg-white/90 backdrop-blur-sm p-8 rounded-3xl border border-emerald-100/50 shadow-sm hover:shadow-md transition-all group">
            <div className="w-12 h-12 bg-[#e2ebe2] text-[#48634e] rounded-2xl flex items-center justify-center mb-6 group-hover:bg-[#48634e] group-hover:text-white transition-all text-xl">
              🏥
            </div>
            <h3 className="font-bold text-lg text-stone-900 mb-2">Multi-Clinic Access</h3>
            <p className="text-sm text-stone-500 leading-relaxed">
              Manage your pet's care seamlessly across multiple partnered clinics.
            </p>
          </div>

        </div>
      </section>

      {/* Why Choose PetCare Section */}
      <section className="max-w-7xl mx-auto px-6 md:px-12 py-16 md:py-24 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        
        <div className="lg:col-span-5">
          <div className="bg-white p-6 rounded-[2.5rem] border border-stone-100 shadow-sm relative flex flex-col items-center text-center">
            <div className="w-full h-64 bg-[#e2ebe2] rounded-3xl overflow-hidden flex items-center justify-center">
              <img 
                src="/cat.png" 
                alt="Pet Care Cat" 
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=600';
                }}
              />
            </div>
            <div className="mt-4 bg-[#e2ebe2] text-[#48634e] p-4 rounded-2xl shadow-sm border border-white flex items-center space-x-3 w-full justify-center">
              <span className="text-2xl">🌟</span>
              <div className="text-left">
                <p className="text-[10px] font-extrabold uppercase tracking-wider">Dedicated Platform</p>
                <p className="text-sm font-bold">For Happy Pets</p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 space-y-6">
          <div>
            <span className="text-xs font-bold text-[#48634e] uppercase tracking-wider">Why PetCare?</span>
            <h2 className="text-3xl md:text-4xl font-black text-stone-900 mt-2">
              Because they're more than just pets.
            </h2>
            <p className="text-stone-600 text-base mt-3 leading-relaxed">
              We make pet care simpler, safer, and more organized — so you can spend less time worrying and more time with the ones you love.
            </p>
          </div>
        </div>

      </section>

      {/* Footer */}
      <footer className="border-t border-emerald-100/80 bg-white/60 py-8">
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img 
              src="/petcarelogo.png" 
              alt="PetCare Logo" 
              className="w-8 h-8 object-contain rounded-xl shadow-sm"
              onError={(e) => {
                e.target.onerror = null;
                e.target.style.display = 'none';
              }}
            />
            <span className="text-lg font-bold text-stone-900">PetCare Platform</span>
          </div>
          <p className="text-xs font-semibold text-stone-600">
            <span className="text-[#48634e] font-bold uppercase tracking-wider">Open Daily</span> · 8:00 AM – 5:00 PM
          </p>
        </div>
      </footer>

    </div>
  );
}

export default HomePage;