'use client';

import { AlertTriangle, TrendingUp, DollarSign } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card } from '@/components/ui/card';

const failureTimelineData = [
  { equipment: 'Turbine D4', daysUntilFailure: 2 },
  { equipment: 'Motor B2', daysUntilFailure: 8 },
  { equipment: 'Fan F6', daysUntilFailure: 15 },
  { equipment: 'Pump A1', daysUntilFailure: 45 },
  { equipment: 'Compressor C3', daysUntilFailure: 60 },
];

const healthTrendData = [
  { date: 'Mon', healthScore: 82 },
  { date: 'Tue', healthScore: 80 },
  { date: 'Wed', healthScore: 78 },
  { date: 'Thu', healthScore: 75 },
  { date: 'Fri', healthScore: 72 },
  { date: 'Sat', healthScore: 70 },
  { date: 'Sun', healthScore: 68 },
];

const costPredictionData = [
  { month: 'Jan', maintenance: 5000, downtime: 2000 },
  { month: 'Feb', maintenance: 5500, downtime: 2200 },
  { month: 'Mar', maintenance: 6200, downtime: 2800 },
  { month: 'Apr', maintenance: 7100, downtime: 3500 },
  { month: 'May', maintenance: 8500, downtime: 4200 },
];

export default function PredictiveInsights() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <div className="p-2 rounded-lg bg-accent/10">
          <TrendingUp className="w-5 h-5 text-accent" />
        </div>
        <h2 className="text-2xl font-black text-foreground">Predictive Insights</h2>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Failure Timeline */}
        <Card className="bg-card border-border p-6 rounded-xl hover:border-destructive/50 transition-all">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <h3 className="font-bold text-foreground">Failure Timeline</h3>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={failureTimelineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.2 0 0)" />
              <XAxis dataKey="equipment" stroke="oklch(0.65 0 0)" fontSize={12} />
              <YAxis stroke="oklch(0.65 0 0)" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'oklch(0.12 0 0)',
                  border: '1px solid oklch(0.2 0 0)',
                  borderRadius: '0.5rem',
                }}
                labelStyle={{ color: 'oklch(0.95 0 0)' }}
              />
              <Bar dataKey="daysUntilFailure" fill="oklch(0.6 0.2 25)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Health Score Trend */}
        <Card className="bg-card border-border p-6 rounded-xl hover:border-accent/50 transition-all">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-accent" />
            <h3 className="font-bold text-foreground">Fleet Health Trend</h3>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={healthTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.2 0 0)" />
              <XAxis dataKey="date" stroke="oklch(0.65 0 0)" fontSize={12} />
              <YAxis stroke="oklch(0.65 0 0)" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'oklch(0.12 0 0)',
                  border: '1px solid oklch(0.2 0 0)',
                  borderRadius: '0.5rem',
                }}
                labelStyle={{ color: 'oklch(0.95 0 0)' }}
              />
              <Line
                type="monotone"
                dataKey="healthScore"
                stroke="oklch(0.65 0.2 264)"
                strokeWidth={2}
                dot={{ fill: 'oklch(0.65 0.2 264)', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Cost Prediction */}
        <Card className="bg-card border-border p-6 rounded-xl hover:border-warning/50 transition-all">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-5 h-5 text-warning" />
            <h3 className="font-bold text-foreground">Cost Forecast</h3>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={costPredictionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.2 0 0)" />
              <XAxis dataKey="month" stroke="oklch(0.65 0 0)" fontSize={12} />
              <YAxis stroke="oklch(0.65 0 0)" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'oklch(0.12 0 0)',
                  border: '1px solid oklch(0.2 0 0)',
                  borderRadius: '0.5rem',
                }}
                labelStyle={{ color: 'oklch(0.95 0 0)' }}
              />
              <Legend wrapperStyle={{ color: 'oklch(0.95 0 0)' }} />
              <Bar dataKey="maintenance" fill="oklch(0.65 0.2 264)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="downtime" fill="oklch(0.6 0.2 25)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
