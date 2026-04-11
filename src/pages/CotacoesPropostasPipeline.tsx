import { useState, useMemo, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  PlaneTakeoff, MapPin, CalendarDays, Users, Search, Eye,
  CheckCircle2, Clock, XCircle, FileText, Loader2, Sparkles,
  Radio, LayoutGrid, List, ArrowRight, Plus, ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createProposalFromQuote } from "@/lib/quoteToProposalBridge";
import { MinimalLoader } from "@/components/AppLoaders";

const CotacoesMonitorView = lazy(() => import("@/components/cotacoes/CotacoesMonitorView"));

// ─── Pipeline stages ───

interface PipelineStage {
  id: string;
  label: string;
  color: string;
  icon: typeof Clock;
}

const STAGES: PipelineStage[] = [
  { id: "nova", label: "Nova Solicitação", color: "bg-amber-500", icon: Clock },
  { id: "analise", label: "Em Análise", color: "bg-blue-500", icon: Eye },
  { id: "proposta_criada", label: "Proposta Criada", color: "bg-accent", icon: FileText },
  { id: "enviada", label: "Enviada", color: "bg-purple-500", icon: ExternalLink },
  { id: "aceita", label: "Aceita", color: "bg-emerald-500", icon: CheckCircle2 },
  { id: "perdida", label: "Perdida", color: "bg-destructive", icon: XCircle },
];

// ─── Unified item ───

interface PipelineItem {
  id: string;
  stage: string;
  origin: string;
  destination: string;
  clientName: string;
  pax: number;
  departureDate: string | null;
  returnDate: string | null;
  createdAt: string;
  source: "quote" | "proposal" | "briefing";
  quoteId?: string;
  proposalId?: string;
  proposalSlug?: string;
  proposalStatus?: string;
  rawQuote?: any;
  cabinClass?: string;
  budgetRange?: string;
}

