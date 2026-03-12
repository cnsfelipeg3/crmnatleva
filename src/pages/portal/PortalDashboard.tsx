import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import PortalLayout from "@/components/portal/PortalLayout";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plane, Calendar, MapPin, Clock, ArrowRight, Luggage, FileText, DollarSign,
  MessageCircle, ChevronRight, Sparkles, Timer, Eye,
} from "lucide-react";
import { iataToLabel } from "@/lib/iataUtils";
import { getMockTripsForDashboard } from "@/lib/portalMockTrips";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function Countdown({ departureDate }: { departureDate: string }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const dep = new Date(departureDate + "T00:00:00");
  const diff = dep.getTime() - now.getTime();
  if (diff <= 0) return <span className="text-accent font-semibold">Viagem em andamento!</span>;

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5">
        <div className="bg-accent/10 text-accent font-bold text-lg px-3 py-1.5 rounded-lg min-w-[48px] text-center">{days}</div>
        <span className="text-xs text-muted-foreground">dias</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="bg-accent/10 text-accent font-bold text-lg px-3 py-1.5 rounded-lg min-w-[48px] text-center">{hours}</div>
        <span className="text-xs text-muted-foreground">horas</span>
      </div>
    </div>
  );
}

function TripStatusBadge({ sale }: { sale: any }) {
  const dep = sale.departure_date ? new Date(sale.departure_date + "T00:00:00") : null;
  const ret = sale.return_date ? new Date(sale.return_date + "T23:59:59") : null;
  const now = new Date();

  if (dep && dep > now) return <Badge className="bg-info/10 text-info border-info/20">Próxima viagem</Badge>;
  if (dep && ret && dep <= now && ret >= now) return <Badge className="bg-accent/10 text-accent border-accent/20">Em andamento</Badge>;
  if (ret && ret < now) return <Badge className="bg-muted text-muted-foreground border-border">Concluída</Badge>;
  return <Badge variant="secondary">Agendada</Badge>;
}

function getStatusCategory(sale: any): "upcoming" | "active" | "past" {
  const dep = sale?.departure_date ? new Date(sale.departure_date + "T00:00:00") : null;
  const ret = sale?.return_date ? new Date(sale.return_date + "T23:59:59") : null;
  const now = new Date();
  if (dep && dep > now) return "upcoming";
  if (dep && ret && dep <= now && ret >= now) return "active";
  return "past";
}

const destinationImages: Record<string, string> = {
  default: "https://images.unsplash.com/photo-1488085061387-422e29b40080?w=800&h=400&fit=crop",
};

function getDestinationImage(iata: string | null, coverUrl: string | null) {
  if (coverUrl) return coverUrl;
  return destinationImages.default;
}

