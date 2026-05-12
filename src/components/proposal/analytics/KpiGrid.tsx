import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Eye, Users, Clock, TrendingUp, ArrowDownToLine, RefreshCw,
  MousePointerClick, MessageCircle, Share2, Zap, Smartphone, Activity,
} from "lucide-react";
import {
  Viewer, ClickEvent, returnRate, avgScrollDepth, avgTimePerVisit,
  dominantDevice, formatTime, peakHour, Interaction,
} from "@/lib/proposalAnalytics";

interface Props {
  viewers: Viewer[];
  interactions: Interaction[];
  clicks: ClickEvent[];
  shares: { open_count: number | null }[];
}

export default function KpiGrid({ viewers, interactions, clicks, shares }: Props) {
  const totalViews = viewers.reduce((s, v) => s + (v.total_views || 1), 0);
  const uniqueViewers = viewers.length;
  const totalTime = viewers.reduce((s, v) => s + (v.total_time_seconds || 0), 0);
  const avgEngagement = uniqueViewers > 0
    ? Math.round(viewers.reduce((s, v) => s + (v.engagement_score || 0), 0) / uniqueViewers)
    : 0;
  const avgVisit = avgTimePerVisit(viewers);
  const avgScroll = avgScrollDepth(viewers);
  const returnPct = returnRate(viewers);
  const ctaClicks = viewers.filter((v) => v.cta_clicked).length;
  const whatsappClicks = viewers.filter((v) => v.whatsapp_clicked).length;
  const totalShares = shares.length;
  const totalShareOpens = shares.reduce((s, x) => s + (x.open_count || 0), 0);
  const dev = dominantDevice(viewers);
  const peak = peakHour(interactions);
  const totalClicks = clicks.length;

  const items: KpiItem[] = [
    { icon: Eye, label: "Visualizações", value: fmtNumber(totalViews), hint: uniqueViewers > 0 ? `${uniqueViewers} ${uniqueViewers === 1 ? "pessoa" : "pessoas"}` : undefined },
    { icon: Users, label: "Visitantes únicos", value: fmtNumber(uniqueViewers), hint: returnPct > 0 ? `${returnPct}% retornaram` : undefined },
    { icon: Clock, label: "Tempo total", value: formatTime(totalTime), hint: avgVisit > 0 ? `${formatTime(avgVisit)} média` : undefined },
    { icon: TrendingUp, label: "Engajamento", value: `${avgEngagement}%`, tone: avgEngagement >= 60 ? "hot" : avgEngagement >= 30 ? "warm" : "cold" },
    { icon: ArrowDownToLine, label: "Scroll profundo", value: avgScroll > 0 ? `${avgScroll}%` : "·", hint: avgScroll >= 75 ? "leu até o fim" : avgScroll >= 40 ? "leu boa parte" : "leu o início" },
    { icon: RefreshCw, label: "Taxa de retorno", value: returnPct > 0 ? `${returnPct}%` : "·", hint: returnPct >= 30 ? "interesse alto" : undefined },
    { icon: MousePointerClick, label: "Cliques em CTA", value: fmtNumber(ctaClicks), hint: uniqueViewers > 0 ? `${Math.round((ctaClicks / uniqueViewers) * 100)}% conversão` : undefined, tone: ctaClicks > 0 ? "hot" : undefined },
    { icon: MessageCircle, label: "Cliques no WhatsApp", value: fmtNumber(whatsappClicks), tone: whatsappClicks > 0 ? "hot" : undefined },
    { icon: Activity, label: "Cliques totais", value: fmtNumber(totalClicks), hint: totalClicks > 0 ? "interagiu" : undefined },
    { icon: Share2, label: "Compartilhamentos", value: fmtNumber(totalShares), hint: totalShares > 0 ? `${totalShareOpens} aberturas` : "ninguém compartilhou" },
    { icon: Smartphone, label: "Dispositivo", value: dev.type === "·" ? "·" : labelDevice(dev.type), hint: dev.pct > 0 ? `${dev.pct}% dos acessos` : undefined },
    { icon: Zap, label: "Hora de pico", value: peak ? `${String(peak.hour).padStart(2, "0")}h` : "·", hint: peak ? `${peak.count} acessos` : undefined },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2.5">
      {items.map((item) => (
        <KpiCard key={item.label} {...item} />
      ))}
    </div>
  );
}

type KpiTone = "hot" | "warm" | "cold";
type KpiItem = {
  icon: any;
  label: string;
  value: string;
  hint?: string;
  tone?: KpiTone;
};

function KpiCard({ icon: Icon, label, value, hint, tone }: KpiItem) {
  return (
    <Card
      className={cn(
        "p-3 flex items-start gap-2.5 rounded-2xl border-border/40 transition-colors",
        tone === "hot" && "border-accent/40 bg-accent/5",
        tone === "warm" && "border-amber-500/30 bg-amber-500/5",
      )}
    >
      <div
        className={cn(
          "w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0",
          tone === "hot" ? "bg-accent/15 text-accent" :
          tone === "warm" ? "bg-amber-500/15 text-amber-600" :
          "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-base font-bold text-foreground leading-tight truncate">{value}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{label}</p>
        {hint && (
          <p className="text-[9px] text-muted-foreground/70 mt-0.5 leading-tight truncate">{hint}</p>
        )}
      </div>
    </Card>
  );
}

function fmtNumber(n: number): string {
  return n.toLocaleString("pt-BR");
}

function labelDevice(t: string): string {
  if (t === "mobile") return "Mobile";
  if (t === "tablet") return "Tablet";
  return "Desktop";
}
