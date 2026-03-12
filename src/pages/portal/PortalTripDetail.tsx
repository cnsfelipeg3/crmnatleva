import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import PortalLayout from "@/components/portal/PortalLayout";
import { motion } from "framer-motion";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Compass, MessageCircle, Map as MapIcon, ListOrdered, CalendarDays, Sparkles,
  CreditCard, Plane, FileText, ChevronRight,
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

function WelcomeBlock({ sale, segments, financial, attachments, message }: {
  sale: any; segments: any[]; financial: any; attachments: any[]; message?: string | null;
}) {
  const actions: { icon: React.ReactNode; label: string; detail?: string; accent: string }[] = [];
  const receivables = financial?.receivables || [];
  const pending = receivables.filter((r: any) => r.status !== "recebido");
  if (pending.length > 0) {
    actions.push({ icon: <CreditCard className="h-4 w-4" />, label: "Parcela pendente", detail: fmt(pending[0].gross_value), accent: "text-amber-500" });
  }
  if (segments.length > 0) {
    const now = new Date();
    const first = segments[0];
    const dep = first?.departure_date ? new Date(first.departure_date + "T00:00:00") : null;
    const hours = dep ? (dep.getTime() - now.getTime()) / 3600000 : Infinity;
    if (hours <= 48 && hours > 0) {
      actions.push({ icon: <Plane className="h-4 w-4" />, label: "Check-in disponível", detail: `${first.airline || ""} ${first.flight_number || ""}`.trim(), accent: "text-destructive" });
    }
  }
  if (attachments.length === 0 && segments.length > 0) {
    actions.push({ icon: <FileText className="h-4 w-4" />, label: "Documentos em preparação", detail: "Nossa equipe está trabalhando nisso", accent: "text-muted-foreground" });
  }

  if (!message && actions.length === 0) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-10">
      <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
        {/* Message */}
        {message && (
          <div className="p-6 sm:p-8">
            <div className="flex items-center gap-2.5 mb-4">
              <Sparkles className="h-4 w-4 text-accent" />
              <p className="text-[10px] text-accent uppercase tracking-[0.4em] font-semibold">Equipe NatLeva</p>
            </div>
            <p className="text-sm sm:text-base text-foreground/80 leading-relaxed whitespace-pre-wrap">{message}</p>
          </div>
        )}

        {/* Actions */}
        {actions.length > 0 && (
          <div className={message ? "border-t border-border/30" : ""}>
            <div className="p-5 sm:px-8 sm:py-5">
              <p className="text-[10px] text-muted-foreground/50 uppercase tracking-[0.4em] font-medium mb-4">
                {actions.length === 1 ? "Ação pendente" : `${actions.length} ações pendentes`}
              </p>
              <div className="space-y-1">
                {actions.map((a, i) => (
                  <div key={i} className="flex items-center gap-4 py-2.5 group cursor-pointer hover:bg-muted/30 -mx-3 px-3 rounded-xl transition-colors">
                    <span className={`${a.accent} opacity-60`}>{a.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{a.label}</p>
                      {a.detail && <p className="text-xs text-muted-foreground/60 mt-0.5">{a.detail}</p>}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/15 group-hover:text-muted-foreground/40 transition-colors" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

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
  const status = getTripStatus(sale || {});
  const tripDays = getTripDays(sale || {});
  const title = published?.custom_title || sale?.name || "Sua Jornada";
  const subtitle = data?.subtitle || published?.subtitle || undefined;
  const imageUrl = getDestinationImage(sale?.destination_iata, published?.cover_image_url);

  return (
    <PortalLayout>
      <div className="-mx-4 sm:-mx-6 lg:-mx-8 -mt-6 sm:-mt-8">

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
          <WelcomeBlock sale={sale} segments={segments || []} financial={financial} attachments={attachments || []} message={published?.notes_for_client} />

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

          {segments?.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="mb-8">
              <h2 className="text-2xl font-bold text-foreground tracking-tight mb-5">Seus Voos</h2>
              <div className="space-y-4">
                {segments.map((seg: any, i: number) => (
                  <FlightCard key={seg.id || i} segment={seg} index={i} />
                ))}
              </div>
            </motion.div>
          )}

          {allHotels.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mb-8">
              <h2 className="text-2xl font-bold text-foreground tracking-tight mb-5">Hospedagem</h2>
              <div className="space-y-4">
                {allHotels.map((h: any, i: number) => (
                  <HotelCard key={h.id || i} hotel={h} index={i} />
                ))}
              </div>
            </motion.div>
          )}

          {services?.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.33 }} className="mb-8">
              <h2 className="text-2xl font-bold text-foreground tracking-tight mb-5">Experiências</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {services.map((s: any, i: number) => (
                  <ExperienceBlock key={s.id || i} service={s} index={i} />
                ))}
              </div>
            </motion.div>
          )}

          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36 }} className="mb-8">
            <h2 className="text-2xl font-bold text-foreground tracking-tight mb-5">Preparação</h2>
            <div className="rounded-2xl border border-border/40 overflow-hidden bg-card p-5 sm:p-6">
              <PortalChecklist sale={sale} segments={segments || []} hotels={hotels || []} services={services || []} passengers={passengers || []} attachments={attachments || []} financial={financial || { receivables: [] }} lodging={lodging || []} />
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 }} className="mb-8">
            <h2 className="text-2xl font-bold text-foreground tracking-tight mb-5">Documentos</h2>
            <div className="rounded-2xl border border-border/40 overflow-hidden bg-card p-5 sm:p-6">
              <PortalDocumentsCenter attachments={attachments || []} sale={sale} segments={segments || []} hotels={allHotels} services={services || []} />
            </div>
          </motion.div>

          {financial?.receivables?.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mb-8">
              <h2 className="text-2xl font-bold text-foreground tracking-tight mb-5">Financeiro</h2>
              <FinanceSummary receivables={financial.receivables} />
            </motion.div>
          )}

          {passengers?.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.42 }} className="mb-8">
              <h2 className="text-2xl font-bold text-foreground tracking-tight mb-5">Viajantes</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {passengers.map((pax: any, i: number) => (
                  <motion.div key={pax.id || i} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.44 + i * 0.04 }}
                    className="flex items-center gap-4 p-4 rounded-2xl border border-border/40 hover:border-accent/20 transition-all bg-card">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center flex-shrink-0 text-accent font-bold text-lg">
                      {(pax.full_name || "?")[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">{pax.full_name}</p>
                      {pax.role && <span className="text-[10px] text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-full">{pax.role}</span>}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="mb-8">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary via-primary to-[hsl(160,30%,15%)]">
              <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10 rounded-full blur-[80px] -mr-20 -mt-20" />
              <div className="p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 relative">
                <div>
                  <h3 className="text-xl font-bold text-primary-foreground">Precisa de ajuda?</h3>
                  <p className="text-sm text-primary-foreground/50 mt-1.5 max-w-md">
                    {sellerName ? `Fale com ${sellerName} ou com nossa equipe` : "Nosso concierge está pronto para ajudar"}
                  </p>
                </div>
                <button onClick={() => window.open("https://wa.me/5511999999999", "_blank")}
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl text-sm font-semibold border border-white/15 transition-all shadow-lg">
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