export default function PortalDashboard() {
  const { portalAccess } = usePortalAuth();
  const navigate = useNavigate();
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrips = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("portal-api", {
          body: { action: "trips" },
        });
        const apiTrips = data?.trips || [];
        // Merge mock trips for demo
        const mockTrips = getMockTripsForDashboard();
        const existingIds = new Set(apiTrips.map((t: any) => t.sale_id));
        const newMocks = mockTrips.filter((m) => !existingIds.has(m.sale_id));
        setTrips([...apiTrips, ...newMocks]);
      } catch (err) {
        console.error("Failed to fetch portal trips:", err);
        // Still show mocks on error
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

  const categorized = useMemo(() => {
    const upcoming = trips.filter((t) => getStatusCategory(t.sale) === "upcoming");
    const active = trips.filter((t) => getStatusCategory(t.sale) === "active");
    const past = trips.filter((t) => getStatusCategory(t.sale) === "past");
    return { upcoming, active, past };
  }, [trips]);

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    return new Date(d + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  };

  return (
    <PortalLayout>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-[3px] border-accent/20 border-t-accent rounded-full animate-spin" />
        </div>
      ) : trips.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-20">
          <Plane className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Nenhuma viagem disponível</h2>
          <p className="text-muted-foreground text-sm">Suas viagens aparecerão aqui assim que forem publicadas pela equipe NatLeva.</p>
        </motion.div>
      ) : (
        <div className="space-y-8">
          {/* Hero - Next Trip */}
          {nextTrip && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <div
                className="relative overflow-hidden rounded-2xl sm:rounded-3xl h-[320px] sm:h-[380px] cursor-pointer group"
                onClick={() => navigate(`/portal/viagem/${nextTrip.sale_id}`)}
              >
                <img
                  src={getDestinationImage(nextTrip.sale?.destination_iata, nextTrip.cover_image_url)}
                  alt="Destino"
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-8">
                  <TripStatusBadge sale={nextTrip.sale} />

                  <h2 className="text-2xl sm:text-3xl font-bold text-white mt-3 leading-tight">
                    {nextTrip.custom_title || nextTrip.sale?.name || "Sua próxima viagem"}
                  </h2>

                  <div className="flex flex-wrap items-center gap-4 mt-3 text-white/70 text-sm">
                    {nextTrip.sale?.origin_iata && nextTrip.sale?.destination_iata && (
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" />
                        {iataToLabel(nextTrip.sale.origin_iata)} → {iataToLabel(nextTrip.sale.destination_iata)}
                      </span>
                    )}
                    {nextTrip.sale?.departure_date && (
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(nextTrip.sale.departure_date)}
                        {nextTrip.sale.return_date && ` — ${formatDate(nextTrip.sale.return_date)}`}
                      </span>
                    )}
                  </div>

                  {nextTrip.sale?.departure_date && getStatusCategory(nextTrip.sale) === "upcoming" && (
                    <div className="mt-4">
                      <p className="text-white/50 text-xs uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <Timer className="h-3 w-3" /> Embarque em
                      </p>
                      <Countdown departureDate={nextTrip.sale.departure_date} />
                    </div>
                  )}

                  <div className="mt-4">
                    <span className="inline-flex items-center gap-1.5 text-white text-sm font-medium bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full group-hover:bg-white/20 transition-all">
                      Ver detalhes <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Quick actions */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon: FileText, label: "Documentos", desc: "Vouchers e bilhetes" },
                { icon: DollarSign, label: "Financeiro", desc: "Pagamentos" },
                { icon: Luggage, label: "Checklist", desc: "Preparação" },
                { icon: MessageCircle, label: "Suporte", desc: "Falar com NatLeva" },
              ].map((item, i) => (
                <Card
                  key={i}
                  className="p-4 cursor-pointer hover:shadow-md hover:border-accent/20 transition-all group"
                  onClick={() => {
                    if (item.label === "Suporte") window.open("https://wa.me/5511999999999", "_blank");
                    else if (nextTrip) navigate(`/portal/viagem/${nextTrip.sale_id}`);
                  }}
                >
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center mb-3 group-hover:bg-accent/20 transition-colors">
                    <item.icon className="h-5 w-5 text-accent" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                </Card>
              ))}
            </div>
          </motion.div>

          {/* Trip Lists */}
          {categorized.active.length > 0 && (
            <TripSection title="Viagem em Andamento" icon={Sparkles} trips={categorized.active} onOpen={(id) => navigate(`/portal/viagem/${id}`)} formatDate={formatDate} />
          )}

          {categorized.upcoming.length > 0 && (
            <TripSection title="Próximas Viagens" icon={Plane} trips={categorized.upcoming} onOpen={(id) => navigate(`/portal/viagem/${id}`)} formatDate={formatDate} />
          )}

          {categorized.past.length > 0 && (
            <TripSection title="Viagens Concluídas" icon={Clock} trips={categorized.past} onOpen={(id) => navigate(`/portal/viagem/${id}`)} formatDate={formatDate} />
          )}
        </div>
      )}
    </PortalLayout>
  );
}

function TripSection({ title, icon: Icon, trips, onOpen, formatDate }: {
  title: string; icon: any; trips: any[]; onOpen: (id: string) => void; formatDate: (d: string | null) => string;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
      <div className="flex items-center gap-2 mb-4">
        <Icon className="h-5 w-5 text-accent" />
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <Badge variant="secondary" className="ml-1">{trips.length}</Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {trips.map((trip, i) => {
          const dep = trip.sale?.departure_date ? new Date(trip.sale.departure_date + "T00:00:00") : null;
          const now = new Date();
          const daysUntil = dep ? Math.ceil((dep.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;

          return (
            <Card
              key={trip.id || i}
              className="overflow-hidden cursor-pointer hover:shadow-lg hover:border-accent/20 transition-all group"
              onClick={() => onOpen(trip.sale_id)}
            >
              <div className="relative h-44 overflow-hidden">
                <img
                  src={trip.cover_image_url || destinationImages.default}
                  alt=""
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute top-3 left-3">
                  <TripStatusBadge sale={trip.sale} />
                </div>
                {daysUntil !== null && daysUntil > 0 && daysUntil <= 60 && (
                  <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
                    <Timer className="h-3 w-3" />
                    {daysUntil}d
                  </div>
                )}
                <div className="absolute bottom-3 left-3 right-3">
                  <h4 className="font-bold text-white text-sm truncate drop-shadow">{trip.custom_title || trip.sale?.name || "Viagem"}</h4>
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {trip.sale?.origin_iata && trip.sale?.destination_iata && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {trip.sale.origin_iata} → {trip.sale.destination_iata}
                    </span>
                  )}
                </div>
                {trip.sale?.departure_date && (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(trip.sale.departure_date)}
                    {trip.sale.return_date && ` — ${formatDate(trip.sale.return_date)}`}
                  </p>
                )}
                <div className="mt-3 flex items-center text-accent text-xs font-medium group-hover:gap-2 transition-all">
                  Ver detalhes <ChevronRight className="h-3 w-3 ml-0.5 group-hover:ml-1.5 transition-all" />
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </motion.div>
  );
}
