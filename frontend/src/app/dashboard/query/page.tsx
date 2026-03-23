"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { NLChatBubble } from "@/components/agents/NLChatBubble";
import { ChatMessage } from "@/types";
import { Bot, FileText, Send, Sparkles, AlertTriangle, Mic, Image as ImageIcon, StopCircle } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";

export default function QueryPage() {
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q");
  const machineId = searchParams.get("machineId");
  const sessionId = useMemo(() => `sess-${Date.now()}`, []);
  const [activeSources, setActiveSources] = useState<any[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  useEffect(() => {
    if (initialQ) {
      handleSend(initialQ);
    }
  }, [initialQ]);

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
        machineId: machineId || "GLOBAL",
        machineName: machineId ? `Asset ${machineId}` : "Factory Matrix",
        sessionId: sessionId
      });

      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.message,
        timestamp: new Date().toISOString(),
        agentType: "Orchestrator"
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Neural link interrupted. Please check if the backend Sovereign API is online.",
        timestamp: new Date().toISOString(),
        agentType: "Orchestrator"
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Select best supported MIME type
      const types = ["audio/wav", "audio/webm", "audio/ogg"];
      const mimeType = types.find(t => MediaRecorder.isTypeSupported(t)) || "audio/webm";
      
      mediaRecorder.current = new MediaRecorder(stream, { mimeType });
      audioChunks.current = [];
      mediaRecorder.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.current.push(e.data);
      };
      mediaRecorder.current.onstop = handleVoiceSend;
      mediaRecorder.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Mic access denied:", err);
    }
  };

  const stopRecording = () => {
    mediaRecorder.current?.stop();
    mediaRecorder.current?.stream.getTracks().forEach((track) => track.stop());
    setIsRecording(false);
  };

  const handleVoiceSend = async () => {
    const recordedMimeType = mediaRecorder.current?.mimeType || "audio/webm";
    // Standardize naming for backend
    const extension = recordedMimeType.includes("wav") ? "wav" : recordedMimeType.includes("ogg") ? "ogg" : "webm";
    const audioBlob = new Blob(audioChunks.current, { type: recordedMimeType });
    const formData = new FormData();
    // We send with a clean filename and standard MIME type
    const cleanMimeType = recordedMimeType.split(";")[0];
    formData.append("file", audioBlob, `voice-input.${extension}`);
    formData.append("machineId", machineId || "GLOBAL");
    formData.append("sessionId", sessionId);

    setIsTyping(true);
    try {
      const response = await api.chatVoice(formData);
      
      const userMsg: ChatMessage = {
        id: Date.now().toString(),
        role: "user",
        content: `🎤 (Voice) ${response.transcript}`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, userMsg]);

      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.message,
        timestamp: new Date().toISOString(),
        agentType: "Orchestrator"
      };
      setMessages(prev => [...prev, assistantMsg]);

      if (response.audio) {
        const audio = new Audio(`data:audio/wav;base64,${response.audio}`);
        audio.play();
      }
    } catch (error) {
      console.error("Voice chat error:", error);
    } finally {
      setIsTyping(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("files", file);
    formData.append("prompt", "Analyze this machine status");
    formData.append("machineId", machineId || "GLOBAL");
    formData.append("sessionId", sessionId);

    setIsTyping(true);
    try {
      const response = await api.chatVision(formData);
      
      const userMsg: ChatMessage = {
        id: Date.now().toString(),
        role: "user",
        content: "📷 Uploaded an image for visual analysis.",
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, userMsg]);

      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.message,
        timestamp: new Date().toISOString(),
        agentType: "Orchestrator"
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (error) {
      console.error("Vision chat error:", error);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col animate-in fade-in duration-500 h-[calc(100vh-80px)]">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-[var(--color-primary)]" /> Orchestrator Query
          </h1>
          <p className="text-[var(--color-muted)] text-sm mt-1">Natural language insights across the entire plant matrix.</p>
        </div>
      </div>

      <div className="flex gap-6 h-full min-h-0 flex-1 overflow-hidden">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col items-center">
          <div ref={scrollRef} className="flex-1 w-full overflow-y-auto custom-scrollbar px-4 pt-4 pb-8 flex flex-col gap-6 items-center">
            {messages.length === 0 && (
              <div className="py-8 text-center text-[var(--color-muted)] max-w-lg">
                <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <h3 className="font-bold mb-2 text-[var(--color-foreground)]">Plant-wide Orchestrator Online</h3>
                <p className="text-sm">I have access to historical telemetry, maintenance logs, and live data feeds. How can I assist?</p>
                
                <div className="grid grid-cols-2 gap-2 mt-6">
                  {["What failed most recently?", "Which machines need attention?", "Analyze vibration anomalies", "Summarize factory status"].map(q => (
                    <button 
                      key={q} 
                      onClick={() => handleSend(q)}
                      className="bg-[var(--color-surface)] border border-[var(--color-border)] p-2 text-xs rounded-xl hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-primary)]/5 transition-colors line-clamp-1"
                    >
                      "{q}"
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map(m => <NLChatBubble key={m.id} message={m} />)}
            
            {isTyping && (
              <div className="flex w-full gap-4 max-w-4xl justify-start opacity-70">
                <div className="w-10 h-10 rounded-full bg-[var(--color-surface)] border border-[var(--color-primary)]/50 flex items-center justify-center text-[var(--color-primary)]">
                  <Bot className="w-5 h-5 animate-pulse" />
                </div>
                <div className="glass-panel rounded-xl rounded-tl-none border-l-4 border-l-[var(--color-primary)] p-4 flex gap-1 items-center">
                  <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-bounce" style={{ animationDelay: "0ms" }}></span>
                  <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-bounce" style={{ animationDelay: "150ms" }}></span>
                  <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-bounce" style={{ animationDelay: "300ms" }}></span>
                </div>
              </div>
            )}
          </div>

          <form 
            onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
            className="w-full max-w-4xl bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-2 flex items-center gap-2 mb-4 mt-2 shadow-[0_-10px_40px_rgba(0,0,0,0.3)]"
          >
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleImageUpload}
            />
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-10 h-10 rounded-lg text-[var(--color-muted)] hover:text-[var(--color-primary)] transition-colors flex items-center justify-center shrink-0"
              title="Upload image"
            >
              <ImageIcon className="w-5 h-5" />
            </button>

            <button 
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              className={`w-10 h-10 rounded-lg transition-colors flex items-center justify-center shrink-0 ${
                isRecording ? "text-[var(--color-danger)] animate-pulse" : "text-[var(--color-muted)] hover:text-[var(--color-primary)]"
              }`}
              title={isRecording ? "Stop recording" : "Voice message"}
            >
              {isRecording ? <StopCircle className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isRecording ? "Listening..." : "Ask the Orchestrator..."} 
              className="flex-1 bg-transparent border-none outline-none font-mono text-sm px-4"
              autoFocus
              disabled={isRecording}
            />
            <button 
              type="submit"
              disabled={!input.trim() || isTyping || isRecording}
              className="w-10 h-10 rounded-lg bg-[var(--color-primary)] text-[#0D1117] flex items-center justify-center hover:bg-[#00e6b8] transition-colors shadow-[0_0_15px_var(--color-primary)]/30 shrink-0 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Context Panel */}
        <div className="w-80 glass-panel rounded-xl flex flex-col flex-shrink-0 hidden xl:flex">
          <div className="p-4 border-b border-[var(--color-border)]">
            <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--color-muted)] flex items-center gap-2">
              <FileText className="w-4 h-4" /> Context Panel
            </h3>
          </div>
          <div className="p-4 flex-1 overflow-y-auto">
            <p className="text-[10px] font-mono uppercase text-[var(--color-primary)] tracking-wider mb-2">Sources Retrieved</p>
            <div className="flex flex-col gap-2">
              <div className="bg-[var(--color-surface)] p-3 rounded-lg border border-[var(--color-border)]">
                <span className="text-xs font-bold block mb-1">SQLite: sensor_readings</span>
                <span className="text-[10px] text-[var(--color-muted)]">Live telemetry stream</span>
              </div>
              <div className="bg-[var(--color-surface)] p-3 rounded-lg border border-[var(--color-border)]">
                <span className="text-xs font-bold block mb-1">JSON: maintenance_logs</span>
                <span className="text-[10px] text-[var(--color-muted)]">Legacy servicing history</span>
              </div>
              <div className="bg-[var(--color-surface)] p-3 rounded-lg border border-[var(--color-border)]">
                <span className="text-xs font-bold block mb-1">Vector: Sovereign Memory</span>
                <span className="text-[10px] text-[var(--color-muted)]">RAG context from Pinecone</span>
              </div>
            </div>

            <div className="mt-6 border-t border-[var(--color-border)] pt-4">
              <span className="text-[10px] uppercase tracking-widest text-[var(--color-warning)] font-bold flex items-center gap-1 mb-2">
                <AlertTriangle className="w-3 h-3" /> Confidence Metric
              </span>
              <div className="w-full bg-[var(--color-border)] rounded-full h-1.5 mb-1 overflow-hidden">
                <div className="bg-[var(--color-warning)] h-full rounded-full w-[94%]" />
              </div>
              <span className="text-xs font-mono text-[var(--color-muted)]">94.2% overall accuracy bound</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
