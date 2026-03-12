import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import PortalLayout from "@/components/portal/PortalLayout";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ArrowLeft, Plane, Hotel, Users, DollarSign, FileText, Calendar, MapPin,
  Clock, Shield, Briefcase, MessageCircle, CheckCircle2,
  AlertTriangle, ChevronDown, Map as MapIcon, Timer,
  Sparkles, Navigation, CreditCard, Star, ListOrdered, CalendarDays,
  ArrowRight, Eye, Luggage,
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
const fmtDateShort = (d: string | null) => {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
};

/* ── Destination images ── */
const destImages: Record<string, string> = {
  MCO: "https://images.unsplash.com/photo-1575089976121-8ed7b2a54265?w=1400&h=700&fit=crop",
  MIA: "https://images.unsplash.com/photo-1533106497176-45ae19e68ba2?w=1400&h=700&fit=crop",
  LIS: "https://images.unsplash.com/photo-1585208798174-6cedd86e019a?w=1400&h=700&fit=crop",
  CDG: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1400&h=700&fit=crop",
  FCO: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=1400&h=700&fit=crop",
  CUN: "https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?w=1400&h=700&fit=crop",
  EZE: "https://images.unsplash.com/photo-1589909202802-8f4aadce1849?w=1400&h=700&fit=crop",
  default: "https://images.unsplash.com/photo-1488085061387-422e29b40080?w=1400&h=700&fit=crop",
};
function getImg(iata: string | null, cover: string | null) {
  if (cover) return cover;
  if (iata && destImages[iata]) return destImages[iata];
  return destImages.default;
}

