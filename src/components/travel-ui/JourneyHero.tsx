import { motion } from "framer-motion";
import { ArrowRight, Calendar, Clock, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import patagoniaImg from "@/assets/destination-patagonia.jpg";

/* ── Helpers ── */
const fmtShort = (d: string | null) => {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
};

const destImages: Record<string, string> = {
  MCO: "https://images.unsplash.com/photo-1575089976121-8ed7b2a54265?w=2560&h=1440&fit=crop&q=95&auto=format",
  MIA: "https://images.unsplash.com/photo-1533106497176-45ae19e68ba2?w=2560&h=1440&fit=crop&q=95&auto=format",
  LIS: "https://images.unsplash.com/photo-1585208798174-6cedd86e019a?w=2560&h=1440&fit=crop&q=95&auto=format",
  CDG: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=2560&h=1440&fit=crop&q=95&auto=format",
  FCO: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=2560&h=1440&fit=crop&q=95&auto=format",
  CUN: "https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?w=2560&h=1440&fit=crop&q=95&auto=format",
  EZE: "https://images.unsplash.com/photo-1589909202802-8f4aadce1849?w=2560&h=1440&fit=crop&q=95&auto=format",
  MLE: "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=2560&h=1440&fit=crop&q=95&auto=format",
  FTE: patagoniaImg,
  DXB: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=2560&h=1440&fit=crop&q=95&auto=format",
  JFK: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=2560&h=1440&fit=crop&q=95&auto=format",
  LAX: "https://images.unsplash.com/photo-1534190760961-74e8c1c5c3da?w=2560&h=1440&fit=crop&q=95&auto=format",
  LHR: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=2560&h=1440&fit=crop&q=95&auto=format",
  NRT: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=2560&h=1440&fit=crop&q=95&auto=format",
  SYD: "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=2560&h=1440&fit=crop&q=95&auto=format",
  BCN: "https://images.unsplash.com/photo-1583422409516-2895a77efded?w=2560&h=1440&fit=crop&q=95&auto=format",
  MAD: "https://images.unsplash.com/photo-1543783207-ec64e4d95325?w=2560&h=1440&fit=crop&q=95&auto=format",
  GIG: "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=2560&h=1440&fit=crop&q=95&auto=format",
  SDU: "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=2560&h=1440&fit=crop&q=95&auto=format",
  SSA: "https://images.unsplash.com/photo-1594489428504-5c0c480a15cb?w=2560&h=1440&fit=crop&q=95&auto=format",
  REC: "https://images.unsplash.com/photo-1626625030889-b7f6b89e5210?w=2560&h=1440&fit=crop&q=95&auto=format",
  FLN: "https://images.unsplash.com/photo-1598981457915-aea220950616?w=2560&h=1440&fit=crop&q=95&auto=format",
  AMS: "https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=2560&h=1440&fit=crop&q=95&auto=format",
  IST: "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=2560&h=1440&fit=crop&q=95&auto=format",
  BKK: "https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=2560&h=1440&fit=crop&q=95&auto=format",
  SIN: "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=2560&h=1440&fit=crop&q=95&auto=format",
  SCL: "https://images.unsplash.com/photo-1510693206972-df098062cb71?w=2560&h=1440&fit=crop&q=95&auto=format",
  BOG: "https://images.unsplash.com/photo-1568632234157-ce7aecd03d0d?w=2560&h=1440&fit=crop&q=95&auto=format",
  LIM: "https://images.unsplash.com/photo-1531968455002-3014c4051b7e?w=2560&h=1440&fit=crop&q=95&auto=format",
  ATH: "https://images.unsplash.com/photo-1555993539-1732b0258235?w=2560&h=1440&fit=crop&q=95&auto=format",
  CAI: "https://images.unsplash.com/photo-1572252009286-268acec5ca0a?w=2560&h=1440&fit=crop&q=95&auto=format",
  CPT: "https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=2560&h=1440&fit=crop&q=95&auto=format",
  default: "https://images.unsplash.com/photo-1488085061387-422e29b40080?w=2560&h=1440&fit=crop&q=95&auto=format",
};

/** Generic travel fallback images — rotated by hash so each trip gets a unique photo */
const GENERIC_TRAVEL_IMAGES = [
  "https://images.unsplash.com/photo-1488085061387-422e29b40080?w=2560&h=1440&fit=crop&q=95&auto=format",
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=2560&h=1440&fit=crop&q=95&auto=format",
  "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=2560&h=1440&fit=crop&q=95&auto=format",
  "https://images.unsplash.com/photo-1530789253388-582c481c54b0?w=2560&h=1440&fit=crop&q=95&auto=format",
  "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=2560&h=1440&fit=crop&q=95&auto=format",
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=2560&h=1440&fit=crop&q=95&auto=format",
  "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=2560&h=1440&fit=crop&q=95&auto=format",
  "https://images.unsplash.com/photo-1433838552652-f9a46b332c40?w=2560&h=1440&fit=crop&q=95&auto=format",
];

function hashCode(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** Enhance any image URL for maximum quality on hero displays */
export function enhanceImageUrl(url: string): string {
  if (!url) return destImages.default;
  // Unsplash: force max quality params
  if (url.includes("unsplash.com")) {
    const base = url.split("?")[0];
    return `${base}?w=2560&h=1440&fit=crop&q=95&auto=format`;
  }
  return url;
}

export function getDestinationImage(iata: string | null, cover?: string | null, saleId?: string) {
  if (cover && cover.trim()) return enhanceImageUrl(cover);
  if (iata && destImages[iata]) return destImages[iata];
  // Rotate through generic travel images based on iata or saleId for variety
  const seed = iata || saleId || "trip";
  const idx = hashCode(seed) % GENERIC_TRAVEL_IMAGES.length;
  return GENERIC_TRAVEL_IMAGES[idx];
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
  subtitle?: string;
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
  title, subtitle, imageUrl, originIata, destinationIata,
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
          {subtitle && (
            <p className="text-base sm:text-lg text-white/50 font-light tracking-wide mt-2">{subtitle}</p>
          )}

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
                {fmtShort(departureDate)} · {fmtShort(returnDate)}
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
