import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TemperatureScore } from "./TemperatureScore";
import { LeadScoreBar } from "./LeadScoreBar";
import { PipelineStepper } from "./PipelineStepper";
import {
  NegotiationItem,
  generateNarrative,
  calculateTemperature,
} from "@/lib/negotiationNarrative";
import {
  MapPin, CalendarDays, Users, Sparkles, FileText,
  Loader2, MessageSquare, Eye, ChevronRight,
  Heart, Brain, DollarSign, Crown,
} from "lucide-react";
import { format, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { countFilledFields, MONITOR_TOTAL_FIELDS } from "@/lib/quotationMonitor";

function safeParse(d: string | null | undefined): Date | null {
  if (!d) return null;
  const date = new Date(d);
  return isValid(date) ? date : null;
}

function safeFormat(d: string | null | undefined, fmt: string, opts?: any): string {
  const parsed = safeParse(d);
  return parsed ? format(parsed, fmt, opts) : "—";
}

const SOURCE_BADGE: Record<string, { label: string; className: string }> = {
  quote: { label: "Portal", className: "bg-blue-500 text-white border-blue-500" },
  briefing: { label: "Briefing IA", className: "bg-amber-400 text-gray-900 border-amber-400 font-bold" },
  proposal: { label: "Manual", className: "bg-gray-600 text-white border-gray-600" },
};

const STAGE_LABELS: Record<string, { label: string; className: string }> = {
  nova: { label: "Em atendimento", className: "bg-blue-500 text-white border-blue-500" },
  analise: { label: "Extraindo dados", className: "bg-amber-500 text-white border-amber-500" },
  proposta_criada: { label: "Proposta criada", className: "bg-accent text-accent-foreground border-accent" },
  enviada: { label: "Enviada", className: "bg-indigo-500 text-white border-indigo-500" },
  aceita: { label: "Fechada ✓", className: "bg-emerald-600 text-white border-emerald-600" },
  perdida: { label: "Perdida", className: "bg-red-600 text-white border-red-600" },
};

const SENTIMENT_CONFIG: Record<string, { label: string; color: string }> = {
  positivo: { label: "Positivo", color: "text-emerald-600 font-semibold" },
  entusiasmado: { label: "Entusiasmado", color: "text-emerald-700 font-bold" },
  neutro: { label: "Neutro", color: "text-gray-600" },
  hesitante: { label: "Hesitante", color: "text-amber-600 font-semibold" },
  negativo: { label: "Negativo", color: "text-red-600 font-semibold" },
};

interface Props {
  item: NegotiationItem;
  generating: string | null;
  onGenerate: (item: NegotiationItem) => void;
  onSelect: (item: NegotiationItem) => void;
}

function buildNathPrompt(item: NegotiationItem): string {
  const b = item.briefing;
  const parts: string[] = [];
  parts.push(`Destino: ${item.destination || "não informado"}`);
  parts.push(`Origem: ${item.origin || "não informado"}`);
  if (item.departureDate) parts.push(`Data ida: ${item.departureDate}`);
  if (item.returnDate) parts.push(`Data volta: ${item.returnDate}`);
  if (item.pax > 0) parts.push(`Passageiros: ${item.pax}`);
  if (item.clientName) parts.push(`Cliente: ${item.clientName}`);
  if (b) {
    if (b.conversationSummary) parts.push(`Resumo da conversa: ${b.conversationSummary}`);
    if (b.tripMotivation) parts.push(`Motivação: ${b.tripMotivation}`);
    if (b.leadSentiment) parts.push(`Sentimento: ${b.leadSentiment}`);
    if (b.leadScore) parts.push(`Score: ${b.leadScore}`);
    if (b.leadUrgency) parts.push(`Urgência: ${b.leadUrgency}`);
    if (b.priceSensitivity) parts.push(`Sensibilidade a preço: ${b.priceSensitivity}`);
    if (b.budgetBehavioralReading) parts.push(`Budget: ${b.budgetBehavioralReading}`);
    if (b.hotelPreference) parts.push(`Hotel: ${b.hotelPreference} ${b.hotelStars || ""}`);
    if (b.mustHaveExperiences?.length) parts.push(`Experiências obrigatórias: ${b.mustHaveExperiences.join(", ")}`);
    if (b.aiRecommendation) parts.push(`Recomendação IA anterior: ${b.aiRecommendation}`);
    if (b.nextSteps) parts.push(`Próximos passos sugeridos: ${b.nextSteps}`);
  }
  return parts.join("\n");
}

function NathInsight({ item }: { item: NegotiationItem }) {
  const b = item.briefing;
  const hasExisting = b && (b.aiRecommendation || b.nextSteps);
  const [opinion, setOpinion] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedNath, setExpandedNath] = useState(false);

  const requestOpinion = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (loading) return;
    setLoading(true);
    setOpinion("");
    try {
      const context = buildNathPrompt(item);
      const { data, error } = await supabase.functions.invoke("agent-chat", {
        body: {
          question: `Analise esta cotação e me dê sua opinião estratégica. Foque em: 1) O que cotar especificamente, 2) Riscos da negociação, 3) Próximo passo concreto.\n\nDados:\n${context}`,
          agentName: "Nath",
          agentRole: "Consultora estratégica de viagens premium",
          provider: "anthropic",
          model: "claude-sonnet-4-20250514",
          history: [],
        },
      });

      if (error) throw error;

      if (data instanceof ReadableStream) {
        const reader = data.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let full = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let idx;
          while ((idx = buffer.indexOf("\n")) !== -1) {
            const line = buffer.slice(0, idx).trim();
            buffer = buffer.slice(idx + 1);
            if (!line.startsWith("data: ") || line === "data: [DONE]") continue;
            try {
              const parsed = JSON.parse(line.slice(6));
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                full += delta;
                setOpinion(full);
              }
            } catch {}
          }
        }
        if (!full) setOpinion("Não foi possível gerar opinião.");
      } else if (typeof data === "string") {
        const lines = data.split("\n");
        let full = "";
        for (const line of lines) {
          if (!line.startsWith("data: ") || line === "data: [DONE]") continue;
          try {
            const parsed = JSON.parse(line.slice(6));
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) full += delta;
          } catch {}
        }
        setOpinion(full || "Não foi possível gerar opinião.");
      } else {
        setOpinion("Não foi possível gerar opinião.");
      }
    } catch (err) {
      console.error("Nath opinion error:", err);
      setOpinion("Erro ao consultar a Nath. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }, [item, loading]);

  if (hasExisting && !opinion) {
    return (
      <div
        className="rounded-lg bg-purple-50 border border-purple-200 p-2.5 space-y-1.5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-[11px] font-bold text-purple-800">
            <Crown className="w-3.5 h-3.5 text-purple-600" /> Visão da Nath
          </span>
          <Button
            size="sm"
            variant="ghost"
            className="h-5 px-1.5 text-[9px] text-purple-600 hover:bg-purple-100"
            onClick={requestOpinion}
            disabled={loading}
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Atualizar"}
          </Button>
        </div>
        {b?.aiRecommendation && (
          <p className={cn(
            "text-xs text-purple-900 leading-relaxed",
            !expandedNath && "line-clamp-3"
          )}>
            {b.aiRecommendation}
          </p>
        )}
        {b?.nextSteps && (
          <p className="text-[11px] text-purple-700 font-medium">
            📋 {b.nextSteps}
          </p>
        )}
        {(b?.aiRecommendation?.length || 0) > 120 && (
          <button
            className="text-[10px] text-purple-600 hover:underline font-semibold"
            onClick={(e) => { e.stopPropagation(); setExpandedNath(!expandedNath); }}
          >
            {expandedNath ? "ver menos" : "ver mais"}
          </button>
        )}
      </div>
    );
  }

  if (opinion) {
    return (
      <div
        className="rounded-lg bg-purple-50 border border-purple-200 p-2.5 space-y-1.5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-[11px] font-bold text-purple-800">
            <Crown className="w-3.5 h-3.5 text-purple-600" /> Visão da Nath
          </span>
          <Button
            size="sm"
            variant="ghost"
            className="h-5 px-1.5 text-[9px] text-purple-600 hover:bg-purple-100"
            onClick={requestOpinion}
            disabled={loading}
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Refazer"}
          </Button>
        </div>
        <p className={cn(
          "text-xs text-purple-900 leading-relaxed whitespace-pre-wrap",
          !expandedNath && "line-clamp-4"
        )}>
          {opinion}
        </p>
        {opinion.length > 150 && (
          <button
            className="text-[10px] text-purple-600 hover:underline font-semibold"
            onClick={(e) => { e.stopPropagation(); setExpandedNath(!expandedNath); }}
          >
            {expandedNath ? "ver menos" : "ver mais"}
          </button>
        )}
      </div>
    );
  }

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 text-[11px] gap-1 text-purple-700 hover:bg-purple-50 hover:text-purple-900 font-semibold w-full justify-start"
        onClick={requestOpinion}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <Crown className="w-3 h-3" />
        )}
        {loading ? "Consultando Nath..." : "Pedir Opinião da Nath"}
      </Button>
    </div>
  );
}

