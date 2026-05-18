// =====================================================================
// Painel de Insights do Produto · espelha o painel de propostas
// · KPIs em tempo real (views, visitantes, tempo, engajamento, CTAs)
// · Funil de seções, top cliques, hora de pico, dispositivo, geo
// · Visitantes detalhados + insights automáticos da Nath
// =====================================================================
import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Eye, Users, Clock, TrendingUp, MousePointerClick, MessageCircle,
  Smartphone, Zap, Wifi, Activity, Target, Filter, Globe, Sparkles,
  AlertTriangle, CheckCircle2, Info, BarChart3,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { formatTime, parseUA } from "@/lib/proposalAnalytics";

interface Props {
  productId: string;
}

type Viewer = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  device_type: string | null;
  user_agent: string | null;
  total_views: number;
  active_seconds: number;
  whatsapp_clicked: boolean;
  cta_clicked: boolean;
  utm_source: string | null;
  utm_campaign: string | null;
  first_viewed_at: string;
  last_active_at: string;
};

type Event = {
  id: string;
  viewer_id: string | null;
  email: string;
  event_type: string;
  section: string | null;
  target: string | null;
  metadata: any;
  created_at: string;
};

const SECTION_LABELS: Record<string, string> = {
  hero: "Capa",
  galeria: "Galeria",
  gallery: "Galeria",
  highlights: "Destaques",
  includes: "O que inclui",
  itinerary: "Roteiro",
  hospedagem: "Hospedagem",
  hotel: "Hospedagem",
  pagamento: "Pagamento",
  payment: "Pagamento",
  cta: "Botão de garantir vaga",
  whatsapp: "WhatsApp",
  faq: "Dúvidas",
  reviews: "Avaliações",
};
const labelSection = (s?: string | null) =>
  s ? SECTION_LABELS[s.toLowerCase()] || s.replace(/[-_]/g, " ") : "·";

const isOnline = (v: Viewer) =>
  Date.now() - new Date(v.last_active_at).getTime() < 2 * 60 * 1000;

