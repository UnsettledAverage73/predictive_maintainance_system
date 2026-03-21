'use client';

import Link from 'next/link';
import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BellRing,
  CheckCircle2,
  ChevronLeft,
  Filter,
  Info,
  Phone,
  Save,
  Search,
  Settings,
  ShieldAlert,
  X,
} from 'lucide-react';
import { useDrag } from '@use-gesture/react';
import { Alert } from '@/types';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';

type SeverityFilter = 'all' | Alert['severity'];

interface BackendAlert {
  id: number;
  equipment_id: string;
  severity: string;
  reason: string;
  prescription: string;
  timestamp: string;
}

function getSeverityIcon(severity: Alert['severity']) {
  if (severity === 'critical') {
    return <AlertTriangle className="w-4 h-4 text-[var(--color-destructive)]" />;
  }
  if (severity === 'warning') {
    return <AlertCircle className="w-4 h-4 text-[var(--color-warning)]" />;
  }
  return <Info className="w-4 h-4 text-[var(--color-info)]" />;
}

function getSeverityStyles(severity: Alert['severity']) {
  if (severity === 'critical') {
    return {
      chip: 'bg-[var(--color-destructive)]/10 text-[var(--color-destructive)] border-[var(--color-destructive)]/20',
      panel: 'border-[var(--color-destructive)]/20 bg-[var(--color-destructive)]/6',
      accent: 'bg-[var(--color-destructive)]/10 text-[var(--color-destructive)] border-[var(--color-destructive)]/20 shadow-[0_0_18px_rgba(239,68,68,0.12)]',
    };
  }
  if (severity === 'warning') {
    return {
      chip: 'bg-[var(--color-warning)]/10 text-[var(--color-warning)] border-[var(--color-warning)]/20',
      panel: 'border-[var(--color-warning)]/20 bg-[var(--color-warning)]/6',
      accent: 'bg-[var(--color-warning)]/10 text-[var(--color-warning)] border-[var(--color-warning)]/20 shadow-[0_0_18px_rgba(245,158,11,0.12)]',
    };
  }
  return {
    chip: 'bg-[var(--color-info)]/10 text-[var(--color-info)] border-[var(--color-info)]/20',
    panel: 'border-[var(--color-info)]/20 bg-[var(--color-info)]/6',
    accent: 'bg-[var(--color-info)]/10 text-[var(--color-info)] border-[var(--color-info)]/20 shadow-[0_0_18px_rgba(59,130,246,0.12)]',
  };
}

function formatAlert(alert: BackendAlert): Alert {
  const severity = alert.severity.toLowerCase();
  return {
    id: alert.id.toString(),
    machineId: alert.equipment_id,
    machineName: alert.equipment_id,
    severity: severity === 'critical' || severity === 'warning' ? severity : 'info',
    title: alert.reason,
    description: 'Threshold breach detected by the telemetry pipeline and queued for operator review.',
    aiAnalysis: alert.prescription,
    status: 'new',
    createdAt: alert.timestamp,
  };
}

