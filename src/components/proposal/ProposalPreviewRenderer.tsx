import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plane, MapPin, Hotel, Sparkles, Star, CheckCircle, ChevronDown,
  Clock, Luggage, Users, Wifi, Coffee, UtensilsCrossed, Waves,
  Car, Camera, ChevronRight, Calendar, Globe, Shield,
  BedDouble, Bath, Mountain, X, Briefcase,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import logoNatleva from "@/assets/logo-natleva-clean.png";
import { calcLayoverMinutes as calcPreciseLayoverMinutes } from "@/lib/flightTiming";
import { assignDirections, classifyItinerary } from "@/lib/itineraryClassifier";
import { buildFlightTitle } from "@/lib/airportCities";

const fallbackCover = "https://images.unsplash.com/photo-1488085061387-422e29b40080?w=1920&h=1080&fit=crop&q=80";

/** Format hotel check-in/out dates (accepts ISO YYYY-MM-DD or BR dd/mm/yyyy) into "dd 'de' MMM" pt-BR. */
function formatHotelDateBR(raw: any): string {
  if (!raw) return "";
  const s = String(raw).trim();
  // dd/mm/yyyy
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{2,4})$/);
  let date: Date | null = null;
  if (br) {
    const yyyy = br[3].length === 2 ? `20${br[3]}` : br[3];
    date = new Date(`${yyyy}-${br[2]}-${br[1]}T12:00:00`);
  } else {
    // ISO or other parseable
    const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) date = new Date(`${iso[1]}-${iso[2]}-${iso[3]}T12:00:00`);
    else {
      const tryParse = new Date(s);
      if (!isNaN(tryParse.getTime())) date = tryParse;
    }
  }
  if (!date || isNaN(date.getTime())) return s;
  try { return format(date, "dd 'de' MMM", { locale: ptBR }); } catch { return s; }
}

const destinationImages: Record<string, string> = {
  roma: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800&h=600&fit=crop&q=80",
  florença: "https://images.unsplash.com/photo-1543429776-2782fc8e117a?w=800&h=600&fit=crop&q=80",
  veneza: "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=800&h=600&fit=crop&q=80",
  paris: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&h=600&fit=crop&q=80",
  londres: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&h=600&fit=crop&q=80",
  dubai: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&h=600&fit=crop&q=80",
  miami: "https://images.unsplash.com/photo-1533106497176-45ae19e68ba2?w=800&h=600&fit=crop&q=80",
  orlando: "https://images.unsplash.com/photo-1575089976121-8ed7b2a54265?w=800&h=600&fit=crop&q=80",
};

function getDestImage(name: string, fallback?: string) {
  const key = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return destinationImages[key] || fallback || fallbackCover;
}

function fmtCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function parseLocalDate(d: string): Date | null {
  if (!d) return null;
  // Handle dd/MM/yyyy format
  const brMatch = d.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (brMatch) {
    return new Date(Number(brMatch[3]), Number(brMatch[2]) - 1, Number(brMatch[1]));
  }
  // Handle yyyy-MM-dd format
  const isoMatch = d.split("T")[0].match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    return new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
  }
  const fallback = new Date(d);
  return isNaN(fallback.getTime()) ? null : fallback;
}

function fmtDate(d: string) {
  const date = parseLocalDate(d);
  if (!date) return d || "—";
  return format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
}

/* ═══ Section Title ═══ */
function SectionTitle({ children, subtitle }: { children: React.ReactNode; subtitle?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
      <div className="flex items-center justify-center gap-4 mb-3">
        <div className="h-px w-12 bg-gradient-to-r from-transparent to-accent/40" />
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          {children}
        </h2>
        <div className="h-px w-12 bg-gradient-to-l from-transparent to-accent/40" />
      </div>
      {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
    </motion.div>
  );
}

/* ═══ Expandable Card ═══ */
function ExpandableCard({ children, expandedContent, defaultExpanded = false }: { children: React.ReactNode; expandedContent: React.ReactNode; defaultExpanded?: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  return (
    <div
      className="rounded-2xl overflow-hidden border border-border/30 bg-card transition-all duration-300 hover:shadow-xl hover:shadow-accent/5 cursor-pointer group/card"
      onClick={() => setExpanded(!expanded)}
    >
      {children}
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }} className="overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {expandedContent}
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex items-center justify-center py-2 text-accent/40 group-hover/card:text-accent/60 transition-colors">
        <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.25 }}>
          <ChevronDown className="w-4 h-4" />
        </motion.div>
      </div>
    </div>
  );
}

