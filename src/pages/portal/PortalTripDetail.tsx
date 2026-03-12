import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import PortalLayout from "@/components/portal/PortalLayout";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ArrowLeft, Plane, Hotel, Users, DollarSign, FileText, Calendar, MapPin,
  Clock, Shield, MessageCircle, CheckCircle2,
  AlertTriangle, ChevronDown, Map as MapIcon,
  Navigation, CreditCard, Star, ListOrdered, CalendarDays,
  ArrowRight, Compass, Check, CircleDot, Info, Sparkles,
} from "lucide-react";
import AirlineLogo from "@/components/AirlineLogo";
import { iataToLabel } from "@/lib/iataUtils";
import PortalJourneyMap from "@/components/portal/PortalJourneyMap";
import PortalChecklist from "@/components/portal/PortalChecklist";
import PortalDocumentsCenter from "@/components/portal/PortalDocumentsCenter";
import PortalTimeline from "@/components/portal/PortalTimeline";
import PortalCalendar from "@/components/portal/PortalCalendar";
import { getMockTripDetail } from "@/lib/portalMockTrips";

/* ── Helpers ── */
const fmt = (v: number) => v?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) || "R$ 0,00";
const fmtDate = (d: string | null) => {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
};
const fmtShort = (d: string | null) => {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
};

const destImages: Record<string, string> = {
  MCO: "https://images.unsplash.com/photo-1575089976121-8ed7b2a54265?w=1600&h=900&fit=crop&q=80",
  MIA: "https://images.unsplash.com/photo-1533106497176-45ae19e68ba2?w=1600&h=900&fit=crop&q=80",
  LIS: "https://images.unsplash.com/photo-1585208798174-6cedd86e019a?w=1600&h=900&fit=crop&q=80",
  CDG: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1600&h=900&fit=crop&q=80",
  FCO: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=1600&h=900&fit=crop&q=80",
  CUN: "https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?w=1600&h=900&fit=crop&q=80",
  EZE: "https://images.unsplash.com/photo-1589909202802-8f4aadce1849?w=1600&h=900&fit=crop&q=80",
  default: "https://images.unsplash.com/photo-1488085061387-422e29b40080?w=1600&h=900&fit=crop&q=80",
};
const hotelImages = [
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=400&fit=crop&q=80",
  "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=600&h=400&fit=crop&q=80",
  "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=600&h=400&fit=crop&q=80",
];
function getImg(iata: string | null, cover: string | null) {
  if (cover) return cover;
  if (iata && destImages[iata]) return destImages[iata];
  return destImages.default;
}