/* ── Cinematic Countdown ── */
function CinematicCountdown({ departureDate }: { departureDate: string }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);
  const dep = new Date(departureDate + "T00:00:00");
  const diff = dep.getTime() - now.getTime();
  if (diff <= 0) return null;
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  return (
    <div>
      <p className="text-white/40 text-[10px] uppercase tracking-[0.25em] mb-2 font-medium">Embarque em</p>
      <div className="flex items-center gap-1.5">
        {[
          { val: days, label: "dias" },
          { val: hours, label: "hrs" },
          { val: mins, label: "min" },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-1">
            <div className="bg-white/10 backdrop-blur-md text-white font-bold text-xl sm:text-2xl px-2.5 sm:px-3 py-1.5 rounded-lg min-w-[44px] text-center tabular-nums border border-white/10">
              {item.val}
            </div>
            <span className="text-white/30 text-[9px] uppercase mr-1">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Trip Progress Bar ── */
function TripProgressBar({ sale }: { sale: any }) {
  const dep = sale?.departure_date ? new Date(sale.departure_date + "T00:00:00") : null;
  const ret = sale?.return_date ? new Date(sale.return_date + "T23:59:59") : null;
  const now = new Date();

  if (!dep || !ret) return null;

  const total = ret.getTime() - dep.getTime();
  const elapsed = now.getTime() - dep.getTime();
  const pct = total > 0 ? Math.max(0, Math.min(100, (elapsed / total) * 100)) : 0;
  const isActive = dep <= now && ret >= now;
  const isPast = ret < now;
  const tripDays = Math.ceil(total / 86400000);
  const currentDay = isActive ? Math.min(Math.ceil(elapsed / 86400000), tripDays) : isPast ? tripDays : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="relative"
    >
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
        <span className="flex items-center gap-1.5">
          <Plane className="h-3 w-3 text-accent" />
          {fmtDateShort(sale.departure_date)}
        </span>
        {isActive && (
          <span className="text-accent font-semibold text-xs">
            Dia {currentDay} de {tripDays}
          </span>
        )}
        {isPast && <span className="text-muted-foreground font-medium text-xs">Concluída</span>}
        <span className="flex items-center gap-1.5">
          {fmtDateShort(sale.return_date)}
          <MapPin className="h-3 w-3 text-accent" />
        </span>
      </div>
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${isPast ? 100 : pct}%` }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="h-full rounded-full relative"
          style={{
            background: isPast
              ? "hsl(var(--muted-foreground))"
              : "linear-gradient(90deg, hsl(var(--accent)), hsl(160, 80%, 60%))",
          }}
        >
          {isActive && (
            <span className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-accent border-2 border-background shadow-lg shadow-accent/40" />
          )}
        </motion.div>
      </div>
      {/* Milestones */}
      <div className="flex justify-between mt-1.5">
        <span className="text-[10px] text-muted-foreground">Partida</span>
        <span className="text-[10px] text-muted-foreground">Retorno</span>
      </div>
    </motion.div>
  );
}

/* ── Status Badge ── */
function TripStatus({ sale }: { sale: any }) {
  const dep = sale?.departure_date ? new Date(sale.departure_date + "T00:00:00") : null;
  const ret = sale?.return_date ? new Date(sale.return_date + "T23:59:59") : null;
  const now = new Date();
  if (dep && ret && dep <= now && ret >= now)
    return (
      <Badge className="bg-accent text-accent-foreground border-none shadow-lg shadow-accent/30 text-xs px-3 py-1.5">
        <span className="relative flex h-2 w-2 mr-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-foreground opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-foreground" />
        </span>
        Em viagem
      </Badge>
    );
  if (dep && dep > now)
    return <Badge className="bg-info/90 text-info-foreground border-none shadow-lg shadow-info/20 text-xs px-3 py-1.5">🟢 Confirmada</Badge>;
  if (ret && ret < now)
    return <Badge className="bg-muted/80 text-muted-foreground border-none text-xs px-3 py-1.5">Concluída</Badge>;
  return <Badge className="bg-muted/80 text-muted-foreground border-none text-xs px-3 py-1.5">Agendada</Badge>;
}

/* ── Section ── */
function Section({ title, icon: Icon, children, defaultOpen = true, count }: {
  title: string; icon: any; children: React.ReactNode; defaultOpen?: boolean; count?: number;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className="overflow-hidden border-border/50 hover:border-accent/10 transition-colors">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 sm:p-6 hover:bg-muted/20 transition-colors group"
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-accent/10 flex items-center justify-center group-hover:bg-accent/15 group-hover:scale-105 transition-all">
            <Icon className="h-5 w-5 text-accent" />
          </div>
          <div className="text-left">
            <h3 className="text-base sm:text-lg font-bold text-foreground">{title}</h3>
            {count !== undefined && <p className="text-xs text-muted-foreground">{count} {count === 1 ? "item" : "itens"}</p>}
          </div>
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </motion.div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-5 sm:px-6 pb-5 sm:pb-6 pt-0">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

/* ── Next Action Block ── */
function NextActionBlock({ sale, segments, financial, attachments }: {
  sale: any; segments: any[]; financial: any; attachments: any[];
}) {
  const actions: { icon: any; label: string; priority: string; color: string; bgColor: string }[] = [];

  const receivables = financial?.receivables || [];
  const pending = receivables.filter((r: any) => r.status !== "recebido");
  if (pending.length > 0) {
    const next = pending[0];
    actions.push({
      icon: CreditCard,
      label: `Quitar parcela ${next.installment_number || ""} — ${fmt(next.gross_value)}`,
      priority: "alta",
      color: "text-warning",
      bgColor: "bg-warning/10",
    });
  }

  if (segments.length > 0) {
    const now = new Date();
    const firstFlight = segments[0];
    const dep = firstFlight?.departure_date ? new Date(firstFlight.departure_date + "T00:00:00") : null;
    const hours = dep ? (dep.getTime() - now.getTime()) / 3600000 : Infinity;
    if (hours <= 48 && hours > 0) {
      actions.push({
        icon: Plane,
        label: `Check-in online — ${firstFlight.airline || ""} ${firstFlight.flight_number || ""}`,
        priority: "urgente",
        color: "text-destructive",
        bgColor: "bg-destructive/10",
      });
    }
  }

  if (attachments.length === 0 && segments.length > 0) {
    actions.push({
      icon: FileText,
      label: "Aguardando envio de documentos pela NatLeva",
      priority: "info",
      color: "text-info",
      bgColor: "bg-info/10",
    });
  }

  if (actions.length === 0) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
      <Card className="overflow-hidden border-accent/20">
        <div className="p-5 sm:p-6 bg-gradient-to-r from-accent/5 via-transparent to-transparent">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-xl bg-accent/15 flex items-center justify-center">
              <Sparkles className="h-4.5 w-4.5 text-accent" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Próximo passo da sua viagem</p>
              <p className="text-xs text-muted-foreground">Ações que precisam da sua atenção</p>
            </div>
          </div>
          <div className="space-y-2.5">
            {actions.map((a, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 + i * 0.08 }}
                className="flex items-center gap-3 p-3.5 rounded-xl bg-background/70 border border-border/40 hover:border-accent/20 hover:shadow-sm transition-all cursor-default"
              >
                <div className={`w-9 h-9 rounded-xl ${a.bgColor} flex items-center justify-center flex-shrink-0`}>
                  <a.icon className={`h-4.5 w-4.5 ${a.color}`} />
                </div>
                <p className="text-sm text-foreground flex-1 font-medium">{a.label}</p>
                <Badge variant="outline" className={`text-[10px] ${a.color} border-current/20`}>{a.priority}</Badge>
              </motion.div>
            ))}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

/* ── Overview Stat Card ── */
function StatCard({ icon: Icon, label, value, isText, delay }: {
  icon: any; label: string; value: string | number; isText?: boolean; delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: "spring", stiffness: 200 }}
    >
      <Card className="p-4 sm:p-5 hover:shadow-lg hover:shadow-accent/5 hover:border-accent/20 transition-all group cursor-default overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/3 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="relative flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center group-hover:bg-accent/15 group-hover:scale-110 transition-all">
            <Icon className="h-6 w-6 text-accent" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-[0.15em] font-medium">{label}</p>
            {isText ? (
              <p className="text-sm font-bold text-foreground mt-0.5 truncate max-w-[140px]">{value}</p>
            ) : (
              <p className="text-2xl font-bold text-foreground mt-0.5 tabular-nums">{value}</p>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

/* ═══════════════════════ MAIN PAGE ═══════════════════════ */
export default function PortalTripDetail() {
  const { saleId } = useParams();
  const id = saleId;
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
        <div className="flex items-center justify-center py-32">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-[3px] border-accent/20 border-t-accent rounded-full animate-spin" />
            <p className="text-muted-foreground text-sm">Carregando viagem...</p>
          </div>
        </div>
      </PortalLayout>
    );
  }

  if (!data || data.error) {
    return (
      <PortalLayout>
        <div className="text-center py-32">
          <AlertTriangle className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
          <p className="text-muted-foreground text-lg font-medium">Viagem não encontrada.</p>
          <Button variant="outline" className="mt-6" onClick={() => navigate("/portal")}>Voltar ao início</Button>
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

  return (
    <PortalLayout>
      <div className="space-y-6 sm:space-y-8">
        {/* Back */}
        <motion.button
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate("/portal")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Voltar ao início
        </motion.button>

        {/* ═══ CINEMATIC HERO ═══ */}
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, ease: "easeOut" }}>
          <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl h-[340px] sm:h-[420px] lg:h-[480px] group">
            <img
              src={getImg(sale?.destination_iata, published?.cover_image_url)}
              alt=""
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1500ms] group-hover:scale-105"
            />
            {/* Cinematic overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/5" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />

            {/* Top - Status */}
            <div className="absolute top-5 left-5 sm:top-8 sm:left-8">
              <TripStatus sale={sale} />
            </div>

            {/* Bottom - Content */}
            <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8 lg:p-10">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                <h1 className="text-2xl sm:text-4xl lg:text-5xl font-bold text-white leading-[1.1] tracking-tight max-w-3xl drop-shadow-lg">
                  {published?.custom_title || sale?.name || "Detalhes da Viagem"}
                </h1>

                {/* Route & date chips */}
                <div className="flex flex-wrap gap-2 mt-4">
                  {sale?.origin_iata && sale?.destination_iata && (
                    <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md text-white/80 text-xs px-3.5 py-2 rounded-full border border-white/10">
                      <Navigation className="h-3.5 w-3.5" />
                      <span className="font-mono tracking-wider text-white">{sale.origin_iata}</span>
                      <ArrowRight className="h-3 w-3 text-white/40" />
                      <span className="font-mono tracking-wider text-white">{sale.destination_iata}</span>
                    </div>
                  )}
                  {sale?.departure_date && (
                    <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md text-white/80 text-xs px-3.5 py-2 rounded-full border border-white/10">
                      <Calendar className="h-3.5 w-3.5" />
                      {fmtDateShort(sale.departure_date)} — {fmtDateShort(sale.return_date)}
                    </div>
                  )}
                  {tripDays > 0 && (
                    <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md text-white/80 text-xs px-3.5 py-2 rounded-full border border-white/10">
                      <Clock className="h-3.5 w-3.5" />
                      {tripDays} {tripDays === 1 ? "dia" : "dias"}
                    </div>
                  )}
                </div>

                {/* Countdown or active indicator */}
                {isUpcoming && sale?.departure_date && (
                  <div className="mt-5">
                    <CinematicCountdown departureDate={sale.departure_date} />
                  </div>
                )}
                {isActive && (
                  <div className="mt-5 flex items-center gap-2.5">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-accent" />
                    </span>
                    <p className="text-accent text-sm font-bold tracking-wide">Viagem em andamento</p>
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* ═══ PROGRESS BAR ═══ */}
        <TripProgressBar sale={sale} />

        {/* ═══ OVERVIEW STATS ═══ */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <StatCard icon={Users} label="Passageiros" value={passengers?.length || 0} delay={0.1} />
          <StatCard icon={Plane} label="Voos" value={segments?.length || 0} delay={0.14} />
          <StatCard icon={Hotel} label="Hotéis" value={allHotels.length} delay={0.18} />
          <StatCard icon={Star} label="Consultor" value={sellerName || "NatLeva"} isText delay={0.22} />
        </div>

        {/* ═══ NEXT ACTIONS ═══ */}
        <NextActionBlock sale={sale} segments={segments || []} financial={financial} attachments={attachments || []} />

        {/* ═══ NOTES ═══ */}
        {published?.notes_for_client && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <Card className="overflow-hidden border-accent/20">
              <div className="p-5 sm:p-6 bg-gradient-to-r from-accent/5 via-transparent to-transparent">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground mb-1.5">Mensagem da NatLeva</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{published.notes_for_client}</p>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ═══ MAP / TIMELINE / CALENDAR ═══ */}
        {segments?.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}>
            <Card className="overflow-hidden">
              <Tabs defaultValue="map" className="w-full">
                <div className="px-5 sm:px-6 pt-5 sm:pt-6">
                  <TabsList className="w-full sm:w-auto grid grid-cols-3 sm:inline-grid bg-muted/50">
                    <TabsTrigger value="map" className="gap-1.5 text-xs sm:text-sm">
                      <MapIcon className="h-3.5 w-3.5" /> Mapa
                    </TabsTrigger>
                    <TabsTrigger value="timeline" className="gap-1.5 text-xs sm:text-sm">
                      <ListOrdered className="h-3.5 w-3.5" /> Timeline
                    </TabsTrigger>
                    <TabsTrigger value="calendar" className="gap-1.5 text-xs sm:text-sm">
                      <CalendarDays className="h-3.5 w-3.5" /> Calendário
                    </TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent value="map" className="px-5 sm:px-6 pb-5 sm:pb-6 pt-4">
                  <PortalJourneyMap segments={segments} hotels={hotels} lodging={lodging} services={services} sale={sale} />
                </TabsContent>
                <TabsContent value="timeline" className="px-5 sm:px-6 pb-5 sm:pb-6 pt-4">
                  <PortalTimeline segments={segments} hotels={hotels} lodging={lodging} services={services} sale={sale} />
                </TabsContent>
                <TabsContent value="calendar" className="px-5 sm:px-6 pb-5 sm:pb-6 pt-4">
                  <PortalCalendar segments={segments} hotels={hotels} lodging={lodging} services={services} sale={sale} />
                </TabsContent>
              </Tabs>
            </Card>
          </motion.div>
        )}

        {/* ═══ CHECKLIST ═══ */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Section title="Preparação da Viagem" icon={CheckCircle2}>
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
          </Section>
        </motion.div>

        {/* ═══ FLIGHTS ═══ */}
        {segments?.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}>
            <Section title="Voos" icon={Plane} count={segments.length}>
              <div className="space-y-3">
                {segments.map((seg: any, i: number) => (
                  <motion.div
                    key={seg.id || i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.35 + i * 0.06 }}
                    className="group/flight flex flex-col sm:flex-row gap-4 p-4 sm:p-5 rounded-2xl bg-muted/20 border border-border/30 hover:border-accent/20 hover:shadow-md hover:shadow-accent/5 transition-all"
                  >
                    <div className="flex items-center gap-3 sm:w-40 flex-shrink-0">
                      <AirlineLogo iata={seg.airline} size={40} />
                      <div>
                        <p className="text-sm font-bold text-foreground">{seg.airline}</p>
                        <p className="text-xs text-muted-foreground font-mono">{seg.flight_number || "—"}</p>
                      </div>
                    </div>
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-[0.15em] font-medium">Origem</p>
                        <p className="text-sm font-bold text-foreground">{iataToLabel(seg.origin_iata)}</p>
                        {seg.departure_date && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <Calendar className="h-3 w-3" />{fmtDateShort(seg.departure_date)}
                            {seg.departure_time && <span className="ml-1 font-mono">{seg.departure_time}</span>}
                          </p>
                        )}
                      </div>
                      <div className="hidden sm:flex items-center justify-center">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <div className="w-10 h-px bg-border group-hover/flight:bg-accent/30 transition-colors" />
                          <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center group-hover/flight:bg-accent/20 transition-colors">
                            <Plane className="h-4 w-4 text-accent" />
                          </div>
                          <div className="w-10 h-px bg-border group-hover/flight:bg-accent/30 transition-colors" />
                        </div>
                      </div>
                      <div className="sm:text-right">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-[0.15em] font-medium">Destino</p>
                        <p className="text-sm font-bold text-foreground">{iataToLabel(seg.destination_iata)}</p>
                        {seg.arrival_time && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1 sm:justify-end">
                            <Clock className="h-3 w-3" /><span className="font-mono">{seg.arrival_time}</span>
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 sm:w-auto sm:flex-col sm:items-end justify-start">
                      {seg.flight_class && <Badge variant="secondary" className="text-[10px]">{seg.flight_class}</Badge>}
                      {seg.terminal && <Badge variant="outline" className="text-[10px]">Terminal {seg.terminal}</Badge>}
                      {seg.direction && (
                        <Badge variant="outline" className="text-[10px]">
                          {seg.direction === "ida" ? "✈️ Ida" : seg.direction === "volta" ? "🔙 Volta" : seg.direction}
                        </Badge>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </Section>
          </motion.div>
        )}

        {/* ═══ HOTELS ═══ */}
        {allHotels.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.34 }}>
            <Section title="Hospedagem" icon={Hotel} count={allHotels.length}>
              <div className="space-y-4">
                {allHotels.map((h: any, i: number) => (
                  <motion.div
                    key={h.id || i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.36 + i * 0.06 }}
                    className="flex flex-col sm:flex-row gap-4 p-4 sm:p-5 rounded-2xl bg-muted/20 border border-border/30 hover:border-accent/20 hover:shadow-md hover:shadow-accent/5 transition-all overflow-hidden"
                  >
                    {/* Hotel image */}
                    <div className="sm:w-40 h-28 sm:h-auto rounded-xl overflow-hidden flex-shrink-0 bg-muted">
                      <img
                        src={`https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=300&fit=crop`}
                        alt={h.hotel_name || "Hotel"}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {/* Hotel info */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-base font-bold text-foreground">
                            {h.hotel_name || h.description || "Hotel"}
                          </p>
                          {(h.hotel_reservation_code || h.reservation_code) && (
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 font-mono">
                              <FileText className="h-3 w-3" />Reserva: {h.hotel_reservation_code || h.reservation_code}
                            </p>
                          )}
                        </div>
                        {h.status && (
                          <Badge variant={h.status === "CONFIRMADO" ? "default" : "secondary"} className="text-[10px] flex-shrink-0">
                            {h.status}
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-3 mt-3">
                        {h.hotel_checkin_datetime_utc && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/40 px-2.5 py-1.5 rounded-lg">
                            <Calendar className="h-3 w-3 text-accent" />
                            Check-in: {new Date(h.hotel_checkin_datetime_utc).toLocaleDateString("pt-BR")}
                          </div>
                        )}
                      </div>
                      {h.notes && (
                        <p className="text-xs text-muted-foreground mt-3 italic bg-muted/30 rounded-lg p-3 border border-border/20">{h.notes}</p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </Section>
          </motion.div>
        )}

        {/* ═══ SERVICES ═══ */}
        {services?.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36 }}>
            <Section title="Serviços e Experiências" icon={Briefcase} count={services.length} defaultOpen={false}>
              <div className="space-y-2.5">
                {services.map((s: any, i: number) => {
                  const cat = (s.product_type || s.category || "").toLowerCase();
                  const isTransfer = cat.includes("transfer");
                  const isSecurity = cat.includes("seguro");
                  const Icon = isTransfer ? Navigation : isSecurity ? Shield : Star;
                  const iconColor = isTransfer ? "text-accent bg-accent/10" : isSecurity ? "text-info bg-info/10" : "text-warning bg-warning/10";

                  return (
                    <div key={s.id || i} className="flex items-center gap-3 p-3.5 rounded-xl bg-muted/20 border border-border/30 hover:border-accent/20 transition-all">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconColor}`}>
                        <Icon className="h-4.5 w-4.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{s.description || s.category}</p>
                        {s.reservation_code && <p className="text-xs text-muted-foreground font-mono mt-0.5">Código: {s.reservation_code}</p>}
                      </div>
                      <Badge variant="secondary" className="text-[10px] flex-shrink-0">{s.product_type || s.category}</Badge>
                    </div>
                  );
                })}
              </div>
            </Section>
          </motion.div>
        )}

        {/* ═══ DOCUMENTS ═══ */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 }}>
          <Section title="Central de Documentos" icon={FileText}>
            <PortalDocumentsCenter
              attachments={attachments || []}
              sale={sale}
              segments={segments || []}
              hotels={allHotels}
              services={services || []}
            />
          </Section>
        </motion.div>

        {/* ═══ FINANCIAL ═══ */}
        {financial?.receivables?.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Section title="Financeiro" icon={DollarSign}>
              {/* Summary cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                {[
                  { icon: DollarSign, label: "Valor Total", value: fmt(totalReceivable), color: "text-accent", bg: "bg-accent/5 border-accent/15" },
                  { icon: CheckCircle2, label: "Pago", value: fmt(totalPaid), color: "text-success", bg: "bg-success/5 border-success/15" },
                  { icon: AlertTriangle, label: "Pendente", value: fmt(totalPending), color: "text-warning", bg: "bg-warning/5 border-warning/15" },
                ].map((c, i) => (
                  <Card key={i} className={`p-4 sm:p-5 ${c.bg}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <c.icon className={`h-4 w-4 ${c.color}`} />
                      <p className="text-[10px] text-muted-foreground uppercase tracking-[0.15em] font-medium">{c.label}</p>
                    </div>
                    <p className={`text-xl sm:text-2xl font-bold ${c.color}`}>{c.value}</p>
                  </Card>
                ))}
              </div>

              {/* Animated Progress */}
              {totalReceivable > 0 && (
                <div className="mb-6">
                  <div className="flex justify-between text-xs text-muted-foreground mb-2">
                    <span>Progresso do pagamento</span>
                    <span className="font-bold text-foreground">{paymentPct}%</span>
                  </div>
                  <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, paymentPct)}%` }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                      className="h-full rounded-full"
                      style={{ background: "linear-gradient(90deg, hsl(var(--accent)), hsl(160, 80%, 60%))" }}
                    />
                  </div>
                </div>
              )}

              {/* Installments */}
              <div className="space-y-2.5">
                {financial.receivables.map((r: any, i: number) => {
                  const isPaid = r.status === "recebido";
                  return (
                    <motion.div
                      key={r.id || i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.45 + i * 0.05 }}
                      className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                        isPaid ? "bg-success/5 border-success/15" : "bg-warning/5 border-warning/15 hover:border-warning/30"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full flex-shrink-0 ${isPaid ? "bg-success" : "bg-warning animate-pulse"}`} />
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {r.description || `Parcela ${r.installment_number || i + 1}`}
                            {r.installment_total > 1 && ` de ${r.installment_total}`}
                          </p>
                          {r.due_date && <p className="text-xs text-muted-foreground">Vencimento: {fmtDate(r.due_date)}</p>}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-foreground">{fmt(r.gross_value)}</p>
                        <div className="flex items-center gap-1.5 justify-end mt-0.5">
                          {isPaid && <CheckCircle2 className="h-3 w-3 text-success" />}
                          <p className="text-xs text-muted-foreground">{r.payment_method || (isPaid ? "Pago" : "Pendente")}</p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </Section>
          </motion.div>
        )}

        {/* ═══ PASSENGERS ═══ */}
        {passengers?.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.42 }}>
            <Section title="Passageiros" icon={Users} count={passengers.length}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {passengers.map((pax: any, i: number) => (
                  <div key={pax.id || i} className="flex items-center gap-4 p-4 rounded-2xl bg-muted/20 border border-border/30 hover:border-accent/20 transition-all">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center flex-shrink-0 text-accent font-bold text-base">
                      {(pax.full_name || "?")[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">{pax.full_name}</p>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {pax.role && <Badge variant="secondary" className="text-[10px]">{pax.role}</Badge>}
                        {pax.birth_date && (
                          <span className="text-[10px] text-muted-foreground">Nasc: {fmtDateShort(pax.birth_date)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          </motion.div>
        )}

        {/* ═══ SUPPORT CTA ═══ */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
          <Card className="overflow-hidden rounded-2xl sm:rounded-3xl relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary to-[hsl(160,30%,15%)]" />
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl -mr-20 -mt-20" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent/5 rounded-full blur-3xl -ml-20 -mb-20" />
            <div className="relative p-6 sm:p-8 lg:p-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
              <div>
                <h3 className="text-xl font-bold text-primary-foreground">Precisa de ajuda?</h3>
                <p className="text-sm text-primary-foreground/60 mt-1.5 max-w-md">
                  {sellerName ? `Fale com ${sellerName} ou com nossa equipe de concierge` : "Nossa equipe de concierge está pronta para ajudar"}
                </p>
              </div>
              <Button
                size="lg"
                className="bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl shadow-lg"
                onClick={() => window.open("https://wa.me/5511999999999", "_blank")}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Falar via WhatsApp
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>
    </PortalLayout>
  );
}
