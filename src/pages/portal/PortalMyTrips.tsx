import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plane, Calendar, MapPin, Timer, Search, Filter,
  ChevronRight, Users, Hotel, Sparkles, LayoutGrid, List,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { getMockTripsForDashboard } from "@/lib/portalMockTrips";
import {
  getDestinationImage, getTripStatus, getTripDays,
  TripStatusBadge, TripShelf,
} from "@/components/travel-ui";
import PortalLayout from "@/components/portal/PortalLayout";
import type { TripStatus } from "@/components/travel-ui";

const fmtShort = (d: string | null) => {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
};

const statusFilters: { value: TripStatus | "all"; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "active", label: "Em viagem" },
  { value: "upcoming", label: "Próximas" },
  { value: "past", label: "Realizadas" },
];

type ViewMode = "list" | "grid";

export default function PortalMyTrips() {
  const navigate = useNavigate();
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TripStatus | "all">("all");
  const [viewMode, setViewMode] = useState<ViewMode>("list");

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

  const filtered = useMemo(() => {
    let result = trips;
    if (statusFilter !== "all") {
      result = result.filter(t => getTripStatus(t.sale || {}) === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(t => {
        const name = (t.custom_title || t.sale?.name || "").toLowerCase();
        const dest = (t.sale?.destination_iata || "").toLowerCase();
        return name.includes(q) || dest.includes(q);
      });
    }
    return result;
  }, [trips, statusFilter, search]);

  const counts = useMemo(() => ({
    all: trips.length,
    active: trips.filter(t => getTripStatus(t.sale || {}) === "active").length,
    upcoming: trips.filter(t => getTripStatus(t.sale || {}) === "upcoming").length,
    past: trips.filter(t => getTripStatus(t.sale || {}) === "past").length,
  }), [trips]);

  if (loading) {
    return (
      <PortalLayout>
        <div className="flex items-center justify-center py-40">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-14 h-14 border-[3px] border-accent/20 border-t-accent rounded-full animate-spin" />
              <Plane className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-5 w-5 text-accent/60" />
            </div>
            <p className="text-muted-foreground text-sm">Carregando viagens...</p>
          </div>
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4"
        >
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-accent" />
              </div>
              <span className="text-accent/70 text-[10px] uppercase tracking-[0.2em] font-bold">Suas jornadas</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-foreground tracking-tighter">Minhas Viagens</h1>
            <p className="text-sm text-muted-foreground mt-1">{trips.length} viagen{trips.length !== 1 ? "s" : ""} registrada{trips.length !== 1 ? "s" : ""}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-lg transition-all ${viewMode === "list" ? "bg-accent/10 text-accent" : "text-muted-foreground hover:text-foreground"}`}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-lg transition-all ${viewMode === "grid" ? "bg-accent/10 text-accent" : "text-muted-foreground hover:text-foreground"}`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar destino ou nome..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 bg-card/60 border-border/30 backdrop-blur-sm"
            />
          </div>
          <div className="flex items-center gap-1.5 bg-card/60 border border-border/30 rounded-lg p-1 backdrop-blur-sm">
            {statusFilters.map(f => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  statusFilter === f.value
                    ? "bg-accent text-accent-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f.label}
                {counts[f.value] > 0 && (
                  <span className={`ml-1.5 text-[10px] tabular-nums ${statusFilter === f.value ? "text-accent-foreground/70" : "text-muted-foreground/50"}`}>
                    {counts[f.value]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Trip List / Grid */}
        {filtered.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
            <Plane className="h-12 w-12 mx-auto mb-4 text-muted-foreground/20" />
            <p className="text-muted-foreground">Nenhuma viagem encontrada.</p>
          </motion.div>
        ) : viewMode === "grid" ? (
          /* Grid view — reuse TripShelf cards layout */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((trip, i) => (
              <TripGridCard key={trip.sale_id || i} trip={trip} index={i} onOpen={(id) => navigate(`/portal/viagem/${id}`)} />
            ))}
          </div>
        ) : (
          /* List view */
          <div className="space-y-3">
            {filtered.map((trip, i) => (
              <TripListCard key={trip.sale_id || i} trip={trip} index={i} onOpen={(id) => navigate(`/portal/viagem/${id}`)} />
            ))}
          </div>
        )}
      </div>
    </PortalLayout>
  );
}

/* ═══ LIST CARD ═══ */
function TripListCard({ trip, index, onOpen }: { trip: any; index: number; onOpen: (id: string) => void }) {
  const sale = trip.sale;
  const status = getTripStatus(sale || {});
  const days = getTripDays(sale || {});
  const dep = sale?.departure_date ? new Date(sale.departure_date + "T00:00:00") : null;
  const now = new Date();
  const daysUntil = dep ? Math.ceil((dep.getTime() - now.getTime()) / 86400000) : null;

  return (
    <motion.button
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.35 }}
      whileHover={{ x: 4 }}
      onClick={() => onOpen(trip.sale_id)}
      className="group w-full text-left flex items-center gap-4 p-3 sm:p-4 rounded-2xl bg-card/60 border border-border/20 hover:border-accent/20 hover:bg-card/80 hover:shadow-lg hover:shadow-accent/5 backdrop-blur-sm transition-all duration-300"
    >
      {/* Thumbnail */}
      <div className="flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden relative">
        <img
          src={getDestinationImage(sale?.destination_iata, trip.cover_image_url, trip.sale_id)}
          alt=""
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        {sale?.destination_iata && (
          <span className="absolute bottom-1.5 left-1.5 text-[10px] font-mono font-bold text-white/90 bg-black/40 backdrop-blur-sm px-1.5 py-0.5 rounded-md tracking-wider">
            {sale.destination_iata}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <TripStatusBadge status={status} size="sm" />
          {daysUntil !== null && daysUntil > 0 && daysUntil <= 90 && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <Timer className="h-3 w-3" /> em {daysUntil}d
            </span>
          )}
        </div>
        <h3 className="font-bold text-foreground text-base sm:text-lg leading-tight truncate tracking-tight group-hover:text-accent transition-colors">
          {trip.custom_title || sale?.name || "Viagem"}
        </h3>
        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
          {sale?.origin_iata && sale?.destination_iata && (
            <span className="flex items-center gap-1">
              <Plane className="h-3 w-3" />
              <span className="font-mono tracking-wider">{sale.origin_iata} → {sale.destination_iata}</span>
            </span>
          )}
          {sale?.departure_date && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {fmtShort(sale.departure_date)}
            </span>
          )}
          {days > 0 && <span>{days} dias</span>}
        </div>
      </div>

      {/* Arrow */}
      <ChevronRight className="h-5 w-5 text-muted-foreground/30 group-hover:text-accent transition-colors flex-shrink-0" />
    </motion.button>
  );
}

/* ═══ GRID CARD ═══ */
function TripGridCard({ trip, index, onOpen }: { trip: any; index: number; onOpen: (id: string) => void }) {
  const sale = trip.sale;
  const status = getTripStatus(sale || {});
  const days = getTripDays(sale || {});
  const dep = sale?.departure_date ? new Date(sale.departure_date + "T00:00:00") : null;
  const now = new Date();
  const daysUntil = dep ? Math.ceil((dep.getTime() - now.getTime()) / 86400000) : null;

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      whileHover={{ y: -6, scale: 1.02 }}
      onClick={() => onOpen(trip.sale_id)}
      className="group w-full text-left rounded-2xl overflow-hidden bg-card/60 border border-border/20 hover:border-accent/20 hover:shadow-xl hover:shadow-accent/5 backdrop-blur-sm transition-all duration-300"
    >
      {/* Image */}
      <div className="relative aspect-[16/10] overflow-hidden">
        <img
          src={getDestinationImage(sale?.destination_iata, trip.cover_image_url, trip.sale_id)}
          alt=""
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-[1200ms] group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
          <TripStatusBadge status={status} size="sm" />
          {daysUntil !== null && daysUntil > 0 && daysUntil <= 90 && (
            <div className="bg-black/40 backdrop-blur-xl text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 border border-white/10">
              <Timer className="h-3 w-3" />
              {daysUntil}d
            </div>
          )}
        </div>
        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="font-bold text-white text-lg leading-tight drop-shadow-xl line-clamp-2 tracking-tight">
            {trip.custom_title || sale?.name || "Viagem"}
          </h3>
        </div>
      </div>

      {/* Details */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {sale?.origin_iata && sale?.destination_iata && (
            <span className="font-mono tracking-wider">{sale.origin_iata} → {sale.destination_iata}</span>
          )}
          {sale?.departure_date && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {fmtShort(sale.departure_date)}
            </span>
          )}
          {days > 0 && <span>{days}d</span>}
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-accent transition-colors" />
      </div>
    </motion.button>
  );
}
