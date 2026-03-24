/**
 * SimulatorChatLayout — Reuses the EXACT same visual language as OperacaoInbox (WhatsApp).
 * Bubble shapes, colors, typography, status icons, date separators — all identical.
 */
import { memo, Fragment, useRef, useEffect, useCallback, useState } from "react";
import { Check, CheckCheck, Bot, Send, Loader2, ArrowLeft, Smile, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

// ─── Types ───
export interface SimChatMessage {
  id: string;
  role: "user" | "agent" | "system";
  content: string;
  timestamp: string;
  agentName?: string;
  agentId?: string;
  imageUrl?: string;
}

interface SimulatorChatLayoutProps {
  messages: SimChatMessage[];
  loading?: boolean;
  inputValue: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  /** Header content — rendered inside the header bar */
  headerContent: React.ReactNode;
  /** Empty state content */
  emptyContent?: React.ReactNode;
  /** Optional banner below header (transfer notice, etc) */
  bannerContent?: React.ReactNode;
  /** Contact name for "incoming" messages */
  contactName?: string;
  inputPlaceholder?: string;
  disabled?: boolean;
  /** Click handler for message bubbles (for observation linking) */
  onMessageClick?: (msg: SimChatMessage) => void;
  /** Timestamp of currently selected message for highlight */
  selectedMessageTimestamp?: string;
}

// ─── Helpers (same as inbox) ───
function formatMsgTime(ts: string) {
  try {
    return new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function formatDateSeparator(ts: string) {
  try {
    const d = new Date(ts);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return "Hoje";
    if (d.toDateString() === yesterday.toDateString()) return "Ontem";
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return "";
  }
}

function shouldShowDateSeparator(msgs: SimChatMessage[], index: number): boolean {
  if (index === 0) return true;
  const curr = new Date(msgs[index].timestamp).toDateString();
  const prev = new Date(msgs[index - 1].timestamp).toDateString();
  return curr !== prev;
}

const URL_REGEX = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
function Linkify({ text }: { text: string }) {
  if (!text) return null;
  const parts = text.split(URL_REGEX);
  return (
    <>
      {parts.map((part, i) =>
        URL_REGEX.test(part) ? (
          <a key={i} href={part.startsWith("http") ? part : `https://${part}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline hover:text-blue-600 break-all">{part}</a>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        )
      )}
    </>
  );
}

// ─── Message Bubble — identical to inbox ───
const ChatBubble = memo(function ChatBubble({
  msg, messages, index, onClick, isSelected,
}: { msg: SimChatMessage; messages: SimChatMessage[]; index: number; onClick?: () => void; isSelected?: boolean }) {
  const showDate = shouldShowDateSeparator(messages, index);
  const isAgent = msg.role === "agent";
  const isSystem = msg.role === "system";
  const isUser = msg.role === "user";
  const showName = isAgent && (index === 0 || messages[index - 1]?.role !== "agent" || messages[index - 1]?.agentId !== msg.agentId);
  const cleanContent = msg.content.replace("[TRANSFERIR]", "").trim();

  return (
    <Fragment>
      {showDate && (
        <div className="flex justify-center my-4">
          <span className="bg-secondary/80 text-muted-foreground text-[10px] font-medium px-3 py-1.5 rounded-full">
            {formatDateSeparator(msg.timestamp)}
          </span>
        </div>
      )}
      <div className={`flex ${isUser ? "justify-end" : isSystem ? "justify-center" : "justify-start"}`}>
        {isSystem ? (
          <div className="max-w-[85%] rounded-xl px-4 py-2.5 bg-muted/50 border border-border">
            <div className="flex items-center gap-1.5 mb-1">
              <Bot className="h-3 w-3 text-primary" />
              <span className="text-[9px] font-bold text-primary uppercase tracking-wider">Sistema</span>
            </div>
            <p className="text-sm leading-relaxed text-foreground"><Linkify text={cleanContent} /></p>
            <span className="text-[9px] text-muted-foreground">{formatMsgTime(msg.timestamp)}</span>
          </div>
        ) : (
          <div
            className={cn(
              "group relative max-w-[70%] transition-all",
              onClick ? "cursor-pointer hover:brightness-110" : "",
              isSelected ? "ring-2 ring-amber-500/50 rounded-2xl" : ""
            )}
            onClick={onClick}
          >
            <div className={cn(
              "rounded-2xl px-4 py-2.5",
              isUser
                ? "bg-primary text-primary-foreground rounded-br-md"
                : "bg-secondary text-secondary-foreground rounded-bl-md"
            )}>
              {showName && msg.agentName && (
                <p className="text-[10px] font-bold text-primary mb-1">{msg.agentName}</p>
              )}
              {msg.imageUrl ? (
                <div>
                  <img src={msg.imageUrl} alt="Anexo" className="rounded-lg max-w-[250px] max-h-[300px] object-cover mb-1" />
                  {cleanContent && <p className="text-sm leading-relaxed mt-1"><Linkify text={cleanContent} /></p>}
                </div>
              ) : (
                <p className="text-sm leading-relaxed whitespace-pre-wrap"><Linkify text={cleanContent} /></p>
              )}
              <div className="flex items-center justify-end gap-1 mt-1">
                <span className="text-[9px] opacity-60">{formatMsgTime(msg.timestamp)}</span>
                {isUser && <CheckCheck className="h-3.5 w-3.5 text-[#53bdeb]" style={{ filter: 'drop-shadow(0 0 1px rgba(83,189,235,0.5))' }} />}
              </div>
            </div>
          </div>
        )}
      </div>
    </Fragment>
  );
}, (prev, next) => prev.msg.id === next.msg.id && prev.msg.content === next.msg.content && prev.index === next.index && prev.isSelected === next.isSelected);

// ─── Typing Indicator — same as inbox ───
function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="rounded-2xl rounded-bl-md bg-secondary px-4 py-3">
        <div className="flex items-center gap-1">
          <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
          <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "200ms" }} />
          <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "400ms" }} />
        </div>
      </div>
    </div>
  );
}

// ─── Main Layout ───
export default function SimulatorChatLayout({
  messages, loading, inputValue, onInputChange, onSend,
  headerContent, emptyContent, bannerContent,
  inputPlaceholder = "Digite como um cliente...",
  disabled, onMessageClick, selectedMessageTimestamp,
}: SimulatorChatLayoutProps) {
  const isMobile = useIsMobile();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: messages.length > 1 ? "smooth" : "auto" });
    });
  }, [messages.length, messages[messages.length - 1]?.id]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  }, [onSend]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "40px";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px";
    }
  }, [inputValue]);

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden bg-background rounded-2xl border border-border">
      {/* Header — identical structure to inbox chat header */}
      <div className="flex items-center justify-between px-2 md:px-4 py-2 md:py-2.5 border-b border-border bg-card/50 shrink-0">
        {headerContent}
      </div>

      {/* Banner */}
      {bannerContent}

      {/* Messages area */}
      <div
        ref={scrollContainerRef}
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-2 md:px-4"
      >
        <div className="py-4 space-y-3">
          {messages.length === 0 && emptyContent}
          {messages.map((msg, idx) => (
            <ChatBubble key={msg.id} msg={msg} messages={messages} index={idx} onClick={onMessageClick ? () => onMessageClick(msg) : undefined} isSelected={selectedMessageTimestamp === msg.timestamp} />
          ))}
          {loading && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input — identical structure to inbox */}
      <div
        className="border-t border-border px-2 md:px-4 py-2 md:py-3 bg-card shrink-0"
        style={isMobile ? { paddingBottom: "calc(env(safe-area-inset-bottom) + 0.5rem)" } : undefined}
      >
        <div className="flex items-end gap-1 md:gap-2">
          <Textarea
            ref={textareaRef}
            placeholder={inputPlaceholder}
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled || loading}
            className="flex-1 min-h-[40px] max-h-[120px] text-sm resize-none bg-background/50 border-border/50"
            rows={1}
          />
          <Button
            size="icon"
            className="h-10 w-10 shrink-0"
            onClick={onSend}
            disabled={disabled || loading || !inputValue.trim()}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

export { ChatBubble, TypingIndicator };
