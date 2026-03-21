'use client';
import { useState, useEffect } from 'react';

export function APIKeyReveal({ apiKey }: { apiKey: string }) {
  const [show, setShow] = useState(true);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);

  useEffect(() => {
    if (!show) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setShow(false);
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [show]);

  const handleCopy = () => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!show) {
    return (
      <div className="font-mono text-sm text-slate-400">
        {apiKey.substring(0, 8)}••••••••••••••••
      </div>
    );
  }

  return (
    <div className="relative bg-slate-950 border border-teal-500/30 rounded p-4 group">
      <div className="flex justify-between items-start mb-2">
        <span className="text-xs text-teal-400 font-semibold uppercase tracking-wider">New API Key Generated</span>
        <span className="text-xs text-slate-500">Hides in {timeLeft}s</span>
      </div>
      <div className="font-mono text-sm text-white break-all pr-12">
        {apiKey}
      </div>
      <button 
        onClick={handleCopy}
        className="absolute bottom-4 right-4 p-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
        title="Copy to clipboard"
      >
        {copied ? (
          <svg className="w-4 h-4 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
        )}
      </button>
    </div>
  );
}
