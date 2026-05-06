import { memo, Fragment } from "react";
import { Check, CheckCheck, Bot, ChevronRight, Pencil, Mic, Image, Video, FileText, File, FileSpreadsheet, FileImage, Clock, AlertCircle, RotateCcw, Loader2, Download, Forward, Camera } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { AudioWaveformPlayer } from "@/components/livechat/AudioWaveformPlayer";
import type { Message, MsgStatus, MsgType } from "./types";
import { formatMsgTime, formatDateSeparator, shouldShowDateSeparator, stripQuotes } from "./helpers";
import { formatBytes } from "@/lib/format";
import { humanizeMediaFailure } from "@/lib/zapiFailureClassifier";
import { PdfThumbnail } from "./PdfThumbnail";

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

function getStatusIcon(status: MsgStatus) {
  if (status === "queued") return <Clock className="h-3 w-3 text-muted-foreground animate-pulse" />;
  if (status === "pending") return <Clock className="h-3 w-3 opacity-70 animate-pulse" />;
  if (status === "sending") return <Clock className="h-3 w-3 opacity-70" />;
  if (status === "retrying") return <Loader2 className="h-3 w-3 opacity-80 animate-spin" />;
  if (status === "failed") return <AlertCircle className="h-3 w-3 text-destructive" />;
  if (status === "read") return <CheckCheck className="h-3.5 w-3.5 text-[#53bdeb]" style={{ filter: 'drop-shadow(0 0 1px rgba(83,189,235,0.5))' }} />;
  if (status === "delivered") return <CheckCheck className="h-3 w-3 opacity-80" />;
  return <Check className="h-3 w-3 opacity-80" />;
}

interface MessageBubbleProps {
  msg: Message;
  messages: Message[];
  index: number;
  contactName: string;
  onReply: (msg: Message) => void;
  onEdit: (msg: Message) => void;
  onLightbox: (url: string) => void;
  onRetry?: (msg: Message) => void;
  onForward?: (msg: Message) => void;
  selectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (msg: Message) => void;
}

function stripInternalTags(text: string): string {
  if (!text) return text;
  return text
    .replace(/\[TRANSFERIR[^\]]*\]/g, "")
    .replace(/\[BRIEFING[^\]]*\]:?\s*/gi, "")
    .replace(/\[ESCALON[^\]]*\]:?\s*/gi, "")
    .replace(/\[INTERNO[^\]]*\]:?\s*/gi, "")
    .trim();
}

// ─── Document icon by mimetype/filename ───
function getDocIcon(mime?: string, filename?: string) {
  const m = (mime || "").toLowerCase();
  const f = (filename || "").toLowerCase();
  if (m.includes("pdf") || f.endsWith(".pdf")) return FileText;
  if (m.includes("sheet") || m.includes("excel") || m.includes("csv") || /\.(xlsx?|csv|numbers)$/.test(f)) return FileSpreadsheet;
  if (m.includes("image") || /\.(png|jpe?g|gif|webp|heic)$/.test(f)) return FileImage;
  return File;
}

// ─── Download placeholder while media_status pending/downloading ───
function DownloadingPlaceholder({ type, filename }: { type: MsgType; filename?: string }) {
  const label =
    type === "audio" ? "Baixando áudio…" :
    type === "image" ? "Baixando imagem…" :
    type === "video" ? "Baixando vídeo…" :
    type === "document" ? "Baixando documento…" :
    type === "sticker" ? "Baixando figurinha…" :
    "Baixando mídia…";
  return (
    <div className="flex items-center gap-2 py-3 px-2 min-w-[200px] text-xs opacity-80">
      <Loader2 className="h-4 w-4 animate-spin" />
      <div className="flex flex-col">
        <span>{label}</span>
        {filename && <span className="text-[10px] opacity-60 truncate max-w-[200px]">{filename}</span>}
      </div>
    </div>
  );
}

