import { useState } from "react";
import { Plane, Clock, MapPin, Star, Luggage, ChevronDown, ChevronRight, Calendar, Utensils, Shield, Info, Camera, Wifi, Coffee, Sun, Moon, Sunrise, Check, AlertTriangle, Users, CreditCard, ArrowRight } from "lucide-react";
import AirlineLogo from "@/components/AirlineLogo";
import logoNatleva from "@/assets/logo-natleva-clean.png";
import { type StylePreviewProps, clickableClass, editOverlay, getRadius, getShadow } from "../TemplatePreview";

const heroImg = "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=1920&h=1080&fit=crop&q=80";
const lodgeImg = "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=900&h=600&fit=crop&q=80";
const safariImg = "https://images.unsplash.com/photo-1547970810-dc1eac37d174?w=800&h=500&fit=crop&q=80";
const destImgs = [
  "https://images.unsplash.com/photo-1523805009345-7448845a9e53?w=800&h=600&fit=crop&q=80",
  "https://images.unsplash.com/photo-1489392191049-fc10c97e64b6?w=800&h=600&fit=crop&q=80",
  "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&h=600&fit=crop&q=80",
];
const hotelGallery = [
  "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=400&h=300&fit=crop&q=80",
  "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=400&h=300&fit=crop&q=80",
  "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=400&h=300&fit=crop&q=80",
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=300&fit=crop&q=80",
  "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400&h=300&fit=crop&q=80",
  "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=400&h=300&fit=crop&q=80",
];

const timeline = [
  { day: "Dia 1", date: "10 ago", icon: Plane, title: "Partida de São Paulo", desc: "Voo GRU → ADD · Ethiopian Airlines", type: "flight" },
  { day: "Dia 2", date: "11 ago", icon: Plane, title: "Conexão e chegada", desc: "ADD → JRO · Transfer ao lodge", type: "flight" },
  { day: "Dia 3-4", date: "12-13 ago", icon: Sunrise, title: "Serengeti · Safari Matinal", desc: "Game drives ao nascer do sol · Big Five", type: "experience" },
  { day: "Dia 5", date: "14 ago", icon: Camera, title: "Grande Migração", desc: "Observação da travessia do rio Mara", type: "experience" },
  { day: "Dia 6-7", date: "15-16 ago", icon: Sun, title: "Ngorongoro Crater", desc: "Descida à cratera · Piquenique na savana", type: "experience" },
  { day: "Dia 8", date: "17 ago", icon: Plane, title: "Voo para Zanzibar", desc: "JRO → ZNZ · Charter privativo", type: "flight" },
  { day: "Dia 9-13", date: "18-22 ago", icon: Coffee, title: "Zanzibar · Relaxamento", desc: "Praias, mergulho, Stone Town, spa", type: "hotel" },
  { day: "Dia 14", date: "23 ago", icon: Plane, title: "Retorno", desc: "ZNZ → ADD → GRU", type: "flight" },
];

