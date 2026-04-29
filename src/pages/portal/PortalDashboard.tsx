import { useState, useEffect, useMemo, Suspense, lazy } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import PortalLayout from "@/components/portal/PortalLayout";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plane, ArrowRight, FileText, DollarSign,
  MessageCircle, CheckSquare, Compass, Globe2,
  MapPin, Calendar, Star, TrendingUp, Sparkles,
} from "lucide-react";
import { getMockTripsForDashboard } from "@/lib/portalMockTrips";
import {
  getDestinationImage, getTripStatus, TripStatusBadge,
  Countdown, TripShelf,
} from "@/components/travel-ui";
import { CurrencySummary } from "@/components/portal/CurrencyPanel";

const GlobeScene = lazy(() => import("@/components/portal/GlobeScene"));
import LazyViewportTravelMap from "@/components/maps/LazyViewportTravelMap";
import { getIataCoords } from "@/components/maps/iataCoords";

/* ═══ Quick Action ═══ */
function QuickAction({ icon: Icon, label, subtitle, onClick, delay, gradient }: {
  icon: any; label: string; subtitle?: string; onClick: () => void; delay: number; gradient: string;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: "spring", stiffness: 200 }}
      whileHover={{ scale: 1.04, y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="group relative flex flex-col items-center gap-2.5 p-5 rounded-2xl bg-card/60 border border-border/30 backdrop-blur-sm hover:border-accent/20 hover:shadow-xl hover:shadow-accent/5 transition-all duration-300 overflow-hidden"
    >
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${gradient}`} />
      <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 group-hover:scale-110 transition-all duration-300 relative z-10">
        <Icon className="h-6 w-6 text-accent" />
      </div>
      <div className="text-center relative z-10">
        <p className="text-xs font-bold text-foreground tracking-wide">{label}</p>
        {subtitle && <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
    </motion.button>
  );
}

/* ═══ TRAVEL STATS ═══ */
function TravelStats({ trips }: { trips: any[] }) {
  const destinations = new Set(trips.map(t => t.sale?.destination_iata).filter(Boolean));
  const totalFlights = trips.reduce((sum, t) => sum + (t.segments_count || 0), 0);
  const completedTrips = trips.filter(t => getTripStatus(t.sale || {}) === "past").length;

  if (destinations.size === 0 && completedTrips === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="grid grid-cols-3 gap-3 mb-8"
    >
      {[
        { value: destinations.size, label: "Destinos", icon: MapPin },
        { value: completedTrips, label: "Viagens", icon: Plane },
        { value: totalFlights || trips.length, label: "Jornadas", icon: Star },
      ].map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 + i * 0.06 }}
          className="flex flex-col items-center gap-1 py-4 rounded-2xl bg-card/40 border border-border/20 backdrop-blur-sm"
        >
          <stat.icon className="h-4 w-4 text-accent/60 mb-0.5" />
          <p className="text-2xl font-black text-foreground tabular-nums">{stat.value}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-[0.15em]">{stat.label}</p>
        </motion.div>
      ))}
    </motion.div>
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
    trips.find((t) => getTripStatus(t.sale || {}) === "upcoming") ||
    trips.find((t) => getTripStatus(t.sale || {}) === "active"),
  [trips]);

  const categorized = useMemo(() => ({
    upcoming: trips.filter((t) => getTripStatus(t.sale || {}) === "upcoming"),
    active: trips.filter((t) => getTripStatus(t.sale || {}) === "active"),
    past: trips.filter((t) => getTripStatus(t.sale || {}) === "past"),
  }), [trips]);

  const globeRoutes = useMemo(() => {
    return trips.map((t) => {
      const cities: string[] = [];
      if (t.sale?.origin_iata) cities.push(t.sale.origin_iata);
      if (t.sale?.destination_iata && !cities.includes(t.sale.destination_iata)) cities.push(t.sale.destination_iata);
      return {
        cities,
        status: getTripStatus(t.sale || {}),
        saleId: t.sale_id,
        label: t.custom_title || t.sale?.name || "Viagem",
      };
    }).filter((r) => r.cities.length >= 2);
  }, [trips]);

  if (loading) {
    return (
      <PortalLayout>
        <div className="flex items-center justify-center py-40 px-4">
          <div className="flex flex-col items-center gap-5">
            <div className="relative">
              <div className="w-14 h-14 border-[3px] border-accent/20 border-t-accent rounded-full animate-spin" />
              <Plane className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-5 w-5 text-accent/60" />
            </div>
            <p className="text-muted-foreground text-sm tracking-wide">Carregando suas jornadas...</p>
          </div>
        </div>
      </PortalLayout>
    );
  }

  if (trips.length === 0) {
    return (
      <PortalLayout>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-40 px-4">
          <div className="w-24 h-24 rounded-3xl bg-muted/20 flex items-center justify-center mx-auto mb-8">
            <Plane className="h-12 w-12 text-muted-foreground/20" />
          </div>
          <h2 className="text-3xl font-bold text-foreground mb-4 tracking-tight">Nenhuma jornada ainda</h2>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Suas viagens aparecerão aqui assim que forem publicadas pela equipe NatLeva.
          </p>
        </motion.div>
      </PortalLayout>
    );
  }

  const fmtShort = (d: string | null) => {
    if (!d) return "—";
    return new Date(d + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  };

  const nextStatus = nextTrip ? getTripStatus(nextTrip.sale || {}) : "past";

  return (
    <PortalLayout>
      <div>

        {/* ═══════════ GLOBE + HERO SECTION ═══════════ */}
        <div className="relative overflow-hidden bg-gradient-to-b from-[hsl(160,30%,3%)] via-[hsl(160,25%,6%)] to-background">
          {/* Ambient effects */}
          <div className="absolute inset-0 opacity-[0.02]" style={{
            backgroundImage: "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }} />
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[200px] opacity-30" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-info/8 rounded-full blur-[180px] opacity-20" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 lg:gap-8 items-center min-h-[85vh]">
              {/* Left: Trip Info */}
              <motion.div
                initial={{ opacity: 0, x: -40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="relative z-10 py-12 lg:py-0"
              >
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex items-center gap-2 mb-8"
                >
                  <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center">
                    <Globe2 className="h-4 w-4 text-accent" />
                  </div>
                  <span className="text-accent/70 text-xs uppercase tracking-[0.2em] font-bold">Explorar jornadas</span>
                </motion.div>

                {nextTrip && (
                  <>
                    <TripStatusBadge status={nextStatus} />

                    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mt-5 leading-[0.92] tracking-tighter">
                      {nextTrip.custom_title || nextTrip.sale?.name || "Sua próxima jornada"}
                    </h1>

                    <div className="flex flex-wrap items-center gap-3 mt-6">
                      {nextTrip.sale?.origin_iata && nextTrip.sale?.destination_iata && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.5 }}
                          className="flex items-center gap-3 bg-white/[0.06] backdrop-blur-xl text-white/80 text-sm px-5 py-2.5 rounded-full border border-white/[0.08]"
                        >
                          <span className="font-mono tracking-[0.2em] text-white font-bold">{nextTrip.sale.origin_iata}</span>
                          <div className="flex items-center">
                            <div className="w-8 h-px bg-gradient-to-r from-white/20 to-accent" />
                            <Plane className="h-3.5 w-3.5 text-accent mx-1 rotate-90" />
                            <div className="w-8 h-px bg-gradient-to-r from-accent to-white/20" />
                          </div>
                          <span className="font-mono tracking-[0.2em] text-white font-bold">{nextTrip.sale.destination_iata}</span>
                        </motion.div>
                      )}
                      {nextTrip.sale?.departure_date && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.55 }}
                          className="flex items-center gap-2 bg-white/[0.06] backdrop-blur-xl text-white/60 text-sm px-4 py-2.5 rounded-full border border-white/[0.06]"
                        >
                          <Calendar className="h-3.5 w-3.5 text-white/40" />
                          {fmtShort(nextTrip.sale.departure_date)} · {fmtShort(nextTrip.sale.return_date)}
                        </motion.div>
                      )}
                    </div>

                    {nextTrip.sale?.departure_date && nextStatus === "upcoming" && (
                      <div className="mt-8">
                        <Countdown departureDate={nextTrip.sale.departure_date} />
                      </div>
                    )}
                    {nextStatus === "active" && (
                      <div className="mt-8 flex items-center gap-3">
                        <span className="relative flex h-4 w-4">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                          <span className="relative inline-flex rounded-full h-4 w-4 bg-accent" />
                        </span>
                        <span className="text-white font-bold text-xl">Viagem em andamento</span>
                      </div>
                    )}

                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.9 }}
                      className="mt-10"
                    >
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => navigate(`/portal/viagem/${nextTrip.sale_id}`)}
                        className="inline-flex items-center gap-3 text-white text-sm font-bold bg-accent hover:bg-accent/90 px-8 py-4 rounded-full transition-all shadow-2xl shadow-accent/30"
                      >
                        <Compass className="h-5 w-5" />
                        Explorar viagem
                        <ArrowRight className="h-4 w-4" />
                      </motion.button>
                    </motion.div>
                  </>
                )}
              </motion.div>

              {/* Right: Destination Showcase */}
              <motion.div
                initial={{ opacity: 0, scale: 0.85, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 1.2, delay: 0.4, type: "spring", stiffness: 80 }}
                className="relative hidden lg:flex items-center justify-center"
              >
                {/* Ambient glow behind card */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-[420px] h-[420px] rounded-full bg-accent/8 blur-[120px]" />
                </div>

                {nextTrip && (
                  <motion.div
                    className="relative w-[480px] h-[540px] rounded-[2.5rem] overflow-hidden shadow-2xl shadow-black/40 border border-white/[0.08] group cursor-pointer"
                    whileHover={{ scale: 1.03, rotateY: -2 }}
                    transition={{ type: "spring", stiffness: 200 }}
                    onClick={() => navigate(`/portal/viagem/${nextTrip.sale_id}`)}
                  >
                    {/* Destination image */}
                    <motion.img
                      src={getDestinationImage(nextTrip.sale?.destination_iata, nextTrip.cover_image_url)}
                      alt={nextTrip.custom_title || nextTrip.sale?.name || "Destino"}
                      className="absolute inset-0 w-full h-full object-cover"
                      initial={{ scale: 1.1 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 20, ease: "linear", repeat: Infinity, repeatType: "reverse" }}
                    />

                    {/* Gradient overlays */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                    {/* Bottom content */}
                    <div className="absolute bottom-0 left-0 right-0 p-8">
                      <div className="flex items-center gap-2 mb-3">
                        <MapPin className="h-3.5 w-3.5 text-accent" />
                        <span className="text-accent text-xs font-bold uppercase tracking-[0.2em]">
                          {nextTrip.sale?.destination_iata || "Destino"}
                        </span>
                      </div>
                      <h3 className="text-2xl font-black text-white leading-tight tracking-tight">
                        {nextTrip.custom_title || nextTrip.sale?.name || "Sua próxima aventura"}
                      </h3>
                      <p className="text-white/40 text-sm mt-2 font-light">
                        {fmtShort(nextTrip.sale?.departure_date)} · {fmtShort(nextTrip.sale?.return_date)}
                      </p>

                      {/* Explore hint */}
                      <div className="flex items-center gap-2 mt-5 text-accent/80 text-xs font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                        <Sparkles className="h-3.5 w-3.5" />
                        Explorar destino
                        <ArrowRight className="h-3 w-3" />
                      </div>
                    </div>

                    {/* Top decorative badge */}
                    <div className="absolute top-6 right-6">
                      <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-xl flex items-center justify-center border border-white/10">
                        <Plane className="h-5 w-5 text-white/80 rotate-45" />
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>

              {/* Mobile: destination image */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="lg:hidden relative aspect-[16/9] overflow-hidden rounded-2xl mt-4 mb-8"
              >
                {nextTrip && (
                  <>
                    <img
                      src={getDestinationImage(nextTrip.sale?.destination_iata, nextTrip.cover_image_url)}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[hsl(160,25%,6%)] via-transparent to-transparent" />
                  </>
                )}
              </motion.div>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
        </div>

        {/* ═══════════ CONTENT ═══════════ */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 py-8 sm:py-12">

          {/* Quick Actions */}
          <div className="grid grid-cols-4 gap-3 sm:gap-4">
            {[
              { icon: FileText, label: "Documentos", subtitle: "Vouchers e PDFs", delay: 0.05, gradient: "bg-gradient-to-b from-info/[0.03] to-transparent" },
              { icon: DollarSign, label: "Financeiro", subtitle: "Parcelas", delay: 0.1, gradient: "bg-gradient-to-b from-success/[0.03] to-transparent" },
              { icon: CheckSquare, label: "Checklist", subtitle: "Preparação", delay: 0.15, gradient: "bg-gradient-to-b from-warning/[0.03] to-transparent" },
              { icon: MessageCircle, label: "Suporte", subtitle: "WhatsApp", delay: 0.2, gradient: "bg-gradient-to-b from-accent/[0.03] to-transparent" },
            ].map((item) => (
              <QuickAction
                key={item.label}
                icon={item.icon}
                label={item.label}
                subtitle={item.subtitle}
                delay={item.delay}
                gradient={item.gradient}
                onClick={() => {
                  if (item.label === "Suporte") window.open("https://wa.me/5511999999999", "_blank");
                  else if (nextTrip) navigate(`/portal/viagem/${nextTrip.sale_id}`);
                }}
              />
            ))}
          </div>

          {/* Travel Stats */}
          <TravelStats trips={trips} />

          {/* Currency Summary */}
          <CurrencySummary onExpand={() => navigate("/portal/financeiro?tab=cambio")} />

          {/* ═══ Journey Globe — Photorealistic 3D ═══ */}
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <Globe2 className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground tracking-tight">Journey Map</h2>
                <p className="text-xs text-muted-foreground">Explore suas rotas no mapa</p>
              </div>
              <span className="text-[10px] text-accent bg-accent/10 px-2.5 py-1 rounded-full font-mono font-bold ml-auto">Mapa</span>
            </div>
            <LazyViewportTravelMap
              className="h-[500px] lg:h-[600px] w-full"
              waypoints={[...categorized.upcoming, ...categorized.active, ...categorized.past]
                .map((t) => {
                  const coords = getIataCoords(t.sale?.destination_iata);
                  if (!coords) return null;
                  return {
                    id: t.id,
                    name: t.sale?.destination_iata ?? "Destino",
                    lat: coords.lat,
                    lng: coords.lng,
                    color: categorized.past.includes(t) ? "success" as const : "primary" as const,
                  };
                })
                .filter((w): w is NonNullable<typeof w> => w !== null)}
              onWaypointClick={(id) => navigate(`/portal/viagem/${id}`)}
            />
          </motion.section>

          {/* Recent trips preview — just top 3 upcoming */}
          {categorized.upcoming.length > 0 && (
            <TripShelf emoji="✈️" title="Próximas jornadas" trips={categorized.upcoming.slice(0, 3)} onOpen={(id) => navigate(`/portal/viagem/${id}`)} />
          )}
          {categorized.active.length > 0 && (
            <TripShelf emoji="🔥" title="Em viagem agora" trips={categorized.active} onOpen={(id) => navigate(`/portal/viagem/${id}`)} />
          )}
        </div>
      </div>
    </PortalLayout>
  );
}
