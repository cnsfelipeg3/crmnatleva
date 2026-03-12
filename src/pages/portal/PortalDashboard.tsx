import { useState, useEffect, useMemo, Suspense, lazy } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import PortalLayout from "@/components/portal/PortalLayout";
import { motion } from "framer-motion";
import {
  Plane, ArrowRight, FileText, DollarSign,
  MessageCircle, CheckSquare, Compass, Globe2,
} from "lucide-react";
import { getMockTripsForDashboard } from "@/lib/portalMockTrips";
import {
  getDestinationImage, getTripStatus, TripStatusBadge,
  Countdown, TripShelf,
} from "@/components/travel-ui";

const GlobeScene = lazy(() => import("@/components/portal/GlobeScene"));

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
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }} />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 lg:gap-8 items-center min-h-[85vh]">
              {/* Left: Trip Info */}
              <motion.div
                initial={{ opacity: 0, x: -40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="relative z-10 py-12 lg:py-0"
              >
                <div className="flex items-center gap-2 mb-6">
                  <Globe2 className="h-4 w-4 text-accent/60" />
                  <span className="text-accent/60 text-[10px] uppercase tracking-[0.3em] font-bold">Explorar jornadas</span>
                </div>

                {nextTrip && (
                  <>
                    <TripStatusBadge status={nextStatus} />

                    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mt-5 leading-[0.95] tracking-tighter">
                      {nextTrip.custom_title || nextTrip.sale?.name || "Sua próxima jornada"}
                    </h1>

                    <div className="flex flex-wrap items-center gap-3 mt-6">
                      {nextTrip.sale?.origin_iata && nextTrip.sale?.destination_iata && (
                        <div className="flex items-center gap-2.5 bg-white/[0.06] backdrop-blur-xl text-white/80 text-sm px-4 py-2 rounded-full border border-white/[0.06]">
                          <span className="font-mono tracking-[0.2em] text-white font-bold">{nextTrip.sale.origin_iata}</span>
                          <ArrowRight className="h-3.5 w-3.5 text-accent" />
                          <span className="font-mono tracking-[0.2em] text-white font-bold">{nextTrip.sale.destination_iata}</span>
                        </div>
                      )}
                      {nextTrip.sale?.departure_date && (
                        <div className="flex items-center gap-2 bg-white/[0.06] backdrop-blur-xl text-white/70 text-sm px-4 py-2 rounded-full border border-white/[0.06]">
                          {fmtShort(nextTrip.sale.departure_date)} — {fmtShort(nextTrip.sale.return_date)}
                        </div>
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
                      <button
                        onClick={() => navigate(`/portal/viagem/${nextTrip.sale_id}`)}
                        className="inline-flex items-center gap-3 text-white text-sm font-bold bg-accent hover:bg-accent/90 px-8 py-4 rounded-full transition-all shadow-2xl shadow-accent/30 hover:shadow-accent/50 hover:scale-105"
                      >
                        <Compass className="h-5 w-5" />
                        Explorar viagem
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </motion.div>
                  </>
                )}
              </motion.div>

              {/* Right: 3D Globe */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1, delay: 0.4 }}
                className="relative hidden lg:block"
              >
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-[500px] h-[500px] rounded-full bg-accent/5 blur-[100px]" />
                </div>
                <Suspense fallback={
                  <div className="h-[600px] flex items-center justify-center">
                    <div className="w-10 h-10 border-2 border-accent/20 border-t-accent rounded-full animate-spin" />
                  </div>
                }>
                  <GlobeScene
                    className="h-[600px] w-full"
                    routes={globeRoutes}
                    onMarkerClick={(saleId) => navigate(`/portal/viagem/${saleId}`)}
                  />
                </Suspense>
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 py-8 sm:py-12">

          {/* Quick Actions */}
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

          {/* Shelves */}
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
