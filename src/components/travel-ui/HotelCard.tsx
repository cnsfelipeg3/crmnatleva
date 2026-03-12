import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Download, MapPin, Phone, Mail, Globe, Clock, Bed, UtensilsCrossed, Wifi, Car, Star, Info, ExternalLink, CalendarCheck } from "lucide-react";

const hotelImages = [
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=400&fit=crop&q=80",
  "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=600&h=400&fit=crop&q=80",
  "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=600&h=400&fit=crop&q=80",
  "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=600&h=400&fit=crop&q=80",
];

const fmtDate = (d: string | null | undefined) => {
  if (!d) return "";
  const date = new Date(d.includes("T") ? d : d + "T00:00:00");
  return date.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
};

const fmtTime = (d: string | null | undefined) => {
  if (!d) return "";
  const date = new Date(d);
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
};

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
    city?: string;
    phone?: string;
    email?: string;
    website?: string;
    meal_plan?: string;
    amenities?: string[];
    voucher_url?: string;
    confirmation_url?: string;
    checkin_time?: string;
    checkout_time?: string;
    cancellation_policy?: string;
    special_requests?: string;
    stars?: number;
  };
  index?: number;
}

export default function HotelCard({ hotel: h, index = 0 }: HotelCardProps) {
  const [open, setOpen] = useState(false);

  const checkinDate = h.hotel_checkin_datetime_utc ? fmtDate(h.hotel_checkin_datetime_utc) : null;
  const checkoutDate = h.hotel_checkout_datetime_utc ? fmtDate(h.hotel_checkout_datetime_utc) : null;

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
        <div className="sm:w-48 lg:w-56 h-40 sm:h-auto overflow-hidden flex-shrink-0 relative">
          <img
            src={hotelImages[index % hotelImages.length]}
            alt={h.hotel_name || "Hotel"}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
          {h.stars && (
            <div className="absolute bottom-2 left-2 flex items-center gap-0.5">
              {Array.from({ length: h.stars }).map((_, i) => (
                <Star key={i} className="h-3 w-3 text-amber-400 fill-amber-400" />
              ))}
            </div>
          )}
        </div>
        <div className="p-5 sm:p-6 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-lg font-bold text-foreground leading-tight">
                {h.hotel_name || h.description || "Hotel"}
              </p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                {(h.hotel_reservation_code || h.reservation_code) && (
                  <p className="text-xs text-muted-foreground font-mono">
                    Reserva {h.hotel_reservation_code || h.reservation_code}
                  </p>
                )}
                {h.city && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {h.city}
                  </p>
                )}
              </div>
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
                {h.checkin_time && <span className="text-muted-foreground ml-1">às {h.checkin_time}</span>}
              </div>
            )}
            {checkoutDate && (
              <div className="text-xs">
                <span className="text-muted-foreground block text-[10px] uppercase tracking-wider mb-0.5">Check-out</span>
                <span className="font-semibold text-foreground">{checkoutDate}</span>
                {h.checkout_time && <span className="text-muted-foreground ml-1">às {h.checkout_time}</span>}
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

      {/* Expanded details */}
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
            <div className="px-5 sm:px-6 pb-5 sm:pb-6 border-t border-border/30">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4 mt-4">
                {h.room_type && <DetailItem label="Tipo de quarto" value={h.room_type} />}
                {h.meal_plan && <DetailItem label="Refeições" value={h.meal_plan} />}
                {h.address && <DetailItem label="Endereço" value={h.address} />}
                {h.phone && <DetailItem label="Telefone" value={h.phone} />}
                {h.email && <DetailItem label="E-mail" value={h.email} />}
                {h.cancellation_policy && <DetailItem label="Cancelamento" value={h.cancellation_policy} />}
                {h.special_requests && <DetailItem label="Pedidos especiais" value={h.special_requests} />}
              </div>

              {/* Amenities */}
              {h.amenities && h.amenities.length > 0 && (
                <div className="mt-4">
                  <p className="text-[10px] text-muted-foreground/50 uppercase tracking-[0.15em] mb-2">Comodidades</p>
                  <div className="flex flex-wrap gap-1.5">
                    {h.amenities.map((a, i) => (
                      <span key={i} className="text-[11px] text-muted-foreground bg-muted/40 px-2.5 py-1 rounded-full">{a}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-border/20">
                {h.voucher_url && (
                  <ActionLink href={h.voucher_url} icon={<Download className="h-3.5 w-3.5" />} label="Voucher de hospedagem" />
                )}
                {h.confirmation_url && (
                  <ActionLink href={h.confirmation_url} icon={<Download className="h-3.5 w-3.5" />} label="Confirmação de reserva" />
                )}
                {h.website && (
                  <ActionLink href={h.website} icon={<ExternalLink className="h-3.5 w-3.5" />} label="Site do hotel" />
                )}
                {!h.voucher_url && !h.confirmation_url && (
                  <p className="text-xs text-muted-foreground/40 italic flex items-center gap-1.5">
                    <Info className="h-3.5 w-3.5" />
                    Voucher será disponibilizado em breve
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-[10px] text-muted-foreground/50 uppercase tracking-[0.15em] mb-0.5">{label}</p>
      <p className="text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function ActionLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 text-xs font-semibold text-accent hover:text-accent/80 bg-accent/5 hover:bg-accent/10 px-4 py-2.5 rounded-xl transition-colors"
    >
      {icon} {label}
    </a>
  );
}
