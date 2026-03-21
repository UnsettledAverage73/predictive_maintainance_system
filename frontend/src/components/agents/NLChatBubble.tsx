import { ChatMessage } from "@/types";
import { cn } from "@/lib/utils";
import { Bot, User } from "lucide-react";

interface NLChatBubbleProps {
  message: ChatMessage;
}

export function NLChatBubble({ message }: NLChatBubbleProps) {
  const isAgent = message.role === "assistant";
  
  return (
    <div className={cn("flex w-full gap-4 max-w-4xl", isAgent ? "justify-start" : "justify-end")}>
      {isAgent && (
        <div className="w-10 h-10 rounded-full bg-[var(--color-surface)] border border-[var(--color-primary)]/50 flex flex-shrink-0 items-center justify-center text-[var(--color-primary)]">
          <Bot className="w-5 h-5" />
        </div>
      )}
      
      <div className={cn(
        "flex flex-col gap-1 max-w-[80%]",
        !isAgent && "items-end"
      )}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[var(--color-foreground)]">
            {isAgent ? (message.agentType || 'AI Assistant') : 'You'}
          </span>
          <span className="text-[10px] text-[var(--color-muted)] font-mono">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        
        <div className={cn(
          "p-4 rounded-xl text-sm leading-relaxed",
          isAgent 
            ? "glass-panel rounded-tl-none border-l-4 border-l-[var(--color-primary)]" 
            : "bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 text-[var(--color-foreground)] rounded-tr-none"
        )}>
          {message.content}
        </div>
      </div>
      
      {!isAgent && (
        <div className="w-10 h-10 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex flex-shrink-0 items-center justify-center text-[var(--color-muted)]">
          <User className="w-5 h-5" />
        </div>
      )}
    </div>
  );
}
