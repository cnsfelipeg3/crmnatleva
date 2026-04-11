import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { TemperatureScore } from "./TemperatureScore";
import {
  NegotiationItem,
  generateNarrative,
  calculateTemperature,
  calculateProgress,
} from "@/lib/negotiationNarrative";
import {
  MapPin, CalendarDays, Users, Sparkles, FileText,
  Loader2, Send, MessageSquare, Eye, ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const SOURCE_BADGE: Record<string, { label: string; variant: "info" | "warning" | "default" }> = {
  quote: { label: "Portal", variant: "info" },
  briefing: { label: "Briefing IA", variant: "warning" },
  proposal: { label: "Manual", variant: "default" },
};

interface Props {
  item: NegotiationItem;
  generating: string | null;
  onGenerate: (item: NegotiationItem) => void;
  onSelect: (item: NegotiationItem) => void;
}

export function NegotiationCard({ item, generating, onGenerate, onSelect }: Props) {
  const navigate = useNavigate();
  const narrative = generateNarrative(item);
  const temperature = calculateTemperature(item);
  const progress = calculateProgress(item);
  const route = [item.origin, item.destination].filter(Boolean).join(" → ") || "Sem rota";
  const src = SOURCE_BADGE[item.source] || SOURCE_BADGE.proposal;

  const isFinished = item.stage === "aceita" || item.stage === "perdida";

  return (
    <Card
      className={cn(
        "p-4 space-y-2.5 cursor-pointer group transition-all",
        temperature === "hot" && "border-red-500/20 bg-red-500/[0.02]",
        isFinished && "opacity-70"
      )}
      onClick={() => onSelect(item)}
    >
      {/* Top row: badges + temperature */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Badge variant={src.variant} className="text-[9px]">{src.label}</Badge>
          <TemperatureScore temperature={temperature} showLabel />
        </div>
        <span className="text-[10px] text-muted-foreground">
          {format(new Date(item.createdAt), "dd/MM HH:mm")}
        </span>
      </div>

      {/* Route + client */}
      <div className="flex items-center gap-1.5">
        <MapPin className="w-3.5 h-3.5 text-accent shrink-0" />
        <p className="text-sm font-semibold text-foreground truncate">{route}</p>
      </div>
      {item.clientName && (
        <p className="text-xs text-muted-foreground truncate">{item.clientName}</p>
      )}

      {/* Narrative */}
      <p className="text-xs text-muted-foreground/80 italic leading-relaxed">
        "{narrative}"
      </p>

      {/* Meta */}
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
        {item.departureDate && (
          <span className="flex items-center gap-0.5">
            <CalendarDays className="w-2.5 h-2.5" />
            {format(new Date(item.departureDate + "T12:00:00"), "dd MMM", { locale: ptBR })}
            {item.returnDate && ` — ${format(new Date(item.returnDate + "T12:00:00"), "dd MMM", { locale: ptBR })}`}
          </span>
        )}
        {item.pax > 0 && (
          <span className="flex items-center gap-0.5"><Users className="w-2.5 h-2.5" /> {item.pax}</span>
        )}
        {(item.viewCount || 0) > 0 && (
          <span className="flex items-center gap-0.5"><Eye className="w-2.5 h-2.5" /> {item.viewCount}x</span>
        )}
      </div>

      {/* Progress */}
      {!isFinished && (
        <Progress value={progress} className="h-1.5" />
      )}

      {/* Actions */}
      <div className="flex gap-1.5 pt-0.5" onClick={(e) => e.stopPropagation()}>
        {item.proposalId ? (
          <>
            <Button
              size="sm" variant="outline"
              className="h-6 text-[10px] gap-1 flex-1"
              onClick={() => navigate(`/propostas/${item.proposalId}`)}
            >
              <FileText className="w-2.5 h-2.5" />
              {item.stage === "proposta_criada" ? "Revisar & Enviar" : "Ver Proposta"}
            </Button>
            {item.stage === "enviada" && (
              <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1">
                <MessageSquare className="w-2.5 h-2.5" /> Follow-up
              </Button>
            )}
          </>
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
            Gerar Proposta IA
          </Button>
        ) : null}
        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 ml-auto opacity-0 group-hover:opacity-100">
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </Card>
  );
}
