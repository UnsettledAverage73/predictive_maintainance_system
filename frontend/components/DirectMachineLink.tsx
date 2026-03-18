'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Send,
  Loader2,
  AlertCircle,
  Lightbulb,
  Zap,
  ShieldCheck,
  Activity
} from 'lucide-react';
import { sendChatMessage } from '@/lib/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface DirectMachineLinkProps {
  machineId: string;
  machineName: string;
  equipmentData?: {
    temperature: number;
    vibration: number;
    pressure: number;
    runtimeHours: number;
    efficiency: number;
    lastMaintenance: string;
    load_factor?: number; // Added for Sovereign Actuation context
    status?: string;
  };
}

export default function DirectMachineLink({
  machineId,
  machineName,
  equipmentData,
}: DirectMachineLinkProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Sovereign Link Established. I am monitoring ${machineName}. My strategic reasoning layer is active. How can I assist with your industrial protocols today?`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logic
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const data = await sendChatMessage({
        messages: [...messages, userMessage],
        machineId,
        machineName,
        equipmentData, // Passes telemetry + load_factor to the LLM
      });

      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
      }]);
    } catch (error: any) {
      console.error('Link Error:', error);
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `⚠️ Link Failure: ${error.message || 'Check Groq/Sarvam API connectivity.'}`,
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const isThrottled = (equipmentData?.load_factor ?? 1.0) < 1.0;

  return (
    <Card className="flex flex-col h-full bg-card border-border shadow-2xl">
      {/* --- SOVEREIGN HEADER --- */}
      <div className="bg-secondary/30 p-4 border-b border-border flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <h3 className="text-sm font-black uppercase tracking-tighter text-foreground">
              Direct Machine Link: {machineId}
            </h3>
          </div>
          <p className="text-[10px] text-muted-foreground font-mono">
            SECURE_CHANNEL_ID: {Math.random().toString(36).substring(7).toUpperCase()}
          </p>
        </div>
        {isThrottled && (
          <Badge variant="outline" className="animate-pulse border-amber-500 text-amber-500 bg-amber-500/10 gap-1 text-[10px]">
            <Zap className="w-3 h-3" /> ACTUATOR_THROTTLED
          </Badge>
        )}
      </div>

      <ScrollArea className="flex-1 p-4 bg-background/50">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-primary" />
                </div>
              )}

              <div
                className={`max-w-[85%] px-4 py-3 rounded-xl shadow-sm ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-tr-none font-medium'
                    : 'bg-muted border border-border rounded-tl-none text-foreground'
                }`}
              >
                <p className="text-xs leading-relaxed">
                  {message.content}
                </p>
                <p className={`text-[9px] mt-2 opacity-60 font-mono`}>
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Loader2 className="w-4 h-4 text-primary animate-spin" />
              </div>
              <div className="bg-muted px-4 py-3 rounded-xl border border-border">
                <p className="text-[10px] font-bold animate-pulse text-muted-foreground uppercase tracking-widest">
                  Analyzing Telemetry Stream...
                </p>
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* --- CONTEXTUAL DATA FOOTER --- */}
      <div className="border-t border-border p-4 bg-secondary/10 space-y-3">
        {equipmentData && (
          <div className="grid grid-cols-2 gap-2">
            <div className="text-[9px] bg-background/60 p-2 rounded border border-border flex items-center justify-between">
              <span className="text-muted-foreground uppercase">Load Factor</span>
              <span className={`font-bold ${isThrottled ? 'text-amber-500' : 'text-emerald-500'}`}>
                {(equipmentData.load_factor ?? 1.0) * 100}%
              </span>
            </div>
            <div className="text-[9px] bg-background/60 p-2 rounded border border-border flex items-center justify-between">
              <span className="text-muted-foreground uppercase">Thermal State</span>
              <span className="font-bold text-foreground">{equipmentData.temperature}°C</span>
            </div>
          </div>
        )}
        
        <div className="flex gap-2">
          <Input
            placeholder="Query Digital Twin..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSendMessage();
            }}
            disabled={isLoading}
            className="bg-background border-border text-xs focus-visible:ring-primary"
          />
          <Button
            onClick={handleSendMessage}
            disabled={isLoading || !input.trim()}
            size="icon"
            className="bg-primary hover:bg-primary/90 shrink-0"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}
