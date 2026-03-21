'use client';
import { useState } from 'react';
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
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved !== null) {
      setIsCollapsed(saved === 'true');
    }
    setMounted(true);
  }, []);

  const handleToggle = () => {
    const val = !isCollapsed;
    setIsCollapsed(val);
    localStorage.setItem('sidebar-collapsed', String(val));
  };

  const collapsed = mounted && (isTablet || (isDesktop && isCollapsed));
  const isExpandedTablet = isTablet && isHovered;

  return (
    <aside 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "hidden md:flex h-full flex-col border-r border-white/8 bg-[rgba(10,14,20,0.92)] px-3 py-4 relative z-40 shrink-0 transition-all duration-300 backdrop-blur-xl",
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

      <div className={cn("mb-7 mt-1 w-full", collapsed && !isExpandedTablet && "flex justify-center")}>
        <div className={cn(
          "surface-card hairline overflow-hidden rounded-2xl p-3",
          collapsed && !isExpandedTablet ? "w-12 h-12 p-0 flex items-center justify-center rounded-2xl" : ""
        )}>
          <div className={cn("flex items-center gap-3", collapsed && !isExpandedTablet && "justify-center")}>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(0,212,170,0.95),rgba(56,189,248,0.88))] text-sm font-black tracking-wide text-black shadow-[0_18px_40px_-24px_rgba(0,212,170,0.95)]">
              PM
            </div>
            {(!collapsed || isExpandedTablet) && (
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--color-foreground)]">PredictMaint</p>
                <p className="truncate text-[11px] uppercase tracking-[0.22em] text-[var(--color-muted)]">Factory Command</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mb-8 w-full">
        {(!collapsed || isExpandedTablet) && (
          <h2 className="mb-4 px-3 text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--color-muted)]">Operations</h2>
        )}
        <nav className="flex flex-col gap-2 w-full">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} className="w-full relative group" title={collapsed && !isExpandedTablet ? item.label : undefined}>
                <div className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium w-full transition-all hover:text-white",
                  isActive
                    ? "surface-card text-[var(--color-foreground)] shadow-[inset_0_0_0_1px_rgba(0,212,170,0.18),0_16px_28px_-20px_rgba(0,212,170,0.7)]"
                    : "text-[var(--color-muted)] hover:bg-white/4",
                  collapsed && !isExpandedTablet && "justify-center px-0 w-11 mx-auto aspect-square"
                )}>
                  <div className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
                    isActive
                      ? "border-[var(--color-primary)]/25 bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                      : "border-white/8 bg-white/4"
                  )}>
                    <item.icon className={cn("h-4.5 w-4.5 shrink-0 transition-transform group-hover:scale-110", isActive && "fill-[var(--color-primary)]/20")} />
                  </div>
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
          <h2 className="mb-4 px-3 text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--color-muted)]">Administration</h2>
        )}
        <nav className="flex flex-col gap-2 w-full">
          {adminItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} className="w-full relative group" title={collapsed && !isExpandedTablet ? item.label : undefined}>
                <div className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium w-full transition-all hover:text-white",
                  isActive
                    ? "surface-card text-[var(--color-foreground)] shadow-[inset_0_0_0_1px_rgba(0,212,170,0.18),0_16px_28px_-20px_rgba(0,212,170,0.7)]"
                    : "text-[var(--color-muted)] hover:bg-white/4",
                  collapsed && !isExpandedTablet && "justify-center px-0 w-11 mx-auto aspect-square"
                )}>
                  <div className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
                    isActive
                      ? "border-[var(--color-primary)]/25 bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                      : "border-white/8 bg-white/4"
                  )}>
                    <item.icon className="h-4.5 w-4.5 shrink-0 transition-transform group-hover:scale-110" />
                  </div>
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

      <div className="mt-auto w-full border-t border-white/8 pt-4">
        {(!collapsed || isExpandedTablet) ? (
          <div className="surface-card rounded-2xl p-3">
            <div className="mb-2 flex items-center gap-2 text-xs text-[var(--color-muted)]">
              <div className="w-2 h-2 rounded-full bg-[var(--color-success)] shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse" />
              <span className="whitespace-nowrap font-medium text-slate-300">Platform Online</span>
            </div>
            <p className="text-sm font-semibold">Detroit Plant Alpha</p>
            <p className="mt-1 text-[10px] font-mono uppercase tracking-[0.24em] text-[var(--color-muted)] opacity-80">v2.0-stable</p>
          </div>
        ) : (
           <div className="flex justify-center w-full mt-2">
             <div className="w-2 h-2 rounded-full bg-[var(--color-success)] shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse" title="Platform Online" />
           </div>
        )}
      </div>
    </aside>
  );
}
