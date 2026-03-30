/**
 * SimulatorChatLayout — Reuses the EXACT same visual language as OperacaoInbox (WhatsApp).
 * Bubble shapes, colors, typography, status icons, date separators — all identical.
 * Now with WhatsApp-style audio recording + file attachment + reply-to-message.
 */
import { memo, Fragment, useRef, useEffect, useCallback, useState } from "react";
import { Check, CheckCheck, Bot, Send, Loader2, Smile, Clock, Mic, Paperclip, X, Image, FileText as FileTextIcon, Square, Reply } from "lucide-react";
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
  /** Audio blob URL for playback */
  audioUrl?: string;
  /** Attached file name */
  fileName?: string;
  /** Type of attachment */
  attachmentType?: "audio" | "image" | "file";
  /** Reply-to reference */
  replyTo?: { id: string; content: string; role: "user" | "agent"; agentName?: string };
}

interface SimulatorChatLayoutProps {
  messages: SimChatMessage[];
  loading?: boolean;
  inputValue: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  /** Called when user sends audio — receives blob */
  onSendAudio?: (blob: Blob) => void;
  /** Called when user attaches a file — receives file */
  onSendFile?: (file: File) => void;
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
  /** Reply-to state */
  replyingTo?: SimChatMessage | null;
  onReply?: (msg: SimChatMessage) => void;
  onCancelReply?: () => void;
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

// ─── Audio waveform mini player ───
function AudioBubblePlayer({ src }: { src: string }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setProgress(a.currentTime);
    const onEnd = () => { setPlaying(false); setProgress(0); };
    const onMeta = () => { const d = a.duration; setDuration(isFinite(d) ? d : 0); };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("ended", onEnd);
    a.addEventListener("loadedmetadata", onMeta);
    return () => { a.removeEventListener("timeupdate", onTime); a.removeEventListener("ended", onEnd); a.removeEventListener("loadedmetadata", onMeta); };
  }, []);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) a.pause();
    else a.play();
    setPlaying(!playing);
  };

  const fmt = (s: number) => {
    if (!isFinite(s) || isNaN(s) || s <= 0) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex items-center gap-2 min-w-[180px]">
      <audio ref={audioRef} src={src} preload="metadata" />
      <button onClick={toggle} className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-primary/20 hover:bg-primary/30 transition-colors">
        {playing ? (
          <Square className="w-3 h-3 text-primary fill-primary" />
        ) : (
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-primary fill-primary"><polygon points="5,3 19,12 5,21" /></svg>
        )}
      </button>
      <div className="flex-1 flex flex-col gap-0.5">
        <div className="h-1 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${duration ? (progress / duration) * 100 : 0}%` }} />
        </div>
        <span className="text-[9px] opacity-60">{fmt(playing ? progress : duration || 0)}</span>
      </div>
    </div>
  );
}

// ─── Reply Quote Block ───
function ReplyQuoteBlock({ replyTo, isUserBubble }: { replyTo: SimChatMessage["replyTo"]; isUserBubble: boolean }) {
  if (!replyTo) return null;
  const isReplyFromAgent = replyTo.role === "agent";
  return (
    <div className={cn(
      "rounded-lg px-3 py-1.5 mb-1.5 border-l-[3px] text-[11px] leading-snug",
      isUserBubble
        ? "bg-white/10 border-white/40"
        : "bg-primary/8 border-primary/50"
    )}>
      <p className={cn(
        "font-bold text-[10px] mb-0.5",
        isUserBubble ? "text-white/80" : "text-primary"
      )}>
        {isReplyFromAgent ? (replyTo.agentName || "Agente") : "Você"}
      </p>
      <p className={cn(
        "line-clamp-2",
        isUserBubble ? "text-white/60" : "text-muted-foreground"
      )}>
        {replyTo.content.slice(0, 120)}{replyTo.content.length > 120 ? "…" : ""}
      </p>
    </div>
  );
}

