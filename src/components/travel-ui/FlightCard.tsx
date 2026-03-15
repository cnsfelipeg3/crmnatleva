import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plane, ChevronDown, Download, Clock, MapPin, Armchair, Luggage, Info, ExternalLink, AlertTriangle } from "lucide-react";
import AirlineLogo from "@/components/AirlineLogo";
import { iataToLabel } from "@/lib/iataUtils";

const fmtDate = (d: string | null) => {
  if (!d) return "";
  const date = new Date(d + "T00:00:00");
  return date.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
};

const fmtDuration = (mins: number | undefined) => {
  if (!mins) return "";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h${m > 0 ? `${m}min` : ""}`;
};

interface FlightCardProps {
  segment: {
    id?: string;
    airline?: string;
    airline_name?: string;
    flight_number?: string;
    origin_iata: string;
    destination_iata: string;
    departure_date?: string;
    departure_time?: string;
    arrival_time?: string;
    arrival_date?: string;
    direction?: string;
    flight_class?: string;
    terminal?: string;
    arrival_terminal?: string;
    duration_minutes?: number;
    cabin_type?: string;
    operated_by?: string;
    operated_by_name?: string;
    seat_info?: string;
    connection_time_minutes?: number;
    boarding_pass_url?: string;
    eticket_url?: string;
    baggage_allowance?: string;
    aircraft_type?: string;
    meal_info?: string;
    booking_ref?: string;
    checkin_url?: string;
    status?: string;
  };
  index?: number;
}

export default function FlightCard({ segment: seg, index = 0 }: FlightCardProps) {
  const [open, setOpen] = useState(false);

  const dirLabel = seg.direction === "ida" ? "Ida" : seg.direction === "volta" ? "Volta" : seg.direction || "";

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
                {seg.airline_name ? `${seg.airline_name} · ${dirLabel}` : dirLabel}
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
            {seg.terminal && (
              <p className="text-[10px] text-muted-foreground/70 mt-0.5">Terminal {seg.terminal}</p>
            )}
            <div className="flex items-center gap-2 mt-2">
              {seg.departure_date && <span className="text-xs text-muted-foreground">{fmtDate(seg.departure_date)}</span>}
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
              <span className="text-[10px] text-muted-foreground">{fmtDuration(seg.duration_minutes)}</span>
            )}
          </div>

          <div className="flex-1 text-right">
            <p className="text-2xl sm:text-3xl font-bold text-foreground tracking-tighter font-mono">{seg.destination_iata}</p>
            <p className="text-xs text-muted-foreground mt-1">{iataToLabel(seg.destination_iata)}</p>
            {seg.arrival_terminal && (
              <p className="text-[10px] text-muted-foreground/70 mt-0.5">Terminal {seg.arrival_terminal}</p>
            )}
            <div className="flex items-center gap-2 mt-2 justify-end">
              {seg.arrival_date && seg.arrival_date !== seg.departure_date && (
                <span className="text-xs text-muted-foreground">{fmtDate(seg.arrival_date)}</span>
              )}
              {seg.arrival_time && <span className="text-sm font-bold text-foreground font-mono">{seg.arrival_time?.slice(0, 5)}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Expanded details */}
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
            <div className="px-5 sm:px-6 pb-5 sm:pb-6 border-t border-border/30">
              {/* Connection warning */}
              {seg.connection_time_minutes && seg.connection_time_minutes > 0 && (
                <div className={`flex items-center gap-2 mt-4 px-3 py-2 rounded-lg text-xs ${
                  seg.connection_time_minutes < 90
                    ? "bg-destructive/5 text-destructive"
                    : "bg-muted/50 text-muted-foreground"
                }`}>
                  {seg.connection_time_minutes < 90 && <AlertTriangle className="h-3.5 w-3.5" />}
                  <Clock className="h-3.5 w-3.5" />
                  <span>Conexão de {fmtDuration(seg.connection_time_minutes)} antes deste voo</span>
                </div>
              )}

              {/* Detail grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4 mt-4">
                <DetailItem label="Companhia" value={seg.airline_name || seg.airline || ""} />
                <DetailItem label="Voo" value={seg.flight_number || ""} />
                <DetailItem label="Data" value={fmtDate(seg.departure_date || null)} />
                <DetailItem label="Partida" value={`${seg.departure_time?.slice(0, 5) || ""} ${seg.terminal ? `· Terminal ${seg.terminal}` : ""}`} />
                <DetailItem label="Chegada" value={`${seg.arrival_time?.slice(0, 5) || ""} ${seg.arrival_terminal ? `· Terminal ${seg.arrival_terminal}` : ""}`} />
                <DetailItem label="Duração" value={fmtDuration(seg.duration_minutes)} />
                {seg.flight_class && <DetailItem label="Classe" value={seg.flight_class} />}
                {seg.cabin_type && <DetailItem label="Cabine" value={seg.cabin_type} />}
                {seg.seat_info && <DetailItem label="Assento" value={seg.seat_info} />}
                {seg.aircraft_type && <DetailItem label="Aeronave" value={seg.aircraft_type} />}
                {seg.baggage_allowance && <DetailItem label="Bagagem" value={seg.baggage_allowance} />}
                {seg.meal_info && <DetailItem label="Refeição" value={seg.meal_info} />}
                {seg.booking_ref && <DetailItem label="Localizador" value={seg.booking_ref} />}
                {seg.operated_by && seg.operated_by !== seg.airline && (
                  <DetailItem label="Operado por" value={seg.operated_by_name || seg.operated_by} />
                )}
                {seg.status && <DetailItem label="Status" value={seg.status} />}
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-border/20">
                {seg.boarding_pass_url && (
                  <ActionLink href={seg.boarding_pass_url} icon={<Download className="h-3.5 w-3.5" />} label="Cartão de embarque" />
                )}
                {seg.eticket_url && (
                  <ActionLink href={seg.eticket_url} icon={<Download className="h-3.5 w-3.5" />} label="E-ticket" />
                )}
                {seg.checkin_url && (
                  <ActionLink href={seg.checkin_url} icon={<ExternalLink className="h-3.5 w-3.5" />} label="Fazer check-in online" />
                )}
                {!seg.boarding_pass_url && !seg.eticket_url && !seg.checkin_url && (
                  <p className="text-xs text-muted-foreground/40 italic flex items-center gap-1.5">
                    <Info className="h-3.5 w-3.5" />
                    Documentos de embarque serão disponibilizados em breve
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-[10px] text-muted-foreground/50 uppercase tracking-[0.15em] mb-0.5">{label}</p>
      <p className="text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function ActionLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 text-xs font-semibold text-accent hover:text-accent/80 bg-accent/5 hover:bg-accent/10 px-4 py-2.5 rounded-xl transition-colors"
    >
      {icon} {label}
    </a>
  );
}
