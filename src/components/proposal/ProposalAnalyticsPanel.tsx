import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Eye, Activity, Share2, Target, Clock, BarChart3, Wifi,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  Viewer, Interaction, ClickEvent, timePerSection, topClickedTargets,
  isOnline, formatTime,
} from "@/lib/proposalAnalytics";
import KpiGrid from "./analytics/KpiGrid";
import LiveVisitorsCard from "./analytics/LiveVisitorsCard";
import SectionFunnelCard from "./analytics/SectionFunnelCard";
import HourlyActivityChart from "./analytics/HourlyActivityChart";
import GeographicCard from "./analytics/GeographicCard";
import AiInsightsCard from "./analytics/AiInsightsCard";
import ViewerDetailRow from "./analytics/ViewerDetailRow";

interface Props {
  proposalId: string;
}

export default function ProposalAnalyticsPanel({ proposalId }: Props) {
  const qc = useQueryClient();

  const { data: viewers = [], isLoading } = useQuery<Viewer[]>({
    queryKey: ["proposal-viewers", proposalId],
    queryFn: async () => {
      const { data } = await supabase
        .from("proposal_viewers" as any)
        .select("*")
        .eq("proposal_id", proposalId)
        .order("last_active_at", { ascending: false });
      return ((data as unknown) as Viewer[]) || [];
    },
    refetchInterval: 15000,
  });

  const { data: interactions = [] } = useQuery<Interaction[]>({
    queryKey: ["proposal-interactions", proposalId],
    queryFn: async () => {
      const { data } = await supabase
        .from("proposal_interactions" as any)
        .select("*")
        .eq("proposal_id", proposalId)
        .order("created_at", { ascending: false })
        .limit(500);
      return ((data as unknown) as Interaction[]) || [];
    },
    refetchInterval: 15000,
  });

  const { data: clicks = [] } = useQuery<ClickEvent[]>({
    queryKey: ["proposal-clicks", proposalId],
    queryFn: async () => {
      const { data } = await supabase
        .from("proposal_clicks" as any)
        .select("*")
        .eq("proposal_id", proposalId)
        .order("created_at", { ascending: false })
        .limit(1000);
      return ((data as unknown) as ClickEvent[]) || [];
    },
    refetchInterval: 15000,
  });

  const { data: shares = [] } = useQuery<any[]>({
    queryKey: ["proposal-shares", proposalId],
    queryFn: async () => {
      const { data } = await supabase
        .from("proposal_shares" as any)
        .select("*")
        .eq("proposal_id", proposalId)
        .order("created_at", { ascending: false });
      return (data || []) as any[];
    },
    refetchInterval: 30000,
  });

  // Realtime: invalidate queries when any analytics row changes
  useEffect(() => {
    const channel = supabase
      .channel(`proposal-analytics-${proposalId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "proposal_viewers", filter: `proposal_id=eq.${proposalId}` }, () => {
        qc.invalidateQueries({ queryKey: ["proposal-viewers", proposalId] });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "proposal_interactions", filter: `proposal_id=eq.${proposalId}` }, () => {
        qc.invalidateQueries({ queryKey: ["proposal-interactions", proposalId] });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "proposal_clicks", filter: `proposal_id=eq.${proposalId}` }, () => {
        qc.invalidateQueries({ queryKey: ["proposal-clicks", proposalId] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "proposal_shares", filter: `proposal_id=eq.${proposalId}` }, () => {
        qc.invalidateQueries({ queryKey: ["proposal-shares", proposalId] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [proposalId, qc]);

  const onlineCount = viewers.filter(isOnline).length;
  const sectionTime = timePerSection(interactions).slice(0, 8);
  const maxSectionTime = sectionTime[0]?.seconds || 1;
  const topTargets = topClickedTargets(clicks, 8);

  if (isLoading) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground animate-pulse">Carregando central de inteligência...</p>
      </Card>
    );
  }

  if (viewers.length === 0) {
    return (
      <Card className="p-8 text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto">
          <Eye className="w-5 h-5 text-muted-foreground/50" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Aguardando o primeiro acesso</p>
          <p className="text-xs text-muted-foreground mt-1">
            Envie a proposta para o cliente. Os indicadores aparecem aqui em tempo real assim que ele abrir.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header com status ao vivo */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Wifi className={cn("w-4 h-4", onlineCount > 0 ? "text-emerald-500 animate-pulse" : "text-muted-foreground/50")} />
          <p className="text-xs text-muted-foreground">
            {onlineCount > 0 ? (
              <span className="font-semibold text-emerald-600">{onlineCount} {onlineCount === 1 ? "pessoa visualizando" : "pessoas visualizando"} agora</span>
            ) : (
              "Atualizado em tempo real"
            )}
          </p>
        </div>
        <Badge variant="neutral" className="text-[9px]">
          {viewers.length} {viewers.length === 1 ? "visitante" : "visitantes"} no total
        </Badge>
      </div>

      <KpiGrid viewers={viewers} interactions={interactions} clicks={clicks} shares={shares} />

      <div className="grid lg:grid-cols-2 gap-4">
        <LiveVisitorsCard viewers={viewers} />
        <AiInsightsCard viewers={viewers} interactions={interactions} clicks={clicks} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <SectionFunnelCard viewers={viewers} />
        <GeographicCard viewers={viewers} />
      </div>

      <HourlyActivityChart interactions={interactions} />

      {/* Tempo por seção */}
      <Card className="p-4 space-y-3">
        <CardHeader className="p-0">
          <CardTitle className="text-xs flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> Tempo gasto em cada seção
          </CardTitle>
        </CardHeader>
        {sectionTime.length === 0 ? (
          <p className="text-[10px] text-muted-foreground">Sem dados de tempo por seção ainda.</p>
        ) : (
          <div className="space-y-2">
            {sectionTime.map((s) => (
              <div key={s.section} className="space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-foreground">{s.label}</span>
                  <span className="text-muted-foreground tabular-nums">{formatTime(s.seconds)}</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-accent/70"
                    style={{ width: `${Math.round((s.seconds / maxSectionTime) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Top elementos clicados */}
      <Card className="p-4 space-y-3">
        <CardHeader className="p-0">
          <CardTitle className="text-xs flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5" /> Elementos mais clicados
            <Badge variant="neutral" className="text-[9px] ml-auto">{clicks.length} cliques no total</Badge>
          </CardTitle>
        </CardHeader>
        {topTargets.length === 0 ? (
          <p className="text-[10px] text-muted-foreground">Nenhum clique registrado ainda.</p>
        ) : (
          <div className="space-y-1.5">
            {topTargets.map((t) => (
              <div key={t.label} className="flex items-center justify-between gap-2 text-[11px] py-1.5 px-2 rounded-lg hover:bg-muted/50">
                <span className="text-foreground truncate flex-1">{t.label}</span>
                <Badge variant="neutral" className="text-[9px] flex-shrink-0">
                  {t.count}x · {t.pct}%
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Compartilhamentos */}
      <Card className="p-4 space-y-3">
        <CardHeader className="p-0">
          <CardTitle className="text-xs flex items-center gap-1.5">
            <Share2 className="w-3.5 h-3.5" /> Compartilhamentos
            <Badge variant="neutral" className="text-[9px] ml-auto">
              {shares.length} {shares.length === 1 ? "link" : "links"} · {shares.reduce((s, x) => s + (x.open_count || 0), 0)} aberturas
            </Badge>
          </CardTitle>
        </CardHeader>
        {shares.length === 0 ? (
          <p className="text-[10px] text-muted-foreground">Ninguém compartilhou esta proposta ainda.</p>
        ) : (
          <div className="space-y-2">
            {shares.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between text-[11px] border border-border/30 rounded-lg p-2.5">
                <div className="min-w-0">
                  <p className="text-foreground truncate font-medium">
                    {s.shared_by_name || s.shared_by_email || "Visitante anônimo"}
                  </p>
                  <p className="text-muted-foreground text-[10px]">
                    {s.channel} · {format(new Date(s.created_at), "dd/MM HH:mm", { locale: ptBR })}
                    {s.last_opened_at && ` · último acesso ${formatDistanceToNow(new Date(s.last_opened_at), { locale: ptBR, addSuffix: true })}`}
                  </p>
                </div>
                <Badge className={cn("text-[9px] border-0", s.open_count > 0 ? "bg-emerald-500/15 text-emerald-600" : "bg-muted text-muted-foreground")}>
                  {s.open_count || 0}x aberto
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Visitantes detalhados */}
      <Card className="p-4 space-y-3">
        <CardHeader className="p-0">
          <CardTitle className="text-xs flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5" /> Visitantes detalhados
            <Badge variant="neutral" className="text-[9px] ml-auto">
              {viewers.length} {viewers.length === 1 ? "pessoa" : "pessoas"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <ScrollArea className="max-h-[500px] pr-2">
          <div className="space-y-2.5">
            {viewers.map((v) => (
              <ViewerDetailRow key={v.id} viewer={v} />
            ))}
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
}