// ─── Message Bubble — identical to inbox ───
const ChatBubble = memo(function ChatBubble({
  msg, messages, index, onClick, isSelected, onReply,
}: { msg: SimChatMessage; messages: SimChatMessage[]; index: number; onClick?: () => void; isSelected?: boolean; onReply?: (msg: SimChatMessage) => void }) {
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
            {/* Reply button — appears on hover */}
            {onReply && !isSystem && (
              <button
                onClick={(e) => { e.stopPropagation(); onReply(msg); }}
                className={cn(
                  "absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10",
                  "w-7 h-7 rounded-full bg-muted/90 hover:bg-muted flex items-center justify-center shadow-sm border border-border/50",
                  isUser ? "-left-9" : "-right-9"
                )}
                title="Responder"
              >
                <Reply className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            )}

            <div className={cn(
              "rounded-2xl px-4 py-2.5",
              isUser
                ? "bg-primary text-primary-foreground rounded-br-md"
                : "bg-secondary text-secondary-foreground rounded-bl-md"
            )}>
              {showName && msg.agentName && (
                <p className="text-[10px] font-bold text-primary mb-1">{msg.agentName}</p>
              )}

              {/* Reply quote */}
              {msg.replyTo && <ReplyQuoteBlock replyTo={msg.replyTo} isUserBubble={isUser} />}

              {/* Audio attachment */}
              {msg.audioUrl && (
                <div className="mb-1">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Mic className="w-3 h-3 opacity-60" />
                    <span className="text-[10px] opacity-60 font-medium">Áudio</span>
                  </div>
                  <AudioBubblePlayer src={msg.audioUrl} />
                </div>
              )}

              {/* Image attachment */}
              {msg.imageUrl ? (
                <div>
                  <img src={msg.imageUrl} alt="Anexo" className="rounded-lg max-w-[250px] max-h-[300px] object-cover mb-1" />
                  {cleanContent && <p className="text-sm leading-relaxed mt-1"><Linkify text={cleanContent} /></p>}
                </div>
              ) : msg.fileName && !msg.audioUrl ? (
                <div>
                  <div className="flex items-center gap-2 mb-1 px-2 py-1.5 rounded-lg bg-background/20">
                    <FileTextIcon className="w-4 h-4 opacity-60 shrink-0" />
                    <span className="text-[12px] font-medium truncate">{msg.fileName}</span>
                  </div>
                  {cleanContent && <p className="text-sm leading-relaxed mt-1"><Linkify text={cleanContent} /></p>}
                </div>
              ) : (
                cleanContent && <p className="text-sm leading-relaxed whitespace-pre-wrap"><Linkify text={cleanContent} /></p>
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
}, (prev, next) => prev.msg.id === next.msg.id && prev.msg.content === next.msg.content && prev.index === next.index && prev.isSelected === next.isSelected && prev.onReply === next.onReply);

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

// ─── Recording indicator ───
function RecordingIndicator({ duration }: { duration: number }) {
  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex items-center gap-3 flex-1">
      <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
      <span className="text-sm font-medium text-destructive">Gravando...</span>
      <span className="text-xs text-muted-foreground tabular-nums">{fmt(duration)}</span>
      <div className="flex-1 flex items-center gap-0.5">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="w-1 rounded-full bg-destructive/40"
            style={{
              height: `${8 + Math.sin(Date.now() / 200 + i * 0.8) * 8}px`,
              transition: "height 0.15s",
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Main Layout ───
export default function SimulatorChatLayout({
  messages, loading, inputValue, onInputChange, onSend,
  onSendAudio, onSendFile,
  headerContent, emptyContent, bannerContent,
  inputPlaceholder = "Digite como um cliente...",
  disabled, onMessageClick, selectedMessageTimestamp,
  replyingTo, onReply, onCancelReply,
}: SimulatorChatLayoutProps) {
  const isMobile = useIsMobile();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const waveAnimRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [, forceUpdate] = useState(0); // for waveform animation

  // Attachment popover
  const [showAttachMenu, setShowAttachMenu] = useState(false);

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

  // ─── Audio Recording ───
  const startRecording = useCallback(async () => {
    if (!onSendAudio) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4" });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        if (blob.size > 0) onSendAudio(blob);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingDuration(0);
      timerRef.current = setInterval(() => setRecordingDuration(d => d + 1), 1000);
      waveAnimRef.current = setInterval(() => forceUpdate(v => v + 1), 150);
    } catch (err) {
      console.error("Mic access denied:", err);
    }
  }, [onSendAudio]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (waveAnimRef.current) { clearInterval(waveAnimRef.current); waveAnimRef.current = null; }
  }, []);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
      const stream = mediaRecorderRef.current.stream;
      stream?.getTracks().forEach(t => t.stop());
    }
    setIsRecording(false);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (waveAnimRef.current) { clearInterval(waveAnimRef.current); waveAnimRef.current = null; }
    chunksRef.current = [];
  }, []);

  // ─── File Attachment ───
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onSendFile) {
      onSendFile(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
    setShowAttachMenu(false);
  }, [onSendFile]);

  const hasText = inputValue.trim().length > 0;

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
            <ChatBubble key={msg.id} msg={msg} messages={messages} index={idx} onClick={onMessageClick ? () => onMessageClick(msg) : undefined} isSelected={selectedMessageTimestamp === msg.timestamp} onReply={onReply} />
          ))}
          {loading && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf,.doc,.docx,.txt,.csv,.xls,.xlsx"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Reply preview bar */}
      {replyingTo && onCancelReply && (
        <div className="border-t border-border px-3 py-2 bg-card/80 flex items-center gap-2 shrink-0">
          <div className="flex-1 min-w-0 rounded-lg bg-muted/50 border-l-[3px] border-primary px-3 py-1.5">
            <p className="text-[10px] font-bold text-primary">
              {replyingTo.role === "agent" ? (replyingTo.agentName || "Agente") : "Você"}
            </p>
            <p className="text-[11px] text-muted-foreground truncate">
              {replyingTo.content.slice(0, 100)}
            </p>
          </div>
          <button
            onClick={onCancelReply}
            className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-muted transition-colors shrink-0"
          >
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      )}

      {/* Input — WhatsApp style */}
      <div
        className="border-t border-border px-2 md:px-4 py-2 md:py-3 bg-card shrink-0"
        style={isMobile ? { paddingBottom: "calc(env(safe-area-inset-bottom) + 0.5rem)" } : undefined}
      >
        {isRecording ? (
          /* Recording mode */
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              className="h-10 w-10 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={cancelRecording}
            >
              <X className="h-4 w-4" />
            </Button>
            <RecordingIndicator duration={recordingDuration} />
            <Button
              size="icon"
              className="h-10 w-10 shrink-0 bg-primary hover:bg-primary/90"
              onClick={stopRecording}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          /* Normal input mode */
          <div className="flex items-end gap-1 md:gap-2">
            {/* Attachment button */}
            {onSendFile && (
              <div className="relative">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-10 w-10 shrink-0 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowAttachMenu(!showAttachMenu)}
              disabled={disabled}
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                {/* Attachment popover */}
                {showAttachMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowAttachMenu(false)} />
                    <div className="absolute bottom-12 left-0 z-50 rounded-xl border border-border bg-card shadow-lg p-1.5 min-w-[160px]">
                      <button
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm hover:bg-muted transition-colors text-foreground"
                        onClick={() => {
                          if (fileInputRef.current) {
                            fileInputRef.current.accept = "image/*";
                            fileInputRef.current.click();
                          }
                        }}
                      >
                        <Image className="w-4 h-4 text-primary" />
                        Foto
                      </button>
                      <button
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm hover:bg-muted transition-colors text-foreground"
                        onClick={() => {
                          if (fileInputRef.current) {
                            fileInputRef.current.accept = "application/pdf,.doc,.docx,.txt,.csv,.xls,.xlsx";
                            fileInputRef.current.click();
                          }
                        }}
                      >
                        <FileTextIcon className="w-4 h-4 text-amber-500" />
                        Documento
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            <Textarea
              ref={textareaRef}
              placeholder={inputPlaceholder}
              value={inputValue}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={disabled}
              className="flex-1 min-h-[40px] max-h-[120px] text-sm resize-none bg-background/50 border-border/50"
              rows={1}
            />

            {/* Send or Mic button */}
            {hasText ? (
              <Button
                size="icon"
                className="h-10 w-10 shrink-0"
                onClick={onSend}
                disabled={disabled}
              >
                <Send className="h-4 w-4" />
              </Button>
            ) : onSendAudio ? (
              <Button
                size="icon"
                variant="ghost"
                className="h-10 w-10 shrink-0 text-muted-foreground hover:text-foreground hover:bg-primary/10"
                onClick={startRecording}
                disabled={disabled}
              >
                <Mic className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                size="icon"
                className="h-10 w-10 shrink-0"
                onClick={onSend}
                disabled={disabled || !hasText}
              >
                <Send className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export { ChatBubble, TypingIndicator };
