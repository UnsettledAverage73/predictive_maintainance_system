'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, AlertTriangle, TrendingUp, Clock, Loader2 } from 'lucide-react';
import DirectMachineLink from '@/components/DirectMachineLink';
import { fetchEquipment } from '@/lib/api';
import { Equipment } from '@/lib/mockData';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export default function EquipmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [equipmentItem, setEquipmentItem] = useState<Equipment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await fetchEquipment();
        const found = data.find((eq: Equipment) => eq.id === id);
        setEquipmentItem(found || null);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!equipmentItem) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <Card className="p-8 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Equipment not found
          </h1>
          <Button onClick={() => router.back()}>Go Back</Button>
        </Card>
      </div>
    );
  }

  // Generate sample trend data
  const trendData = Array.from({ length: 24 }, (_, i) => ({
    time: `${i}:00`,
    temperature:
      equipmentItem.temperature +
      Math.random() * 10 -
      5,
    vibration:
      equipmentItem.vibration + Math.random() * 2 - 1,
    pressure:
      equipmentItem.pressure + Math.random() * 5 - 2.5,
    efficiency:
      equipmentItem.efficiency + Math.random() * 10 - 5,
  }));

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="border-b border-border p-4 md:p-6 sticky top-0 bg-background/95 backdrop-blur z-10">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                {equipmentItem.name}
              </h1>
              <p className="text-muted-foreground mt-1">
                ID: {equipmentItem.id} • Type: {equipmentItem.type}
              </p>
            </div>
            <div
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                equipmentItem.status === 'healthy'
                  ? 'bg-green-500/20 text-green-300'
                  : equipmentItem.status === 'warning'
                    ? 'bg-yellow-500/20 text-yellow-300'
                    : 'bg-red-500/20 text-red-300'
              }`}
            >
              {equipmentItem.status.charAt(0).toUpperCase() +
                equipmentItem.status.slice(1)}
            </div>
          </div>
        </div>

        <div className="p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4 bg-card border-border">
                <p className="text-xs text-muted-foreground mb-2">Temperature</p>
                <p className="text-2xl font-bold text-foreground">
                  {equipmentItem.temperature}°C
                </p>
                <p className="text-xs text-muted-foreground mt-1">Normal</p>
              </Card>

              <Card className="p-4 bg-card border-border">
                <p className="text-xs text-muted-foreground mb-2">Vibration</p>
                <p className="text-2xl font-bold text-foreground">
                  {equipmentItem.vibration}
                </p>
                <p className="text-xs text-muted-foreground mt-1">mm/s</p>
              </Card>

              <Card className="p-4 bg-card border-border">
                <p className="text-xs text-muted-foreground mb-2">Pressure</p>
                <p className="text-2xl font-bold text-foreground">
                  {equipmentItem.pressure}
                </p>
                <p className="text-xs text-muted-foreground mt-1">bar</p>
              </Card>

              <Card className="p-4 bg-card border-border">
                <p className="text-xs text-muted-foreground mb-2">Efficiency</p>
                <p className="text-2xl font-bold text-foreground">
                  {equipmentItem.efficiency}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">Optimal</p>
              </Card>
            </div>

            {/* Temperature Trend */}
            <Card className="p-6 bg-card border-border">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                24-Hour Trends
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.3} />
                      <stop
                        offset="95%"
                        stopColor="#a78bfa"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,100,100,0.2)" />
                  <XAxis
                    dataKey="time"
                    stroke="rgba(200,200,200,0.5)"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis stroke="rgba(200,200,200,0.5)" style={{ fontSize: '12px' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(20,20,20,0.8)',
                      border: '1px solid rgba(100,100,100,0.3)',
                      borderRadius: '8px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="temperature"
                    stroke="#a78bfa"
                    fillOpacity={1}
                    fill="url(#colorTemp)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Card>

            {/* Maintenance History */}
            <Card className="p-6 bg-card border-border">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Maintenance Schedule
              </h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Last Maintenance
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {equipmentItem.lastMaintenance}
                    </p>
                  </div>
                  <p className="text-sm text-primary font-medium">Completed</p>
                </div>

                <div className="flex items-center justify-between p-3 bg-warning/10 rounded border border-warning/30">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Next Scheduled
                    </p>
                    <p className="text-xs text-muted-foreground">
                      in 45 days
                    </p>
                  </div>
                  <p className="text-sm text-warning font-medium">Upcoming</p>
                </div>

                <div className="flex items-center justify-between p-3 bg-destructive/10 rounded border border-destructive/30">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Predicted Issue
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Bearing degradation likely in 30 days
                    </p>
                  </div>
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                </div>
              </div>
            </Card>
          </div>

          {/* Sidebar - AI Chat */}
          <div className="lg:col-span-1">
            <DirectMachineLink
              machineId={equipmentItem.id}
              machineName={equipmentItem.name}
              equipmentData={{
                temperature: equipmentItem.temperature,
                vibration: equipmentItem.vibration,
                pressure: equipmentItem.pressure,
                runtimeHours: equipmentItem.runtimeHours,
                efficiency: equipmentItem.efficiency,
                lastMaintenance: equipmentItem.lastMaintenance,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
