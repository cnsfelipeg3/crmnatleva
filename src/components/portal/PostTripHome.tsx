import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Heart, Compass, ArrowRight, MessageCircle, Globe2, MapPin, Sparkles,
} from "lucide-react";
import {
  getDestinationImage, TripShelf, TripStatusBadge,
} from "@/components/travel-ui";
import TravelStats from "@/components/portal/TravelStats";
import LazyViewportTravelMap from "@/components/maps/LazyViewportTravelMap";
import { getIataCoords } from "@/components/maps/iataCoords";

interface PostTripHomeProps {
  lastTrip: any;
  pastTrips: any[];
}

function monthsSince(returnDate?: string | null): number | null {
  if (!returnDate) return null;
  const ret = new Date(returnDate + "T00:00:00");
  const now = new Date();
  const months = (now.getFullYear() - ret.getFullYear()) * 12 + (now.getMonth() - ret.getMonth());
  return Math.max(0, months);
}

// TODO: puxar da vitrine pública /p
const CURATED_DESTINATIONS = [
  { iata: "CDG", name: "Paris", tagline: "Romance e arte na cidade luz", region: "Europa" },
  { iata: "NRT", name: "Tóquio", tagline: "Tradição e futuro na mesma rua", region: "Ásia" },
  { iata: "MIA", name: "Miami", tagline: "Sol, praia e energia 24h", region: "América" },
];

export default function PostTripHome({ lastTrip, pastTrips }: PostTripHomeProps) {
  const navigate = useNavigate();

  const months = monthsSince(lastTrip?.sale?.return_date);
  const destinationLabel = lastTrip?.sale?.destination_iata || "seu último destino";
  const heroImage = getDestinationImage(lastTrip?.sale?.destination_iata, lastTrip?.cover_image_url);
  const title = lastTrip?.custom_title || lastTrip?.sale?.name || "Sua última jornada";

  const waypoints = useMemo(() => {
    return pastTrips
      .map((t) => {
        const coords = getIataCoords(t.sale?.destination_iata);
        if (!coords) return null;
        return {
          id: t.id,
          name: t.sale?.destination_iata ?? "Destino",
          lat: coords.lat,
          lng: coords.lng,
          color: "success" as const,
        };
      })
      .filter((w): w is NonNullable<typeof w> => w !== null);
  }, [pastTrips]);

  const monthsLine = months === null
    ? `Você esteve em ${destinationLabel}`
    : months === 0
      ? `Você acabou de voltar de ${destinationLabel}`
      : months === 1
        ? `Há 1 mês você esteve em ${destinationLabel}`
        : `Há ${months} meses você esteve em ${destinationLabel}`;

  return (
    <div className="pb-20">
      {/* ═══ HERO MEMÓRIA ═══ */}
      <div className="relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center scale-105"
          style={{ backgroundImage: `url(${heroImage})`, filter: "saturate(0.85)" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/55 to-background" />
        <div className="absolute inset-0 bg-gradient-to-tr from-accent/20 via-transparent to-transparent mix-blend-overlay" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <div className="flex items-center gap-2 mb-5">
              <Heart className="h-4 w-4 text-accent" />
              <span className="text-accent/90 text-xs uppercase tracking-[0.22em] font-bold">Sua última jornada</span>
            </div>
            <div className="mb-4">
              <TripStatusBadge status="past" />
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-[0.95] tracking-tight max-w-3xl">
              {title}
            </h1>
            <p className="text-white/70 text-base sm:text-lg mt-5 font-light max-w-2xl">
              {monthsLine}. As melhores histórias merecem uma sequência.
            </p>

            {lastTrip && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                onClick={() => navigate(`/portal/viagem/${lastTrip.sale_id}`)}
                className="mt-6 inline-flex items-center gap-2 text-white/80 hover:text-white text-sm font-semibold group"
              >
                Revisitar memórias
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition" />
              </motion.button>
            )}
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 space-y-12">

        {/* ═══ RECOMPRA · forte e logo após o hero (mobile-first) ═══ */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-accent/20 via-accent/10 to-transparent border border-accent/30 p-6 sm:p-10"
        >
          <div className="absolute -top-20 -right-20 w-72 h-72 bg-accent/20 rounded-full blur-3xl opacity-60 pointer-events-none" />

          <div className="relative">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-4 w-4 text-accent" />
              <span className="text-accent text-xs uppercase tracking-[0.22em] font-bold">Para onde vamos agora?</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-foreground tracking-tight leading-tight max-w-2xl">
              A próxima história tá esperando pra ser vivida.
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base mt-3 max-w-xl">
              Bora planejar a próxima · a gente cuida de cada detalhe pra você só curtir.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-7">
              {CURATED_DESTINATIONS.map((d, i) => (
                <motion.button
                  key={d.iata}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.06 }}
                  onClick={() => navigate("/portal/nova-cotacao")}
                  className="group relative overflow-hidden rounded-2xl h-32 sm:h-40 text-left"
                >
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                    style={{ backgroundImage: `url(${getDestinationImage(d.iata)})` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                  <div className="absolute inset-0 p-4 flex flex-col justify-end">
                    <div className="flex items-center gap-1.5 text-accent text-[10px] font-bold uppercase tracking-[0.18em]">
                      <MapPin className="h-3 w-3" />
                      {d.region}
                    </div>
                    <p className="text-white font-black text-lg leading-tight mt-1">{d.name}</p>
                    <p className="text-white/70 text-xs mt-0.5 line-clamp-1">{d.tagline}</p>
                  </div>
                </motion.button>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-8">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate("/portal/nova-cotacao")}
                className="inline-flex items-center justify-center gap-2 bg-accent text-accent-foreground hover:bg-accent/90 px-6 py-3.5 rounded-full font-bold text-sm shadow-xl shadow-accent/20 transition"
              >
                <Compass className="h-4 w-4" />
                Planejar próxima viagem
                <ArrowRight className="h-4 w-4" />
              </motion.button>
              <a
                href="https://wa.me/5511999999999"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-card border border-border text-foreground hover:bg-muted/40 px-6 py-3.5 rounded-full font-bold text-sm transition"
              >
                <MessageCircle className="h-4 w-4" />
                Falar com a gente
              </a>
            </div>
          </div>
        </motion.section>

        {/* ═══ PASSAPORTE NATLEVA ═══ */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground tracking-tight">Seu passaporte NatLeva</h2>
              <p className="text-xs text-muted-foreground">Cada carimbo é uma conquista</p>
            </div>
          </div>
          <TravelStats trips={pastTrips} />
        </motion.section>

        {/* ═══ GLOBO 3D · ROTAS PASSADAS ═══ */}
        {waypoints.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                <Globe2 className="h-5 w-5 text-success" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground tracking-tight">Rotas que você já voou</h2>
                <p className="text-xs text-muted-foreground">Sua marca no mapa</p>
              </div>
              <span className="text-[10px] text-success bg-success/10 px-2.5 py-1 rounded-full font-mono font-bold ml-auto">Memórias</span>
            </div>
            <LazyViewportTravelMap
              className="h-[460px] lg:h-[560px] w-full"
              waypoints={waypoints}
              onWaypointClick={(id) => navigate(`/portal/viagem/${id}`)}
            />
          </motion.section>
        )}

        {/* ═══ SUAS MEMÓRIAS ═══ */}
        {pastTrips.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <TripShelf
              emoji="📸"
              title="Suas memórias"
              trips={pastTrips}
              onOpen={(id) => navigate(`/portal/viagem/${id}`)}
            />
          </motion.section>
        )}
      </div>
    </div>
  );
}
