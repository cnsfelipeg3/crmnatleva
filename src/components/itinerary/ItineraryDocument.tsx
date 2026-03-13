import { forwardRef } from "react";
import {
  Plane, Hotel, MapPin, Users, Clock, Shield, Car, Ticket, Star,
  Phone, Mail, MessageCircle, Calendar, Briefcase, ArrowRight,
  Sunrise, Sunset, CheckCircle2, AlertCircle, Globe, Compass,
} from "lucide-react";
import AirlineLogo from "@/components/AirlineLogo";
import { iataToLabel } from "@/lib/iataUtils";
import logoSrc from "@/assets/logo-natleva-clean.png";
import { getDestinationImage } from "@/components/travel-ui/JourneyHero";

interface ItineraryData {
  sale: any;
  segments: any[];
  hotels: any[];
  services: any[];
  passengers: any[];
  receivables: any[];
  sellerName?: string | null;
  clientName?: string | null;
  coverImageUrl?: string | null;
  notesForClient?: string | null;
}

const fmtDate = (d: string | null) => {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
};
const fmtDateShort = (d: string | null) => {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
};
const fmtDay = (d: string | null) => {
  if (!d) return "";
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit" });
};
const fmtMonth = (d: string | null) => {
  if (!d) return "";
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR", { month: "short" }).toUpperCase().replace(".", "");
};
const fmtWeekday = (d: string | null) => {
  if (!d) return "";
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR", { weekday: "long" });
};
const fmtTime = (t: string | null) => t?.slice(0, 5) || "—";
const fmt = (v: number) => v?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) || "R$ 0,00";

function tripDays(dep: string | null, ret: string | null): number {
  if (!dep || !ret) return 0;
  return Math.ceil((new Date(ret + "T23:59:59").getTime() - new Date(dep + "T00:00:00").getTime()) / 86400000);
}

/* ── Timeline builder ── */
function buildTimeline(segments: any[], hotels: any[], services: any[]) {
  const events: { date: string; time?: string; type: string; title: string; subtitle?: string; icon: string }[] = [];
  segments.forEach(s => {
    events.push({
      date: s.departure_date || "", time: s.departure_time?.slice(0, 5),
      type: "flight", title: `${s.airline || ""} ${s.flight_number || ""}`.trim(),
      subtitle: `${iataToLabel(s.origin_iata)} → ${iataToLabel(s.destination_iata)}`, icon: "plane",
    });
  });
  hotels.forEach(h => {
    const desc = h.description || h.product_type || "Hotel";
    if (h.checkin_date) events.push({ date: h.checkin_date, type: "hotel-in", title: `Check-in · ${desc}`, subtitle: h.reservation_code ? `Reserva ${h.reservation_code}` : undefined, icon: "hotel" });
    if (h.checkout_date) events.push({ date: h.checkout_date, type: "hotel-out", title: `Check-out · ${desc}`, icon: "hotel" });
  });
  services.forEach(s => {
    events.push({ date: s.service_date || s.created_at?.slice(0, 10) || "", type: "service", title: s.description || s.product_type || "Serviço", icon: "star" });
  });
  return events.sort((a, b) => (a.date || "").localeCompare(b.date || "") || (a.time || "").localeCompare(b.time || ""));
}

/* ── Section divider ── */
function SectionTitle({ children, icon: Icon }: { children: React.ReactNode; icon: any }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #059669 0%, #047857 100%)" }}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <h2 className="text-lg font-bold text-gray-900 tracking-tight leading-none">{children}</h2>
        <div className="w-12 h-0.5 mt-2 rounded-full" style={{ background: "linear-gradient(90deg, #059669, transparent)" }} />
      </div>
    </div>
  );
}

