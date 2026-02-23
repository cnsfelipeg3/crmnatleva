import { Plane, Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatTimeBR } from "@/lib/dateFormat";
import AirlineLogo from "@/components/AirlineLogo";

export interface FlightSegment {
  id?: string;
  direction: "ida" | "volta";
  segment_order: number;
  airline: string;
  flight_number: string;
  origin_iata: string;
  destination_iata: string;
  departure_date: string;
  departure_time: string;
  arrival_time: string;
  duration_minutes: number;
  flight_class: string;
  cabin_type: string;
  operated_by: string;
  connection_time_minutes: number;
  terminal: string;
}

interface Props {
  segments: FlightSegment[];
  direction: "ida" | "volta";
}

function formatDuration(mins: number) {
  if (!mins) return "";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h${m > 0 ? `${m}min` : ""}`;
}

export default function FlightTimeline({ segments, direction }: Props) {
  const sorted = [...segments].filter(s => s.direction === direction).sort((a, b) => a.segment_order - b.segment_order);
  if (sorted.length === 0) return null;

  const totalDuration = sorted.reduce((s, seg) => s + (seg.duration_minutes || 0) + (seg.connection_time_minutes || 0), 0);
  const totalConnection = sorted.reduce((s, seg) => s + (seg.connection_time_minutes || 0), 0);
  const hasConnection = sorted.length > 1;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 mb-3">
        <h4 className="text-sm font-semibold text-foreground capitalize">{direction}</h4>
        {hasConnection && (
          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
            {sorted.length - 1} conexão(ões)
          </span>
        )}
        {totalDuration > 0 && (
          <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1">
            <Clock className="w-3 h-3" /> Total: {formatDuration(totalDuration)}
          </span>
        )}
      </div>

      <div className="relative">
        {sorted.map((seg, i) => {
          const isConnectionCritical = seg.connection_time_minutes > 0 && seg.connection_time_minutes < 90;
          const isConnectionLong = seg.connection_time_minutes > 480;

          return (
            <div key={i}>
              {/* Segment */}
              <div className="flex items-center gap-3 py-2">
                {/* Origin */}
                <div className="text-center w-16 shrink-0">
                  <p className="text-lg font-bold font-mono text-primary">{seg.origin_iata}</p>
                  {seg.departure_time && (
                    <p className="text-xs text-muted-foreground">{formatTimeBR(seg.departure_time)}</p>
                  )}
                </div>

                {/* Line */}
                <div className="flex-1 relative">
                  <div className="border-t-2 border-primary border-dashed" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2">
                    {seg.airline ? <AirlineLogo iata={seg.airline} size={18} /> : <Plane className="w-4 h-4 text-primary" />}
                  </div>
                  <div className="flex justify-center mt-1">
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground font-medium">
                        {seg.airline} {seg.flight_number}
                      </p>
                      {seg.duration_minutes > 0 && (
                        <p className="text-[10px] text-muted-foreground">{formatDuration(seg.duration_minutes)}</p>
                      )}
                      {seg.flight_class && (
                        <p className="text-[10px] text-muted-foreground">{seg.flight_class}</p>
                      )}
                      {seg.operated_by && seg.operated_by !== seg.airline && (
                        <p className="text-[10px] text-muted-foreground/60">Op. {seg.operated_by}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Destination */}
                <div className="text-center w-16 shrink-0">
                  <p className="text-lg font-bold font-mono text-primary">{seg.destination_iata}</p>
                  {seg.arrival_time && (
                    <p className="text-xs text-muted-foreground">{formatTimeBR(seg.arrival_time)}</p>
                  )}
                </div>
              </div>

              {/* Connection indicator */}
              {seg.connection_time_minutes > 0 && i < sorted.length - 1 && (
                <div
                  className={cn(
                    "flex items-center justify-center gap-1 py-1.5 mx-16 rounded text-xs",
                    isConnectionCritical
                      ? "bg-destructive/10 text-destructive"
                      : isConnectionLong
                      ? "bg-warning/10 text-warning-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <Clock className="w-3 h-3" />
                  Conexão: {formatDuration(seg.connection_time_minutes)}
                  {isConnectionCritical && (
                    <span className="flex items-center gap-0.5">
                      <AlertTriangle className="w-3 h-3" /> Crítica
                    </span>
                  )}
                  {isConnectionLong && (
                    <span className="flex items-center gap-0.5">
                      <AlertTriangle className="w-3 h-3" /> Longa
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
