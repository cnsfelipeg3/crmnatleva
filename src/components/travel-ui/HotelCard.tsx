import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Download, MapPin, Phone, Mail, CalendarCheck, CalendarX, Bed, Star } from "lucide-react";

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
    room_type?: string;
    address?: string;
    phone?: string;
    email?: string;
    meal_plan?: string;
    voucher_url?: string;
    confirmation_url?: string;
  };
  index?: number;
}

export default function HotelCard({ hotel: h, index = 0 }: HotelCardProps) {
  const [open, setOpen] = useState(false);

  const checkinDate = h.hotel_checkin_datetime_utc
    ? new Date(h.hotel_checkin_datetime_utc).toLocaleDateString("pt-BR")
    : null;
  const checkoutDate = h.hotel_checkout_datetime_utc
    ? new Date(h.hotel_checkout_datetime_utc).toLocaleDateString("pt-BR")
    : null;

  const nights = h.hotel_checkin_datetime_utc && h.hotel_checkout_datetime_utc
    ? Math.ceil((new Date(h.hotel_checkout_datetime_utc).getTime() - new Date(h.hotel_checkin_datetime_utc).getTime()) / 86400000)
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 + index * 0.06 }}
      className="group rounded-2xl overflow-hidden border border-border/40 hover:border-accent/20 hover:shadow-lg hover:shadow-accent/5 transition-all bg-card cursor-pointer"
      onClick={() => setOpen(!open)}
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
            <div className="flex-1 min-w-0">
              <p className="text-lg font-bold text-foreground leading-tight">
                {h.hotel_name || h.description || "Hotel"}
              </p>
              {(h.hotel_reservation_code || h.reservation_code) && (
                <p className="text-xs text-muted-foreground mt-1.5 font-mono">
                  Reserva {h.hotel_reservation_code || h.reservation_code}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {h.status && (
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                  h.status === "CONFIRMADO" ? "bg-accent/10 text-accent" : "bg-muted text-muted-foreground"
                }`}>
                  {h.status}
                </span>
              )}
              <ChevronDown className={`h-4 w-4 text-muted-foreground/40 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
            </div>
          </div>

          <div className="flex flex-wrap gap-4 mt-4">
            {checkinDate && (
              <div className="text-xs">
                <span className="text-muted-foreground block text-[10px] uppercase tracking-wider mb-0.5">Check-in</span>
                <span className="font-semibold text-foreground">{checkinDate}</span>
              </div>
            )}
            {checkoutDate && (
              <div className="text-xs">
                <span className="text-muted-foreground block text-[10px] uppercase tracking-wider mb-0.5">Check-out</span>
                <span className="font-semibold text-foreground">{checkoutDate}</span>
              </div>
            )}
            {nights && nights > 0 && (
              <div className="text-xs">
                <span className="text-muted-foreground block text-[10px] uppercase tracking-wider mb-0.5">Diárias</span>
                <span className="font-semibold text-foreground">{nights} noite{nights > 1 ? "s" : ""}</span>
              </div>
            )}
          </div>

          {h.notes && (
            <p className="text-xs text-muted-foreground mt-3 italic leading-relaxed">{h.notes}</p>
          )}
        </div>
      </div>

      {/* Expandable details */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 sm:px-6 pb-5 sm:pb-6 pt-2 border-t border-border/30">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-3">
                {h.room_type && (
                  <DetailItem icon={<Bed className="h-3.5 w-3.5" />} label="Tipo de quarto" value={h.room_type} />
                )}
                {h.meal_plan && (
                  <DetailItem icon={<Star className="h-3.5 w-3.5" />} label="Refeições" value={h.meal_plan} />
                )}
                {h.address && (
                  <DetailItem icon={<MapPin className="h-3.5 w-3.5" />} label="Endereço" value={h.address} />
                )}
                {h.phone && (
                  <DetailItem icon={<Phone className="h-3.5 w-3.5" />} label="Telefone" value={h.phone} />
                )}
                {h.email && (
                  <DetailItem icon={<Mail className="h-3.5 w-3.5" />} label="E-mail" value={h.email} />
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2 mt-5">
                {h.voucher_url && (
                  <a
                    href={h.voucher_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs font-semibold text-accent hover:text-accent/80 bg-accent/5 hover:bg-accent/10 px-4 py-2.5 rounded-xl transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" /> Voucher de hospedagem
                  </a>
                )}
                {h.confirmation_url && (
                  <a
                    href={h.confirmation_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs font-semibold text-accent hover:text-accent/80 bg-accent/5 hover:bg-accent/10 px-4 py-2.5 rounded-xl transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" /> Confirmação de reserva
                  </a>
                )}
                {!h.voucher_url && !h.confirmation_url && (
                  <p className="text-xs text-muted-foreground/50 italic">Voucher será disponibilizado em breve</p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function DetailItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-muted-foreground/50 mt-0.5">{icon}</span>
      <div>
        <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">{label}</p>
        <p className="text-sm font-medium text-foreground mt-0.5">{value}</p>
      </div>
    </div>
  );
}
