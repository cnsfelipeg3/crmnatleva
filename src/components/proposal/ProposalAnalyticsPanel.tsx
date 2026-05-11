import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Eye, Clock, Monitor, Smartphone, MapPin, MousePointerClick,
  Users, TrendingUp, Flame, Globe, BarChart3, Activity, Share2, Target,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Props {
  proposalId: string;
}

function parseUA(ua: string | null): { browser: string; os: string } {
  if (!ua) return { browser: "Desconhecido", os: "Desconhecido" };
  let browser = "Outro";
  if (ua.includes("Chrome") && !ua.includes("Edg")) browser = "Chrome";
  else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
  else if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Edg")) browser = "Edge";

  let os = "Outro";
  if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac")) os = "macOS";
  else if (ua.includes("Linux")) os = "Linux";

  return { browser, os };
}

export default function ProposalAnalyticsPanel({ proposalId }: Props) {
  const { data: viewers, isLoading: loadingViewers } = useQuery({
    queryKey: ["proposal-viewers", proposalId],
    queryFn: async () => {
      const { data } = await supabase
        .from("proposal_viewers" as any)
        .select("*")
        .eq("proposal_id", proposalId)
        .order("last_active_at", { ascending: false });
      return (data || []) as any[];
    },
    refetchInterval: 30000,
  });

  const { data: interactions } = useQuery({
    queryKey: ["proposal-interactions", proposalId],
    queryFn: async () => {
      const { data } = await supabase
        .from("proposal_interactions" as any)
        .select("*")
        .eq("proposal_id", proposalId)
        .order("created_at", { ascending: false })
        .limit(200);
      return (data || []) as any[];
    },
    refetchInterval: 30000,
  });

  const totalViews = viewers?.reduce((sum: number, v: any) => sum + (v.total_views || 1), 0) || 0;
  const uniqueViewers = viewers?.length || 0;
  const totalTime = viewers?.reduce((sum: number, v: any) => sum + (v.total_time_seconds || 0), 0) || 0;
  const avgEngagement = uniqueViewers > 0
    ? Math.round(viewers!.reduce((sum: number, v: any) => sum + (v.engagement_score || 0), 0) / uniqueViewers)
    : 0;
  const ctaClicks = viewers?.filter((v: any) => v.cta_clicked).length || 0;
  const whatsappClicks = viewers?.filter((v: any) => v.whatsapp_clicked).length || 0;
  const devices = viewers?.reduce((acc: Record<string, number>, v: any) => {
    const d = v.device_type || "unknown";
    acc[d] = (acc[d] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  // Section heatmap
  const sectionHeat = (interactions || []).reduce((acc: Record<string, number>, i: any) => {
    if (i.section_name) acc[i.section_name] = (acc[i.section_name] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const topSections = Object.entries(sectionHeat)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 6);
  const maxSectionHits = topSections.length > 0 ? (topSections[0][1] as number) : 1;

  if (loadingViewers) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground animate-pulse">Carregando analytics...</p>
      </Card>
    );
  }

  if (uniqueViewers === 0) {
    return (
      <Card className="p-6 text-center space-y-2">
        <Eye className="w-8 h-8 text-muted-foreground/40 mx-auto" />
        <p className="text-sm text-muted-foreground">Nenhuma visualização registrada ainda.</p>
        <p className="text-xs text-muted-foreground/60">Envie a proposta ao cliente para começar a rastrear.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <MiniKpi icon={Eye} label="Visualizações" value={totalViews} />
        <MiniKpi icon={Users} label="Visitantes" value={uniqueViewers} />
        <MiniKpi icon={Clock} label="Tempo total" value={formatTime(totalTime)} />
        <MiniKpi icon={TrendingUp} label="Engajamento" value={`${avgEngagement}%`} accent={avgEngagement >= 60} />
        <MiniKpi icon={MousePointerClick} label="CTAs" value={ctaClicks} accent={ctaClicks > 0} />
        <MiniKpi icon={Flame} label="WhatsApp" value={whatsappClicks} accent={whatsappClicks > 0} />
      </div>

      {/* Devices */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Card className="p-4 space-y-3">
          <CardHeader className="p-0">
            <CardTitle className="text-xs flex items-center gap-1.5">
              <Monitor className="w-3.5 h-3.5" /> Dispositivos
            </CardTitle>
          </CardHeader>
          <div className="space-y-2">
            {Object.entries(devices).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5">
                  {type === "mobile" ? <Smartphone className="w-3 h-3" /> : <Monitor className="w-3 h-3" />}
                  {type === "mobile" ? "Mobile" : "Desktop"}
                </span>
                <Badge variant="neutral" className="text-[10px]">{String(count)}</Badge>
              </div>
            ))}
          </div>
        </Card>

        {/* Section Heatmap */}
        <Card className="p-4 space-y-3">
          <CardHeader className="p-0">
            <CardTitle className="text-xs flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5" /> Seções mais vistas
            </CardTitle>
          </CardHeader>
          <div className="space-y-2">
            {topSections.map(([section, hits]) => (
              <div key={section} className="space-y-1">
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span className="capitalize">{section}</span>
                  <span>{String(hits)}x</span>
                </div>
                <Progress
                  value={Math.round(((hits as number) / maxSectionHits) * 100)}
                  className="h-1.5"
                />
              </div>
            ))}
            {topSections.length === 0 && (
              <p className="text-[10px] text-muted-foreground">Sem dados de seções ainda</p>
            )}
          </div>
        </Card>
      </div>

      {/* Viewers list */}
      <Card className="p-4 space-y-3">
        <CardHeader className="p-0">
          <CardTitle className="text-xs flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5" /> Visitantes detalhados
          </CardTitle>
        </CardHeader>
        <ScrollArea className="max-h-[400px]">
          <div className="space-y-3">
            {(viewers || []).map((v: any) => {
              const { browser, os } = parseUA(v.user_agent);
              const location = [v.city, v.region, v.country].filter(Boolean).join(", ");
              return (
                <div key={v.id} className="border border-border/30 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {v.name || v.email}
                      </p>
                      {v.name && (
                        <p className="text-[10px] text-muted-foreground">{v.email}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {v.engagement_score >= 60 && (
                        <Badge className="text-[9px] bg-red-500/10 text-red-500 border-0">🔥 Quente</Badge>
                      )}
                      {v.cta_clicked && (
                        <Badge className="text-[9px] bg-emerald-500/10 text-emerald-500 border-0">CTA ✓</Badge>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Eye className="w-2.5 h-2.5" /> {v.total_views || 1}x visto
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" /> {formatTime(v.total_time_seconds || 0)}
                    </span>
                    <span className="flex items-center gap-1">
                      {v.device_type === "mobile" ? <Smartphone className="w-2.5 h-2.5" /> : <Monitor className="w-2.5 h-2.5" />}
                      {browser} / {os}
                    </span>
                    <span className="flex items-center gap-1">
                      <TrendingUp className="w-2.5 h-2.5" /> Score: {v.engagement_score || 0}%
                    </span>
                  </div>

                  {location && (
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <MapPin className="w-2.5 h-2.5" /> {location}
                    </div>
                  )}

                  {(v.sections_viewed || []).length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {(v.sections_viewed as string[]).map((s: string) => (
                        <Badge key={s} variant="neutral" className="text-[8px] capitalize">{s}</Badge>
                      ))}
                    </div>
                  )}

                  <p className="text-[9px] text-muted-foreground/60">
                    Último acesso: {formatDistanceToNow(new Date(v.last_active_at), { locale: ptBR, addSuffix: true })}
                  </p>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
}

function MiniKpi({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string | number; accent?: boolean }) {
  return (
    <Card className={cn("p-3 flex items-center gap-2.5", accent && "border-accent/30 bg-accent/5")}>
      <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", accent ? "bg-accent/15" : "bg-muted")}>
        <Icon className={cn("w-3.5 h-3.5", accent ? "text-accent" : "text-muted-foreground")} />
      </div>
      <div>
        <p className="text-sm font-bold text-foreground leading-none">{value}</p>
        <p className="text-[9px] text-muted-foreground mt-0.5">{label}</p>
      </div>
    </Card>
  );
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}min`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}min`;
}