// ─── Progress Ring ───

function ExtractionRing({ item }: { item: NegotiationItem }) {
  const raw = item.rawBriefing;
  if (!raw) return null;

  const filled = countFilledFields(raw);
  const pct = Math.round((filled / MONITOR_TOTAL_FIELDS) * 100);
  const isExtracting = raw.status === "extraindo";
  const isComplete = pct >= 90;
  const radius = 12;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  const strokeColor = isExtracting
    ? "hsl(var(--accent))"
    : isComplete
      ? "#10b981"
      : "#f59e0b";

  return (
    <div className="relative flex items-center gap-1" title={`${pct}% extraído (${filled}/${MONITOR_TOTAL_FIELDS} campos)`}>
      <svg width="28" height="28" className={cn(isExtracting && "animate-pulse")}>
        <circle cx="14" cy="14" r={radius} fill="none" stroke="hsl(var(--border))" strokeWidth="2.5" />
        <circle
          cx="14" cy="14" r={radius} fill="none"
          stroke={strokeColor} strokeWidth="2.5"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 14 14)"
          className="transition-all duration-500"
        />
        <text x="14" y="14" textAnchor="middle" dominantBaseline="central"
          className="text-[7px] font-bold fill-foreground"
        >
          {pct}
        </text>
      </svg>
      {isExtracting && (
        <Badge className="text-[8px] bg-amber-100 text-amber-700 border-amber-300 animate-pulse px-1 py-0">
          EXTRAINDO
        </Badge>
      )}
    </div>
  );
}

