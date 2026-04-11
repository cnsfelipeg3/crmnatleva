import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  PlaneTakeoff, Search, Plus, Flame,
  Thermometer, Snowflake, AlertTriangle, ArrowRight,
  MessageSquare, ClipboardList, FileText, Send,
  CheckCircle2, Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createProposalFromQuote } from "@/lib/quoteToProposalBridge";
import { NegotiationTimeline } from "@/components/pipeline/NegotiationTimeline";
import { NegotiationDetailPanel } from "@/components/pipeline/NegotiationDetailPanel";
import { useNegotiationPriority, type TempFilter } from "@/hooks/useNegotiationPriority";
import { NegotiationItem, BriefingData } from "@/lib/negotiationNarrative";
import { countFilledFields, MONITOR_TOTAL_FIELDS } from "@/lib/quotationMonitor";

// ─── Mapping helpers ───

function mapQuoteToStage(q: any): string {
  if (q.proposal_id) return "proposta_criada";
  switch (q.status) {
    case "pending": return "nova";
    case "reviewing": return "analise";
    case "quoted": return "proposta_criada";
    case "accepted": return "aceita";
    case "rejected": return "perdida";
    default: return "nova";
  }
}

function mapProposalToStage(p: any): string {
  switch (p.status) {
    case "rascunho_ia":
    case "draft": return "proposta_criada";
    case "sent": return "enviada";
    case "negotiation": return "enviada";
    case "approved": return "aceita";
    case "lost": return "perdida";
    default: return "proposta_criada";
  }
}

function mapBriefingToStage(b: any): string {
  if (b.status === "convertido") return "proposta_criada";
  if (b.status === "devolvido_ia") return "analise";
  return "nova";
}

function mapBriefingData(b: any): BriefingData {
  return {
    briefingId: b.id,
    conversationSummary: b.conversation_summary,
    aiRecommendation: b.ai_recommendation,
    nextSteps: b.next_steps,
    budgetBehavioralReading: b.budget_behavioral_reading,
    tripMotivation: b.trip_motivation,
    leadScore: b.lead_score,
    leadSentiment: b.lead_sentiment,
    leadType: b.lead_type,
    leadUrgency: b.lead_urgency || b.urgency,
    priceSensitivity: b.price_sensitivity,
    behavioralNotes: b.behavioral_notes,
    travelExperience: b.travel_experience,
    travelPace: b.travel_pace,
    flexibleDates: b.flexible_dates,
    durationDays: b.duration_days,
    adults: b.adults,
    children: b.children,
    childrenAges: b.children_ages,
    groupDetails: b.group_details,
    hotelPreference: b.hotel_preference,
    hotelStars: b.hotel_stars,
    hotelLocation: b.hotel_location,
    hotelNeeds: b.hotel_needs,
    hotelNotes: b.hotel_notes,
    departureAirport: b.departure_airport,
    preferredAirline: b.preferred_airline,
    flightPreference: b.flight_preference,
    mustHaveExperiences: b.must_have_experiences,
    desiredExperiences: b.desired_experiences,
    experienceNotes: b.experience_notes,
    transferNeeded: b.transfer_needed,
    rentalCar: b.rental_car,
    transportNotes: b.transport_notes,
  };
}

// ─── Main Component ───

