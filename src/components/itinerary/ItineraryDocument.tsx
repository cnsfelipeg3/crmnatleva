import { forwardRef } from "react";
import { Plane, Hotel, MapPin, Users, Clock, Shield, Car, Ticket, Star, Phone, Mail, MessageCircle, Info, Calendar, Briefcase } from "lucide-react";
import AirlineLogo from "@/components/AirlineLogo";
import { iataToLabel } from "@/lib/iataUtils";
import logoSrc from "@/assets/logo-natleva-clean.png";

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
const fmtTime = (t: string | null) => t?.slice(0, 5) || "—";
const fmt = (v: number) => v?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) || "R$ 0,00";

function buildTimeline(segments: any[], hotels: any[], services: any[]) {
  const events: { date: string; time?: string; type: string; title: string; subtitle?: string; icon: string }[] = [];

  segments.forEach(s => {
    events.push({
      date: s.departure_date || "",
      time: s.departure_time?.slice(0, 5),
      type: "flight",
      title: `Voo ${s.airline || ""} ${s.flight_number || ""}`,
      subtitle: `${iataToLabel(s.origin_iata)} → ${iataToLabel(s.destination_iata)}`,
      icon: "plane",
    });
  });

  hotels.forEach(h => {
    const desc = h.description || h.product_type || "Hotel";
    if (h.checkin_date || h.reservation_code) {
      events.push({
        date: h.checkin_date || "",
        type: "hotel-in",
        title: `Check-in — ${desc}`,
        subtitle: h.reservation_code ? `Reserva: ${h.reservation_code}` : undefined,
        icon: "hotel",
      });
      events.push({
        date: h.checkout_date || "",
        type: "hotel-out",
        title: `Check-out — ${desc}`,
        icon: "hotel",
      });
    }
  });

  services.forEach(s => {
    events.push({
      date: s.service_date || s.created_at?.slice(0, 10) || "",
      type: "service",
      title: s.description || s.product_type || "Serviço",
      icon: "star",
    });
  });

  return events.sort((a, b) => (a.date || "").localeCompare(b.date || "") || (a.time || "").localeCompare(b.time || ""));
}

