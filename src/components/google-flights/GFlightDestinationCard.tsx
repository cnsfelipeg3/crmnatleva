import { Plane, AlertCircle, Sparkles, Calendar, Clock, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { format, parseISO, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatBRL } from "./gflightsTypes";
import { getDestinationCoverUrl } from "./destinationImage";
import type { DiscoveredDestination } from "@/hooks/useDiscoverDestinations";

interface Props {
  destination: DiscoveredDestination;
  isCheapest?: boolean;
  departureDate?: string;
  returnDate?: string;
  paxAdults?: number;
  originIata?: string;
  onSelectDestination: (dest: DiscoveredDestination) => void;
}

const REGION_BG: Record<string, string> = {
  "Brasil": "from-emerald-500/20 to-yellow-500/20",
  "Américas": "from-blue-500/20 to-cyan-500/20",
  "Caribe": "from-cyan-500/20 to-emerald-500/20",
  "Europa": "from-violet-500/20 to-pink-500/20",
  "Oriente Médio": "from-amber-500/20 to-orange-500/20",
  "Ásia": "from-rose-500/20 to-pink-500/20",
  "África": "from-orange-500/20 to-red-500/20",
};

function formatTime(s?: string | null): string {
  if (!s) return "—";
  const m = s.match(/(\d{1,2}):(\d{2})/);
  if (!m) return "—";
  return `${m[1].padStart(2, "0")}:${m[2]}`;
}

function formatDateBr(iso?: string): string {
  if (!iso) return "—";
  try {
    const d = parseISO(iso);
    if (!isValid(d)) return iso;
    return format(d, "d 'de' MMM", { locale: ptBR });
  } catch {
    return iso;
  }
}

export function GFlightDestinationCard({
  destination,
  isCheapest,
  departureDate,
  returnDate,
  paxAdults = 1,
  originIata = "GRU",
  onSelectDestination,
}: Props) {
  const bg = REGION_BG[destination.region] ?? "from-primary/20 to-primary/10";
  const stops = destination.flightStops ?? 0;
  const totalForPax = destination.minPrice * paxAdults;
  const coverUrl = getDestinationCoverUrl(
    destination.city,
    destination.country,
    destination.hero_image_url,
  );

  return (
    <Card
      className="overflow-hidden cursor-pointer hover:shadow-lg transition-all hover:-translate-y-0.5 border-border/60 group"
      onClick={() => onSelectDestination(destination)}
    >
      {/* HERO */}
      <div className={cn("relative h-44 bg-gradient-to-br overflow-hidden", bg)}>
        <img
          src={coverUrl}
          alt={`${destination.city}, ${destination.country}`}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e) => {
            // Se o Unsplash não tiver foto pra essa keyword, esconde o <img>
            // e o gradiente de fundo (bg) toma conta sozinho.
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

        {isCheapest && (
          <Badge className="absolute top-2 left-2 gap-1 bg-emerald-500 hover:bg-emerald-500 text-white border-0 z-10">
            <Sparkles className="h-3 w-3" /> Melhor preço
          </Badge>
        )}
        {!destination.fitsBudget && (
          <Badge variant="outline" className="absolute top-2 right-2 gap-1 bg-amber-500/90 text-white border-0 z-10">
            <AlertCircle className="h-3 w-3" /> Acima do orçamento
          </Badge>
        )}
        {destination.visa_required && (
          <Badge
            variant="outline"
            className={cn(
              "absolute z-10 text-[10px] bg-background/80 border-border",
              destination.fitsBudget ? "top-2 right-2" : "top-9 right-2",
            )}
          >
            Visto
          </Badge>
        )}

        {/* Cidade/País sobreposto */}
        <div className="absolute bottom-2 left-3 right-3 z-10">
          <h3 className={cn(
            "text-xl font-bold leading-tight",
            destination.hero_image_url ? "text-white drop-shadow-lg" : "text-foreground",
          )}>
            {destination.city}
          </h3>
          <p className={cn(
            "text-xs",
            destination.hero_image_url ? "text-white/90 drop-shadow" : "text-muted-foreground",
          )}>
            {destination.country} · {destination.region}
          </p>
        </div>

        {/* Crédito Unsplash */}
        {destination.hero_image_url && destination.hero_photographer && (
          <a
            href={destination.hero_photographer_url || "https://unsplash.com"}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-1 right-2 z-10 text-[9px] text-white/70 hover:text-white"
          >
            📷 {destination.hero_photographer}
          </a>
        )}
      </div>

      {/* DETALHES DO VOO */}
      <div className="p-3 space-y-2.5">
        {/* Datas + duração */}
        {(departureDate || destination.flightDuration) && (
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3 w-3" />
              {departureDate ? (
                <span>
                  {formatDateBr(departureDate)}
                  {returnDate && (
                    <>
                      {" "}
                      <ArrowRight className="inline h-2.5 w-2.5" /> {formatDateBr(returnDate)}
                    </>
                  )}
                </span>
              ) : (
                <span>Datas flexíveis</span>
              )}
            </div>
            {destination.flightDuration && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {destination.flightDuration}
              </div>
            )}
          </div>
        )}

        {/* Trajeto */}
        {destination.flightDeparture && (
          <div className="flex items-center gap-2 py-1.5 px-2 bg-muted/40 rounded-lg">
            <div className="text-center">
              <div className="text-sm font-bold text-foreground leading-none">
                {formatTime(destination.flightDeparture)}
              </div>
              <div className="text-[9px] text-muted-foreground mt-0.5">{originIata}</div>
            </div>
            <div className="flex-1 flex flex-col items-center">
              {destination.flightAirlineLogo ? (
                <img
                  src={destination.flightAirlineLogo}
                  alt={destination.flightAirline || ""}
                  className="h-4 w-4 object-contain mb-0.5"
                  loading="lazy"
                />
              ) : (
                <Plane className="h-3 w-3 text-muted-foreground mb-0.5" />
              )}
              <div className="relative w-full h-px bg-border">
                {destination.flightLayovers?.map((_, i) => (
                  <div
                    key={i}
                    className="absolute top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-primary"
                    style={{
                      left: `${((i + 1) / ((destination.flightLayovers?.length || 1) + 1)) * 100}%`,
                    }}
                  />
                ))}
              </div>
              <div className="text-[9px] text-muted-foreground mt-0.5 text-center">
                {stops === 0 ? "Direto" : `${stops} ${stops === 1 ? "parada" : "paradas"}`}
                {destination.flightLayovers && destination.flightLayovers.length > 0 && (
                  <> · {destination.flightLayovers.map((l) => l.id).filter(Boolean).join(" · ")}</>
                )}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm font-bold text-foreground leading-none">
                {formatTime(destination.flightArrival)}
              </div>
              <div className="text-[9px] text-muted-foreground mt-0.5">{destination.iata}</div>
            </div>
          </div>
        )}

        {destination.flightAirline && (
          <div className="text-[10px] text-muted-foreground">via {destination.flightAirline}</div>
        )}

        {/* Tags */}
        {destination.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {destination.tags.slice(0, 4).map((t) => (
              <Badge key={t} variant="secondary" className="text-[10px] capitalize">
                {t}
              </Badge>
            ))}
          </div>
        )}

        {/* Preço + CTA */}
        <div className="flex items-end justify-between pt-2 border-t border-border/40">
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">A partir de</div>
            <div className="text-xl font-bold text-foreground leading-tight">
              {formatBRL(destination.minPrice)}
            </div>
            <div className="text-[10px] text-muted-foreground">
              por adulto · ida e volta
              {paxAdults > 1 && (
                <>
                  {" · "}total {formatBRL(totalForPax)} ({paxAdults} pax)
                </>
              )}
            </div>
          </div>
          <Button size="sm" variant="default" className="h-8 text-xs gap-1">
            Ver voos <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
