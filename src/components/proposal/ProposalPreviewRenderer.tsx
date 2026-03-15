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

const fallbackCover = "https://images.unsplash.com/photo-1488085061387-422e29b40080?w=1920&h=1080&fit=crop&q=80";

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

function fmtDate(d: string) {
  return format(new Date(d + "T00:00:00"), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
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

/* ═══ Photo Gallery Lightbox ═══ */
function PhotoGallery({ photos, name }: { photos: string[]; name: string }) {
  const [lightbox, setLightbox] = useState<number | null>(null);
  if (photos.length === 0) return null;
  return (
    <>
      <div className="grid grid-cols-4 gap-1.5">
        {photos.slice(0, 8).map((url, i) => (
          <button key={i} onClick={(e) => { e.stopPropagation(); setLightbox(i); }} className="aspect-square rounded-lg overflow-hidden hover:opacity-80 transition-opacity relative group">
            <img src={url} alt={`${name} - ${i + 1}`} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
              <Camera className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </button>
        ))}
      </div>
      <AnimatePresence>
        {lightbox !== null && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center" onClick={() => setLightbox(null)}>
            <button className="absolute top-6 right-6 text-white/60 hover:text-white z-10" onClick={() => setLightbox(null)}><X className="w-6 h-6" /></button>
            <motion.img key={lightbox} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} src={photos[lightbox]} alt="" className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg" />
            {lightbox > 0 && <button className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20" onClick={(e) => { e.stopPropagation(); setLightbox(lightbox - 1); }}><ChevronRight className="w-5 h-5 rotate-180" /></button>}
            {lightbox < photos.length - 1 && <button className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20" onClick={(e) => { e.stopPropagation(); setLightbox(lightbox + 1); }}><ChevronRight className="w-5 h-5" /></button>}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/50 text-sm">{lightbox + 1} / {photos.length}</div>
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

/* ═══ Flight Segment Detail ═══ */
function FlightSegmentDetail({ seg, idx }: { seg: any; idx: number }) {
  const dur = seg.duration_minutes ? `${Math.floor(seg.duration_minutes / 60)}h${seg.duration_minutes % 60 > 0 ? ` ${seg.duration_minutes % 60}min` : ""}` : "";
  return (
    <div className={`flex items-center gap-4 py-3 ${idx > 0 ? "border-t border-dashed border-accent/15" : ""}`}>
      <div className="text-center min-w-[60px]">
        <p className="text-lg font-bold text-foreground">{seg.departure_time || "—"}</p>
        <p className="text-sm font-semibold text-accent">{seg.origin_iata || "—"}</p>
        {seg.terminal && <p className="text-[10px] text-muted-foreground">T{seg.terminal}</p>}
      </div>
      <div className="flex-1 flex flex-col items-center gap-0.5">
        <div className="w-full flex items-center gap-1">
          <div className="h-px bg-gradient-to-r from-accent/30 to-accent/10 flex-1" />
          <Plane className="w-3.5 h-3.5 text-accent" />
          <div className="h-px bg-gradient-to-l from-accent/30 to-accent/10 flex-1" />
        </div>
        <span className="text-[10px] text-muted-foreground/60">{seg.airline || ""}{seg.flight_number ? ` ${seg.flight_number}` : ""}</span>
        {dur && <span className="text-[10px] text-muted-foreground/60 flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" /> {dur}</span>}
        {seg.aircraft_type && <span className="text-[10px] text-muted-foreground/40">✈ {seg.aircraft_type}</span>}
      </div>
      <div className="text-center min-w-[60px]">
        <p className="text-lg font-bold text-foreground">{seg.arrival_time || "—"}</p>
        <p className="text-sm font-semibold text-accent">{seg.destination_iata || "—"}</p>
        {seg.arrival_terminal && <p className="text-[10px] text-muted-foreground">T{seg.arrival_terminal}</p>}
      </div>
    </div>
  );
}

/* ═══ Flight Card ═══ */
function FlightCard({ flight, idx }: { flight: any; idx: number }) {
  const d = normalizeFlightData(flight.data);
  const hasSegments = d.segments.length > 0;

  // Extract baggage info from segments
  const getBaggageInfo = () => {
    const segs = d.segments.length > 0 ? d.segments : [flight.data];
    const seg = segs[0];
    const badges: string[] = [];
    if (seg?.carry_on_included) badges.push(`Mão ${seg.carry_on_weight_kg || 10}kg`);
    if (seg?.checked_bags_included > 0) badges.push(`${seg.checked_bags_included}x ${seg.checked_bag_weight_kg || 23}kg`);
    if (d.baggage && badges.length === 0) badges.push(d.baggage);
    return badges;
  };
  const baggageBadges = getBaggageInfo();

  return (
    <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: idx * 0.08 }}>
      <ExpandableCard
        expandedContent={
          <div className="px-6 pb-4 space-y-4">
            <div className="h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent" />
            {hasSegments ? (
              <div className="space-y-0">
                {d.segments.map((seg: any, i: number) => (
                  <FlightSegmentDetail key={i} seg={seg} idx={i} />
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-4 py-4">
                <div className="text-center flex-1">
                  <p className="text-2xl font-bold text-foreground">{d.origin || "—"}</p>
                  {d.departure_time && <p className="text-sm text-muted-foreground mt-1">{d.departure_time}</p>}
                  {d.terminal && <p className="text-xs text-muted-foreground/60">Terminal {d.terminal}</p>}
                </div>
                <div className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex items-center gap-1">
                    <div className="h-px bg-gradient-to-r from-accent/30 to-accent/10 flex-1" />
                    <Plane className="w-4 h-4 text-accent" />
                    <div className="h-px bg-gradient-to-l from-accent/30 to-accent/10 flex-1" />
                  </div>
                  {d.duration && <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1"><Clock className="w-3 h-3" /> {d.duration}</span>}
                  <span className="text-[10px] text-muted-foreground/60">{d.stops === 0 ? "Voo direto" : `${d.stops} parada${d.stops > 1 ? "s" : ""}`}</span>
                </div>
                <div className="text-center flex-1">
                  <p className="text-2xl font-bold text-foreground">{d.destination || "—"}</p>
                  {d.arrival_time && <p className="text-sm text-muted-foreground mt-1">{d.arrival_time}</p>}
                  {d.arrival_terminal && <p className="text-xs text-muted-foreground/60">Terminal {d.arrival_terminal}</p>}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {d.airline && <DetailPill icon={<Plane className="w-3.5 h-3.5" />} label="Companhia" value={d.airline} />}
              {d.flight_number && <DetailPill icon={<span className="text-[10px] font-bold">#</span>} label="Voo" value={d.flight_number} />}
              {d.cabin && <DetailPill icon={<BedDouble className="w-3.5 h-3.5" />} label="Classe" value={d.cabin} />}
              {baggageBadges.length > 0 && <DetailPill icon={<Luggage className="w-3.5 h-3.5" />} label="Bagagem" value={baggageBadges.join(" · ")} />}
              {d.seat && <DetailPill icon={<Users className="w-3.5 h-3.5" />} label="Assento" value={d.seat} />}
              {d.departure && (() => { try { return <DetailPill icon={<Calendar className="w-3.5 h-3.5" />} label="Data" value={format(new Date(d.departure.length <= 10 ? d.departure + "T00:00:00" : d.departure), "dd/MM/yyyy", { locale: ptBR })} />; } catch { return null; } })()}
              {d.stops > 0 && <DetailPill icon={<Globe className="w-3.5 h-3.5" />} label="Paradas" value={`${d.stops} conexão${d.stops > 1 ? "ões" : ""}`} />}
            </div>
            {d.notes && <p className="text-sm text-muted-foreground leading-relaxed border-l-2 border-accent/30 pl-3">{d.notes}</p>}
            {flight.description && <p className="text-sm text-muted-foreground leading-relaxed border-l-2 border-accent/30 pl-3">{flight.description}</p>}
          </div>
        }
      >
        <div className="p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center shrink-0 border border-accent/10">
            <Plane className="w-5 h-5 text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground">{flight.title || "Voo"}</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-muted-foreground">
              {d.origin && d.destination && <span className="font-medium text-foreground">{d.origin} · {d.destination}</span>}
              {d.airline && <span className="text-muted-foreground/70">{d.airline}</span>}
              {d.departure && (() => { try { return <span className="text-muted-foreground/70">{format(new Date(d.departure.length <= 10 ? d.departure + "T00:00:00" : d.departure), "dd MMM", { locale: ptBR })}</span>; } catch { return null; } })()}
              {d.stops > 0 && <span className="text-[10px] bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded">{d.stops} conexão{d.stops > 1 ? "ões" : ""}</span>}
              {baggageBadges.length > 0 && (
                <span className="text-[10px] bg-accent/10 text-accent px-1.5 py-0.5 rounded flex items-center gap-1">
                  <Briefcase className="w-2.5 h-2.5" /> {baggageBadges.join(" · ")}
                </span>
              )}
            </div>
          </div>
          <span className="text-xs text-accent flex items-center gap-1 shrink-0 font-medium">Ver detalhes <ChevronRight className="w-3 h-3" /></span>
        </div>
      </ExpandableCard>
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
    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: idx * 0.1 }}>
      <ExpandableCard
        expandedContent={
          <div className="px-6 pb-4 space-y-4">
            <div className="h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent" />
            {photos.length > 0 && <PhotoGallery photos={photos} name={hotel.title || "Hotel"} />}
            <div className="grid grid-cols-2 gap-3">
              {d.room_type && <DetailPill icon={<BedDouble className="w-3.5 h-3.5" />} label="Quarto" value={d.room_type} />}
              {d.meal_plan && <DetailPill icon={<UtensilsCrossed className="w-3.5 h-3.5" />} label="Refeições" value={d.meal_plan} />}
              {d.check_in && <DetailPill icon={<Calendar className="w-3.5 h-3.5" />} label="Check-in" value={d.check_in} />}
              {d.check_out && <DetailPill icon={<Calendar className="w-3.5 h-3.5" />} label="Check-out" value={d.check_out} />}
              {d.nights && <DetailPill icon={<Clock className="w-3.5 h-3.5" />} label="Diárias" value={`${d.nights} noite${d.nights > 1 ? "s" : ""}`} />}
              {d.website && (
                <a href={d.website} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="flex items-center gap-2 rounded-xl bg-accent/5 border border-accent/10 px-3 py-2.5 hover:bg-accent/10 transition-colors">
                  <Globe className="w-3.5 h-3.5 text-accent" /><div><p className="text-[9px] uppercase tracking-wider text-muted-foreground/50">Website</p><p className="text-xs font-medium text-accent truncate">Visitar</p></div>
                </a>
              )}
            </div>
            {amenities.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Comodidades</p>
                <div className="flex flex-wrap gap-2">
                  {amenities.map((a, i) => {
                    const iconKey = Object.keys(amenityIcons).find(k => a.toLowerCase().includes(k));
                    return <span key={i} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-accent/5 border border-accent/10 px-2.5 py-1.5 rounded-full">{iconKey ? amenityIcons[iconKey] : <CheckCircle className="w-3 h-3 text-accent" />}{a}</span>;
                  })}
                </div>
              </div>
            )}
            {d.reviews && Array.isArray(d.reviews) && d.reviews.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Avaliações</p>
                <div className="space-y-2">
                  {d.reviews.slice(0, 3).map((r: any, i: number) => (
                    <div key={i} className="bg-accent/5 rounded-xl p-3 border border-accent/5">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex gap-0.5">{Array.from({ length: r.rating || 0 }).map((_, j) => <Star key={j} className="w-3 h-3 text-amber-400 fill-amber-400" />)}</div>
                        <span className="text-[10px] text-muted-foreground">{r.author || r.time}</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{r.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {hotel.description && <p className="text-sm text-muted-foreground leading-relaxed border-l-2 border-accent/30 pl-3">{hotel.description}</p>}
            {d.editorial_summary && <p className="text-sm text-muted-foreground/80 italic leading-relaxed">"{d.editorial_summary}"</p>}
          </div>
        }
      >
        <div className="h-52 overflow-hidden relative">
          <img src={hotel.image_url || photos[0] || "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=400&fit=crop&q=80"} alt={hotel.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          {photos.length > 1 && <span className="absolute bottom-3 right-3 bg-black/50 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded-full flex items-center gap-1"><Camera className="w-3 h-3" /> {photos.length} fotos</span>}
        </div>
        <div className="p-6">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-lg text-foreground">{hotel.title || "Hotel"}</h3>
            {d.stars && <div className="flex gap-0.5 shrink-0">{Array.from({ length: parseInt(d.stars) || 0 }).map((_, i) => <Star key={i} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />)}</div>}
          </div>
          {d.rating && <div className="flex items-center gap-1.5 mt-1"><span className="bg-accent text-accent-foreground text-xs font-bold px-1.5 py-0.5 rounded">{Number(d.rating).toFixed(1)}</span>{d.user_ratings_total && <span className="text-xs text-muted-foreground">({d.user_ratings_total} avaliações)</span>}</div>}
          {d.location && <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1.5"><MapPin className="w-3.5 h-3.5 text-accent/60" /> {d.location}</p>}
          <div className="flex flex-wrap gap-2 mt-3">
            {d.room_type && <span className="text-xs bg-accent/8 text-accent border border-accent/15 px-2.5 py-1 rounded-full">{d.room_type}</span>}
            {d.meal_plan && <span className="text-xs bg-accent/8 text-accent border border-accent/15 px-2.5 py-1 rounded-full">{d.meal_plan}</span>}
            {d.nights && <span className="text-xs bg-accent/8 text-accent border border-accent/15 px-2.5 py-1 rounded-full">{d.nights} noite{d.nights > 1 ? "s" : ""}</span>}
          </div>
          <p className="text-xs text-accent flex items-center gap-1 mt-3 font-medium">Ver detalhes e fotos <ChevronRight className="w-3 h-3" /></p>
        </div>
      </ExpandableCard>
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
interface ProposalPreviewRendererProps {
  proposal: any;
  items: any[];
  embedded?: boolean;
}

export default function ProposalPreviewRenderer({ proposal, items, embedded = false }: ProposalPreviewRendererProps) {
  const destinations = items.filter((i) => i.item_type === "destination");
  const flights = items.filter((i) => i.item_type === "flight");
  const hotels = items.filter((i) => i.item_type === "hotel");
  const experiences = items.filter((i) => i.item_type === "experience");
  const paymentConditions = (proposal.payment_conditions as any[]) || [];

  const dateRange =
    proposal.travel_start_date && proposal.travel_end_date
      ? `${format(new Date(proposal.travel_start_date + "T00:00:00"), "dd", { locale: ptBR })} — ${format(new Date(proposal.travel_end_date + "T00:00:00"), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`
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
    <div className={`bg-background text-foreground ${embedded ? "rounded-xl border border-border overflow-hidden" : "min-h-screen"}`}>
      {/* ──── HERO COVER ──── */}
      <section className={`relative ${embedded ? "h-[50vh] min-h-[320px]" : "h-screen"} flex items-end justify-center overflow-hidden`}>
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${proposal.cover_image_url || fallbackCover})` }} />
        {/* Emerald-tinted gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[hsl(158,50%,4%)] via-[hsl(158,30%,8%,0.5)] to-[hsl(160,20%,10%,0.15)]" />

        {/* NatLeva Logo - top center */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="absolute top-8 left-1/2 -translate-x-1/2 z-10"
        >
          <img src={logoNatleva} alt="NatLeva Viagens" className="h-10 sm:h-12 drop-shadow-lg" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3 }}
          className="relative z-10 text-center text-white pb-12 sm:pb-20 px-6 max-w-3xl"
        >
          {proposal.client_name && (
            <p className="text-sm tracking-[0.35em] uppercase opacity-60 mb-5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {proposal.client_name}
            </p>
          )}
          <h1
            className={`${embedded ? "text-3xl sm:text-4xl" : "text-4xl sm:text-5xl md:text-6xl"} font-bold leading-tight mb-5`}
            style={{ fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em" }}
          >
            {proposal.title || "Sua Viagem"}
          </h1>
          {dateRange && (
            <p className="text-base sm:text-lg opacity-70 font-light tracking-wide">{dateRange}</p>
          )}
          <div className="flex items-center justify-center gap-3 mt-8 opacity-40">
            <div className="h-px w-8 bg-white/50" />
            <span className="text-[10px] tracking-[0.3em] uppercase" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
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

      {/* ──── INTRO ──── */}
      {proposal.intro_text && (
        <section className="max-w-3xl mx-auto py-16 sm:py-24 px-6">
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
      {(destinations.length > 0 || (proposal.destinations?.length > 0 && destinations.length === 0)) && (
        <section className="py-12 sm:py-20 px-6">
          <SectionTitle subtitle="Os lugares que você vai explorar">Seus Destinos</SectionTitle>
          <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {(destinations.length > 0 ? destinations : proposal.destinations.map((d: string, i: number) => ({ title: d, image_url: null, description: null, id: i }))).map((dest: any, idx: number) => (
              <motion.div key={dest.id || idx} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: idx * 0.1 }} className="group rounded-2xl overflow-hidden relative h-72 cursor-pointer shadow-lg shadow-black/10">
                <img src={dest.image_url || getDestImage(dest.title || "")} alt={dest.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-[hsl(158,50%,4%,0.8)] via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h3 className="text-xl font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{dest.title}</h3>
                  {dest.description && <p className="text-sm text-white/60 mt-1">{dest.description}</p>}
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* ──── FLIGHTS ──── */}
      {flights.length > 0 && (
        <section className="py-12 sm:py-20 px-6 bg-accent/[0.03]">
          <SectionTitle subtitle="Clique para ver os detalhes do voo">Voos</SectionTitle>
          <div className="max-w-4xl mx-auto space-y-4">
            {flights.map((f, idx) => <FlightCard key={f.id || idx} flight={f} idx={idx} />)}
          </div>
        </section>
      )}

      {/* ──── HOTELS ──── */}
      {hotels.length > 0 && (
        <section className="py-12 sm:py-20 px-6">
          <SectionTitle subtitle="Clique para explorar fotos, quartos e avaliações">Hospedagens</SectionTitle>
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
            {hotels.map((h, idx) => <HotelCard key={h.id || idx} hotel={h} idx={idx} />)}
          </div>
        </section>
      )}

      {/* ──── EXPERIENCES ──── */}
      {experiences.length > 0 && (
        <section className="py-12 sm:py-20 px-6 bg-accent/[0.03]">
          <SectionTitle subtitle="Momentos que farão sua viagem inesquecível">Experiências</SectionTitle>
          <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {experiences.map((exp, idx) => <ExperienceCard key={exp.id || idx} exp={exp} idx={idx} />)}
          </div>
        </section>
      )}

      {/* ──── FINANCIAL ──── */}
      {(proposal.total_value || proposal.value_per_person) && (
        <section className="py-12 sm:py-20 px-6">
          <SectionTitle>Investimento</SectionTitle>
          <div className="max-w-2xl mx-auto">
            <div className="rounded-2xl border border-accent/15 bg-gradient-to-b from-card to-accent/[0.03] p-8 sm:p-10 text-center space-y-6 shadow-xl shadow-accent/5">
              {proposal.value_per_person && (
                <div>
                  <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground/50 mb-1.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Valor por pessoa</p>
                  <p className="text-3xl font-bold text-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{fmtCurrency(proposal.value_per_person)}</p>
                </div>
              )}
              {proposal.total_value && (
                <div>
                  <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground/50 mb-1.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Valor total da viagem</p>
                  <p className="text-4xl sm:text-5xl font-bold text-accent" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{fmtCurrency(proposal.total_value)}</p>
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
        <section className="py-12 sm:py-20 px-6 bg-accent/[0.03]">
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
        <section className="py-20 sm:py-28 px-6">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Pronto para viver essa experiência?
            </h2>
            <p className="text-muted-foreground mb-10">Entre em contato e garanta sua reserva</p>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`Olá! Gostaria de reservar a viagem "${proposal.title}".`)}`}
              target="_blank"
              rel="noopener noreferrer"
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
