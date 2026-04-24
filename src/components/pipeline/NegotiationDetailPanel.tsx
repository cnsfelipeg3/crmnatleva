import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { formatDateBR } from "@/lib/dateFormat";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
  Clock, Sparkles, Send, Eye, Brain, Heart,
  Hotel, Plane, Car, Compass, TrendingUp, DollarSign,
  MessageSquare, Shield, ChevronDown,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { getProductLabel } from "@/lib/productTypes";

interface Props {
  item: NegotiationItem | null;
  open: boolean;
  onClose: () => void;
}

// ─── AI Strategic Summary ───
function AiStrategicSummary({ item }: { item: NegotiationItem }) {
  const b = item.briefing;
  if (!b) return null;

  const hasAnyInsight = b.conversationSummary || b.aiRecommendation || b.nextSteps || b.budgetBehavioralReading;
  if (!hasAnyInsight) return null;

  return (
    <Card className="p-4 space-y-3 border-accent/30 bg-accent/[0.03]">
      <div className="flex items-center gap-2">
        <Brain className="w-4 h-4 text-accent" />
        <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Resumo Estratégico IA</h4>
      </div>

      {b.conversationSummary && (
        <p className="text-xs text-muted-foreground leading-relaxed">{b.conversationSummary}</p>
      )}

      {b.aiRecommendation && (
        <div className="rounded-lg bg-accent/10 p-3">
          <p className="text-[10px] font-semibold text-accent uppercase mb-1">Recomendação</p>
          <p className="text-xs text-foreground">{b.aiRecommendation}</p>
        </div>
      )}

      {b.nextSteps && (
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Próximos passos</p>
          <p className="text-xs text-foreground">{b.nextSteps}</p>
        </div>
      )}

      {b.budgetBehavioralReading && (
        <div className="flex items-start gap-2">
          <DollarSign className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground italic">{b.budgetBehavioralReading}</p>
        </div>
      )}

      {/* Lead insights badges */}
      <div className="flex flex-wrap gap-1.5">
        {b.leadScore != null && b.leadScore > 0 && (
          <Badge variant="outline" className="text-[9px] gap-1">
            <TrendingUp className="w-2.5 h-2.5" /> Score {b.leadScore}
          </Badge>
        )}
        {b.leadSentiment && (
          <Badge variant="outline" className="text-[9px] gap-1">
            <Heart className="w-2.5 h-2.5" /> {b.leadSentiment}
          </Badge>
        )}
        {b.leadType && (
          <Badge variant="outline" className="text-[9px] gap-1">
            <Users className="w-2.5 h-2.5" /> {b.leadType}
          </Badge>
        )}
        {b.priceSensitivity && (
          <Badge variant="outline" className="text-[9px] gap-1">
            <DollarSign className="w-2.5 h-2.5" /> {b.priceSensitivity}
          </Badge>
        )}
      </div>
    </Card>
  );
}

// ─── Collapsible Section ───
function DetailSection({ title, icon: Icon, children, defaultOpen = true }: {
  title: string; icon: typeof Clock; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full text-left py-1"
      >
        <Icon className="w-3.5 h-3.5 text-accent" />
        <span className="text-xs font-bold text-foreground uppercase tracking-wider flex-1">{title}</span>
        <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="pl-5 mt-2 space-y-2">{children}</div>}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-xs font-medium text-foreground">{value}</p>
    </div>
  );
}

function TagList({ label, items }: { label: string; items: string[] | null | undefined }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <p className="text-[10px] text-muted-foreground mb-1">{label}</p>
      <div className="flex flex-wrap gap-1">
        {items.map((t, i) => (
          <Badge key={i} variant="outline" className="text-[9px]">{t}</Badge>
        ))}
      </div>
    </div>
  );
}