/* ── Animated Countdown ── */
function Countdown({ departureDate }: { departureDate: string }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const dep = new Date(departureDate + "T00:00:00");
  const diff = dep.getTime() - now.getTime();
  if (diff <= 0) return null;
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);

  return (
    <div className="mt-6">
      <p className="text-white/25 text-[9px] uppercase tracking-[0.4em] mb-3 font-bold">Embarque em</p>
      <div className="flex gap-1.5">
        {[
          { v: d, l: "dias" }, { v: h, l: "hrs" }, { v: m, l: "min" }, { v: s, l: "seg" },
        ].map((x, i) => (
          <div key={i} className="text-center">
            <div className="bg-white/[0.06] backdrop-blur-xl text-white font-bold text-xl sm:text-3xl px-2 sm:px-3.5 py-1.5 sm:py-2 rounded-xl min-w-[40px] sm:min-w-[60px] tabular-nums border border-white/[0.05]">
              {String(x.v).padStart(2, "0")}
            </div>
            <span className="text-white/15 text-[8px] uppercase tracking-wider mt-1 block">{x.l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Journey Progress ── */
function JourneyProgress({ sale }: { sale: any }) {
  const dep = sale?.departure_date ? new Date(sale.departure_date + "T00:00:00") : null;
  const ret = sale?.return_date ? new Date(sale.return_date + "T23:59:59") : null;
  const now = new Date();
  if (!dep || !ret) return null;
  const total = ret.getTime() - dep.getTime();
  const elapsed = now.getTime() - dep.getTime();
  const pct = Math.max(0, Math.min(100, (elapsed / total) * 100));
  const isActive = dep <= now && ret >= now;
  const isPast = ret < now;
  const days = Math.ceil(total / 86400000);
  const current = isActive ? Math.min(Math.ceil(elapsed / 86400000), days) : isPast ? days : 0;

  return (
    <div className="py-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Plane className="h-3.5 w-3.5 text-accent" />
          <span className="font-medium">{fmtShort(sale.departure_date)}</span>
        </div>
        {isActive && (
          <span className="text-accent font-bold text-sm">
            Dia {current} de {days}
          </span>
        )}
        {isPast && <span className="text-muted-foreground text-xs font-medium">Concluída</span>}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium">{fmtShort(sale.return_date)}</span>
          <MapPin className="h-3.5 w-3.5 text-accent" />
        </div>
      </div>
      <div className="relative w-full h-1.5 bg-muted/50 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${isPast ? 100 : pct}%` }}
          transition={{ duration: 2, ease: "easeOut" }}
          className="h-full rounded-full bg-gradient-to-r from-accent to-[hsl(160,80%,60%)]"
        />
        {isActive && (
          <motion.div
            initial={{ left: 0 }}
            animate={{ left: `${pct}%` }}
            transition={{ duration: 2, ease: "easeOut" }}
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-accent border-[3px] border-background shadow-lg shadow-accent/50"
          />
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════ MAIN PAGE ═══════════════════════ */
export default function PortalTripDetail() {
  const { saleId } = useParams();
  const id = saleId;
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const mockData = getMockTripDetail(id || "");
      if (mockData) {
        setData({
          published: { custom_title: mockData.custom_title, cover_image_url: mockData.cover_image_url, notes_for_client: mockData.notes_for_client },
          sale: mockData.sale,
          segments: mockData.segments,
          hotels: mockData.hotels,
          services: mockData.services,
          lodging: mockData.lodging,
          attachments: mockData.attachments,
          financial: mockData.financial,
          passengers: mockData.passengers,
          sellerName: mockData.sellerName,
        });
        setLoading(false);
        return;
      }
      const { data: res } = await supabase.functions.invoke("portal-api", {
        body: { action: "trip-detail", sale_id: id },
      });
      if (res && !res.error) setData(res);
      setLoading(false);
    };
    if (id) fetchData();
  }, [id]);

  if (loading) {
    return (
      <PortalLayout>
        <div className="flex items-center justify-center py-40">
          <div className="flex flex-col items-center gap-5">
            <div className="w-12 h-12 border-[3px] border-accent/20 border-t-accent rounded-full animate-spin" />
            <p className="text-muted-foreground text-sm">Carregando sua jornada...</p>
          </div>
        </div>
      </PortalLayout>
    );
  }

  if (!data || data.error) {
    return (
      <PortalLayout>
        <div className="text-center py-40">
          <Compass className="h-20 w-20 text-muted-foreground/15 mx-auto mb-6" />
          <p className="text-lg font-bold text-foreground mb-2">Viagem não encontrada</p>
          <p className="text-sm text-muted-foreground mb-8">Essa jornada pode ter sido removida ou não está disponível.</p>
          <button onClick={() => navigate("/portal")} className="text-sm text-accent font-semibold hover:underline">← Voltar ao início</button>
        </div>
      </PortalLayout>
    );
  }

  const { sale, published, segments, hotels, services, lodging, attachments, financial, passengers, sellerName } = data;
  const allHotels = [...(hotels || []), ...(lodging || [])];
  const totalReceivable = financial?.receivables?.reduce((s: number, r: any) => s + (r.gross_value || 0), 0) || 0;
  const totalPaid = financial?.receivables?.filter((r: any) => r.status === "recebido")?.reduce((s: number, r: any) => s + (r.gross_value || 0), 0) || 0;
  const totalPending = totalReceivable - totalPaid;
  const paymentPct = totalReceivable > 0 ? Math.round((totalPaid / totalReceivable) * 100) : 0;

  const dep = sale?.departure_date ? new Date(sale.departure_date + "T00:00:00") : null;
  const ret = sale?.return_date ? new Date(sale.return_date + "T23:59:59") : null;
  const now = new Date();
  const isUpcoming = dep && dep > now;
  const isActive = dep && ret && dep <= now && ret >= now;
  const tripDays = dep && ret ? Math.ceil((ret.getTime() - dep.getTime()) / 86400000) : 0;

  const toggle = (s: string) => setActiveSection(activeSection === s ? null : s);

  return (
    <PortalLayout>
      <div className="-mx-4 sm:-mx-6 lg:-mx-8 -mt-6 sm:-mt-8">

        {/* ═══════════ CINEMATIC HERO ═══════════ */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="relative overflow-hidden h-[60vh] min-h-[400px] max-h-[600px]"
        >
          <motion.img
            src={getImg(sale?.destination_iata, published?.cover_image_url)}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            initial={{ scale: 1.08 }}
            animate={{ scale: 1 }}
            transition={{ duration: 18, ease: "linear", repeat: Infinity, repeatType: "reverse" }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-black/50 to-black/20" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />

          {/* Back button */}
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            onClick={() => navigate("/portal")}
            className="absolute top-5 left-5 sm:top-8 sm:left-8 flex items-center gap-2 text-white/60 hover:text-white text-sm font-medium transition-colors z-10 bg-black/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/10"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar
          </motion.button>

          {/* Status */}
          <div className="absolute top-5 right-5 sm:top-8 sm:right-8">
            {isActive ? (
              <Badge className="bg-accent text-accent-foreground border-none shadow-lg shadow-accent/40 text-xs px-4 py-2">
                <span className="relative flex h-2 w-2 mr-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-foreground opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-foreground" />
                </span>
                Em viagem
              </Badge>
            ) : isUpcoming ? (
              <Badge className="bg-white/10 text-white border-none backdrop-blur-md shadow-lg text-xs px-4 py-2">Confirmada</Badge>
            ) : (
              <Badge className="bg-white/10 text-white/50 border-none text-xs px-4 py-2">Concluída</Badge>
            )}
          </div>

          {/* Hero content */}
          <div className="absolute bottom-0 left-0 right-0 px-5 sm:px-8 lg:px-10 pb-8 sm:pb-10 max-w-5xl">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-white leading-[0.95] tracking-tighter">
                {published?.custom_title || sale?.name || "Sua Jornada"}
              </h1>

              <div className="flex flex-wrap items-center gap-2.5 mt-4">
                {sale?.origin_iata && sale?.destination_iata && (
                  <div className="flex items-center gap-2 bg-white/[0.07] backdrop-blur-xl text-white/80 text-sm px-4 py-2 rounded-full border border-white/[0.07]">
                    <span className="font-mono tracking-[0.15em] text-white font-bold">{sale.origin_iata}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-accent" />
                    <span className="font-mono tracking-[0.15em] text-white font-bold">{sale.destination_iata}</span>
                  </div>
                )}
                {sale?.departure_date && (
                  <div className="flex items-center gap-1.5 bg-white/[0.07] backdrop-blur-xl text-white/70 text-sm px-4 py-2 rounded-full border border-white/[0.07]">
                    <Calendar className="h-3.5 w-3.5" />
                    {fmtShort(sale.departure_date)} — {fmtShort(sale.return_date)}
                  </div>
                )}
                {tripDays > 0 && (
                  <div className="flex items-center gap-1.5 bg-white/[0.07] backdrop-blur-xl text-white/70 text-sm px-4 py-2 rounded-full border border-white/[0.07]">
                    <Clock className="h-3.5 w-3.5" /> {tripDays}d
                  </div>
                )}
              </div>

              {isUpcoming && sale?.departure_date && <Countdown departureDate={sale.departure_date} />}
              {isActive && (
                <div className="mt-6 flex items-center gap-3">
                  <span className="relative flex h-3.5 w-3.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-accent" />
                  </span>
                  <span className="text-white font-bold text-lg">Viagem em andamento</span>
                </div>
              )}
            </motion.div>
          </div>
        </motion.div>

        {/* ═══════════ CONTENT ═══════════ */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Journey Progress */}
          <JourneyProgress sale={sale} />

          {/* ── Next Action ── */}
          <NextAction sale={sale} segments={segments || []} financial={financial} attachments={attachments || []} />

          {/* ── Notes from NatLeva ── */}
          {published?.notes_for_client && (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mb-8">
              <div className="flex items-start gap-4 p-5 rounded-2xl bg-accent/5 border border-accent/15">
                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground mb-1">Mensagem da NatLeva</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{published.notes_for_client}</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Sua Jornada: Map/Timeline/Calendar ── */}
          {segments?.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-8">
              <h2 className="text-2xl font-bold text-foreground tracking-tight mb-5">Sua Jornada</h2>
              <Tabs defaultValue="map" className="w-full">
                <TabsList className="w-full sm:w-auto grid grid-cols-3 sm:inline-grid bg-muted/40 rounded-xl p-1">
                  <TabsTrigger value="map" className="gap-1.5 text-xs sm:text-sm rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
                    <MapIcon className="h-3.5 w-3.5" /> Mapa
                  </TabsTrigger>
                  <TabsTrigger value="timeline" className="gap-1.5 text-xs sm:text-sm rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
                    <ListOrdered className="h-3.5 w-3.5" /> Timeline
                  </TabsTrigger>
                  <TabsTrigger value="calendar" className="gap-1.5 text-xs sm:text-sm rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
                    <CalendarDays className="h-3.5 w-3.5" /> Calendário
                  </TabsTrigger>
                </TabsList>
                <div className="mt-5 rounded-2xl overflow-hidden border border-border/40">
                  <TabsContent value="map" className="p-4 sm:p-5 mt-0">
                    <PortalJourneyMap segments={segments} hotels={hotels} lodging={lodging} services={services} sale={sale} />
                  </TabsContent>
                  <TabsContent value="timeline" className="p-4 sm:p-5 mt-0">
                    <PortalTimeline segments={segments} hotels={hotels} lodging={lodging} services={services} sale={sale} />
                  </TabsContent>
                  <TabsContent value="calendar" className="p-4 sm:p-5 mt-0">
                    <PortalCalendar segments={segments} hotels={hotels} lodging={lodging} services={services} sale={sale} />
                  </TabsContent>
                </div>
              </Tabs>
            </motion.div>
          )}

          {/* ── Flights as Journey Cards ── */}
          {segments?.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="mb-8">
              <h2 className="text-2xl font-bold text-foreground tracking-tight mb-5">Seus Voos</h2>
              <div className="space-y-4">
                {segments.map((seg: any, i: number) => (
                  <motion.div
                    key={seg.id || i}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.28 + i * 0.06 }}
                    className="group relative rounded-2xl overflow-hidden border border-border/40 hover:border-accent/20 hover:shadow-lg hover:shadow-accent/5 transition-all bg-card"
                  >
                    <div className="p-5 sm:p-6">
                      {/* Flight header */}
                      <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-3">
                          <AirlineLogo iata={seg.airline} size={36} />
                          <div>
                            <p className="text-xs text-muted-foreground font-mono tracking-wider">{seg.flight_number || seg.airline}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{seg.direction === "ida" ? "Ida" : seg.direction === "volta" ? "Volta" : seg.direction}</p>
                          </div>
                        </div>
                        <div className="flex gap-1.5">
                          {seg.flight_class && (
                            <span className="text-[10px] font-semibold text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-full">{seg.flight_class}</span>
                          )}
                        </div>
                      </div>

                      {/* Route visualization */}
                      <div className="flex items-center gap-4">
                        {/* Origin */}
                        <div className="flex-1">
                          <p className="text-2xl sm:text-3xl font-bold text-foreground tracking-tighter font-mono">{seg.origin_iata}</p>
                          <p className="text-xs text-muted-foreground mt-1">{iataToLabel(seg.origin_iata)}</p>
                          <div className="flex items-center gap-2 mt-2">
                            {seg.departure_date && <span className="text-xs text-muted-foreground">{fmtShort(seg.departure_date)}</span>}
                            {seg.departure_time && <span className="text-sm font-bold text-foreground font-mono">{seg.departure_time?.slice(0, 5)}</span>}
                          </div>
                        </div>

                        {/* Flight path visual */}
                        <div className="flex-shrink-0 flex flex-col items-center gap-1 w-24 sm:w-32">
                          <div className="relative w-full flex items-center">
                            <div className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />
                            <div className="flex-1 h-px bg-gradient-to-r from-accent via-accent/40 to-accent relative mx-1">
                              <Plane className="h-4 w-4 text-accent absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-90" />
                            </div>
                            <div className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />
                          </div>
                          {seg.duration_minutes && (
                            <span className="text-[10px] text-muted-foreground">{Math.floor(seg.duration_minutes / 60)}h{seg.duration_minutes % 60 > 0 ? `${seg.duration_minutes % 60}m` : ""}</span>
                          )}
                        </div>

                        {/* Destination */}
                        <div className="flex-1 text-right">
                          <p className="text-2xl sm:text-3xl font-bold text-foreground tracking-tighter font-mono">{seg.destination_iata}</p>
                          <p className="text-xs text-muted-foreground mt-1">{iataToLabel(seg.destination_iata)}</p>
                          <div className="flex items-center gap-2 mt-2 justify-end">
                            {seg.arrival_time && <span className="text-sm font-bold text-foreground font-mono">{seg.arrival_time?.slice(0, 5)}</span>}
                          </div>
                        </div>
                      </div>

                      {/* Terminal & extras */}
                      {seg.terminal && (
                        <div className="mt-4 pt-4 border-t border-border/30 flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Terminal {seg.terminal}</span>
                          {seg.cabin_type && <span>{seg.cabin_type}</span>}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Hotels as Experiences ── */}
          {allHotels.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mb-8">
              <h2 className="text-2xl font-bold text-foreground tracking-tight mb-5">Hospedagem</h2>
              <div className="space-y-4">
                {allHotels.map((h: any, i: number) => (
                  <motion.div
                    key={h.id || i}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.32 + i * 0.06 }}
                    className="group rounded-2xl overflow-hidden border border-border/40 hover:border-accent/20 hover:shadow-lg hover:shadow-accent/5 transition-all bg-card"
                  >
                    <div className="flex flex-col sm:flex-row">
                      {/* Hotel image */}
                      <div className="sm:w-48 lg:w-56 h-40 sm:h-auto overflow-hidden flex-shrink-0">
                        <img
                          src={hotelImages[i % hotelImages.length]}
                          alt={h.hotel_name || "Hotel"}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        />
                      </div>
                      {/* Hotel info */}
                      <div className="p-5 sm:p-6 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-lg font-bold text-foreground leading-tight">
                              {h.hotel_name || h.description || "Hotel"}
                            </p>
                            {(h.hotel_reservation_code || h.reservation_code) && (
                              <p className="text-xs text-muted-foreground mt-1.5 font-mono">
                                Reserva {h.hotel_reservation_code || h.reservation_code}
                              </p>
                            )}
                          </div>
                          {h.status && (
                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                              h.status === "CONFIRMADO" ? "bg-accent/10 text-accent" : "bg-muted text-muted-foreground"
                            }`}>
                              {h.status}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-4 mt-4">
                          {h.hotel_checkin_datetime_utc && (
                            <div className="text-xs">
                              <span className="text-muted-foreground block text-[10px] uppercase tracking-wider mb-0.5">Check-in</span>
                              <span className="font-semibold text-foreground">{new Date(h.hotel_checkin_datetime_utc).toLocaleDateString("pt-BR")}</span>
                            </div>
                          )}
                          {h.hotel_checkout_datetime_utc && (
                            <div className="text-xs">
                              <span className="text-muted-foreground block text-[10px] uppercase tracking-wider mb-0.5">Check-out</span>
                              <span className="font-semibold text-foreground">{new Date(h.hotel_checkout_datetime_utc).toLocaleDateString("pt-BR")}</span>
                            </div>
                          )}
                        </div>

                        {h.notes && (
                          <p className="text-xs text-muted-foreground mt-3 italic leading-relaxed">{h.notes}</p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Experiences ── */}
          {services?.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.33 }} className="mb-8">
              <h2 className="text-2xl font-bold text-foreground tracking-tight mb-5">Experiências</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {services.map((s: any, i: number) => {
                  const cat = (s.product_type || s.category || "").toLowerCase();
                  const emoji = cat.includes("transfer") ? "🚙" : cat.includes("seguro") ? "🛡" : cat.includes("passeio") ? "🏔" : "⭐";
                  return (
                    <motion.div
                      key={s.id || i}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.35 + i * 0.04 }}
                      className="flex items-center gap-4 p-4 rounded-2xl border border-border/40 hover:border-accent/20 hover:shadow-md hover:shadow-accent/5 transition-all bg-card group"
                    >
                      <span className="text-2xl group-hover:scale-110 transition-transform">{emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">{s.description || s.category}</p>
                        {s.reservation_code && <p className="text-[10px] text-muted-foreground font-mono mt-0.5">Cód: {s.reservation_code}</p>}
                      </div>
                      <span className="text-[10px] text-muted-foreground font-medium bg-muted/40 px-2.5 py-1 rounded-full">{s.product_type || s.category}</span>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ── Checklist ── */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36 }} className="mb-8">
            <h2 className="text-2xl font-bold text-foreground tracking-tight mb-5">Preparação</h2>
            <div className="rounded-2xl border border-border/40 overflow-hidden bg-card p-5 sm:p-6">
              <PortalChecklist
                sale={sale}
                segments={segments || []}
                hotels={hotels || []}
                services={services || []}
                passengers={passengers || []}
                attachments={attachments || []}
                financial={financial || { receivables: [] }}
                lodging={lodging || []}
              />
            </div>
          </motion.div>

          {/* ── Documents ── */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 }} className="mb-8">
            <h2 className="text-2xl font-bold text-foreground tracking-tight mb-5">Documentos</h2>
            <div className="rounded-2xl border border-border/40 overflow-hidden bg-card p-5 sm:p-6">
              <PortalDocumentsCenter
                attachments={attachments || []}
                sale={sale}
                segments={segments || []}
                hotels={allHotels}
                services={services || []}
              />
            </div>
          </motion.div>

          {/* ── Financial Summary ── */}
          {financial?.receivables?.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mb-8">
              <h2 className="text-2xl font-bold text-foreground tracking-tight mb-5">Financeiro</h2>
              <div className="rounded-2xl border border-border/40 overflow-hidden bg-card">
                {/* Visual summary */}
                <div className="p-5 sm:p-6 border-b border-border/30">
                  <div className="grid grid-cols-3 gap-4 mb-5">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Total</p>
                      <p className="text-xl sm:text-2xl font-bold text-foreground">{fmt(totalReceivable)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-accent uppercase tracking-wider mb-1">Pago</p>
                      <p className="text-xl sm:text-2xl font-bold text-accent">{fmt(totalPaid)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-warning uppercase tracking-wider mb-1">Pendente</p>
                      <p className="text-xl sm:text-2xl font-bold text-warning">{fmt(totalPending)}</p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="relative w-full h-2 bg-muted/50 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${paymentPct}%` }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                      className="h-full rounded-full bg-gradient-to-r from-accent to-[hsl(160,80%,60%)]"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 text-right">{paymentPct}% quitado</p>
                </div>

                {/* Installments */}
                <div className="p-5 sm:p-6 space-y-2.5">
                  {financial.receivables.map((r: any, i: number) => {
                    const isPaid = r.status === "recebido";
                    return (
                      <motion.div
                        key={r.id || i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.42 + i * 0.04 }}
                        className={`flex items-center justify-between p-4 rounded-xl transition-all ${
                          isPaid
                            ? "bg-accent/5 border border-accent/10"
                            : "bg-warning/5 border border-warning/10"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isPaid ? "bg-accent" : "bg-warning animate-pulse"}`} />
                          <div>
                            <p className="text-sm font-semibold text-foreground">
                              {r.description || `Parcela ${r.installment_number || i + 1}`}
                              {r.installment_total > 1 && ` de ${r.installment_total}`}
                            </p>
                            {r.due_date && <p className="text-xs text-muted-foreground mt-0.5">Venc. {fmtDate(r.due_date)}</p>}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-foreground">{fmt(r.gross_value)}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{isPaid ? "✓ Pago" : "Pendente"}</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Passengers ── */}
          {passengers?.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.42 }} className="mb-8">
              <h2 className="text-2xl font-bold text-foreground tracking-tight mb-5">Viajantes</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {passengers.map((pax: any, i: number) => (
                  <motion.div
                    key={pax.id || i}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.44 + i * 0.04 }}
                    className="flex items-center gap-4 p-4 rounded-2xl border border-border/40 hover:border-accent/20 transition-all bg-card"
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center flex-shrink-0 text-accent font-bold text-lg">
                      {(pax.full_name || "?")[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">{pax.full_name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {pax.role && <span className="text-[10px] text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-full">{pax.role}</span>}
                        {pax.birth_date && <span className="text-[10px] text-muted-foreground">Nasc: {fmtShort(pax.birth_date)}</span>}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Support CTA ── */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="mb-8"
          >
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary via-primary to-[hsl(160,30%,15%)]">
              <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10 rounded-full blur-[80px] -mr-20 -mt-20" />
              <div className="p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 relative">
                <div>
                  <h3 className="text-xl font-bold text-primary-foreground">Precisa de ajuda?</h3>
                  <p className="text-sm text-primary-foreground/50 mt-1.5 max-w-md">
                    {sellerName ? `Fale com ${sellerName} ou com nossa equipe` : "Nosso concierge está pronto para ajudar"}
                  </p>
                </div>
                <button
                  onClick={() => window.open("https://wa.me/5511999999999", "_blank")}
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl text-sm font-semibold border border-white/15 transition-all shadow-lg"
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </button>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </PortalLayout>
  );
}

/* ── Next Action Component ── */
function NextAction({ sale, segments, financial, attachments }: {
  sale: any; segments: any[]; financial: any; attachments: any[];
}) {
  const actions: { emoji: string; label: string; type: "urgent" | "warning" | "info" }[] = [];

  const receivables = financial?.receivables || [];
  const pending = receivables.filter((r: any) => r.status !== "recebido");
  if (pending.length > 0) {
    const next = pending[0];
    const fmt = (v: number) => v?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) || "";
    actions.push({ emoji: "💳", label: `Parcela pendente — ${fmt(next.gross_value)}`, type: "warning" });
  }

  if (segments.length > 0) {
    const now = new Date();
    const first = segments[0];
    const dep = first?.departure_date ? new Date(first.departure_date + "T00:00:00") : null;
    const hours = dep ? (dep.getTime() - now.getTime()) / 3600000 : Infinity;
    if (hours <= 48 && hours > 0) {
      actions.push({ emoji: "✈️", label: `Check-in disponível — ${first.airline || ""} ${first.flight_number || ""}`, type: "urgent" });
    }
  }

  if (attachments.length === 0 && segments.length > 0) {
    actions.push({ emoji: "📄", label: "Documentos sendo preparados pela equipe", type: "info" });
  }

  if (actions.length === 0) return null;

  const colors = { urgent: "border-destructive/20 bg-destructive/5", warning: "border-warning/20 bg-warning/5", info: "border-accent/20 bg-accent/5" };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-8">
      <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold mb-3">Próximo passo</p>
      <div className="space-y-2">
        {actions.map((a, i) => (
          <div key={i} className={`flex items-center gap-3 p-4 rounded-xl border ${colors[a.type]} transition-all`}>
            <span className="text-xl">{a.emoji}</span>
            <p className="text-sm font-medium text-foreground">{a.label}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
