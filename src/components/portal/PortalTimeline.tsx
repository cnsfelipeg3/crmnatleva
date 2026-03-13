import { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { iataToLabel, iataToCityName } from "@/lib/iataUtils";
import AirlineLogo from "@/components/AirlineLogo";
import {
  Plane, Hotel, Car, Ticket, Clock, ChevronDown, ChevronUp,
  Calendar, Star, Utensils, MapPin, Navigation, Luggage, Coffee,
  Sunrise, Sunset, Moon, Sun, Copy, Check, ArrowRight, Sparkles,
  Shield, Wifi, UtensilsCrossed, Bath,
} from "lucide-react";

/* ═══ TYPES ═══ */
interface TimelineItem {
  id: string;
  type: "flight" | "hotel-checkin" | "hotel-checkout" | "service" | "transfer" | "experience";
  date: string;
  time?: string;
  title: string;
  subtitle?: string;
  details: Record<string, string>;
  icon: typeof Plane;
  color: string;
  bgGradient: string;
  raw?: any;
}

interface PortalTimelineProps {
  segments: any[];
  hotels: any[];
  lodging: any[];
  services: any[];
  sale: any;
}

/* ═══ HELPERS ═══ */
const fmtDateFull = (d: string) =>
  new Date(d + "T00:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });

const fmtDateShort = (d: string) => {
  const date = new Date(d + "T00:00:00");
  return { day: date.getDate(), month: date.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "") };
};

function getTimeIcon(time?: string) {
  if (!time) return Sun;
  const h = parseInt(time.split(":")[0] || "12");
  if (h < 6) return Moon;
  if (h < 12) return Sunrise;
  if (h < 18) return Sun;
  return Sunset;
}

function getTimeLabel(time?: string) {
  if (!time) return "";
  const h = parseInt(time.split(":")[0] || "12");
  if (h < 6) return "Madrugada";
  if (h < 12) return "Manhã";
  if (h < 18) return "Tarde";
  return "Noite";
}

function getDaysBetween(d1: string, d2: string): number {
  const a = new Date(d1 + "T00:00:00");
  const b = new Date(d2 + "T00:00:00");
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

/* ═══ COPYABLE CODE ═══ */
function CopyableCode({ code, label }: { code: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="flex items-center gap-1.5 bg-muted/60 rounded-lg px-2.5 py-1.5 text-xs hover:bg-muted transition-colors group">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono font-semibold text-foreground">{code}</span>
      {copied ? <Check className="h-3 w-3 text-accent" /> : <Copy className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />}
    </button>
  );
}

/* ═══ DAY HEADER ═══ */
function DayHeader({ date, label, isToday, isPast, dayNumber, itemCount }: {
  date: string; label: string; isToday: boolean; isPast: boolean; dayNumber: number; itemCount: number;
}) {
  const { day, month } = date !== "outros" ? fmtDateShort(date) : { day: 0, month: "" };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`sticky top-0 z-10 flex items-center gap-4 py-4 ${isPast ? "opacity-70" : ""}`}
    >
      {date !== "outros" ? (
        <div className={`relative flex-shrink-0 w-14 h-14 rounded-2xl flex flex-col items-center justify-center ${
          isToday
            ? "bg-accent text-accent-foreground shadow-lg shadow-accent/20"
            : isPast
              ? "bg-muted/80 text-muted-foreground"
              : "bg-card border border-border text-foreground"
        }`}>
          <span className="text-lg font-bold leading-none">{day}</span>
          <span className="text-[10px] uppercase font-semibold tracking-wider leading-none mt-0.5">{month}</span>
          {isToday && (
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-accent animate-pulse ring-2 ring-background" />
          )}
        </div>
      ) : (
        <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-muted/50 border border-dashed border-border flex items-center justify-center">
          <Sparkles className="h-5 w-5 text-muted-foreground" />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className={`text-sm font-semibold capitalize ${isToday ? "text-accent" : "text-foreground"}`}>
            {isToday ? "Hoje" : label}
          </h3>
          {dayNumber > 0 && (
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-border/50 text-muted-foreground font-medium">
              Dia {dayNumber}
            </Badge>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {itemCount} {itemCount === 1 ? "evento" : "eventos"} programados
        </p>
      </div>
    </motion.div>
  );
}

/* ═══ FLIGHT CARD (IMMERSIVE) ═══ */
function FlightTimelineCard({ item, expanded, onToggle, isPast }: {
  item: TimelineItem; expanded: boolean; onToggle: () => void; isPast: boolean;
}) {
  const seg = item.raw;
  const TimeIcon = getTimeIcon(item.time);
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: -20 }}
      animate={isInView ? { opacity: isPast ? 0.5 : 1, x: 0 } : {}}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="relative"
    >
      {/* Timeline dot */}
      <div className="absolute -left-[31px] top-6 z-10">
        <div className="w-5 h-5 rounded-full bg-accent flex items-center justify-center ring-4 ring-background shadow-lg shadow-accent/20">
          <Plane className="h-2.5 w-2.5 text-accent-foreground" />
        </div>
      </div>

      <div
        className={`rounded-2xl border overflow-hidden transition-all cursor-pointer group ${
          expanded
            ? "bg-card border-accent/30 shadow-xl shadow-accent/5"
            : "bg-card/60 border-border/40 hover:border-accent/20 hover:shadow-lg hover:shadow-accent/5"
        }`}
        onClick={onToggle}
      >
        {/* Flight Visual Header */}
        <div className="relative bg-gradient-to-r from-accent/10 via-accent/5 to-transparent p-4 pb-3">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              {seg?.airline && <AirlineLogo iata={seg.airline} size={28} />}
              <div>
                <p className="text-[11px] font-semibold text-foreground/70">{seg?.airline} {seg?.flight_number}</p>
                <p className="text-[10px] text-muted-foreground">{seg?.flight_class || "Econômica"}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <TimeIcon className="h-3.5 w-3.5" />
              <span className="text-[10px]">{getTimeLabel(item.time)}</span>
            </div>
          </div>

          {/* Route visualization */}
          <div className="flex items-center gap-0 w-full">
            <div className="text-center flex-shrink-0 w-16">
              <p className="text-2xl font-black font-mono text-foreground tracking-tight leading-none">{seg?.origin_iata}</p>
              <p className="text-[10px] text-muted-foreground mt-1 leading-tight truncate">{iataToCityName(seg?.origin_iata)}</p>
              {item.time && <p className="text-sm font-bold text-foreground mt-1">{item.time}</p>}
            </div>

            <div className="flex-1 relative mx-2">
              <div className="flex items-center justify-center">
                <div className="flex-1 h-[2px] bg-gradient-to-r from-accent/60 to-accent/30 rounded-full" />
                <div className="mx-1.5 p-1 rounded-full bg-accent/10">
                  <Plane className="h-3.5 w-3.5 text-accent rotate-0" />
                </div>
                <div className="flex-1 h-[2px] bg-gradient-to-r from-accent/30 to-accent/60 rounded-full" />
              </div>
              {seg?.duration_minutes > 0 && (
                <p className="text-center text-[10px] text-muted-foreground mt-1">
                  {Math.floor(seg.duration_minutes / 60)}h{seg.duration_minutes % 60 > 0 ? `${seg.duration_minutes % 60}min` : ""}
                </p>
              )}
            </div>

            <div className="text-center flex-shrink-0 w-16">
              <p className="text-2xl font-black font-mono text-foreground tracking-tight leading-none">{seg?.destination_iata}</p>
              <p className="text-[10px] text-muted-foreground mt-1 leading-tight truncate">{iataToCityName(seg?.destination_iata)}</p>
              {seg?.arrival_time && <p className="text-sm font-bold text-foreground mt-1">{seg.arrival_time}</p>}
            </div>
          </div>
        </div>

        {/* Quick Info Bar */}
        <div className="flex items-center gap-2 px-4 py-2 border-t border-border/30 overflow-x-auto">
          {seg?.direction && (
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 flex-shrink-0">
              {seg.direction === "ida" ? "✈ Ida" : "✈ Volta"}
            </Badge>
          )}
          {seg?.terminal && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1 flex-shrink-0">
              <Navigation className="h-3 w-3" /> Terminal {seg.terminal}
            </span>
          )}
          {seg?.operated_by && seg.operated_by !== seg.airline && (
            <span className="text-[10px] text-muted-foreground flex-shrink-0">Op. {seg.operated_by}</span>
          )}
          <div className="ml-auto flex-shrink-0">
            {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />}
          </div>
        </div>

        {/* Expanded details */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 pt-1 border-t border-border/20 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(item.details).map(([key, val]) => (
                    <div key={key} className="bg-muted/30 rounded-xl px-3 py-2.5">
                      <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-medium">{key}</p>
                      <p className="text-sm font-semibold text-foreground mt-0.5">{val}</p>
                    </div>
                  ))}
                </div>
                {(seg?.reservation_code || seg?.locator) && (
                  <CopyableCode code={seg.reservation_code || seg.locator} label="Localizador" />
                )}
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground pt-1">
                  <span className="flex items-center gap-1"><Luggage className="h-3 w-3" /> Bagagem incluída</span>
                  <span className="flex items-center gap-1"><Wifi className="h-3 w-3" /> Wi-Fi a bordo</span>
                  <span className="flex items-center gap-1"><UtensilsCrossed className="h-3 w-3" /> Refeição</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/* ═══ HOTEL CARD (IMMERSIVE) ═══ */
function HotelTimelineCard({ item, expanded, onToggle, isPast }: {
  item: TimelineItem; expanded: boolean; onToggle: () => void; isPast: boolean;
}) {
  const hotel = item.raw;
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const isCheckout = item.type === "hotel-checkout";

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: -20 }}
      animate={isInView ? { opacity: isPast ? 0.5 : 1, x: 0 } : {}}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="relative"
    >
      <div className="absolute -left-[31px] top-6 z-10">
        <div className={`w-5 h-5 rounded-full flex items-center justify-center ring-4 ring-background shadow-lg ${
          isCheckout ? "bg-amber-400 shadow-amber-400/20" : "bg-amber-500 shadow-amber-500/20"
        }`}>
          <Hotel className="h-2.5 w-2.5 text-white" />
        </div>
      </div>

      <div
        className={`rounded-2xl border overflow-hidden transition-all cursor-pointer group ${
          expanded
            ? "bg-card border-amber-500/30 shadow-xl shadow-amber-500/5"
            : "bg-card/60 border-border/40 hover:border-amber-500/20 hover:shadow-lg"
        }`}
        onClick={onToggle}
      >
        <div className={`relative p-4 ${isCheckout ? "bg-gradient-to-r from-amber-400/10 to-transparent" : "bg-gradient-to-r from-amber-500/10 to-transparent"}`}>
          <div className="flex items-start gap-3">
            {/* Hotel icon visual */}
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
              isCheckout ? "bg-amber-400/15" : "bg-amber-500/15"
            }`}>
              {isCheckout ? <Sunset className="h-6 w-6 text-amber-400" /> : <Sunrise className="h-6 w-6 text-amber-500" />}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${isCheckout ? "border-amber-400/30 text-amber-400" : "border-amber-500/30 text-amber-500"}`}>
                  {isCheckout ? "Check-out" : "Check-in"}
                </Badge>
                {item.time && <span className="text-[10px] text-muted-foreground">{item.time}</span>}
              </div>
              <p className="text-sm font-bold text-foreground mt-1 truncate">{hotel?.hotel_name || hotel?.description || "Hotel"}</p>
              {hotel?.city && (
                <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3 w-3" /> {hotel.city}
                </p>
              )}
            </div>

            <div className="flex-shrink-0">
              {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />}
            </div>
          </div>
        </div>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 pt-1 border-t border-border/20 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(item.details).map(([key, val]) => (
                    <div key={key} className="bg-muted/30 rounded-xl px-3 py-2.5">
                      <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-medium">{key}</p>
                      <p className="text-sm font-semibold text-foreground mt-0.5">{val}</p>
                    </div>
                  ))}
                </div>
                {(hotel?.reservation_code || hotel?.hotel_reservation_code) && (
                  <CopyableCode code={hotel.reservation_code || hotel.hotel_reservation_code} label="Reserva" />
                )}
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground pt-1">
                  <span className="flex items-center gap-1"><Wifi className="h-3 w-3" /> Wi-Fi</span>
                  <span className="flex items-center gap-1"><Coffee className="h-3 w-3" /> Café da manhã</span>
                  <span className="flex items-center gap-1"><Bath className="h-3 w-3" /> Amenidades</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/* ═══ SERVICE / EXPERIENCE CARD ═══ */
