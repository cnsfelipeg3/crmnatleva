import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
import { useNavigate } from "react-router-dom";
import {
  MapPin, CalendarDays, Users, FileText, ExternalLink,
  Clock, Sparkles, Send, MessageSquare, Eye,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  item: NegotiationItem | null;
  open: boolean;
  onClose: () => void;
}

interface TimelineEvent {
  time: string;
  label: string;
  icon: typeof Clock;
}

function buildMicroTimeline(item: NegotiationItem): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  events.push({
    time: format(new Date(item.createdAt), "dd/MM HH:mm"),
    label: item.source === "quote" ? "Cotação recebida via portal" : item.source === "briefing" ? "Briefing recebido via IA" : "Proposta criada manualmente",
    icon: Clock,
  });

  if (item.stage !== "nova") {
    events.push({
      time: "",
      label: "Dados extraídos e analisados",
      icon: Eye,
    });
  }

  if (item.proposalId) {
    events.push({
      time: "",
      label: "Proposta gerada",
      icon: FileText,
    });
  }

  if (item.stage === "enviada" || item.stage === "aceita") {
    events.push({
      time: item.sentAt ? format(new Date(item.sentAt), "dd/MM HH:mm") : "",
      label: "Proposta enviada ao cliente",
      icon: Send,
    });
  }

  if ((item.viewCount || 0) > 0) {
    events.push({
      time: item.lastViewedAt ? format(new Date(item.lastViewedAt), "dd/MM HH:mm") : "",
      label: `Cliente visualizou (${item.viewCount}x)`,
      icon: Eye,
    });
  }

  if (item.stage === "aceita") {
    events.push({
      time: "",
      label: "✅ Proposta aceita pelo cliente!",
      icon: Sparkles,
    });
  }

  return events;
}

export function NegotiationDetailPanel({ item, open, onClose }: Props) {
  const navigate = useNavigate();
  if (!item) return null;

  const temperature = calculateTemperature(item);
  const progress = calculateProgress(item);
  const narrative = generateNarrative(item);
  const route = [item.origin, item.destination].filter(Boolean).join(" → ") || "Sem rota";
  const timeline = buildMicroTimeline(item);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-accent" />
            {route}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-5 mt-4">
          {/* Temperature + Progress */}
          <div className="flex items-center gap-3">
            <TemperatureScore temperature={temperature} showLabel />
            <div className="flex-1">
              <Progress value={progress} className="h-2" />
            </div>
            <span className="text-xs text-muted-foreground font-medium">{progress}%</span>
          </div>

          {/* Narrative */}
          <p className="text-sm text-muted-foreground italic">"{narrative}"</p>

          {/* Details */}
          <div className="grid grid-cols-2 gap-3">
            {item.clientName && (
              <DetailRow icon={Users} label="Cliente" value={item.clientName} />
            )}
            {item.pax > 0 && (
              <DetailRow icon={Users} label="Passageiros" value={String(item.pax)} />
            )}
            {item.departureDate && (
              <DetailRow
                icon={CalendarDays}
                label="Ida"
                value={format(new Date(item.departureDate + "T12:00:00"), "dd MMM yyyy", { locale: ptBR })}
              />
            )}
            {item.returnDate && (
              <DetailRow
                icon={CalendarDays}
                label="Volta"
                value={format(new Date(item.returnDate + "T12:00:00"), "dd MMM yyyy", { locale: ptBR })}
              />
            )}
            {item.cabinClass && (
              <DetailRow icon={FileText} label="Classe" value={item.cabinClass} />
            )}
            {item.budgetRange && (
              <DetailRow icon={FileText} label="Orçamento" value={item.budgetRange} />
            )}
          </div>

          {/* Micro-timeline */}
          <div>
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">
              Linha do tempo
            </h4>
            <div className="space-y-0 border-l-2 border-accent/20 ml-2">
              {timeline.map((ev, i) => {
                const Icon = ev.icon;
                return (
                  <div key={i} className="flex items-start gap-2 pl-4 py-2 relative">
                    <div className="absolute -left-[5px] top-3 w-2 h-2 rounded-full bg-accent" />
                    <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-foreground">{ev.label}</p>
                      {ev.time && <p className="text-[10px] text-muted-foreground">{ev.time}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-2">
            {item.proposalId && (
              <Button onClick={() => navigate(`/propostas/${item.proposalId}`)} className="gap-2">
                <FileText className="w-4 h-4" /> Ver / Editar Proposta
              </Button>
            )}
            {item.proposalSlug && (
              <Button
                variant="outline" className="gap-2"
                onClick={() => window.open(`/p/${item.proposalSlug}`, "_blank")}
              >
                <ExternalLink className="w-4 h-4" /> Link público
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DetailRow({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="w-3 h-3 text-muted-foreground" />
      <div>
        <p className="text-[10px] text-muted-foreground">{label}</p>
        <p className="text-xs font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}