export default function CotacoesPropostasPipeline() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [generating, setGenerating] = useState<string | null>(null);
  const [tempFilter, setTempFilter] = useState<TempFilter>("all");
  const [selectedItem, setSelectedItem] = useState<NegotiationItem | null>(null);

  // Fetch quotes
  const { data: quotes, refetch: refetchQuotes } = useQuery({
    queryKey: ["pipeline-quotes"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("portal_quote_requests")
        .select("*")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  // Fetch proposals
  const { data: proposals, refetch: refetchProposals } = useQuery({
    queryKey: ["pipeline-proposals"],
    queryFn: async () => {
      const { data } = await supabase
        .from("proposals")
        .select("*")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  // Fetch briefings
  const { data: briefings } = useQuery({
    queryKey: ["pipeline-briefings"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("quotation_briefings")
        .select("*")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  // Fetch viewer stats per proposal
  const { data: viewerStats } = useQuery({
    queryKey: ["pipeline-viewer-stats"],
    queryFn: async () => {
      const { data } = await supabase
        .from("proposal_viewers" as any)
        .select("proposal_id, total_views, last_active_at, engagement_score")
        .order("last_active_at", { ascending: false });
      const map: Record<string, { viewCount: number; lastViewedAt: string | null; maxEngagement: number }> = {};
      for (const v of data || []) {
        const pid = (v as any).proposal_id;
        if (!map[pid]) map[pid] = { viewCount: 0, lastViewedAt: null, maxEngagement: 0 };
        map[pid].viewCount += (v as any).total_views || 1;
        if (!(map[pid].lastViewedAt) || (v as any).last_active_at > map[pid].lastViewedAt!) {
          map[pid].lastViewedAt = (v as any).last_active_at;
        }
        map[pid].maxEngagement = Math.max(map[pid].maxEngagement, (v as any).engagement_score || 0);
      }
      return map;
    },
  });

  // Build unified items
  const items = useMemo(() => {
    const result: NegotiationItem[] = [];
    const linkedProposalIds = new Set<string>();
    const linkedBriefingIds = new Set<string>();

    const briefingMap = new Map<string, any>();
    for (const b of briefings || []) {
      briefingMap.set(b.id, b);
    }

    const proposalByBriefing = new Map<string, any>();
    for (const p of proposals || []) {
      if ((p as any).source_briefing_id) {
        proposalByBriefing.set((p as any).source_briefing_id, p);
      }
    }

    // 1. Portal quotes
    for (const q of quotes || []) {
      if (q.proposal_id) linkedProposalIds.add(q.proposal_id);
      result.push({
        id: `q-${q.id}`,
        stage: mapQuoteToStage(q),
        origin: q.origin_city || "",
        destination: q.destination_city || "",
        clientName: "",
        pax: (q.adults || 0) + (q.children || 0) + (q.infants || 0),
        departureDate: q.departure_date,
        returnDate: q.return_date,
        createdAt: q.created_at,
        source: "quote",
        quoteId: q.id,
        proposalId: q.proposal_id || undefined,
        cabinClass: q.cabin_class,
        budgetRange: q.budget_range,
        rawQuote: q,
      });
    }

    // 2. Briefings IA
    for (const b of briefings || []) {
      const linkedProposal = proposalByBriefing.get(b.id);
      if (linkedProposal) {
        linkedProposalIds.add(linkedProposal.id);
        linkedBriefingIds.add(b.id);
      }

      result.push({
        id: `b-${b.id}`,
        stage: linkedProposal ? mapProposalToStage(linkedProposal) : mapBriefingToStage(b),
        origin: b.departure_airport || "",
        destination: b.destination || "",
        clientName: b.lead_name || "",
        pax: b.total_people || ((b.adults || 0) + (b.children || 0)),
        departureDate: b.departure_date,
        returnDate: b.return_date,
        createdAt: b.created_at,
        source: "briefing",
        proposalId: linkedProposal?.id,
        proposalSlug: linkedProposal?.slug,
        proposalStatus: linkedProposal?.status,
        cabinClass: b.cabin_class,
        budgetRange: b.budget_range,
        briefing: mapBriefingData(b),
        rawBriefing: b,
      });
    }

    // 3. Standalone proposals
    for (const p of proposals || []) {
      if (linkedProposalIds.has(p.id)) continue;
      if ((p as any).quote_request_id) continue;
      if ((p as any).source_briefing_id && linkedBriefingIds.has((p as any).source_briefing_id)) continue;

      const briefingData = (p as any).source_briefing_id ? briefingMap.get((p as any).source_briefing_id) : null;

      result.push({
        id: `p-${p.id}`,
        stage: mapProposalToStage(p),
        origin: p.origin || "",
        destination: (p.destinations || [])[0] || "",
        clientName: p.client_name || "",
        pax: p.passenger_count || 0,
        departureDate: p.travel_start_date,
        returnDate: p.travel_end_date,
        createdAt: p.created_at,
        source: "proposal",
        proposalId: p.id,
        proposalSlug: p.slug,
        proposalStatus: p.status,
        briefing: briefingData ? mapBriefingData(briefingData) : undefined,
        rawBriefing: briefingData || undefined,
      });
    }

    // Enrich all items
    for (const item of result) {
      if (item.proposalId && item.source === "quote") {
        const p = (proposals || []).find((pr: any) => pr.id === item.proposalId);
        if (p) {
          item.proposalSlug = p.slug;
          item.proposalStatus = p.status;
          item.stage = mapProposalToStage(p);
          if (!item.clientName && p.client_name) item.clientName = p.client_name;
          if ((p as any).source_briefing_id && !item.briefing) {
            const bd = briefingMap.get((p as any).source_briefing_id);
            if (bd) {
              item.briefing = mapBriefingData(bd);
              item.rawBriefing = bd;
            }
          }
        }
      }
      if (item.proposalId && viewerStats) {
        const vs = viewerStats[item.proposalId];
        if (vs) {
          item.viewCount = vs.viewCount;
          item.lastViewedAt = vs.lastViewedAt;
        }
      }
    }

    return result;
  }, [quotes, proposals, briefings, viewerStats]);

  const { grouped, stats } = useNegotiationPriority(items, tempFilter, search);

  const handleGenerate = async (item: NegotiationItem) => {
    if (!item.rawQuote) return;
    setGenerating(item.id);
    try {
      const result = await createProposalFromQuote(item.rawQuote);
      if (result) {
        toast.success("Proposta criada com sucesso!");
        refetchQuotes();
        refetchProposals();
        setTimeout(() => navigate(`/propostas/${result.proposalId}`), 600);
      } else {
        toast.error("Erro ao criar proposta");
      }
    } catch {
      toast.error("Erro inesperado");
    } finally {
      setGenerating(null);
    }
  };

  const TEMP_FILTERS: { key: TempFilter; label: string; icon: typeof Flame; count: number }[] = [
    { key: "all", label: "Todas", icon: ArrowRight, count: stats.total },
    { key: "hot", label: "Quentes", icon: Flame, count: stats.hot },
    { key: "warm", label: "Mornas", icon: Thermometer, count: stats.warm },
    { key: "cold", label: "Frias", icon: Snowflake, count: stats.cold },
  ];

  const STAGE_KPIS = [
    { icon: MessageSquare, label: "Em Atendimento", value: stats.stageCounts.em_atendimento, color: "text-blue-600", bg: "bg-blue-50", dotColor: "bg-blue-500" },
    { icon: Search, label: "Extraindo Dados", value: stats.stageCounts.extraindo, color: "text-amber-600", bg: "bg-amber-50", dotColor: "bg-amber-500" },
    { icon: ClipboardList, label: "Aguard. Cotação", value: stats.stageCounts.aguardando_cotacao, color: "text-orange-600", bg: "bg-orange-50", dotColor: "bg-orange-500" },
    { icon: FileText, label: "Proposta Criada", value: stats.stageCounts.proposta_criada, color: "text-accent", bg: "bg-accent/5", dotColor: "bg-accent" },
    { icon: Send, label: "Enviada", value: stats.stageCounts.enviada, color: "text-indigo-600", bg: "bg-indigo-50", dotColor: "bg-indigo-500" },
    { icon: CheckCircle2, label: "Finalizadas", value: stats.stageCounts.fechadas, color: "text-emerald-600", bg: "bg-emerald-50", dotColor: "bg-emerald-500" },
  ];

  return (
    <div className="p-4 md:p-6 space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-serif text-foreground flex items-center gap-2">
            <PlaneTakeoff className="w-6 h-6 text-accent" />
            Central de Cotações & Propostas
          </h1>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
            Pipeline por etapa
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              LIVE
            </span>
          </p>
        </div>
        <Button size="sm" onClick={() => navigate("/propostas/nova")} className="gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Nova Proposta
        </Button>
      </div>

      {/* Stage KPI Bar — Pipeline visual */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {STAGE_KPIS.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label} className={cn("p-2.5 flex items-center gap-2 border-0", kpi.bg)}>
              <div className={cn("rounded-lg p-1.5", kpi.bg)}>
                <Icon className={cn("w-4 h-4", kpi.color)} />
              </div>
              <div className="min-w-0">
                <p className={cn("text-lg font-bold leading-none", kpi.color)}>{kpi.value}</p>
                <p className="text-[9px] text-muted-foreground font-medium mt-0.5 truncate">{kpi.label}</p>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Attention alert */}
      {stats.needAttention > 0 && (
        <Card className="p-3 flex items-center gap-3 border-red-500/20 bg-red-500/[0.03]">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <p className="text-sm font-semibold text-foreground">
            {stats.needAttention} pessoa{stats.needAttention === 1 ? "" : "s"} em atendimento agora
          </p>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar destino, origem ou cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {TEMP_FILTERS.map((f) => {
            const Icon = f.icon;
            const active = tempFilter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setTempFilter(f.key)}
                className={cn(
                  "h-9 px-4 rounded-full text-sm font-medium flex items-center gap-2 transition-all duration-200",
                  active
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-card text-muted-foreground border border-border/40 hover:border-border hover:bg-muted/30"
                )}
              >
                <Icon className={cn("w-3.5 h-3.5", active && "text-primary-foreground")} />
                {f.label}
                <span className={cn(
                  "text-[11px] font-bold min-w-[22px] h-[22px] flex items-center justify-center rounded-full",
                  active
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}>
                  {f.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Timeline */}
      <NegotiationTimeline
        groups={grouped}
        generating={generating}
        onGenerate={handleGenerate}
        onSelect={setSelectedItem}
      />

      {/* Detail Panel */}
      <NegotiationDetailPanel
        item={selectedItem}
        open={!!selectedItem}
        onClose={() => setSelectedItem(null)}
      />
    </div>
  );
}
