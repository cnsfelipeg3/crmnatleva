import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { iataToLabel } from "@/lib/iataUtils";
import {
  Plane, Hotel, Car, Ticket, ChevronLeft, ChevronRight, Clock, X,
} from "lucide-react";

interface CalendarEvent {
  id: string;
  date: string;
  type: "flight" | "hotel" | "service";
  title: string;
  time?: string;
  color: string;
}

interface PortalCalendarProps {
  segments: any[];
  hotels: any[];
  lodging: any[];
  services: any[];
  sale: any;
}

const MONTHS_PT = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const DAYS_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function PortalCalendar({ segments, hotels, lodging, services, sale }: PortalCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Determine initial month from departure date
  const initialDate = sale?.departure_date ? new Date(sale.departure_date + "T00:00:00") : new Date();
  const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth());
  const [currentYear, setCurrentYear] = useState(initialDate.getFullYear());

  const events = useMemo(() => {
    const list: CalendarEvent[] = [];

    (segments || []).forEach((seg: any, i: number) => {
      if (seg.departure_date) {
        list.push({
          id: `f-${i}`,
          date: seg.departure_date,
          type: "flight",
          title: `${seg.origin_iata} → ${seg.destination_iata}`,
          time: seg.departure_time,
          color: "bg-accent",
        });
      }
    });

    [...(hotels || []), ...(lodging || [])].forEach((h: any, i: number) => {
      const d = h.hotel_checkin_datetime_utc?.split("T")[0] || h.checkin_date;
      if (d) {
        list.push({
          id: `h-${i}`,
          date: d,
          type: "hotel",
          title: `Check-in ${h.hotel_name || h.description || "Hotel"}`,
          time: "14:00",
          color: "bg-amber-500",
        });
      }
    });

    return list;
  }, [segments, hotels, lodging, services]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    events.forEach(e => {
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    });
    return map;
  }, [events]);

  // Trip date range
  const tripStart = sale?.departure_date;
  const tripEnd = sale?.return_date;

  // Calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  }, [currentMonth, currentYear]);

  const today = new Date().toISOString().split("T")[0];

  const getDateStr = (day: number) => {
    const m = String(currentMonth + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    return `${currentYear}-${m}-${d}`;
  };

  const isInTripRange = (dateStr: string) => {
    if (!tripStart || !tripEnd) return false;
    return dateStr >= tripStart && dateStr <= tripEnd;
  };

  const selectedEvents = selectedDate ? (eventsByDate[selectedDate] || []) : [];

  return (
    <div className="space-y-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => {
          if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
          else setCurrentMonth(m => m - 1);
        }}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-base font-semibold text-foreground">
          {MONTHS_PT[currentMonth]} {currentYear}
        </h3>
        <Button variant="ghost" size="sm" onClick={() => {
          if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
          else setCurrentMonth(m => m + 1);
        }}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1">
        {DAYS_PT.map(d => (
          <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, i) => {
          if (day === null) return <div key={`e-${i}`} />;

          const dateStr = getDateStr(day);
          const dayEvents = eventsByDate[dateStr] || [];
          const isToday = dateStr === today;
          const isTrip = isInTripRange(dateStr);
          const isSelected = dateStr === selectedDate;

          return (
            <button
              key={dateStr}
              onClick={() => setSelectedDate(isSelected ? null : dateStr)}
              className={`relative aspect-square rounded-lg flex flex-col items-center justify-center text-sm transition-all ${
                isSelected
                  ? "bg-accent text-accent-foreground ring-2 ring-accent/30"
                  : isToday
                    ? "bg-accent/20 text-accent font-bold ring-1 ring-accent/40"
                    : isTrip
                      ? "bg-accent/5 text-foreground hover:bg-accent/10"
                      : "text-muted-foreground hover:bg-muted/50"
              }`}
            >
              <span className={isToday ? "font-bold" : ""}>{day}</span>
              {dayEvents.length > 0 && (
                <div className="flex gap-0.5 mt-0.5">
                  {dayEvents.slice(0, 3).map((e, j) => (
                    <div key={j} className={`w-1.5 h-1.5 rounded-full ${e.color}`} />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected date events */}
      <AnimatePresence>
        {selectedDate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="border border-border/50 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-foreground">
                  {new Date(selectedDate + "T00:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
                </h4>
                <button onClick={() => setSelectedDate(null)} className="p-1 rounded hover:bg-muted">
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </div>

              {selectedEvents.length === 0 ? (
                <p className="text-xs text-muted-foreground py-3 text-center">Nenhum evento neste dia.</p>
              ) : (
                <div className="space-y-2">
                  {selectedEvents.map(ev => {
                    const Icon = ev.type === "flight" ? Plane : ev.type === "hotel" ? Hotel : Ticket;
                    return (
                      <div key={ev.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                        <div className={`w-8 h-8 rounded-lg ${ev.color} flex items-center justify-center`}>
                          <Icon className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{ev.title}</p>
                        </div>
                        {ev.time && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />{ev.time}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-accent" /> Voo</span>
        <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-500" /> Hotel</span>
        <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-accent/10 border border-accent/20 w-4 h-4 rounded" /> Período da viagem</span>
      </div>
    </div>
  );
}
