import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Plane, Hotel, MapPin, Clock, FileText, CheckSquare, Sparkles,
  LifeBuoy, ArrowRight, Compass,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  JourneyProgress, getDestinationImage, getTripDays,
} from "@/components/travel-ui";
import WeatherForecast from "@/components/portal/WeatherForecast";
import CurrencyPanel from "@/components/portal/CurrencyPanel";
import PortalDocumentsCenter from "@/components/portal/PortalDocumentsCenter";
import PortalChecklist from "@/components/portal/PortalChecklist";

interface TravelModeHomeProps {
  trip: any;
}

function parseISO(d?: string | null) {
  if (!d) return null;
  return new Date(d.length <= 10 ? d + "T00:00:00" : d);
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function fmtTime(d: Date) {
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function fmtDay(d: Date) {
  return d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
}

export default function TravelModeHome({ trip }: TravelModeHomeProps) {
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data: res } = await supabase.functions.invoke("portal-api", {
          body: { action: "trip-detail", sale_id: trip.sale_id },
        });
        if (!alive) return;
        if (res && !res.error) setData(res);
        else setFailed(true);
      } catch {
        if (alive) setFailed(true);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [trip.sale_id]);

  const sale = data?.sale || trip.sale || {};
  const segments = data?.segments || [];
  const hotels = data?.hotels || [];
  const lodging = data?.lodging || [];
  const allHotels = [...hotels, ...lodging];

  const tripDays = getTripDays(sale);
  const dep = parseISO(sale?.departure_date);
  const now = new Date();
  const dayNumber = dep ? Math.min(tripDays || 1, Math.max(1, Math.ceil((now.getTime() - dep.getTime()) / 86400000))) : 1;

  const todayItems = useMemo(() => {
    const items: Array<{ kind: "flight" | "checkin" | "checkout"; title: string; subtitle: string; time?: string; icon: any }> = [];

    // Próximo voo (segmento de hoje ou o próximo após agora)
    const upcomingSeg = segments.find((s: any) => {
      const dt = parseISO(s.departure_datetime || s.departure_date);
      return dt && dt.getTime() >= now.getTime();
    });
    const todaySeg = segments.find((s: any) => {
      const dt = parseISO(s.departure_datetime || s.departure_date);
      return dt && isSameDay(dt, now);
    });
    const flightSeg = todaySeg || upcomingSeg;
    if (flightSeg) {
      const dt = parseISO(flightSeg.departure_datetime || flightSeg.departure_date);
      items.push({
        kind: "flight",
        title: `Voo ${flightSeg.origin_iata || ""} → ${flightSeg.destination_iata || ""}`,
        subtitle: dt ? fmtDay(dt) : "Próximo voo",
        time: dt ? fmtTime(dt) : undefined,
        icon: Plane,
      });
    }

    // Check-in/out de hotel hoje
    allHotels.forEach((h: any) => {
      const ci = parseISO(h.check_in_date || h.checkin_date);
      const co = parseISO(h.check_out_date || h.checkout_date);
      if (ci && isSameDay(ci, now)) {
        items.push({
          kind: "checkin",
          title: `Check-in · ${h.supplier_name || h.hotel_name || h.description || "Hotel"}`,
          subtitle: h.location || h.city || "Hospedagem do dia",
          time: h.check_in_time || "15:00",
          icon: Hotel,
        });
      }
      if (co && isSameDay(co, now)) {
        items.push({
          kind: "checkout",
          title: `Check-out · ${h.supplier_name || h.hotel_name || h.description || "Hotel"}`,
          subtitle: h.location || h.city || "Saída programada",
          time: h.check_out_time || "12:00",
          icon: Hotel,
        });
      }
    });

    return items;
  }, [segments, allHotels]);

  const localTime = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const title = data?.published?.custom_title || trip.custom_title || sale?.name || "Sua viagem";
  const destinationIata = sale?.destination_iata || trip.sale?.destination_iata;
  const cover = getDestinationImage(destinationIata, data?.published?.cover_image_url || trip.cover_image_url);

  return (
    <div className="min-h-screen pb-32">
      {/* ═══ HERO ═══ */}
      <div className="relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${cover})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-background" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-10">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/20 backdrop-blur-md border border-accent/40 text-[11px] font-bold text-accent mb-4">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
              </span>
              Modo Viagem · Dia {dayNumber} de {tripDays || "—"}
            </div>
            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">{title}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-4 text-white/80 text-sm">
              {destinationIata && (
                <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4 text-accent" /> {destinationIata}</span>
              )}
              <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4 text-accent" /> {localTime}</span>
            </div>
            <div className="mt-6 max-w-2xl">
              <JourneyProgress departureDate={sale?.departure_date} returnDate={sale?.return_date} />
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 -mt-4">
        {/* ═══ HOJE NA SUA VIAGEM ═══ */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-4 w-4 text-accent" />
            <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-foreground/80">Hoje na sua viagem</h2>
          </div>
          {loading && (
            <div className="rounded-2xl bg-card/60 border border-border/30 h-32 animate-pulse" />
          )}
          {!loading && todayItems.length === 0 && (
            <div className="rounded-2xl bg-card/60 border border-border/30 p-6 text-sm text-muted-foreground">
              Nenhum compromisso para hoje · aproveite o destino com tranquilidade.
            </div>
          )}
          {!loading && todayItems.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {todayItems.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * i }}
                  className="flex items-center gap-4 p-5 rounded-2xl bg-card/80 border border-border/40 backdrop-blur-sm hover:border-accent/40 transition"
                >
                  <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                    <item.icon className="h-5 w-5 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                  </div>
                  {item.time && (
                    <span className="text-lg font-black tabular-nums text-accent">{item.time}</span>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </motion.section>

        {/* ═══ CONCIERGE.IA ═══ */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <button
            onClick={() => navigate("/portal/concierge")}
            className="w-full group relative overflow-hidden rounded-3xl p-6 sm:p-8 text-left bg-gradient-to-br from-accent/20 via-accent/10 to-transparent border border-accent/30 hover:border-accent/60 transition"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-accent/20 flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-accent" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Concierge.IA</p>
                <h3 className="text-xl font-black text-foreground mt-1">Precisa de ajuda agora?</h3>
                <p className="text-sm text-muted-foreground mt-1">Pergunte sobre restaurantes, transporte, idioma · a gente responde na hora.</p>
              </div>
              <ArrowRight className="h-5 w-5 text-accent group-hover:translate-x-1 transition" />
            </div>
          </button>
        </motion.section>

        {/* ═══ GRID DE WIDGETS VIVOS ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
            {!loading && <WeatherForecast sale={sale} segments={segments} />}
            {loading && <div className="rounded-3xl bg-card/60 border border-border/30 h-80 animate-pulse" />}
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
            <CurrencyPanel />
          </motion.div>
        </div>

        {/* ═══ DOCUMENTOS ═══ */}
        {!loading && !failed && (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-4 w-4 text-accent" />
              <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-foreground/80">Documentos & Vouchers</h2>
            </div>
            <PortalDocumentsCenter
              attachments={data?.attachments || []}
              sale={sale}
              segments={segments}
              hotels={allHotels}
              services={data?.services || []}
            />
          </motion.section>
        )}

        {/* ═══ CHECKLIST ═══ */}
        {!loading && !failed && (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <CheckSquare className="h-4 w-4 text-accent" />
              <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-foreground/80">Checklist do dia</h2>
            </div>
            <PortalChecklist
              sale={sale}
              segments={segments}
              hotels={hotels}
              services={data?.services || []}
              passengers={data?.passengers || []}
              attachments={data?.attachments || []}
              financial={data?.financial || { receivables: [] }}
              lodging={lodging}
            />
          </motion.section>
        )}

        {/* ═══ CTA roteiro completo ═══ */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex justify-center"
        >
          <button
            onClick={() => navigate(`/portal/viagem/${trip.sale_id}`)}
            className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-foreground text-background font-bold text-sm hover:bg-foreground/90 transition shadow-xl"
          >
            <Compass className="h-4 w-4" />
            Ver roteiro completo
            <ArrowRight className="h-4 w-4" />
          </button>
        </motion.div>

        {failed && (
          <div className="text-center text-sm text-muted-foreground">
            Não consegui carregar os detalhes agora · a gente segue mostrando o essencial.
          </div>
        )}
      </div>

      {/* ═══ SOS FLUTUANTE ═══ */}
      <a
        href="https://wa.me/5511999999999"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-5 py-3.5 rounded-full bg-destructive text-destructive-foreground font-bold text-sm shadow-2xl shadow-destructive/30 hover:scale-105 transition"
      >
        <LifeBuoy className="h-5 w-5" />
        SOS · Suporte
      </a>
    </div>
  );
}
