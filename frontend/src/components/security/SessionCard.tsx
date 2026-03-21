'use client';
import { useState } from 'react';

export interface Session {
  id: string;
  device: string;
  ip: string;
  location: string;
  lastActive: string;
  started: string;
  isCurrent?: boolean;
}

export function SessionCard({ session, onRevoke }: { session: Session; onRevoke: (id: string) => void }) {
  const [isRevoking, setIsRevoking] = useState(false);

  const handleRevoke = async () => {
    setIsRevoking(true);
    await onRevoke(session.id);
    setIsRevoking(false);
  };

  return (
    <div className={`p-4 rounded-lg border flex items-center justify-between transition-colors ${session.isCurrent ? 'bg-teal-500/5 border-teal-500/20' : 'bg-[var(--color-surface)] border-[var(--color-border)]'}`}>
      <div className="flex items-center space-x-4">
        <div className={`p-3 rounded-full ${session.isCurrent ? 'bg-teal-500/20 text-teal-400' : 'bg-slate-800 text-slate-400'}`}>
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
          </svg>
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-sm font-semibold text-[var(--color-foreground)]">{session.device}</h3>
            {session.isCurrent && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-500/20 text-teal-400 uppercase tracking-wide">This Device</span>}
          </div>
          <div className="flex items-center space-x-3 text-xs text-[var(--color-muted)] mt-1">
            <span className="flex items-center"><svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>{session.location}</span>
            <span>•</span>
            <span className="font-mono">{session.ip}</span>
            <span>•</span>
            <span>Active: {session.lastActive}</span>
          </div>
        </div>
      </div>
      <div>
        <button 
          onClick={handleRevoke}
          disabled={isRevoking || session.isCurrent}
          className={`px-3 py-1.5 rounded text-sm transition-colors ${
            session.isCurrent 
              ? 'opacity-0 cursor-default' 
              : 'text-[var(--color-destructive)] hover:bg-red-500/10'
          }`}
        >
          {isRevoking ? 'Revoking...' : 'Revoke'}
        </button>
      </div>
    </div>
  );
}