export function EditorialStyle({ form, activePanel, onClickSection }: StylePreviewProps) {
  const [galleryIdx, setGalleryIdx] = useState(0);
  const [expandedFlight, setExpandedFlight] = useState<number | null>(0);
  const tc = form.theme_config;
  const textCol = form.text_color || "#1a1a1a";
  const bgCol = form.bg_color || "#faf8f5";
  const radius = getRadius(tc.borderRadius);
  const shadow = getShadow(tc.shadowIntensity);
  const hFont = `'${form.font_heading}', serif`;
  const bFont = `'${form.font_body}', sans-serif`;

  return (
    <div style={{ backgroundColor: bgCol }}>
      {/* HERO */}
      <div className={clickableClass("layout", activePanel)} onClick={() => onClickSection("layout")}>
        {editOverlay("Editar layout")}
        <section className="relative h-[480px] overflow-hidden">
          <div className="absolute inset-0 bg-cover bg-center scale-105" style={{ backgroundImage: `url(${heroImg})` }} />
          <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, transparent 20%, ${form.primary_color}dd 70%, ${form.primary_color} 100%)` }} />
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg viewBox=\"0 0 200 200\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cfilter id=\"noise\"%3E%3CfeTurbulence type=\"fractalNoise\" baseFrequency=\"0.9\" /%3E%3C/filter%3E%3Crect width=\"100%25\" height=\"100%25\" filter=\"url(%23noise)\" /%3E%3C/svg%3E')" }} />
          <div className="absolute top-6 left-8 z-10">
            <img src={logoNatleva} alt="NatLeva" className="h-8 drop-shadow-lg opacity-80" />
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-10 z-10">
            <p className="text-[10px] tracking-[0.4em] uppercase text-white/50 mb-3" style={{ fontFamily: bFont }}>Proposta exclusiva para</p>
            <p className="text-sm text-white/70 mb-1 tracking-widest uppercase" style={{ fontFamily: bFont }}>Alexandre & Beatriz Montenegro</p>
            <h1 className="text-5xl font-bold text-white leading-[1.1] mb-4" style={{ fontFamily: hFont, letterSpacing: "-0.03em" }}>Safari de Luxo</h1>
            <div className="flex items-center gap-3 text-white/50 text-xs" style={{ fontFamily: bFont }}>
              <span>Tanzânia & Zanzibar</span>
              <span className="w-1 h-1 rounded-full bg-white/30" />
              <span>14 noites</span>
              <span className="w-1 h-1 rounded-full bg-white/30" />
              <span>10 — 24 de agosto de 2026</span>
              <span className="w-1 h-1 rounded-full bg-white/30" />
              <span className="flex items-center gap-1"><Users className="w-3 h-3" /> 2 passageiros</span>
            </div>
          </div>
        </section>
      </div>

      {/* TRIP OVERVIEW BAR */}
      <section className="px-8 py-5 flex items-center justify-between border-b" style={{ borderColor: `${form.accent_color}15`, backgroundColor: `${form.accent_color}05` }}>
        {[
          { label: "Duração", value: "14 noites" },
          { label: "Destinos", value: "3 cidades" },
          { label: "Voos", value: "4 trechos" },
          { label: "Hospedagens", value: "2 lodges" },
          { label: "Experiências", value: "8 atividades" },
          { label: "Classe", value: "Executiva" },
        ].map((item) => (
          <div key={item.label} className="text-center">
            <p className="text-[9px] uppercase tracking-[0.15em]" style={{ color: `${textCol}44`, fontFamily: bFont }}>{item.label}</p>
            <p className="text-sm font-bold mt-0.5" style={{ fontFamily: hFont, color: textCol }}>{item.value}</p>
          </div>
        ))}
      </section>

      {/* INTRO */}
      <div className={clickableClass("fonts", activePanel)} onClick={() => onClickSection("fonts")}>
        {editOverlay("Editar tipografia")}
        <section className="max-w-2xl mx-auto px-8 py-14 text-center">
          <div className="w-12 h-px mx-auto mb-6" style={{ backgroundColor: form.accent_color }} />
          <p className="text-xl italic leading-relaxed" style={{ fontFamily: hFont, color: `${textCol}aa` }}>
            "Uma jornada pelos cenários mais selvagens e deslumbrantes da África Oriental, onde a natureza se revela em sua forma mais pura e majestosa."
          </p>
          <div className="w-12 h-px mx-auto mt-6" style={{ backgroundColor: form.accent_color }} />
        </section>
      </div>

      {/* TRIP TIMELINE */}
      <section className="px-8 py-14" style={{ backgroundColor: `${form.primary_color}04` }}>
        <h2 className="text-center text-3xl font-bold mb-2 tracking-tight" style={{ fontFamily: hFont, color: textCol }}>Timeline da Viagem</h2>
        <p className="text-center text-xs mb-10" style={{ color: `${textCol}55`, fontFamily: bFont }}>Dia a dia da sua aventura</p>
        <div className="max-w-3xl mx-auto relative">
          {/* Vertical line */}
          <div className="absolute left-[23px] top-2 bottom-2 w-px" style={{ backgroundColor: `${form.accent_color}25` }} />
          {timeline.map((item, i) => {
            const Icon = item.icon;
            const typeColors: Record<string, string> = { flight: form.accent_color, experience: "#4ade80", hotel: "#60a5fa" };
            const col = typeColors[item.type] || form.accent_color;
            return (
              <div key={i} className="flex items-start gap-4 mb-4 last:mb-0">
                <div className="w-[46px] shrink-0 flex flex-col items-center">
                  <div className="w-[12px] h-[12px] rounded-full z-10 flex items-center justify-center" style={{ backgroundColor: col }}>
                    <div className="w-[6px] h-[6px] rounded-full bg-white" />
                  </div>
                </div>
                <div className="flex-1 pb-4 border-b" style={{ borderColor: `${textCol}08` }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded" style={{ backgroundColor: `${col}15`, color: col }}>{item.day}</span>
                    <span className="text-[10px]" style={{ color: `${textCol}44` }}>{item.date}</span>
                    <Icon className="w-3.5 h-3.5 ml-auto" style={{ color: `${col}66` }} />
                  </div>
                  <p className="text-sm font-semibold" style={{ fontFamily: hFont, color: textCol }}>{item.title}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: `${textCol}55`, fontFamily: bFont }}>{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* DESTINATIONS */}
      <div className={clickableClass("sections", activePanel)} onClick={() => onClickSection("sections")}>
        {editOverlay("Editar seções")}
        <section className="px-8 py-14">
          <h2 className="text-center text-3xl font-bold mb-2 tracking-tight" style={{ fontFamily: hFont, color: textCol }}>Seus Destinos</h2>
          <p className="text-center text-xs mb-8" style={{ color: `${textCol}55`, fontFamily: bFont }}>Três cenários extraordinários em uma única jornada</p>
          <div className="max-w-4xl mx-auto grid grid-cols-3 gap-4">
            {[
              { name: "Serengeti", sub: "5 noites · Big Five · Grande Migração", img: destImgs[0] },
              { name: "Ngorongoro", sub: "2 noites · Cratera · Flamingos", img: destImgs[1] },
              { name: "Zanzibar", sub: "5 noites · Praias · Stone Town", img: destImgs[2] },
            ].map((dest, i) => (
              <div key={dest.name} className="relative overflow-hidden group cursor-pointer" style={{ borderRadius: radius, height: "240px" }}>
                <img src={dest.img} alt={dest.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${form.primary_color}ee 0%, transparent 60%)` }} />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <p className="text-[9px] tracking-[0.3em] uppercase text-white/40 mb-1" style={{ fontFamily: bFont }}>Destino {String(i + 1).padStart(2, "0")}</p>
                  <h3 className="text-lg font-bold text-white" style={{ fontFamily: hFont }}>{dest.name}</h3>
                  <p className="text-[10px] text-white/50 mt-1">{dest.sub}</p>
                </div>
                {/* Distribution bar */}
                <div className="absolute top-3 right-3 bg-white/90 rounded-full px-2 py-0.5 text-[9px] font-bold" style={{ color: form.primary_color }}>
                  {["36%", "14%", "36%"][i]} da viagem
                </div>
              </div>
            ))}
          </div>
          {/* Distribution bar */}
          <div className="max-w-4xl mx-auto mt-4 flex rounded-full overflow-hidden h-2" style={{ backgroundColor: `${textCol}08` }}>
            <div className="h-full" style={{ width: "36%", backgroundColor: form.accent_color }} />
            <div className="h-full" style={{ width: "14%", backgroundColor: `${form.accent_color}88` }} />
            <div className="h-full" style={{ width: "36%", backgroundColor: `${form.accent_color}55` }} />
            <div className="h-full" style={{ width: "14%", backgroundColor: `${form.accent_color}30` }} />
          </div>
          <div className="max-w-4xl mx-auto mt-1.5 flex text-[9px]" style={{ color: `${textCol}44` }}>
            <span style={{ width: "36%" }}>Serengeti</span>
            <span style={{ width: "14%" }}>Ngorongoro</span>
            <span style={{ width: "36%" }}>Zanzibar</span>
            <span style={{ width: "14%" }}>Voos</span>
          </div>
        </section>
      </div>

      {/* FLIGHTS — Boarding Pass Style */}
      <section className="px-8 py-14" style={{ backgroundColor: `${form.primary_color}08` }}>
        <h2 className="text-center text-3xl font-bold mb-2 tracking-tight" style={{ fontFamily: hFont, color: textCol }}>Voos</h2>
        <p className="text-center text-xs mb-8" style={{ color: `${textCol}55`, fontFamily: bFont }}>4 trechos · Classe Executiva · Ethiopian Airlines</p>
        <div className="max-w-3xl mx-auto space-y-4">
          {[
            { airline: "ET", name: "Ethiopian Airlines", flight: "ET 507", from: "GRU", fromCity: "São Paulo · Guarulhos", to: "ADD", toCity: "Addis Ababa · Bole", dep: "23:55", arr: "17:40", dur: "14h45", date: "10 ago 2026", cls: "Executiva", bag: "2×32kg", bagHand: "1×10kg", term: "Terminal 3", termArr: "Terminal 2", loc: "XKWP3M", aircraft: "Boeing 787-9 Dreamliner", meal: "Jantar + Café da manhã", seat: "Lie-flat 180°", wifi: true, next: true },
            { airline: "ET", name: "Ethiopian Airlines", flight: "ET 815", from: "ADD", fromCity: "Addis Ababa · Bole", to: "JRO", toCity: "Kilimanjaro", dep: "21:30", arr: "23:45", dur: "2h15", date: "11 ago 2026", cls: "Executiva", bag: "2×32kg", bagHand: "1×10kg", term: "Terminal 2", termArr: "—", loc: "XKWP3M", aircraft: "Boeing 737-800", meal: "Snack", seat: "Reclinável", wifi: false, conn: "3h50" },
            { airline: "ET", name: "Ethiopian Airlines", flight: "ET 816", from: "ZNZ", fromCity: "Zanzibar · Abeid Amani", to: "ADD", toCity: "Addis Ababa · Bole", dep: "10:15", arr: "14:30", dur: "3h15", date: "23 ago 2026", cls: "Executiva", bag: "2×32kg", bagHand: "1×10kg", term: "—", termArr: "Terminal 2", loc: "XKWP3M", aircraft: "Boeing 737-MAX 8", meal: "Almoço", seat: "Reclinável", wifi: false },
            { airline: "ET", name: "Ethiopian Airlines", flight: "ET 506", from: "ADD", fromCity: "Addis Ababa · Bole", to: "GRU", toCity: "São Paulo · Guarulhos", dep: "23:50", arr: "07:30", dur: "11h40", date: "23 ago 2026", cls: "Executiva", bag: "2×32kg", bagHand: "1×10kg", term: "Terminal 2", termArr: "Terminal 3", loc: "XKWP3M", aircraft: "Boeing 787-9 Dreamliner", meal: "Jantar + Café da manhã", seat: "Lie-flat 180°", wifi: true, next: true, conn: "9h20" },
          ].map((f, i) => (
            <div key={i} className="relative border-2 overflow-hidden" style={{ borderRadius: radius, borderColor: `${form.accent_color}30`, backgroundColor: bgCol, boxShadow: shadow }}>
              {/* Connection notice */}
              {f.conn && (
                <div className="px-5 py-2 flex items-center gap-2 text-[10px] border-b" style={{ backgroundColor: `${form.accent_color}08`, borderColor: `${form.accent_color}15`, color: `${textCol}66` }}>
                  <Clock className="w-3 h-3" style={{ color: form.accent_color }} />
                  <span>Conexão de {f.conn} em {f.fromCity.split("·")[0].trim()}</span>
                  {parseFloat(f.conn) > 6 && <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded" style={{ backgroundColor: "#fef3c7", color: "#92400e" }}>⚠ Longa</span>}
                </div>
              )}
              {/* Perforated line */}
              <div className="absolute top-0 bottom-0 right-[110px]" style={{ borderRight: `2px dashed ${form.accent_color}20` }} />
              <div className="flex">
                <div className="flex-1 p-5 cursor-pointer" onClick={() => setExpandedFlight(expandedFlight === i ? null : i)}>
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-4">
                    <AirlineLogo iata={f.airline} size={40} />
                    <div>
                      <p className="font-bold text-sm" style={{ fontFamily: hFont, color: textCol }}>{f.name}</p>
                      <p className="text-[10px] font-mono tracking-wider" style={{ color: `${textCol}66` }}>{f.flight} · {f.aircraft}</p>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                      <span className="text-[9px] px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: `${form.accent_color}15`, color: form.accent_color }}>{f.cls}</span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${expandedFlight === i ? "rotate-180" : ""}`} style={{ color: `${textCol}33` }} />
                    </div>
                  </div>
                  {/* Route */}
                  <div className="flex items-center gap-6">
                    <div>
                      <p className="text-3xl font-bold font-mono" style={{ color: textCol, letterSpacing: "-0.05em" }}>{f.dep}</p>
                      <p className="text-xl font-bold font-mono mt-1" style={{ color: form.accent_color }}>{f.from}</p>
                      <p className="text-[10px] mt-0.5" style={{ color: `${textCol}55` }}>{f.fromCity}</p>
                      <p className="text-[9px] mt-0.5" style={{ color: `${textCol}44` }}>{f.term}</p>
                    </div>
                    <div className="flex-1 flex flex-col items-center gap-2">
                      <p className="text-[10px]" style={{ color: `${textCol}44` }}>{f.date}</p>
                      <div className="w-full flex items-center">
                        <div className="w-3 h-3 rounded-full border-2" style={{ borderColor: form.accent_color }} />
                        <div className="flex-1 h-px mx-2 relative" style={{ backgroundColor: `${form.accent_color}40` }}>
                          <Plane className="w-4 h-4 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-90" style={{ color: form.accent_color }} />
                        </div>
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: form.accent_color }} />
                      </div>
                      <span className="text-[10px] flex items-center gap-1" style={{ color: `${textCol}55` }}><Clock className="w-3 h-3" /> {f.dur}</span>
                    </div>
                    <div className="text-right">
                      <div className="flex items-baseline justify-end gap-1">
                        <p className="text-3xl font-bold font-mono" style={{ color: textCol, letterSpacing: "-0.05em" }}>{f.arr}</p>
                        {f.next && <span className="text-xs font-bold" style={{ color: form.accent_color }}>+1</span>}
                      </div>
                      <p className="text-xl font-bold font-mono mt-1" style={{ color: form.accent_color }}>{f.to}</p>
                      <p className="text-[10px] mt-0.5" style={{ color: `${textCol}55` }}>{f.toCity}</p>
                      <p className="text-[9px] mt-0.5" style={{ color: `${textCol}44` }}>{f.termArr}</p>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {expandedFlight === i && (
                    <div className="mt-4 pt-4 border-t grid grid-cols-4 gap-3" style={{ borderColor: `${form.accent_color}15` }}>
                      <div className="flex items-center gap-2">
                        <Luggage className="w-3.5 h-3.5" style={{ color: form.accent_color }} />
                        <div>
                          <p className="text-[9px] uppercase" style={{ color: `${textCol}44` }}>Despachada</p>
                          <p className="text-[11px] font-semibold" style={{ color: textCol }}>{f.bag}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Luggage className="w-3.5 h-3.5" style={{ color: form.accent_color }} />
                        <div>
                          <p className="text-[9px] uppercase" style={{ color: `${textCol}44` }}>Mão</p>
                          <p className="text-[11px] font-semibold" style={{ color: textCol }}>{f.bagHand}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Utensils className="w-3.5 h-3.5" style={{ color: form.accent_color }} />
                        <div>
                          <p className="text-[9px] uppercase" style={{ color: `${textCol}44` }}>Refeição</p>
                          <p className="text-[11px] font-semibold" style={{ color: textCol }}>{f.meal}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {f.wifi ? <Wifi className="w-3.5 h-3.5" style={{ color: form.accent_color }} /> : <Wifi className="w-3.5 h-3.5" style={{ color: `${textCol}22` }} />}
                        <div>
                          <p className="text-[9px] uppercase" style={{ color: `${textCol}44` }}>Wi-Fi</p>
                          <p className="text-[11px] font-semibold" style={{ color: textCol }}>{f.wifi ? "Disponível" : "Indisponível"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 col-span-2">
                        <div className="w-3.5 h-3.5 flex items-center justify-center text-[8px] font-bold rounded" style={{ backgroundColor: `${form.accent_color}15`, color: form.accent_color }}>✦</div>
                        <div>
                          <p className="text-[9px] uppercase" style={{ color: `${textCol}44` }}>Assento</p>
                          <p className="text-[11px] font-semibold" style={{ color: textCol }}>{f.seat}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 col-span-2">
                        <Plane className="w-3.5 h-3.5" style={{ color: form.accent_color }} />
                        <div>
                          <p className="text-[9px] uppercase" style={{ color: `${textCol}44` }}>Aeronave</p>
                          <p className="text-[11px] font-semibold" style={{ color: textCol }}>{f.aircraft}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                {/* Right stub */}
                <div className="w-[110px] flex flex-col items-center justify-center p-4" style={{ backgroundColor: `${form.accent_color}08` }}>
                  <p className="text-[8px] tracking-[0.2em] uppercase mb-2" style={{ color: `${textCol}44` }}>Localizador</p>
                  <p className="text-sm font-bold font-mono tracking-widest" style={{ color: form.accent_color }}>{f.loc}</p>
                  <div className="w-14 h-14 mt-3 rounded" style={{ background: `repeating-conic-gradient(${form.accent_color}30 0% 25%, transparent 0% 50%) 50%/8px 8px` }} />
                  <p className="text-[8px] mt-2 text-center" style={{ color: `${textCol}33` }}>Escaneie para check-in</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        {/* Baggage summary */}
        <div className="max-w-3xl mx-auto mt-6 p-4 border rounded-xl flex items-center gap-6" style={{ borderColor: `${form.accent_color}15`, backgroundColor: bgCol }}>
          <Luggage className="w-5 h-5 shrink-0" style={{ color: form.accent_color }} />
          <div className="flex-1">
            <p className="text-xs font-bold" style={{ fontFamily: hFont, color: textCol }}>Resumo de Bagagem</p>
            <p className="text-[10px] mt-0.5" style={{ color: `${textCol}55` }}>Despachada: 2 malas de até 32kg por pessoa · Mão: 1 mala de até 10kg por pessoa</p>
          </div>
          <div className="flex items-center gap-1 text-[9px] font-medium" style={{ color: "#16a34a" }}>
            <Check className="w-3.5 h-3.5" /> Incluído
          </div>
        </div>
      </section>

      {/* HOTEL with Gallery */}
      <section className="px-8 py-14">
        <h2 className="text-center text-3xl font-bold mb-2 tracking-tight" style={{ fontFamily: hFont, color: textCol }}>Hospedagem</h2>
        <p className="text-center text-xs mb-8" style={{ color: `${textCol}55`, fontFamily: bFont }}>Singita Grumeti Reserves · Serengeti, Tanzânia</p>

        {/* Main image + gallery */}
        <div className="max-w-4xl mx-auto">
          <div className="relative overflow-hidden" style={{ borderRadius: radius, height: "320px" }}>
            <img src={hotelGallery[galleryIdx]} alt="Hotel" className="w-full h-full object-cover transition-all duration-500" />
            <div className="absolute inset-0" style={{ background: `linear-gradient(to right, ${form.primary_color}cc 0%, transparent 50%)` }} />
            <div className="absolute inset-y-0 left-0 flex flex-col justify-center p-8 max-w-[50%]">
              <p className="text-[9px] tracking-[0.3em] uppercase text-white/40 mb-2" style={{ fontFamily: bFont }}>Serengeti, Tanzânia</p>
              <h3 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: hFont }}>Singita Grumeti Reserves</h3>
              <div className="flex gap-0.5 mb-3">{[1,2,3,4,5].map(j => <Star key={j} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />)}</div>
              <p className="text-xs text-white/60 leading-relaxed mb-4" style={{ fontFamily: bFont }}>
                Suítes privativas com vista para a savana, deck infinito e experiência gastronômica no coração da grande migração.
              </p>
              <div className="flex flex-wrap gap-2">
                {["Suite Savana", "Piscina privativa", "7 noites", "All inclusive"].map(tag => (
                  <span key={tag} className="text-[9px] px-2.5 py-1 rounded-full border border-white/20 text-white/70">{tag}</span>
                ))}
              </div>
            </div>
            {/* Photo count badge */}
            <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm text-white text-[10px] px-2.5 py-1 rounded-full flex items-center gap-1.5">
              <Camera className="w-3 h-3" /> {galleryIdx + 1}/{hotelGallery.length}
            </div>
          </div>

          {/* Thumbnail strip */}
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
            {hotelGallery.map((img, j) => (
              <div
                key={j}
                className="w-16 h-12 rounded-lg overflow-hidden cursor-pointer shrink-0 border-2 transition-all"
                style={{ borderColor: galleryIdx === j ? form.accent_color : "transparent", opacity: galleryIdx === j ? 1 : 0.6 }}
                onClick={() => setGalleryIdx(j)}
              >
                <img src={img} alt={`Foto ${j+1}`} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>

          {/* Hotel details grid */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="p-4 rounded-xl border" style={{ borderColor: `${form.accent_color}15` }}>
              <Calendar className="w-4 h-4 mb-2" style={{ color: form.accent_color }} />
              <p className="text-[9px] uppercase" style={{ color: `${textCol}44` }}>Check-in / Check-out</p>
              <p className="text-sm font-bold mt-1" style={{ fontFamily: hFont, color: textCol }}>12 ago · 14h → 19 ago · 11h</p>
            </div>
            <div className="p-4 rounded-xl border" style={{ borderColor: `${form.accent_color}15` }}>
              <Coffee className="w-4 h-4 mb-2" style={{ color: form.accent_color }} />
              <p className="text-[9px] uppercase" style={{ color: `${textCol}44` }}>Regime</p>
              <p className="text-sm font-bold mt-1" style={{ fontFamily: hFont, color: textCol }}>All Inclusive Premium</p>
              <p className="text-[10px] mt-0.5" style={{ color: `${textCol}55` }}>Café, almoço, jantar + bebidas</p>
            </div>
            <div className="p-4 rounded-xl border" style={{ borderColor: `${form.accent_color}15` }}>
              <MapPin className="w-4 h-4 mb-2" style={{ color: form.accent_color }} />
              <p className="text-[9px] uppercase" style={{ color: `${textCol}44` }}>Localização</p>
              <p className="text-sm font-bold mt-1" style={{ fontFamily: hFont, color: textCol }}>Dentro do Serengeti</p>
              <p className="text-[10px] mt-0.5" style={{ color: `${textCol}55` }}>Transfer 4×4 do aeroporto incluso</p>
            </div>
          </div>

          {/* Amenities */}
          <div className="mt-4 p-4 rounded-xl border" style={{ borderColor: `${form.accent_color}15` }}>
            <p className="text-xs font-bold mb-3" style={{ fontFamily: hFont, color: textCol }}>Comodidades incluídas</p>
            <div className="flex flex-wrap gap-2">
              {["Piscina infinita", "Spa com massagem", "Game drives 2×/dia", "Guia privativo", "Binóculos Swarovski", "Wi-Fi satélite", "Lavanderia", "Minibar premium", "Deck privativo", "Cofre digital"].map(a => (
                <span key={a} className="text-[10px] px-2.5 py-1 rounded-full flex items-center gap-1" style={{ backgroundColor: `${form.accent_color}08`, color: `${textCol}88` }}>
                  <Check className="w-3 h-3" style={{ color: form.accent_color }} /> {a}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* EXPERIENCES */}
      <section className="px-8 py-14" style={{ backgroundColor: `${form.primary_color}06` }}>
        <h2 className="text-center text-3xl font-bold mb-2 tracking-tight" style={{ fontFamily: hFont, color: textCol }}>Experiências</h2>
        <p className="text-center text-xs mb-8" style={{ color: `${textCol}55`, fontFamily: bFont }}>8 atividades selecionadas para vocês</p>
        <div className="max-w-3xl mx-auto space-y-4">
          {[
            { num: "01", title: "Safari ao Amanhecer", desc: "Encontro com os Big Five no Serengeti ao nascer do sol, com guia privativo e veículo 4×4 exclusivo. Inclui café da manhã no bush.", img: safariImg, dur: "5h", when: "05:30", included: true },
            { num: "02", title: "Jantar Boma sob as Estrelas", desc: "Experiência gastronômica africana ao ar livre, com fogueira cerimonial e música ao vivo dos Maasai.", img: "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800&h=500&fit=crop&q=80", dur: "3h", when: "19:00", included: true },
            { num: "03", title: "Mergulho em Mnemba Atoll", desc: "Exploração dos recifes de coral com equipamento profissional e instrutor PADI certificado. Golfinhos frequentes.", img: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&h=500&fit=crop&q=80", dur: "4h", when: "08:00", included: false },
            { num: "04", title: "Visita a Stone Town", desc: "Tour guiado pela cidade histórica de Zanzibar, Patrimônio UNESCO. Mercado de especiarias e café local.", img: "https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?w=800&h=500&fit=crop&q=80", dur: "6h", when: "09:00", included: true },
          ].map((exp) => (
            <div key={exp.num} className="flex gap-5 items-start">
              <span className="text-5xl font-bold shrink-0 leading-none" style={{ fontFamily: hFont, color: `${form.accent_color}25` }}>{exp.num}</span>
              <div className="flex-1 flex gap-4 border overflow-hidden" style={{ borderRadius: radius, boxShadow: shadow, borderColor: `${form.accent_color}15`, backgroundColor: bgCol }}>
                <img src={exp.img} alt={exp.title} className="w-36 h-36 object-cover shrink-0" />
                <div className="p-4 flex flex-col justify-center flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-bold text-base" style={{ fontFamily: hFont, color: textCol }}>{exp.title}</h4>
                    {exp.included ? (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5" style={{ backgroundColor: "#dcfce7", color: "#16a34a" }}><Check className="w-3 h-3" /> Incluído</span>
                    ) : (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "#fef3c7", color: "#92400e" }}>Opcional</span>
                    )}
                  </div>
                  <p className="text-[11px] leading-relaxed" style={{ color: `${textCol}66`, fontFamily: bFont }}>{exp.desc}</p>
                  <div className="flex items-center gap-3 mt-2 text-[10px]" style={{ color: `${textCol}44` }}>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {exp.dur}</span>
                    <span className="flex items-center gap-1"><Sunrise className="w-3 h-3" /> {exp.when}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* IMPORTANT INFO */}
      <section className="px-8 py-14">
        <h2 className="text-center text-3xl font-bold mb-8 tracking-tight" style={{ fontFamily: hFont, color: textCol }}>Informações Importantes</h2>
        <div className="max-w-3xl mx-auto grid grid-cols-2 gap-4">
          {[
            { icon: Shield, title: "Seguro Viagem", desc: "Cobertura internacional de USD 100.000 incluída. Assistência médica 24h.", included: true },
            { icon: AlertTriangle, title: "Vacinas Obrigatórias", desc: "Febre Amarela (certificado CIVP necessário). Tomar 10 dias antes da viagem.", included: false },
            { icon: Calendar, title: "Cancelamento", desc: "Gratuito até 60 dias antes. 50% de multa entre 60-30 dias. Integral após 30 dias.", included: false },
            { icon: CreditCard, title: "Formas de Pagamento", desc: "PIX, transferência bancária ou cartão em até 10× sem juros.", included: false },
          ].map((info) => (
            <div key={info.title} className="p-4 rounded-xl border flex gap-3" style={{ borderColor: `${form.accent_color}15` }}>
              <info.icon className="w-5 h-5 shrink-0 mt-0.5" style={{ color: form.accent_color }} />
              <div>
                <p className="text-sm font-bold" style={{ fontFamily: hFont, color: textCol }}>{info.title}</p>
                <p className="text-[10px] mt-0.5 leading-relaxed" style={{ color: `${textCol}55` }}>{info.desc}</p>
                {info.included && <span className="text-[9px] mt-1 inline-flex items-center gap-0.5" style={{ color: "#16a34a" }}><Check className="w-3 h-3" /> Incluído no pacote</span>}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section className="px-8 py-16" style={{ backgroundColor: `${form.primary_color}06` }}>
        <div className="max-w-lg mx-auto text-center">
          <div className="w-12 h-px mx-auto mb-6" style={{ backgroundColor: form.accent_color }} />
          <h2 className="text-3xl font-bold mb-6 tracking-tight" style={{ fontFamily: hFont, color: textCol }}>Investimento</h2>

          {/* Breakdown */}
          <div className="text-left mb-6 space-y-2">
            {[
              { item: "Aéreo Executivo (2 pax)", value: "R$ 32.400,00" },
              { item: "Singita Grumeti · 7 noites", value: "R$ 28.600,00" },
              { item: "Zanzibar Resort · 5 noites", value: "R$ 9.800,00" },
              { item: "Experiências incluídas (6)", value: "R$ 5.200,00" },
              { item: "Transfers e logística", value: "R$ 2.900,00" },
            ].map((line) => (
              <div key={line.item} className="flex items-center justify-between py-1.5 border-b" style={{ borderColor: `${textCol}08` }}>
                <span className="text-xs" style={{ color: `${textCol}66`, fontFamily: bFont }}>{line.item}</span>
                <span className="text-xs font-semibold font-mono" style={{ color: textCol }}>{line.value}</span>
              </div>
            ))}
          </div>

          <p className="text-[9px] uppercase tracking-[0.3em] mb-2" style={{ color: `${textCol}44`, fontFamily: bFont }}>Investimento por pessoa</p>
          <p className="text-2xl font-bold" style={{ fontFamily: hFont, color: textCol }}>R$ 39.450,00</p>
          <div className="my-5 h-px" style={{ backgroundColor: `${form.accent_color}15` }} />
          <p className="text-[9px] uppercase tracking-[0.3em] mb-2" style={{ color: `${textCol}44`, fontFamily: bFont }}>Valor total · 2 passageiros</p>
          <p className="text-4xl font-bold" style={{ fontFamily: hFont, color: form.accent_color }}>R$ 78.900,00</p>
          <p className="text-[10px] mt-2" style={{ color: `${textCol}44` }}>Em até 10× de R$ 7.890,00 no cartão</p>
          <p className="text-[10px] mt-1" style={{ color: `${textCol}44` }}>ou 5% de desconto à vista via PIX</p>
          <button className="mt-8 px-10 py-3.5 text-white font-semibold text-sm tracking-wide" style={{ backgroundColor: form.accent_color, borderRadius: radius, fontFamily: hFont }}>
            {tc.ctaText || "Reservar Aventura"}
          </button>
          <p className="text-[9px] mt-3" style={{ color: `${textCol}33` }}>Proposta válida por 7 dias · Sujeita a disponibilidade</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-8 px-6 text-center" style={{ borderTop: `1px solid ${textCol}08` }}>
        <img src={logoNatleva} alt="NatLeva" className="h-7 mx-auto mb-2 opacity-40" />
        <p className="text-[10px] tracking-wider" style={{ color: `${textCol}30`, fontFamily: bFont }}>Proposta exclusiva · NatLeva Viagens · CNPJ 00.000.000/0001-00</p>
        <p className="text-[9px] mt-1" style={{ color: `${textCol}20` }}>Este documento é confidencial e destinado exclusivamente ao destinatário.</p>
      </footer>
    </div>
  );
}
