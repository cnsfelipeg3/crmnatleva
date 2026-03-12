import { motion } from "framer-motion";
import { ArrowRight, Calendar, Clock, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";

/* ── Helpers ── */
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
  MLE: "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=1600&h=900&fit=crop&q=80",
  FTE: "https://images.unsplash.com/photo-1531761535209-180857e67b1e?w=1600&h=900&fit=crop&q=80",
  DXB: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=1600&h=900&fit=crop&q=80",
  default: "https://images.unsplash.com/photo-1488085061387-422e29b40080?w=1600&h=900&fit=crop&q=80",
};

export function getDestinationImage(iata: string | null, cover?: string | null) {
  if (cover) return cover;
  if (iata && destImages[iata]) return destImages[iata];
  return destImages.default;
}

/* ── Status helpers ── */
export type TripStatus = "upcoming" | "active" | "past";

export function getTripStatus(sale: { departure_date?: string | null; return_date?: string | null }): TripStatus {
  const dep = sale?.departure_date ? new Date(sale.departure_date + "T00:00:00") : null;
  const ret = sale?.return_date ? new Date(sale.return_date + "T23:59:59") : null;
  const now = new Date();
  if (dep && dep > now) return "upcoming";
  if (dep && ret && dep <= now && ret >= now) return "active";
  return "past";
}

export function getTripDays(sale: { departure_date?: string | null; return_date?: string | null }) {
  const dep = sale?.departure_date ? new Date(sale.departure_date + "T00:00:00") : null;
  const ret = sale?.return_date ? new Date(sale.return_date + "T23:59:59") : null;
  if (!dep || !ret) return 0;
  return Math.ceil((ret.getTime() - dep.getTime()) / 86400000);
}

/* ── Status Badge ── */
export function TripStatusBadge({ status, size = "md" }: { status: TripStatus; size?: "sm" | "md" }) {
  const base = size === "sm" ? "text-[10px] px-2.5 py-0.5" : "text-xs px-3.5 py-1.5";
  if (status === "active")
    return (
      <Badge className={`bg-accent text-accent-foreground border-none shadow-lg shadow-accent/40 ${base}`}>
        <span className="relative flex h-2 w-2 mr-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-foreground opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-foreground" />
        </span>
        Em viagem
      </Badge>
    );
  if (status === "upcoming")
    return <Badge className={`bg-white/15 text-white border-none backdrop-blur-md shadow-lg ${base}`}>Próxima</Badge>;
  return <Badge className={`bg-white/10 text-white/50 border-none ${base}`}>Concluída</Badge>;
}

/* ── Countdown ── */
export { Countdown } from "./Countdown";

/* ── Journey Hero ── */
interface JourneyHeroProps {
  title: string;
  imageUrl: string;
  originIata?: string | null;
  destinationIata?: string | null;
  departureDate?: string | null;
  returnDate?: string | null;
  status: TripStatus;
  tripDays?: number;
  onBack?: () => void;
  children?: React.ReactNode;
}

export default function JourneyHero({
  title, imageUrl, originIata, destinationIata,
  departureDate, returnDate, status, tripDays, onBack, children,
}: JourneyHeroProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="relative overflow-hidden h-[55vh] min-h-[380px] max-h-[560px]"
    >
      <motion.img
        src={imageUrl}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        initial={{ scale: 1.06 }}
        animate={{ scale: 1 }}
        transition={{ duration: 16, ease: "linear", repeat: Infinity, repeatType: "reverse" }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-black/50 to-black/20" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-background to-transparent" />

      {/* Back */}
      {onBack && (
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          onClick={onBack}
          className="absolute top-5 left-5 sm:top-8 sm:left-8 flex items-center gap-2 text-white/60 hover:text-white text-sm font-medium transition-colors z-10 bg-black/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/10"
        >
          ← Voltar
        </motion.button>
      )}

      {/* Status */}
      <div className="absolute top-5 right-5 sm:top-8 sm:right-8">
        <TripStatusBadge status={status} />
      </div>

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 px-5 sm:px-8 lg:px-10 pb-8 sm:pb-10 max-w-5xl">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.6 }}>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-[0.95] tracking-tighter">
            {title}
          </h1>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-4 text-sm text-white/60 font-light tracking-wide">
            {originIata && destinationIata && (
              <span className="flex items-center gap-2">
                <span className="text-white font-semibold tracking-[0.2em] text-base">{originIata}</span>
                <ArrowRight className="h-3 w-3 text-accent" />
                <span className="text-white font-semibold tracking-[0.2em] text-base">{destinationIata}</span>
              </span>
            )}
            {departureDate && (
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-white/40" />
                {fmtShort(departureDate)} — {fmtShort(returnDate)}
              </span>
            )}
            {(tripDays ?? 0) > 0 && (
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-white/40" />
                {tripDays} dias
              </span>
            )}
          </div>

          {children}
        </motion.div>
      </div>
    </motion.div>
  );
}
