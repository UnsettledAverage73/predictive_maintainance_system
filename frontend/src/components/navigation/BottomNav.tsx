'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Server, CalendarDays, Bell, MoreHorizontal, Settings, PlusCircle, Shield } from 'lucide-react';
import { useState } from 'react';
import { BottomSheet } from '@/components/ui/bottom-sheet';

const mainTabs = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: Server, label: 'Machines', href: '/dashboard/machines' },
  { icon: CalendarDays, label: 'Schedule', href: '/dashboard/schedule' },
  { icon: Bell, label: 'Alerts', href: '/dashboard/alerts', badge: 3 },
];

const moreItems = [
  { icon: PlusCircle, label: 'Onboard Machine', href: '/dashboard/onboarding' },
  { icon: Shield, label: 'Security', href: '/settings/security' },
  { icon: Settings, label: 'Settings', href: '/settings' },
];

export function BottomNav() {
  const pathname = usePathname();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--color-surface)]/95 backdrop-blur-xl border-t border-[var(--color-border)] pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_40px_rgba(0,0,0,0.4)]">
        <ul className="flex items-center justify-between px-2 pt-2 pb-1.5 h-[60px]">
          {mainTabs.map(tab => {
            const isActive = pathname === tab.href || (tab.href !== '/dashboard' && pathname.startsWith(tab.href));
            return (
              <li key={tab.href} className="flex-1 h-full">
                <Link href={tab.href} className="flex flex-col items-center justify-center h-full group relative">
                  <div className={`relative mb-0.5 transition-colors duration-200 ${isActive ? 'text-[var(--color-primary)] shrink-0' : 'text-[var(--color-muted)] group-hover:text-slate-300 shrink-0'}`}>
                    <tab.icon className={`w-[22px] h-[22px] ${isActive ? 'fill-[var(--color-primary)]/20' : ''}`} />
                    {tab.badge && (
                      <span className="absolute -top-1 -right-1.5 bg-[var(--color-destructive)] text-white text-[9px] w-[18px] h-[18px] rounded-full flex items-center justify-center font-bold shadow-md transform scale-90 border-[1.5px] border-[var(--color-surface)]">
                        {tab.badge}
                      </span>
                    )}
                  </div>
                  <span className={`text-[10px] font-semibold tracking-wide transition-colors ${isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-muted)] group-hover:text-slate-300'}`}>
                    {tab.label}
                  </span>
                </Link>
              </li>
            );
          })}
          
          <li className="flex-1 h-full">
            <button onClick={() => setIsMoreOpen(true)} className="w-full h-full flex flex-col items-center justify-center group text-[var(--color-muted)] hover:text-slate-300">
              <MoreHorizontal className="w-[22px] h-[22px] mb-0.5" />
              <span className="text-[10px] font-semibold tracking-wide">More</span>
            </button>
          </li>
        </ul>
      </nav>

      <BottomSheet isOpen={isMoreOpen} onClose={() => setIsMoreOpen(false)}>
        <div className="space-y-6 pb-6 pt-2">
          <h3 className="text-xl font-bold text-white px-2">More Options</h3>
          <div className="grid grid-cols-4 gap-x-2 gap-y-6">
            {moreItems.map(item => (
              <Link key={item.href} href={item.href} onClick={() => setIsMoreOpen(false)} className="flex flex-col items-center justify-start gap-2.5 group outline-none">
                <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center text-[var(--color-primary)] group-hover:bg-slate-700 transition-colors shadow-inner">
                  <item.icon className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-medium text-center text-slate-300 px-1">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </BottomSheet>
    </>
  );
}
