'use client';

import { useState, useEffect } from 'react';
import { Zap, Loader2 } from 'lucide-react';
import { Equipment } from '@/lib/mockData';
import { fetchEquipment } from '@/lib/api';
import EquipmentCard from './EquipmentCard';

export default function DashboardGrid() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await fetchEquipment();
        setEquipment(data);
      } catch (err) {
        console.error('Failed to load equipment:', err);
        setError('Connection to backend failed. Please ensure the Python API is running.');
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
    // Refresh every 5 seconds for "real-time" feel
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin mb-4" />
        <p>Connecting to industrial sensor network...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-6 text-center">
        <p className="text-destructive font-medium">{error}</p>
        <p className="text-sm text-muted-foreground mt-2">Run `uv run python src/api.py` to start the backend.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <div className="p-2 rounded-lg bg-primary/10">
          <Zap className="w-5 h-5 text-primary" />
        </div>
        <h2 className="text-2xl font-black text-foreground">Active Equipment</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        {equipment.map((eq) => (
          <EquipmentCard key={eq.id} equipment={eq} />
        ))}
      </div>
    </div>
  );
}
