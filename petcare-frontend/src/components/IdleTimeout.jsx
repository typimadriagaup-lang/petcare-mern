import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

// Signs every account out after 5 minutes without activity.
// A warning with a countdown appears for the last 60 seconds.
export const IDLE_LIMIT_MS = 5 * 60 * 1000;
const WARN_MS = 60 * 1000;
const ACTIVITY_KEY = 'petcare:lastActivity'; // shared between tabs through localStorage

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click', 'wheel'];

function IdleTimeout() {
  const navigate = useNavigate();
  const [secondsLeft, setSecondsLeft] = useState(null); // null = no warning showing
  const warningRef = useRef(false);
  const lastWriteRef = useRef(0);

  useEffect(() => {
    const now = () => Date.now();
    const readLast = () => {
      try { return Number(localStorage.getItem(ACTIVITY_KEY)) || now(); } catch { return now(); }
    };
    const writeLast = (t) => { try { localStorage.setItem(ACTIVITY_KEY, String(t)); } catch { /* ignore */ } };

    const signOut = (reason) => {
      try {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem(ACTIVITY_KEY);
      } catch { /* ignore */ }
      window.dispatchEvent(new Event('userUpdated'));
      warningRef.current = false;
      setSecondsLeft(null);
      navigate('/login', { replace: true, state: { reason } });
    };

    writeLast(now());

    // Any real activity pushes the deadline back (at most one write per second).
    // While the warning is showing, only the "Stay signed in" button counts.
    const onActivity = () => {
      if (warningRef.current) return;
      const t = now();
      if (t - lastWriteRef.current < 1000) return;
      lastWriteRef.current = t;
      writeLast(t);
    };
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));

    // Checks the clock every second. Using timestamps (not a countdown) means a
    // sleeping laptop or a throttled background tab still signs out on time.
    const timer = setInterval(() => {
      if (!localStorage.getItem('token')) return;
      const idle = now() - readLast();
      if (idle >= IDLE_LIMIT_MS) {
        signOut('idle');
      } else if (idle >= IDLE_LIMIT_MS - WARN_MS) {
        warningRef.current = true;
        setSecondsLeft(Math.ceil((IDLE_LIMIT_MS - idle) / 1000));
      } else if (warningRef.current) {
        // activity in another tab cancelled the warning
        warningRef.current = false;
        setSecondsLeft(null);
      }
    }, 1000);

    // Signed out in another tab -> follow along
    const onStorage = (e) => {
      if (e.key === 'token' && !e.newValue) {
        warningRef.current = false;
        setSecondsLeft(null);
        navigate('/login', { replace: true, state: { reason: 'idle' } });
      }
    };
    window.addEventListener('storage', onStorage);

    // An expired or rejected login (HTTP 401) or a disabled account sends the user to sign in
    const interceptor = axios.interceptors.response.use(
      (res) => res,
      (err) => {
        const status = err.response?.status;
        const msg = String(err.response?.data?.message || '');
        if (localStorage.getItem('token')) {
          if (status === 401) signOut('expired');
          else if (status === 403 && /disabled/i.test(msg)) signOut('disabled');
          else if (status === 403 && err.response?.data?.frozen) signOut('frozen');
        }
        return Promise.reject(err);
      }
    );

    return () => {
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, onActivity));
      window.removeEventListener('storage', onStorage);
      clearInterval(timer);
      axios.interceptors.response.eject(interceptor);
    };
  }, [navigate]);

  const stay = () => {
    try { localStorage.setItem(ACTIVITY_KEY, String(Date.now())); } catch { /* ignore */ }
    lastWriteRef.current = Date.now();
    warningRef.current = false;
    setSecondsLeft(null);
  };

  const signOutNow = () => {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem(ACTIVITY_KEY);
    } catch { /* ignore */ }
    window.dispatchEvent(new Event('userUpdated'));
    warningRef.current = false;
    setSecondsLeft(null);
    navigate('/login', { replace: true });
  };

  if (secondsLeft === null) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4" role="alertdialog" aria-modal="true" aria-labelledby="idle-title">
      <div className="bg-white rounded-3xl shadow-xl p-6 w-full max-w-sm text-center font-sans">
        <h3 id="idle-title" className="text-base font-bold text-stone-900">Still there?</h3>
        <p className="text-xs text-stone-500 mt-2">
          For your security you&apos;ll be signed out because of inactivity in
        </p>
        <div className="text-4xl font-extrabold text-[#48634e] my-4">{secondsLeft}s</div>
        <div className="flex gap-3">
          <button onClick={stay} className="flex-1 py-2.5 bg-[#48634e] hover:bg-[#3b5240] text-white font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer">
            Stay signed in
          </button>
          <button onClick={signOutNow} className="flex-1 py-2.5 bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer">
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

export default IdleTimeout;
