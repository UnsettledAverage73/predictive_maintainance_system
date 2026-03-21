"use client";

import { Users, Shield, Zap, Bell, Check, Server } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("users");

  const tabs = [
    { id: "users", label: "Users & Roles", icon: Users },
    { id: "integrations", label: "Integrations", icon: Server },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "security", label: "Security & Audit", icon: Shield },
  ];

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-12 w-full max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Platform Settings</h1>
          <p className="text-[var(--color-muted)] text-sm mt-1">Configure users, RBAC, and platform-wide integrations</p>
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
          {activeTab === "users" && (
            <div className="glass-panel rounded-xl flex flex-col overflow-hidden animate-in slide-in-from-right-4 duration-300">
              <div className="p-6 border-b border-[var(--color-border)] flex justify-between items-center bg-[var(--color-surface)]/50">
                <div>
                  <h3 className="font-bold">User Matrix</h3>
                  <p className="text-xs text-[var(--color-muted)] mt-1">Manage platform access and roles.</p>
                </div>
                <button className="bg-[var(--color-primary)] text-[#0D1117] font-bold px-4 py-2 rounded-lg text-sm hover:bg-[#00e6b8] transition-colors">
                  Invite User
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs uppercase bg-[var(--color-surface)] text-[var(--color-muted)] border-b border-[var(--color-border)]">
                    <tr>
                      <th className="px-6 py-4 font-bold">User</th>
                      <th className="px-6 py-4 font-bold">Role Matrix</th>
                      <th className="px-6 py-4 font-bold">Last Login</th>
                      <th className="px-6 py-4 font-bold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { name: "Sarah Connor", email: "sarah.c@plant.co", role: "Admin", active: true },
                      { name: "Mike T.", email: "mike.t@plant.co", role: "Lead Eng", active: true },
                      { name: "Alex J.", email: "alex.j@plant.co", role: "Operator", active: false },
                    ].map((user, i) => (
                      <tr key={i} className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface)]/50 transition-colors">
                        <td className="px-6 py-4 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[var(--color-primary)] to-blue-500 flex items-center justify-center font-bold text-xs shadow-md">
                            {user.name.charAt(0)}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-semibold">{user.name}</span>
                            <span className="text-xs text-[var(--color-muted)] font-mono">{user.email}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-full text-xs font-mono">
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-[var(--color-muted)] font-mono text-xs">
                          {new Date().toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          {user.active ? (
                            <span className="flex items-center gap-1 text-[var(--color-success)] text-xs font-bold uppercase tracking-widest bg-[var(--color-success)]/10 w-max px-2 py-0.5 rounded">
                              <Check className="w-3 h-3" /> Active
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[var(--color-muted)] text-xs font-bold uppercase tracking-widest bg-[var(--color-surface)] w-max px-2 py-0.5 rounded border border-[var(--color-border)]">
                              Inactive
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab !== "users" && (
            <div className="glass-panel rounded-xl p-12 flex flex-col items-center justify-center text-center animate-in slide-in-from-right-4 duration-300">
              <Zap className="w-12 h-12 text-[var(--color-muted)] mb-4" />
              <h3 className="text-xl font-bold mb-2">Module Offline</h3>
              <p className="text-[var(--color-muted)]">This configuration module is disabled in the current preview build.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
