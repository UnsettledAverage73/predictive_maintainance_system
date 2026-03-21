'use client';
import { useState, useEffect } from 'react';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { OTPInput } from '@/components/notifications/OTPInput';

export default function NotificationsPage() {
  const [phone, setPhone] = useState<string | undefined>('');
  const [smsState, setSmsState] = useState<'idle' | 'entering' | 'verifying' | 'confirmed'>('idle');
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSendCode = () => {
    if (phone && phone.length > 5) {
      setSmsState('verifying');
      setCountdown(60);
    }
  };

  const verifyCode = (code: string) => {
    if (code.length === 6) {
        setTimeout(() => setSmsState('confirmed'), 500);
    }
  };

  return (
    <div className="max-w-[720px] mx-auto p-6 space-y-10">
      <div>
        <h1 className="text-3xl font-bold mb-2">Notification Settings</h1>
        <p className="text-[var(--color-muted)]">Manage how you receive alerts and updates.</p>
      </div>

      <section className="space-y-6">
        <div className="flex items-center space-x-3 pb-4 border-b border-[var(--color-border)]">
          <svg className="w-6 h-6 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
          <h2 className="text-xl font-semibold">SMS Alerts</h2>
        </div>

        {smsState === 'idle' && (
          <div className="flex items-center justify-between p-4 bg-amber-500/5 border border-amber-500/20 rounded-lg">
            <div className="flex items-center space-x-3 text-amber-500">
               <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
               <span className="font-medium">No SMS number configured</span>
            </div>
            <button onClick={() => setSmsState('entering')} className="px-4 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded text-sm hover:brightness-110 transition-all font-medium">Update Number</button>
          </div>
        )}

        {smsState === 'entering' && (
          <div className="p-6 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg space-y-4">
            <label className="block text-sm font-medium mb-1">Enter Mobile Number</label>
            <div className="phone-wrapper bg-slate-900 border border-[var(--color-border)] rounded-md px-3 py-2 focus-within:border-[var(--color-primary)] transition-colors">
              <PhoneInput
                international
                defaultCountry="US"
                value={phone}
                onChange={setPhone}
                className="w-full text-white bg-transparent outline-none border-none py-1"
                style={{ "--PhoneInputCountryFlag-borderColor": "transparent" } as React.CSSProperties}
              />
            </div>
            {phone && <p className="text-sm text-[var(--color-muted)]">Preview: {phone}</p>}
            <div className="flex justify-end space-x-3 pt-2">
              <button onClick={() => setSmsState('idle')} className="px-4 py-2 text-sm text-[var(--color-muted)] hover:text-white">Cancel</button>
              <button onClick={handleSendCode} disabled={!phone || phone.length < 6} className="px-4 py-2 text-sm bg-[var(--color-primary)] text-black rounded font-semibold disabled:opacity-50 disabled:cursor-not-allowed">Send Verification Code</button>
            </div>
          </div>
        )}

        {smsState === 'verifying' && (
          <div className="p-6 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg space-y-6 text-center">
             <h3 className="font-medium text-lg">Verify your number</h3>
             <p className="text-sm text-[var(--color-muted)]">We sent a 6-digit code to <span className="text-white font-mono">{phone}</span></p>
             <OTPInput length={6} onComplete={verifyCode} />
             <div className="text-sm text-[var(--color-muted)] pt-2">
               {countdown > 0 ? (
                 <span>Resend code in <span className="text-[var(--color-primary)] font-mono">{countdown}s</span></span>
               ) : (
                 <button className="text-[var(--color-primary)] hover:underline" onClick={handleSendCode}>Resend Code</button>
               )}
             </div>
          </div>
        )}

        {smsState === 'confirmed' && (
          <div className="flex items-center justify-between p-4 bg-green-500/5 border border-green-500/20 rounded-lg">
            <div className="flex items-center space-x-3 text-green-500">
               <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
               <span className="font-medium">Number verified and saved</span>
               <span className="text-sm font-mono text-white ml-2 opacity-80">{phone}</span>
            </div>
            <div className="flex items-center space-x-4">
              <button className="text-sm text-[var(--color-primary)] hover:underline whitespace-nowrap">Send test alert</button>
              <button onClick={() => setSmsState('entering')} className="text-sm text-[var(--color-muted)] hover:text-white">Edit</button>
            </div>
          </div>
        )}
      </section>

      <section className="space-y-6">
        <div className="flex items-center space-x-3 pb-4 border-b border-[var(--color-border)]">
          <svg className="w-6 h-6 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
          <h2 className="text-xl font-semibold">Alert Channels</h2>
        </div>
        
        <div className="overflow-hidden border border-[var(--color-border)] rounded-lg">
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--color-surface)] border-b border-[var(--color-border)]">
              <tr>
                <th className="p-4 font-medium text-[var(--color-muted)]">Alert Type</th>
                <th className="p-4 font-medium text-center text-[var(--color-muted)] w-20">In-App</th>
                <th className="p-4 font-medium text-center text-[var(--color-muted)] w-20">Email</th>
                <th className="p-4 font-medium text-center text-[var(--color-muted)] w-20">SMS</th>
                <th className="p-4 font-medium text-center text-[var(--color-muted)] w-20">Push</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)] bg-[var(--color-card)]">
              {[
                { name: 'Critical machine failure', email: true, sms: true, push: true, reqInApp: true },
                { name: 'High risk score (>70)', email: true, sms: false, push: true },
                { name: 'Work order assigned to me', email: true, sms: false, push: true },
                { name: 'Machine offline >5 minutes', email: true, sms: true, push: false },
                { name: 'Schedule generated by AI', email: true, sms: null, push: null },
                { name: 'Weekly plant summary', email: true, sms: null, push: null },
              ].map((row, i) => (
                <tr key={i} className="hover:bg-[var(--color-surface)]/30 transition-colors">
                  <td className="p-4 font-medium">{row.name}</td>
                  <td className="p-4 align-middle">
                    <div className="flex justify-center"><div className={`w-10 h-5 rounded-full relative shadow-inner ${row.reqInApp ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'}`}><div className={`absolute top-0.5 bottom-0.5 w-4 rounded-full bg-white transition-all ${row.reqInApp ? 'right-0.5' : 'left-0.5'}`}></div></div></div>
                  </td>
                  <td className="p-4 align-middle">
                    <div className="flex justify-center"><div className={`w-10 h-5 rounded-full relative cursor-pointer shadow-inner transition-colors ${row.email ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'}`}><div className={`absolute top-0.5 bottom-0.5 w-4 rounded-full bg-white shadow-sm transition-all ${row.email ? 'right-0.5' : 'left-0.5'}`}></div></div></div>
                  </td>
                  <td className="p-4 align-middle">
                    {row.sms !== null ? (
                      <div className={`flex justify-center ${smsState !== 'confirmed' ? 'opacity-40 cursor-not-allowed' : ''}`} title={smsState !== 'confirmed' ? 'Verify SMS Number First' : ''}><div className={`w-10 h-5 rounded-full relative cursor-pointer shadow-inner transition-colors ${row.sms ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'}`}><div className={`absolute top-0.5 bottom-0.5 w-4 rounded-full bg-white shadow-sm transition-all ${row.sms ? 'right-0.5' : 'left-0.5'}`}></div></div></div>
                    ) : <span className="block text-center text-[var(--color-muted)]">—</span>}
                  </td>
                  <td className="p-4 align-middle">
                    {row.push !== null ? (
                      <div className="flex justify-center"><div className={`w-10 h-5 rounded-full relative cursor-pointer shadow-inner transition-colors ${row.push ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'}`}><div className={`absolute top-0.5 bottom-0.5 w-4 rounded-full bg-white shadow-sm transition-all ${row.push ? 'right-0.5' : 'left-0.5'}`}></div></div></div>
                    ) : <span className="block text-center text-[var(--color-muted)]">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end pt-2">
          <button className="px-5 py-2.5 bg-[var(--color-primary)] text-black font-semibold rounded shadow-lg shadow-teal-500/20 hover:shadow-teal-500/40 hover:-translate-y-0.5 transition-all text-sm">Save Preferences</button>
        </div>
      </section>

      <section className="space-y-6 pt-4">
        <div className="flex items-center space-x-3 pb-4 border-b border-[var(--color-border)]">
          <svg className="w-6 h-6 text-[var(--color-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
          <h2 className="text-xl font-semibold opacity-80">Quiet Hours</h2>
        </div>
        <div className="grid grid-cols-2 gap-6 items-end max-w-md">
          <div className="space-y-2">
            <label className="block text-sm text-[var(--color-muted)]">Do Not Disturb From</label>
            <input type="time" defaultValue="22:00" className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md px-4 py-2 text-white outline-none focus:border-[var(--color-primary)] transition-colors focus:ring-1 focus:ring-[var(--color-primary)]" />
          </div>
          <div className="space-y-2">
             <label className="block text-sm text-[var(--color-muted)]">To</label>
             <input type="time" defaultValue="07:00" className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md px-4 py-2 text-white outline-none focus:border-[var(--color-primary)] transition-colors focus:ring-1 focus:ring-[var(--color-primary)]" />
          </div>
        </div>
        <div className="space-y-4 max-w-md bg-[var(--color-surface)] p-5 rounded-lg border border-[var(--color-border)]">
          <label className="flex items-start space-x-3 cursor-pointer group">
            <div className={`mt-0.5 w-5 h-5 rounded border border-[var(--color-primary)] flex items-center justify-center bg-[var(--color-primary)] transition-colors`}>
               <svg className="w-3.5 h-3.5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
            </div>
            <div>
              <span className="text-sm font-medium block">Critical alerts override quiet hours</span>
              <span className="text-xs text-[var(--color-muted)] mt-0.5 block">Emergencies will always notify you.</span>
            </div>
          </label>
          <label className="flex items-start space-x-3 cursor-pointer group pt-2 border-t border-[var(--color-border)]">
            <div className={`mt-0.5 w-5 h-5 rounded border border-slate-600 bg-slate-900 group-hover:border-[var(--color-primary)] transition-colors`}>
               {/* Unchecked state */}
            </div>
            <div>
              <span className="text-sm font-medium block">Suppress non-critical alerts on weekends</span>
              <span className="text-xs text-[var(--color-muted)] mt-0.5 block">From Friday 18:00 to Monday 08:00.</span>
            </div>
          </label>
        </div>
      </section>
    </div>
  );
}
