import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import PortalLayout from "@/components/portal/PortalLayout";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import {
  Plane, Calendar, MapPin, ArrowRight, FileText, DollarSign,
  MessageCircle, Timer, ChevronLeft, ChevronRight, Sparkles,
  Clock, CheckSquare, Eye, Hotel, Users, Compass,
} from "lucide-react";
import { iataToLabel } from "@/lib/iataUtils";
import { getMockTripsForDashboard } from "@/lib/portalMockTrips";

/* ═══ Helpers ═══ */
function getStatusCategory(sale: any): "upcoming" | "active" | "past" {
  const dep = sale?.departure_date ? new Date(sale.departure_date + "T00:00:00") : null;
  const ret = sale?.return_date ? new Date(sale.return_date + "T23:59:59") : null;
  const now = new Date();
  if (dep && dep > now) return "upcoming";
  if (dep && ret && dep <= now && ret >= now) return "active";
  return "past";
}

const destImg: Record<string, string> = {
  MCO: "https://images.unsplash.com/photo-1575089976121-8ed7b2a54265?w=1600&h=900&fit=crop&q=80",
  MIA: "https://images.unsplash.com/photo-1533106497176-45ae19e68ba2?w=1600&h=900&fit=crop&q=80",
  LIS: "https://images.unsplash.com/photo-1585208798174-6cedd86e019a?w=1600&h=900&fit=crop&q=80",
  CDG: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1600&h=900&fit=crop&q=80",
  FCO: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=1600&h=900&fit=crop&q=80",
  CUN: "https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?w=1600&h=900&fit=crop&q=80",
  EZE: "https://images.unsplash.com/photo-1589909202802-8f4aadce1849?w=1600&h=900&fit=crop&q=80",
  default: "https://images.unsplash.com/photo-1488085061387-422e29b40080?w=1600&h=900&fit=crop&q=80",
};
function getImg(iata: string | null, cover: string | null) {
  if (cover) return cover;
  if (iata && destImg[iata]) return destImg[iata];
  return destImg.default;
}

function fmtShort(d: string | null) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