/* ═══ Photo Gallery (hero + thumbnails) ═══ */
function PhotoGallery({ photos, name }: { photos: string[]; name: string }) {
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  if (photos.length === 0) return null;
  const go = (dir: 1 | -1) => setActive((i) => (i + dir + photos.length) % photos.length);
  return (
    <>
      <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
        {/* Hero */}
        <div className="relative aspect-[16/10] sm:aspect-[16/9] rounded-xl overflow-hidden bg-muted group/hero">
          <AnimatePresence mode="wait">
            <motion.img
              key={active}
              src={photos[active]}
              alt={`${name} - ${active + 1}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="absolute inset-0 w-full h-full object-cover cursor-zoom-in"
              onClick={() => setLightbox(true)}
            />
          </AnimatePresence>
          {photos.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); go(-1); }}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm text-white flex items-center justify-center opacity-0 group-hover/hero:opacity-100 transition-opacity"
                aria-label="Foto anterior"
              >
                <ChevronRight className="w-4 h-4 rotate-180" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); go(1); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm text-white flex items-center justify-center opacity-0 group-hover/hero:opacity-100 transition-opacity"
                aria-label="Próxima foto"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-sm text-white text-[11px] font-medium flex items-center gap-1.5">
                <Camera className="w-3 h-3" /> {active + 1} / {photos.length}
              </div>
            </>
          )}
        </div>
        {/* Thumbnails */}
        {photos.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            {photos.map((url, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); setActive(i); }}
                className={`relative flex-shrink-0 w-20 h-14 sm:w-24 sm:h-16 rounded-md overflow-hidden transition-all ${
                  i === active ? "ring-2 ring-accent ring-offset-1 ring-offset-background" : "opacity-60 hover:opacity-100"
                }`}
                aria-label={`Foto ${i + 1}`}
              >
                <img src={url} alt={`${name} miniatura ${i + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
      <AnimatePresence>
        {lightbox && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center" onClick={() => setLightbox(false)}>
            <button className="absolute top-6 right-6 text-white/60 hover:text-white z-10" onClick={() => setLightbox(false)}><X className="w-6 h-6" /></button>
            <motion.img key={active} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} src={photos[active]} alt="" className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg" />
            {photos.length > 1 && (
              <>
                <button className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20" onClick={(e) => { e.stopPropagation(); go(-1); }}><ChevronRight className="w-5 h-5 rotate-180" /></button>
                <button className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20" onClick={(e) => { e.stopPropagation(); go(1); }}><ChevronRight className="w-5 h-5" /></button>
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/50 text-sm">{active + 1} / {photos.length}</div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}


/* ═══ Detail Pill ═══ */
function DetailPill({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl bg-accent/5 border border-accent/10 px-3 py-2.5">
      <span className="text-accent">{icon}</span>
      <div className="min-w-0">
        <p className="text-[9px] uppercase tracking-wider text-muted-foreground/50 font-medium">{label}</p>
        <p className="text-xs font-medium text-foreground truncate">{value}</p>
      </div>
    </div>
  );
}

/* ═══ Normalize flight data ═══ */
function normalizeFlightData(data: any) {
  const segs = data?.flight_segments;
  if (segs && Array.isArray(segs) && segs.length > 0) {
    const first = segs[0];
    const last = segs[segs.length - 1];
    const totalMin = segs.reduce((sum: number, s: any) => sum + (s.duration_minutes || 0), 0);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    const duration = totalMin > 0 ? (h > 0 ? `${h}h${m > 0 ? `${m}min` : ""}` : `${m}min`) : "";
    return {
      origin: first.origin_iata || "", destination: last.destination_iata || "",
      airline: first.airline_name || first.airline || "", airline_name: first.airline_name || first.airline || "",
      flight_number: `${first.airline || ""}${first.flight_number || ""}`,
      departure_time: first.departure_time || "", arrival_time: last.arrival_time || "",
      terminal: first.terminal || "", arrival_terminal: last.arrival_terminal || "",
      duration, departure: first.departure_date || "",
      cabin: data.cabin || "", baggage: data.baggage || "", seat: data.seat || "",
      stops: segs.length - 1,
      notes: segs.map((s: any) => s.notes).filter(Boolean).join(". "),
      segments: segs,
    };
  }
  return {
    origin: data?.origin || data?.origin_iata || "", destination: data?.destination || data?.destination_iata || "",
    airline: data?.airline || data?.airline_name || "", airline_name: data?.airline_name || data?.airline || "",
    flight_number: data?.flight_number || "",
    departure_time: data?.departure_time || "", arrival_time: data?.arrival_time || "",
    terminal: data?.terminal || "", arrival_terminal: data?.arrival_terminal || "",
    duration: data?.duration || "", departure: data?.departure || data?.departure_date || "",
    cabin: data?.cabin || "", baggage: data?.baggage || "", seat: data?.seat || "",
    stops: data?.stops ?? 0, notes: data?.notes || "", segments: [],
  };
}

/* ═══ Airline Logo (inline, no tooltip dependency) ═══ */
function InlineAirlineLogo({ iata, size = 36 }: { iata: string; size?: number }) {
  const [error, setError] = useState(false);
  if (!iata) return null;
  const code = iata.toUpperCase().trim();
  const url = `https://pics.avs.io/${size * 2}/${size * 2}/${code}.png`;
  if (error) return (
    <span className="flex items-center justify-center bg-muted rounded-lg" style={{ width: size, height: size }}>
      <Plane className="text-muted-foreground" style={{ width: size * 0.5, height: size * 0.5 }} />
    </span>
  );
  return <img src={url} alt={code} width={size} height={size} className="object-contain rounded-lg" onError={() => setError(true)} loading="lazy" />;
}

/* ═══ Flight Duration Formatter ═══ */
function fmtDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m > 0 ? `${m}min` : ""}`.trim() : `${m}min`;
}

/* ═══ Boarding Pass Segment ═══ */
function BoardingPassSegment({ seg, showDate = true }: { seg: any; showDate?: boolean }) {
  const airlineCode = seg.airline || seg.airline_iata || "";
  const airlineName = seg.airline_name || seg.airline || "";
  const flightNum = `${airlineCode}${seg.flight_number || ""}`;
  const dur = seg.duration_minutes ? fmtDuration(seg.duration_minutes) : "";
  const depDate = seg.departure_date;

  return (
    <div className="rounded-2xl bg-card border border-border/40 p-5 sm:p-6 shadow-sm">
      {/* Top row: airline + flight number + date */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <InlineAirlineLogo iata={airlineCode} size={36} />
          <span className="font-bold text-foreground text-sm sm:text-base uppercase tracking-wide" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {airlineName}
          </span>
          {flightNum && (
            <span className="text-[11px] bg-muted text-muted-foreground font-mono px-2 py-0.5 rounded-md border border-border/50">
              {flightNum}
            </span>
          )}
        </div>
        {showDate && depDate && (
          <span className="text-sm text-muted-foreground">
            {(() => { try { return format(new Date(depDate.length <= 10 ? depDate + "T00:00:00" : depDate), "dd 'de' MMM. 'de' yyyy", { locale: ptBR }); } catch { return depDate; } })()}
          </span>
        )}
      </div>

      {/* Main route row */}
      <div className="flex items-center gap-4">
        {/* Departure */}
        <div className="text-left min-w-[70px]">
          <p className="text-2xl sm:text-3xl font-bold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {seg.departure_time || "—"}
          </p>
          <p className="text-lg sm:text-xl font-bold text-foreground mt-0.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {seg.origin_iata || "—"}
          </p>
          {seg.terminal && (
            <p className="text-[11px] text-muted-foreground/60 flex items-center gap-0.5 mt-0.5">
              <span className="font-mono">›_</span> T{seg.terminal}
            </p>
          )}
        </div>

        {/* Route line */}
        <div className="flex-1 flex flex-col items-center gap-1 py-2">
          <div className="w-full flex items-center">
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-muted-foreground/40 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M2 17h20M6 12l3-7 2 3h4l3 4H6z" />
            </svg>
            <div className="flex-1 relative mx-1">
              <div className="h-px bg-muted-foreground/25 w-full" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-muted-foreground/30" />
            </div>
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-muted-foreground/40 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M2 17h20M18 12l-3-7-2 3H9L6 12h12z" />
            </svg>
          </div>
          {dur && (
            <span className="text-[11px] text-muted-foreground/50 flex items-center gap-1">
              <Clock className="w-3 h-3" /> {dur}
            </span>
          )}
        </div>

        {/* Arrival */}
        <div className="text-right min-w-[70px]">
          <p className="text-2xl sm:text-3xl font-bold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {seg.arrival_time || "—"}
          </p>
          <p className="text-lg sm:text-xl font-bold text-foreground mt-0.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {seg.destination_iata || "—"}
          </p>
          {seg.arrival_terminal && (
            <p className="text-[11px] text-muted-foreground/60 flex items-center justify-end gap-0.5 mt-0.5">
              <span className="font-mono">›_</span> T{seg.arrival_terminal}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══ Connection Badge ═══ */
function ConnectionBadge({ fromIata, layoverMinutes }: { fromIata: string; layoverMinutes?: number }) {
  const dur = typeof layoverMinutes === "number" && layoverMinutes >= 0 ? fmtDuration(layoverMinutes) : "";
  return (
    <div className="flex justify-center -my-1.5 relative z-10">
      <span className="inline-flex items-center gap-2 rounded-full border border-amber-300/50 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700/40 px-4 py-1.5 text-sm">
        <MapPin className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
        <span className="text-amber-700 dark:text-amber-300 font-medium">Conexão em {fromIata}</span>
        {dur && (
          <>
            <span className="text-amber-400">·</span>
            <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <Clock className="w-3 h-3" /> {dur}
            </span>
          </>
        )}
      </span>
    </div>
  );
}

function buildPreviewFlightGrouping(displaySegments: any[]) {
  const fallbackLegs = displaySegments.reduce((acc: { label: string; direction: string; segments: any[] }[], seg, index) => {
    const direction = String(seg.direction || (index === 0 ? "ida" : "trecho")).toLowerCase();
    const last = acc[acc.length - 1];
    const label = direction === "volta" ? "Volta" : direction === "ida" ? "Ida" : `Trecho ${acc.length + 1}`;

    if (last && last.direction === direction) {
      last.segments.push(seg);
      return acc;
    }

    acc.push({ label, direction, segments: [seg] });
    return acc;
  }, []);

  if (displaySegments.length === 0) {
    return { legs: fallbackLegs, itineraryType: "ONE_WAY", title: "" };
  }

  const classification = classifyItinerary(
    displaySegments.map((seg, index) => ({
      ...seg,
      departure_date: seg.departure_date || null,
      departure_time: seg.departure_time || null,
      arrival_date: seg.arrival_date || null,
      arrival_time: seg.arrival_time || null,
      duration_minutes: Number.isFinite(seg.duration_minutes) ? Number(seg.duration_minutes) : null,
      segment_order: Number.isFinite(seg.segment_order) ? Number(seg.segment_order) : index,
    })),
  );

  const directedSegments = assignDirections(displaySegments as any, classification) as any[];
  const usedIndices = new Set<number>();
  const resolvedLegs = classification.legs
    .map((leg, legIndex) => {
      const segments = leg.segments
        .map((legSeg) => {
          const matchedIndex = directedSegments.findIndex((seg, index) => (
            !usedIndices.has(index) &&
            seg.origin_iata === legSeg.origin_iata &&
            seg.destination_iata === legSeg.destination_iata &&
            seg.departure_date === legSeg.departure_date &&
            (seg.departure_time || "") === (legSeg.departure_time || "")
          ));

          if (matchedIndex === -1) return null;
          usedIndices.add(matchedIndex);
          return directedSegments[matchedIndex];
        })
        .filter(Boolean);

      if (segments.length === 0) return null;

      const direction = String(
        segments[0]?.direction ||
        ((classification.type === "ROUND_TRIP" || classification.type === "OPEN_JAW")
          ? (legIndex === 0 ? "ida" : "volta")
          : "trecho"),
      ).toLowerCase();

      const label = direction === "volta"
        ? "Volta"
        : direction === "ida"
          ? "Ida"
          : classification.type === "ONE_WAY"
            ? "Ida"
            : `Trecho ${legIndex + 1}`;

      return { label, direction, segments };
    })
    .filter(Boolean) as { label: string; direction: string; segments: any[] }[];

  const legs = resolvedLegs.length > 0 ? resolvedLegs : fallbackLegs;
  const outboundLeg = legs.find((leg) => leg.direction === "ida") || legs[0];
  const title = outboundLeg?.segments?.length
    ? buildFlightTitle(
        outboundLeg.segments[0].origin_iata,
        outboundLeg.segments[outboundLeg.segments.length - 1].destination_iata,
        classification.type,
      )
    : "";

  return { legs, itineraryType: classification.type, title };
}

/* ═══ Flight Card (Boarding Pass Style) ═══ */
function FlightCard({ flight, idx }: { flight: any; idx: number }) {
  const d = normalizeFlightData(flight.data);

  const displaySegments = d.segments.length > 0 ? d.segments : [{
    airline: d.airline, airline_name: d.airline_name, airline_iata: d.airline?.substring(0, 2),
    flight_number: d.flight_number?.replace(/^[A-Z]{2}/, ""),
    origin_iata: d.origin, destination_iata: d.destination,
    departure_time: d.departure_time, arrival_time: d.arrival_time,
    departure_date: d.departure,
    terminal: d.terminal, arrival_terminal: d.arrival_terminal,
    duration_minutes: null,
    direction: "ida",
  }];

  const { legs, title: computedTitle } = buildPreviewFlightGrouping(displaySegments);

  const getBaggageInfo = () => {
    const segs = d.segments.length > 0 ? d.segments : [flight.data];
    const seg = segs[0];
    const badges: string[] = [];
    if (seg?.personal_item_included) badges.push(`Item pessoal ${seg.personal_item_weight_kg || 10}kg`);
    if (seg?.carry_on_included) badges.push(`Mão ${seg.carry_on_weight_kg || 10}kg`);
    if (seg?.checked_bags_included > 0) badges.push(`${seg.checked_bags_included}x ${seg.checked_bag_weight_kg || 23}kg`);
    if (d.baggage && badges.length === 0) badges.push(d.baggage);
    return badges;
  };
  const baggageBadges = getBaggageInfo();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: idx * 0.1 }}
    >
      {(computedTitle || flight.title) && (
        <div className="flex items-center gap-3 mb-3">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground/60 font-medium" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {computedTitle || flight.title}
          </p>
        </div>
      )}

      {/* Legs (Ida / Volta / Trecho) */}
      <div className="space-y-8">
        {legs.map((leg, li) => {
          const stops = leg.segments.length - 1;
          const firstSeg = leg.segments[0];
          const lastSeg = leg.segments[leg.segments.length - 1];
          const routeLabel = firstSeg && lastSeg ? `${firstSeg.origin_iata} → ${lastSeg.destination_iata}` : "";
          return (
            <div key={li}>
              <div className="flex items-center gap-3 mb-3">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground/60 font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {leg.label}{routeLabel ? ` · ${routeLabel}` : ""}
                </p>
                {stops === 0 ? (
                  <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1">
                    <Plane className="w-2.5 h-2.5" /> Voo direto
                  </span>
                ) : (
                  <span className="text-[10px] bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full font-medium">
                    {stops} {stops === 1 ? "conexão" : "conexões"}
                  </span>
                )}
              </div>

              <div className="space-y-0">
                {leg.segments.map((seg: any, i: number) => (
                  <div key={i}>
                    {i > 0 && (
                      <ConnectionBadge
                        fromIata={leg.segments[i - 1]?.destination_iata || ""}
                        layoverMinutes={calcPreciseLayoverMinutes(leg.segments[i - 1], seg) ?? undefined}
                      />
                    )}
                    <BoardingPassSegment seg={seg} showDate={true} />
                  </div>
                ))}
            </div>
          </div>
          );
        })}
      </div>

      {/* Bottom badges */}
      {(d.cabin || baggageBadges.length > 0) && (
        <div className="flex flex-wrap gap-2 mt-3 pl-1">
          {d.cabin && (
            <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground bg-accent/5 border border-accent/10 px-2.5 py-1 rounded-full">
              <BedDouble className="w-3 h-3 text-accent" /> {d.cabin}
            </span>
          )}
          {baggageBadges.map((b, i) => (
            <span key={i} className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground bg-accent/5 border border-accent/10 px-2.5 py-1 rounded-full">
              <Luggage className="w-3 h-3 text-accent" /> {b}
            </span>
          ))}
        </div>
      )}

      {/* Notes */}
      {(d.notes || flight.description) && (
        <p className="text-sm text-muted-foreground leading-relaxed border-l-2 border-accent/30 pl-3 mt-3">
          {d.notes || flight.description}
        </p>
      )}
    </motion.div>
  );
}

/* ═══ Hotel Card ═══ */
function HotelCard({ hotel, idx }: { hotel: any; idx: number }) {
  const d = hotel.data || {};
  const photos: string[] = d.photos || (d.selectedPhotos ? d.selectedPhotos : []);
  const amenities: string[] = d.amenities || [];
  const amenityIcons: Record<string, React.ReactNode> = {
    wifi: <Wifi className="w-3.5 h-3.5" />, "wi-fi": <Wifi className="w-3.5 h-3.5" />,
    piscina: <Waves className="w-3.5 h-3.5" />, pool: <Waves className="w-3.5 h-3.5" />,
    café: <Coffee className="w-3.5 h-3.5" />, breakfast: <Coffee className="w-3.5 h-3.5" />,
    restaurante: <UtensilsCrossed className="w-3.5 h-3.5" />, restaurant: <UtensilsCrossed className="w-3.5 h-3.5" />,
    transfer: <Car className="w-3.5 h-3.5" />, spa: <Bath className="w-3.5 h-3.5" />, vista: <Mountain className="w-3.5 h-3.5" />,
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: idx * 0.1 }}
      className="rounded-2xl border border-border/30 bg-card overflow-hidden shadow-sm"
    >
      {/* Header centralizado */}
      <div className="px-6 pt-7 pb-5 text-center border-b border-border/20">
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <h3 className="font-serif text-2xl sm:text-3xl font-semibold text-foreground tracking-tight">
            {hotel.title || "Hotel"}
          </h3>
          {d.stars && (
            <div className="flex gap-0.5">
              {Array.from({ length: parseInt(d.stars) || 0 }).map((_, i) => (
                <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
              ))}
            </div>
          )}
        </div>

        {d.rating && (
          <div className="flex items-center justify-center gap-2 mt-2">
            <span className="bg-accent text-accent-foreground text-xs font-bold px-2 py-0.5 rounded">
              {Number(d.rating).toFixed(1)}
            </span>
            {d.user_ratings_total && (
              <span className="text-xs text-muted-foreground">({d.user_ratings_total} avaliações)</span>
            )}
          </div>
        )}

        {d.location && (
          <p className="mt-3 text-sm text-muted-foreground flex items-center justify-center gap-1.5 max-w-2xl mx-auto">
            <MapPin className="w-3.5 h-3.5 text-accent/70 shrink-0" />
            <span>{d.location}</span>
          </p>
        )}

        {(hotel.description || d.editorial_summary) && (
          <p className="mt-3 text-sm text-muted-foreground/90 leading-relaxed max-w-2xl mx-auto italic">
            {hotel.description || `"${d.editorial_summary}"`}
          </p>
        )}
      </div>

      {/* Galeria */}
      {photos.length > 0 && (
        <div className="px-6 pt-5">
          <PhotoGallery photos={photos} name={hotel.title || "Hotel"} />
        </div>
      )}

      {/* Infos principais (quarto, refeições, datas) */}
      <div className="px-6 py-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
        {d.room_type && <DetailPill icon={<BedDouble className="w-3.5 h-3.5" />} label="Quarto" value={d.room_type} />}
        {d.meal_plan && <DetailPill icon={<UtensilsCrossed className="w-3.5 h-3.5" />} label="Refeições" value={d.meal_plan} />}
        {d.nights && <DetailPill icon={<Clock className="w-3.5 h-3.5" />} label="Diárias" value={`${d.nights} noite${d.nights > 1 ? "s" : ""}`} />}
        {d.check_in && <DetailPill icon={<Calendar className="w-3.5 h-3.5" />} label="Check-in" value={formatHotelDateBR(d.check_in) || d.check_in} />}
        {d.check_out && <DetailPill icon={<Calendar className="w-3.5 h-3.5" />} label="Check-out" value={formatHotelDateBR(d.check_out) || d.check_out} />}
      </div>

      {/* Comodidades */}
      {amenities.length > 0 && (
        <div className="px-6 pb-5">
          <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/60 font-medium mb-2.5 text-center">
            Comodidades
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {amenities.map((a, i) => {
              const iconKey = Object.keys(amenityIcons).find((k) => a.toLowerCase().includes(k));
              return (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-accent/5 border border-accent/10 px-3 py-1.5 rounded-full"
                >
                  {iconKey ? amenityIcons[iconKey] : <CheckCircle className="w-3 h-3 text-accent" />}
                  {a}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Avaliações */}
      {d.reviews && Array.isArray(d.reviews) && d.reviews.length > 0 && (
        <div className="px-6 pb-6 border-t border-border/20 pt-5">
          <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/60 font-medium mb-3 text-center">
            O que dizem os hóspedes
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {d.reviews.slice(0, 3).map((r: any, i: number) => (
              <div key={i} className="bg-accent/5 rounded-xl p-3 border border-accent/5">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="flex gap-0.5">
                    {Array.from({ length: r.rating || 0 }).map((_, j) => (
                      <Star key={j} className="w-3 h-3 text-amber-400 fill-amber-400" />
                    ))}
                  </div>
                  <span className="text-[10px] text-muted-foreground">{r.author || r.time}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4">{r.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

/* ═══ Experience Card ═══ */
function ExperienceCard({ exp, idx }: { exp: any; idx: number }) {
  const d = exp.data || {};
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: idx * 0.1 }}>
      <ExpandableCard
        expandedContent={
          <div className="px-5 pb-4 space-y-3">
            <div className="h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent" />
            {exp.description && <p className="text-sm text-muted-foreground leading-relaxed">{exp.description}</p>}
            {d.duration && <DetailPill icon={<Clock className="w-3.5 h-3.5" />} label="Duração" value={d.duration} />}
            {d.includes && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Inclui</p>
                <ul className="space-y-1">
                  {(Array.isArray(d.includes) ? d.includes : [d.includes]).map((item: string, i: number) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-center gap-1.5"><CheckCircle className="w-3 h-3 text-accent shrink-0" /> {item}</li>
                  ))}
                </ul>
              </div>
            )}
            {d.notes && <p className="text-xs text-muted-foreground/70 italic border-l-2 border-accent/30 pl-3">{d.notes}</p>}
          </div>
        }
      >
        {exp.image_url && <div className="h-40 overflow-hidden"><img src={exp.image_url} alt={exp.title} className="w-full h-full object-cover" /></div>}
        <div className="p-5">
          <div className="flex items-center gap-2 mb-1"><Sparkles className="w-4 h-4 text-accent" /><h3 className="font-semibold text-foreground">{exp.title}</h3></div>
          {exp.description && <p className="text-sm text-muted-foreground line-clamp-2">{exp.description}</p>}
          <p className="text-xs text-accent flex items-center gap-1 mt-2 font-medium">Ver mais <ChevronRight className="w-3 h-3" /></p>
        </div>
      </ExpandableCard>
    </motion.div>
  );
}

/* ═══ Main Renderer ═══ */
interface ProposalTrackingAPI {
  track: (eventType: string, sectionName?: string, eventData?: Record<string, any>) => void;
  trackCTA: (ctaType: string, details?: Record<string, any>) => void;
  trackExpand: (section: string, itemName?: string) => void;
  trackGallery: (section: string, photoIndex?: number) => void;
}

interface ProposalPreviewRendererProps {
  proposal: any;
  items: any[];
  embedded?: boolean;
  tracking?: ProposalTrackingAPI;
  template?: any;
}

/* ═══ Convert hex (#rrggbb) to "h s% l%" string for CSS HSL variables ═══ */
function hexToHsl(hex?: string | null): string | null {
  if (!hex || typeof hex !== "string") return null;
  const m = hex.replace("#", "").match(/^([0-9a-f]{6})$/i);
  if (!m) return null;
  const r = parseInt(m[1].slice(0, 2), 16) / 255;
  const g = parseInt(m[1].slice(2, 4), 16) / 255;
  const b = parseInt(m[1].slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export default function ProposalPreviewRenderer({ proposal, items, embedded = false, tracking, template }: ProposalPreviewRendererProps) {
  const destinations = items.filter((i) => i.item_type === "destination");
  const flights = items.filter((i) => i.item_type === "flight");
  const hotels = items.filter((i) => i.item_type === "hotel");
  const experiences = items.filter((i) => i.item_type === "experience");
  const paymentConditions = (proposal.payment_conditions as any[]) || [];

  // Resolve template-driven theme (instant preview when user picks a model)
  const headingFont = template?.font_heading ? `'${template.font_heading}', 'Space Grotesk', sans-serif` : "'Space Grotesk', sans-serif";
  const bodyFont = template?.font_body ? `'${template.font_body}', sans-serif` : undefined;
  const accentHsl = hexToHsl(template?.accent_color);
  const primaryHsl = hexToHsl(template?.primary_color);
  const themeStyle: React.CSSProperties = {
    ...(accentHsl ? ({ ["--accent" as any]: accentHsl, ["--ring" as any]: accentHsl }) : {}),
    ...(primaryHsl ? ({ ["--primary" as any]: primaryHsl }) : {}),
    ["--proposal-heading-font" as any]: headingFont,
    ...(bodyFont ? { fontFamily: bodyFont } : {}),
    ...(template?.bg_color ? { backgroundColor: template.bg_color } : {}),
    ...(template?.text_color ? { color: template.text_color } : {}),
  };

  // Section enable/disable map from template.sections
  const tplSections: Array<{ type: string; enabled?: boolean }> = Array.isArray(template?.sections) ? template.sections : [];
  const isSecOn = (key: string) => {
    if (!tplSections.length) return true;
    const s = tplSections.find((x) => x.type === key);
    return s ? s.enabled !== false : true;
  };
  const showHero = isSecOn("hero");
  const showDestinations = isSecOn("destinations");
  const showFlights = isSecOn("flights");
  const showHotels = isSecOn("hotels");
  const showExperiences = isSecOn("experiences");
  const showPricing = isSecOn("pricing");

  const startDate = parseLocalDate(proposal.travel_start_date);
  const endDate = parseLocalDate(proposal.travel_end_date);
  const dateRange =
    startDate && endDate
      ? `${format(startDate, "dd", { locale: ptBR })} — ${format(endDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`
      : proposal.travel_start_date
        ? fmtDate(proposal.travel_start_date)
        : "";

  const hasContent = destinations.length > 0 || flights.length > 0 || hotels.length > 0 || experiences.length > 0 || proposal.destinations?.length > 0;

  if (!hasContent && !proposal.title) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mb-4">
          <Sparkles className="w-7 h-7 text-accent/40" />
        </div>
        <p className="text-lg font-medium text-muted-foreground mb-1">Nenhum conteúdo ainda</p>
        <p className="text-sm text-muted-foreground/60 max-w-md">
          Preencha as informações da proposta e adicione itens de viagem para ver o preview da apresentação aqui.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`bg-background text-foreground ${embedded ? "rounded-xl border border-border overflow-hidden" : "min-h-screen"}`}
      style={themeStyle}
    >
      {/* ──── HERO COVER ──── */}
      {showHero && (
      <section data-track-section="hero" className={`relative ${embedded ? "h-[50vh] min-h-[320px]" : "h-screen"} flex items-end justify-center overflow-hidden`}>
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${proposal.cover_image_url || fallbackCover})` }} />
        {/* Emerald-tinted gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[hsl(158,50%,4%)] via-[hsl(158,30%,8%,0.5)] to-[hsl(160,20%,10%,0.15)]" />

        {/* NatLeva Logo - top center */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="absolute top-8 left-0 right-0 z-10 flex justify-center pointer-events-none"
        >
          <img src={logoNatleva} alt="NatLeva Viagens" className="h-10 sm:h-12 drop-shadow-lg mx-auto" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3 }}
          className="relative z-10 text-center text-white pb-12 sm:pb-20 px-6 max-w-3xl"
        >
          {proposal.client_name && (
            <p className="text-sm tracking-[0.35em] uppercase opacity-60 mb-5" style={{ fontFamily: headingFont }}>
              {proposal.client_name}
            </p>
          )}
          <h1
            className={`${embedded ? "text-3xl sm:text-4xl" : "text-4xl sm:text-5xl md:text-6xl"} font-bold leading-tight mb-5`}
            style={{ fontFamily: headingFont, letterSpacing: "-0.02em" }}
          >
            {proposal.title || "Sua Viagem"}
          </h1>
          {dateRange && (
            <p className="text-base sm:text-lg opacity-70 font-light tracking-wide">{dateRange}</p>
          )}
          <div className="flex items-center justify-center gap-3 mt-8 opacity-40">
            <div className="h-px w-8 bg-white/50" />
            <span className="text-[10px] tracking-[0.3em] uppercase" style={{ fontFamily: headingFont }}>
              Proposta exclusiva
            </span>
            <div className="h-px w-8 bg-white/50" />
          </div>
        </motion.div>

        {!embedded && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }} className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
            <ChevronDown className="w-6 h-6 text-white/40 animate-bounce" />
          </motion.div>
        )}
      </section>
      )}

      {/* ──── INTRO ──── */}
      {proposal.intro_text && (
        <section data-track-section="intro" className="max-w-3xl mx-auto py-16 sm:py-24 px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center">
            <div className="w-12 h-px bg-accent/40 mx-auto mb-8" />
            <p className="text-lg sm:text-xl leading-relaxed text-muted-foreground font-light italic">
              "{proposal.intro_text}"
            </p>
            <div className="w-12 h-px bg-accent/40 mx-auto mt-8" />
          </motion.div>
        </section>
      )}

      {/* ──── DESTINATIONS ──── */}
      {showDestinations && (destinations.length > 0 || (proposal.destinations?.length > 0 && destinations.length === 0)) && (
        <section data-track-section="destinations" className="py-12 sm:py-20 px-6">
          <SectionTitle subtitle="Os lugares que você vai explorar">Seus Destinos</SectionTitle>
          <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {(destinations.length > 0 ? destinations : proposal.destinations.map((d: string, i: number) => ({ title: d, image_url: null, description: null, id: i }))).map((dest: any, idx: number) => (
              <motion.div key={dest.id || idx} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: idx * 0.1 }} className="group rounded-2xl overflow-hidden relative h-72 cursor-pointer shadow-lg shadow-black/10">
                <img src={dest.image_url || getDestImage(dest.title || "")} alt={dest.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-[hsl(158,50%,4%,0.8)] via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h3 className="text-xl font-bold text-white" style={{ fontFamily: headingFont }}>{dest.title}</h3>
                  {dest.description && <p className="text-sm text-white/60 mt-1">{dest.description}</p>}
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* ──── FLIGHTS ──── */}
      {showFlights && flights.length > 0 && (
        <section data-track-section="flights" className="py-12 sm:py-20 px-6 bg-accent/[0.03]">
          <SectionTitle subtitle="Seus voos com todos os detalhes">Voos</SectionTitle>
          <div className="max-w-3xl mx-auto space-y-8">
            {flights.map((f, idx) => <FlightCard key={f.id || idx} flight={f} idx={idx} />)}
          </div>
        </section>
      )}

      {/* ──── HOTELS ──── */}
      {showHotels && hotels.length > 0 && (
        <section data-track-section="hotels" className="py-12 sm:py-20 px-6">
          <SectionTitle subtitle="Clique para explorar fotos, quartos e avaliações">Hospedagens</SectionTitle>
          <div
            className={
              hotels.length === 1
                ? "max-w-3xl mx-auto"
                : "max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6"
            }
          >
            {hotels.map((h, idx) => <HotelCard key={h.id || idx} hotel={h} idx={idx} />)}
          </div>
        </section>
      )}

      {/* ──── EXPERIENCES ──── */}
      {showExperiences && experiences.length > 0 && (
        <section data-track-section="experiences" className="py-12 sm:py-20 px-6 bg-accent/[0.03]">
          <SectionTitle subtitle="Momentos que farão sua viagem inesquecível">Experiências</SectionTitle>
          <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {experiences.map((exp, idx) => <ExperienceCard key={exp.id || idx} exp={exp} idx={idx} />)}
          </div>
        </section>
      )}

      {/* ──── FINANCIAL ──── */}
      {showPricing && (proposal.total_value || proposal.value_per_person) && (
        <section data-track-section="pricing" className="py-12 sm:py-20 px-6">
          <SectionTitle>Investimento</SectionTitle>
          <div className="max-w-2xl mx-auto">
            <div className="rounded-2xl border border-accent/15 bg-gradient-to-b from-card to-accent/[0.03] p-8 sm:p-10 text-center space-y-6 shadow-xl shadow-accent/5">
              {proposal.value_per_person && (
                <div>
                  <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground/50 mb-1.5" style={{ fontFamily: headingFont }}>Valor por pessoa</p>
                  <p className="text-3xl font-bold text-foreground" style={{ fontFamily: headingFont }}>{fmtCurrency(proposal.value_per_person)}</p>
                </div>
              )}
              {proposal.total_value && (
                <div>
                  <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground/50 mb-1.5" style={{ fontFamily: headingFont }}>Valor total da viagem</p>
                  <p className="text-4xl sm:text-5xl font-bold text-accent" style={{ fontFamily: headingFont }}>{fmtCurrency(proposal.total_value)}</p>
                </div>
              )}
              {proposal.includes_text && (
                <div className="text-left border-t border-accent/15 pt-5">
                  <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-accent" /> O que está incluso</p>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{proposal.includes_text}</p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ──── PAYMENT ──── */}
      {paymentConditions.length > 0 && (
        <section data-track-section="payment" className="py-12 sm:py-20 px-6 bg-accent/[0.03]">
          <SectionTitle>Condições de Pagamento</SectionTitle>
          <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4">
            {paymentConditions.map((pc: any, idx: number) => (
              <motion.div key={idx} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: idx * 0.1 }} className="rounded-xl border border-accent/15 bg-card p-5 text-center hover:shadow-lg hover:shadow-accent/5 transition-shadow">
                <p className="font-semibold text-foreground">{pc.method}</p>
                {pc.details && <p className="text-sm text-muted-foreground mt-1">{pc.details}</p>}
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* ──── CTA ──── */}
      {!embedded && (
        <section data-track-section="cta" className="py-20 sm:py-28 px-6">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Pronto para viver essa experiência?
            </h2>
            <p className="text-muted-foreground mb-10">Entre em contato e garanta sua reserva</p>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`Olá! Gostaria de reservar a viagem "${proposal.title}".`)}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => tracking?.trackCTA("whatsapp")}
              className="inline-flex items-center gap-2.5 bg-gradient-to-r from-accent to-accent/80 text-accent-foreground px-10 py-4 rounded-full text-lg font-semibold hover:scale-[1.02] transition-all duration-300 shadow-lg shadow-accent/25 hover:shadow-xl hover:shadow-accent/30"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              <CheckCircle className="w-5 h-5" /> Quero reservar esta viagem
            </a>
          </motion.div>
        </section>
      )}

      {/* ──── FOOTER ──── */}
      <footer className="py-10 px-6 border-t border-accent/10">
        <div className="max-w-2xl mx-auto text-center">
          <img src={logoNatleva} alt="NatLeva Viagens" className="h-9 mx-auto mb-4 opacity-60" />
          <p className="text-xs text-muted-foreground/40 tracking-wide" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Proposta exclusiva{proposal.consultant_name ? ` · Preparada por ${proposal.consultant_name}` : ""} · NatLeva Viagens
          </p>
        </div>
      </footer>
    </div>
  );
}
