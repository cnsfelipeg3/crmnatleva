import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { iataToLabel } from "@/lib/iataUtils";
import {
  Plane, Hotel, Car, Ticket, Shield, MapPin, Clock, ChevronDown, ChevronUp,
  Calendar, Navigation, Star, Utensils,
} from "lucide-react";

interface TimelineItem {
  id: string;
  type: "flight" | "hotel-checkin" | "hotel-checkout" | "service" | "transfer" | "experience";
  date: string;
  time?: string;
  title: string;
  subtitle?: string;
  details: Record<string, string>;
  icon: typeof Plane;
  color: string;
}

interface PortalTimelineProps {
  segments: any[];
  hotels: any[];
  lodging: any[];
  services: any[];
  sale: any;
}

const fmtDate = (d: string) =>
  new Date(d + "T00:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });

const fmtDateFull = (d: string) =>
  new Date(d + "T00:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });

function getCategoryIcon(type: string) {
  const map: Record<string, { icon: typeof Plane; color: string }> = {
    flight: { icon: Plane, color: "bg-accent text-accent-foreground" },
    "hotel-checkin": { icon: Hotel, color: "bg-amber-500 text-white" },
    "hotel-checkout": { icon: Hotel, color: "bg-amber-400 text-white" },
    service: { icon: Ticket, color: "bg-blue-500 text-white" },
    transfer: { icon: Car, color: "bg-emerald-500 text-white" },
    experience: { icon: Star, color: "bg-purple-500 text-white" },
  };
  return map[type] || map.service;
}

export default function PortalTimeline({ segments, hotels, lodging, services, sale }: PortalTimelineProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const items = useMemo(() => {
    const list: TimelineItem[] = [];

    // Flights
    (segments || []).forEach((seg: any, i: number) => {
      list.push({
        id: `flight-${i}`,
        type: "flight",
        date: seg.departure_date || "",
        time: seg.departure_time,
        title: `${iataToLabel(seg.origin_iata)} → ${iataToLabel(seg.destination_iata)}`,
        subtitle: [seg.airline, seg.flight_number, seg.flight_class].filter(Boolean).join(" · "),
        details: {
          ...(seg.departure_time ? { "Embarque": seg.departure_time } : {}),
          ...(seg.arrival_time ? { "Chegada": seg.arrival_time } : {}),
          ...(seg.terminal ? { "Terminal": seg.terminal } : {}),
          ...(seg.flight_class ? { "Classe": seg.flight_class } : {}),
          ...(seg.direction ? { "Trecho": seg.direction === "ida" ? "Ida" : "Volta" } : {}),
        },
        icon: Plane,
        color: "bg-accent text-accent-foreground",
      });
    });

    // Hotels
    const allHotels = [...(hotels || []), ...(lodging || [])];
    allHotels.forEach((h: any, i: number) => {
      const checkinDate = h.hotel_checkin_datetime_utc?.split("T")[0] || h.checkin_date;
      const name = h.hotel_name || h.description || "Hotel";

      if (checkinDate) {
        list.push({
          id: `hotel-in-${i}`,
          type: "hotel-checkin",
          date: checkinDate,
          time: "14:00",
          title: `Check-in — ${name}`,
          subtitle: h.reservation_code || h.hotel_reservation_code ? `Reserva: ${h.reservation_code || h.hotel_reservation_code}` : undefined,
          details: {
            ...(h.notes ? { "Notas": h.notes } : {}),
            ...(h.reservation_code || h.hotel_reservation_code ? { "Reserva": h.reservation_code || h.hotel_reservation_code } : {}),
          },
          icon: Hotel,
          color: "bg-amber-500 text-white",
        });
      }
    });

    // Services
    (services || []).forEach((s: any, i: number) => {
      const cat = (s.product_type || s.category || "").toLowerCase();
      const isTransfer = cat.includes("transfer");
      const isFood = cat.includes("gastro") || cat.includes("culin");
      const type = isTransfer ? "transfer" : "service";

      list.push({
        id: `service-${i}`,
        type,
        date: "",
        title: s.description || s.category || "Serviço",
        subtitle: s.reservation_code ? `Código: ${s.reservation_code}` : undefined,
        details: {
          ...(s.product_type ? { "Tipo": s.product_type } : {}),
          ...(s.reservation_code ? { "Código": s.reservation_code } : {}),
        },
        icon: isTransfer ? Car : isFood ? Utensils : Ticket,
        color: isTransfer ? "bg-emerald-500 text-white" : "bg-blue-500 text-white",
      });
    });

    // Sort by date then time
    list.sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      const cmp = a.date.localeCompare(b.date);
      if (cmp !== 0) return cmp;
      return (a.time || "").localeCompare(b.time || "");
    });

    return list;
  }, [segments, hotels, lodging, services]);

  // Group by date
  const grouped = useMemo(() => {
    const groups: { date: string; label: string; items: TimelineItem[] }[] = [];
    let current = "";
    items.forEach(item => {
      const d = item.date || "outros";
      if (d !== current) {
        current = d;
        groups.push({
          date: d,
          label: d !== "outros" ? fmtDateFull(d) : "Serviços sem data",
          items: [item],
        });
      } else {
        groups[groups.length - 1].items.push(item);
      }
    });
    return groups;
  }, [items]);

  const now = new Date();
  const today = now.toISOString().split("T")[0];

  return (
    <div className="space-y-1">
      {grouped.map((group, gi) => {
        const isPast = group.date !== "outros" && group.date < today;
        const isToday = group.date === today;

        return (
          <div key={group.date} className="relative">
            {/* Date header */}
            <div className={`sticky top-0 z-10 flex items-center gap-3 py-3 ${gi > 0 ? "mt-2" : ""}`}>
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${
                isToday
                  ? "bg-accent text-accent-foreground shadow-md"
                  : isPast
                    ? "bg-muted/60 text-muted-foreground"
                    : "bg-muted text-foreground"
              }`}>
                <Calendar className="h-3 w-3" />
                {group.label}
              </div>
              {isToday && (
                <span className="text-xs text-accent font-medium animate-pulse">● Hoje</span>
              )}
            </div>

            {/* Items */}
            <div className="relative ml-5 border-l-2 border-border/50 pl-6 space-y-3 pb-2">
              {group.items.map((item, ii) => {
                const expanded = expandedId === item.id;
                const { color } = getCategoryIcon(item.type);
                const ItemIcon = item.icon;

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: isPast ? 0.6 : 1, x: 0 }}
                    transition={{ delay: ii * 0.05 }}
                    className="relative"
                  >
                    {/* Dot on timeline */}
                    <div className={`absolute -left-[31px] top-3 w-4 h-4 rounded-full ${color} flex items-center justify-center ring-4 ring-background shadow-sm`}>
                      <ItemIcon className="h-2.5 w-2.5" />
                    </div>

                    {/* Card */}
                    <div
                      className={`rounded-xl border transition-all cursor-pointer group ${
                        expanded
                          ? "bg-card border-accent/30 shadow-md"
                          : "bg-card/50 border-border/50 hover:border-border hover:shadow-sm"
                      }`}
                      onClick={() => setExpandedId(expanded ? null : item.id)}
                    >
                      <div className="flex items-center gap-3 p-3.5">
                        <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center flex-shrink-0`}>
                          <ItemIcon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{item.title}</p>
                          {item.subtitle && (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.subtitle}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {item.time && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {item.time}
                            </span>
                          )}
                          {expanded ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          )}
                        </div>
                      </div>

                      <AnimatePresence>
                        {expanded && Object.keys(item.details).length > 0 && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="px-3.5 pb-3.5 pt-0 grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {Object.entries(item.details).map(([key, val]) => (
                                <div key={key} className="bg-muted/40 rounded-lg px-3 py-2">
                                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{key}</p>
                                  <p className="text-sm font-medium text-foreground mt-0.5">{val}</p>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
