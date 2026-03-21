'use client';
import { ReactNode } from 'react';

export function BottomSheet({ isOpen, onClose, children }: { isOpen: boolean; onClose: () => void; children: ReactNode }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] lg:hidden">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div 
        className="absolute bottom-0 left-0 right-0 bg-[var(--color-surface)] border-t border-[var(--color-border)] rounded-t-3xl p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom-full duration-300 ease-out"
        // Simple touch mock for swipe down to close
        onTouchStart={(e) => {
          const touchY = e.touches[0].clientY;
          const handleTouchEnd = (eEnd: TouchEvent) => {
            if (eEnd.changedTouches[0].clientY - touchY > 50) {
              onClose();
            }
            window.removeEventListener('touchend', handleTouchEnd);
          };
          window.addEventListener('touchend', handleTouchEnd);
        }}
      >
         <div className="w-12 h-1.5 bg-slate-700/80 rounded-full mx-auto mb-6 cursor-pointer touch-none" onClick={onClose}></div>
         {children}
      </div>
    </div>
  );
}
