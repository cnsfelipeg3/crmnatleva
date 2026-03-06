import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateBR, formatTimeBR } from "@/lib/dateFormat";
import { iataToLabel, iataToCityName } from "@/lib/iataUtils";
import FlightTimeline, { type FlightSegment } from "@/components/FlightTimeline";
import AirlineLogo, { AirlineLogosStack } from "@/components/AirlineLogo";
import {
  ArrowLeft, Plane, Hotel, Users, DollarSign, MapPin, Calendar,
  ExternalLink, Clock, ShoppingBag, Shield, Car, Ticket, Train,
  CheckCircle2, AlertTriangle, FileText, Paperclip, Copy,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface TimelineItem {
  date: string;
  time?: string;
  type: "aereo" | "hotel" | "trem" | "transfer" | "passeio" | "seguro" | "ingresso" | "aluguel_carro" | "outros";
  title: string;
  subtitle: string;
  details: Record<string, string>;
  status: string;
  reservationCode?: string;
  icon: typeof Plane;
}

const TYPE_CONFIG: Record<string, { label: string; icon: typeof Plane; color: string }> = {
  aereo: { label: "Aéreo", icon: Plane, color: "text-blue-400" },
  hotel: { label: "Hospedagem", icon: Hotel, color: "text-amber-400" },
  trem: { label: "Trem", icon: Train, color: "text-purple-400" },
  transfer: { label: "Transfer", icon: Car, color: "text-green-400" },
  passeio: { label: "Passeio", icon: Ticket, color: "text-pink-400" },
  seguro: { label: "Seguro", icon: Shield, color: "text-cyan-400" },
  ingresso: { label: "Ingresso", icon: Ticket, color: "text-orange-400" },
  aluguel_carro: { label: "Aluguel de Carro", icon: Car, color: "text-teal-400" },
  outros: { label: "Outros", icon: ShoppingBag, color: "text-muted-foreground" },
};

const STATUS_BADGE: Record<string, string> = {
  pendente: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  confirmado: "bg-green-500/15 text-green-400 border-green-500/30",
  concluido: "bg-muted text-muted-foreground border-border",
  cancelado: "bg-red-500/15 text-red-400 border-red-500/30",
};

export default function TripDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sale, setSale] = useState<any>(null);
  const [segments, setSegments] = useState<FlightSegment[]>([]);
  const [costItems, setCostItems] = useState<any[]>([]);
  const [passengers, setPassengers] = useState<any[]>([]);
  const [checkinTasks, setCheckinTasks] = useState<any[]>([]);
  const [lodgingTasks, setLodgingTasks] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [sellerName, setSellerName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      supabase.from("sales").select("*").eq("id", id).single(),
      supabase.from("flight_segments").select("*").eq("sale_id", id).order("segment_order"),
      supabase.from("cost_items").select("*").eq("sale_id", id),
      supabase.from("sale_passengers").select("passenger_id, role, passengers(id, full_name, cpf, phone, birth_date, passport_number)").eq("sale_id", id),
      supabase.from("checkin_tasks").select("*").eq("sale_id", id),
      supabase.from("lodging_confirmation_tasks").select("*").eq("sale_id", id),
      supabase.from("attachments").select("*").eq("sale_id", id),
    ]).then(async ([saleRes, segRes, costRes, paxRes, checkinRes, lodgingRes, attachRes]) => {
      const s = saleRes.data;
      setSale(s);
      setSegments((segRes.data || []) as FlightSegment[]);
      setCostItems(costRes.data || []);
      setPassengers((paxRes.data || []).map((p: any) => ({ ...p.passengers, role: p.role })));
      setCheckinTasks(checkinRes.data || []);
      setLodgingTasks(lodgingRes.data || []);
      setAttachments(attachRes.data || []);

      if (s?.seller_id) {
        const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", s.seller_id).single();
        if (profile) setSellerName(profile.full_name);
      }
      setLoading(false);
    });
  }, [id]);

  // Build timeline items
  const timeline = useMemo(() => {
    if (!sale) return [];
    const items: TimelineItem[] = [];

    // Flight segments — with full time details
    segments.forEach(seg => {
      const depTime = seg.departure_time ? formatTimeBR(seg.departure_time) : "";
      const arrTime = seg.arrival_time ? formatTimeBR(seg.arrival_time) : "";
      items.push({
        date: seg.departure_date || sale.departure_date || "",
        time: seg.departure_time || undefined,
        type: "aereo",
        title: `${seg.origin_iata} → ${seg.destination_iata}`,
        subtitle: `${seg.airline || sale.airline || "Cia"} ${seg.flight_number || ""} • ${seg.flight_class || sale.flight_class || ""}`.trim(),
        details: {
          "Companhia": seg.airline || sale.airline || "—",
          "Voo": seg.flight_number || "—",
          "Classe": seg.flight_class || "—",
          "Partida": depTime || "—",
          "Chegada": arrTime || "—",
          "Duração": seg.duration_minutes ? `${Math.floor(seg.duration_minutes / 60)}h${seg.duration_minutes % 60 > 0 ? `${seg.duration_minutes % 60}min` : ""}` : "—",
          "Terminal": seg.terminal || "—",
        },
        status: getFlightStatus(seg),
        reservationCode: sale.locators?.[0] || undefined,
        icon: Plane,
      });
    });

    // If no segments but has air data
    if (segments.length === 0 && (sale.origin_iata || sale.airline)) {
      items.push({
        date: sale.departure_date || "",
        type: "aereo",
        title: `${sale.origin_iata || "?"} → ${sale.destination_iata || "?"}`,
        subtitle: `${sale.airline || ""} • ${sale.flight_class || ""}`.trim(),
        details: {
          "Companhia": sale.airline || "—",
          "Localizador": sale.locators?.join(", ") || "—",
        },
        status: "pendente",
        reservationCode: sale.locators?.[0] || undefined,
        icon: Plane,
      });
      if (sale.return_date) {
        items.push({
          date: sale.return_date,
          type: "aereo",
          title: `${sale.destination_iata || "?"} → ${sale.origin_iata || "?"}`,
          subtitle: `Retorno • ${sale.airline || ""}`,
          details: {},
          status: "pendente",
          reservationCode: sale.locators?.[0] || undefined,
          icon: Plane,
        });
      }
    }

    // Hotel — split into Check-in and Check-out entries
    if (sale.hotel_name) {
      items.push({
        date: sale.hotel_checkin_date || sale.departure_date || "",
        time: "14:00",
        type: "hotel",
        title: `🏨 Check-in: ${sale.hotel_name}`,
        subtitle: `${sale.hotel_city || ""} • ${sale.hotel_room || ""} ${sale.hotel_meal_plan || ""}`.trim(),
        details: {
          "Horário": "14:00 (padrão)",
          "Quarto": sale.hotel_room || "—",
          "Refeição": sale.hotel_meal_plan || "—",
          "Reserva": sale.hotel_reservation_code || "—",
          "Endereço": sale.hotel_address || "—",
        },
        status: getLodgingStatus(),
        reservationCode: sale.hotel_reservation_code || undefined,
        icon: Hotel,
      });
      if (sale.hotel_checkout_date) {
        items.push({
          date: sale.hotel_checkout_date,
          time: "12:00",
          type: "hotel",
          title: `🏨 Check-out: ${sale.hotel_name}`,
          subtitle: `${sale.hotel_city || ""}`,
          details: {
            "Horário": "12:00 (padrão)",
            "Reserva": sale.hotel_reservation_code || "—",
          },
          status: getLodgingStatus(),
          reservationCode: sale.hotel_reservation_code || undefined,
          icon: Hotel,
        });
      }
    }

    // Other products from cost_items — include date/time info
    costItems.filter(ci => ci.category === "outros").forEach(ci => {
      const pType = ci.product_type || "outros";
      const config = TYPE_CONFIG[pType] || TYPE_CONFIG.outros;
      // Try to extract a meaningful time hint based on product type
      const timeHint = pType === "transfer" ? "Conforme reserva"
        : pType === "passeio" ? "Conforme reserva"
        : pType === "aluguel_carro" ? "Conforme contrato"
        : "";
      items.push({
        date: ci.created_at?.slice(0, 10) || "",
        type: pType as any,
        title: ci.description || config.label,
        subtitle: ci.emission_source || "",
        details: {
          "Valor": ci.total_item_cost ? fmt(ci.total_item_cost) : "—",
          "Reserva": ci.reservation_code || "—",
          ...(timeHint ? { "Horário": timeHint } : {}),
        },
        status: "pendente",
        reservationCode: ci.reservation_code || undefined,
        icon: config.icon,
      });
    });

    // Sort chronologically
    items.sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      const cmp = a.date.localeCompare(b.date);
      if (cmp !== 0) return cmp;
      return (a.time || "").localeCompare(b.time || "");
    });

    return items;
  }, [sale, segments, costItems]);

  function getFlightStatus(seg: FlightSegment): string {
    const task = checkinTasks.find(t => t.segment_id === seg.id);
    if (task) {
      if (task.status === "CONCLUIDO") return "concluido";
      if (task.status === "CRITICO" || task.status === "URGENTE") return "pendente";
    }
    return "pendente";
  }

  function getLodgingStatus(): string {
    if (lodgingTasks.length === 0) return "pendente";
    const confirmed = lodgingTasks.some(t => t.status === "CONFIRMADO");
    return confirmed ? "confirmado" : "pendente";
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado!" });
  };

  if (loading) return (
    <div className="p-4 md:p-6 space-y-4 max-w-5xl mx-auto">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-40 rounded-xl" />
      <Skeleton className="h-96 rounded-xl" />
    </div>
  );

  if (!sale) return (
    <div className="p-6 text-center">
      <p className="text-muted-foreground">Viagem não encontrada</p>
      <Button onClick={() => navigate("/viagens")} className="mt-4">Voltar</Button>
    </div>
  );

  const tripStart = sale.departure_date;
  const tripEnd = sale.return_date;
  const destinations = new Set([sale.destination_iata, ...segments.map(s => s.destination_iata)].filter(Boolean));

  return (
    <div className="p-4 md:p-6 space-y-5 animate-fade-in max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/viagens")} className="mt-1">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-serif text-foreground">{sale.name}</h1>
            <Badge variant="outline" className="text-xs">{sale.display_id}</Badge>
            <Badge variant="outline" className={`text-xs ${
              sale.status === "Emitido" || sale.status === "Finalizado" ? "bg-green-500/15 text-green-400" :
              sale.status === "Cancelado" ? "bg-red-500/15 text-red-400" :
              "bg-blue-500/15 text-blue-400"
            }`}>{sale.status}</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {formatDateBR(tripStart)} — {formatDateBR(tripEnd) || "Sem retorno"} • {[...destinations].map(d => iataToCityName(d)).join(", ")}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate(`/sales/${id}`)}>
          <ExternalLink className="w-4 h-4 mr-2" /> Abrir Venda
        </Button>
      </div>

      {/* Info cards row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground text-xs"><Users className="w-3.5 h-3.5" /> Passageiros</div>
          <p className="text-lg font-bold">{passengers.length || (sale.adults + sale.children)}</p>
          <div className="flex flex-wrap gap-1">
            {passengers.slice(0, 3).map(p => (
              <Badge key={p.id} variant="secondary" className="text-[10px]">{p.full_name?.split(" ")[0]}</Badge>
            ))}
            {passengers.length > 3 && <Badge variant="outline" className="text-[10px]">+{passengers.length - 3}</Badge>}
          </div>
        </Card>
        <Card className="p-4 space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground text-xs"><MapPin className="w-3.5 h-3.5" /> Destinos</div>
          <p className="text-lg font-bold">{destinations.size}</p>
          <p className="text-xs text-muted-foreground truncate">{[...destinations].map(d => iataToCityName(d)).join(", ")}</p>
        </Card>
        <Card className="p-4 space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground text-xs"><DollarSign className="w-3.5 h-3.5" /> Valor</div>
          <p className="text-lg font-bold text-primary">{fmt(sale.received_value || 0)}</p>
          <p className="text-xs text-muted-foreground">Margem: {(sale.margin || 0).toFixed(1)}%</p>
        </Card>
        <Card className="p-4 space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground text-xs"><FileText className="w-3.5 h-3.5" /> Vendedor</div>
          <p className="text-sm font-semibold truncate">{sellerName || "—"}</p>
          <p className="text-xs text-muted-foreground">{sale.observations?.slice(0, 40) || "Sem obs."}</p>
        </Card>
      </div>

      {/* Passengers detail */}
      {passengers.length > 0 && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-3"><Users className="w-4 h-4 text-primary" /> Passageiros</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {passengers.map(p => (
              <div key={p.id} className="bg-muted/30 rounded-lg p-3 space-y-1">
                <p className="text-sm font-medium">{p.full_name}</p>
                {p.cpf && <p className="text-xs text-muted-foreground">CPF: {p.cpf}</p>}
                {p.phone && <p className="text-xs text-muted-foreground">Tel: {p.phone}</p>}
                {p.birth_date && <p className="text-xs text-muted-foreground">Nasc: {formatDateBR(p.birth_date)}</p>}
                {p.passport_number && <p className="text-xs text-muted-foreground">Passaporte: {p.passport_number}</p>}
                {p.role && <Badge variant="outline" className="text-[9px]">{p.role}</Badge>}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Flight Timeline visual */}
      {segments.length > 0 && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-3"><Plane className="w-4 h-4 text-primary" /> Mapa de Voos</h3>
          <FlightTimeline segments={segments} showAll />
        </Card>
      )}

      {/* Chronological Journey Timeline */}
      <Card className="p-5 overflow-hidden">
        {(() => {
          const today = new Date().toISOString().slice(0, 10);
          const pastCount = timeline.filter(item => {
            if (!item.date) return false;
            return item.date < today || item.status === "concluido";
          }).length;
          const progressPercent = timeline.length > 0 ? Math.round((pastCount / timeline.length) * 100) : 0;
          const currentIdx = timeline.findIndex(item => item.date && item.date >= today && item.status !== "concluido");

          return (
            <>
              <div className="flex items-center gap-3 mb-5">
                <Clock className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold">Jornada Completa</h3>
                <Badge variant="outline" className="text-[10px]">{timeline.length} itens</Badge>
                <div className="ml-auto flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{pastCount} de {timeline.length} concluídos</span>
                  <span className="text-sm font-bold text-primary">{progressPercent}%</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="relative h-2 rounded-full bg-muted mb-6 overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${progressPercent}%`,
                    background: `linear-gradient(90deg, hsl(var(--primary) / 0.6), hsl(var(--primary)))`,
                    boxShadow: `0 0 12px hsl(var(--primary) / 0.4)`,
                  }}
                />
                {progressPercent > 0 && progressPercent < 100 && (
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-primary bg-card z-10 animate-pulse"
                    style={{ left: `calc(${progressPercent}% - 7px)` }}
                  />
                )}
              </div>

              {/* Dot legend */}
              <div className="flex items-center gap-4 mb-4 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-muted-foreground/40" /> Concluído</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary animate-pulse" /> Atual</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary/70" /> Por vir</span>
              </div>

              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />

                <div className="space-y-4">
                  {timeline.map((item, i) => {
                    const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.outros;
                    const Icon = config.icon;
                    const prevDate = i > 0 ? timeline[i - 1].date : null;
                    const showDateHeader = item.date && item.date !== prevDate;

                    const isPast = (item.date && item.date < today) || item.status === "concluido";
                    const isCurrent = i === currentIdx;
                    const isFuture = !isPast && !isCurrent;

                    return (
                      <div key={i} className={isPast ? "opacity-50" : ""}>
                        {showDateHeader && (
                          <div className="flex items-center gap-3 mb-2 ml-12">
                            <Calendar className="w-3 h-3 text-muted-foreground" />
                            <span className={`text-xs font-semibold uppercase tracking-wider ${isPast ? "text-muted-foreground/60" : isCurrent ? "text-primary" : "text-muted-foreground"}`}>
                              {formatDateBR(item.date)}
                              {isCurrent && <span className="ml-2 text-primary normal-case tracking-normal">← Hoje</span>}
                            </span>
                          </div>
                        )}
                        <div className="flex gap-3 relative">
                          {/* Dot */}
                          <div className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center z-10 transition-all duration-300 ${
                            isPast
                              ? "bg-muted border border-border"
                              : isCurrent
                                ? "bg-primary/20 border-2 border-primary shadow-[0_0_12px_hsl(var(--primary)/0.35)] animate-pulse"
                                : "bg-card border border-primary/40"
                          }`}>
                            <Icon className={`w-4 h-4 ${
                              isPast ? "text-muted-foreground/60" : isCurrent ? "text-primary" : config.color
                            }`} />
                          </div>

                          {/* Content */}
                          <div className={`flex-1 rounded-xl p-4 border transition-all duration-300 ${
                            isPast
                              ? "bg-muted/10 border-border/30"
                              : isCurrent
                                ? "bg-primary/5 border-primary/30 shadow-[0_0_20px_hsl(var(--primary)/0.1)]"
                                : "bg-muted/20 border-border/50 hover:border-primary/30"
                          }`}>
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2">
                                {item.time && (
                                  <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                                    isPast ? "bg-muted text-muted-foreground/60" : "bg-primary/15 text-primary"
                                  }`}>
                                    {formatTimeBR(item.time)}
                                  </span>
                                )}
                                <div>
                                  <p className={`text-sm font-semibold ${isPast ? "text-muted-foreground line-through decoration-muted-foreground/30" : "text-foreground"}`}>{item.title}</p>
                                  {item.subtitle && <p className="text-xs text-muted-foreground">{item.subtitle}</p>}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {item.reservationCode && (
                                  <button
                                    onClick={() => copyToClipboard(item.reservationCode!)}
                                    className="flex items-center gap-1 bg-muted/50 rounded px-2 py-0.5 text-[10px] font-mono hover:bg-muted transition-colors"
                                  >
                                    {item.reservationCode}
                                    <Copy className="w-2.5 h-2.5" />
                                  </button>
                                )}
                                <Badge variant="outline" className={`text-[9px] ${
                                  isPast
                                    ? "bg-muted text-muted-foreground border-border"
                                    : isCurrent
                                      ? "bg-primary/20 text-primary border-primary/40"
                                      : STATUS_BADGE[item.status] || STATUS_BADGE.pendente
                                }`}>
                                  {isPast ? "✓ Concluído" :
                                   isCurrent ? "▶ Em andamento" :
                                   item.status === "confirmado" ? "Confirmado" :
                                   item.status === "cancelado" ? "Cancelado" : "Pendente"}
                                </Badge>
                              </div>
                            </div>

                            {Object.keys(item.details).length > 0 && !isPast && (
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 text-xs">
                                {Object.entries(item.details).map(([k, v]) => v && v !== "—" && (
                                  <div key={k}>
                                    <span className="text-muted-foreground">{k}: </span>
                                    <span className="font-medium">{v}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {timeline.length === 0 && (
                    <div className="text-center py-10 text-muted-foreground">
                      <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Nenhum item registrado na jornada</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          );
        })()}
      </Card>

      {/* Operational Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Check-in Tasks */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-primary" /> Check-ins
            <Badge variant="outline" className="text-[10px] ml-auto">{checkinTasks.length}</Badge>
          </h3>
          {checkinTasks.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum check-in pendente</p>
          ) : (
            <div className="space-y-2">
              {checkinTasks.map(t => (
                <div key={t.id} className="flex items-center justify-between bg-muted/30 rounded-lg p-3">
                  <div>
                    <p className="text-xs font-medium capitalize">{t.direction}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {t.departure_datetime_utc ? formatDateBR(t.departure_datetime_utc.slice(0, 10)) : "—"}
                    </p>
                  </div>
                  <Badge variant="outline" className={`text-[9px] ${
                    t.status === "CONCLUIDO" ? "bg-green-500/15 text-green-400" :
                    t.status === "CRITICO" ? "bg-red-500/15 text-red-400" :
                    t.status === "URGENTE" ? "bg-yellow-500/15 text-yellow-400" :
                    "bg-muted text-muted-foreground"
                  }`}>{t.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Lodging Tasks */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <Hotel className="w-4 h-4 text-primary" /> Confirmações de Hospedagem
            <Badge variant="outline" className="text-[10px] ml-auto">{lodgingTasks.length}</Badge>
          </h3>
          {lodgingTasks.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhuma confirmação pendente</p>
          ) : (
            <div className="space-y-2">
              {lodgingTasks.map(t => (
                <div key={t.id} className="flex items-center justify-between bg-muted/30 rounded-lg p-3">
                  <div>
                    <p className="text-xs font-medium">{t.hotel_name || sale.hotel_name || "Hotel"}</p>
                    <p className="text-[10px] text-muted-foreground">{t.milestone} • {t.urgency_level}</p>
                  </div>
                  <Badge variant="outline" className={`text-[9px] ${
                    t.status === "CONFIRMADO" ? "bg-green-500/15 text-green-400" :
                    t.status === "PROBLEMA" ? "bg-red-500/15 text-red-400" :
                    "bg-yellow-500/15 text-yellow-400"
                  }`}>{t.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Attachments */}
      {attachments.length > 0 && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <Paperclip className="w-4 h-4 text-primary" /> Anexos ({attachments.length})
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {attachments.map(a => (
              <a key={a.id} href={a.file_url} target="_blank" rel="noopener"
                className="flex items-center gap-2 bg-muted/30 rounded-lg p-3 hover:bg-muted/50 transition-colors">
                <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{a.file_name}</p>
                  <p className="text-[10px] text-muted-foreground">{a.category}</p>
                </div>
              </a>
            ))}
          </div>
        </Card>
      )}

      {/* Financial Summary */}
      <Card className="p-5 bg-primary/5 border-primary/20">
        <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
          <DollarSign className="w-4 h-4 text-primary" /> Resumo Financeiro
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-xs text-muted-foreground">Valor Recebido</span>
            <p className="text-lg font-bold text-primary">{fmt(sale.received_value || 0)}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Custo Total</span>
            <p className="text-lg font-bold">{fmt(sale.total_cost || 0)}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Lucro</span>
            <p className={`text-lg font-bold ${(sale.profit || 0) >= 0 ? "text-green-400" : "text-red-400"}`}>{fmt(sale.profit || 0)}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Margem</span>
            <p className="text-lg font-bold text-accent">{(sale.margin || 0).toFixed(1)}%</p>
          </div>
        </div>

        {costItems.length > 0 && (
          <div className="mt-4 border-t pt-3 space-y-1.5">
            {costItems.map(ci => (
              <div key={ci.id} className="flex items-center justify-between text-xs py-1">
                <span className="text-muted-foreground">{ci.description || ci.category}</span>
                <div className="flex items-center gap-3">
                  {ci.miles_quantity > 0 && <span className="text-muted-foreground">{ci.miles_quantity?.toLocaleString()} milhas</span>}
                  <span className="font-medium">{fmt(ci.total_item_cost || 0)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
