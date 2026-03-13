import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import PortalLayout from "@/components/portal/PortalLayout";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Compass, MessageCircle, Map as MapIcon, ListOrdered, CalendarDays, Sparkles,
  CreditCard, Plane, FileText, ChevronRight, Users, Hotel, Ticket, CircleDollarSign,
  Clock, Download, Share2, Shield, MapPin, ArrowDown, Star,
} from "lucide-react";
import {
  JourneyHero, getDestinationImage, getTripStatus, getTripDays,
  Countdown, FlightCard, HotelCard, ExperienceBlock, FinanceSummary,
  JourneyProgress,
} from "@/components/travel-ui";
import PortalJourneyMap from "@/components/portal/PortalJourneyMap";
import PortalChecklist from "@/components/portal/PortalChecklist";
import PortalDocumentsCenter from "@/components/portal/PortalDocumentsCenter";
import PortalTimeline from "@/components/portal/PortalTimeline";
import PortalCalendar from "@/components/portal/PortalCalendar";
import { getMockTripDetail } from "@/lib/portalMockTrips";

const fmt = (v: number) => v?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) || "R$ 0,00";

/* ═══ FLOATING NAV ═══ */
function FloatingNav({ sections, activeSection }: { sections: { id: string; label: string; icon: any; count?: number }[]; activeSection: string }) {
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.6 }}
      className="sticky top-16 z-40 bg-card/80 backdrop-blur-xl border-b border-border/30 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8"
    >
      <div className="flex gap-1 overflow-x-auto py-2 scrollbar-hide">
        {sections.map((s) => {
          const Icon = s.icon;
          const isActive = activeSection === s.id;
          return (
            <button
              key={s.id}
              onClick={() => scrollTo(s.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? "bg-accent/10 text-accent shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {s.label}
              {s.count !== undefined && s.count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? "bg-accent/20" : "bg-muted"}`}>
                  {s.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}

/* ═══ TRIP STATS BAR ═══ */
function TripStatsBar({ segments, hotels, services, passengers, days }: {
  segments: any[]; hotels: any[]; services: any[]; passengers: any[]; days: number;
}) {
  const stats = [
    { icon: Plane, value: segments.length, label: "Voos" },
    { icon: Hotel, value: hotels.length, label: "Hotéis" },
    { icon: Ticket, value: services.length, label: "Experiências" },
    { icon: Users, value: passengers.length, label: "Viajantes" },
    { icon: Clock, value: days, label: "Dias" },
  ].filter(s => s.value > 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3 py-4"
    >
      {stats.map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 + i * 0.05 }}
          className="relative flex flex-col items-center gap-1.5 py-4 rounded-2xl bg-card/60 border border-border/30 backdrop-blur-sm overflow-hidden group hover:border-accent/20 transition-all"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-accent/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <s.icon className="h-5 w-5 text-accent/70" />
          <p className="text-2xl font-black text-foreground tabular-nums">{s.value}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-[0.15em] font-medium">{s.label}</p>
        </motion.div>
      ))}
    </motion.div>
  );
}

/* ═══ WELCOME BLOCK ═══ */
function WelcomeBlock({ sale, segments, financial, attachments, message }: {
  sale: any; segments: any[]; financial: any; attachments: any[]; message?: string | null;
}) {
  const actions: { icon: React.ReactNode; label: string; detail?: string; accent: string; urgency?: boolean }[] = [];
  const receivables = financial?.receivables || [];
  const pending = receivables.filter((r: any) => r.status !== "recebido");
  if (pending.length > 0) {
    const overdue = pending.some((p: any) => p.due_date && new Date(p.due_date + "T00:00:00") < new Date());
    actions.push({
      icon: <CreditCard className="h-4 w-4" />,
      label: overdue ? "Parcela vencida" : "Parcela pendente",
      detail: fmt(pending[0].gross_value),
      accent: overdue ? "text-destructive" : "text-amber-500",
      urgency: overdue,
    });
  }
  if (segments.length > 0) {
    const now = new Date();
    const first = segments[0];
    const dep = first?.departure_date ? new Date(first.departure_date + "T00:00:00") : null;
    const hours = dep ? (dep.getTime() - now.getTime()) / 3600000 : Infinity;
    if (hours <= 72 && hours > 0) {
      actions.push({
        icon: <Plane className="h-4 w-4" />,
        label: hours <= 24 ? "🔴 Check-in urgente" : "Check-in disponível",
        detail: `${first.airline || ""} ${first.flight_number || ""}`.trim(),
        accent: hours <= 24 ? "text-destructive" : "text-accent",
        urgency: hours <= 24,
      });
    }
  }
  if (attachments.length === 0 && segments.length > 0) {
    actions.push({
      icon: <FileText className="h-4 w-4" />,
      label: "Documentos em preparação",
      detail: "Nossa equipe está trabalhando nisso",
      accent: "text-muted-foreground",
    });
  }

  if (!message && actions.length === 0) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-8">
      <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
        {message && (
          <div className="p-6 sm:p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-accent/5 rounded-full blur-[60px] -mr-10 -mt-10" />
            <div className="flex items-center gap-2.5 mb-4 relative">
              <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-accent" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">Equipe NatLeva</p>
                <p className="text-[10px] text-muted-foreground">Mensagem personalizada</p>
              </div>
            </div>
            <p className="text-sm sm:text-base text-foreground/80 leading-relaxed whitespace-pre-wrap relative">{message}</p>
          </div>
        )}

        {actions.length > 0 && (
          <div className={message ? "border-t border-border/30" : ""}>
            <div className="p-5 sm:px-8 sm:py-5">
              <p className="text-[10px] text-muted-foreground/50 uppercase tracking-[0.4em] font-medium mb-4">
                {actions.filter(a => a.urgency).length > 0 ? "⚡ Ações urgentes" : `${actions.length} ação${actions.length > 1 ? "ões" : ""} pendente${actions.length > 1 ? "s" : ""}`}
              </p>
              <div className="space-y-1">
                {actions.sort((a, b) => (b.urgency ? 1 : 0) - (a.urgency ? 1 : 0)).map((a, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + i * 0.05 }}
                    className={`flex items-center gap-4 py-3 group cursor-pointer hover:bg-muted/30 -mx-3 px-3 rounded-xl transition-colors ${a.urgency ? "bg-destructive/[0.03]" : ""}`}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      a.urgency ? "bg-destructive/10" : "bg-muted/50"
                    }`}>
                      <span className={a.accent}>{a.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{a.label}</p>
                      {a.detail && <p className="text-xs text-muted-foreground/60 mt-0.5">{a.detail}</p>}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/15 group-hover:text-muted-foreground/40 transition-colors" />
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ═══ SECTION HEADER ═══ */
function SectionHeader({ id, icon: Icon, title, subtitle, count, children }: {
  id: string; icon: any; title: string; subtitle?: string; count?: number; children?: React.ReactNode;
}) {
  return (
    <motion.div
      id={id}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="mb-8 scroll-mt-28"
    >
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <Icon className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
              {title}
              {count !== undefined && (
                <span className="text-sm font-normal text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">{count}</span>
              )}
            </h2>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
        </div>
      </div>
      {children}
    </motion.div>
  );
}

/* ═══ PASSENGER CARD ═══ */
function PassengerCard({ pax, index }: { pax: any; index: number }) {
  const initial = (pax.full_name || "?")[0]?.toUpperCase();
  const colors = [
    "from-accent/30 to-accent/10",
    "from-info/30 to-info/10",
    "from-warning/30 to-warning/10",
    "from-primary/30 to-primary/10",
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.1 + index * 0.06 }}
      className="flex items-center gap-4 p-4 rounded-2xl border border-border/30 hover:border-accent/20 transition-all bg-card group hover:shadow-md hover:shadow-accent/5"
    >
      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${colors[index % colors.length]} flex items-center justify-center flex-shrink-0 text-accent font-black text-xl group-hover:scale-110 transition-transform`}>
        {initial}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-foreground truncate">{pax.full_name}</p>
        <div className="flex items-center gap-2 mt-1">
          {pax.role && (
            <span className="text-[10px] text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-full">{pax.role}</span>
          )}
          {pax.cpf && (
            <span className="text-[10px] text-muted-foreground">CPF: •••{pax.cpf?.slice(-4)}</span>
          )}
        </div>
        {pax.passport_number && (
          <div className="flex items-center gap-1.5 mt-1.5">
            <Shield className="h-3 w-3 text-accent/50" />
            <span className="text-[10px] text-muted-foreground">Passaporte: {pax.passport_number}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ═══ MAIN COMPONENT ═══ */
export default function PortalTripDetail() {
  const { saleId } = useParams();
  const id = saleId;
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("jornada");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      const mockData = getMockTripDetail(id || "");
      if (mockData) {
        setData({
          subtitle: mockData.subtitle,
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

  // Intersection Observer for active section
  useEffect(() => {
    if (!data) return;
    const sections = document.querySelectorAll("[data-section]");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: "-30% 0px -50% 0px" }
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [data]);

  if (loading) {
    return (
      <PortalLayout>
        <div className="flex items-center justify-center py-40">
          <div className="flex flex-col items-center gap-5">
            <div className="relative">
              <div className="w-16 h-16 border-[3px] border-accent/20 border-t-accent rounded-full animate-spin" />
              <Plane className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-accent/60" />
            </div>
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
  const status = getTripStatus(sale || {});
  const tripDays = getTripDays(sale || {});
  const title = published?.custom_title || sale?.name || "Sua Jornada";
  const subtitle = data?.subtitle || published?.subtitle || undefined;
  const imageUrl = getDestinationImage(sale?.destination_iata, published?.cover_image_url);

  const navSections = [
    segments?.length > 0 && { id: "jornada", label: "Jornada", icon: MapIcon },
    segments?.length > 0 && { id: "voos", label: "Voos", icon: Plane, count: segments.length },
    allHotels.length > 0 && { id: "hospedagem", label: "Hotéis", icon: Hotel, count: allHotels.length },
    services?.length > 0 && { id: "experiencias", label: "Experiências", icon: Star, count: services.length },
    { id: "preparacao", label: "Preparação", icon: Shield },
    { id: "documentos", label: "Documentos", icon: FileText, count: attachments?.length || 0 },
    financial?.receivables?.length > 0 && { id: "financeiro", label: "Financeiro", icon: CreditCard },
    passengers?.length > 0 && { id: "viajantes", label: "Viajantes", icon: Users, count: passengers.length },
  ].filter(Boolean) as any[];

  return (
    <PortalLayout>
      <div ref={containerRef}>

        <JourneyHero
          title={title}
          subtitle={subtitle}
          imageUrl={imageUrl}
          originIata={sale?.origin_iata}
          destinationIata={sale?.destination_iata}
          departureDate={sale?.departure_date}
          returnDate={sale?.return_date}
          status={status}
          tripDays={tripDays}
          onBack={() => navigate("/portal")}
        >
          {status === "upcoming" && sale?.departure_date && <Countdown departureDate={sale.departure_date} />}
          {status === "active" && (
            <div className="mt-6 flex items-center gap-3">
              <span className="relative flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-accent" />
              </span>
              <span className="text-white font-bold text-lg">Viagem em andamento</span>
            </div>
          )}
        </JourneyHero>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

          <JourneyProgress departureDate={sale?.departure_date} returnDate={sale?.return_date} />

          <TripStatsBar
            segments={segments || []}
            hotels={allHotels}
            services={services || []}
            passengers={passengers || []}
            days={tripDays}
          />

          <WelcomeBlock sale={sale} segments={segments || []} financial={financial} attachments={attachments || []} message={published?.notes_for_client} />

          <FloatingNav sections={navSections} activeSection={activeSection} />

          {/* ── Jornada ── */}
          {segments?.length > 0 && (
            <div id="jornada" data-section className="scroll-mt-28 pt-6">
              <SectionHeader id="jornada-header" icon={MapIcon} title="Sua Jornada" subtitle="Mapa, timeline e calendário da viagem">
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
              </SectionHeader>
            </div>
          )}

          {/* ── Voos ── */}
          {segments?.length > 0 && (
            <div id="voos" data-section className="scroll-mt-28">
              <SectionHeader id="voos-header" icon={Plane} title="Seus Voos" subtitle="Detalhes de cada trecho aéreo" count={segments.length}>
                <div className="space-y-4">
                  {segments.map((seg: any, i: number) => (
                    <FlightCard key={seg.id || i} segment={seg} index={i} />
                  ))}
                </div>
              </SectionHeader>
            </div>
          )}

          {/* ── Hospedagem ── */}
          {allHotels.length > 0 && (
            <div id="hospedagem" data-section className="scroll-mt-28">
              <SectionHeader id="hospedagem-header" icon={Hotel} title="Hospedagem" subtitle="Seus hotéis e acomodações" count={allHotels.length}>
                <div className="space-y-4">
                  {allHotels.map((h: any, i: number) => (
                    <HotelCard key={h.id || i} hotel={h} index={i} />
                  ))}
                </div>
              </SectionHeader>
            </div>
          )}

          {/* ── Experiências ── */}
          {services?.length > 0 && (
            <div id="experiencias" data-section className="scroll-mt-28">
              <SectionHeader id="experiencias-header" icon={Star} title="Experiências" subtitle="Passeios, transfers e atividades" count={services.length}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {services.map((s: any, i: number) => (
                    <ExperienceBlock key={s.id || i} service={s} index={i} />
                  ))}
                </div>
              </SectionHeader>
            </div>
          )}

          {/* ── Preparação ── */}
          <div id="preparacao" data-section className="scroll-mt-28">
            <SectionHeader id="preparacao-header" icon={Shield} title="Preparação" subtitle="Checklist inteligente da sua viagem">
              <div className="rounded-2xl border border-border/40 overflow-hidden bg-card p-5 sm:p-6">
                <PortalChecklist sale={sale} segments={segments || []} hotels={hotels || []} services={services || []} passengers={passengers || []} attachments={attachments || []} financial={financial || { receivables: [] }} lodging={lodging || []} />
              </div>
            </SectionHeader>
          </div>

          {/* ── Documentos ── */}
          <div id="documentos" data-section className="scroll-mt-28">
            <SectionHeader id="documentos-header" icon={FileText} title="Documentos" subtitle="Vouchers, e-tickets, comprovantes e mais" count={attachments?.length}>
              <div className="rounded-2xl border border-border/40 overflow-hidden bg-card p-5 sm:p-6">
                <PortalDocumentsCenter attachments={attachments || []} sale={sale} segments={segments || []} hotels={allHotels} services={services || []} />
              </div>
            </SectionHeader>
          </div>

          {/* ── Financeiro ── */}
          {financial?.receivables?.length > 0 && (
            <div id="financeiro" data-section className="scroll-mt-28">
              <SectionHeader id="financeiro-header" icon={CreditCard} title="Financeiro" subtitle="Resumo de pagamentos e parcelas">
                <FinanceSummary receivables={financial.receivables} />
                <motion.a
                  href={`/portal/financeiro?sale=${saleId}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-4 flex items-center justify-center gap-2 py-3 rounded-xl border border-accent/20 bg-accent/[0.04] text-accent text-sm font-semibold hover:bg-accent/10 transition-all"
                >
                  <CircleDollarSign className="h-4 w-4" />
                  Abrir Painel Financeiro Completo
                  <ChevronRight className="h-4 w-4" />
                </motion.a>
              </SectionHeader>
            </div>
          )}

          {/* ── Viajantes ── */}
          {passengers?.length > 0 && (
            <div id="viajantes" data-section className="scroll-mt-28">
              <SectionHeader id="viajantes-header" icon={Users} title="Viajantes" subtitle="Passageiros desta viagem" count={passengers.length}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {passengers.map((pax: any, i: number) => (
                    <PassengerCard key={pax.id || i} pax={pax} index={i} />
                  ))}
                </div>
              </SectionHeader>
            </div>
          )}

          {/* ── CTA / Suporte ── */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="mb-8 mt-4">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary via-primary to-[hsl(160,30%,15%)]">
              <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10 rounded-full blur-[80px] -mr-20 -mt-20" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-info/10 rounded-full blur-[60px] -ml-10 -mb-10" />
              <div className="p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 relative">
                <div>
                  <h3 className="text-xl font-bold text-primary-foreground">Precisa de ajuda?</h3>
                  <p className="text-sm text-primary-foreground/50 mt-1.5 max-w-md">
                    {sellerName ? `Fale com ${sellerName} ou com nossa equipe de concierge` : "Nosso concierge está pronto para ajudar com qualquer detalhe da viagem"}
                  </p>
                </div>
                <button onClick={() => window.open("https://wa.me/5511999999999", "_blank")}
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl text-sm font-semibold border border-white/15 transition-all shadow-lg hover:shadow-xl hover:scale-105">
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </button>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </PortalLayout>
  );
}
