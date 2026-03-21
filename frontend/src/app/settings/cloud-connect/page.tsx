'use client';
import { useState } from 'react';
import Link from 'next/link';
import { LiveLogPanel } from '@/components/cloud-connect/LiveLogPanel';

type Provider = 'AWS' | 'GCP' | 'Azure' | null;

export default function CloudConnectWizardPage() {
  const [step, setStep] = useState(1);
  const [provider, setProvider] = useState<Provider>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const [awsRegion, setAwsRegion] = useState('');
  const [vpcId, setVpcId] = useState('');
  
  const handleNext = () => setStep(prev => Math.min(prev + 1, 3));
  const handleBack = () => setStep(prev => Math.max(prev - 1, 1));

  const handleConnect = () => {
    setIsConnecting(true);
    setTimeout(() => {
      setIsConnecting(false);
      setIsSuccess(true);
    }, 4500);
  };

  if (isSuccess) {
    return (
      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center p-6">
        <div className="text-center p-8 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-2xl max-w-md w-full animate-in zoom-in duration-500">
           <div className="w-20 h-20 mx-auto bg-green-500/10 rounded-full flex items-center justify-center mb-6">
             <span className="text-4xl text-green-500">✓</span>
           </div>
           <h2 className="text-2xl font-bold mb-2">Connection Established!</h2>
           <p className="text-[var(--color-muted)] mb-8">Production {provider} cloud infrastructure has been successfully linked.</p>
           <div className="flex flex-col space-y-3">
             <Link href="/dashboard" className="px-4 py-3 bg-[var(--color-primary)] text-black font-semibold rounded-lg hover:brightness-110 transition-all text-center">View Dashboard</Link>
             <button onClick={() => { setStep(1); setProvider(null); setIsSuccess(false); }} className="px-4 py-3 bg-transparent border border-[var(--color-border)] text-white font-medium rounded-lg hover:bg-[var(--color-surface)] transition-all">Configure Another</button>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] flex overflow-hidden lg:flex-row flex-col relative w-full">
      <div className="flex-1 flex flex-col h-full overflow-y-auto w-full lg:w-[60%] shrink-0">
        <div className="p-8 max-w-3xl mx-auto w-full">
          <div className="mb-10">
            <div className="flex items-center text-sm text-[var(--color-primary)] mb-4">
              <Link href="/settings" className="hover:underline">Settings</Link>
              <span className="mx-2 text-[var(--color-muted)]">/</span>
              <span className="text-[var(--color-foreground)]">Cloud Connect</span>
            </div>
            <h1 className="text-3xl font-bold">Connect Private Cloud</h1>
            <p className="text-[var(--color-muted)] mt-2">Securely connect PredictMaint to your organization's infrastructure.</p>
          </div>

          <div className="flex items-center justify-between mb-12 relative">
            <div className="absolute left-0 right-0 top-1/2 h-[2px] bg-[var(--color-border)] -z-10 -translate-y-1/2 rounded-full"></div>
            {[
              { num: 1, label: 'Provider' },
              { num: 2, label: 'Configuration' },
              { num: 3, label: 'Review' }
            ].map(s => {
              const active = step === s.num;
              const completed = step > s.num;
              return (
                <div key={s.num} className="bg-[var(--color-background)] px-3 py-1">
                  <div className={`flex items-center justify-center px-5 py-2 rounded-full font-semibold text-sm transition-all ${
                    active ? 'bg-[var(--color-primary)] text-black shadow-[0_0_15px_rgba(0,212,170,0.3)]' : 
                    completed ? 'bg-[var(--color-surface)] text-[var(--color-primary)] border-2 border-[var(--color-primary)]' : 
                    'bg-[var(--color-surface)] text-[var(--color-muted)] border-2 border-[var(--color-border)]'
                  }`}>
                    {completed ? <span className="mr-2">✓</span> : <span className="mr-2 opacity-70">0{s.num}</span>}
                    {s.label}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pb-32">
            {step === 1 && (
              <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                <h2 className="text-xl font-semibold mb-4">Choose your provider</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {['AWS', 'GCP', 'Azure'].map(p => (
                    <button 
                      key={p}
                      onClick={() => setProvider(p as Provider)}
                      className={`relative flex flex-col items-center text-center p-6 rounded-xl border-2 transition-all ${
                        provider === p 
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 shadow-[0_0_20px_rgba(0,212,170,0.15)] transform scale-105' 
                          : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-muted)] hover:scale-[1.02]'
                      }`}
                    >
                      {p === 'AWS' && <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-blue-600 text-white text-[10px] uppercase font-bold tracking-widest rounded shadow-md whitespace-nowrap">Most Common</span>}
                      
                      <div className="w-16 h-16 mb-4 bg-slate-800 rounded-lg flex items-center justify-center shadow-inner font-bold text-2xl text-[var(--color-muted)]">
                        {p}
                      </div>
                      <h3 className="font-bold text-lg">{p}</h3>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 2 && provider === 'AWS' && (
              <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                <h2 className="text-xl font-semibold mb-4">AWS Configuration</h2>
                <div className="grid grid-cols-2 gap-6 bg-[var(--color-surface)] p-6 rounded-xl border border-[var(--color-border)] shadow-sm">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[var(--color-muted)]">AWS Region</label>
                    <select value={awsRegion} onChange={e => setAwsRegion(e.target.value)} className="w-full bg-slate-900 border border-[var(--color-border)] rounded-md px-4 py-3 text-white focus:border-[var(--color-primary)] outline-none transition-colors appearance-none">
                      <option value="" disabled>Select region...</option>
                      <option value="us-east-1">us-east-1 (N. Virginia)</option>
                      <option value="eu-west-1">eu-west-1 (Ireland)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[var(--color-muted)]">VPC ID</label>
                    <input type="text" value={vpcId} onChange={e => setVpcId(e.target.value)} placeholder="vpc-0a1b2c3d4e" className="w-full bg-slate-900 border border-[var(--color-border)] rounded-md px-4 py-3 text-white focus:border-[var(--color-primary)] outline-none font-mono placeholder-slate-600 transition-colors" />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <label className="text-sm font-medium text-[var(--color-muted)]">IAM Access Key ID</label>
                    <input type="text" className="w-full bg-slate-900 border border-[var(--color-border)] rounded-md px-4 py-3 text-white focus:border-[var(--color-primary)] outline-none font-mono transition-colors" autoComplete="off" />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <label className="text-sm font-medium text-[var(--color-muted)] flex justify-between items-center">
                      Secret Access Key
                      <span className="text-[10px] bg-[var(--color-primary)]/10 text-[var(--color-primary)] px-2 py-0.5 rounded border border-[var(--color-primary)]/20 shadow-sm">ENCRYPTED AT REST</span>
                    </label>
                    <input type="password" placeholder="••••••••••••••••" className="w-full bg-slate-900 border border-[var(--color-border)] rounded-md px-4 py-3 text-white focus:border-[var(--color-primary)] outline-none font-mono tracking-widest transition-colors" autoComplete="new-password" />
                  </div>
                </div>
              </div>
            )}
            
            {step === 2 && provider !== 'AWS' && (
               <div className="text-center p-16 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] animate-in slide-in-from-right-4 duration-300">
                 <p className="text-slate-400 font-medium">Mock stub for {provider} form logic.</p>
               </div>
            )}

            {step === 3 && (
              <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                <h2 className="text-xl font-semibold mb-4">Review & Connect</h2>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[var(--color-muted)] block">Connection Name</label>
                  <input type="text" defaultValue={`Production ${provider} us-east-1`} className="w-full md:w-2/3 max-w-md bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md px-4 py-3 text-white focus:border-[var(--color-primary)] outline-none font-medium transition-colors" />
                </div>

                <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden max-w-2xl shadow-sm">
                  <div className="bg-[#0D1117] px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
                     <span className="font-medium text-slate-300">Configuration Summary</span>
                     <button onClick={() => setStep(2)} className="text-[var(--color-primary)] hover:underline text-sm font-medium">Edit</button>
                  </div>
                  <div className="p-6 grid grid-cols-2 gap-y-6 text-sm">
                    <div><span className="text-[var(--color-muted)] block mb-1.5 uppercase tracking-wider text-[10px] font-bold">Region</span><span className="font-medium">{awsRegion || 'us-east-1'}</span></div>
                    <div><span className="text-[var(--color-muted)] block mb-1.5 uppercase tracking-wider text-[10px] font-bold">VPC ID</span><span className="font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-800">{vpcId || 'vpc-0abc1234'}</span></div>
                    <div><span className="text-[var(--color-muted)] block mb-1.5 uppercase tracking-wider text-[10px] font-bold">Access Key ID</span><span className="font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-800">AKIAIOSFODNN7EXAMPLE</span></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="fixed bottom-0 left-0 right-0 lg:left-0 lg:right-[40%] bg-[var(--color-background)]/90 backdrop-blur-md border-t border-[var(--color-border)] p-5 z-30 flex justify-between items-center px-8 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
             <button 
               onClick={handleBack} 
               className={`px-6 py-2.5 font-semibold text-[var(--color-muted)] hover:text-white hover:bg-[var(--color-surface)] rounded-lg transition-colors ${step === 1 ? 'invisible' : ''}`}
             >
               Back
             </button>
             {step < 3 ? (
               <button 
                 onClick={handleNext}
                 disabled={step === 1 && !provider}
                 className="px-8 py-2.5 bg-[var(--color-primary)] text-black font-bold rounded-lg hover:brightness-110 disabled:opacity-50 transition-all font-medium"
               >
                 Continue Configuration
               </button>
             ) : (
               <button 
                 onClick={handleConnect}
                 disabled={isConnecting}
                 className="px-8 py-3 bg-[var(--color-primary)] text-black font-bold rounded-lg hover:brightness-110 disabled:opacity-80 transition-all flex justify-center items-center"
               >
                 {isConnecting ? 'Connecting...' : 'Establish Connection'}
               </button>
             )}
          </div>
        </div>
      </div>

      <div className="hidden lg:block w-[40%] bg-[#0D1117] relative z-20 shadow-[-10px_0_30px_rgba(0,0,0,0.5)]">
         <LiveLogPanel active={isConnecting} />
      </div>
    </div>
  );
}
