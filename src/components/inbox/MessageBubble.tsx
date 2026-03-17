import { memo, Fragment } from "react";
import { Check, CheckCheck, Bot, ChevronRight, Pencil, Mic, Image, Video, FileText, File } from "lucide-react";
import { AudioWaveformPlayer } from "@/components/livechat/AudioWaveformPlayer";
import type { Message, MsgStatus } from "./types";
import { formatMsgTime, formatDateSeparator, shouldShowDateSeparator, stripQuotes } from "./helpers";

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
  if (status === "read") return <CheckCheck className="h-3.5 w-3.5 text-[#53bdeb]" style={{ filter: 'drop-shadow(0 0 1px rgba(83,189,235,0.5))' }} />;
  if (status === "delivered") return <CheckCheck className="h-3 w-3 text-white" />;
  return <Check className="h-3 w-3 text-white" />;
}

interface MessageBubbleProps {
  msg: Message;
  messages: Message[];
  index: number;
  contactName: string;
  onReply: (msg: Message) => void;
  onEdit: (msg: Message) => void;
  onLightbox: (url: string) => void;
}

function MessageBubbleInner({ msg, messages, index, contactName, onReply, onEdit, onLightbox }: MessageBubbleProps) {
  const showDate = shouldShowDateSeparator(messages, index);

  return (
    <Fragment>
      {showDate && (
        <div className="flex justify-center my-4">
          <span className="bg-secondary/80 text-muted-foreground text-[10px] font-medium px-3 py-1.5 rounded-full">{formatDateSeparator(msg.created_at)}</span>
        </div>
      )}
      <div className={`flex ${msg.sender_type === "atendente" ? "justify-end" : msg.sender_type === "sistema" ? "justify-center" : "justify-start"}`}>
        {msg.sender_type === "sistema" ? (
          <div className="max-w-[85%] rounded-xl px-4 py-2.5 bg-muted/50 border border-border">
            <div className="flex items-center gap-1.5 mb-1">
              <Bot className="h-3 w-3 text-primary" />
              <span className="text-[9px] font-bold text-primary uppercase tracking-wider">Sistema / Bot</span>
            </div>
            <p className="text-sm leading-relaxed text-foreground"><Linkify text={stripQuotes(msg.text)} /></p>
            <span className="text-[9px] text-muted-foreground">{formatMsgTime(msg.created_at)}</span>
          </div>
        ) : (
          <div className="group relative max-w-[70%]">
            <div className={`absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 z-10 ${msg.sender_type === "atendente" ? "-left-[72px]" : "-right-[72px]"}`}>
              <button onClick={() => onReply(msg)} className="h-7 w-7 rounded-full bg-secondary/80 hover:bg-secondary flex items-center justify-center" title="Responder">
                <ChevronRight className={`h-3.5 w-3.5 text-muted-foreground ${msg.sender_type === "atendente" ? "rotate-180" : ""}`} />
              </button>
              {msg.sender_type === "atendente" && msg.message_type === "text" && new Date(msg.created_at).getTime() > Date.now() - 3600000 && (
                <button onClick={() => onEdit(msg)} className="h-7 w-7 rounded-full bg-secondary/80 hover:bg-secondary flex items-center justify-center" title="Editar">
                  <Pencil className="h-3 w-3 text-muted-foreground" />
                </button>
              )}
            </div>
            <div className={`rounded-2xl px-4 py-2.5 ${msg.sender_type === "atendente" ? "bg-primary text-primary-foreground rounded-br-md" : "bg-secondary text-secondary-foreground rounded-bl-md"}`}>
              {msg.quoted_msg && (
                <div className={`rounded-lg px-3 py-1.5 mb-2 border-l-2 ${msg.sender_type === "atendente" ? "bg-primary-foreground/10 border-primary-foreground/40" : "bg-foreground/5 border-primary/40"}`}>
                  <p className={`text-[10px] font-bold ${msg.sender_type === "atendente" ? "text-primary-foreground/70" : "text-primary"}`}>
                    {msg.quoted_msg.sender_type === "atendente" ? "Você" : contactName}
                  </p>
                  <p className={`text-xs truncate ${msg.sender_type === "atendente" ? "text-primary-foreground/60" : "text-muted-foreground"}`}>{stripQuotes(msg.quoted_msg.text)}</p>
                </div>
              )}
              {/* Audio */}
              {msg.message_type === "audio" && (
                <div className="min-w-[220px]">
                  {msg.media_url ? (
                    <>
                      <AudioWaveformPlayer src={msg.media_url} isOutgoing={msg.sender_type === "atendente"} msgId={msg.id} />
                      <div className="flex items-center gap-1 mt-1">
                        <a href={msg.media_url} download={`audio_${msg.id}.ogg`} className="text-[9px] opacity-60 hover:opacity-100 flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
                          <File className="h-2.5 w-2.5" /> Baixar
                        </a>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-2 text-xs opacity-60 py-2"><Mic className="h-4 w-4" /><span>🎵 Áudio indisponível</span></div>
                  )}
                </div>
              )}
              {/* Image */}
              {msg.message_type === "image" && (
                <div>
                  {msg.media_url ? (
                    <>
                      <img src={msg.media_url} alt="Imagem" className="rounded-lg max-w-[250px] max-h-[300px] object-cover cursor-pointer mb-1" onClick={() => onLightbox(msg.media_url!)} />
                      <div className="flex items-center gap-2 mt-1">
                        <a href={msg.media_url} download={`imagem_${msg.id}.jpg`} className="text-[9px] opacity-60 hover:opacity-100 flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
                          <File className="h-2.5 w-2.5" /> Baixar
                        </a>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-2 text-xs opacity-60 py-4 px-2"><Image className="h-4 w-4" /><span>📷 Imagem indisponível</span></div>
                  )}
                  {msg.text && <p className="text-sm leading-relaxed mt-1"><Linkify text={stripQuotes(msg.text)} /></p>}
                </div>
              )}
              {/* Video */}
              {msg.message_type === "video" && (
                <div>
                  {msg.media_url ? (
                    <video controls className="rounded-lg max-w-[250px] max-h-[300px] mb-1"><source src={msg.media_url} /></video>
                  ) : (
                    <div className="flex items-center gap-2 text-xs opacity-60 py-4 px-2"><Video className="h-4 w-4" /><span>🎬 Vídeo indisponível</span></div>
                  )}
                  {msg.text && <p className="text-sm leading-relaxed mt-1"><Linkify text={stripQuotes(msg.text)} /></p>}
                </div>
              )}
              {/* Document */}
              {msg.message_type === "document" && (
                <div className="flex items-center gap-2 py-1">
                  <FileText className="h-5 w-5 shrink-0" />
                  {msg.media_url ? (
                    <a href={msg.media_url} target="_blank" rel="noopener noreferrer" className="text-sm underline hover:opacity-80">{msg.text || "Documento"}</a>
                  ) : (
                    <span className="text-sm">{msg.text || "Documento"}</span>
                  )}
                </div>
              )}
              {/* Text */}
              {msg.message_type === "text" && <p className="text-sm leading-relaxed whitespace-pre-wrap"><Linkify text={stripQuotes(msg.text)} /></p>}
              <div className="flex items-center justify-end gap-1 mt-1">
                {msg.edited && <span className="text-[8px] opacity-50 italic">editada</span>}
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
    prev.index === next.index &&
    prev.contactName === next.contactName &&
    // Check if date separator would change (only if messages array ref changes)
    prev.messages === next.messages
  );
});
