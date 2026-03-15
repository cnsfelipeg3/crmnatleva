import { Card } from "@/components/ui/card";
import AirlineLogo from "@/components/AirlineLogo";
import { PlaneTakeoff, PlaneLanding, Clock, Terminal } from "lucide-react";
import type { FlightSegmentData } from "./ProposalFlightSearch";

function formatDuration(min: number): string {
  if (!min || min <= 0) return "—";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h${m > 0 ? ` ${m}min` : ""}` : `${m}min`;
}

function getNextDayIndicator(depTime: string, arrTime: string): string {
  if (!depTime || !arrTime) return "";
  const [dh] = depTime.split(":").map(Number);
  const [ah] = arrTime.split(":").map(Number);
  if (ah < dh || (ah === dh && arrTime < depTime)) return " (+1)";
  return "";
}

interface FlightSegmentCardProps {
  seg: FlightSegmentData;
  compact?: boolean;
}

export default function FlightSegmentCard({ seg, compact }: FlightSegmentCardProps) {
  return (
    <Card className={`overflow-hidden border-border/60 ${compact ? "border-l-0 border-r-0 rounded-none shadow-none" : ""}`}>
      <div className={`bg-gradient-to-r from-primary/5 to-primary/10 ${compact ? "p-3 sm:p-4" : "p-4 sm:p-5"}`}>
        <div className="flex items-start gap-3 sm:gap-4">
          <div className={`shrink-0 ${compact ? "w-10 h-10" : "w-14 h-14"} rounded-xl bg-background/80 backdrop-blur border border-border/50 flex items-center justify-center shadow-sm`}>
            <AirlineLogo iata={seg.airline} size={compact ? 28 : 40} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-semibold text-sm text-foreground">{seg.airline_name || seg.airline}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-mono font-medium">
                {seg.airline}{seg.flight_number}
              </span>
              {seg.departure_date && (
                <span className="text-xs text-muted-foreground ml-auto">
                  {new Date(seg.departure_date + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 sm:gap-6">
              <div className="text-center min-w-[55px]">
                <p className={`${compact ? "text-lg" : "text-xl sm:text-2xl"} font-bold text-foreground leading-none`}>{seg.departure_time || "—"}</p>
                <p className={`${compact ? "text-base" : "text-lg"} font-bold text-primary mt-1`}>{seg.origin_iata}</p>
                {seg.terminal && (
                  <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-0.5 mt-0.5">
                    <Terminal className="w-2.5 h-2.5" /> T{seg.terminal}
                  </p>
                )}
              </div>
              <div className="flex-1 flex flex-col items-center gap-1 px-2">
                <div className="flex items-center w-full gap-1">
                  <PlaneTakeoff className="w-3.5 h-3.5 text-primary shrink-0" />
                  <div className="flex-1 h-px bg-gradient-to-r from-primary/60 via-primary/30 to-primary/60 relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    </div>
                  </div>
                  <PlaneLanding className="w-3.5 h-3.5 text-primary shrink-0" />
                </div>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Clock className="w-2.5 h-2.5" /> {formatDuration(seg.duration_minutes)}
                </div>
              </div>
              <div className="text-center min-w-[55px]">
                <p className={`${compact ? "text-lg" : "text-xl sm:text-2xl"} font-bold text-foreground leading-none`}>
                  {seg.arrival_time || "—"}
                  <span className="text-xs font-normal text-muted-foreground">
                    {getNextDayIndicator(seg.departure_time, seg.arrival_time)}
                  </span>
                </p>
                <p className={`${compact ? "text-base" : "text-lg"} font-bold text-primary mt-1`}>{seg.destination_iata}</p>
                {seg.arrival_terminal && (
                  <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-0.5 mt-0.5">
                    <Terminal className="w-2.5 h-2.5" /> T{seg.arrival_terminal}
                  </p>
                )}
              </div>
            </div>
            {(seg.aircraft_type || seg.notes) && (
              <div className="mt-2 pt-2 border-t border-border/40 flex flex-wrap gap-3 text-xs text-muted-foreground">
                {seg.aircraft_type && <span className="flex items-center gap-1">✈ {seg.aircraft_type}</span>}
                {seg.notes && <span className="italic">{seg.notes}</span>}
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
