"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { ChatMessage } from "@/types";
import { Send, Loader2, BrainCircuit } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface MachineAgentChatProps {
  machineId: string;
  machineName: string;
  className?: string;
}

export function MachineAgentChat({ machineId, machineName, className }: MachineAgentChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sessionId = useMemo(() => `sess-machine-${machineId}-${Date.now()}`, [machineId]);

  useEffect(() => {
    // Auto-trigger initial analysis on load
    const triggerInitialAnalysis = async () => {
      setIsLoading(true);
      try {
        const response = await api.chat({
          messages: [{
            role: "user",
            content: "Provide a complete machine health summary with sections for asset context, telemetry analysis, active threats, likely root cause, urgency, and recommended next action."
          }],
          machineId: machineId,
          machineName: machineName,
          sessionId: sessionId
        });

        const assistantMsg: ChatMessage = {
          id: Date.now().toString(),
          role: "assistant",
          content: response.message,
          timestamp: new Date().toISOString(),
          agentType: "Orchestrator Core"
        };

        setMessages([assistantMsg]);
      } catch (error) {
        console.error("Initial analysis error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    triggerInitialAnalysis();
  }, [machineId, machineName, sessionId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    try {
      const response = await api.chat({
        messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })),
        machineId: machineId,
        machineName: machineName,
        sessionId: sessionId
      });

      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.message,
        timestamp: new Date().toISOString(),
        agentType: "Orchestrator Core"
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Neural link interrupted. Sovereign AI is momentarily offline.",
        timestamp: new Date().toISOString(),
        agentType: "System"
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className={cn(
      "glass-panel rounded-xl border-l-4 border-l-[var(--color-primary)] flex flex-col overflow-hidden h-[600px]",
      className
    )}>
      {/* Header */}
      <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-surface)]/50">
        <div className="flex items-center gap-2 text-[var(--color-primary)]">
          <BrainCircuit className="w-5 h-5" />
          <h3 className="font-semibold text-sm">Asset Intelligence</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted)]">Live Node</span>
        </div>
      </div>

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 custom-scrollbar bg-black/20"
      >
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 opacity-50">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--color-primary)]" />
            <p className="text-[10px] font-mono uppercase tracking-widest italic">Retrieving Telemetry Context...</p>
          </div>
        ) : (
          <>
            {messages.map(m => (
              <div key={m.id} className={cn("flex flex-col gap-1", m.role === "assistant" ? "items-start" : "items-end")}>
                <div className={cn(
                  "max-w-[90%] p-3 rounded-xl text-xs leading-relaxed whitespace-pre-wrap",
                  m.role === "assistant" 
                    ? "bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-foreground)] rounded-tl-none" 
                    : "bg-[var(--color-primary)] text-black font-semibold rounded-tr-none"
                )}>
                  {m.content}
                </div>
                <span className="text-[8px] text-[var(--color-muted)] font-mono px-1">
                  {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex gap-1 items-center p-2 opacity-50">
                <span className="w-1 h-1 rounded-full bg-[var(--color-primary)] animate-bounce" style={{ animationDelay: "0ms" }}></span>
                <span className="w-1 h-1 rounded-full bg-[var(--color-primary)] animate-bounce" style={{ animationDelay: "150ms" }}></span>
                <span className="w-1 h-1 rounded-full bg-[var(--color-primary)] animate-bounce" style={{ animationDelay: "300ms" }}></span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Input Area */}
      <form 
        onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
        className="p-3 border-t border-[var(--color-border)] bg-[var(--color-surface)]/50 flex gap-2"
      >
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Query machine state..." 
          className="flex-1 bg-black/40 border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-xs outline-none focus:border-[var(--color-primary)]/50 transition-colors font-mono"
          disabled={isLoading || isTyping}
        />
        <button 
          type="submit"
          disabled={!input.trim() || isTyping || isLoading}
          className="bg-[var(--color-primary)] text-black p-1.5 rounded-lg hover:brightness-110 transition-all disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
      
      {/* Footer / Confidence */}
      <div className="px-4 py-2 border-t border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-between">
        <span className="text-[9px] text-[var(--color-muted)] uppercase font-bold tracking-tighter">Confidence Bound</span>
        <span className="text-[9px] font-mono text-[var(--color-primary)]">98.2%</span>
      </div>
    </div>
  );
}
