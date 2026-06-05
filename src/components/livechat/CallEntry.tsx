import { Phone, PhoneMissed, PhoneIncoming, PhoneOutgoing, Video, VideoOff } from "lucide-react";
import type { WhatsAppCall } from "@/hooks/useConversationCalls";

function formatDuration(s: number): string {
  if (!s || s <= 0) return "";
  const m = Math.floor(s / 60);
  const sec = s % 60;
  if (m === 0) return `${sec}s`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

interface Props {
  call: WhatsAppCall;
}

/**
 * Card de chamada no estilo WhatsApp · aparece centralizado no chat
 * com ícone, status (perdida/atendida) e duração.
 */
export function CallEntry({ call }: Props) {
  const isMissed = call.call_status === "missed" || call.call_status === "rejected";
  const isVideo = call.is_video || call.call_type === "video";
  const accent = isMissed ? "text-rose-500" : "text-emerald-600";
  const bgRing = isMissed ? "ring-rose-200/60" : "ring-emerald-200/60";

  let Icon = Phone;
  if (isVideo) Icon = isMissed ? VideoOff : Video;
  else Icon = isMissed ? PhoneMissed : PhoneIncoming;

  let label = "Chamada";
  if (call.call_status === "missed") label = isVideo ? "Chamada de vídeo perdida" : "Chamada de voz perdida";
  else if (call.call_status === "rejected") label = isVideo ? "Chamada de vídeo recusada" : "Chamada de voz recusada";
  else if (call.call_status === "accepted") label = isVideo ? "Chamada de vídeo" : "Chamada de voz";
  else if (call.call_status === "terminated") label = isVideo ? "Chamada de vídeo encerrada" : "Chamada de voz encerrada";
  else if (call.call_status === "offered") label = isVideo ? "Tocando · vídeo" : "Tocando";

  const duration = formatDuration(call.duration_seconds);
  const time = formatTime(call.started_at);

  return (
    <div className="flex justify-center my-2">
      <div
        className={`flex items-center gap-3 max-w-[80%] px-4 py-2.5 rounded-2xl bg-card border border-border/60 shadow-sm ring-1 ${bgRing}`}
      >
        <div className={`flex h-9 w-9 items-center justify-center rounded-full bg-muted ${accent}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className={`text-[13px] font-medium ${isMissed ? "text-rose-600" : "text-foreground"}`}>
            {label}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {time}
            {duration ? ` · ${duration}` : ""}
          </span>
        </div>
      </div>
    </div>
  );
}
