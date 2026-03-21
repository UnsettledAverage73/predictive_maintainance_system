'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Server, CalendarDays, MessageSquare, Settings, AlertTriangle, PlusCircle, ChevronLeft, ChevronRight, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMediaQuery } from '@/lib/hooks/useMediaQuery';

const navItems = [
  { icon: LayoutDashboard, label: 'Overview', href: '/dashboard' },
  { icon: Server, label: 'Machines', href: '/dashboard/machines' },
  { icon: AlertTriangle, label: 'Alerts', href: '/dashboard/alerts', badge: 3 },
  { icon: CalendarDays, label: 'Schedule', href: '/dashboard/schedule' },
  { icon: MessageSquare, label: 'AI Query', href: '/dashboard/query' },
];

const adminItems = [
  { icon: PlusCircle, label: 'Onboard Machine', href: '/dashboard/onboarding' },
  { icon: Shield, label: 'Security', href: '/settings/security' },
  { icon: Settings, label: 'Settings', href: '/settings' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isTablet, isDesktop } = useMediaQuery();
  const [mounted, setMounted] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('sidebar-collapsed');
    if (stored) setIsCollapsed(stored === 'true');
  }, []);

  const handleToggle = () => {
    const val = !isCollapsed;
    setIsCollapsed(val);
    localStorage.setItem('sidebar-collapsed', String(val));
  };

  if (!mounted) {
    return <aside className="w-64 h-full bg-[var(--color-surface)] border-r border-[var(--color-border)] hidden md:block shrink-0"></aside>;
  }

  const collapsed = isTablet || (isDesktop && isCollapsed);
  const isExpandedTablet = isTablet && isHovered;

  return (
    <aside 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "hidden md:flex h-full bg-[var(--color-surface)] border-r border-[var(--color-border)] flex-col py-4 px-3 z-40 transition-all duration-300 relative shrink-0",
        collapsed && !isExpandedTablet ? "w-[72px] items-center" : "w-[240px]",
        isExpandedTablet ? "absolute left-0 top-0 shadow-[20px_0_40px_rgba(0,0,0,0.3)] h-full" : ""
      )}
    >
      {isDesktop && (
         <button 
           onClick={handleToggle}
           aria-label={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
           className="absolute -right-3 top-8 w-6 h-6 bg-[var(--color-primary)] text-black rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(0,212,170,0.4)] z-50 hover:brightness-110 transition-all border border-black/10"
         >
           {isCollapsed ? <ChevronRight className="w-4 h-4 ml-0.5" /> : <ChevronLeft className="w-4 h-4 pr-0.5" />}
         </button>
      )}

      <div className="mb-8 w-full mt-2">
        {(!collapsed || isExpandedTablet) && (
          <h2 className="text-[10px] uppercase font-bold text-[var(--color-muted)] tracking-widest mb-4 px-3">Operations</h2>
        )}
        <nav className="flex flex-col gap-2 w-full">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} className="w-full relative group" title={collapsed && !isExpandedTablet ? item.label : undefined}>
                <div className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium w-full group-hover:bg-[var(--color-surface)] hover:text-white",
                  isActive ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)] shadow-[inset_2px_0_0_var(--color-primary)]" : "text-[var(--color-muted)]",
                  collapsed && !isExpandedTablet && "justify-center px-0 w-11 mx-auto aspect-square"
                )}>
                  <item.icon className={cn("w-5 h-5 shrink-0 transition-transform group-hover:scale-110", isActive && "fill-[var(--color-primary)]/20")} />
                  {(!collapsed || isExpandedTablet) && (
                    <>
                      <span className="flex-1 whitespace-nowrap">{item.label}</span>
                      {item.badge && (
                        <span className="bg-[var(--color-destructive)] text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold shadow-sm border border-[var(--color-surface)]">
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                  {collapsed && !isExpandedTablet && item.badge && (
                    <span className="absolute top-1 right-2.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[var(--color-surface)]"></span>
                  )}
                </div>
                {collapsed && !isExpandedTablet && (
                  <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-[#0D1117] text-white text-xs font-semibold rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap shadow-xl border border-[var(--color-border)]">
                    {item.label}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="w-full">
        {(!collapsed || isExpandedTablet) && (
          <h2 className="text-[10px] uppercase font-bold text-[var(--color-muted)] tracking-widest mb-4 px-3">Administration</h2>
        )}
        <nav className="flex flex-col gap-2 w-full">
          {adminItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} className="w-full relative group" title={collapsed && !isExpandedTablet ? item.label : undefined}>
                <div className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium w-full group-hover:bg-[var(--color-surface)] hover:text-white",
                  isActive ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)] shadow-[inset_2px_0_0_var(--color-primary)]" : "text-[var(--color-muted)]",
                  collapsed && !isExpandedTablet && "justify-center px-0 w-11 mx-auto aspect-square"
                )}>
                  <item.icon className="w-5 h-5 shrink-0 transition-transform group-hover:scale-110" />
                  {(!collapsed || isExpandedTablet) && <span className="whitespace-nowrap">{item.label}</span>}
                </div>
                {collapsed && !isExpandedTablet && (
                  <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-[#0D1117] text-white text-xs font-semibold rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap shadow-xl border border-[var(--color-border)]">
                    {item.label}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto pt-4 border-t border-[var(--color-border)] w-full">
        {(!collapsed || isExpandedTablet) ? (
          <>
            <div className="flex items-center gap-2 px-3 text-xs text-[var(--color-muted)] mb-2">
              <div className="w-2 h-2 rounded-full bg-[var(--color-success)] shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse" />
              <span className="whitespace-nowrap font-medium text-slate-300">Platform Online</span>
            </div>
            <p className="px-3 text-[10px] font-mono text-[var(--color-muted)] opacity-50">v2.0-stable</p>
          </>
        ) : (
           <div className="flex justify-center w-full mt-2">
             <div className="w-2 h-2 rounded-full bg-[var(--color-success)] shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse" title="Platform Online" />
           </div>
        )}
      </div>
    </aside>
  );
}
