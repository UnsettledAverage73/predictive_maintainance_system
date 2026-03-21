'use client';
import { useState, useRef, KeyboardEvent, ClipboardEvent } from 'react';

export function OTPInput({ length = 6, onComplete }: { length?: number; onComplete: (otp: string) => void }) {
  const [otp, setOtp] = useState<string[]>(Array(length).fill(''));
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    if (!val) return;
    const newOtp = [...otp];
    newOtp[index] = val.substring(val.length - 1);
    setOtp(newOtp);
    
    if (index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
    
    if (newOtp.join('').length === length) {
      onComplete(newOtp.join(''));
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        inputsRef.current[index - 1]?.focus();
        const newOtp = [...otp];
        newOtp[index - 1] = '';
        setOtp(newOtp);
      } else {
        const newOtp = [...otp];
        newOtp[index] = '';
        setOtp(newOtp);
      }
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain').replace(/[^0-9]/g, '').slice(0, length);
    if (!pastedData) return;
    const newOtp = [...otp];
    pastedData.split('').forEach((char, i) => {
      newOtp[i] = char;
    });
    setOtp(newOtp);
    if (pastedData.length === length) {
      inputsRef.current[length - 1]?.focus();
      onComplete(newOtp.join(''));
    } else {
      inputsRef.current[pastedData.length]?.focus();
    }
  };

  return (
    <div className="flex space-x-2 justify-center">
      {otp.map((value, index) => (
        <input
          key={index}
          ref={(el) => { inputsRef.current[index] = el; }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={value}
          onChange={(e) => handleChange(e, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          onPaste={handlePaste}
          className="w-12 h-14 text-center text-xl font-mono text-white bg-slate-900 border border-slate-700 rounded-md focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 transition-colors"
        />
      ))}
    </div>
  );
}
