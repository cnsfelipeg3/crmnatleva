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
  Clock, CheckSquare, Eye, Luggage,
} from "lucide-react";
import { iataToLabel } from "@/lib/iataUtils";
import { getMockTripsForDashboard } from "@/lib/portalMockTrips";

/* ── helpers ── */
function getStatusCategory(sale: any): "upcoming" | "active" | "past" {
  const dep = sale?.departure_date ? new Date(sale.departure_date + "T00:00:00") : null;
  const ret = sale?.return_date ? new Date(sale.return_date + "T23:59:59") : null;
  const now = new Date();
  if (dep && dep > now) return "upcoming";
  if (dep && ret && dep <= now && ret >= now) return "active";
  return "past";
}

const destinationImages: Record<string, string> = {
  MCO: "https://images.unsplash.com/photo-1575089976121-8ed7b2a54265?w=1200&h=600&fit=crop",
  MIA: "https://images.unsplash.com/photo-1533106497176-45ae19e68ba2?w=1200&h=600&fit=crop",
  LIS: "https://images.unsplash.com/photo-1585208798174-6cedd86e019a?w=1200&h=600&fit=crop",
  CDG: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1200&h=600&fit=crop",
  FCO: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=1200&h=600&fit=crop",
  CUN: "https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?w=1200&h=600&fit=crop",
  default: "https://images.unsplash.com/photo-1488085061387-422e29b40080?w=1200&h=600&fit=crop",
};

function getImg(iata: string | null, cover: string | null) {
  if (cover) return cover;
  if (iata && destinationImages[iata]) return destinationImages[iata];
  return destinationImages.default;
}

function formatDateShort(d: string | null) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

