import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Plane, Calendar, Compass, ArrowRight, MapPin, FileText, CheckSquare, Globe2,
} from "lucide-react";
import {
  getDestinationImage, Countdown, TripStatusBadge, TripShelf,
} from "@/components/travel-ui";

interface PreTripHomeProps {
  trip: any;
  upcomingTrips: any[];
}

const fmtShort = (d?: string | null) => {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
};

function daysUntil(departureDate?: string | null): number | null {
  if (!departureDate) return null;
  const dep = new Date(departureDate + "T00:00:00").getTime();
  const now = Date.now();
  return Math.max(0, Math.ceil((dep - now) / 86400000));
}

export default function PreTripHome({ trip, upcomingTrips }: PreTripHomeProps) {
  const navigate = useNavigate();
  const heroRef = useRef<HTMLDivElement | null>(null);
  const [parallaxY, setParallaxY] = useState(0);

  // Parallax sutil baseado em scroll
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      if (y < window.innerHeight) setParallaxY(y * 0.25);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const sale = trip?.sale || {};
  const destinationIata = sale.destination_iata;
  const originIata = sale.origin_iata;
  const heroImage = getDestinationImage(destinationIata, trip?.cover_image_url);
  const title = trip?.custom_title || sale.name || "Sua próxima jornada";
  const days = daysUntil(sale.departure_date);
  const urgent = days !== null && days <= 7;
  const destinationLabel = destinationIata || "seu destino";

  return (
    <div className="pb-16">
      {/* ═══ HERO FULL-BLEED ═══ */}
      <div
        ref={heroRef}
        className="relative w-full overflow-hidden"
        style={{ minHeight: "85vh" }}
      >
        {/* Imagem com Ken Burns + parallax */}
        <motion.img
          src={heroImage}
          alt={title}
          loading="lazy"
          decoding="async"
          initial={{ scale: 1.08 }}
          animate={{ scale: 1.18 }}
          transition={{ duration: 24, ease: "linear", repeat: Infinity, repeatType: "reverse" }}
          style={{ transform: `translateY(${parallaxY}px)` }}
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Overlays escuros */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/55 to-background" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent" />

        {/* Glow accent */}
        <div className="absolute -top-32 -left-32 w-[520px] h-[520px] bg-accent/25 rounded-full blur-[180px] opacity-60 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[420px] h-[420px] bg-accent/15 rounded-full blur-[160px] opacity-50 pointer-events-none" />

        {/* Conteúdo */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 min-h-[85vh] flex flex-col justify-center">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
            {/* Coluna principal */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="lg:col-span-2"
            >
              <div className="flex items-center gap-3 mb-5">
                <TripStatusBadge status="upcoming" />
                <span className="text-accent/90 text-[11px] uppercase tracking-[0.22em] font-bold">Sua próxima jornada</span>
              </div>

              <motion.h1
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.1 }}
                className="text-4xl sm:text-6xl lg:text-7xl font-black text-white leading-[0.9] tracking-tighter max-w-3xl"
              >
                {title}
              </motion.h1>

              {/* Pílula origem → destino + datas */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.25 }}
                className="flex flex-wrap items-center gap-3 mt-7"
              >
                {originIata && destinationIata && (
                  <div className="flex items-center gap-3 bg-white/[0.08] backdrop-blur-xl text-white/90 text-sm px-5 py-2.5 rounded-full border border-white/[0.1]">
                    <span className="font-mono tracking-[0.18em] text-white font-bold">{originIata}</span>
                    <div className="flex items-center">
                      <div className="w-8 h-px bg-gradient-to-r from-white/20 to-accent" />
                      <Plane className="h-3.5 w-3.5 text-accent mx-1 rotate-90" />
                      <div className="w-8 h-px bg-gradient-to-r from-accent to-white/20" />
                    </div>
                    <span className="font-mono tracking-[0.18em] text-white font-bold">{destinationIata}</span>
                  </div>
                )}
                {sale.departure_date && (
                  <div className="flex items-center gap-2 bg-white/[0.06] backdrop-blur-xl text-white/70 text-sm px-4 py-2.5 rounded-full border border-white/[0.08]">
                    <Calendar className="h-3.5 w-3.5 text-white/50" />
                    {fmtShort(sale.departure_date)} · {fmtShort(sale.return_date)}
                  </div>
                )}
              </motion.div>

              {/* Countdown protagonista */}
              {sale.departure_date && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                  className="mt-8 origin-left scale-110 sm:scale-125 lg:scale-150 inline-block"
                >
                  <Countdown departureDate={sale.departure_date} />
                </motion.div>
              )}

              {/* Frase dinâmica */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.65 }}
                className="mt-10 sm:mt-14"
              >
                {!urgent && days !== null && (
                  <p className="text-white/85 text-lg sm:text-xl font-light max-w-xl">
                    Faltam <span className="text-accent font-bold">{days} dias</span> para {destinationLabel}.
                    A gente cuida de cada detalhe · você só pensa em curtir.
                  </p>
                )}
                {urgent && (
                  <div className="space-y-4 max-w-xl">
                    <p className="text-white text-lg sm:text-xl font-semibold">
                      Hora de finalizar os preparativos.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => navigate(`/portal/viagem/${trip.sale_id}#documentos`)}
                        className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 backdrop-blur-xl text-white text-xs font-bold px-4 py-2.5 rounded-full border border-white/15 transition"
                      >
                        <FileText className="h-3.5 w-3.5 text-accent" />
                        Conferir documentos
                      </button>
                      <button
                        onClick={() => navigate(`/portal/viagem/${trip.sale_id}#checklist`)}
                        className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 backdrop-blur-xl text-white text-xs font-bold px-4 py-2.5 rounded-full border border-white/15 transition"
                      >
                        <CheckSquare className="h-3.5 w-3.5 text-accent" />
                        Abrir checklist
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>

              {/* CTA principal */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.8 }}
                className="mt-10"
              >
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(`/portal/viagem/${trip.sale_id}`)}
                  className="inline-flex items-center gap-3 bg-accent hover:bg-accent/90 text-accent-foreground text-sm font-bold px-8 py-4 rounded-full shadow-2xl shadow-accent/30 transition"
                >
                  <Compass className="h-5 w-5" />
                  Explorar minha viagem
                  <ArrowRight className="h-4 w-4" />
                </motion.button>
              </motion.div>
            </motion.div>

            {/* Card lateral · hoje pequeno */}
            <motion.aside
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.5 }}
              className="hidden lg:flex flex-col gap-3"
            >
              <div className="rounded-2xl bg-white/[0.06] backdrop-blur-xl border border-white/[0.1] p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Globe2 className="h-3.5 w-3.5 text-accent" />
                  <span className="text-white/60 text-[10px] uppercase tracking-[0.22em] font-bold">Hoje</span>
                </div>
                <p className="text-white font-black text-2xl tracking-tight">
                  {new Date().toLocaleDateString("pt-BR", { weekday: "long" })}
                </p>
                <p className="text-white/60 text-sm mt-1">
                  {new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                </p>
              </div>

              {destinationIata && (
                <div className="rounded-2xl bg-white/[0.06] backdrop-blur-xl border border-white/[0.1] p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="h-3.5 w-3.5 text-accent" />
                    <span className="text-white/60 text-[10px] uppercase tracking-[0.22em] font-bold">Destino</span>
                  </div>
                  <p className="text-white font-black text-3xl tracking-tight font-mono">{destinationIata}</p>
                  {sale.departure_date && (
                    <p className="text-white/60 text-xs mt-2">
                      Embarque · {fmtShort(sale.departure_date)}
                    </p>
                  )}
                </div>
              )}
            </motion.aside>
          </div>
        </div>
      </div>

      {/* ═══ OUTRAS JORNADAS ═══ */}
      {upcomingTrips.length > 1 && (
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12"
        >
          <TripShelf
            emoji="🗓️"
            title="Outras jornadas agendadas"
            trips={upcomingTrips.filter((t) => t.sale_id !== trip.sale_id)}
            onOpen={(id) => navigate(`/portal/viagem/${id}`)}
          />
        </motion.section>
      )}
    </div>
  );
}