// ─── Complete Profile ───
function CompleteProfile({ item }: { item: NegotiationItem }) {
  const b = item.briefing;

  return (
    <div className="space-y-3">
      {/* Travel */}
      <DetailSection title="Viagem" icon={Compass}>
        <div className="grid grid-cols-2 gap-2">
          <InfoRow label="Destino" value={item.destination} />
          <InfoRow label="Origem" value={item.origin || b?.departureAirport} />
          <InfoRow label="Ida" value={formatDateBR(item.departureDate)} />
          <InfoRow label="Volta" value={formatDateBR(item.returnDate)} />
          <InfoRow label="Duração" value={b?.durationDays ? `${b.durationDays} dias` : null} />
          <InfoRow label="Datas flexíveis" value={b?.flexibleDates ? "Sim" : b?.flexibleDates === false ? "Não" : null} />
          <InfoRow label="Motivação" value={b?.tripMotivation} />
          <InfoRow label="Ritmo" value={b?.travelPace} />
        </div>
      </DetailSection>

      {/* Group */}
      <DetailSection title="Grupo" icon={Users}>
        <div className="grid grid-cols-2 gap-2">
          <InfoRow label="Passageiros" value={String(item.pax || 0)} />
          <InfoRow label="Adultos" value={b?.adults ? String(b.adults) : null} />
          <InfoRow label="Crianças" value={b?.children ? String(b.children) : null} />
          <InfoRow label="Idades crianças" value={b?.childrenAges?.join(", ")} />
          <InfoRow label="Detalhes" value={b?.groupDetails} />
          <InfoRow label="Experiência viagem" value={b?.travelExperience} />
        </div>
      </DetailSection>

      {/* Hotel */}
      {(b?.hotelPreference || b?.hotelStars || item.cabinClass) && (
        <DetailSection title={getProductLabel("hospedagem")} icon={Hotel} defaultOpen={false}>
          <div className="grid grid-cols-2 gap-2">
            <InfoRow label="Preferência" value={b?.hotelPreference} />
            <InfoRow label="Estrelas" value={b?.hotelStars ? `${b.hotelStars}★` : null} />
            <InfoRow label="Localização" value={b?.hotelLocation} />
            <InfoRow label="Observações" value={b?.hotelNotes} />
          </div>
          <TagList label="Necessidades" items={b?.hotelNeeds} />
        </DetailSection>
      )}

      {/* Flights */}
      {(b?.preferredAirline || b?.flightPreference || item.cabinClass) && (
        <DetailSection title="Voos" icon={Plane} defaultOpen={false}>
          <div className="grid grid-cols-2 gap-2">
            <InfoRow label="Aeroporto" value={b?.departureAirport} />
            <InfoRow label="Classe" value={item.cabinClass} />
            <InfoRow label="Companhia" value={b?.preferredAirline} />
            <InfoRow label="Preferência" value={b?.flightPreference} />
          </div>
        </DetailSection>
      )}

      {/* Experiences */}
      {(b?.mustHaveExperiences?.length || b?.desiredExperiences?.length) && (
        <DetailSection title="Experiências" icon={Sparkles} defaultOpen={false}>
          <TagList label="Obrigatórias" items={b?.mustHaveExperiences} />
          <TagList label="Desejadas" items={b?.desiredExperiences} />
          <InfoRow label="Notas" value={b?.experienceNotes} />
        </DetailSection>
      )}

      {/* Logistics */}
      {(b?.transferNeeded || b?.rentalCar || b?.transportNotes) && (
        <DetailSection title="Logística" icon={Car} defaultOpen={false}>
          <div className="grid grid-cols-2 gap-2">
            <InfoRow label="Transfer" value={b?.transferNeeded ? "Sim" : b?.transferNeeded === false ? "Não" : null} />
            <InfoRow label="Aluguel carro" value={b?.rentalCar ? "Sim" : b?.rentalCar === false ? "Não" : null} />
          </div>
          <InfoRow label="Notas transporte" value={b?.transportNotes} />
        </DetailSection>
      )}

      {/* Budget */}
      {(item.budgetRange || b?.priceSensitivity || b?.behavioralNotes) && (
        <DetailSection title="Orçamento" icon={DollarSign} defaultOpen={false}>
          <div className="grid grid-cols-2 gap-2">
            <InfoRow label="Faixa" value={item.budgetRange} />
            <InfoRow label="Sensibilidade" value={b?.priceSensitivity} />
          </div>
          <InfoRow label="Notas comportamentais" value={b?.behavioralNotes} />
        </DetailSection>
      )}
    </div>
  );
}

// ─── Micro Timeline ───
interface TimelineEvent { time: string; label: string; icon: typeof Clock; }

function buildMicroTimeline(item: NegotiationItem): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  events.push({
    time: isNaN(new Date(item.createdAt).getTime()) ? "" : format(new Date(item.createdAt), "dd/MM HH:mm"),
    label: item.source === "quote" ? "Cotação recebida via portal" : item.source === "briefing" ? "Briefing recebido via IA" : "Proposta criada manualmente",
    icon: Clock,
  });
  if (item.source === "briefing" && item.briefing?.conversationSummary) {
    events.push({ time: "", label: "IA analisou conversa e extraiu briefing", icon: Brain });
  }
  if (item.stage !== "nova") {
    events.push({ time: "", label: "Dados extraídos e analisados", icon: Eye });
  }
  if (item.proposalId) {
    events.push({ time: "", label: "Proposta gerada", icon: FileText });
  }
  if (item.stage === "enviada" || item.stage === "aceita") {
    events.push({
      time: item.sentAt && !isNaN(new Date(item.sentAt).getTime()) ? format(new Date(item.sentAt), "dd/MM HH:mm") : "",
      label: "Proposta enviada ao cliente",
      icon: Send,
    });
  }
  if ((item.viewCount || 0) > 0) {
    events.push({
      time: item.lastViewedAt && !isNaN(new Date(item.lastViewedAt).getTime()) ? format(new Date(item.lastViewedAt), "dd/MM HH:mm") : "",
      label: `Cliente visualizou (${item.viewCount}x)`,
      icon: Eye,
    });
  }
  if (item.stage === "aceita") {
    events.push({ time: "", label: "✅ Proposta aceita pelo cliente!", icon: Sparkles });
  }
  return events;
}

// ─── Main Panel ───
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
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
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

          {/* AI Strategic Summary */}
          <AiStrategicSummary item={item} />

          <Separator />

          {/* Complete Profile */}
          <CompleteProfile item={item} />

          <Separator />

          {/* Micro-timeline */}
          <DetailSection title="Linha do tempo" icon={Clock}>
            <div className="space-y-0 border-l-2 border-accent/20 ml-0">
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
          </DetailSection>

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
