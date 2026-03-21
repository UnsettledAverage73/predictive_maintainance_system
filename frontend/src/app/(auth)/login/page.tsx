"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Hexagon, Lock, Mail, ArrowRight, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate login delay
    setTimeout(() => {
      setIsLoading(false);
      setIsSuccess(true);
      setTimeout(() => {
        router.push("/dashboard");
      }, 1000);
    }, 1500);
  };

  if (isSuccess) {
    return (
      <div className="glass-panel p-8 rounded-2xl flex flex-col items-center justify-center text-center animate-in zoom-in duration-300">
        <div className="w-16 h-16 rounded-full bg-[var(--color-success)]/20 flex items-center justify-center text-[var(--color-success)] mb-6 shadow-[0_0_20px_var(--color-success)] animation-pulse">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Authentication Successful</h2>
        <p className="text-[var(--color-muted)] mb-6">Initializing session...</p>
        
        <div className="flex flex-col gap-2 mt-4 items-center">
          <span className="text-xs uppercase tracking-widest text-[var(--color-muted)] font-mono">Assigned Role</span>
          <span className="px-3 py-1 bg-[var(--color-primary)]/20 text-[var(--color-primary)] border border-[var(--color-primary)]/30 rounded-full font-bold text-sm shadow-[0_0_10px_var(--color-primary)]">
            Lead Engineer
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel p-8 rounded-2xl flex flex-col items-center shadow-2xl relative overflow-hidden backdrop-blur-xl">
      <div className="flex flex-col items-center mb-8">
        <Hexagon className="w-12 h-12 text-[var(--color-primary)] fill-[var(--color-primary)]/20 mb-4 drop-shadow-[0_0_8px_var(--color-primary)]" />
        <h1 className="text-3xl font-bold tracking-wide">PredictMaint</h1>
        <p className="text-sm text-[var(--color-muted)] mt-2 font-mono">Secure Identity Matrix</p>
      </div>

      <form onSubmit={handleLogin} className="w-full flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] pl-1">Email ID</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-muted)]" />
            <input 
              type="email" 
              required
              placeholder="operator@plant.co"
              className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-[var(--color-primary)] focus:shadow-[0_0_10px_var(--color-primary)]/20 transition-all font-mono placeholder-[var(--color-border)]"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] pl-1">Authorization Chaff</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-muted)]" />
            <input 
              type="password" 
              required
              placeholder="••••••••••••••"
              className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-[var(--color-primary)] focus:shadow-[0_0_10px_var(--color-primary)]/20 transition-all font-mono placeholder-[var(--color-border)]"
            />
          </div>
        </div>

        <button 
          disabled={isLoading}
          type="submit" 
          className={cn(
            "w-full bg-[var(--color-primary)] text-[#0D1117] font-bold py-3 rounded-lg mt-2 flex items-center justify-center gap-2 hover:bg-[#00e6b8] transition-colors shadow-[0_0_15px_var(--color-primary)]/30",
            isLoading && "opacity-70 cursor-not-allowed"
          )}
        >
          {isLoading ? (
            <span className="w-5 h-5 border-2 border-[#0D1117] border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              Initialize Session
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        <div className="relative flex items-center justify-center my-4">
          <div className="absolute w-full h-px bg-gradient-to-r from-transparent via-[var(--color-border)] to-transparent" />
          <span className="relative bg-[var(--color-surface)] px-4 text-xs font-mono text-[var(--color-muted)] uppercase tracking-widest border border-[var(--color-border)] rounded-full">
            Or Use
          </span>
        </div>

        <button 
          type="button" 
          disabled={isLoading}
          className="w-full bg-transparent border border-[var(--color-border)] text-[var(--color-foreground)] font-semibold py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-[var(--color-surface)] transition-all font-mono"
        >
          <Hexagon className="w-4 h-4" />
          SSO / Active Directory
        </button>
      </form>
    </div>
  );
}
