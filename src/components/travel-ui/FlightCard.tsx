import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plane, ChevronDown, Download, Clock, MapPin, Armchair } from "lucide-react";
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
    arrival_terminal?: string;
    duration_minutes?: number;
    cabin_type?: string;
    operated_by?: string;
    seat_info?: string;
    connection_time_minutes?: number;
    boarding_pass_url?: string;
    eticket_url?: string;
  };
  index?: number;
}

export default function FlightCard({ segment: seg, index = 0 }: FlightCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 + index * 0.06 }}
      className="group relative rounded-2xl overflow-hidden border border-border/40 hover:border-accent/20 hover:shadow-lg hover:shadow-accent/5 transition-all bg-card cursor-pointer"
      onClick={() => setOpen(!open)}
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
          <div className="flex items-center gap-2">
            {seg.flight_class && (
              <span className="text-[10px] font-semibold text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-full">{seg.flight_class}</span>
            )}
            <ChevronDown className={`h-4 w-4 text-muted-foreground/40 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
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
      </div>

      {/* Expandable details */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 sm:px-6 pb-5 sm:pb-6 pt-2 border-t border-border/30">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mt-3">
                {seg.terminal && (
                  <DetailItem icon={<MapPin className="h-3.5 w-3.5" />} label="Terminal Partida" value={`Terminal ${seg.terminal}`} />
                )}
                {seg.arrival_terminal && (
                  <DetailItem icon={<MapPin className="h-3.5 w-3.5" />} label="Terminal Chegada" value={`Terminal ${seg.arrival_terminal}`} />
                )}
                {seg.cabin_type && (
                  <DetailItem icon={<Armchair className="h-3.5 w-3.5" />} label="Cabine" value={seg.cabin_type} />
                )}
                {seg.seat_info && (
                  <DetailItem icon={<Armchair className="h-3.5 w-3.5" />} label="Assento" value={seg.seat_info} />
                )}
                {seg.duration_minutes && (
                  <DetailItem icon={<Clock className="h-3.5 w-3.5" />} label="Duração" value={`${Math.floor(seg.duration_minutes / 60)}h${seg.duration_minutes % 60 > 0 ? ` ${seg.duration_minutes % 60}min` : ""}`} />
                )}
                {seg.operated_by && seg.operated_by !== seg.airline && (
                  <DetailItem icon={<Plane className="h-3.5 w-3.5" />} label="Operado por" value={seg.operated_by} />
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2 mt-5">
                {seg.boarding_pass_url && (
                  <a
                    href={seg.boarding_pass_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs font-semibold text-accent hover:text-accent/80 bg-accent/5 hover:bg-accent/10 px-4 py-2.5 rounded-xl transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" /> Cartão de embarque
                  </a>
                )}
                {seg.eticket_url && (
                  <a
                    href={seg.eticket_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs font-semibold text-accent hover:text-accent/80 bg-accent/5 hover:bg-accent/10 px-4 py-2.5 rounded-xl transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" /> E-ticket
                  </a>
                )}
                {!seg.boarding_pass_url && !seg.eticket_url && (
                  <p className="text-xs text-muted-foreground/50 italic">Documentos de embarque serão disponibilizados em breve</p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function DetailItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-muted-foreground/50 mt-0.5">{icon}</span>
      <div>
        <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">{label}</p>
        <p className="text-sm font-medium text-foreground mt-0.5">{value}</p>
      </div>
    </div>
  );
}
