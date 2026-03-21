'use client';
import { useState } from 'react';

interface ConfirmPhraseModalProps {
  phrase: string;
  onConfirm: () => void;
  onCancel: () => void;
  action: string;
}

export function ConfirmPhraseModal({ phrase, onConfirm, onCancel, action }: ConfirmPhraseModalProps) {
  const [input, setInput] = useState('');

  const isMatch = input === phrase;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-[450px] rounded-lg border border-red-900/50 bg-slate-900 shadow-2xl overflow-hidden text-left">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center space-x-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-900/30 text-red-500">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white">Confirm {action}</h2>
          </div>
          <p className="text-sm text-slate-400 mt-2">
            This action is destructive and cannot be undone. Please type <span className="font-mono text-red-300 font-bold px-1.5 py-0.5 bg-red-950 rounded select-all">{phrase}</span> to confirm.
          </p>
        </div>

        <div className="p-6">
          <div className="mb-4">
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
              Type "{phrase}"
            </label>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all font-mono selection:bg-red-500/30"
              placeholder={phrase}
              autoComplete="off"
              spellCheck="false"
            />
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-md text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={!isMatch}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                isMatch 
                  ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/20' 
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              {action}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