function mapQuoteToStage(q: any): string {
  if (q.proposal_id) {
    // Has a linked proposal — check proposal status
    return "proposta_criada";
  }
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

const CABIN_LABELS: Record<string, string> = {
  economy: "Econômica", premium_economy: "Premium Eco",
  business: "Executiva", first: "Primeira",
};

export default function CotacoesPropostasPipeline() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [generating, setGenerating] = useState<string | null>(null);
  const [view, setView] = useState<"pipeline" | "monitor">("pipeline");

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

  // Build unified pipeline items
  const items = useMemo(() => {
    const result: PipelineItem[] = [];
    const linkedProposalIds = new Set<string>();

    // 1. Add quotes
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

    // 2. Add proposals NOT linked to a quote (standalone proposals)
    for (const p of proposals || []) {
      if (linkedProposalIds.has(p.id)) continue; // already represented by quote
      if ((p as any).quote_request_id) continue; // linked from proposal side
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

    // Update proposal info for quote-linked items
    for (const item of result) {
      if (item.proposalId && item.source === "quote") {
        const p = (proposals || []).find((pr: any) => pr.id === item.proposalId);
        if (p) {
          item.proposalSlug = p.slug;
          item.proposalStatus = p.status;
          item.stage = mapProposalToStage(p); // use proposal status as source of truth
          if (!item.clientName && p.client_name) item.clientName = p.client_name;
        }
      }
    }

    return result;
  }, [quotes, proposals]);

  // Filter
  const filtered = useMemo(() => {
    if (!search) return items;
    const s = search.toLowerCase();
    return items.filter(i =>
      i.destination.toLowerCase().includes(s) ||
      i.origin.toLowerCase().includes(s) ||
      i.clientName.toLowerCase().includes(s)
    );
  }, [items, search]);

  // Group by stage
  const grouped = useMemo(() => {
    const map: Record<string, PipelineItem[]> = {};
    for (const stage of STAGES) map[stage.id] = [];
    for (const item of filtered) {
      if (map[item.stage]) map[item.stage].push(item);
      else map.nova.push(item);
    }
    return map;
  }, [filtered]);

  // KPIs
  const kpis = useMemo(() => ({
    total: items.length,
    novas: grouped.nova.length,
    emAnalise: grouped.analise.length,
    propostas: grouped.proposta_criada.length + grouped.enviada.length,
    aceitas: grouped.aceita.length,
    taxaConversao: items.length > 0 ? Math.round((grouped.aceita.length / items.length) * 100) : 0,
  }), [items, grouped]);

  const handleGenerate = async (item: PipelineItem) => {
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

  return (
    <div className="p-4 md:p-6 space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-serif text-foreground flex items-center gap-2">
            <PlaneTakeoff className="w-6 h-6 text-accent" />
            Central de Cotações & Propostas
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Pipeline unificado do pedido à conversão</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setView("pipeline")}
              className={cn("px-3 py-1.5 text-xs font-medium flex items-center gap-1 transition-colors",
                view === "pipeline" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted/50")}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Pipeline
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

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard label="Total" value={kpis.total} icon={List} />
        <KpiCard label="Novas" value={kpis.novas} icon={Clock} accent />
        <KpiCard label="Em Análise" value={kpis.emAnalise} icon={Eye} />
        <KpiCard label="Propostas" value={kpis.propostas} icon={FileText} />
        <KpiCard label="Aceitas" value={kpis.aceitas} icon={CheckCircle2} />
        <KpiCard label="Conversão" value={`${kpis.taxaConversao}%`} icon={ArrowRight} />
      </div>

      {view === "monitor" ? (
        <Suspense fallback={<MinimalLoader inline />}>
          <CotacoesMonitorView />
        </Suspense>
      ) : (
        <>
          {/* Search */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por destino, origem ou cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Kanban Pipeline */}
          <ScrollArea className="w-full">
            <div className="flex gap-3 pb-4 min-w-[1200px]">
              {STAGES.map((stage) => (
                <div key={stage.id} className="flex-1 min-w-[200px]">
                  {/* Column header */}
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <div className={cn("w-2 h-2 rounded-full", stage.color)} />
                    <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
                      {stage.label}
                    </span>
                    <Badge variant="neutral" className="text-[10px] ml-auto">
                      {grouped[stage.id].length}
                    </Badge>
                  </div>

                  {/* Cards */}
                  <div className="space-y-2">
                    {grouped[stage.id].length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border/40 p-6 text-center">
                        <p className="text-xs text-muted-foreground/50">Vazio</p>
                      </div>
                    ) : (
                      grouped[stage.id].map((item) => (
                        <PipelineCard
                          key={item.id}
                          item={item}
                          generating={generating}
                          onGenerate={handleGenerate}
                          onViewProposal={(id) => navigate(`/propostas/${id}`)}
                          onCreateNew={() => navigate("/propostas/nova")}
                        />
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </>
      )}
    </div>
  );
}

// ─── KPI Card ───

function KpiCard({ label, value, icon: Icon, accent }: { label: string; value: string | number; icon: any; accent?: boolean }) {
  return (
    <Card className={cn("p-3 flex items-center gap-3", accent && "border-accent/30 bg-accent/5")}>
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", accent ? "bg-accent/15" : "bg-muted")}>
        <Icon className={cn("w-4 h-4", accent ? "text-accent" : "text-muted-foreground")} />
      </div>
      <div>
        <p className="text-lg font-bold text-foreground leading-none">{value}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
      </div>
    </Card>
  );
}

// ─── Pipeline Card ───

function PipelineCard({
  item, generating, onGenerate, onViewProposal, onCreateNew,
}: {
  item: PipelineItem;
  generating: string | null;
  onGenerate: (item: PipelineItem) => void;
  onViewProposal: (id: string) => void;
  onCreateNew: () => void;
}) {
  const route = [item.origin, item.destination].filter(Boolean).join(" → ") || "Sem rota";

  return (
    <Card className="p-3 space-y-2 hover:shadow-md transition-shadow cursor-default group">
      {/* Source badge */}
      <div className="flex items-center justify-between">
        <Badge
          variant={item.source === "quote" ? "info" : item.source === "briefing" ? "warning" : "default"}
          className="text-[9px]"
        >
          {item.source === "quote" ? "Portal" : item.source === "briefing" ? "Briefing IA" : "Manual"}
        </Badge>
        <span className="text-[10px] text-muted-foreground">
          {format(new Date(item.createdAt), "dd/MM HH:mm")}
        </span>
      </div>

      {/* Route */}
      <div className="flex items-center gap-1.5">
        <MapPin className="w-3 h-3 text-accent shrink-0" />
        <p className="text-sm font-semibold text-foreground truncate">{route}</p>
      </div>

      {/* Client & details */}
      {item.clientName && (
        <p className="text-xs text-muted-foreground truncate">{item.clientName}</p>
      )}

      <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
        {item.departureDate && (
          <span className="flex items-center gap-0.5">
            <CalendarDays className="w-2.5 h-2.5" />
            {format(new Date(item.departureDate + "T12:00:00"), "dd MMM", { locale: ptBR })}
            {item.returnDate && ` — ${format(new Date(item.returnDate + "T12:00:00"), "dd MMM", { locale: ptBR })}`}
          </span>
        )}
        {item.pax > 0 && (
          <span className="flex items-center gap-0.5">
            <Users className="w-2.5 h-2.5" /> {item.pax}
          </span>
        )}
        {item.cabinClass && (
          <span>{CABIN_LABELS[item.cabinClass] || item.cabinClass}</span>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-1.5 pt-1">
        {item.proposalId ? (
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-[10px] gap-1 flex-1"
            onClick={() => onViewProposal(item.proposalId!)}
          >
            <FileText className="w-2.5 h-2.5" /> Ver Proposta
          </Button>
        ) : item.source === "quote" && item.rawQuote ? (
          <Button
            size="sm"
            className="h-6 text-[10px] gap-1 flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
            onClick={() => onGenerate(item)}
            disabled={generating === item.id}
          >
            {generating === item.id ? (
              <Loader2 className="w-2.5 h-2.5 animate-spin" />
            ) : (
              <Sparkles className="w-2.5 h-2.5" />
            )}
            Gerar Proposta
          </Button>
        ) : item.source === "proposal" && item.proposalId ? (
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-[10px] gap-1 flex-1"
            onClick={() => onViewProposal(item.proposalId!)}
          >
            <FileText className="w-2.5 h-2.5" /> Editar
          </Button>
        ) : null}
      </div>
    </Card>
  );
}
