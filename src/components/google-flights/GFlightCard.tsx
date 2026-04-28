import { Plane, Clock, ArrowRight, Award, Zap, DollarSign } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  cabinLabel,
  dayDiff,
  formatBRL,
  formatMinutes,
  formatTime,
  type GFlightItinerary,
} from "./gflightsTypes";

interface Props {
  itinerary: GFlightItinerary;
  isBest?: boolean;
  isCheapest?: boolean;
  isFastest?: boolean;
  onClick?: (it: GFlightItinerary) => void;
}

export function GFlightCard({ itinerary, isBest, isCheapest, isFastest, onClick }: Props) {
  const flights = itinerary.flights ?? [];
  const layovers = itinerary.layovers ?? [];
  const first = flights[0];
  const last = flights[flights.length - 1];
  const stops = Math.max(0, flights.length - 1);
  const dep = first?.departure_airport;
  const arr = last?.arrival_airport;
  const overnight = dayDiff(dep?.time, arr?.time);
  const carriers = Array.from(
    new Set(flights.map((f) => f.airline).filter(Boolean) as string[]),
  );
  const logo = itinerary.airline_logo ?? first?.airline_logo;

  return (
    <Card
      className={cn(
        "p-4 transition-all hover:shadow-md cursor-pointer border-border/60",
        isBest && "ring-2 ring-primary/30",
      )}
      onClick={() => onClick?.(itinerary)}
    >
      {/* Badges */}
      {(isBest || isCheapest || isFastest) && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {isBest && (
            <Badge variant="default" className="gap-1 text-[10px]">
              <Award className="h-3 w-3" /> Recomendado
            </Badge>
          )}
          {isCheapest && (
            <Badge variant="outline" className="gap-1 text-[10px] border-emerald-500/40 text-emerald-700 dark:text-emerald-300">
              <DollarSign className="h-3 w-3" /> Mais barato
            </Badge>
          )}
          {isFastest && (
            <Badge variant="outline" className="gap-1 text-[10px] border-sky-500/40 text-sky-700 dark:text-sky-300">
              <Zap className="h-3 w-3" /> Mais rápido
            </Badge>
          )}
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center gap-4">
        {/* Logo + carriers */}
        <div className="flex items-center gap-3 md:w-44 shrink-0">
          {logo ? (
            <img src={logo} alt="" className="h-10 w-10 object-contain rounded bg-white p-1 border border-border/40" />
          ) : (
            <div className="h-10 w-10 rounded bg-muted/40 flex items-center justify-center">
              <Plane className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0">
            <div className="text-xs font-medium truncate">{carriers.join(" · ") || "—"}</div>
            <div className="text-[10px] text-muted-foreground truncate">
              {flights.map((f) => f.flight_number).filter(Boolean).join(" · ")}
            </div>
          </div>
        </div>

        {/* Route */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <div className="text-center">
              <div className="text-lg font-bold leading-none">{formatTime(dep?.time)}</div>
              <div className="text-[11px] font-mono text-muted-foreground mt-0.5">{dep?.id}</div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-center text-muted-foreground mb-0.5 flex items-center justify-center gap-1">
                <Clock className="h-3 w-3" />
                {formatMinutes(itinerary.total_duration)}
              </div>
              <div className="relative h-px bg-border">
                <ArrowRight className="absolute -top-1.5 right-0 h-3 w-3 text-muted-foreground" />
                {layovers.map((l, i) => (
                  <div
                    key={i}
                    className="absolute -top-0.5 h-1.5 w-1.5 rounded-full bg-primary/60"
                    style={{ left: `${((i + 1) / (layovers.length + 1)) * 100}%` }}
                    title={`${l.name ?? l.id} · ${formatMinutes(l.duration)}`}
                  />
                ))}
              </div>
              <div className="text-[10px] text-center text-muted-foreground mt-0.5">
                {stops === 0 ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">Direto</span>
                ) : (
                  <>{stops} {stops === 1 ? "parada" : "paradas"} · {layovers.map((l) => l.id ?? l.name).filter(Boolean).join(", ")}</>
                )}
              </div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold leading-none">
                {formatTime(arr?.time)}
                {overnight > 0 && (
                  <sup className="text-[10px] text-rose-500 ml-0.5">+{overnight}</sup>
                )}
              </div>
              <div className="text-[11px] font-mono text-muted-foreground mt-0.5">{arr?.id}</div>
            </div>
          </div>
        </div>

        {/* Price */}
        <div className="md:w-32 md:text-right shrink-0 border-t md:border-t-0 md:border-l border-border/40 md:pl-4 pt-2 md:pt-0">
          <div className="text-xl font-bold text-primary">{formatBRL(itinerary.price)}</div>
          <div className="text-[10px] text-muted-foreground">por adulto</div>
          <div className="text-[10px] text-muted-foreground mt-1">
            {cabinLabel((first?.travel_class as string) || "ECONOMY")}
          </div>
        </div>
      </div>
    </Card>
  );
}