/* ═══ Cinematic Countdown ═══ */
function CinemaCountdown({ departureDate }: { departureDate: string }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const dep = new Date(departureDate + "T00:00:00");
  const diff = dep.getTime() - now.getTime();

  if (diff <= 0) {
    return (
      <div className="flex items-center gap-3">
        <span className="relative flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
          <span className="relative inline-flex rounded-full h-4 w-4 bg-accent" />
        </span>
        <span className="text-white font-bold text-xl tracking-tight">Viagem em andamento</span>
      </div>
    );
  }

  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  const secs = Math.floor((diff % 60000) / 1000);

  return (
    <div>
      <p className="text-white/30 text-[10px] uppercase tracking-[0.35em] mb-3 font-semibold">Sua jornada começa em</p>
      <div className="flex items-end gap-1.5 sm:gap-2.5">
        {[
          { val: days, label: "dias" },
          { val: hours, label: "horas" },
          { val: mins, label: "min" },
          { val: secs, label: "seg" },
        ].map((item, i) => (
          <div key={i} className="text-center">
            <div className="bg-white/[0.07] backdrop-blur-xl text-white font-bold text-2xl sm:text-4xl lg:text-5xl px-3 sm:px-5 py-2 sm:py-3 rounded-xl sm:rounded-2xl min-w-[52px] sm:min-w-[80px] tabular-nums border border-white/[0.08] shadow-2xl">
              {String(item.val).padStart(2, "0")}
            </div>
            <span className="text-white/25 text-[9px] sm:text-[10px] uppercase tracking-wider mt-1.5 block">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══ Status Badge ═══ */
function StatusBadge({ sale, size = "md" }: { sale: any; size?: "sm" | "md" }) {
  const cat = getStatusCategory(sale);
  const base = size === "sm" ? "text-[10px] px-2.5 py-0.5" : "text-xs px-3.5 py-1.5";
  if (cat === "active")
    return (
      <Badge className={`bg-accent text-accent-foreground border-none shadow-lg shadow-accent/40 ${base}`}>
        <span className="relative flex h-2 w-2 mr-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-foreground opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-foreground" />
        </span>
        Em viagem
      </Badge>
    );
  if (cat === "upcoming")
    return <Badge className={`bg-white/15 text-white border-none backdrop-blur-md shadow-lg ${base}`}>Próxima</Badge>;
  return <Badge className={`bg-white/10 text-white/50 border-none ${base}`}>Concluída</Badge>;
}

/* ═══ Netflix Shelf ═══ */
function TripShelf({ title, emoji, trips, onOpen }: {
  title: string; emoji: string; trips: any[]; onOpen: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [canL, setCanL] = useState(false);
  const [canR, setCanR] = useState(false);

  const check = () => {
    const el = ref.current;
    if (!el) return;
    setCanL(el.scrollLeft > 10);
    setCanR(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  };

  useEffect(() => {
    check();
    const el = ref.current;
    el?.addEventListener("scroll", check);
    window.addEventListener("resize", check);
    return () => { el?.removeEventListener("scroll", check); window.removeEventListener("resize", check); };
  }, [trips]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="relative"
    >
      <div className="flex items-center justify-between mb-5 px-1">
        <h3 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
          <span className="text-lg">{emoji}</span> {title}
        </h3>
        <div className="hidden sm:flex items-center gap-1.5">
          <button onClick={() => ref.current?.scrollBy({ left: -380, behavior: "smooth" })} disabled={!canL}
            className="w-9 h-9 rounded-full bg-card/80 border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-card disabled:opacity-20 transition-all backdrop-blur-sm">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={() => ref.current?.scrollBy({ left: 380, behavior: "smooth" })} disabled={!canR}
            className="w-9 h-9 rounded-full bg-card/80 border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-card disabled:opacity-20 transition-all backdrop-blur-sm">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Gradient fade edges */}
      {canL && <div className="absolute left-0 top-14 bottom-0 w-12 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />}
      {canR && <div className="absolute right-0 top-14 bottom-0 w-12 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />}

      <div
        ref={ref}
        className="flex gap-4 sm:gap-5 overflow-x-auto pb-4 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 snap-x snap-mandatory"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {trips.map((trip, i) => (
          <CinemaCard key={trip.id || i} trip={trip} onOpen={onOpen} index={i} />
        ))}
      </div>
    </motion.section>
  );
}

/* ═══ Cinema Card ═══ */
function CinemaCard({ trip, onOpen, index }: { trip: any; onOpen: (id: string) => void; index: number }) {
  const [hovered, setHovered] = useState(false);
  const dep = trip.sale?.departure_date ? new Date(trip.sale.departure_date + "T00:00:00") : null;
  const ret = trip.sale?.return_date ? new Date(trip.sale.return_date + "T23:59:59") : null;
  const now = new Date();
  const daysUntil = dep ? Math.ceil((dep.getTime() - now.getTime()) / 86400000) : null;
  const tripDays = dep && ret ? Math.ceil((ret.getTime() - dep.getTime()) / 86400000) : null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
      className="flex-shrink-0 w-[300px] sm:w-[360px] lg:w-[400px] snap-start cursor-pointer group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onOpen(trip.sale_id)}
    >
      <motion.div
        whileHover={{ scale: 1.04, y: -8 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="relative aspect-[16/10] rounded-2xl overflow-hidden shadow-xl group-hover:shadow-2xl group-hover:shadow-accent/15 transition-all duration-500"
      >
        <img
          src={getImg(trip.sale?.destination_iata, trip.cover_image_url)}
          alt=""
          className="w-full h-full object-cover transition-transform duration-[1200ms] group-hover:scale-110"
        />
        {/* Multi-layer gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent" />

        {/* Top */}
        <div className="absolute top-3 sm:top-4 left-3 sm:left-4 right-3 sm:right-4 flex items-start justify-between">
          <StatusBadge sale={trip.sale} size="sm" />
          {daysUntil !== null && daysUntil > 0 && daysUntil <= 90 && (
            <div className="bg-black/40 backdrop-blur-xl text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 border border-white/10">
              <Timer className="h-3 w-3" />
              {daysUntil}d
            </div>
          )}
        </div>

        {/* Bottom info */}
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
          <h4 className="font-bold text-white text-lg sm:text-xl leading-tight drop-shadow-xl line-clamp-2 tracking-tight">
            {trip.custom_title || trip.sale?.name || "Viagem"}
          </h4>
          <div className="flex items-center gap-3 mt-2.5 text-white/50 text-xs">
            {trip.sale?.origin_iata && trip.sale?.destination_iata && (
              <span className="font-mono tracking-widest text-white/70">{trip.sale.origin_iata} → {trip.sale.destination_iata}</span>
            )}
            {trip.sale?.departure_date && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {fmtShort(trip.sale.departure_date)}
              </span>
            )}
            {tripDays && <span>{tripDays}d</span>}
          </div>
        </div>

        {/* Hover: preview overlay */}
        <AnimatePresence>
          {hovered && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center gap-4"
            >
              <motion.div
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.05, type: "spring", stiffness: 300 }}
                className="w-14 h-14 rounded-full bg-accent flex items-center justify-center shadow-2xl shadow-accent/40"
              >
                <Compass className="h-7 w-7 text-accent-foreground" />
              </motion.div>
              <motion.span
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-white font-bold text-base tracking-tight"
              >
                Explorar viagem
              </motion.span>
              {/* Mini stats */}
              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.15 }}
                className="flex items-center gap-4 text-white/60 text-xs"
              >
                {trip.sale?.departure_date && (
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {fmtShort(trip.sale.departure_date)} – {fmtShort(trip.sale.return_date)}</span>
                )}
                {tripDays && <span>{tripDays} dias</span>}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

/* ═══ Quick Action ═══ */
function QuickAction({ icon: Icon, label, onClick, delay }: {
  icon: any; label: string; onClick: () => void; delay: number;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: "spring", stiffness: 200 }}
      onClick={onClick}
      className="group flex flex-col items-center gap-3 p-5 sm:p-6 rounded-2xl bg-card/60 border border-border/40 backdrop-blur-sm hover:border-accent/30 hover:bg-card/80 hover:shadow-xl hover:shadow-accent/5 transition-all duration-300"
    >
      <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 group-hover:scale-110 transition-all duration-300">
        <Icon className="h-7 w-7 text-accent" />
      </div>
      <p className="text-xs font-bold text-foreground tracking-wide">{label}</p>
    </motion.button>
  );
}

/* ═══ MAIN DASHBOARD ═══ */
export default function PortalDashboard() {
  const { portalAccess } = usePortalAuth();
  const navigate = useNavigate();
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrips = async () => {
      try {
        const { data } = await supabase.functions.invoke("portal-api", { body: { action: "trips" } });
        const apiTrips = data?.trips || [];
        const mockTrips = getMockTripsForDashboard();
        const existingIds = new Set(apiTrips.map((t: any) => t.sale_id));
        const newMocks = mockTrips.filter((m) => !existingIds.has(m.sale_id));
        setTrips([...apiTrips, ...newMocks]);
      } catch {
        setTrips(getMockTripsForDashboard());
      } finally {
        setLoading(false);
      }
    };
    fetchTrips();
  }, []);

  const nextTrip = useMemo(() =>
    trips.find((t) => getStatusCategory(t.sale) === "upcoming") ||
    trips.find((t) => getStatusCategory(t.sale) === "active"),
  [trips]);

  const categorized = useMemo(() => ({
    upcoming: trips.filter((t) => getStatusCategory(t.sale) === "upcoming"),
    active: trips.filter((t) => getStatusCategory(t.sale) === "active"),
    past: trips.filter((t) => getStatusCategory(t.sale) === "past"),
  }), [trips]);

  if (loading) {
    return (
      <PortalLayout>
        <div className="flex items-center justify-center py-40">
          <div className="flex flex-col items-center gap-5">
            <div className="w-12 h-12 border-[3px] border-accent/20 border-t-accent rounded-full animate-spin" />
            <p className="text-muted-foreground text-sm tracking-wide">Carregando suas jornadas...</p>
          </div>
        </div>
      </PortalLayout>
    );
  }

  if (trips.length === 0) {
    return (
      <PortalLayout>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-40">
          <Plane className="h-24 w-24 text-muted-foreground/15 mx-auto mb-8" />
          <h2 className="text-3xl font-bold text-foreground mb-4 tracking-tight">Nenhuma jornada ainda</h2>
          <p className="text-muted-foreground text-sm max-w-md mx-auto leading-relaxed">
            Suas viagens aparecerão aqui assim que forem publicadas pela equipe NatLeva.
          </p>
        </motion.div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout>
      <div className="-mx-4 sm:-mx-6 lg:-mx-8 -mt-6 sm:-mt-8">
        {/* ═══════════ FULLSCREEN HERO ═══════════ */}
        {nextTrip && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
          >
            <div
              className="relative overflow-hidden h-[85vh] min-h-[500px] max-h-[800px] cursor-pointer group"
              onClick={() => navigate(`/portal/viagem/${nextTrip.sale_id}`)}
            >
              {/* Background image with slow zoom */}
              <motion.img
                src={getImg(nextTrip.sale?.destination_iata, nextTrip.cover_image_url)}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
                initial={{ scale: 1.05 }}
                animate={{ scale: 1 }}
                transition={{ duration: 20, ease: "linear", repeat: Infinity, repeatType: "reverse" }}
              />

              {/* Cinematic overlays */}
              <div className="absolute inset-0 bg-gradient-to-t from-background via-black/50 to-black/20" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/20 to-transparent" />
              {/* Bottom fade into content */}
              <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background to-transparent" />

              {/* Content */}
              <div className="absolute inset-0 flex flex-col justify-end px-4 sm:px-6 lg:px-8 pb-12 sm:pb-16 max-w-7xl mx-auto w-full">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.7 }}
                  className="max-w-2xl"
                >
                  <StatusBadge sale={nextTrip.sale} />

                  <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-white mt-5 leading-[0.95] tracking-tighter">
                    {nextTrip.custom_title || nextTrip.sale?.name || "Sua próxima jornada"}
                  </h1>

                  {/* Route pills */}
                  <div className="flex flex-wrap items-center gap-3 mt-5">
                    {nextTrip.sale?.origin_iata && nextTrip.sale?.destination_iata && (
                      <div className="flex items-center gap-2.5 bg-white/[0.08] backdrop-blur-xl text-white/80 text-sm px-4 py-2 rounded-full border border-white/[0.08]">
                        <span className="font-mono tracking-[0.2em] text-white font-bold">{nextTrip.sale.origin_iata}</span>
                        <ArrowRight className="h-3.5 w-3.5 text-accent" />
                        <span className="font-mono tracking-[0.2em] text-white font-bold">{nextTrip.sale.destination_iata}</span>
                      </div>
                    )}
                    {nextTrip.sale?.departure_date && (
                      <div className="flex items-center gap-2 bg-white/[0.08] backdrop-blur-xl text-white/70 text-sm px-4 py-2 rounded-full border border-white/[0.08]">
                        <Calendar className="h-3.5 w-3.5" />
                        {fmtShort(nextTrip.sale.departure_date)} — {fmtShort(nextTrip.sale.return_date)}
                      </div>
                    )}
                  </div>

                  {/* Countdown */}
                  {nextTrip.sale?.departure_date && getStatusCategory(nextTrip.sale) === "upcoming" && (
                    <div className="mt-8">
                      <CinemaCountdown departureDate={nextTrip.sale.departure_date} />
                    </div>
                  )}

                  {getStatusCategory(nextTrip.sale) === "active" && (
                    <div className="mt-8 flex items-center gap-3">
                      <span className="relative flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-accent" />
                      </span>
                      <span className="text-white font-bold text-xl">Viagem em andamento</span>
                    </div>
                  )}

                  {/* CTA */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                    className="mt-8"
                  >
                    <span className="inline-flex items-center gap-3 text-white text-sm font-bold bg-accent hover:bg-accent/90 px-8 py-4 rounded-full transition-all shadow-2xl shadow-accent/30 group-hover:shadow-accent/50 group-hover:scale-105">
                      <Compass className="h-5 w-5" />
                      Explorar viagem
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </motion.div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ═══════════ CONTENT ═══════════ */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 py-8 sm:py-12">

          {/* ── Quick Actions ── */}
          <div className="grid grid-cols-4 gap-3 sm:gap-4">
            {[
              { icon: FileText, label: "Documentos", delay: 0.05 },
              { icon: DollarSign, label: "Financeiro", delay: 0.1 },
              { icon: CheckSquare, label: "Checklist", delay: 0.15 },
              { icon: MessageCircle, label: "Suporte", delay: 0.2 },
            ].map((item) => (
              <QuickAction
                key={item.label}
                icon={item.icon}
                label={item.label}
                delay={item.delay}
                onClick={() => {
                  if (item.label === "Suporte") window.open("https://wa.me/5511999999999", "_blank");
                  else if (nextTrip) navigate(`/portal/viagem/${nextTrip.sale_id}`);
                }}
              />
            ))}
          </div>

          {/* ── Shelves ── */}
          {categorized.active.length > 0 && (
            <TripShelf emoji="🔥" title="Em viagem agora" trips={categorized.active} onOpen={(id) => navigate(`/portal/viagem/${id}`)} />
          )}
          {categorized.upcoming.length > 0 && (
            <TripShelf emoji="✈️" title="Próximas jornadas" trips={categorized.upcoming} onOpen={(id) => navigate(`/portal/viagem/${id}`)} />
          )}
          {categorized.past.length > 0 && (
            <TripShelf emoji="🌍" title="Memórias de viagem" trips={categorized.past} onOpen={(id) => navigate(`/portal/viagem/${id}`)} />
          )}
        </div>
      </div>
    </PortalLayout>
  );
}