const ItineraryDocument = forwardRef<HTMLDivElement, ItineraryData>(
  ({ sale, segments, hotels, services, passengers, receivables, sellerName, clientName, coverImageUrl, notesForClient }, ref) => {
    const timeline = buildTimeline(segments, hotels, services);
    const originLabel = sale?.origin_iata ? iataToLabel(sale.origin_iata) : "Origem";
    const destLabel = sale?.destination_iata ? iataToLabel(sale.destination_iata) : "Destino";
    const days = tripDays(sale?.departure_date, sale?.return_date);
    const totalPaid = receivables.filter((r: any) => r.status === "pago").reduce((s: number, r: any) => s + (r.net_value || 0), 0);
    const totalPending = receivables.filter((r: any) => r.status !== "pago").reduce((s: number, r: any) => s + (r.gross_value || 0), 0);
    const totalValue = sale?.received_value || 0;
    const heroImage = coverImageUrl || getDestinationImage(sale?.destination_iata, null, sale?.id);

    return (
      <div ref={ref} className="bg-white text-gray-900 max-w-[800px] mx-auto" style={{ fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif" }}>

        {/* ═══════════════════════════════════════════════
            1 — COVER
            ═══════════════════════════════════════════════ */}
        <div className="relative overflow-hidden" style={{ minHeight: 480 }}>
          <img src={heroImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.55) 60%, rgba(2,44,34,0.85) 100%)" }} />

          {/* Logo top */}
          <div className="relative z-10 pt-10 px-10 flex items-center justify-between">
            <img src={logoSrc} alt="NatLeva" className="h-8 brightness-0 invert opacity-90" />
            <span className="text-white/40 text-[10px] uppercase tracking-[0.3em] font-medium">Roteiro Personalizado</span>
          </div>

          {/* Content */}
          <div className="relative z-10 flex flex-col justify-end px-10 pb-12" style={{ minHeight: 400 }}>
            {clientName && (
              <p className="text-white/50 text-xs uppercase tracking-[0.25em] font-medium mb-3">{clientName}</p>
            )}
            <h1 className="text-4xl md:text-5xl font-black text-white leading-[0.95] tracking-tighter mb-4">
              {sale?.name || "Itinerário de Viagem"}
            </h1>

            {/* Route pills */}
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white/90 text-sm px-4 py-2 rounded-full border border-white/10">
                <span className="font-mono font-bold tracking-[0.15em]">{sale?.origin_iata || "—"}</span>
                <div className="flex items-center">
                  <div className="w-6 h-px bg-white/30" />
                  <Plane className="h-3 w-3 text-white/60 mx-1 rotate-90" />
                  <div className="w-6 h-px bg-white/30" />
                </div>
                <span className="font-mono font-bold tracking-[0.15em]">{sale?.destination_iata || "—"}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm text-white/70 text-xs px-3 py-2 rounded-full border border-white/10">
                <Calendar className="h-3 w-3" />
                {fmtDateShort(sale?.departure_date)} — {fmtDateShort(sale?.return_date)}
              </div>
              {days > 0 && (
                <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm text-white/70 text-xs px-3 py-2 rounded-full border border-white/10">
                  <Clock className="h-3 w-3" />
                  {days} dias
                </div>
              )}
            </div>
          </div>

          {/* Bottom fade to white */}
          <div className="absolute bottom-0 left-0 right-0 h-24" style={{ background: "linear-gradient(to top, white, transparent)" }} />
        </div>

        {/* ═══════════════════════════════════════════════
            2 — RESUMO DA EXPERIÊNCIA
            ═══════════════════════════════════════════════ */}
        <div className="px-10 py-10">
          <SectionTitle icon={Compass}>Resumo da Experiência</SectionTitle>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { label: "Origem", value: originLabel, accent: false },
              { label: "Destino", value: destLabel, accent: true },
              { label: "Embarque", value: fmtDate(sale?.departure_date), accent: false },
              { label: "Retorno", value: fmtDate(sale?.return_date), accent: false },
              { label: "Viajantes", value: `${(sale?.adults || 0) + (sale?.children || 0)} passageiro${((sale?.adults || 0) + (sale?.children || 0)) !== 1 ? "s" : ""}`, accent: false },
              { label: "Consultor NatLeva", value: sellerName || "—", accent: false },
            ].map((item, i) => (
              <div key={i} className="relative overflow-hidden rounded-xl p-4" style={{ background: item.accent ? "linear-gradient(135deg, #ecfdf5, #d1fae5)" : "#f8fafc" }}>
                <p className="text-[10px] uppercase tracking-[0.15em] font-bold mb-1.5" style={{ color: item.accent ? "#047857" : "#94a3b8" }}>{item.label}</p>
                <p className="text-sm font-bold text-gray-900">{item.value}</p>
              </div>
            ))}
          </div>

          {/* Quick stats */}
          {(segments.length > 0 || hotels.length > 0 || days > 0) && (
            <div className="flex items-center justify-center gap-8 mt-6 py-4 border-t border-gray-100">
              {days > 0 && (
                <div className="text-center">
                  <p className="text-2xl font-black text-gray-900">{days}</p>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">dias</p>
                </div>
              )}
              {segments.length > 0 && (
                <div className="text-center">
                  <p className="text-2xl font-black text-gray-900">{segments.length}</p>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">voos</p>
                </div>
              )}
              {hotels.length > 0 && (
                <div className="text-center">
                  <p className="text-2xl font-black text-gray-900">{hotels.length}</p>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">{hotels.length === 1 ? "hotel" : "hotéis"}</p>
                </div>
              )}
              {passengers.length > 0 && (
                <div className="text-center">
                  <p className="text-2xl font-black text-gray-900">{passengers.length}</p>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">viajantes</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════
            3 — LINHA DO TEMPO
            ═══════════════════════════════════════════════ */}
        {timeline.length > 0 && (
          <div className="px-10 py-10" style={{ background: "#fafbfc" }}>
            <SectionTitle icon={Calendar}>Linha do Tempo da Jornada</SectionTitle>
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-[27px] top-0 bottom-0 w-px bg-gradient-to-b from-emerald-200 via-emerald-100 to-transparent" />

              <div className="space-y-0">
                {timeline.map((ev, i) => {
                  const isFirst = i === 0;
                  const isLast = i === timeline.length - 1;
                  const iconColor = ev.icon === "plane" ? "#2563eb" : ev.icon === "hotel" ? "#d97706" : "#7c3aed";
                  const iconBg = ev.icon === "plane" ? "#eff6ff" : ev.icon === "hotel" ? "#fffbeb" : "#f5f3ff";

                  return (
                    <div key={i} className="relative flex items-start gap-4 pb-6">
                      {/* Date column */}
                      <div className="w-[54px] shrink-0 text-center">
                        <div
                          className="w-[54px] rounded-xl py-1.5 border"
                          style={{
                            background: isFirst || isLast ? "linear-gradient(135deg, #059669, #047857)" : "white",
                            borderColor: isFirst || isLast ? "transparent" : "#e5e7eb",
                          }}
                        >
                          <p className="text-lg font-black leading-none" style={{ color: isFirst || isLast ? "white" : "#111827" }}>
                            {fmtDay(ev.date)}
                          </p>
                          <p className="text-[9px] font-bold uppercase tracking-wider mt-0.5" style={{ color: isFirst || isLast ? "rgba(255,255,255,0.7)" : "#9ca3af" }}>
                            {fmtMonth(ev.date)}
                          </p>
                        </div>
                      </div>

                      {/* Event content */}
                      <div className="flex-1 bg-white rounded-xl border border-gray-100 p-4 hover:shadow-sm transition-shadow">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: iconBg }}>
                            {ev.icon === "plane" && <Plane className="h-4 w-4" style={{ color: iconColor }} />}
                            {ev.icon === "hotel" && <Hotel className="h-4 w-4" style={{ color: iconColor }} />}
                            {ev.icon === "star" && <Star className="h-4 w-4" style={{ color: iconColor }} />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-gray-900">{ev.title}</p>
                            {ev.subtitle && <p className="text-xs text-gray-500 mt-0.5">{ev.subtitle}</p>}
                            {ev.time && <p className="text-[10px] text-gray-400 mt-1">{ev.time}h</p>}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════
            4 — VOOS (Boarding Pass Style)
            ═══════════════════════════════════════════════ */}
        {segments.length > 0 && (
          <div className="px-10 py-10">
            <SectionTitle icon={Plane}>Seus Voos</SectionTitle>
            <div className="space-y-4">
              {segments.map((seg, i) => (
                <div key={i} className="relative overflow-hidden rounded-2xl border border-gray-100" style={{ background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)" }}>
                  {/* Top bar */}
                  <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <AirlineLogo iata={seg.airline} size={28} />
                      <div>
                        <p className="text-sm font-bold text-gray-900">{seg.airline} {seg.flight_number}</p>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider">
                          {seg.direction === "ida" ? "Trecho de Ida" : seg.direction === "volta" ? "Trecho de Volta" : seg.direction || "Conexão"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {seg.flight_class && (
                        <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-bold uppercase border border-emerald-100">
                          {seg.flight_class}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Route display */}
                  <div className="px-5 py-6">
                    <div className="flex items-center justify-between">
                      {/* Origin */}
                      <div className="text-center flex-shrink-0">
                        <p className="text-3xl font-black text-gray-900 tracking-tight">{seg.origin_iata}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5 max-w-[100px] truncate">{iataToLabel(seg.origin_iata)}</p>
                        <p className="text-sm font-bold text-gray-700 mt-2">{fmtTime(seg.departure_time)}</p>
                        <p className="text-[10px] text-gray-400">{fmtDateShort(seg.departure_date)}</p>
                      </div>

                      {/* Flight path */}
                      <div className="flex-1 mx-6 relative">
                        <div className="flex items-center">
                          <div className="w-2 h-2 rounded-full bg-emerald-500" />
                          <div className="flex-1 mx-1 relative">
                            <div className="border-t-2 border-dashed border-gray-200 w-full" />
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-1.5 rounded-full">
                              <Plane className="h-4 w-4 text-emerald-600 rotate-90" />
                            </div>
                          </div>
                          <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        </div>
                        {seg.duration_minutes && (
                          <p className="text-[10px] text-gray-400 text-center mt-2 font-medium">
                            {Math.floor(seg.duration_minutes / 60)}h{(seg.duration_minutes % 60).toString().padStart(2, "0")} de voo
                          </p>
                        )}
                      </div>

                      {/* Destination */}
                      <div className="text-center flex-shrink-0">
                        <p className="text-3xl font-black text-gray-900 tracking-tight">{seg.destination_iata}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5 max-w-[100px] truncate">{iataToLabel(seg.destination_iata)}</p>
                        <p className="text-sm font-bold text-gray-700 mt-2">{fmtTime(seg.arrival_time)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Bottom details */}
                  {(seg.terminal || seg.cabin_type || seg.baggage_allowance) && (
                    <div className="flex flex-wrap gap-4 px-5 py-3 border-t border-gray-100 text-[10px] text-gray-400">
                      {seg.terminal && <span>Terminal {seg.terminal}</span>}
                      {seg.cabin_type && <span>Cabine {seg.cabin_type}</span>}
                      {seg.baggage_allowance && <span>Bagagem: {seg.baggage_allowance}</span>}
                    </div>
                  )}

                  {/* Decorative cutouts */}
                  <div className="absolute top-1/2 -left-3 w-6 h-6 bg-white rounded-full -translate-y-1/2" />
                  <div className="absolute top-1/2 -right-3 w-6 h-6 bg-white rounded-full -translate-y-1/2" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════
            5 — HOSPEDAGEM
            ═══════════════════════════════════════════════ */}
        {hotels.length > 0 && (
          <div className="px-10 py-10" style={{ background: "#fffbeb08" }}>
            <SectionTitle icon={Hotel}>Hospedagem</SectionTitle>
            <div className="space-y-4">
              {hotels.map((h, i) => (
                <div key={i} className="rounded-2xl border border-gray-100 bg-white p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #fef3c7, #fde68a)" }}>
                      <Hotel className="h-6 w-6 text-amber-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-bold text-gray-900">{h.description || "Hotel"}</p>
                      {h.reservation_code && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          Reserva: <span className="font-mono font-bold text-gray-700">{h.reservation_code}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-4">
                    {h.checkin_date && (
                      <div className="rounded-xl p-3 border border-emerald-100" style={{ background: "#ecfdf5" }}>
                        <div className="flex items-center gap-1.5 mb-1">
                          <Sunrise className="h-3 w-3 text-emerald-600" />
                          <p className="text-[10px] text-emerald-700 uppercase font-bold tracking-wider">Check-in</p>
                        </div>
                        <p className="text-sm font-bold text-gray-900">{fmtDate(h.checkin_date)}</p>
                      </div>
                    )}
                    {h.checkout_date && (
                      <div className="rounded-xl p-3 border border-amber-100" style={{ background: "#fffbeb" }}>
                        <div className="flex items-center gap-1.5 mb-1">
                          <Sunset className="h-3 w-3 text-amber-600" />
                          <p className="text-[10px] text-amber-700 uppercase font-bold tracking-wider">Check-out</p>
                        </div>
                        <p className="text-sm font-bold text-gray-900">{fmtDate(h.checkout_date)}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════
            6 — SERVIÇOS E EXPERIÊNCIAS
            ═══════════════════════════════════════════════ */}
        {services.length > 0 && (
          <div className="px-10 py-10">
            <SectionTitle icon={Star}>Experiências & Serviços</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {services.map((s, i) => {
                const iconMap: Record<string, any> = { transfer: Car, seguro: Shield, ingresso: Ticket };
                const IconComp = iconMap[s.product_type] || Compass;
                return (
                  <div key={i} className="flex items-start gap-3 p-4 rounded-xl border border-gray-100 bg-white hover:shadow-sm transition-shadow">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#f5f3ff" }}>
                      <IconComp className="h-4 w-4 text-violet-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900">{s.description || s.product_type || "Serviço"}</p>
                      {s.reservation_code && <p className="text-[10px] text-gray-400 mt-0.5">Código: <span className="font-mono">{s.reservation_code}</span></p>}
                      {s.service_date && <p className="text-[10px] text-gray-400 mt-0.5">{fmtDateShort(s.service_date)}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════
            7 — PASSAGEIROS
            ═══════════════════════════════════════════════ */}
        {passengers.length > 0 && (
          <div className="px-10 py-10" style={{ background: "#f8fafc" }}>
            <SectionTitle icon={Users}>Viajantes</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {passengers.map((p, i) => {
                const initial = (p.full_name || "?")[0]?.toUpperCase();
                const colors = ["#059669", "#2563eb", "#d97706", "#7c3aed"];
                const color = colors[i % colors.length];
                return (
                  <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-white border border-gray-100">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-black text-lg shrink-0"
                      style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}
                    >
                      {initial}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{p.full_name}</p>
                      <div className="flex flex-wrap gap-3 text-[10px] text-gray-400 mt-0.5">
                        {p.cpf && <span>CPF: •••{p.cpf.slice(-4)}</span>}
                        {p.passport_number && <span>Passaporte: {p.passport_number}</span>}
                        {p.birth_date && <span>Nasc: {fmtDateShort(p.birth_date)}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════
            8 — FINANCEIRO
            ═══════════════════════════════════════════════ */}
        {receivables.length > 0 && (
          <div className="px-10 py-10">
            <SectionTitle icon={Briefcase}>Painel Financeiro</SectionTitle>

            {/* KPI cards */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="rounded-xl p-4 text-center" style={{ background: "#f8fafc" }}>
                <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-1">Valor Total</p>
                <p className="text-xl font-black text-gray-900">{fmt(totalValue)}</p>
              </div>
              <div className="rounded-xl p-4 text-center" style={{ background: "#ecfdf5" }}>
                <p className="text-[10px] uppercase tracking-wider text-emerald-600 font-bold mb-1">Pago</p>
                <p className="text-xl font-black text-emerald-700">{fmt(totalPaid)}</p>
              </div>
              <div className="rounded-xl p-4 text-center" style={{ background: totalPending > 0 ? "#fffbeb" : "#ecfdf5" }}>
                <p className="text-[10px] uppercase tracking-wider font-bold mb-1" style={{ color: totalPending > 0 ? "#d97706" : "#059669" }}>
                  {totalPending > 0 ? "Pendente" : "Quitado"}
                </p>
                <p className="text-xl font-black" style={{ color: totalPending > 0 ? "#b45309" : "#047857" }}>
                  {totalPending > 0 ? fmt(totalPending) : "✓"}
                </p>
              </div>
            </div>

            {/* Installments */}
            <div className="rounded-xl border border-gray-100 overflow-hidden">
              <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between text-[10px] text-gray-400 uppercase tracking-wider font-bold">
                <span>Parcela</span>
                <div className="flex gap-16">
                  <span>Vencimento</span>
                  <span>Valor</span>
                  <span>Status</span>
                </div>
              </div>
              {receivables.map((r: any, i: number) => (
                <div key={i} className="flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0">
                  <span className="text-xs font-bold text-gray-700">
                    {r.installment_number}/{r.installment_total}
                  </span>
                  <div className="flex items-center gap-8">
                    <span className="text-xs text-gray-500 w-24 text-right">{fmtDateShort(r.due_date)}</span>
                    <span className="text-xs font-bold text-gray-900 w-24 text-right">{fmt(r.gross_value)}</span>
                    <span className="w-20 text-right">
                      {r.status === "pago" ? (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold border border-emerald-100">
                          <CheckCircle2 className="h-2.5 w-2.5" /> Pago
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-bold border border-amber-100">
                          <Clock className="h-2.5 w-2.5" /> Pendente
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════
            9 — NOTAS PERSONALIZADAS
            ═══════════════════════════════════════════════ */}
        {notesForClient && (
          <div className="px-10 py-8">
            <div className="rounded-2xl p-6 border border-emerald-100" style={{ background: "linear-gradient(135deg, #ecfdf5, #d1fae5)" }}>
              <div className="flex items-center gap-2 mb-3">
                <MessageCircle className="h-4 w-4 text-emerald-700" />
                <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Mensagem da sua consultora</p>
              </div>
              <p className="text-sm text-emerald-900/80 leading-relaxed whitespace-pre-wrap">{notesForClient}</p>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════
            10 — ORIENTAÇÕES AO VIAJANTE
            ═══════════════════════════════════════════════ */}
        <div className="px-10 py-10" style={{ background: "#f8fafc" }}>
          <SectionTitle icon={Shield}>Dicas Importantes para sua Viagem</SectionTitle>
          <div className="space-y-3">
            {[
              { emoji: "✈️", text: "Chegue ao aeroporto com pelo menos **3 horas** de antecedência para voos internacionais e **2 horas** para nacionais." },
              { emoji: "🧳", text: "Verifique a franquia de bagagem da sua companhia aérea antes de embarcar." },
              { emoji: "🛂", text: "Confira a validade do seu passaporte — mínimo de **6 meses** de validade a partir da data de viagem." },
              { emoji: "🏨", text: "O horário de check-in nos hotéis é geralmente a partir das **15h** e check-out até **12h**." },
              { emoji: "📱", text: "Mantenha este itinerário acessível no seu celular para consulta rápida durante a viagem." },
            ].map((tip, i) => (
              <div key={i} className="flex items-start gap-3 p-3.5 rounded-xl bg-white border border-gray-100">
                <span className="text-lg shrink-0 mt-0.5">{tip.emoji}</span>
                <p className="text-xs text-gray-600 leading-relaxed" dangerouslySetInnerHTML={{ __html: tip.text.replace(/\*\*(.*?)\*\*/g, "<strong class='text-gray-900'>$1</strong>") }} />
              </div>
            ))}
          </div>
        </div>

        {/* ═══════════════════════════════════════════════
            11 — RODAPÉ PREMIUM
            ═══════════════════════════════════════════════ */}
        <div className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, #022c22 0%, #064e3b 50%, #047857 100%)" }}>
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "30px 30px" }} />
          <div className="relative z-10 px-10 py-12 text-center">
            <img src={logoSrc} alt="NatLeva" className="h-10 mx-auto mb-6 brightness-0 invert opacity-90" />
            <p className="text-white/50 text-[10px] uppercase tracking-[0.3em] font-medium mb-2">Sua consultora de viagens</p>
            {sellerName && <p className="text-white text-base font-bold">{sellerName}</p>}
            <div className="flex items-center justify-center gap-8 mt-6">
              {[
                { icon: Phone, label: "Telefone" },
                { icon: MessageCircle, label: "WhatsApp" },
                { icon: Mail, label: "E-mail" },
              ].map(({ icon: Icon, label }) => (
                <span key={label} className="flex items-center gap-1.5 text-white/40 text-xs">
                  <Icon className="h-3.5 w-3.5" /> {label}
                </span>
              ))}
            </div>
            <div className="mt-8 pt-6 border-t border-white/10">
              <p className="text-white/20 text-[10px] tracking-wider">
                © {new Date().getFullYear()} NatLeva — Transformando sonhos em jornadas inesquecíveis
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

ItineraryDocument.displayName = "ItineraryDocument";
export default ItineraryDocument;