const ItineraryDocument = forwardRef<HTMLDivElement, ItineraryData>(
  ({ sale, segments, hotels, services, passengers, receivables, sellerName, clientName, coverImageUrl, notesForClient }, ref) => {
    const timeline = buildTimeline(segments, hotels, services);
    const originLabel = sale?.origin_iata ? iataToLabel(sale.origin_iata) : "Origem";
    const destLabel = sale?.destination_iata ? iataToLabel(sale.destination_iata) : "Destino";

    const totalPaid = receivables.filter((r: any) => r.status === "pago").reduce((s: number, r: any) => s + (r.net_value || 0), 0);
    const totalPending = receivables.filter((r: any) => r.status !== "pago").reduce((s: number, r: any) => s + (r.gross_value || 0), 0);
    const totalValue = (sale?.received_value || 0);

    return (
      <div ref={ref} className="bg-white text-gray-900 max-w-[800px] mx-auto" style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
        {/* ===== COVER ===== */}
        <div className="relative overflow-hidden" style={{ minHeight: 360, background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)" }}>
          {coverImageUrl && (
            <img src={coverImageUrl} alt="Destino" className="absolute inset-0 w-full h-full object-cover opacity-40" />
          )}
          <div className="relative z-10 flex flex-col items-center justify-center text-center px-8 py-16" style={{ minHeight: 360 }}>
            <img src={logoSrc} alt="NatLeva" className="h-12 mb-8 brightness-0 invert" />
            <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-3">
              {sale?.name || "Itinerário de Viagem"}
            </h1>
            <p className="text-lg text-white/80 mb-2">
              {originLabel} → {destLabel}
            </p>
            <p className="text-sm text-white/60">
              {fmtDate(sale?.departure_date)} — {fmtDate(sale?.return_date)}
            </p>
            {clientName && <p className="mt-6 text-sm text-white/70 tracking-widest uppercase">{clientName}</p>}
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-16" style={{ background: "linear-gradient(to top, white, transparent)" }} />
        </div>

        {/* ===== SUMMARY ===== */}
        <div className="px-8 py-8">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-600" /> Resumo da Viagem
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: "Origem", value: originLabel },
              { label: "Destino", value: destLabel },
              { label: "Saída", value: fmtDate(sale?.departure_date) },
              { label: "Retorno", value: fmtDate(sale?.return_date) },
              { label: "Passageiros", value: `${(sale?.adults || 0) + (sale?.children || 0)} PAX` },
              { label: "Consultor", value: sellerName || "—" },
            ].map((item, i) => (
              <div key={i} className="bg-gray-50 rounded-lg p-3">
                <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">{item.label}</p>
                <p className="text-sm font-semibold text-gray-800">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        <hr className="mx-8 border-gray-100" />

        {/* ===== TIMELINE ===== */}
        {timeline.length > 0 && (
          <div className="px-8 py-8">
            <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" /> Cronograma da Viagem
            </h2>
            <div className="relative pl-8 border-l-2 border-blue-100 space-y-6">
              {timeline.map((ev, i) => (
                <div key={i} className="relative">
                  <div className="absolute -left-[41px] w-8 h-8 rounded-full bg-white border-2 border-blue-200 flex items-center justify-center">
                    {ev.icon === "plane" && <Plane className="h-3.5 w-3.5 text-blue-600" />}
                    {ev.icon === "hotel" && <Hotel className="h-3.5 w-3.5 text-amber-600" />}
                    {ev.icon === "star" && <Star className="h-3.5 w-3.5 text-purple-600" />}
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">
                      {fmtDateShort(ev.date)} {ev.time ? `• ${ev.time}` : ""}
                    </p>
                    <p className="text-sm font-semibold text-gray-800 mt-0.5">{ev.title}</p>
                    {ev.subtitle && <p className="text-xs text-gray-500">{ev.subtitle}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <hr className="mx-8 border-gray-100" />

        {/* ===== FLIGHTS ===== */}
        {segments.length > 0 && (
          <div className="px-8 py-8">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Plane className="h-5 w-5 text-blue-600" /> Voos
            </h2>
            <div className="space-y-4">
              {segments.map((seg, i) => (
                <div key={i} className="border border-gray-100 rounded-xl p-5 hover:shadow-sm transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <AirlineLogo iata={seg.airline} size={32} />
                      <div>
                        <p className="text-sm font-bold text-gray-800">
                          {seg.airline} {seg.flight_number}
                        </p>
                        <p className="text-[10px] text-gray-400 uppercase">
                          {seg.direction === "ida" ? "Ida" : seg.direction === "volta" ? "Volta" : seg.direction}
                        </p>
                      </div>
                    </div>
                    {seg.flight_class && (
                      <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium uppercase">
                        {seg.flight_class}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-center">
                      <p className="text-xl font-bold text-gray-800">{seg.origin_iata}</p>
                      <p className="text-[10px] text-gray-400">{iataToLabel(seg.origin_iata)}</p>
                      <p className="text-xs font-semibold text-gray-600 mt-1">{fmtTime(seg.departure_time)}</p>
                      <p className="text-[10px] text-gray-400">{fmtDateShort(seg.departure_date)}</p>
                    </div>
                    <div className="flex-1 mx-4">
                      <div className="border-t border-dashed border-gray-200 relative">
                        <Plane className="h-3 w-3 text-gray-300 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-90" />
                      </div>
                      {seg.duration_minutes && (
                        <p className="text-[10px] text-gray-400 text-center mt-1">
                          {Math.floor(seg.duration_minutes / 60)}h{(seg.duration_minutes % 60).toString().padStart(2, "0")}
                        </p>
                      )}
                    </div>
                    <div className="text-center">
                      <p className="text-xl font-bold text-gray-800">{seg.destination_iata}</p>
                      <p className="text-[10px] text-gray-400">{iataToLabel(seg.destination_iata)}</p>
                      <p className="text-xs font-semibold text-gray-600 mt-1">{fmtTime(seg.arrival_time)}</p>
                    </div>
                  </div>
                  {(seg.terminal || seg.cabin_type) && (
                    <div className="flex gap-4 mt-3 pt-3 border-t border-gray-50 text-[10px] text-gray-400">
                      {seg.terminal && <span>Terminal: {seg.terminal}</span>}
                      {seg.cabin_type && <span>Cabine: {seg.cabin_type}</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== HOTELS ===== */}
        {hotels.length > 0 && (
          <div className="px-8 py-8">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Hotel className="h-5 w-5 text-amber-600" /> Hospedagem
            </h2>
            <div className="space-y-4">
              {hotels.map((h, i) => (
                <div key={i} className="border border-gray-100 rounded-xl p-5">
                  <p className="text-sm font-bold text-gray-800">{h.description || "Hotel"}</p>
                  {h.reservation_code && (
                    <p className="text-xs text-gray-500 mt-1">Reserva: <span className="font-mono font-semibold">{h.reservation_code}</span></p>
                  )}
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    {h.checkin_date && (
                      <div className="bg-green-50 rounded-lg p-2.5">
                        <p className="text-[10px] text-green-600 uppercase font-medium">Check-in</p>
                        <p className="text-xs font-semibold text-gray-800">{fmtDate(h.checkin_date)}</p>
                      </div>
                    )}
                    {h.checkout_date && (
                      <div className="bg-red-50 rounded-lg p-2.5">
                        <p className="text-[10px] text-red-600 uppercase font-medium">Check-out</p>
                        <p className="text-xs font-semibold text-gray-800">{fmtDate(h.checkout_date)}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== SERVICES ===== */}
        {services.length > 0 && (
          <div className="px-8 py-8">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Star className="h-5 w-5 text-purple-600" /> Serviços e Experiências
            </h2>
            <div className="space-y-3">
              {services.map((s, i) => (
                <div key={i} className="flex items-start gap-3 p-4 border border-gray-100 rounded-xl">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                    {s.product_type === "transfer" ? <Car className="h-4 w-4 text-purple-600" /> :
                     s.product_type === "seguro" ? <Shield className="h-4 w-4 text-purple-600" /> :
                     s.product_type === "ingresso" ? <Ticket className="h-4 w-4 text-purple-600" /> :
                     <Briefcase className="h-4 w-4 text-purple-600" />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{s.description || s.product_type || "Serviço"}</p>
                    {s.reservation_code && <p className="text-xs text-gray-500">Código: {s.reservation_code}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== PASSENGERS ===== */}
        {passengers.length > 0 && (
          <div className="px-8 py-8">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-green-600" /> Passageiros
            </h2>
            <div className="space-y-2">
              {passengers.map((p, i) => (
                <div key={i} className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl">
                  <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-xs font-bold text-green-700">
                    {(p.full_name || "?")[0]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{p.full_name}</p>
                    <div className="flex gap-3 text-[10px] text-gray-400">
                      {p.cpf && <span>CPF: {p.cpf}</span>}
                      {p.passport_number && <span>Passaporte: {p.passport_number}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== FINANCIAL ===== */}
        {receivables.length > 0 && (
          <div className="px-8 py-8">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-emerald-600" /> Financeiro
            </h2>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-[10px] uppercase text-gray-400">Valor Total</p>
                <p className="text-sm font-bold text-gray-800">{fmt(totalValue)}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <p className="text-[10px] uppercase text-green-600">Pago</p>
                <p className="text-sm font-bold text-green-700">{fmt(totalPaid)}</p>
              </div>
              <div className="bg-amber-50 rounded-lg p-3 text-center">
                <p className="text-[10px] uppercase text-amber-600">Pendente</p>
                <p className="text-sm font-bold text-amber-700">{fmt(totalPending)}</p>
              </div>
            </div>
            <div className="space-y-1.5">
              {receivables.map((r: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-gray-50">
                  <span className="text-gray-600">
                    {r.installment_number}/{r.installment_total} — {fmtDate(r.due_date)}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-800">{fmt(r.gross_value)}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${r.status === "pago" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                      {r.status === "pago" ? "Pago" : "Pendente"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== NOTES ===== */}
        {notesForClient && (
          <div className="px-8 py-8">
            <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
              <Info className="h-5 w-5 text-amber-500" /> Informações Importantes
            </h2>
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {notesForClient}
            </div>
          </div>
        )}

        {/* ===== IMPORTANT INFO ===== */}
        <div className="px-8 py-8">
          <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" /> Orientações ao Viajante
          </h2>
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-2 text-xs text-gray-600">
            <p>✈️ Chegue ao aeroporto com pelo menos <strong>3 horas</strong> de antecedência para voos internacionais e <strong>2 horas</strong> para nacionais.</p>
            <p>🧳 Verifique a franquia de bagagem da sua companhia aérea antes de embarcar.</p>
            <p>📄 Confira a validade do seu passaporte — mínimo de <strong>6 meses</strong> de validade.</p>
            <p>🏨 O horário de check-in nos hotéis é geralmente a partir das 15h e check-out até 12h.</p>
            <p>📱 Mantenha este itinerário acessível no seu celular para consulta rápida.</p>
          </div>
        </div>

        {/* ===== FOOTER / CONTACT ===== */}
        <div className="px-8 py-10" style={{ background: "linear-gradient(135deg, #0f172a, #1e293b)" }}>
          <div className="text-center">
            <img src={logoSrc} alt="NatLeva" className="h-8 mx-auto mb-4 brightness-0 invert" />
            <p className="text-white/80 text-sm font-medium mb-1">Sua consultora de viagens</p>
            {sellerName && <p className="text-white text-sm font-semibold">{sellerName}</p>}
            <div className="flex items-center justify-center gap-6 mt-4 text-white/60 text-xs">
              <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> Suporte NatLeva</span>
              <span className="flex items-center gap-1"><MessageCircle className="h-3 w-3" /> WhatsApp</span>
              <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> E-mail</span>
            </div>
            <p className="text-white/30 text-[10px] mt-6">© {new Date().getFullYear()} NatLeva — Todos os direitos reservados</p>
          </div>
        </div>
      </div>
    );
  }
);

ItineraryDocument.displayName = "ItineraryDocument";
export default ItineraryDocument;
