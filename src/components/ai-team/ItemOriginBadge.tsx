import { Clock, User, Bot, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ItemOriginBadgeProps {
  createdAt?: string | null;
  createdBy?: string | null;
  originType?: string | null;
  className?: string;
}

const ORIGIN_LABELS: Record<string, { label: string; icon: typeof Bot; color: string }> = {
  nath_opinion: { label: "Opinião da Nath", icon: Sparkles, color: "text-purple-500" },
  manual: { label: "Manual", icon: User, color: "text-blue-500" },
  learned: { label: "IA Aprendizado", icon: Bot, color: "text-amber-500" },
  validated: { label: "Validado", icon: Sparkles, color: "text-emerald-500" },
  system: { label: "Sistema", icon: Bot, color: "text-muted-foreground" },
  import: { label: "Importação", icon: Bot, color: "text-muted-foreground" },
};

export function ItemOriginBadge({ createdAt, createdBy, originType, className = "" }: ItemOriginBadgeProps) {
  if (!createdAt) return null;

  const date = new Date(createdAt);
  const formatted = format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

  const origin = ORIGIN_LABELS[originType || ""] || null;
  const OriginIcon = origin?.icon || Clock;

  return (
    <div className={`flex items-center gap-2 flex-wrap text-[10px] text-muted-foreground ${className}`}>
      <span className="flex items-center gap-1">
        <Clock className="h-3 w-3" />
        {formatted}
      </span>
      {origin && (
        <span className={`flex items-center gap-1 ${origin.color}`}>
          <OriginIcon className="h-3 w-3" />
          {origin.label}
        </span>
      )}
      {createdBy && (
        <span className="flex items-center gap-1">
          <User className="h-3 w-3" />
          {createdBy}
        </span>
      )}
    </div>
  );
}
