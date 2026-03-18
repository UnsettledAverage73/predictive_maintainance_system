'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Settings,
  Bell,
  Shield,
  Database,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('alerts');
  const [temperatureThreshold, setTemperatureThreshold] = useState('85');
  const [vibrationThreshold, setVibrationThreshold] = useState('8.5');
  const [pressureThreshold, setPressureThreshold] = useState('120');
  const [maintenanceInterval, setMaintenanceInterval] = useState('90');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="border-b border-border p-6">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Settings className="w-8 h-8 text-primary" />
            Settings & Configuration
          </h1>
          <p className="text-muted-foreground mt-2">
            Configure monitoring thresholds, alerts, and system preferences
          </p>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Navigation */}
          <div className="md:col-span-1">
            <div className="space-y-2 sticky top-24">
              {[
                { id: 'alerts', label: 'Alert Thresholds', icon: Bell },
                { id: 'security', label: 'Security', icon: Shield },
                { id: 'data', label: 'Data & Export', icon: Database },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? 'bg-primary/20 text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/20'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content */}
          <div className="md:col-span-3 space-y-6">
            {/* Alert Thresholds */}
            {activeTab === 'alerts' && (
              <Card className="p-6 bg-card border-border">
                <h2 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
                  <Bell className="w-5 h-5 text-primary" />
                  Alert Thresholds
                </h2>

                <div className="space-y-6">
                  <div>
                    <Label htmlFor="temp" className="text-foreground mb-2 block">
                      Temperature Alert Threshold (°C)
                    </Label>
                    <p className="text-sm text-muted-foreground mb-2">
                      Trigger alert when temperature exceeds this value
                    </p>
                    <Input
                      id="temp"
                      type="number"
                      value={temperatureThreshold}
                      onChange={(e) => setTemperatureThreshold(e.target.value)}
                      className="bg-input border-border"
                    />
                  </div>

                  <div>
                    <Label htmlFor="vib" className="text-foreground mb-2 block">
                      Vibration Alert Threshold (mm/s)
                    </Label>
                    <p className="text-sm text-muted-foreground mb-2">
                      Alert when vibration exceeds ISO 20816 limits
                    </p>
                    <Input
                      id="vib"
                      type="number"
                      step="0.1"
                      value={vibrationThreshold}
                      onChange={(e) => setVibrationThreshold(e.target.value)}
                      className="bg-input border-border"
                    />
                  </div>

                  <div>
                    <Label
                      htmlFor="pressure"
                      className="text-foreground mb-2 block"
                    >
                      Pressure Alert Threshold (bar)
                    </Label>
                    <p className="text-sm text-muted-foreground mb-2">
                      Trigger alert when pressure drops below this value
                    </p>
                    <Input
                      id="pressure"
                      type="number"
                      value={pressureThreshold}
                      onChange={(e) => setPressureThreshold(e.target.value)}
                      className="bg-input border-border"
                    />
                  </div>

                  <div>
                    <Label
                      htmlFor="maintenance"
                      className="text-foreground mb-2 block"
                    >
                      Maintenance Interval (days)
                    </Label>
                    <p className="text-sm text-muted-foreground mb-2">
                      Recommended interval between preventive maintenance
                    </p>
                    <Input
                      id="maintenance"
                      type="number"
                      value={maintenanceInterval}
                      onChange={(e) => setMaintenanceInterval(e.target.value)}
                      className="bg-input border-border"
                    />
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-muted/20 rounded">
                    <input
                      type="checkbox"
                      id="email"
                      checked={emailNotifications}
                      onChange={(e) => setEmailNotifications(e.target.checked)}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <label htmlFor="email" className="text-foreground cursor-pointer">
                      Enable email notifications for critical alerts
                    </label>
                  </div>

                  {saved && (
                    <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded">
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                      <span className="text-green-300 text-sm">
                        Settings saved successfully
                      </span>
                    </div>
                  )}

                  <Button
                    onClick={handleSave}
                    className="w-full bg-primary hover:bg-primary/90"
                  >
                    Save Alert Settings
                  </Button>
                </div>
              </Card>
            )}

            {/* Security */}
            {activeTab === 'security' && (
              <Card className="p-6 bg-card border-border">
                <h2 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  Security Settings
                </h2>

                <div className="space-y-4">
                  <div className="p-4 bg-muted/20 rounded border border-muted/40">
                    <p className="text-sm text-foreground font-medium mb-2">
                      API Keys
                    </p>
                    <p className="text-xs text-muted-foreground mb-3">
                      Manage access tokens for external integrations
                    </p>
                    <Button variant="outline" className="text-foreground border-muted">
                      View API Keys
                    </Button>
                  </div>

                  <div className="p-4 bg-muted/20 rounded border border-muted/40">
                    <p className="text-sm text-foreground font-medium mb-2">
                      Access Control
                    </p>
                    <p className="text-xs text-muted-foreground mb-3">
                      Manage user roles and permissions
                    </p>
                    <Button variant="outline" className="text-foreground border-muted">
                      Manage Users
                    </Button>
                  </div>

                  <div className="p-4 bg-destructive/10 border border-destructive/30 rounded">
                    <p className="text-sm text-foreground font-medium mb-2">
                      Two-Factor Authentication
                    </p>
                    <p className="text-xs text-muted-foreground mb-3">
                      Enhance security with 2FA
                    </p>
                    <Button className="bg-destructive hover:bg-destructive/90">
                      Enable 2FA
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* Data & Export */}
            {activeTab === 'data' && (
              <Card className="p-6 bg-card border-border">
                <h2 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
                  <Database className="w-5 h-5 text-primary" />
                  Data & Export
                </h2>

                <div className="space-y-4">
                  <div className="p-4 bg-muted/20 rounded border border-muted/40">
                    <p className="text-sm text-foreground font-medium mb-2">
                      Export Equipment Data
                    </p>
                    <p className="text-xs text-muted-foreground mb-3">
                      Export all equipment metrics and history as CSV
                    </p>
                    <Button variant="outline" className="text-foreground border-muted">
                      Download CSV
                    </Button>
                  </div>

                  <div className="p-4 bg-muted/20 rounded border border-muted/40">
                    <p className="text-sm text-foreground font-medium mb-2">
                      Data Retention
                    </p>
                    <p className="text-xs text-muted-foreground mb-3">
                      Current storage: 2.4 GB / 10 GB
                    </p>
                    <div className="w-full bg-muted/40 rounded-full h-2 mb-2">
                      <div className="bg-primary h-2 rounded-full" style={{ width: '24%' }} />
                    </div>
                  </div>

                  <div className="p-4 bg-destructive/10 border border-destructive/30 rounded flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-foreground font-medium">
                        Danger Zone
                      </p>
                      <p className="text-xs text-muted-foreground mb-3">
                        This action cannot be undone
                      </p>
                      <Button className="bg-destructive hover:bg-destructive/90">
                        Delete All Data
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
