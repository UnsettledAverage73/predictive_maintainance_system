'use client';

import { useState } from 'react';
import { Activity, AlertCircle, Zap, Wrench } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import DashboardGrid from '@/components/DashboardGrid';
import AlertsPanel from '@/components/AlertsPanel';
import PredictiveInsights from '@/components/PredictiveInsights';

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar open={sidebarOpen} onOpenChange={setSidebarOpen} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        
        <main className="flex-1 overflow-auto">
          <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
            {/* Summary Row with Icons */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Total Equipment Card */}
              <div className="bg-card border border-border rounded-xl p-5 hover:border-primary/50 transition-all duration-300 group">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-2 font-medium">Total Equipment</p>
                    <p className="text-3xl font-black text-foreground">12</p>
                    <p className="text-xs text-success mt-2">✦ All operational</p>
                  </div>
                  <div className="p-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Activity className="w-6 h-6 text-primary" />
                  </div>
                </div>
              </div>

              {/* Active Alerts Card */}
              <div className="bg-card border border-border rounded-xl p-5 hover:border-destructive/50 transition-all duration-300 group">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-2 font-medium">Active Alerts</p>
                    <p className="text-3xl font-black text-foreground">3</p>
                    <p className="text-xs text-destructive mt-2">⚠ 2 warnings, 1 critical</p>
                  </div>
                  <div className="p-3 rounded-lg bg-destructive/10 group-hover:bg-destructive/20 transition-colors">
                    <AlertCircle className="w-6 h-6 text-destructive" />
                  </div>
                </div>
              </div>

              {/* Avg Efficiency Card */}
              <div className="bg-card border border-border rounded-xl p-5 hover:border-secondary/50 transition-all duration-300 group">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-2 font-medium">Avg Efficiency</p>
                    <p className="text-3xl font-black text-foreground">94%</p>
                    <p className="text-xs text-success mt-2">↑ +2% from last week</p>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/10 group-hover:bg-secondary/20 transition-colors">
                    <Zap className="w-6 h-6 text-secondary" />
                  </div>
                </div>
              </div>

              {/* Maintenance Due Card */}
              <div className="bg-card border border-border rounded-xl p-5 hover:border-warning/50 transition-all duration-300 group">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-2 font-medium">Maintenance Due</p>
                    <p className="text-3xl font-black text-foreground">2</p>
                    <p className="text-xs text-warning mt-2">⏰ Within 30 days</p>
                  </div>
                  <div className="p-3 rounded-lg bg-warning/10 group-hover:bg-warning/20 transition-colors">
                    <Wrench className="w-6 h-6 text-warning" />
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Equipment Cards - Left */}
              <div className="lg:col-span-2">
                <DashboardGrid />
              </div>

              {/* Right Sidebar - Alerts */}
              <div className="lg:col-span-1">
                <AlertsPanel />
              </div>
            </div>

            {/* Predictive Insights Section */}
            <PredictiveInsights />
          </div>
        </main>
      </div>
    </div>
  );
}
