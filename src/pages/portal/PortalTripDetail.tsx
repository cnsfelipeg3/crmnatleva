import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import PortalLayout from "@/components/portal/PortalLayout";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft, Plane, Hotel, Users, DollarSign, FileText, Calendar, MapPin,
  Clock, Shield, Briefcase, MessageCircle, CheckCircle2,
  AlertTriangle, Info, ChevronDown, ChevronUp, Map as MapIcon, Timer,
  Sparkles, Navigation, Eye, CreditCard, Star, ListOrdered, CalendarDays,
} from "lucide-react";
import AirlineLogo from "@/components/AirlineLogo";
import { iataToLabel } from "@/lib/iataUtils";
import PortalJourneyMap from "@/components/portal/PortalJourneyMap";
import PortalChecklist from "@/components/portal/PortalChecklist";
import PortalDocumentsCenter from "@/components/portal/PortalDocumentsCenter";
import PortalTimeline from "@/components/portal/PortalTimeline";
import PortalCalendar from "@/components/portal/PortalCalendar";
import { getMockTripDetail } from "@/lib/portalMockTrips";

const fmt = (v: number) => v?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) || "R$ 0,00";
const fmtDate = (d: string | null) => {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
};
const fmtDateShort = (d: string | null) => {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
};

/* ─── Countdown ─── */
function Countdown({ departureDate }: { departureDate: string }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);
  const dep = new Date(departureDate + "T00:00:00");
  const diff = dep.getTime() - now.getTime();
  if (diff <= 0) return null;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  return (
    <div className="flex items-center gap-2">
      <div className="bg-white/10 backdrop-blur-sm text-white font-bold text-lg px-3 py-1.5 rounded-lg min-w-[48px] text-center">{days}</div>
      <span className="text-white/60 text-xs">dias</span>
      <div className="bg-white/10 backdrop-blur-sm text-white font-bold text-lg px-3 py-1.5 rounded-lg min-w-[48px] text-center">{hours}</div>
      <span className="text-white/60 text-xs">horas</span>
    </div>
  );
}

/* ─── Trip Status ─── */
function TripStatus({ sale }: { sale: any }) {
  const dep = sale?.departure_date ? new Date(sale.departure_date + "T00:00:00") : null;
  const ret = sale?.return_date ? new Date(sale.return_date + "T23:59:59") : null;
  const now = new Date();
  if (dep && ret && dep <= now && ret >= now)
    return <Badge className="bg-accent/20 text-accent border-accent/30 backdrop-blur-sm text-xs font-semibold">✈️ Em viagem</Badge>;
  if (dep && dep > now)
    return <Badge className="bg-white/15 text-white border-white/20 backdrop-blur-sm text-xs font-semibold">🟢 Confirmada</Badge>;
  if (ret && ret < now)
    return <Badge className="bg-white/10 text-white/60 border-white/10 backdrop-blur-sm text-xs font-semibold">Concluída</Badge>;
  return <Badge className="bg-white/15 text-white border-white/20 backdrop-blur-sm text-xs font-semibold">Agendada</Badge>;
}

