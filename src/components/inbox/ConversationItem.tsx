import { memo } from "react";
import { motion } from "framer-motion";
import { Mic, Image, Video, FileText, Pin, PinOff, Star, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Conversation, Stage } from "./types";
import { formatTimestamp, formatPhoneDisplay, getStageInfo, stripQuotes } from "./helpers";
import { WhatsAppAvatar } from "./WhatsAppAvatar";

interface ConversationItemProps {
  conv: Conversation;
  isSelected: boolean;
  profilePic?: string;
  onSelect: (id: string) => void;
  onTogglePin: (id: string, e?: React.MouseEvent) => void;
}

function getPreviewContent(raw: string) {
  if (!raw) return { icon: null, text: "Sem mensagens", italic: true };
  const lower = raw.toLowerCase();
  if (lower === "📎 audio" || lower.includes("mensagem de voz") || lower === "audio" || lower === "🎤 áudio")
    return { icon: <Mic className="h-3 w-3 text-primary shrink-0" />, text: "Mensagem de voz", italic: false };
  if (lower === "📎 image" || lower.includes("📷"))
    return { icon: <Image className="h-3 w-3 text-blue-400 shrink-0" />, text: "Foto", italic: false };
  if (lower === "📎 video" || lower.includes("🎬"))
    return { icon: <Video className="h-3 w-3 text-purple-400 shrink-0" />, text: "Vídeo", italic: false };
  if (lower === "📎 document" || lower.includes("📄"))
    return { icon: <FileText className="h-3 w-3 text-amber-400 shrink-0" />, text: "Documento", italic: false };
  return { icon: null, text: raw, italic: false };
}

function ConversationItemInner({ conv, isSelected, profilePic, onSelect, onTogglePin }: ConversationItemProps) {
  const stageInfo = getStageInfo(conv.stage);
  const previewRaw = stripQuotes((conv.last_message_preview || "").replace(/\n/g, " "));
  const contactName = conv.contact_name || "Sem nome";
  const lastMsgTime = new Date(conv.last_message_at).getTime();
  const hoursAgo = (Date.now() - lastMsgTime) / 3600000;
  const isUrgent = conv.unread_count > 3 || (conv.unread_count > 0 && hoursAgo > 24);
  const hasUnread = conv.unread_count > 0;
  const preview = getPreviewContent(previewRaw);

  return (
    <div
      onClick={() => onSelect(conv.id)}
      className={`group px-2.5 py-2.5 cursor-pointer transition-all border-l-2 hover:bg-accent/30 ${
        isSelected ? "bg-accent border-l-primary" : isUrgent ? "border-l-destructive/50" : "border-l-transparent"
      }`}
    >
      <div className="flex gap-2.5">
        {/* Avatar */}
        <div className="relative shrink-0">
          <WhatsAppAvatar
            src={profilePic}
            name={contactName}
            className="h-10 w-10"
            textClassName="text-xs"
          />
          {conv.is_vip && (
            <div className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-amber-500 flex items-center justify-center shadow-sm">
              <Star className="h-2.5 w-2.5 text-white" />
            </div>
          )}
          {hasUnread && (
            <div className="absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full bg-primary flex items-center justify-center text-[9px] font-bold text-primary-foreground shadow-sm">
              {conv.unread_count > 99 ? "99+" : conv.unread_count}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <span className={`text-xs font-semibold truncate ${hasUnread ? "text-foreground" : "text-foreground/80"}`}>
              {/^\d{10,}$/.test(contactName) ? formatPhoneDisplay(contactName) : contactName}
            </span>
            <div className="flex items-center gap-1 shrink-0">
              {conv.is_pinned && <Pin className="h-2.5 w-2.5 text-muted-foreground rotate-45" />}
              <span className={`text-[10px] ${hasUnread ? "text-primary font-bold" : "text-muted-foreground"}`}>
                {formatTimestamp(conv.last_message_at)}
              </span>
            </div>
          </div>

          <div className={`flex items-center gap-1.5 text-[11px] ${hasUnread ? "text-foreground font-medium" : "text-muted-foreground"}`}>
            {preview.icon}
            <span className={`truncate ${preview.italic ? "italic opacity-50" : ""}`}>{preview.text}</span>
          </div>

          {/* Bottom row: stage + tags */}
          <div className="flex items-center gap-1 mt-1.5 flex-wrap">
            <span className={`text-[8px] px-1.5 py-0.5 rounded-full text-white font-medium ${stageInfo.color}`}>
              {stageInfo.label}
            </span>
            {conv.tags?.slice(0, 2).map((tag, i) => (
              <span key={i} className="text-[8px] px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground font-medium">{tag}</span>
            ))}
            {/* Pin toggle on hover */}
            <button
              onClick={(e) => onTogglePin(conv.id, e)}
              className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
            >
              {conv.is_pinned ? <PinOff className="h-3 w-3 text-muted-foreground" /> : <Pin className="h-3 w-3 text-muted-foreground" />}
            </button>
            {isUrgent && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive font-medium flex items-center gap-0.5">
                <AlertTriangle className="h-2.5 w-2.5" /> Atenção
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export const ConversationItem = memo(ConversationItemInner, (prev, next) => {
  return (
    prev.conv.id === next.conv.id &&
    prev.isSelected === next.isSelected &&
    prev.conv.unread_count === next.conv.unread_count &&
    prev.conv.last_message_at === next.conv.last_message_at &&
    prev.conv.last_message_preview === next.conv.last_message_preview &&
    prev.conv.stage === next.conv.stage &&
    prev.conv.is_pinned === next.conv.is_pinned &&
    prev.conv.is_vip === next.conv.is_vip &&
    prev.conv.contact_name === next.conv.contact_name &&
    prev.profilePic === next.profilePic
  );
});
