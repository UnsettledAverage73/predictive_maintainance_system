"use client";

import { Shield, Zap, Bell, Server } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("integrations");

  const tabs = [
    { id: "integrations", label: "Integrations", icon: Server },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "security", label: "Security & Audit", icon: Shield },
  ];

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-12 w-full max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Platform Settings</h1>
          <p className="text-[var(--color-muted)] text-sm mt-1">Configure platform-wide integrations and security</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 mt-4">
        {/* Navigation */}
        <div className="w-full lg:w-64 flex flex-col gap-1 flex-shrink-0">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-sm font-medium text-left",
                  isActive ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)] shadow-[inset_3px_0_0_var(--color-primary)]" : "text-[var(--color-muted)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface)]"
                )}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="glass-panel rounded-xl p-12 flex flex-col items-center justify-center text-center animate-in slide-in-from-right-4 duration-300">
            <Zap className="w-12 h-12 text-[var(--color-muted)] mb-4" />
            <h3 className="text-xl font-bold mb-2">Module Offline</h3>
            <p className="text-[var(--color-muted)]">This configuration module is disabled in the current preview build.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
