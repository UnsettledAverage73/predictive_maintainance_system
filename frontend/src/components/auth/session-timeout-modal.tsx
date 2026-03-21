'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { clearTokens } from '@/lib/auth/token-store';

const TIMEOUT_MINUTES = 14;
const COUNTDOWN_SECONDS = 60;
const INACTIVITY_MS = TIMEOUT_MINUTES * 60 * 1000;

export function SessionTimeoutModal() {
  const [showModal, setShowModal] = useState(false);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const router = useRouter();

  const handleIdle = useCallback(() => {
    setShowModal(true);
    setCountdown(COUNTDOWN_SECONDS);
  }, []);

  useEffect(() => {
    let idleTimer: NodeJS.Timeout;
    
    const resetTimer = () => {
      clearTimeout(idleTimer);
      if (!showModal) {
        idleTimer = setTimeout(handleIdle, INACTIVITY_MS);
      }
    };

    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart'];
    events.forEach(event => window.addEventListener(event, resetTimer));
    resetTimer();

    return () => {
      clearTimeout(idleTimer);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [showModal, handleIdle]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (showModal) {
      interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            clearTokens();
            router.push('/login');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [showModal, router]);

  const stayLoggedIn = async () => {
    try {
      const res = await fetch('/api/v1/auth/refresh', { method: 'POST' });
      if (res.ok) {
        setShowModal(false);
      } else {
        clearTokens();
        router.push('/login');
      }
    } catch {
      clearTokens();
      router.push('/login');
    }
  };

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-[400px] rounded-lg border border-slate-700 bg-slate-900 p-6 shadow-xl text-left">
        <h2 className="text-xl font-semibold text-white mb-2">Session Expiring Soon</h2>
        <p className="text-slate-400 text-sm mb-6">
          You have been inactive for a while. For your security, you will be logged out in{' '}
          <span className="text-teal-400 font-mono text-lg">{countdown}s</span>.
        </p>
        <div className="flex justify-end space-x-3">
          <button 
            onClick={() => { clearTokens(); router.push('/login'); }}
            className="px-4 py-2 rounded text-sm text-slate-300 hover:text-white transition-colors"
          >
            Log Out Now
          </button>
          <button 
            onClick={stayLoggedIn}
            className="px-4 py-2 rounded text-sm bg-teal-500 text-white hover:bg-teal-400 transition-colors"
          >
            Stay Logged In
          </button>
        </div>
      </div>
    </div>
  );
}
