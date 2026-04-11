import { useState } from "react";
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
  Heart, Brain, DollarSign,
} from "lucide-react";
import { format, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

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
  nova: { label: "Aguardando proposta", className: "bg-gray-800 text-white border-gray-800" },
  analise: { label: "Em análise", className: "bg-blue-500 text-white border-blue-500" },
  proposta_criada: { label: "Proposta criada", className: "bg-amber-500 text-white border-amber-500" },
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
      {/* Top row: badges + temperature */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge className={cn("text-[9px] border", src.className)}>{src.label}</Badge>
          <Badge className={cn("text-[9px] border", stageInfo.className)}>{stageInfo.label}</Badge>
          <TemperatureScore temperature={temperature} showLabel />
          {b?.leadUrgency === "alta" && (
            <Badge className="text-[9px] bg-red-600 text-white border-red-600 font-bold">Urgente</Badge>
          )}
        </div>
        <span className="text-[10px] text-gray-500 shrink-0 font-medium">
          {safeFormat(item.createdAt, "dd/MM HH:mm")}
        </span>
      </div>

      {/* Route + client */}
      <div className="flex items-center gap-1.5">
        <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        <p className="text-sm font-bold text-gray-900 truncate">{route}</p>
      </div>
      {item.clientName && (
        <p className="text-xs text-gray-700 truncate font-medium">{item.clientName}</p>
      )}

      {/* Briefing insights row */}
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

      {/* Narrative — expandable */}
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
      <PipelineStepper stage={item.stage} />

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