function SwipeableAlertCard({
  alert,
  isSelected,
  isAcknowledged,
  onClick,
  onAcknowledge,
}: {
  alert: Alert;
  isSelected: boolean;
  isAcknowledged: boolean;
  onClick: () => void;
  onAcknowledge: (id: string) => void;
}) {
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const severityStyles = getSeverityStyles(alert.severity);

  const bind = useDrag(
    ({ movement: [mx], down, velocity: [vx] }) => {
      if (isAcknowledged) return;

      setIsDragging(down);
      const isRightSwipe = mx > 0;

      if (!down && isRightSwipe && mx > 88 && vx > 0.35) {
        setTranslateX(0);
        onAcknowledge(alert.id);
        return;
      }

      setTranslateX(down && isRightSwipe ? mx : 0);
    },
    {
      axis: 'x',
      bounds: { left: 0, right: 132 },
      rubberband: true,
    }
  );

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <div className="absolute inset-0 rounded-2xl border border-[var(--color-success)]/25 bg-[var(--color-success)]/10 flex items-center px-6">
        <div className="flex items-center gap-2 text-[var(--color-success)]">
          <CheckCircle2 className="w-4 h-4" />
          <span className="text-[11px] font-bold uppercase tracking-[0.18em]">Acknowledge Alert</span>
        </div>
      </div>

      <button
        {...bind()}
        onClick={onClick}
        style={{ transform: `translateX(${translateX}px)`, touchAction: 'pan-y' }}
        className={cn(
          'relative z-10 w-full rounded-2xl border p-4 text-left transition-all duration-300',
          'bg-[var(--color-surface)]/95 backdrop-blur-sm',
          !isDragging && 'ease-out',
          isSelected && 'border-[var(--color-primary)]/45 shadow-[0_0_0_1px_rgba(0,212,170,0.12)]',
          !isSelected && 'border-[var(--color-border)] hover:border-[var(--color-primary)]/25',
          isAcknowledged && 'border-[var(--color-success)]/20 bg-[var(--color-success)]/5 opacity-70'
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {isAcknowledged ? <CheckCircle2 className="w-4 h-4 text-[var(--color-success)]" /> : getSeverityIcon(alert.severity)}
              <span className="text-[11px] font-mono font-bold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                {alert.machineName}
              </span>
            </div>
            <h3 className={cn('mt-2 text-sm font-semibold leading-6 text-[var(--color-foreground)]', isAcknowledged && 'line-through text-[var(--color-muted)]')}>
              {alert.title}
            </h3>
          </div>

          <div className="shrink-0 text-right">
            <span className={cn('inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em]', severityStyles.chip)}>
              {alert.severity}
            </span>
            <p className="mt-2 text-[11px] text-[var(--color-muted)]">
              {new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-end justify-between gap-4">
          <p className="line-clamp-2 text-xs leading-5 text-[var(--color-muted)]">
            {alert.aiAnalysis}
          </p>
          <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-primary)]">
            Review
          </span>
        </div>
      </button>
    </div>
  );
}

