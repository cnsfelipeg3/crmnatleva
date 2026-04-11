import { useState, useMemo, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  PlaneTakeoff, Search, Plus, Radio, LayoutGrid, Flame,
  Thermometer, Snowflake, AlertTriangle, ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createProposalFromQuote } from "@/lib/quoteToProposalBridge";
import { MinimalLoader } from "@/components/AppLoaders";
import { NegotiationTimeline } from "@/components/pipeline/NegotiationTimeline";
import { NegotiationDetailPanel } from "@/components/pipeline/NegotiationDetailPanel";
import { useNegotiationPriority, type TempFilter } from "@/hooks/useNegotiationPriority";
import { NegotiationItem, calculateTemperature } from "@/lib/negotiationNarrative";

const CotacoesMonitorView = lazy(() => import("@/components/cotacoes/CotacoesMonitorView"));

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

// ─── Main Component ───

export default function CotacoesPropostasPipeline() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [generating, setGenerating] = useState<string | null>(null);
  const [view, setView] = useState<"timeline" | "monitor">("timeline");
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

  // Fetch viewer stats per proposal
  const { data: viewerStats } = useQuery({
    queryKey: ["pipeline-viewer-stats"],
    queryFn: async () => {
      const { data } = await supabase
        .from("proposal_viewers" as any)
        .select("proposal_id, total_views, last_active_at, engagement_score")
        .order("last_active_at", { ascending: false });
      // Aggregate per proposal
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

    for (const p of proposals || []) {
      if (linkedProposalIds.has(p.id)) continue;
      if ((p as any).quote_request_id) continue;
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
      });
    }

    // Enrich all items with proposal info + viewer data
    for (const item of result) {
      if (item.proposalId && item.source === "quote") {
        const p = (proposals || []).find((pr: any) => pr.id === item.proposalId);
        if (p) {
          item.proposalSlug = p.slug;
          item.proposalStatus = p.status;
          item.stage = mapProposalToStage(p);
          if (!item.clientName && p.client_name) item.clientName = p.client_name;
        }
      }
      // Enrich with real viewer data
      if (item.proposalId && viewerStats) {
        const vs = viewerStats[item.proposalId];
        if (vs) {
          item.viewCount = vs.viewCount;
          item.lastViewedAt = vs.lastViewedAt;
        }
      }
    }

    return result;
  }, [quotes, proposals, viewerStats]);

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

  return (
    <div className="p-4 md:p-6 space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-serif text-foreground flex items-center gap-2">
            <PlaneTakeoff className="w-6 h-6 text-accent" />
            Central de Cotações & Propostas
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Timeline inteligente de negociações</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setView("timeline")}
              className={cn("px-3 py-1.5 text-xs font-medium flex items-center gap-1 transition-colors",
                view === "timeline" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted/50")}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Timeline
            </button>
            <button
              onClick={() => setView("monitor")}
              className={cn("px-3 py-1.5 text-xs font-medium flex items-center gap-1 transition-colors",
                view === "monitor" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted/50")}
            >
              <Radio className="w-3.5 h-3.5" /> Monitor
            </button>
          </div>
          <Button size="sm" onClick={() => navigate("/propostas/nova")} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Nova Proposta
          </Button>
        </div>
      </div>

      {view === "monitor" ? (
        <Suspense fallback={<MinimalLoader inline />}>
          <CotacoesMonitorView />
        </Suspense>
      ) : (
        <>
          {/* Stats bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {stats.needAttention > 0 && (
              <Card className="p-3 flex items-center gap-3 border-red-500/20 bg-red-500/[0.03] col-span-2 sm:col-span-4">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <p className="text-sm font-semibold text-foreground">
                  {stats.needAttention} negociaç{stats.needAttention === 1 ? "ão precisa" : "ões precisam"} de atenção agora
                </p>
              </Card>
            )}
          </div>

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
            <div className="flex gap-1.5">
              {TEMP_FILTERS.map((f) => {
                const Icon = f.icon;
                return (
                  <button
                    key={f.key}
                    onClick={() => setTempFilter(f.key)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors",
                      tempFilter === f.key
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:bg-muted/50 border border-border/50"
                    )}
                  >
                    <Icon className="w-3 h-3" />
                    {f.label}
                    <Badge variant="neutral" className="text-[9px] ml-0.5">{f.count}</Badge>
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
        </>
      )}
    </div>
  );
}
