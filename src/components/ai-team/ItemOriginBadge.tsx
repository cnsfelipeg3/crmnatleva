import { Clock, User, Bot, Sparkles, Crown } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

interface ItemOriginBadgeProps {
  createdAt?: string | null;
  createdBy?: string | null;
  originType?: string | null;
  tags?: string[] | null;
  className?: string;
}

const ORIGIN_LABELS: Record<string, { label: string; icon: typeof Bot; color: string }> = {
  nath_opinion: { label: "Opinião da Nath", icon: Crown, color: "text-purple-500" },
  manual: { label: "Manual", icon: User, color: "text-blue-500" },
  learned: { label: "IA Aprendizado", icon: Bot, color: "text-amber-500" },
  validated: { label: "Validado", icon: Sparkles, color: "text-emerald-500" },
  system: { label: "Sistema", icon: Bot, color: "text-muted-foreground" },
  import: { label: "Importação", icon: Bot, color: "text-muted-foreground" },
};

export function NathOriginTag() {
  return (
    <Badge className="text-[10px] px-1.5 py-0 bg-purple-500/15 text-purple-600 border border-purple-300/40 gap-1 font-semibold">
      <Crown className="h-2.5 w-2.5" />
      Opinião da Nath
    </Badge>
  );
}

export function isFromNath(originType?: string | null, tags?: string[] | null): boolean {
  return originType === "nath_opinion" || (tags || []).includes("nath");
}

export function ItemOriginBadge({ createdAt, createdBy, originType, tags, className = "" }: ItemOriginBadgeProps) {
  if (!createdAt) return null;

  const date = new Date(createdAt);
  const formatted = format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  const fromNath = isFromNath(originType, tags);
  const origin = ORIGIN_LABELS[originType || ""] || null;
  const OriginIcon = origin?.icon || Clock;

  return (
    <div className={`flex items-center gap-2 flex-wrap text-[10px] text-muted-foreground ${className}`}>
      <span className="flex items-center gap-1">
        <Clock className="h-3 w-3" />
        {formatted}
      </span>
      {fromNath ? (
        <NathOriginTag />
      ) : origin ? (
        <span className={`flex items-center gap-1 ${origin.color}`}>
          <OriginIcon className="h-3 w-3" />
          {origin.label}
        </span>
      ) : null}
      {createdBy && (
        <span className="flex items-center gap-1">
          <User className="h-3 w-3" />
          {createdBy}
        </span>
      )}
    </div>
  );
}
