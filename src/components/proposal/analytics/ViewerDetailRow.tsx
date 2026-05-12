import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Eye, Clock, Smartphone, Monitor, MapPin, TrendingUp, MessageCircle, Flame, RefreshCw,
} from "lucide-react";
import { Viewer, parseUA, formatTime, isOnline, SECTION_LABELS } from "@/lib/proposalAnalytics";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Props {
  viewer: Viewer;
}

export default function ViewerDetailRow({ viewer: v }: Props) {
  const { browser, os } = parseUA(v.user_agent);
  const location = [v.city, v.region, v.country].filter(Boolean).join(", ");
  const online = isOnline(v);
  const score = v.engagement_score || 0;
  const totalViews = v.total_views || 1;
  const lastSection = v.sections_viewed && v.sections_viewed.length > 0
    ? v.sections_viewed[v.sections_viewed.length - 1]
    : null;

  const handleWhatsApp = () => {
    if (!v.phone) return;
    const phone = v.phone.replace(/\D/g, "");
    const msg = score >= 60
      ? `Oi ${v.name?.split(" ")[0] || ""}! Vi que você curtiu a proposta. Posso tirar alguma dúvida pra fechar?`
      : `Oi ${v.name?.split(" ")[0] || ""}! Vi que você abriu a proposta. Quer que eu te ajude a entender algum ponto?`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  return (
    <div
      className={cn(
        "border rounded-xl p-3 space-y-2 transition-colors",
        online ? "border-emerald-500/30 bg-emerald-500/5" : "border-border/40",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {online && (
              <span className="relative flex h-2 w-2 flex-shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
            )}
            <p className="text-sm font-semibold text-foreground truncate">
              {v.name || v.email}
            </p>
          </div>
          {v.name && (
            <p className="text-[10px] text-muted-foreground truncate">{v.email}</p>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {score >= 60 && (
            <Badge className="text-[9px] bg-red-500/10 text-red-500 border-0 gap-0.5">
              <Flame className="w-2.5 h-2.5" /> Quente
            </Badge>
          )}
          {score >= 30 && score < 60 && (
            <Badge className="text-[9px] bg-amber-500/10 text-amber-600 border-0">Morno</Badge>
          )}
          {v.cta_clicked && (
            <Badge className="text-[9px] bg-emerald-500/10 text-emerald-500 border-0">CTA</Badge>
          )}
          {v.whatsapp_clicked && (
            <Badge className="text-[9px] bg-emerald-500/10 text-emerald-500 border-0">WhatsApp</Badge>
          )}
          {totalViews >= 2 && (
            <Badge className="text-[9px] bg-accent/15 text-accent border-0 gap-0.5">
              <RefreshCw className="w-2.5 h-2.5" /> {totalViews}x
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Eye className="w-2.5 h-2.5" /> {totalViews}x visto
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-2.5 h-2.5" /> {formatTime(v.active_seconds || v.total_time_seconds || 0)} ativo
        </span>
        <span className="flex items-center gap-1 truncate">
          {v.device_type === "mobile" ? <Smartphone className="w-2.5 h-2.5" /> : <Monitor className="w-2.5 h-2.5" />}
          {browser} · {os}
        </span>
        <span className="flex items-center gap-1">
          <TrendingUp className="w-2.5 h-2.5" /> Score {score}%
        </span>
      </div>

      {(v.scroll_depth_max || lastSection || location) && (
        <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
          {v.scroll_depth_max && v.scroll_depth_max > 0 && (
            <span>Leu {v.scroll_depth_max}% da página</span>
          )}
          {lastSection && (
            <span>Última seção: {SECTION_LABELS[lastSection] || lastSection}</span>
          )}
          {location && (
            <span className="flex items-center gap-1">
              <MapPin className="w-2.5 h-2.5" /> {location}
            </span>
          )}
        </div>
      )}

      {(v.sections_viewed || []).length > 0 && (
        <div className="flex flex-wrap gap-1">
          {(v.sections_viewed as string[]).map((s) => (
            <Badge key={s} variant="neutral" className="text-[8px]">
              {SECTION_LABELS[s] || s}
            </Badge>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 pt-1">
        <p className="text-[9px] text-muted-foreground/60">
          Último acesso: {formatDistanceToNow(new Date(v.last_active_at), { locale: ptBR, addSuffix: true })}
        </p>
        {v.phone && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleWhatsApp}
            className="h-7 text-[10px] gap-1"
          >
            <MessageCircle className="w-3 h-3" />
            Follow-up
          </Button>
        )}
      </div>
    </div>
  );
}
