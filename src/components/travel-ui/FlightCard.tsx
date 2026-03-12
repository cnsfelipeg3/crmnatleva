import { motion } from "framer-motion";
import { Plane } from "lucide-react";
import AirlineLogo from "@/components/AirlineLogo";
import { iataToLabel } from "@/lib/iataUtils";

const fmtShort = (d: string | null) => {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
};

interface FlightCardProps {
  segment: {
    id?: string;
    airline?: string;
    flight_number?: string;
    origin_iata: string;
    destination_iata: string;
    departure_date?: string;
    departure_time?: string;
    arrival_time?: string;
    direction?: string;
    flight_class?: string;
    terminal?: string;
    duration_minutes?: number;
    cabin_type?: string;
  };
  index?: number;
}

export default function FlightCard({ segment: seg, index = 0 }: FlightCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 + index * 0.06 }}
      className="group relative rounded-2xl overflow-hidden border border-border/40 hover:border-accent/20 hover:shadow-lg hover:shadow-accent/5 transition-all bg-card"
    >
      <div className="p-5 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <AirlineLogo iata={seg.airline} size={36} />
            <div>
              <p className="text-xs text-muted-foreground font-mono tracking-wider">{seg.flight_number || seg.airline}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {seg.direction === "ida" ? "Ida" : seg.direction === "volta" ? "Volta" : seg.direction}
              </p>
            </div>
          </div>
          <div className="flex gap-1.5">
            {seg.flight_class && (
              <span className="text-[10px] font-semibold text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-full">{seg.flight_class}</span>
            )}
          </div>
        </div>

        {/* Route */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <p className="text-2xl sm:text-3xl font-bold text-foreground tracking-tighter font-mono">{seg.origin_iata}</p>
            <p className="text-xs text-muted-foreground mt-1">{iataToLabel(seg.origin_iata)}</p>
            <div className="flex items-center gap-2 mt-2">
              {seg.departure_date && <span className="text-xs text-muted-foreground">{fmtShort(seg.departure_date)}</span>}
              {seg.departure_time && <span className="text-sm font-bold text-foreground font-mono">{seg.departure_time?.slice(0, 5)}</span>}
            </div>
          </div>

          <div className="flex-shrink-0 flex flex-col items-center gap-1 w-24 sm:w-32">
            <div className="relative w-full flex items-center">
              <div className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />
              <div className="flex-1 h-px bg-gradient-to-r from-accent via-accent/40 to-accent relative mx-1">
                <Plane className="h-4 w-4 text-accent absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-90" />
              </div>
              <div className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />
            </div>
            {seg.duration_minutes && (
              <span className="text-[10px] text-muted-foreground">
                {Math.floor(seg.duration_minutes / 60)}h{seg.duration_minutes % 60 > 0 ? `${seg.duration_minutes % 60}m` : ""}
              </span>
            )}
          </div>

          <div className="flex-1 text-right">
            <p className="text-2xl sm:text-3xl font-bold text-foreground tracking-tighter font-mono">{seg.destination_iata}</p>
            <p className="text-xs text-muted-foreground mt-1">{iataToLabel(seg.destination_iata)}</p>
            <div className="flex items-center gap-2 mt-2 justify-end">
              {seg.arrival_time && <span className="text-sm font-bold text-foreground font-mono">{seg.arrival_time?.slice(0, 5)}</span>}
            </div>
          </div>
        </div>

        {seg.terminal && (
          <div className="mt-4 pt-4 border-t border-border/30 flex items-center gap-4 text-xs text-muted-foreground">
            <span>Terminal {seg.terminal}</span>
            {seg.cabin_type && <span>{seg.cabin_type}</span>}
          </div>
        )}
      </div>
    </motion.div>
  );
}
