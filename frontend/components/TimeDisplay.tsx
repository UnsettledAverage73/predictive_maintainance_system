'use client';

import { useEffect, useState } from 'react';

interface TimeDisplayProps {
  timestamp: string;
}

export default function TimeDisplay({ timestamp }: TimeDisplayProps) {
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    setTime(new Date(timestamp).toLocaleTimeString());
  }, [timestamp]);

  if (time === null) {
    return null;
  }

  return <p className="text-xs text-muted-foreground/50 mt-2">{time}</p>;
}