export default function ProductInsightsPanel({ productId }: Props) {
  const qc = useQueryClient();

  const { data: viewers = [], isLoading } = useQuery<Viewer[]>({
    queryKey: ["product-viewers", productId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("prateleira_product_viewers")
        .select("*")
        .eq("product_id", productId)
        .order("last_active_at", { ascending: false });
      return (data || []) as Viewer[];
    },
    refetchInterval: 15000,
  });

  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["product-events", productId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("prateleira_viewer_events")
        .select("*")
        .eq("product_id", productId)
        .order("created_at", { ascending: false })
        .limit(1000);
      return (data || []) as Event[];
    },
    refetchInterval: 15000,
  });

  useEffect(() => {
    const ch = supabase
      .channel(`product-insights-${productId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "prateleira_product_viewers", filter: `product_id=eq.${productId}` }, () => {
        qc.invalidateQueries({ queryKey: ["product-viewers", productId] });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "prateleira_viewer_events", filter: `product_id=eq.${productId}` }, () => {
        qc.invalidateQueries({ queryKey: ["product-events", productId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [productId, qc]);

  const clicks = useMemo(() => events.filter((e) => e.event_type === "click"), [events]);
  const sectionViews = useMemo(() => events.filter((e) => e.event_type === "section_view"), [events]);

  const totalViews = viewers.reduce((s, v) => s + (v.total_views || 1), 0);
  const uniqueViewers = viewers.length;
  const totalTime = viewers.reduce((s, v) => s + (v.active_seconds || 0), 0);
  const avgVisit = uniqueViewers > 0 ? Math.round(totalTime / uniqueViewers) : 0;
  const ctaClicks = viewers.filter((v) => v.cta_clicked).length;
  const whatsappClicks = viewers.filter((v) => v.whatsapp_clicked).length;
  const returnPct = uniqueViewers > 0
    ? Math.round((viewers.filter((v) => (v.total_views || 1) > 1).length / uniqueViewers) * 100)
    : 0;
  const onlineCount = viewers.filter(isOnline).length;

  // engajamento: combinação de tempo + CTAs + retorno
  const avgEngagement = uniqueViewers > 0
    ? Math.round(viewers.reduce((s, v) => {
        let sc = 0;
        sc += Math.min(40, Math.round((v.active_seconds || 0) / 4));
        if (v.cta_clicked) sc += 25;
        if (v.whatsapp_clicked) sc += 25;
        if ((v.total_views || 1) > 1) sc += 10;
        return s + Math.min(100, sc);
      }, 0) / uniqueViewers)
    : 0;

  // dispositivo dominante
  const deviceCounts = viewers.reduce<Record<string, number>>((acc, v) => {
    const t = (v.device_type || "desktop").toLowerCase();
    acc[t] = (acc[t] || 0) + 1; return acc;
  }, {});
  const dominantDev = Object.entries(deviceCounts).sort((a, b) => b[1] - a[1])[0];
  const devLabel = dominantDev ? (dominantDev[0] === "mobile" ? "Mobile" : dominantDev[0] === "tablet" ? "Tablet" : "Desktop") : "·";
  const devPct = dominantDev && uniqueViewers > 0 ? Math.round((dominantDev[1] / uniqueViewers) * 100) : 0;

  // hora de pico
  const hourBuckets: Record<number, number> = {};
  events.forEach((e) => {
    const h = new Date(e.created_at).getHours();
    hourBuckets[h] = (hourBuckets[h] || 0) + 1;
  });
  const peak = Object.entries(hourBuckets).sort((a, b) => b[1] - a[1])[0];

  // funil de seções
  const sectionCounts = new Map<string, Set<string>>();
  sectionViews.forEach((e) => {
    if (!e.section) return;
    const set = sectionCounts.get(e.section) || new Set();
    set.add(e.email); sectionCounts.set(e.section, set);
  });
  const funnel = Array.from(sectionCounts.entries())
    .map(([s, set]) => ({
      section: s,
      label: labelSection(s),
      count: set.size,
      pct: uniqueViewers > 0 ? Math.round((set.size / uniqueViewers) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // top cliques
  const clickCounts = new Map<string, number>();
  clicks.forEach((c) => {
    const t = c.target || "·";
    clickCounts.set(t, (clickCounts.get(t) || 0) + 1);
  });
  const topClicks = Array.from(clickCounts.entries())
    .map(([label, count]) => ({
      label,
      count,
      pct: clicks.length ? Math.round((count / clicks.length) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // geo
  const geoCounts = new Map<string, { city: string; country: string; count: number }>();
  viewers.forEach((v) => {
    const city = v.city || "·"; const country = v.country || "·";
    const key = `${city}|${country}`;
    const cur = geoCounts.get(key) || { city, country, count: 0 };
    cur.count += 1; geoCounts.set(key, cur);
  });
  const geo = Array.from(geoCounts.values()).sort((a, b) => b.count - a.count).slice(0, 6);
  const maxGeo = geo[0]?.count || 1;

  // insights automáticos
  const insights = useMemo(() => {
    const out: { tone: "success" | "warning" | "info"; title: string; detail: string }[] = [];
    if (uniqueViewers === 0) {
      out.push({ tone: "info", title: "Sem acessos ainda", detail: "Divulgue o link da página de venda para começar a coletar dados." });
      return out;
    }
    if (ctaClicks > 0) out.push({ tone: "success", title: `${ctaClicks} ${ctaClicks === 1 ? "pessoa clicou" : "pessoas clicaram"} em garantir vaga`, detail: "Quente. Vale acompanhar e abordar individualmente." });
    if (whatsappClicks > 0) out.push({ tone: "success", title: `${whatsappClicks} ${whatsappClicks === 1 ? "abriu" : "abriram"} o WhatsApp`, detail: "Confirme se a conversa entrou no inbox e responda rápido." });
    if (avgEngagement >= 60) out.push({ tone: "success", title: "Engajamento alto", detail: `Média de ${avgEngagement}%. O produto está prendendo a atenção.` });
    else if (avgEngagement < 25 && uniqueViewers >= 3) out.push({ tone: "warning", title: "Engajamento baixo", detail: "Considere revisar capa, preço e primeiras seções para reter mais." });
    if (returnPct >= 30) out.push({ tone: "success", title: `${returnPct}% voltaram a visitar`, detail: "Sinal forte de interesse. Pode valer um empurrão comercial." });
    if (ctaClicks === 0 && uniqueViewers >= 5) out.push({ tone: "warning", title: "Tráfego sem conversão", detail: "Muitas visitas e nenhum clique no CTA. Teste outro preço ou destaque." });
    if (onlineCount > 0) out.push({ tone: "info", title: `${onlineCount} ${onlineCount === 1 ? "pessoa olhando" : "pessoas olhando"} agora`, detail: "Hora ideal pra preparar uma mensagem." });
    if (out.length === 0) out.push({ tone: "info", title: "Dados ainda enxutos", detail: "Aguardando mais acessos para gerar recomendações." });
    return out;
  }, [uniqueViewers, ctaClicks, whatsappClicks, avgEngagement, returnPct, onlineCount]);

  if (isLoading) {
    return <Card className="p-6"><p className="text-sm text-muted-foreground animate-pulse">Carregando insights...</p></Card>;
  }

  if (uniqueViewers === 0) {
    return (
      <Card className="p-8 text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto">
          <BarChart3 className="w-5 h-5 text-muted-foreground/50" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Aguardando o primeiro acesso</p>
          <p className="text-xs text-muted-foreground mt-1">
            Compartilhe o link da página de venda. Os indicadores aparecem aqui em tempo real assim que alguém abrir.
          </p>
        </div>
      </Card>
    );
  }

  const kpis: { icon: any; label: string; value: string; hint?: string; tone?: "hot" | "warm" }[] = [
    { icon: Eye, label: "Visualizações", value: totalViews.toLocaleString("pt-BR"), hint: `${uniqueViewers} ${uniqueViewers === 1 ? "pessoa" : "pessoas"}` },
    { icon: Users, label: "Visitantes únicos", value: uniqueViewers.toLocaleString("pt-BR"), hint: returnPct > 0 ? `${returnPct}% retornaram` : undefined },
    { icon: Clock, label: "Tempo total", value: formatTime(totalTime), hint: avgVisit > 0 ? `${formatTime(avgVisit)} média` : undefined },
    { icon: TrendingUp, label: "Engajamento", value: `${avgEngagement}%`, tone: avgEngagement >= 60 ? "hot" : avgEngagement >= 30 ? "warm" : undefined },
    { icon: MousePointerClick, label: "Cliques no CTA", value: ctaClicks.toLocaleString("pt-BR"), hint: uniqueViewers > 0 ? `${Math.round((ctaClicks / uniqueViewers) * 100)}% conversão` : undefined, tone: ctaClicks > 0 ? "hot" : undefined },
    { icon: MessageCircle, label: "WhatsApp", value: whatsappClicks.toLocaleString("pt-BR"), tone: whatsappClicks > 0 ? "hot" : undefined },
    { icon: Activity, label: "Cliques totais", value: clicks.length.toLocaleString("pt-BR") },
    { icon: Smartphone, label: "Dispositivo", value: devLabel, hint: devPct > 0 ? `${devPct}% dos acessos` : undefined },
    { icon: Zap, label: "Hora de pico", value: peak ? `${String(peak[0]).padStart(2, "0")}h` : "·", hint: peak ? `${peak[1]} acessos` : undefined },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Wifi className={cn("w-4 h-4", onlineCount > 0 ? "text-emerald-500 animate-pulse" : "text-muted-foreground/50")} />
          <p className="text-xs text-muted-foreground">
            {onlineCount > 0
              ? <span className="font-semibold text-emerald-600">{onlineCount} {onlineCount === 1 ? "pessoa visualizando" : "pessoas visualizando"} agora</span>
              : "Atualizado em tempo real"}
          </p>
        </div>
        <Badge variant="neutral" className="text-[9px]">
          {uniqueViewers} {uniqueViewers === 1 ? "visitante" : "visitantes"} no total
        </Badge>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5">
        {kpis.map((k) => (
          <Card key={k.label} className={cn(
            "p-3 flex items-start gap-2.5 rounded-2xl border-border/40",
            k.tone === "hot" && "border-accent/40 bg-accent/5",
            k.tone === "warm" && "border-amber-500/30 bg-amber-500/5",
          )}>
            <div className={cn(
              "w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0",
              k.tone === "hot" ? "bg-accent/15 text-accent" :
              k.tone === "warm" ? "bg-amber-500/15 text-amber-600" :
              "bg-muted text-muted-foreground",
            )}>
              <k.icon className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-base font-bold text-foreground leading-tight truncate">{k.value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{k.label}</p>
              {k.hint && <p className="text-[9px] text-muted-foreground/70 mt-0.5 leading-tight truncate">{k.hint}</p>}
            </div>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Insights */}
        <Card className="p-4 space-y-3">
          <CardHeader className="p-0">
            <CardTitle className="text-xs flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-accent" /> Insights da Nath
              <span className="text-[9px] text-muted-foreground ml-auto font-normal">sugestões automáticas</span>
            </CardTitle>
          </CardHeader>
          <div className="space-y-2">
            {insights.map((i, idx) => {
              const Icon = i.tone === "success" ? CheckCircle2 : i.tone === "warning" ? AlertTriangle : Info;
              return (
                <div key={idx} className={cn(
                  "flex items-start gap-2 p-2.5 rounded-lg border",
                  i.tone === "warning" && "border-amber-500/25 bg-amber-500/5",
                  i.tone === "success" && "border-emerald-500/25 bg-emerald-500/5",
                  i.tone === "info" && "border-border/40 bg-muted/30",
                )}>
                  <Icon className={cn(
                    "w-3.5 h-3.5 flex-shrink-0 mt-0.5",
                    i.tone === "warning" && "text-amber-600",
                    i.tone === "success" && "text-emerald-600",
                    i.tone === "info" && "text-muted-foreground",
                  )} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold text-foreground leading-tight">{i.title}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{i.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Funil */}
        <Card className="p-4 space-y-3">
          <CardHeader className="p-0">
            <CardTitle className="text-xs flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5" /> Funil de seções
            </CardTitle>
          </CardHeader>
          {funnel.length === 0 ? (
            <p className="text-[10px] text-muted-foreground">Aguardando dados de navegação por seção.</p>
          ) : (
            <div className="space-y-1.5">
              {funnel.map((step, idx) => (
                <div key={step.section} className="space-y-0.5">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-foreground font-medium capitalize">{idx + 1}. {step.label}</span>
                    <span className="text-muted-foreground tabular-nums">{step.count} · {step.pct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-accent/60 to-accent" style={{ width: `${step.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Top cliques */}
        <Card className="p-4 space-y-3">
          <CardHeader className="p-0">
            <CardTitle className="text-xs flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5" /> Elementos mais clicados
              <Badge variant="neutral" className="text-[9px] ml-auto">{clicks.length} cliques</Badge>
            </CardTitle>
          </CardHeader>
          {topClicks.length === 0 ? (
            <p className="text-[10px] text-muted-foreground">Nenhum clique registrado ainda.</p>
          ) : (
            <div className="space-y-1.5">
              {topClicks.map((t) => (
                <div key={t.label} className="flex items-center justify-between gap-2 text-[11px] py-1.5 px-2 rounded-lg hover:bg-muted/50">
                  <span className="text-foreground truncate flex-1">{t.label}</span>
                  <Badge variant="neutral" className="text-[9px] flex-shrink-0">{t.count}x · {t.pct}%</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Geo */}
        <Card className="p-4 space-y-3">
          <CardHeader className="p-0">
            <CardTitle className="text-xs flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" /> Localização dos visitantes
            </CardTitle>
          </CardHeader>
          {geo.length === 0 || (geo.length === 1 && geo[0].city === "·") ? (
            <p className="text-[10px] text-muted-foreground">Sem dados de localização ainda.</p>
          ) : (
            <div className="space-y-2">
              {geo.map((g) => (
                <div key={`${g.city}-${g.country}`} className="space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-foreground truncate">
                      {g.city}{g.country && g.country !== "·" ? `, ${g.country}` : ""}
                    </span>
                    <span className="text-muted-foreground tabular-nums">{g.count}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-accent/70" style={{ width: `${Math.round((g.count / maxGeo) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Visitantes detalhados */}
      <Card className="p-4 space-y-3">
        <CardHeader className="p-0">
          <CardTitle className="text-xs flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5" /> Visitantes detalhados
            <Badge variant="neutral" className="text-[9px] ml-auto">
              {uniqueViewers} {uniqueViewers === 1 ? "pessoa" : "pessoas"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <ScrollArea className="max-h-[500px] pr-2">
          <div className="space-y-2">
            {viewers.map((v) => {
              const ua = parseUA(v.user_agent);
              const online = isOnline(v);
              return (
                <div key={v.id} className="border border-border/30 rounded-lg p-3 text-[11px] space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground truncate">
                        {v.name || v.email}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {v.email}{v.phone ? ` · ${v.phone}` : ""}
                      </p>
                    </div>
                    {online && (
                      <Badge className="text-[9px] border-0 bg-emerald-500/15 text-emerald-600 flex-shrink-0">
                        online
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
                    <span>{v.total_views || 1}x</span>
                    <span>{formatTime(v.active_seconds || 0)} ativo</span>
                    {v.city && <span>{v.city}{v.country ? `, ${v.country}` : ""}</span>}
                    <span>{ua.os} · {ua.browser}</span>
                    {v.utm_source && <span>via {v.utm_source}</span>}
                    <span className="ml-auto">{formatDistanceToNow(new Date(v.last_active_at), { locale: ptBR, addSuffix: true })}</span>
                  </div>
                  {(v.cta_clicked || v.whatsapp_clicked) && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {v.cta_clicked && <Badge className="text-[9px] border-0 bg-accent/15 text-accent">clicou no CTA</Badge>}
                      {v.whatsapp_clicked && <Badge className="text-[9px] border-0 bg-emerald-500/15 text-emerald-600">abriu WhatsApp</Badge>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
}
