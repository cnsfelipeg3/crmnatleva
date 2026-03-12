import { motion } from "framer-motion";

const hotelImages = [
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=400&fit=crop&q=80",
  "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=600&h=400&fit=crop&q=80",
  "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=600&h=400&fit=crop&q=80",
  "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=600&h=400&fit=crop&q=80",
];

interface HotelCardProps {
  hotel: {
    id?: string;
    hotel_name?: string;
    description?: string;
    hotel_reservation_code?: string;
    reservation_code?: string;
    status?: string;
    hotel_checkin_datetime_utc?: string;
    hotel_checkout_datetime_utc?: string;
    notes?: string;
  };
  index?: number;
}

export default function HotelCard({ hotel: h, index = 0 }: HotelCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 + index * 0.06 }}
      className="group rounded-2xl overflow-hidden border border-border/40 hover:border-accent/20 hover:shadow-lg hover:shadow-accent/5 transition-all bg-card"
    >
      <div className="flex flex-col sm:flex-row">
        <div className="sm:w-48 lg:w-56 h-40 sm:h-auto overflow-hidden flex-shrink-0">
          <img
            src={hotelImages[index % hotelImages.length]}
            alt={h.hotel_name || "Hotel"}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
        </div>
        <div className="p-5 sm:p-6 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-lg font-bold text-foreground leading-tight">
                {h.hotel_name || h.description || "Hotel"}
              </p>
              {(h.hotel_reservation_code || h.reservation_code) && (
                <p className="text-xs text-muted-foreground mt-1.5 font-mono">
                  Reserva {h.hotel_reservation_code || h.reservation_code}
                </p>
              )}
            </div>
            {h.status && (
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${
                h.status === "CONFIRMADO" ? "bg-accent/10 text-accent" : "bg-muted text-muted-foreground"
              }`}>
                {h.status}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-4 mt-4">
            {h.hotel_checkin_datetime_utc && (
              <div className="text-xs">
                <span className="text-muted-foreground block text-[10px] uppercase tracking-wider mb-0.5">Check-in</span>
                <span className="font-semibold text-foreground">{new Date(h.hotel_checkin_datetime_utc).toLocaleDateString("pt-BR")}</span>
              </div>
            )}
            {h.hotel_checkout_datetime_utc && (
              <div className="text-xs">
                <span className="text-muted-foreground block text-[10px] uppercase tracking-wider mb-0.5">Check-out</span>
                <span className="font-semibold text-foreground">{new Date(h.hotel_checkout_datetime_utc).toLocaleDateString("pt-BR")}</span>
              </div>
            )}
          </div>

          {h.notes && (
            <p className="text-xs text-muted-foreground mt-3 italic leading-relaxed">{h.notes}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