function ServiceTimelineCard({ item, expanded, onToggle, isPast }: {
  item: TimelineItem; expanded: boolean; onToggle: () => void; isPast: boolean;
}) {
  const service = item.raw;
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const isTransfer = item.type === "transfer";
  const ItemIcon = item.icon;
  const accentColor = isTransfer ? "emerald" : "blue";

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: -20 }}
      animate={isInView ? { opacity: isPast ? 0.5 : 1, x: 0 } : {}}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="relative"
    >
      <div className="absolute -left-[31px] top-6 z-10">
        <div className={`w-5 h-5 rounded-full flex items-center justify-center ring-4 ring-background shadow-lg ${
          isTransfer ? "bg-emerald-500 shadow-emerald-500/20" : "bg-blue-500 shadow-blue-500/20"
        }`}>
          <ItemIcon className="h-2.5 w-2.5 text-white" />
        </div>
      </div>

      <div
        className={`rounded-2xl border overflow-hidden transition-all cursor-pointer group ${
          expanded
            ? `bg-card border-${accentColor}-500/30 shadow-xl`
            : "bg-card/60 border-border/40 hover:shadow-lg"
        }`}
        onClick={onToggle}
      >
        <div className={`p-4 bg-gradient-to-r ${isTransfer ? "from-emerald-500/10" : "from-blue-500/10"} to-transparent`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
              isTransfer ? "bg-emerald-500/15" : "bg-blue-500/15"
            }`}>
              <ItemIcon className={`h-5 w-5 ${isTransfer ? "text-emerald-500" : "text-blue-500"}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground truncate">{item.title}</p>
              {item.subtitle && <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{item.subtitle}</p>}
            </div>
            {item.time && (
              <span className="text-xs text-muted-foreground flex items-center gap-1 flex-shrink-0">
                <Clock className="h-3 w-3" /> {item.time}
              </span>
            )}
            <div className="flex-shrink-0">
              {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />}
            </div>
          </div>
        </div>

        <AnimatePresence>
          {expanded && Object.keys(item.details).length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 pt-1 border-t border-border/20">
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(item.details).map(([key, val]) => (
                    <div key={key} className="bg-muted/30 rounded-xl px-3 py-2.5">
                      <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-medium">{key}</p>
                      <p className="text-sm font-semibold text-foreground mt-0.5">{val}</p>
                    </div>
                  ))}
                </div>
                {service?.reservation_code && (
                  <div className="mt-2">
                    <CopyableCode code={service.reservation_code} label="Código" />
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/* ═══ PROGRESS INDICATOR ═══ */
function TimelineProgress({ groups, today }: { groups: { date: string }[]; today: string }) {
  const datedGroups = groups.filter(g => g.date !== "outros");
  if (datedGroups.length < 2) return null;

  const firstDate = datedGroups[0].date;
  const lastDate = datedGroups[datedGroups.length - 1].date;
  const totalDays = getDaysBetween(firstDate, lastDate) || 1;
  const elapsed = Math.max(0, Math.min(totalDays, getDaysBetween(firstDate, today)));
  const pct = Math.round((elapsed / totalDays) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 rounded-2xl bg-card border border-border/40 p-4"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-foreground">Progresso da Viagem</span>
        <span className="text-xs text-accent font-bold">{pct}%</span>
      </div>
      <div className="relative h-2 bg-muted/60 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-accent to-accent/70 rounded-full"
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-accent border-2 border-background shadow-lg shadow-accent/30 transition-all"
          style={{ left: `calc(${pct}% - 7px)` }}
        />
      </div>
      <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
        <span>Dia 1</span>
        <span>Dia {totalDays + 1}</span>
      </div>
    </motion.div>
  );
}

/* ═══ MAIN COMPONENT ═══ */
export default function PortalTimeline({ segments, hotels, lodging, services, sale }: PortalTimelineProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const items = useMemo(() => {
    const list: TimelineItem[] = [];

    (segments || []).forEach((seg: any, i: number) => {
      list.push({
        id: `flight-${i}`, type: "flight", date: seg.departure_date || "", time: seg.departure_time,
        title: `${iataToLabel(seg.origin_iata)} → ${iataToLabel(seg.destination_iata)}`,
        subtitle: [seg.airline, seg.flight_number, seg.flight_class].filter(Boolean).join(" · "),
        details: {
          ...(seg.departure_time ? { "Embarque": seg.departure_time } : {}),
          ...(seg.arrival_time ? { "Chegada": seg.arrival_time } : {}),
          ...(seg.terminal ? { "Terminal": seg.terminal } : {}),
          ...(seg.flight_class ? { "Classe": seg.flight_class } : {}),
          ...(seg.direction ? { "Trecho": seg.direction === "ida" ? "Ida" : "Volta" } : {}),
        },
        icon: Plane, color: "bg-accent text-accent-foreground",
        bgGradient: "from-accent/10 to-transparent", raw: seg,
      });
    });

    const allHotels = [...(hotels || []), ...(lodging || [])];
    allHotels.forEach((h: any, i: number) => {
      const checkinDate = h.hotel_checkin_datetime_utc?.split("T")[0] || h.checkin_date;
      const checkoutDate = h.hotel_checkout_datetime_utc?.split("T")[0] || h.checkout_date;
      const name = h.hotel_name || h.description || "Hotel";

      if (checkinDate) {
        list.push({
          id: `hotel-in-${i}`, type: "hotel-checkin", date: checkinDate, time: "14:00",
          title: `Check-in · ${name}`,
          subtitle: h.reservation_code || h.hotel_reservation_code ? `Reserva: ${h.reservation_code || h.hotel_reservation_code}` : undefined,
          details: {
            ...(h.notes ? { "Notas": h.notes } : {}),
            ...(h.reservation_code || h.hotel_reservation_code ? { "Reserva": h.reservation_code || h.hotel_reservation_code } : {}),
            ...(checkoutDate ? { "Saída": fmtDateFull(checkoutDate) } : {}),
          },
          icon: Hotel, color: "bg-amber-500 text-white", bgGradient: "from-amber-500/10 to-transparent", raw: h,
        });
      }

      if (checkoutDate) {
        list.push({
          id: `hotel-out-${i}`, type: "hotel-checkout", date: checkoutDate, time: "12:00",
          title: `Check-out · ${name}`,
          subtitle: undefined,
          details: {},
          icon: Hotel, color: "bg-amber-400 text-white", bgGradient: "from-amber-400/10 to-transparent", raw: h,
        });
      }
    });

    (services || []).forEach((s: any, i: number) => {
      const cat = (s.product_type || s.category || "").toLowerCase();
      const isTransfer = cat.includes("transfer");
      const isFood = cat.includes("gastro") || cat.includes("culin");
      list.push({
        id: `service-${i}`, type: isTransfer ? "transfer" : "service", date: "",
        title: s.description || s.category || "Serviço",
        subtitle: s.reservation_code ? `Código: ${s.reservation_code}` : undefined,
        details: {
          ...(s.product_type ? { "Tipo": s.product_type } : {}),
          ...(s.reservation_code ? { "Código": s.reservation_code } : {}),
        },
        icon: isTransfer ? Car : isFood ? Utensils : Ticket,
        color: isTransfer ? "bg-emerald-500 text-white" : "bg-blue-500 text-white",
        bgGradient: isTransfer ? "from-emerald-500/10 to-transparent" : "from-blue-500/10 to-transparent",
        raw: s,
      });
    });

    list.sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      const cmp = a.date.localeCompare(b.date);
      if (cmp !== 0) return cmp;
      return (a.time || "").localeCompare(b.time || "");
    });

    return list;
  }, [segments, hotels, lodging, services]);

  const grouped = useMemo(() => {
    const groups: { date: string; label: string; items: TimelineItem[] }[] = [];
    let current = "";
    items.forEach(item => {
      const d = item.date || "outros";
      if (d !== current) {
        current = d;
        groups.push({ date: d, label: d !== "outros" ? fmtDateFull(d) : "Serviços sem data", items: [item] });
      } else {
        groups[groups.length - 1].items.push(item);
      }
    });
    return groups;
  }, [items]);

  const today = new Date().toISOString().split("T")[0];
  const firstDate = grouped.find(g => g.date !== "outros")?.date;

  return (
    <div className="space-y-2">
      {/* Progress bar */}
      <TimelineProgress groups={grouped} today={today} />

      {/* Timeline */}
      {grouped.map((group, gi) => {
        const isPast = group.date !== "outros" && group.date < today;
        const isToday = group.date === today;
        const dayNumber = firstDate && group.date !== "outros" ? getDaysBetween(firstDate, group.date) + 1 : 0;

        return (
          <div key={group.date} className="relative">
            <DayHeader
              date={group.date} label={group.label} isToday={isToday} isPast={isPast}
              dayNumber={dayNumber} itemCount={group.items.length}
            />

            <div className="relative ml-6 border-l-2 border-border/30 pl-6 space-y-4 pb-4">
              {/* Gradient glow for today */}
              {isToday && (
                <div className="absolute -left-[1px] top-0 bottom-0 w-[2px] bg-gradient-to-b from-accent via-accent/50 to-accent/10" />
              )}

              {group.items.map((item) => {
                const expanded = expandedId === item.id;
                const toggle = () => setExpandedId(expanded ? null : item.id);

                if (item.type === "flight") {
                  return <FlightTimelineCard key={item.id} item={item} expanded={expanded} onToggle={toggle} isPast={isPast} />;
                }
                if (item.type === "hotel-checkin" || item.type === "hotel-checkout") {
                  return <HotelTimelineCard key={item.id} item={item} expanded={expanded} onToggle={toggle} isPast={isPast} />;
                }
                return <ServiceTimelineCard key={item.id} item={item} expanded={expanded} onToggle={toggle} isPast={isPast} />;
              })}
            </div>
          </div>
        );
      })}

      {items.length === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-muted/60 flex items-center justify-center mx-auto mb-4">
            <Calendar className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">Nenhum evento na timeline ainda</p>
        </motion.div>
      )}
    </div>
  );
}
