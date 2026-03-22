import { ChatMessage } from "@/types";
import { cn } from "@/lib/utils";
import { Bot, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface NLChatBubbleProps {
  message: ChatMessage;
}

export function NLChatBubble({ message }: NLChatBubbleProps) {
  const isAgent = message.role === "assistant";
  
  return (
    <div className={cn("flex w-full gap-4 max-w-4xl animate-in fade-in slide-in-from-bottom-2 duration-300", isAgent ? "justify-start" : "justify-end")}>
      {isAgent && (
        <div className="w-10 h-10 rounded-full bg-[var(--color-surface)] border border-[var(--color-primary)]/50 flex flex-shrink-0 items-center justify-center text-[var(--color-primary)] shadow-[0_0_15px_var(--color-primary)]/20">
          <Bot className="w-5 h-5" />
        </div>
      )}
      
      <div className={cn(
        "flex flex-col gap-1.5 max-w-[85%]",
        !isAgent && "items-end"
      )}>
        <div className="flex items-center gap-2 px-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted)]">
            {isAgent ? (message.agentType || 'Orchestrator Core') : 'User Identity'}
          </span>
          <span className="text-[9px] text-[var(--color-muted)] font-mono opacity-60">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>
        
        <div className={cn(
          "p-4 rounded-2xl text-[13.5px] leading-[1.6] shadow-xl overflow-hidden selection:bg-[var(--color-primary)]/30",
          isAgent 
            ? "glass-panel rounded-tl-none border-l-4 border-l-[var(--color-primary)] text-[var(--color-foreground)]" 
            : "bg-[var(--color-primary)] text-[#0D1117] font-semibold rounded-tr-none shadow-[0_0_20px_var(--color-primary)]/10"
        )}>
          <div className={cn(
            "markdown-content",
            isAgent ? "prose prose-invert prose-sm max-w-none" : ""
          )}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
        </div>
      </div>
      
      {!isAgent && (
        <div className="w-10 h-10 rounded-full bg-[var(--color-surface)] border border-[var(--color-primary)] flex flex-shrink-0 items-center justify-center text-[var(--color-primary)] shadow-[0_0_15px_var(--color-primary)]/20">
          <User className="w-5 h-5" />
        </div>
      )}
    </div>
  );
}