// ─── Failure card ───
function FailedMediaCard({ reason, type, filename }: { reason?: string; type: MsgType; filename?: string }) {
  const typeLabel =
    type === "audio" ? "áudio" :
    type === "image" ? "imagem" :
    type === "video" ? "vídeo" :
    type === "document" ? "documento" :
    type === "sticker" ? "figurinha" :
    "mídia";
  return (
    <div className="flex items-start gap-2 py-2 px-2 min-w-[220px] text-xs rounded-lg bg-destructive/10 border border-destructive/30">
      <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
      <div className="flex flex-col">
        <span className="font-medium">Não foi possível carregar {typeLabel}</span>
        <span className="text-[10px] opacity-70 mt-0.5">{humanizeMediaFailure(reason)}</span>
        {filename && <span className="text-[10px] opacity-60 truncate max-w-[220px] mt-0.5">{filename}</span>}
      </div>
    </div>
  );
}

// ─── Expired/legacy card (neutral, not an error) ───
function ExpiredMediaCard({ type, filename }: { type: MsgType; filename?: string }) {
  const typeLabel =
    type === "audio" ? "áudio" :
    type === "image" ? "imagem" :
    type === "video" ? "vídeo" :
    type === "document" ? "documento" :
    type === "sticker" ? "figurinha" :
    "mídia";
  return (
    <div className="flex items-start gap-2 py-2 px-2 min-w-[200px] text-xs rounded-lg bg-muted/40 border border-border">
      <File className="h-4 w-4 opacity-50 shrink-0 mt-0.5" />
      <div className="flex flex-col">
        <span className="opacity-80">{typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)} não disponível</span>
        <span className="text-[10px] opacity-50 mt-0.5">Mídia legada não foi baixada</span>
        {filename && <span className="text-[10px] opacity-50 truncate max-w-[200px] mt-0.5">{filename}</span>}
      </div>
    </div>
  );
}

