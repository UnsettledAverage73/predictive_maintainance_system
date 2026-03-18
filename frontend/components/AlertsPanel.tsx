'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, AlertTriangle, Info, X, Loader2 } from 'lucide-react';
import { fetchAlerts } from '@/lib/api';
import TimeDisplay from './TimeDisplay';

const severityConfig: any = {
  critical: { bg: 'bg-red-500/10', border: 'border-red-500/30', icon: AlertCircle, color: 'text-red-400' },
  high: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', icon: AlertTriangle, color: 'text-orange-400' },
  medium: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', icon: AlertTriangle, color: 'text-yellow-400' },
  low: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', icon: Info, color: 'text-blue-400' },
};

export default function AlertsPanel() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadAlerts() {
      try {
        const data = await fetchAlerts();
        setAlerts(data);
      } catch (err) {
        console.error('Failed to load alerts:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadAlerts();
    const interval = setInterval(loadAlerts, 10000);
    return () => clearInterval(interval);
  }, []);

  const visibleAlerts = alerts.filter(alert => !dismissedAlerts.has(String(alert.id)));

  const dismissAlert = (id: string) => {
    const newDismissed = new Set(dismissedAlerts);
    newDismissed.add(String(id));
    setDismissedAlerts(newDismissed);
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6 h-fit sticky top-24 hover:border-destructive/30 transition-all">
      <div className="flex items-center gap-3 justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-destructive/10">
            <AlertCircle className="w-5 h-5 text-destructive" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Active Alerts</h2>
        </div>
        <span className="bg-destructive/20 text-destructive px-2.5 py-1 rounded-full text-xs font-black">
          {visibleAlerts.length}
        </span>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : visibleAlerts.length > 0 ? (
          visibleAlerts.map((alert) => {
            const severity = (alert.severity || 'low').toLowerCase();
            const config = severityConfig[severity] || severityConfig.low;
            const IconComponent = config.icon;
            
            return (
              <div
                key={alert.id}
                className={`${config.bg} border ${config.border} rounded-lg p-3 group`}
              >
                <div className="flex items-start gap-3">
                  <IconComponent className={`w-4 h-4 mt-1 flex-shrink-0 ${config.color}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${config.color}`}>{alert.equipment_id}</p>
                    <p className="text-xs text-muted-foreground mt-1">{alert.reason || alert.message}</p>
                    {alert.prescription && (
                      <p className="text-[10px] bg-background/50 p-1 rounded mt-2 border border-border/50">
                        <span className="font-bold">Prescription:</span> {alert.prescription}
                      </p>
                    )}
                    <TimeDisplay timestamp={alert.timestamp} />
                  </div>
                  <button
                    onClick={() => dismissAlert(alert.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No active alerts</p>
          </div>
        )}
      </div>

      {dismissedAlerts.size > 0 && (
        <button
          onClick={() => setDismissedAlerts(new Set())}
          className="mt-4 w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-2 border-t border-border"
        >
          Show {dismissedAlerts.size} dismissed
        </button>
      )}
    </div>
  );
}