export function NegotiationCard({ item, generating, onGenerate, onSelect }: Props) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const narrative = generateNarrative(item);
  const temperature = calculateTemperature(item);
  const route = [item.origin, item.destination].filter(Boolean).join(" → ") || "Sem rota";
  const src = SOURCE_BADGE[item.source] || SOURCE_BADGE.proposal;
  const stageInfo = STAGE_LABELS[item.stage] || STAGE_LABELS.nova;
  const b = item.briefing;
  const isFinished = item.stage === "aceita" || item.stage === "perdida";
  const isHot = temperature === "hot";
  const isCold = temperature === "cold";
  const isWarm = temperature === "warm";
  const needsAction = !item.proposalId && item.source === "quote" && item.rawQuote;

  return (
    <Card
      className={cn(
        "p-4 space-y-2.5 cursor-pointer group transition-all duration-200 border-l-4 bg-white hover:shadow-lg hover:scale-[1.01]",
        isHot && "border-l-red-600 bg-red-50 shadow-md shadow-red-500/10",
        isWarm && "border-l-amber-500 bg-amber-50/50",
        isCold && "border-l-blue-500 bg-blue-50/50 opacity-80",
        !isHot && !isCold && !isWarm && !isFinished && "border-l-gray-300",
        isFinished && item.stage === "aceita" && "border-l-emerald-500 bg-emerald-50/50",
        isFinished && item.stage === "perdida" && "border-l-gray-400 opacity-60"
      )}
      onClick={() => onSelect(item)}
    >
      {/* Top row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge className={cn("text-[9px] border", src.className)}>{src.label}</Badge>
          <Badge className={cn("text-[9px] border", stageInfo.className)}>{stageInfo.label}</Badge>
          <TemperatureScore temperature={temperature} showLabel />
          {b?.leadUrgency === "alta" && (
            <Badge className="text-[9px] bg-red-600 text-white border-red-600 font-bold">Urgente</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ExtractionRing item={item} />
          <span className="text-[10px] text-gray-500 shrink-0 font-medium">
            {safeFormat(item.createdAt, "dd/MM HH:mm")}
          </span>
        </div>
      </div>

      {/* Route + client */}
      <div className="flex items-center gap-1.5">
        <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        <p className="text-sm font-bold text-gray-900 truncate">{route}</p>
      </div>
      {item.clientName && (
        <p className="text-xs text-gray-700 truncate font-medium">{item.clientName}</p>
      )}

      {/* Briefing insights */}
      {b && (b.tripMotivation || b.leadScore || b.leadSentiment) && (
        <div className="flex items-center gap-2.5 text-[11px] flex-wrap">
          {b.tripMotivation && (
            <span className="flex items-center gap-0.5 text-rose-600 font-medium">
              <Heart className="w-3 h-3" /> {b.tripMotivation}
            </span>
          )}
          {b.leadScore != null && b.leadScore > 0 && (
            <LeadScoreBar score={b.leadScore} />
          )}
          {b.leadSentiment && SENTIMENT_CONFIG[b.leadSentiment] && (
            <span className={cn("flex items-center gap-0.5", SENTIMENT_CONFIG[b.leadSentiment].color)}>
              <Brain className="w-3 h-3" /> {SENTIMENT_CONFIG[b.leadSentiment].label}
            </span>
          )}
          {b.priceSensitivity && (
            <span className="flex items-center gap-0.5 text-gray-700 font-medium">
              <DollarSign className="w-3 h-3" /> {b.priceSensitivity}
            </span>
          )}
        </div>
      )}

      {/* Narrative */}
      <div>
        <p className={cn(
          "text-xs text-gray-600 italic leading-relaxed",
          !expanded && "line-clamp-3"
        )}>
          "{narrative}"
        </p>
        {narrative.length > 120 && (
          <button
            className="text-[10px] text-emerald-700 hover:underline mt-0.5 font-semibold"
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
          >
            {expanded ? "ver menos" : "ver mais"}
          </button>
        )}
      </div>

      {/* Visão da Nath */}
      <NathInsight item={item} />

      {/* Meta */}
      <div className="flex items-center gap-2 text-[11px] text-gray-600 flex-wrap font-medium">
        {item.departureDate && safeParse(item.departureDate + "T12:00:00") && (
          <span className="flex items-center gap-0.5">
            <CalendarDays className="w-3 h-3 text-blue-500" />
            {safeFormat(item.departureDate + "T12:00:00", "dd MMM", { locale: ptBR })}
            {item.returnDate && safeParse(item.returnDate + "T12:00:00") ? ` — ${safeFormat(item.returnDate + "T12:00:00", "dd MMM", { locale: ptBR })}` : ""}
          </span>
        )}
        {item.pax > 0 && (
          <span className="flex items-center gap-0.5"><Users className="w-3 h-3 text-indigo-500" /> {item.pax}</span>
        )}
        {(item.viewCount || 0) > 0 && (
          <span className="flex items-center gap-0.5"><Eye className="w-3 h-3 text-emerald-500" /> {item.viewCount}x</span>
        )}
      </div>

      {/* Pipeline stepper */}
      <PipelineStepper
        stage={
          item.rawBriefing?.status === "extraindo" ? "extraindo" :
          item.rawBriefing && countFilledFields(item.rawBriefing) / MONITOR_TOTAL_FIELDS >= 0.7 && !item.proposalId ? "aguardando_cotacao" :
          item.stage === "nova" || item.stage === "analise" ? (item.rawBriefing ? "extraindo" : "em_atendimento") :
          item.stage
        }
        extractionPct={item.rawBriefing ? Math.round((countFilledFields(item.rawBriefing) / MONITOR_TOTAL_FIELDS) * 100) : undefined}
      />

      {/* Actions */}
      <div className="flex gap-1.5 pt-0.5" onClick={(e) => e.stopPropagation()}>
        {item.proposalId ? (
          <>
            <Button
              size="sm" variant="outline"
              className="h-8 text-xs gap-1 flex-1 border-emerald-600 text-emerald-700 hover:bg-emerald-50 font-semibold"
              onClick={() => navigate(`/propostas/${item.proposalId}`)}
            >
              <FileText className="w-3 h-3" />
              {item.stage === "proposta_criada" ? "Revisar & Enviar" : "Ver Proposta"}
            </Button>
            {item.stage === "enviada" && (
              <Button size="sm" variant="ghost" className="h-8 text-xs gap-1 text-blue-600 hover:bg-blue-50 font-semibold">
                <MessageSquare className="w-3 h-3" /> Follow-up
              </Button>
            )}
          </>
        ) : needsAction ? (
          <Button
            size="sm"
            className={cn(
              "h-8 text-xs gap-1 flex-1 font-bold shadow-sm",
              isHot
                ? "bg-red-600 hover:bg-red-700 text-white shadow-red-500/20"
                : "bg-emerald-700 hover:bg-emerald-800 text-white"
            )}
            onClick={() => onGenerate(item)}
            disabled={generating === item.id}
          >
            {generating === item.id ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Sparkles className="w-3 h-3" />
            )}
            Gerar Proposta IA
          </Button>
        ) : null}
        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 ml-auto text-gray-500 hover:text-gray-900">
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}