export default function AlertsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>((searchParams.get('severity') as SeverityFilter) || 'all');
  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [acknowledgedIds, setAcknowledgedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const rawAlerts = await api.getAlerts();
        const mappedAlerts = (rawAlerts as BackendAlert[]).map(formatAlert);
        setAlerts(mappedAlerts);
        setSelectedAlertId((current) => {
          if (mappedAlerts.length === 0) return null;
          if (current && mappedAlerts.some((alert) => alert.id === current)) return current;
          return mappedAlerts[0].id;
        });
      } catch (error) {
        console.error('Failed to fetch alerts:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const fetchSettings = async () => {
      try {
        const settings = await api.getWhatsAppNumber();
        setWhatsappNumber(settings.whatsapp_number || '');
      } catch (error) {
        console.error('Failed to fetch settings:', error);
      }
    };

    fetchAlerts();
    fetchSettings();
    const interval = setInterval(fetchAlerts, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setQuery(searchParams.get('q') ?? '');
    setSeverityFilter((searchParams.get('severity') as SeverityFilter) || 'all');
  }, [searchParams]);

  useEffect(() => {
    const nextParams = new URLSearchParams(searchParams.toString());

    if (query.trim()) nextParams.set('q', query.trim());
    else nextParams.delete('q');

    if (severityFilter !== 'all') nextParams.set('severity', severityFilter);
    else nextParams.delete('severity');

    const nextQuery = nextParams.toString();
    const currentQuery = searchParams.toString();

    if (nextQuery !== currentQuery) {
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
    }
  }, [pathname, query, router, searchParams, severityFilter]);

  const handleUpdateNumber = async () => {
    setIsSaving(true);
    try {
      await api.updateWhatsAppNumber(whatsappNumber);
      setIsSettingsOpen(false);
    } catch (error) {
      console.error('Failed to update number:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAcknowledge = (id: string) => {
    setAcknowledgedIds((current) => (current.includes(id) ? current : [...current, id]));
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.localStorage.setItem('command-palette-alert-count', String(alerts.length));
    window.dispatchEvent(new Event('command-palette-alerts-updated'));
  }, [alerts.length]);

  const visibleAlerts = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();

    return alerts.filter((alert) => {
      const matchesSeverity = severityFilter === 'all' || alert.severity === severityFilter;
      const matchesQuery =
        !normalizedQuery ||
        [
          alert.machineId,
          alert.machineName,
          alert.title,
          alert.description,
          alert.aiAnalysis,
          alert.severity,
        ].some((value) => value.toLowerCase().includes(normalizedQuery));

      return matchesSeverity && matchesQuery;
    });
  }, [alerts, deferredQuery, severityFilter]);
  const selectedAlert =
    visibleAlerts.find((alert) => alert.id === selectedAlertId) ||
    visibleAlerts[0] ||
    null;

  const criticalCount = alerts.filter((alert) => alert.severity === 'critical').length;
  const warningCount = alerts.filter((alert) => alert.severity === 'warning').length;
  const acknowledgedCount = alerts.filter((alert) => acknowledgedIds.includes(alert.id)).length;

  if (isLoading) {
    return <div className="p-12 text-center font-mono text-[var(--color-muted)]">Scanning Factory Matrix for Anomalies...</div>;
  }

  return (
    <div className="flex min-h-[calc(100vh-80px)] flex-col gap-6 pb-20 animate-in fade-in duration-500">
      <section className="relative overflow-hidden rounded-[28px] border border-[var(--color-border)] bg-[linear-gradient(135deg,rgba(11,14,18,0.96),rgba(16,22,28,0.92))] p-5 md:p-7">
        <div className="absolute -right-12 top-0 h-40 w-40 rounded-full bg-[var(--color-destructive)]/10 blur-[70px]" />
        <div className="absolute bottom-0 left-1/3 h-28 w-28 rounded-full bg-[var(--color-primary)]/10 blur-[60px]" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-white/5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-muted)]">
              <BellRing className="h-3.5 w-3.5 text-[var(--color-primary)]" />
              Alert Command Surface
            </div>
            <h1 className="mt-4 text-2xl font-bold md:text-3xl">Alert & Notification Center</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-muted)]">
              Review machine anomalies, prioritize the highest-risk assets, and route critical notifications without leaving the queue.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/70 px-4 py-3 text-sm font-medium hover:bg-[var(--color-border)]/40"
            >
              <Settings className="h-4 w-4" />
              Notification Settings
            </button>
            <div className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/8 px-4 py-3 text-sm">
              <ShieldAlert className="h-4 w-4 text-[var(--color-primary)]" />
              <span className="text-[var(--color-muted)]">Escalation route:</span>
              <span className="font-mono font-semibold text-[var(--color-foreground)]">
                {whatsappNumber || 'Not configured'}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Open Alerts" value={alerts.length.toString()} tone="neutral" />
        <MetricCard label="Critical" value={criticalCount.toString()} tone="critical" />
        <MetricCard label="Warning" value={warningCount.toString()} tone="warning" />
        <MetricCard label="Acknowledged" value={acknowledgedCount.toString()} tone="success" />
      </section>

      {alerts.length === 0 ? (
        <div className="relative flex min-h-[420px] flex-1 flex-col items-center justify-center overflow-hidden rounded-3xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)]/40 px-6 text-center">
          <div className="absolute h-64 w-64 rounded-full bg-[var(--color-success)]/10 blur-[90px]" />
          <div className="relative z-10 flex max-w-md flex-col items-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-[var(--color-success)]/20 bg-[var(--color-success)]/10">
              <CheckCircle2 className="h-10 w-10 text-[var(--color-success)]" />
            </div>
            <h2 className="text-xl font-bold">No Active Alerts</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
              All facility systems and machine agents are operating within nominal parameters. Telemetry is being monitored continuously.
            </p>
          </div>
        </div>
      ) : (
        <section className="grid min-h-0 flex-1 gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
          <div className={cn('flex min-h-0 flex-col gap-4', selectedAlertId && 'xl:flex')}>
            <div className="glass-panel rounded-2xl p-4">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-muted)]">Queue</p>
                    <h2 className="mt-1 text-lg font-semibold">Live triage stream</h2>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                    <Filter className="h-3.5 w-3.5" />
                    {visibleAlerts.length} visible
                  </div>
                </div>

                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted)]" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search by machine, reason, prescription, or severity"
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] py-3 pl-10 pr-4 text-sm outline-none transition-colors focus:border-[var(--color-primary)]"
                  />
                </div>

                <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                  {(['all', 'critical', 'warning', 'info'] as SeverityFilter[]).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setSeverityFilter(filter)}
                      className={cn(
                        'shrink-0 rounded-full border px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] transition-colors',
                        severityFilter === filter
                          ? 'border-[var(--color-primary)]/30 bg-[var(--color-primary)] text-[#08110e]'
                          : 'border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-muted)] hover:text-[var(--color-foreground)]'
                      )}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="min-h-0 space-y-3 overflow-y-auto pr-1 custom-scrollbar">
              {visibleAlerts.map((alert) => (
                <SwipeableAlertCard
                  key={alert.id}
                  alert={alert}
                  isSelected={selectedAlert?.id === alert.id}
                  isAcknowledged={acknowledgedIds.includes(alert.id)}
                  onClick={() => setSelectedAlertId(alert.id)}
                  onAcknowledge={handleAcknowledge}
                />
              ))}

              {visibleAlerts.length === 0 && (
                <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)]/40 p-8 text-center text-sm text-[var(--color-muted)]">
                  No alerts match the current search and severity filter.
                </div>
              )}
            </div>
          </div>

          {selectedAlert && (
            <div className={cn(
              'glass-panel relative flex min-h-[560px] flex-col overflow-hidden rounded-3xl',
              selectedAlertId ? 'fixed inset-0 z-50 rounded-none bg-[#0a0d12] xl:static xl:min-h-0 xl:rounded-3xl xl:bg-transparent' : ''
            )}>
              <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-[var(--color-primary)]/8 blur-[90px]" />

              <div className="relative flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4 md:px-6">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => setSelectedAlertId(null)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-border)] text-[var(--color-muted)] hover:text-[var(--color-foreground)] xl:hidden"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-muted)]">Active Investigation</p>
                    <h2 className="truncate text-lg font-semibold md:text-xl">{selectedAlert.title}</h2>
                  </div>
                </div>

                <span className={cn('hidden rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] md:inline-flex', getSeverityStyles(selectedAlert.severity).chip)}>
                  {selectedAlert.severity}
                </span>
              </div>

              <div className="relative flex-1 overflow-y-auto px-5 py-5 md:px-6 custom-scrollbar">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
                  <div className="space-y-4">
                    <div className={cn('rounded-2xl border p-5', getSeverityStyles(selectedAlert.severity).panel)}>
                      <div className="flex items-start gap-4">
                        <div className={cn('flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border', getSeverityStyles(selectedAlert.severity).accent)}>
                          {selectedAlert.severity === 'critical' ? (
                            <AlertTriangle className="h-7 w-7" />
                          ) : selectedAlert.severity === 'warning' ? (
                            <AlertCircle className="h-7 w-7" />
                          ) : (
                            <Info className="h-7 w-7" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-background)] px-2.5 py-1 text-[11px] font-mono font-bold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                              {selectedAlert.machineName}
                            </span>
                            {acknowledgedIds.includes(selectedAlert.id) && (
                              <span className="rounded-full border border-[var(--color-success)]/20 bg-[var(--color-success)]/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-success)]">
                                Acknowledged
                              </span>
                            )}
                          </div>
                          <p className="mt-3 text-sm leading-6 text-[var(--color-foreground)]">{selectedAlert.description}</p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[var(--color-primary)]/18 bg-[linear-gradient(180deg,rgba(0,212,170,0.08),rgba(0,212,170,0.03))] p-5">
                      <div className="flex items-center gap-2 text-[var(--color-primary)]">
                        <SparklesIcon />
                        <h3 className="text-[11px] font-bold uppercase tracking-[0.18em]">AI Strategic Prescription</h3>
                      </div>
                      <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[var(--color-foreground)]">{selectedAlert.aiAnalysis}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <aside className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)]/80 p-4">
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-muted)]">Ops Metadata</p>
                      <div className="mt-4 space-y-3">
                        <InfoRow label="Created" value={new Date(selectedAlert.createdAt).toLocaleString()} />
                        <InfoRow label="Asset" value={selectedAlert.machineId} />
                        <InfoRow label="Severity" value={selectedAlert.severity} />
                        <InfoRow label="Delivery" value={whatsappNumber || 'Not configured'} />
                      </div>
                    </aside>

                    <aside className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-background)]/80 p-4">
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-muted)]">Recommended Next Step</p>
                      <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
                        {selectedAlert.severity === 'critical'
                          ? 'Dispatch a technician immediately and reduce machine load until the fault source is isolated.'
                          : selectedAlert.severity === 'warning'
                            ? 'Inspect the asset during the next maintenance window and compare live telemetry with baseline thresholds.'
                            : 'Monitor the machine and validate whether the event should remain informational or be promoted.'}
                      </p>
                    </aside>
                  </div>
                </div>
              </div>

              <div className="relative border-t border-[var(--color-border)] bg-[var(--color-surface)]/85 px-5 py-4 md:px-6">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    onClick={() => handleAcknowledge(selectedAlert.id)}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-3 font-bold text-[#08110e] hover:brightness-110"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Acknowledge Alert
                  </button>
                  <Link
                    href={`/dashboard/machines/${selectedAlert.machineId}`}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 font-medium hover:bg-[var(--color-border)]/40"
                  >
                    Open Machine Detail
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {isSettingsOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] p-6">
              <h3 className="flex items-center gap-2 text-xl font-bold">
                <Settings className="h-5 w-5 text-[var(--color-primary)]" />
                Notification Settings
              </h3>
              <button onClick={() => setIsSettingsOpen(false)} className="text-[var(--color-muted)] hover:text-white">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6">
              <label className="block text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                WhatsApp Alert Number
              </label>
              <div className="relative mt-3">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[var(--color-muted)]">
                  <Phone className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  value={whatsappNumber}
                  onChange={(event) => setWhatsappNumber(event.target.value)}
                  placeholder="+919876543210"
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] py-3 pl-10 pr-4 text-sm outline-none transition-colors focus:border-[var(--color-primary)]"
                />
              </div>
              <p className="mt-3 text-[11px] leading-5 text-[var(--color-muted)]">
                Enter your full phone number with country code. Critical machine anomalies will be escalated to this WhatsApp account.
              </p>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={handleUpdateNumber}
                  disabled={isSaving}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] py-3 font-bold text-[#08110e] disabled:opacity-50"
                >
                  {isSaving ? (
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#08110e]/30 border-t-[#08110e]" />
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Configuration
                    </>
                  )}
                </button>
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-6 text-sm font-medium hover:bg-[var(--color-border)]/40"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'neutral' | 'critical' | 'warning' | 'success';
}) {
  const toneClass =
    tone === 'critical'
      ? 'border-[var(--color-destructive)]/20 bg-[var(--color-destructive)]/8'
      : tone === 'warning'
        ? 'border-[var(--color-warning)]/20 bg-[var(--color-warning)]/8'
        : tone === 'success'
          ? 'border-[var(--color-success)]/20 bg-[var(--color-success)]/8'
          : 'border-[var(--color-border)] bg-[var(--color-surface)]';

  return (
    <div className={cn('rounded-2xl border p-4', toneClass)}>
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-muted)]">{label}</p>
      <p className="mt-2 text-3xl font-bold font-mono">{value}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-muted)]">{label}</span>
      <span className="text-sm text-[var(--color-foreground)]">{value}</span>
    </div>
  );
}

function SparklesIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    </svg>
  );
}
