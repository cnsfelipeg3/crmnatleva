import {
  Plane, Briefcase, Luggage, Leaf, AlertTriangle, Repeat,
  Wifi, Power, Tv, Award, Zap, DollarSign,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  cabinLabel, dayDiff, formatBRL, formatMinutes, formatTime, hasExtension,
  type GFlightItinerary,
} from "./gflightsTypes";

interface Props {
  itinerary: GFlightItinerary;
  isBest?: boolean;
  isCheapest?: boolean;
  isFastest?: boolean;
  onSelect?: (it: GFlightItinerary) => void;
}

export function GFlightCard({ itinerary, isBest, isCheapest, isFastest, onSelect }: Props) {
  const flights = itinerary.flights ?? [];
  const layovers = itinerary.layovers ?? [];
  const first = flights[0];
  const last = flights[flights.length - 1];
  const stops = itinerary.stops ?? Math.max(0, flights.length - 1);
  const dep = first?.departure_airport;
  const arr = last?.arrival_airport;
  const overnight = dayDiff(dep?.time, arr?.time);
  const airlines = Array.from(new Set(flights.map(f => f.airline).filter(Boolean) as string[]));
  const flightNumbers = flights.map(f => f.flight_number).filter(Boolean).join(" · ");
  const logo = itinerary.airline_logo ?? first?.airline_logo;
  const co2 = itinerary.carbon_emissions;
  const bags = itinerary.bags;

  const hasUSB = hasExtension(itinerary, /USB|power/i);
  const hasWifi = hasExtension(itinerary, /wi-?fi/i);
  const hasVideo = hasExtension(itinerary, /video|on-demand|entertainment/i);

  return (
    <button
      type="button"
      onClick={() => onSelect?.(itinerary)}
      className={cn(
        "w-full text-left rounded-lg border bg-card p-4 hover:border-primary/40 hover:shadow-md transition-all",
        isBest ? "border-primary/40 ring-1 ring-primary/20" : "border-border",
      )}
    >
      {/* Top: cia + preço */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {logo ? (
            <img src={logo} alt="" className="h-8 w-8 object-contain rounded bg-white p-0.5 border border-border/40 shrink-0" />
          ) : (
            <div className="h-8 w-8 rounded bg-muted/40 grid place-items-center shrink-0">
              <Plane className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0">
            <div className="text-sm font-medium truncate">{airlines.join(" + ") || "—"}</div>
            <div className="text-[10px] text-muted-foreground truncate">
              {flightNumbers}
              {first?.travel_class && <> · {cabinLabel(first.travel_class)}</>}
            </div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-lg font-bold text-primary">{formatBRL(itinerary.price)}</div>
          <div className="text-[10px] text-muted-foreground">por adulto</div>
        </div>
      </div>

      {/* Tags de destaque */}
      {(isBest || isCheapest || isFastest) && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {isBest && (
            <Badge variant="default" className="gap-1 text-[10px]"><Award className="h-2.5 w-2.5" /> Recomendado</Badge>
          )}
          {isCheapest && (
            <Badge variant="outline" className="gap-1 text-[10px] border-emerald-500/40 text-emerald-700 dark:text-emerald-300">
              <DollarSign className="h-2.5 w-2.5" /> Mais barato
            </Badge>
          )}
          {isFastest && (
            <Badge variant="outline" className="gap-1 text-[10px] border-sky-500/40 text-sky-700 dark:text-sky-300">
              <Zap className="h-2.5 w-2.5" /> Mais rápido
            </Badge>
          )}
        </div>
      )}

      {/* Rota */}
      <div className="flex items-center gap-3 mb-3">
        <div className="text-right">
          <div className="text-base font-bold font-mono leading-none">{formatTime(dep?.time)}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">{dep?.id}</div>
        </div>
        <div className="flex-1 flex flex-col items-center min-w-0">
          <div className="text-[10px] text-muted-foreground">
            {itinerary.total_duration_text || formatMinutes(itinerary.total_duration)}
          </div>
          <div className="w-full h-px bg-border my-1 relative">
            {layovers.map((_, i) => (
              <div key={i}
                className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-amber-500"
                style={{ left: `${((i + 1) / (layovers.length + 1)) * 100}%` }}
              />
            ))}
          </div>
          <div className="text-[10px] text-muted-foreground truncate w-full text-center">
            {stops === 0
              ? <span className="text-emerald-600 dark:text-emerald-400 font-medium">Direto</span>
              : <>{stops} {stops === 1 ? "parada" : "paradas"}{layovers.length > 0 && ` · ${layovers.map(l => l.id).filter(Boolean).join(" · ")}`}</>
            }
          </div>
        </div>
        <div className="text-left">
          <div className="text-base font-bold font-mono leading-none">
            {formatTime(arr?.time)}
            {overnight > 0 && <sup className="text-[10px] text-rose-500 ml-0.5">+{overnight}</sup>}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">{arr?.id}</div>
        </div>
      </div>

      {/* Bottom: badges */}
      <div className="flex items-center gap-1.5 flex-wrap pt-3 border-t border-border/40">
        {bags?.carry_on != null && bags.carry_on > 0 && (
          <Badge variant="outline" className="text-[10px] gap-1 h-5">
            <Briefcase className="h-2.5 w-2.5" /> Mão {bags.carry_on}
          </Badge>
        )}
        {bags?.checked != null && bags.checked > 0 && (
          <Badge variant="outline" className="text-[10px] gap-1 h-5">
            <Luggage className="h-2.5 w-2.5" /> Despachada {bags.checked}
          </Badge>
        )}
        {co2?.difference_percent != null && (
          <Badge variant="outline"
            className={cn("text-[10px] gap-1 h-5",
              co2.difference_percent < 0 && "border-emerald-500/30 text-emerald-700 dark:text-emerald-300",
              co2.difference_percent > 10 && "border-rose-500/30 text-rose-700 dark:text-rose-300",
            )}>
            <Leaf className="h-2.5 w-2.5" /> CO₂ {co2.difference_percent > 0 ? "+" : ""}{co2.difference_percent}%
          </Badge>
        )}
        {itinerary.self_transfer && (
          <Badge variant="outline" className="text-[10px] gap-1 h-5 border-amber-500/30 text-amber-700 dark:text-amber-300">
            <AlertTriangle className="h-2.5 w-2.5" /> Self-transfer
          </Badge>
        )}
        {itinerary.delay?.values && (
          <Badge variant="outline" className="text-[10px] gap-1 h-5 border-amber-500/30 text-amber-700 dark:text-amber-300">
            <AlertTriangle className="h-2.5 w-2.5" /> Atrasos
          </Badge>
        )}
        {hasUSB && <Badge variant="outline" className="text-[10px] gap-1 h-5"><Power className="h-2.5 w-2.5" /> USB</Badge>}
        {hasWifi && <Badge variant="outline" className="text-[10px] gap-1 h-5"><Wifi className="h-2.5 w-2.5" /> Wi-Fi</Badge>}
        {hasVideo && <Badge variant="outline" className="text-[10px] gap-1 h-5"><Tv className="h-2.5 w-2.5" /> Vídeo</Badge>}
        <div className="ml-auto text-[10px] text-primary font-medium">Ver detalhes →</div>
      </div>
    </button>
  );
}