function MessageBubbleInner({ msg, messages, index, contactName, onReply, onEdit, onLightbox, onRetry, onForward, selectionMode, isSelected, onToggleSelect }: MessageBubbleProps) {
  const showDate = shouldShowDateSeparator(messages, index);

  // Strip internal tags from displayed text
  const displayText = stripInternalTags(msg.text);

  // If entire message is just an internal tag, don't render
  if (!displayText && msg.message_type === "text") return null;

  const handleRowClick = () => {
    if (selectionMode && onToggleSelect) onToggleSelect(msg);
  };

  return (
    <Fragment>
      {showDate && (
        <div className="flex justify-center my-4">
          <span className="bg-secondary/80 text-muted-foreground text-[10px] font-medium px-3 py-1.5 rounded-full">{formatDateSeparator(msg.created_at)}</span>
        </div>
      )}
      <div
        className={`flex items-center gap-2 ${selectionMode ? "cursor-pointer px-2 -mx-2 rounded-md hover:bg-muted/40" : ""} ${isSelected ? "bg-primary/5" : ""} ${msg.sender_type === "atendente" ? "justify-end" : msg.sender_type === "sistema" ? "justify-center" : "justify-start"}`}
        onClick={handleRowClick}
      >
        {selectionMode && msg.sender_type !== "sistema" && (
          <Checkbox
            checked={!!isSelected}
            onCheckedChange={() => onToggleSelect?.(msg)}
            onClick={(e) => e.stopPropagation()}
            className="shrink-0"
          />
        )}
        {msg.sender_type === "sistema" ? (
          <div className="max-w-[85%] rounded-xl px-4 py-2.5 bg-muted/50 border border-border">
            <div className="flex items-center gap-1.5 mb-1">
              <Bot className="h-3 w-3 text-primary" />
              <span className="text-[9px] font-bold text-primary uppercase tracking-wider">Sistema / Bot</span>
            </div>
            <p className="text-sm leading-relaxed text-foreground"><Linkify text={stripQuotes(displayText)} /></p>
            <span className="text-[9px] text-muted-foreground">{formatMsgTime(msg.created_at)}</span>
          </div>
        ) : (
          <div className="group relative max-w-[70%]">
            <div className={`absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 z-10 ${msg.sender_type === "atendente" ? "-left-[100px]" : "-right-[100px]"}`}>
              <button onClick={(e) => { e.stopPropagation(); onReply(msg); }} className="h-7 w-7 rounded-full bg-secondary/80 hover:bg-secondary flex items-center justify-center" title="Responder">
                <ChevronRight className={`h-3.5 w-3.5 text-muted-foreground ${msg.sender_type === "atendente" ? "rotate-180" : ""}`} />
              </button>
              {onForward && (
                <button onClick={(e) => { e.stopPropagation(); onForward(msg); }} className="h-7 w-7 rounded-full bg-secondary/80 hover:bg-secondary flex items-center justify-center" title="Encaminhar">
                  <Forward className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              )}
              {msg.sender_type === "atendente" && msg.message_type === "text" && new Date(msg.created_at).getTime() > Date.now() - 3600000 && (
                <button onClick={(e) => { e.stopPropagation(); onEdit(msg); }} className="h-7 w-7 rounded-full bg-secondary/80 hover:bg-secondary flex items-center justify-center" title="Editar">
                  <Pencil className="h-3 w-3 text-muted-foreground" />
                </button>
              )}
            </div>
            <div className={`rounded-2xl px-4 py-2.5 transition-all ${msg.sender_type === "atendente" ? "bg-primary text-primary-foreground rounded-br-md" : "bg-secondary text-secondary-foreground rounded-bl-md"} ${msg.status === "queued" || msg.status === "pending" || msg.status === "sending" ? "opacity-70" : ""} ${msg.status === "retrying" ? "opacity-80 ring-1 ring-amber-400/40" : ""} ${msg.status === "failed" ? "opacity-90 ring-1 ring-destructive/40 bg-destructive/10" : ""}`}>
              {(msg as any).metadata?.reply_to_status?.is_status_reply && (
                <div className={`flex items-center gap-1.5 mb-2 px-2 py-1 rounded-md border ${msg.sender_type === "atendente" ? "bg-primary-foreground/10 border-primary-foreground/30" : "bg-primary/5 border-primary/30"}`}>
                  <Camera className={`h-3 w-3 ${msg.sender_type === "atendente" ? "text-primary-foreground/80" : "text-primary"}`} />
                  <span className={`text-[10px] font-medium ${msg.sender_type === "atendente" ? "text-primary-foreground/80" : "text-primary"}`}>
                    Em resposta ao seu status
                  </span>
                </div>
              )}
              {msg.is_forwarded && (
                <div className={`flex items-center gap-1 mb-1 text-[10px] italic ${msg.sender_type === "atendente" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  <Forward className="h-2.5 w-2.5" />
                  <span>Encaminhada</span>
                </div>
              )}
              {msg.quoted_msg && (
                <div className={`rounded-lg px-3 py-1.5 mb-2 border-l-2 ${msg.sender_type === "atendente" ? "bg-primary-foreground/10 border-primary-foreground/40" : "bg-foreground/5 border-primary/40"}`}>
                  <p className={`text-[10px] font-bold ${msg.sender_type === "atendente" ? "text-primary-foreground/70" : "text-primary"}`}>
                    {msg.quoted_msg.sender_type === "atendente" ? "Você" : contactName}
                  </p>
                  <p className={`text-xs truncate ${msg.sender_type === "atendente" ? "text-primary-foreground/60" : "text-muted-foreground"}`}>{stripQuotes(msg.quoted_msg.text)}</p>
                </div>
              )}
              {/* ─── Media block (audio/image/video/document/sticker) ─── */}
              {(msg.message_type === "audio" || msg.message_type === "image" || msg.message_type === "video" || msg.message_type === "document" || msg.message_type === "sticker") && (() => {
                const status = msg.media_status;
                const bestUrl = msg.media_storage_url || msg.media_url;
                // Show downloading placeholder only when there's no URL yet
                if ((status === "pending" || status === "downloading") && !bestUrl) {
                  return <DownloadingPlaceholder type={msg.message_type} filename={msg.media_filename} />;
                }
                // Failed and no URL fallback → show error card
                if (status === "failed" && !bestUrl) {
                  return <FailedMediaCard reason={msg.media_failure_reason} type={msg.message_type} filename={msg.media_filename} />;
                }
                if (status === "expired" && !bestUrl) {
                  return <ExpiredMediaCard type={msg.message_type} filename={msg.media_filename} />;
                }
                // Otherwise render the media (legacy NULL status falls here too)
                if (msg.message_type === "audio") {
                  return (
                    <div className="min-w-[220px]">
                      {bestUrl ? (
                        <>
                          <AudioWaveformPlayer
                            src={bestUrl}
                            isOutgoing={msg.sender_type === "atendente"}
                            msgId={msg.id}
                            durationSec={msg.audio_duration_sec}
                          />
                          <div className="flex items-center gap-1 mt-1">
                            {msg.is_voice_note === false && <span className="text-[9px] opacity-50 mr-1">♫</span>}
                            <a href={bestUrl} download={msg.media_filename || `audio_${msg.id}.ogg`} className="text-[9px] opacity-60 hover:opacity-100 flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
                              <File className="h-2.5 w-2.5" /> Baixar
                            </a>
                            {status === "failed" && (
                              <span className="text-[9px] text-destructive ml-1">⚠ link pode expirar</span>
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center gap-2 text-xs opacity-60 py-2"><Mic className="h-4 w-4" /><span>🎵 Áudio indisponível</span></div>
                      )}
                    </div>
                  );
                }
                if (msg.message_type === "sticker") {
                  return (
                    <div>
                      {bestUrl ? (
                        <img
                          src={bestUrl}
                          alt="Figurinha"
                          className="w-32 h-32 object-contain cursor-pointer"
                          onClick={() => onLightbox(bestUrl)}
                        />
                      ) : (
                        <div className="flex items-center gap-2 text-xs opacity-60 py-4 px-2"><Image className="h-4 w-4" /><span>Figurinha indisponível</span></div>
                      )}
                    </div>
                  );
                }
                if (msg.message_type === "image") {
                  return (
                    <div>
                      {bestUrl ? (
                        <>
                          <img src={bestUrl} alt="Imagem" className="rounded-lg max-w-[250px] max-h-[300px] object-cover cursor-pointer mb-1" onClick={() => onLightbox(bestUrl)} />
                          <div className="flex items-center gap-2 mt-1">
                            <a href={bestUrl} download={msg.media_filename || `imagem_${msg.id}.jpg`} className="text-[9px] opacity-60 hover:opacity-100 flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
                              <File className="h-2.5 w-2.5" /> Baixar
                            </a>
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center gap-2 text-xs opacity-60 py-4 px-2"><Image className="h-4 w-4" /><span>📷 Imagem indisponível</span></div>
                      )}
                      {msg.text && <p className="text-sm leading-relaxed mt-1"><Linkify text={stripQuotes(msg.text)} /></p>}
                    </div>
                  );
                }
                if (msg.message_type === "video") {
                  return (
                    <div>
                      {bestUrl ? (
                        <video controls className="rounded-lg max-w-[250px] max-h-[300px] mb-1"><source src={bestUrl} /></video>
                      ) : (
                        <div className="flex items-center gap-2 text-xs opacity-60 py-4 px-2"><Video className="h-4 w-4" /><span>🎬 Vídeo indisponível</span></div>
                      )}
                      {msg.text && <p className="text-sm leading-relaxed mt-1"><Linkify text={stripQuotes(msg.text)} /></p>}
                    </div>
                  );
                }
                // document
                {
                  const DocIcon = getDocIcon(msg.media_mimetype, msg.media_filename);
                  const filename = msg.media_filename || "Documento";
                  const sizeLabel = formatBytes(msg.media_size_bytes);
                  const isOutgoing = msg.sender_type === "atendente";
                  const isPdf = (msg.media_mimetype || "").toLowerCase().includes("pdf") || (msg.media_filename || "").toLowerCase().endsWith(".pdf");
                  const caption = msg.text && msg.text !== msg.media_filename ? stripQuotes(msg.text) : null;

                  // PDF preview (WhatsApp-like)
                  if (isPdf && bestUrl) {
                    return (
                      <div className="flex flex-col gap-1.5 max-w-[260px]">
                        <PdfThumbnail
                          url={bestUrl}
                          filename={filename}
                          width={240}
                          onClick={() => window.open(bestUrl, "_blank", "noopener,noreferrer")}
                        />
                        <div className={`flex items-center gap-2 px-2 py-1.5 rounded-md ${isOutgoing ? "bg-primary-foreground/10" : "bg-foreground/5"}`}>
                          <DocIcon className="h-4 w-4 shrink-0 opacity-70" />
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="text-xs font-medium truncate" title={filename}>{filename}</span>
                            <div className="flex items-center gap-2 text-[10px] opacity-70">
                              {sizeLabel && <span>{sizeLabel}</span>}
                              <span>PDF</span>
                            </div>
                          </div>
                          <a
                            href={bestUrl}
                            download={msg.media_filename || `documento_${msg.id}.pdf`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 h-7 w-7 rounded-full flex items-center justify-center hover:bg-foreground/10"
                            title="Baixar PDF"
                            onClick={e => e.stopPropagation()}
                          >
                            <Download className="h-3.5 w-3.5" />
                          </a>
                        </div>
                        {caption && <p className="text-sm leading-relaxed mt-0.5"><Linkify text={caption} /></p>}
                      </div>
                    );
                  }

                  return (
                    <div className="flex flex-col gap-1 max-w-[300px]">
                      <div className={`flex items-center gap-3 py-2 px-2 rounded-lg min-w-[220px] ${isOutgoing ? "bg-primary-foreground/10" : "bg-foreground/5"}`}>
                        <DocIcon className="h-8 w-8 shrink-0 opacity-80" />
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="text-sm font-medium truncate" title={filename}>{filename}</span>
                          <div className="flex items-center gap-2 text-[10px] opacity-70">
                            {sizeLabel && <span>{sizeLabel}</span>}
                            {msg.media_mimetype && <span className="truncate">{msg.media_mimetype.split("/")[1]?.toUpperCase()}</span>}
                          </div>
                        </div>
                        {bestUrl && (
                          <a
                            href={bestUrl}
                            download={msg.media_filename || `documento_${msg.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 h-8 w-8 rounded-full flex items-center justify-center hover:bg-foreground/10"
                            title="Baixar documento"
                            onClick={e => e.stopPropagation()}
                          >
                            <Download className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                      {caption && <p className="text-sm leading-relaxed mt-0.5"><Linkify text={caption} /></p>}
                    </div>
                  );
                }
              })()}
              {/* Text */}
              {msg.message_type === "text" && <p className="text-sm leading-relaxed whitespace-pre-wrap"><Linkify text={stripQuotes(displayText)} /></p>}
              <div className="flex items-center justify-end gap-1 mt-1">
                {msg.edited && <span className="text-[8px] opacity-50 italic">editada</span>}
                {msg.status === "failed" && onRetry && (
                  <button onClick={() => onRetry(msg)} className="text-[9px] text-destructive hover:underline flex items-center gap-0.5 mr-1" title="Reenviar">
                    <RotateCcw className="h-2.5 w-2.5" /> Reenviar
                  </button>
                )}
                {msg.status === "failed" && !onRetry && (
                  <span className="text-[9px] text-destructive italic mr-1 flex items-center gap-0.5">
                    <AlertCircle className="h-2.5 w-2.5" /> falha no envio
                  </span>
                )}
                {msg.status === "retrying" && <span className="text-[8px] opacity-70 italic mr-1">reenviando…</span>}
                {msg.status === "pending" && <span className="text-[8px] opacity-60 italic mr-1">enviando…</span>}
                {msg.status === "queued" && <span className="text-[8px] text-muted-foreground italic mr-1">na fila</span>}
                <span className="text-[9px] opacity-60">{formatMsgTime(msg.created_at)}</span>
                {msg.sender_type === "atendente" && getStatusIcon(msg.status)}
              </div>
            </div>
          </div>
        )}
      </div>
    </Fragment>
  );
}

export const MessageBubble = memo(MessageBubbleInner, (prev, next) => {
  return (
    prev.msg.id === next.msg.id &&
    prev.msg.text === next.msg.text &&
    prev.msg.status === next.msg.status &&
    prev.msg.edited === next.msg.edited &&
    prev.msg.media_url === next.msg.media_url &&
    prev.msg.media_storage_url === next.msg.media_storage_url &&
    prev.msg.media_status === next.msg.media_status &&
    prev.msg.media_failure_reason === next.msg.media_failure_reason &&
    prev.msg.media_filename === next.msg.media_filename &&
    prev.msg.media_size_bytes === next.msg.media_size_bytes &&
    prev.index === next.index &&
    prev.contactName === next.contactName &&
    prev.messages === next.messages
  );
});
