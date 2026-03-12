import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Timer, Compass } from "lucide-react";
import { getDestinationImage, getTripStatus, TripStatusBadge } from "./JourneyHero";

const fmtShort = (d: string | null) => {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
};

interface TripCardProps {
  trip: {
    sale_id: string;
    custom_title?: string;
    cover_image_url?: string;
    sale?: {
      name?: string;
      origin_iata?: string;
      destination_iata?: string;
      departure_date?: string;
      return_date?: string;
    };
  };
  onOpen: (id: string) => void;
  index?: number;
}

export default function TripCard({ trip, onOpen, index = 0 }: TripCardProps) {
  const [hovered, setHovered] = useState(false);
  const sale = trip.sale;
  const status = getTripStatus(sale || {});
  const dep = sale?.departure_date ? new Date(sale.departure_date + "T00:00:00") : null;
  const ret = sale?.return_date ? new Date(sale.return_date + "T23:59:59") : null;
  const now = new Date();
  const daysUntil = dep ? Math.ceil((dep.getTime() - now.getTime()) / 86400000) : null;
  const tripDays = dep && ret ? Math.ceil((ret.getTime() - dep.getTime()) / 86400000) : null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
      className="flex-shrink-0 w-[300px] sm:w-[360px] lg:w-[400px] snap-start cursor-pointer group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onOpen(trip.sale_id)}
    >
      <motion.div
        whileHover={{ scale: 1.04, y: -8 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="relative aspect-[16/10] rounded-2xl overflow-hidden shadow-xl group-hover:shadow-2xl group-hover:shadow-accent/15 transition-all duration-500"
      >
        <img
          src={getDestinationImage(sale?.destination_iata || null, trip.cover_image_url)}
          alt=""
          className="w-full h-full object-cover transition-transform duration-[1200ms] group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent" />

        <div className="absolute top-3 sm:top-4 left-3 sm:left-4 right-3 sm:right-4 flex items-start justify-between">
          <TripStatusBadge status={status} size="sm" />
          {daysUntil !== null && daysUntil > 0 && daysUntil <= 90 && (
            <div className="bg-black/40 backdrop-blur-xl text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 border border-white/10">
              <Timer className="h-3 w-3" />
              {daysUntil}d
            </div>
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
          <h4 className="font-bold text-white text-lg sm:text-xl leading-tight drop-shadow-xl line-clamp-2 tracking-tight">
            {trip.custom_title || sale?.name || "Viagem"}
          </h4>
          <div className="flex items-center gap-3 mt-2.5 text-white/50 text-xs">
            {sale?.origin_iata && sale?.destination_iata && (
              <span className="font-mono tracking-widest text-white/70">{sale.origin_iata} → {sale.destination_iata}</span>
            )}
            {sale?.departure_date && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {fmtShort(sale.departure_date)}
              </span>
            )}
            {tripDays && <span>{tripDays}d</span>}
          </div>
        </div>

        <AnimatePresence>
          {hovered && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center gap-4"
            >
              <motion.div
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.05, type: "spring", stiffness: 300 }}
                className="w-14 h-14 rounded-full bg-accent flex items-center justify-center shadow-2xl shadow-accent/40"
              >
                <Compass className="h-7 w-7 text-accent-foreground" />
              </motion.div>
              <motion.span
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-white font-bold text-base tracking-tight"
              >
                Explorar viagem
              </motion.span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
