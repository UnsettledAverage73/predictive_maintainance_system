'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X, BarChart3, Settings, AlertCircle, MessageSquare, Home } from 'lucide-react';

interface SidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function Sidebar({ open, onOpenChange }: SidebarProps) {
  const menuItems = [
    { icon: Home, label: 'Dashboard', href: '/' },
    { icon: BarChart3, label: 'Analytics', href: '/' },
    { icon: AlertCircle, label: 'Alerts', href: '/' },
    { icon: Settings, label: 'Settings', href: '/settings' },
  ];

  return (
    <>
      {/* Sidebar */}
      <div
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-sidebar text-sidebar-foreground transform transition-transform duration-200 ease-in-out flex flex-col ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-sidebar-border bg-gradient-to-r from-primary/10 to-accent/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/50">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <span className="font-black text-lg hidden sm:inline bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">PredMaint</span>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="lg:hidden text-sidebar-foreground hover:text-sidebar-primary"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 overflow-auto px-4 py-6 space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="group flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-primary/20 hover:border hover:border-primary/50 transition-all duration-200 border border-transparent"
            >
              <item.icon className="w-5 h-5 group-hover:text-primary transition-colors" />
              <span className="font-semibold group-hover:text-primary transition-colors">{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-sidebar-border">
          <div className="p-3 rounded-lg bg-sidebar-accent/20">
            <p className="text-xs text-sidebar-foreground/70">
              System Status: <span className="text-green-400">Online</span>
            </p>
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => onOpenChange(false)}
        />
      )}
    </>
  );
}