/* ─── Section ─── */
function Section({ title, icon: Icon, children, defaultOpen = true, count }: {
  title: string; icon: any; children: React.ReactNode; defaultOpen?: boolean; count?: number;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className="overflow-hidden border-border/50 hover:border-border transition-colors">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 sm:p-6 hover:bg-muted/20 transition-colors group"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center group-hover:bg-accent/15 transition-colors">
            <Icon className="h-5 w-5 text-accent" />
          </div>
          <div className="text-left">
            <h3 className="text-base sm:text-lg font-semibold text-foreground">{title}</h3>
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
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-5 sm:px-6 pb-5 sm:pb-6 pt-0">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

/* ─── Next Action Block ─── */
function NextActionBlock({ sale, segments, financial, attachments }: {
  sale: any; segments: any[]; financial: any; attachments: any[];
}) {
  const actions: { icon: any; label: string; priority: string; color: string }[] = [];

  // Check pending payment
  const receivables = financial?.receivables || [];
  const pending = receivables.filter((r: any) => r.status !== "recebido");
  if (pending.length > 0) {
    const next = pending[0];
    actions.push({
      icon: CreditCard,
      label: `Quitar parcela ${next.installment_number || ""} — ${fmt(next.gross_value)}`,
      priority: "alta",
      color: "text-amber-500",
    });
  }

  // Check check-in
  if (segments.length > 0) {
    const now = new Date();
    const firstFlight = segments[0];
    const dep = firstFlight?.departure_date ? new Date(firstFlight.departure_date + "T00:00:00") : null;
    const hours = dep ? (dep.getTime() - now.getTime()) / (1000 * 60 * 60) : Infinity;
    if (hours <= 48 && hours > 0) {
      actions.push({
        icon: Plane,
        label: `Check-in online — ${firstFlight.airline || ""} ${firstFlight.flight_number || ""}`,
        priority: "urgente",
        color: "text-destructive",
      });
    }
  }

  // Check documents
  if (attachments.length === 0 && segments.length > 0) {
    actions.push({
      icon: FileText,
      label: "Aguardando envio de documentos pela NatLeva",
      priority: "info",
      color: "text-blue-500",
    });
  }

  if (actions.length === 0) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
      <Card className="p-4 sm:p-5 border-accent/20 bg-accent/5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-accent" />
          <p className="text-sm font-semibold text-foreground">Próximas ações</p>
        </div>
        <div className="space-y-2">
          {actions.map((a, i) => (
            <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-background/60 border border-border/30">
              <a.icon className={`h-4 w-4 ${a.color} flex-shrink-0`} />
              <p className="text-sm text-foreground flex-1">{a.label}</p>
              <Badge variant="outline" className="text-[10px]">{a.priority}</Badge>
            </div>
          ))}
        </div>
      </Card>
    </motion.div>
  );
}

/* ─── Main Page ─── */
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
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-[3px] border-accent/20 border-t-accent rounded-full animate-spin" />
        </div>
      </PortalLayout>
    );
  }

  if (!data || data.error) {
    return (
      <PortalLayout>
        <div className="text-center py-20">
          <AlertTriangle className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">Viagem não encontrada.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/portal")}>Voltar</Button>
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

  // Trip time status
  const dep = sale?.departure_date ? new Date(sale.departure_date + "T00:00:00") : null;
  const ret = sale?.return_date ? new Date(sale.return_date + "T23:59:59") : null;
  const now = new Date();
  const isUpcoming = dep && dep > now;
  const isActive = dep && ret && dep <= now && ret >= now;

  // Calculate trip days
  const tripDays = dep && ret ? Math.ceil((ret.getTime() - dep.getTime()) / (1000 * 60 * 60 * 24)) : 0;

  return (
    <PortalLayout>
      <div className="space-y-6">
        {/* Back button */}
        <button onClick={() => navigate("/portal")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Voltar ao início
        </button>

        {/* ═══ CINEMATIC HERO ═══ */}
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
          <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl h-[260px] sm:h-[340px] group">
            <img
              src={published?.cover_image_url || "https://images.unsplash.com/photo-1488085061387-422e29b40080?w=1200&h=600&fit=crop"}
              alt=""
              className="w-full h-full object-cover transition-transform duration-[8s] group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10" />

            {/* Status badge */}
            <div className="absolute top-5 left-5 sm:top-6 sm:left-6">
              <TripStatus sale={sale} />
            </div>

            {/* Content */}
            <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8">
              <h1 className="text-2xl sm:text-4xl font-bold text-white leading-tight drop-shadow-lg">
                {published?.custom_title || sale?.name || "Detalhes da Viagem"}
              </h1>

              {/* Route & date badges */}
              <div className="flex flex-wrap gap-2 mt-3">
                {sale?.origin_iata && sale?.destination_iata && (
                  <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm text-white/90 text-xs px-3 py-1.5 rounded-full">
                    <Navigation className="h-3 w-3" />
                    {iataToLabel(sale.origin_iata)} → {iataToLabel(sale.destination_iata)}
                  </div>
                )}
                {sale?.departure_date && (
                  <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm text-white/90 text-xs px-3 py-1.5 rounded-full">
                    <Calendar className="h-3 w-3" />
                    {fmtDateShort(sale.departure_date)} — {fmtDateShort(sale.return_date)}
                  </div>
                )}
                {tripDays > 0 && (
                  <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm text-white/90 text-xs px-3 py-1.5 rounded-full">
                    <Clock className="h-3 w-3" />
                    {tripDays} {tripDays === 1 ? "dia" : "dias"}
                  </div>
                )}
              </div>

              {/* Countdown */}
              {isUpcoming && sale?.departure_date && (
                <div className="mt-4">
                  <p className="text-white/50 text-xs uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Timer className="h-3 w-3" /> Embarque em
                  </p>
                  <Countdown departureDate={sale.departure_date} />
                </div>
              )}

              {isActive && (
                <div className="mt-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                  <p className="text-accent text-sm font-semibold">Viagem em andamento</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* ═══ OVERVIEW CARDS ═══ */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: Users, label: "Passageiros", value: passengers?.length || 0, suffix: "" },
              { icon: Plane, label: "Voos", value: segments?.length || 0, suffix: "" },
              { icon: Hotel, label: "Hotéis", value: allHotels.length, suffix: "" },
              { icon: Star, label: "Consultor", value: sellerName || "NatLeva", suffix: "", isText: true },
            ].map((card, i) => (
              <Card key={i} className="p-4 hover:shadow-md hover:border-accent/20 transition-all group cursor-default">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center group-hover:bg-accent/15 group-hover:scale-110 transition-all">
                    <card.icon className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">{card.label}</p>
                    {(card as any).isText ? (
                      <p className="text-sm font-semibold text-foreground mt-0.5 truncate">{card.value}</p>
                    ) : (
                      <p className="text-xl font-bold text-foreground mt-0.5">{card.value}{card.suffix}</p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </motion.div>

        {/* ═══ NEXT ACTIONS ═══ */}
        <NextActionBlock sale={sale} segments={segments || []} financial={financial} attachments={attachments || []} />

        {/* ═══ NOTES FROM NATLEVA ═══ */}
        {published?.notes_for_client && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Card className="p-5 bg-accent/5 border-accent/20">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground mb-1">Mensagem da NatLeva</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{published.notes_for_client}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ═══ MAIN TABS: Mapa / Timeline / Calendário ═══ */}
        {segments?.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
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
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
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
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
            <Section title="Voos" icon={Plane} count={segments.length}>
              <div className="space-y-3">
                {segments.map((seg: any, i: number) => (
                  <div key={seg.id || i} className="flex flex-col sm:flex-row gap-4 p-4 rounded-xl bg-muted/20 border border-border/30 hover:border-border/60 hover:shadow-sm transition-all">
                    <div className="flex items-center gap-3 sm:w-36 flex-shrink-0">
                      <AirlineLogo iata={seg.airline} size={36} />
                      <div>
                        <p className="text-sm font-semibold text-foreground">{seg.airline}</p>
                        <p className="text-xs text-muted-foreground">{seg.flight_number || "—"}</p>
                      </div>
                    </div>
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Origem</p>
                        <p className="text-sm font-semibold">{iataToLabel(seg.origin_iata)}</p>
                        {seg.departure_date && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Calendar className="h-3 w-3" />{fmtDateShort(seg.departure_date)}
                            {seg.departure_time && <><Clock className="h-3 w-3 ml-1" />{seg.departure_time}</>}
                          </p>
                        )}
                      </div>
                      <div className="hidden sm:flex items-center justify-center">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <div className="w-8 h-px bg-border" />
                          <Plane className="h-4 w-4 text-accent" />
                          <div className="w-8 h-px bg-border" />
                        </div>
                      </div>
                      <div className="sm:text-right">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Destino</p>
                        <p className="text-sm font-semibold">{iataToLabel(seg.destination_iata)}</p>
                        {seg.arrival_time && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 sm:justify-end">
                            <Clock className="h-3 w-3" />{seg.arrival_time}
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
                  </div>
                ))}
              </div>
            </Section>
          </motion.div>
        )}

        {/* ═══ HOTELS ═══ */}
        {allHotels.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <Section title="Hospedagem" icon={Hotel} count={allHotels.length}>
              <div className="space-y-3">
                {allHotels.map((h: any, i: number) => (
                  <div key={h.id || i} className="p-4 rounded-xl bg-muted/20 border border-border/30 hover:border-border/60 hover:shadow-sm transition-all">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Hotel className="h-5 w-5 text-amber-500" />
                        </div>
                        <div>
                          <p className="text-base font-semibold text-foreground">
                            {h.hotel_name || h.description || "Hotel"}
                          </p>
                          {(h.hotel_reservation_code || h.reservation_code) && (
                            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                              <FileText className="h-3 w-3" />Reserva: {h.hotel_reservation_code || h.reservation_code}
                            </p>
                          )}
                        </div>
                      </div>
                      {h.status && (
                        <Badge variant={h.status === "CONFIRMADO" ? "default" : "secondary"} className="flex-shrink-0 text-[10px]">
                          {h.status}
                        </Badge>
                      )}
                    </div>
                    {h.hotel_checkin_datetime_utc && (
                      <p className="text-sm text-muted-foreground mt-3 flex items-center gap-1.5 ml-[52px]">
                        <Calendar className="h-3.5 w-3.5" />
                        Check-in: {new Date(h.hotel_checkin_datetime_utc).toLocaleDateString("pt-BR")}
                      </p>
                    )}
                    {h.notes && (
                      <p className="text-xs text-muted-foreground mt-2 ml-[52px] italic bg-muted/30 rounded-lg p-2.5">{h.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          </motion.div>
        )}

        {/* ═══ SERVICES ═══ */}
        {services?.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}>
            <Section title="Serviços e Experiências" icon={Briefcase} count={services.length} defaultOpen={false}>
              <div className="space-y-2">
                {services.map((s: any, i: number) => {
                  const cat = (s.product_type || s.category || "").toLowerCase();
                  const isTransfer = cat.includes("transfer");
                  const isSecurity = cat.includes("seguro");
                  const Icon = isTransfer ? Navigation : isSecurity ? Shield : Star;
                  const iconColor = isTransfer ? "text-emerald-500 bg-emerald-500/10" : isSecurity ? "text-blue-500 bg-blue-500/10" : "text-purple-500 bg-purple-500/10";

                  return (
                    <div key={s.id || i} className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 border border-border/30 hover:border-border/60 transition-all">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${iconColor}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{s.description || s.category}</p>
                        {s.reservation_code && <p className="text-xs text-muted-foreground">Código: {s.reservation_code}</p>}
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
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
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
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.33 }}>
            <Section title="Financeiro" icon={DollarSign}>
              {/* Financial Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                <Card className="p-4 bg-accent/5 border-accent/20">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="h-4 w-4 text-accent" />
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Valor Total</p>
                  </div>
                  <p className="text-xl font-bold text-foreground">{fmt(totalReceivable)}</p>
                </Card>
                <Card className="p-4 bg-emerald-500/5 border-emerald-500/20">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Pago</p>
                  </div>
                  <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{fmt(totalPaid)}</p>
                </Card>
                <Card className="p-4 bg-amber-500/5 border-amber-500/20">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Pendente</p>
                  </div>
                  <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{fmt(totalPending)}</p>
                </Card>
              </div>

              {/* Animated Progress */}
              {totalReceivable > 0 && (
                <div className="mb-5">
                  <div className="flex justify-between text-xs text-muted-foreground mb-2">
                    <span>Progresso do pagamento</span>
                    <span className="font-semibold text-foreground">{paymentPct}%</span>
                  </div>
                  <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, paymentPct)}%` }}
                      transition={{ duration: 1.2, ease: "easeOut" }}
                      className="h-full bg-gradient-to-r from-accent to-emerald-400 rounded-full relative"
                    >
                      {paymentPct >= 15 && (
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-white">
                          {paymentPct}%
                        </span>
                      )}
                    </motion.div>
                  </div>
                </div>
              )}

              {/* Parcels */}
              <div className="space-y-2">
                {financial.receivables.map((r: any, i: number) => {
                  const isPaid = r.status === "recebido";
                  return (
                    <div key={r.id || i} className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                      isPaid ? "bg-emerald-500/5 border-emerald-500/10" : "bg-amber-500/5 border-amber-500/10"
                    }`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${isPaid ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`} />
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {r.description || `Parcela ${r.installment_number || i + 1}`}
                            {r.installment_total > 1 && ` de ${r.installment_total}`}
                          </p>
                          {r.due_date && <p className="text-xs text-muted-foreground">Vencimento: {fmtDate(r.due_date)}</p>}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-foreground">{fmt(r.gross_value)}</p>
                        <div className="flex items-center gap-1.5 justify-end mt-0.5">
                          {isPaid && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
                          <p className="text-xs text-muted-foreground">{r.payment_method || (isPaid ? "Pago" : "Pendente")}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Section>
          </motion.div>
        )}

        {/* ═══ PASSENGERS ═══ */}
        {passengers?.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36 }}>
            <Section title="Passageiros" icon={Users} count={passengers.length}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {passengers.map((pax: any, i: number) => (
                  <div key={pax.id || i} className="flex items-center gap-4 p-4 rounded-xl bg-muted/20 border border-border/30">
                    <div className="w-11 h-11 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0 text-accent font-bold text-sm">
                      {(pax.full_name || "?")[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{pax.full_name}</p>
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
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="p-6 sm:p-8 bg-gradient-to-r from-primary to-[hsl(160,30%,15%)] text-primary-foreground rounded-2xl overflow-hidden relative">
            <div className="absolute top-0 right-0 w-48 h-48 bg-accent/5 rounded-full blur-3xl -mr-20 -mt-20" />
            <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold">Precisa de ajuda?</h3>
                <p className="text-sm text-primary-foreground/70 mt-1">
                  {sellerName ? `Fale com ${sellerName} ou com nossa equipe` : "Nossa equipe está pronta para ajudar"}
                </p>
              </div>
              <Button
                size="lg"
                className="bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl"
                onClick={() => window.open("https://wa.me/5511999999999", "_blank")}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                WhatsApp
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>
    </PortalLayout>
  );
}
