'use client';

import Link from 'next/link';
import { Shield, Cloud, Bell, Server } from 'lucide-react';

export default function SettingsPage() {
  const settingModules = [
    { 
      title: 'Private Cloud Connect', 
      description: 'Connect your AWS, GCP, or Azure infrastructure for live telemetry ingestion.', 
      icon: Cloud, 
      href: '/settings/cloud-connect', 
      color: 'text-teal-400', 
      bg: 'bg-teal-500/10' 
    },
    { 
      title: 'Security Center', 
      description: 'Manage 2FA, Active Directory SSO, API keys, and access logs.', 
      icon: Shield, 
      href: '/settings/security', 
      color: 'text-blue-400', 
      bg: 'bg-blue-500/10' 
    },
    { 
      title: 'SMS & Alert Preferences', 
      description: 'Configure multi-channel notification rules, rotation schedules, and thresholds.', 
      icon: Bell, 
      href: '/profile/notifications', 
      color: 'text-amber-400', 
      bg: 'bg-amber-500/10' 
    },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-24">
      <div>
        <div className="flex items-center text-sm text-[var(--color-primary)] mb-3">
          <Link href="/dashboard" className="hover:underline">Dashboard</Link>
          <span className="mx-2 text-[var(--color-muted)]">/</span>
          <span className="text-[var(--color-foreground)] font-medium">Settings</span>
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Platform Settings</h1>
        <p className="text-[var(--color-muted)] mt-2">Manage your PredictMaint configurations, integrations, and security.</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {settingModules.map((mod) => (
          <Link key={mod.href} href={mod.href} className="group block h-full">
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 h-full flex flex-col items-start gap-4 transition-all hover:border-[var(--color-primary)]/50 hover:bg-[#121820] shadow-sm hover:shadow-md cursor-pointer">
              <div className={`p-4 rounded-xl ${mod.bg} ${mod.color} shrink-0 mb-2 shadow-[inset_0_2px_10px_rgba(255,255,255,0.05)]`}>
                <mod.icon className="w-8 h-8" strokeWidth={1.5} />
              </div>
              <div className="flex-1">
                <h3 className="text-[17px] font-semibold text-slate-200 group-hover:text-[var(--color-primary)] transition-colors mb-2">{mod.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed group-hover:text-slate-300 transition-colors">{mod.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