/* ── Countdown ── */
function HeroCountdown({ departureDate }: { departureDate: string }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const dep = new Date(departureDate + "T00:00:00");
  const diff = dep.getTime() - now.getTime();
  if (diff <= 0) {
    return (
      <div className="flex items-center gap-2">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-accent" />
        </span>
        <span className="text-white font-semibold text-lg">Viagem em andamento!</span>
      </div>
    );
  }

  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);

  return (
    <div>
      <p className="text-white/50 text-[11px] uppercase tracking-[0.2em] mb-2 font-medium">Embarque em</p>
      <div className="flex items-center gap-2">
        {[
          { val: days, label: "dias" },
          { val: hours, label: "hrs" },
          { val: mins, label: "min" },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-1">
            <div className="bg-white/10 backdrop-blur-md text-white font-bold text-2xl sm:text-3xl px-3 sm:px-4 py-2 rounded-xl min-w-[56px] text-center tabular-nums border border-white/10">
              {item.val}
            </div>
            <span className="text-white/40 text-[10px] uppercase">{item.label}</span>
            {i < 2 && <span className="text-white/20 text-xl mx-0.5">:</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Status Badge ── */
function StatusBadge({ sale }: { sale: any }) {
  const cat = getStatusCategory(sale);
  if (cat === "active")
    return (
      <Badge className="bg-accent text-accent-foreground border-none shadow-lg shadow-accent/30 text-xs px-3 py-1">
        <span className="relative flex h-2 w-2 mr-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-foreground opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-accent-foreground" /></span>
        Em viagem
      </Badge>
    );
  if (cat === "upcoming")
    return <Badge className="bg-info/90 text-info-foreground border-none shadow-lg shadow-info/20 text-xs px-3 py-1">Próxima viagem</Badge>;
  return <Badge className="bg-muted/80 text-muted-foreground border-none text-xs px-3 py-1">Concluída</Badge>;
}

/* ── Netflix-style shelf ── */
function TripShelf({ title, icon: Icon, trips, onOpen, accentColor }: {
  title: string; icon: any; trips: any[]; onOpen: (id: string) => void; accentColor?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    el?.addEventListener("scroll", checkScroll);
    window.addEventListener("resize", checkScroll);
    return () => { el?.removeEventListener("scroll", checkScroll); window.removeEventListener("resize", checkScroll); };
  }, [trips]);

  const scroll = (dir: number) => {
    scrollRef.current?.scrollBy({ left: dir * 340, behavior: "smooth" });
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2.5">
          <Icon className="h-5 w-5 text-accent" />
          <h3 className="text-lg font-bold text-foreground tracking-tight">{title}</h3>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{trips.length}</span>
        </div>
        <div className="hidden sm:flex items-center gap-1">
          <button
            onClick={() => scroll(-1)}
            disabled={!canScrollLeft}
            className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-20 transition-all"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => scroll(1)}
            disabled={!canScrollRight}
            className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-20 transition-all"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 snap-x snap-mandatory"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {trips.map((trip, i) => (
          <TripCard key={trip.id || i} trip={trip} onOpen={onOpen} />
        ))}
      </div>
    </motion.section>
  );
}

/* ── Trip Card (Netflix-style) ── */
function TripCard({ trip, onOpen }: { trip: any; onOpen: (id: string) => void }) {
  const [hovered, setHovered] = useState(false);
  const dep = trip.sale?.departure_date ? new Date(trip.sale.departure_date + "T00:00:00") : null;
  const now = new Date();
  const daysUntil = dep ? Math.ceil((dep.getTime() - now.getTime()) / 86400000) : null;

  return (
    <motion.div
      className="flex-shrink-0 w-[280px] sm:w-[320px] snap-start cursor-pointer group relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onOpen(trip.sale_id)}
      whileHover={{ scale: 1.03, zIndex: 10 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
    >
      <div className="relative aspect-[16/10] rounded-xl overflow-hidden shadow-lg group-hover:shadow-2xl group-hover:shadow-accent/10 transition-shadow duration-500">
        <img
          src={getImg(trip.sale?.destination_iata, trip.cover_image_url)}
          alt=""
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

        {/* Top badges */}
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
          <StatusBadge sale={trip.sale} />
          {daysUntil !== null && daysUntil > 0 && daysUntil <= 90 && (
            <div className="bg-black/50 backdrop-blur-md text-white text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 border border-white/10">
              <Timer className="h-3 w-3" />
              {daysUntil}d
            </div>
          )}
        </div>

        {/* Bottom info */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h4 className="font-bold text-white text-base leading-tight drop-shadow-lg line-clamp-2">
            {trip.custom_title || trip.sale?.name || "Viagem"}
          </h4>
          <div className="flex items-center gap-3 mt-2 text-white/60 text-xs">
            {trip.sale?.origin_iata && trip.sale?.destination_iata && (
              <span className="flex items-center gap-1 font-mono tracking-wider">
                {trip.sale.origin_iata} → {trip.sale.destination_iata}
              </span>
            )}
            {trip.sale?.departure_date && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDateShort(trip.sale.departure_date)}
                {trip.sale.return_date && ` – ${formatDateShort(trip.sale.return_date)}`}
              </span>
            )}
          </div>
        </div>

        {/* Hover overlay with actions */}
        <AnimatePresence>
          {hovered && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center"
            >
              <div className="flex items-center gap-3">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.05 }}
                  className="bg-accent text-accent-foreground rounded-full p-3 shadow-xl shadow-accent/30"
                >
                  <Eye className="h-5 w-5" />
                </motion.div>
                <motion.span
                  initial={{ x: -10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="text-white font-semibold text-sm"
                >
                  Ver detalhes
                </motion.span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/* ── Quick Action Card ── */
function QuickAction({ icon: Icon, label, desc, onClick, delay }: {
  icon: any; label: string; desc: string; onClick: () => void; delay: number;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: "spring", stiffness: 200 }}
      onClick={onClick}
      className="group relative overflow-hidden rounded-2xl bg-card border border-border p-5 text-left transition-all duration-300 hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="relative">
        <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent/20 group-hover:scale-110 transition-all duration-300">
          <Icon className="h-6 w-6 text-accent" />
        </div>
        <p className="text-sm font-bold text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-1">{desc}</p>
      </div>
    </motion.button>
  );
}

/* ── Main Dashboard ── */
export default function PortalDashboard() {
  const { portalAccess } = usePortalAuth();
  const navigate = useNavigate();
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrips = async () => {
      try {
        const { data } = await supabase.functions.invoke("portal-api", {
          body: { action: "trips" },
        });
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

  const nextTrip = useMemo(() => {
    return trips.find((t) => getStatusCategory(t.sale) === "upcoming") ||
      trips.find((t) => getStatusCategory(t.sale) === "active");
  }, [trips]);

  const categorized = useMemo(() => ({
    upcoming: trips.filter((t) => getStatusCategory(t.sale) === "upcoming"),
    active: trips.filter((t) => getStatusCategory(t.sale) === "active"),
    past: trips.filter((t) => getStatusCategory(t.sale) === "past"),
  }), [trips]);

  return (
    <PortalLayout>
      {loading ? (
        <div className="flex items-center justify-center py-32">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-[3px] border-accent/20 border-t-accent rounded-full animate-spin" />
            <p className="text-muted-foreground text-sm">Carregando suas viagens...</p>
          </div>
        </div>
      ) : trips.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-32">
          <Plane className="h-20 w-20 text-muted-foreground/20 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-foreground mb-3">Nenhuma viagem disponível</h2>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Suas viagens aparecerão aqui assim que forem publicadas pela equipe NatLeva.
          </p>
        </motion.div>
      ) : (
        <div className="space-y-10">
          {/* ── HERO ── */}
          {nextTrip && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
            >
              <div
                className="relative overflow-hidden rounded-2xl sm:rounded-3xl h-[420px] sm:h-[480px] lg:h-[520px] cursor-pointer group"
                onClick={() => navigate(`/portal/viagem/${nextTrip.sale_id}`)}
              >
                {/* Image with zoom */}
                <img
                  src={getImg(nextTrip.sale?.destination_iata, nextTrip.cover_image_url)}
                  alt="Destino"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1200ms] group-hover:scale-105"
                />

                {/* Cinematic overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-transparent" />

                {/* Content */}
                <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-10 lg:p-12">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                  >
                    <StatusBadge sale={nextTrip.sale} />

                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mt-4 leading-[1.1] tracking-tight max-w-2xl">
                      {nextTrip.custom_title || nextTrip.sale?.name || "Sua próxima viagem"}
                    </h1>

                    <div className="flex flex-wrap items-center gap-4 mt-4 text-white/60 text-sm">
                      {nextTrip.sale?.origin_iata && nextTrip.sale?.destination_iata && (
                        <span className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/10">
                          <MapPin className="h-3.5 w-3.5" />
                          <span className="font-mono tracking-wider">{nextTrip.sale.origin_iata}</span>
                          <ArrowRight className="h-3 w-3" />
                          <span className="font-mono tracking-wider">{nextTrip.sale.destination_iata}</span>
                        </span>
                      )}
                      {nextTrip.sale?.departure_date && (
                        <span className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/10">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDateShort(nextTrip.sale.departure_date)}
                          {nextTrip.sale.return_date && ` — ${formatDateShort(nextTrip.sale.return_date)}`}
                        </span>
                      )}
                    </div>

                    {nextTrip.sale?.departure_date && getStatusCategory(nextTrip.sale) === "upcoming" && (
                      <div className="mt-6">
                        <HeroCountdown departureDate={nextTrip.sale.departure_date} />
                      </div>
                    )}

                    <div className="mt-6">
                      <span className="inline-flex items-center gap-2 text-white text-sm font-semibold bg-accent hover:bg-accent/90 px-6 py-3 rounded-full transition-all shadow-xl shadow-accent/20 group-hover:shadow-accent/40">
                        Ver detalhes da viagem
                        <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </span>
                    </div>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── QUICK ACTIONS ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {[
              { icon: FileText, label: "Documentos", desc: "Vouchers e bilhetes", delay: 0.1 },
              { icon: DollarSign, label: "Financeiro", desc: "Pagamentos e parcelas", delay: 0.15 },
              { icon: CheckSquare, label: "Checklist", desc: "Preparação da viagem", delay: 0.2 },
              { icon: MessageCircle, label: "Suporte", desc: "Falar com NatLeva", delay: 0.25 },
            ].map((item) => (
              <QuickAction
                key={item.label}
                {...item}
                onClick={() => {
                  if (item.label === "Suporte") window.open("https://wa.me/5511999999999", "_blank");
                  else if (nextTrip) navigate(`/portal/viagem/${nextTrip.sale_id}`);
                }}
              />
            ))}
          </div>

          {/* ── TRIP SHELVES (Netflix-style) ── */}
          {categorized.active.length > 0 && (
            <TripShelf
              title="Em viagem agora"
              icon={Sparkles}
              trips={categorized.active}
              onOpen={(id) => navigate(`/portal/viagem/${id}`)}
            />
          )}

          {categorized.upcoming.length > 0 && (
            <TripShelf
              title="Próximas viagens"
              icon={Plane}
              trips={categorized.upcoming}
              onOpen={(id) => navigate(`/portal/viagem/${id}`)}
            />
          )}

          {categorized.past.length > 0 && (
            <TripShelf
              title="Viagens anteriores"
              icon={Clock}
              trips={categorized.past}
              onOpen={(id) => navigate(`/portal/viagem/${id}`)}
            />
          )}
        </div>
      )}
    </PortalLayout>
  );
}
