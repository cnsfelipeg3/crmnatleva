import { useState } from "react";
import { Plane, Clock, MapPin, Star, Luggage, ChevronDown, ChevronRight, Calendar, Utensils, Shield, Info, Camera, Wifi, Coffee, Sun, Moon, Sunrise, Check, AlertTriangle, Users, CreditCard, ArrowRight, Compass, Mountain, TreePine, Binoculars } from "lucide-react";
import AirlineLogo from "@/components/AirlineLogo";
import logoNatleva from "@/assets/logo-natleva-clean.png";
import { type StylePreviewProps, clickableClass, editOverlay, getRadius, getShadow, isMob, isMobOrTab } from "../TemplatePreview";

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

function SavannahDivider({ color, bgColor }: { color: string; bgColor: string }) {
  return (
    <svg viewBox="0 0 1440 120" preserveAspectRatio="none" className="w-full" style={{ height: "60px", display: "block" }}>
      <path d="M0,120 L0,60 Q120,20 240,50 Q400,90 560,40 Q720,0 880,30 Q1040,60 1200,20 Q1320,0 1440,40 L1440,120 Z" fill={bgColor} />
      <g opacity="0.08" fill={color}>
        <path d="M200,70 L210,30 L220,70 Z" /><rect x="208" y="70" width="4" height="12" />
        <circle cx="800" cy="50" r="12" /><rect x="798" y="62" width="4" height="18" />
      </g>
    </svg>
  );
}

function DiamondDivider({ color }: { color: string }) {
  return (
    <div className="flex items-center gap-4 justify-center py-4">
      <div className="h-px flex-1 max-w-[80px]" style={{ background: `linear-gradient(to right, transparent, ${color}30)` }} />
      <div className="w-2.5 h-2.5 rotate-45 border" style={{ borderColor: `${color}40` }} />
      <div className="w-2 h-2 rotate-45" style={{ backgroundColor: `${color}40` }} />
      <div className="w-2.5 h-2.5 rotate-45 border" style={{ borderColor: `${color}40` }} />
      <div className="h-px flex-1 max-w-[80px]" style={{ background: `linear-gradient(to left, transparent, ${color}30)` }} />
    </div>
  );
}

export function EditorialStyle({ form, activePanel, onClickSection, device }: StylePreviewProps) {
  const [galleryIdx, setGalleryIdx] = useState(0);
  const [expandedFlight, setExpandedFlight] = useState<number | null>(0);
  const [activeTimeline, setActiveTimeline] = useState<number | null>(null);
  const tc = form.theme_config;
  const textCol = form.text_color || "#1a1a1a";
  const bgCol = form.bg_color || "#faf8f5";
  const radius = getRadius(tc.borderRadius);
  const shadow = getShadow(tc.shadowIntensity);
  const hFont = `'${form.font_heading}', serif`;
  const bFont = `'${form.font_body}', sans-serif`;
  const mob = isMob(device);
  const mobTab = isMobOrTab(device);

  return (
    <div style={{ backgroundColor: bgCol }}>
      {/* ══ HERO ══ */}
      <div className={clickableClass("layout", activePanel)} onClick={() => onClickSection("layout")}>
        {editOverlay("Editar layout")}
        <section className="relative overflow-hidden" style={{ height: mob ? "320px" : mobTab ? "400px" : "520px" }}>
          <div className="absolute inset-0 bg-cover bg-center scale-105" style={{ backgroundImage: `url(${heroImg})` }} />
          <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, transparent 10%, ${form.primary_color}40 40%, ${form.primary_color}dd 70%, ${form.primary_color} 100%)` }} />
          {!mob && (
            <div className="absolute top-6 left-8 z-10">
              <img src={logoNatleva} alt="NatLeva" className="h-8 drop-shadow-lg opacity-80" />
            </div>
          )}
          <div className="absolute bottom-0 left-0 right-0 z-10" style={{ padding: mob ? "16px" : "40px" }}>
            <p className="text-[10px] tracking-[0.3em] uppercase text-white/50 mb-2" style={{ fontFamily: bFont }}>Proposta exclusiva</p>
            {!mob && <p className="text-sm text-white/70 mb-1 tracking-widest uppercase" style={{ fontFamily: bFont }}>Alexandre & Beatriz Montenegro</p>}
            <h1 className="font-bold text-white leading-[1.1] mb-3" style={{ fontFamily: hFont, letterSpacing: "-0.03em", fontSize: mob ? "2rem" : mobTab ? "2.5rem" : "3rem" }}>Safari de Luxo</h1>
            <div className="flex items-center gap-2 text-white/50 text-xs flex-wrap" style={{ fontFamily: bFont }}>
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> Tanzânia & Zanzibar</span>
              <span className="w-1 h-1 rounded-full bg-white/30" />
              <span>14 noites</span>
              {!mob && (
                <>
                  <span className="w-1 h-1 rounded-full bg-white/30" />
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> 10 — 24 ago 2026</span>
                  <span className="w-1 h-1 rounded-full bg-white/30" />
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" /> 2 passageiros</span>
                </>
              )}
            </div>
          </div>
          <svg className="absolute bottom-0 left-0 right-0 w-full" viewBox="0 0 1440 60" preserveAspectRatio="none" style={{ height: "30px" }}>
            <path d="M0,60 L0,30 Q200,0 400,20 Q600,40 800,15 Q1000,0 1200,25 Q1350,35 1440,20 L1440,60 Z" fill={bgCol} />
          </svg>
        </section>
      </div>

      {/* ══ OVERVIEW ══ */}
      <section className="px-4 py-4">
        <div className={mob ? "grid grid-cols-3 gap-2" : "flex items-center justify-between"} style={{ backgroundColor: `${form.accent_color}05`, borderRadius: radius, padding: "12px" }}>
          {[
            { label: "Duração", value: "14 noites", icon: Clock },
            { label: "Destinos", value: "3 cidades", icon: MapPin },
            { label: "Voos", value: "4 trechos", icon: Plane },
            ...(mob ? [] : [
              { label: "Hospedagens", value: "2 lodges", icon: Coffee },
              { label: "Experiências", value: "8 atividades", icon: Compass },
              { label: "Classe", value: "Executiva", icon: Star },
            ]),
          ].map((item) => (
            <div key={item.label} className="text-center flex flex-col items-center gap-1">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${form.accent_color}10` }}>
                <item.icon className="w-3.5 h-3.5" style={{ color: form.accent_color }} />
              </div>
              <div>
                <p className="text-[8px] uppercase tracking-wider" style={{ color: `${textCol}44`, fontFamily: bFont }}>{item.label}</p>
                <p className="text-xs font-bold" style={{ fontFamily: hFont, color: textCol }}>{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <DiamondDivider color={form.accent_color} />

      {/* ══ INTRO ══ */}
      <div className={clickableClass("fonts", activePanel)} onClick={() => onClickSection("fonts")}>
        {editOverlay("Editar tipografia")}
        <section className="max-w-xl mx-auto px-5 py-8 text-center">
          <p className="text-base italic leading-relaxed" style={{ fontFamily: hFont, color: `${textCol}aa` }}>
            "Uma jornada pelos cenários mais selvagens da África Oriental, onde a natureza se revela em sua forma mais pura."
          </p>
          <p className="text-xs mt-3" style={{ color: `${textCol}44`, fontFamily: bFont }}>— Equipe NatLeva Viagens</p>
        </section>
      </div>

      <SavannahDivider color={textCol} bgColor={`${form.primary_color}06`} />

      {/* ══ TIMELINE ══ */}
      <section className="px-4 py-10" style={{ backgroundColor: `${form.primary_color}06` }}>
        <div className="text-center mb-8">
          <p className="text-[10px] tracking-[0.3em] uppercase mb-2" style={{ color: form.accent_color, fontFamily: bFont }}>Roteiro completo</p>
          <h2 className="text-2xl font-bold tracking-tight" style={{ fontFamily: hFont, color: textCol }}>Timeline da Viagem</h2>
        </div>
        <div className="max-w-3xl mx-auto relative">
          <div className="absolute left-[20px] top-2 bottom-2 w-px" style={{ background: `linear-gradient(to bottom, transparent, ${form.accent_color}30, transparent)` }} />
          {timeline.map((item, i) => {
            const Icon = item.icon;
            const typeColors: Record<string, string> = { flight: form.accent_color, experience: "#4ade80", hotel: "#60a5fa" };
            const col = typeColors[item.type] || form.accent_color;
            const isActive = activeTimeline === i;
            return (
              <div key={i} className="flex items-start gap-3 mb-2 cursor-pointer group" onClick={() => setActiveTimeline(isActive ? null : i)}>
                <div className="w-[40px] shrink-0 flex justify-center pt-1">
                  <div className="w-[12px] h-[12px] rounded-full z-10 flex items-center justify-center transition-all" style={{ backgroundColor: col, transform: isActive ? "scale(1.3)" : "scale(1)" }}>
                    <div className="w-[5px] h-[5px] rounded-full bg-white" />
                  </div>
                </div>
                <div className="flex-1 pb-2 border-b transition-all" style={{ borderColor: `${textCol}08`, backgroundColor: isActive ? `${col}05` : "transparent", borderRadius: isActive ? radius : "0", padding: isActive ? "10px" : "0 0 8px 0" }}>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: `${col}15`, color: col }}>{item.day}</span>
                    <span className="text-[10px]" style={{ color: `${textCol}44` }}>{item.date}</span>
                    {!mob && <Icon className="w-3.5 h-3.5 ml-auto" style={{ color: `${col}66` }} />}
                  </div>
                  <p className="text-sm font-semibold" style={{ fontFamily: hFont, color: textCol }}>{item.title}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: `${textCol}55`, fontFamily: bFont }}>{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ══ DESTINATIONS ══ */}
      <div className={clickableClass("sections", activePanel)} onClick={() => onClickSection("sections")}>
        {editOverlay("Editar seções")}
        <section className="px-4 py-10">
          <div className="text-center mb-6">
            <p className="text-[10px] tracking-[0.3em] uppercase mb-2" style={{ color: form.accent_color, fontFamily: bFont }}>Explore cada destino</p>
            <h2 className="text-2xl font-bold tracking-tight" style={{ fontFamily: hFont, color: textCol }}>Seus Destinos</h2>
          </div>
          <div className="max-w-4xl mx-auto" style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "repeat(3, 1fr)", gap: mob ? "12px" : "16px" }}>
            {[
              { name: "Serengeti", sub: "5 noites · Big Five", img: destImgs[0], temp: "28°C" },
              { name: "Ngorongoro", sub: "2 noites · Cratera", img: destImgs[1], temp: "22°C" },
              { name: "Zanzibar", sub: "5 noites · Praias", img: destImgs[2], temp: "30°C" },
            ].map((dest) => (
              <div key={dest.name} className="relative overflow-hidden group cursor-pointer" style={{ borderRadius: radius, height: mob ? "180px" : "280px" }}>
                <img src={dest.img} alt={dest.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${form.primary_color}ee 0%, transparent 60%)` }} />
                <div className="absolute top-3 left-3 flex items-center gap-1 bg-white/90 rounded-full px-2 py-0.5">
                  <Sun className="w-3 h-3" style={{ color: form.accent_color }} />
                  <span className="text-[9px] font-bold" style={{ color: form.primary_color }}>{dest.temp}</span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="text-lg font-bold text-white" style={{ fontFamily: hFont }}>{dest.name}</h3>
                  <p className="text-[10px] text-white/50 mt-0.5">{dest.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <DiamondDivider color={form.accent_color} />

      {/* ══ FLIGHTS ══ */}
      <section className="px-4 py-10" style={{ backgroundColor: `${form.primary_color}08` }}>
        <div className="text-center mb-6">
          <p className="text-[10px] tracking-[0.3em] uppercase mb-2" style={{ color: form.accent_color, fontFamily: bFont }}>Itinerário aéreo</p>
          <h2 className="text-2xl font-bold tracking-tight" style={{ fontFamily: hFont, color: textCol }}>Voos</h2>
        </div>
        <div className="max-w-3xl mx-auto space-y-3">
          {[
            { airline: "ET", name: "Ethiopian Airlines", flight: "ET 507", from: "GRU", fromCity: "São Paulo", to: "ADD", toCity: "Addis Ababa", dep: "23:55", arr: "17:40", dur: "14h45", date: "10 ago", cls: "Executiva", bag: "2×32kg", bagHand: "1×10kg", loc: "XKWP3M", aircraft: "Boeing 787-9", meal: "Jantar + Café", seat: "Lie-flat 180°", wifi: true, next: true },
            { airline: "ET", name: "Ethiopian Airlines", flight: "ET 815", from: "ADD", fromCity: "Addis Ababa", to: "JRO", toCity: "Kilimanjaro", dep: "21:30", arr: "23:45", dur: "2h15", date: "11 ago", cls: "Executiva", bag: "2×32kg", bagHand: "1×10kg", loc: "XKWP3M", aircraft: "Boeing 737-800", meal: "Snack", seat: "Reclinável", wifi: false, conn: "3h50" },
          ].map((f, i) => (
            <div key={i} className="relative border-2 overflow-hidden" style={{ borderRadius: radius, borderColor: `${form.accent_color}30`, backgroundColor: bgCol, boxShadow: shadow }}>
              {f.conn && (
                <div className="px-3 py-1.5 flex items-center gap-2 text-[10px] border-b" style={{ backgroundColor: `${form.accent_color}08`, borderColor: `${form.accent_color}15`, color: `${textCol}66` }}>
                  <Clock className="w-3 h-3" style={{ color: form.accent_color }} />
                  <span>Conexão de {f.conn}</span>
                </div>
              )}
              <div className={mob ? "" : "flex"}>
                <div className="flex-1 p-4 cursor-pointer" onClick={() => setExpandedFlight(expandedFlight === i ? null : i)}>
                  <div className="flex items-center gap-2 mb-3">
                    <AirlineLogo iata={f.airline} size={mob ? 28 : 40} />
                    <div>
                      <p className="font-bold text-sm" style={{ fontFamily: hFont, color: textCol }}>{mob ? f.flight : f.name}</p>
                      <p className="text-[10px] font-mono" style={{ color: `${textCol}66` }}>{f.flight} · {f.aircraft}</p>
                    </div>
                    <span className="ml-auto text-[9px] px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: `${form.accent_color}15`, color: form.accent_color }}>{f.cls}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-bold font-mono" style={{ color: textCol, letterSpacing: "-0.05em", fontSize: mob ? "1.25rem" : "1.875rem" }}>{f.dep}</p>
                      <p className="font-bold font-mono" style={{ color: form.accent_color, fontSize: mob ? "0.875rem" : "1.25rem" }}>{f.from}</p>
                      {!mob && <p className="text-[10px]" style={{ color: `${textCol}55` }}>{f.fromCity}</p>}
                    </div>
                    <div className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full flex items-center">
                        <div className="w-2.5 h-2.5 rounded-full border-2" style={{ borderColor: form.accent_color }} />
                        <div className="flex-1 h-px mx-1 relative" style={{ backgroundColor: `${form.accent_color}40` }}>
                          <Plane className="w-3.5 h-3.5 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-90" style={{ color: form.accent_color }} />
                        </div>
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: form.accent_color }} />
                      </div>
                      <span className="text-[10px] flex items-center gap-1" style={{ color: `${textCol}55` }}><Clock className="w-3 h-3" /> {f.dur}</span>
                    </div>
                    <div className="text-right">
                      <div className="flex items-baseline justify-end gap-1">
                        <p className="font-bold font-mono" style={{ color: textCol, letterSpacing: "-0.05em", fontSize: mob ? "1.25rem" : "1.875rem" }}>{f.arr}</p>
                        {f.next && <span className="text-xs font-bold" style={{ color: form.accent_color }}>+1</span>}
                      </div>
                      <p className="font-bold font-mono" style={{ color: form.accent_color, fontSize: mob ? "0.875rem" : "1.25rem" }}>{f.to}</p>
                      {!mob && <p className="text-[10px]" style={{ color: `${textCol}55` }}>{f.toCity}</p>}
                    </div>
                  </div>
                  {expandedFlight === i && (
                    <div className="mt-3 pt-3 border-t" style={{ borderColor: `${form.accent_color}15`, display: "grid", gridTemplateColumns: mob ? "1fr 1fr" : "repeat(4, 1fr)", gap: "8px" }}>
                      {[
                        { icon: Luggage, label: "Bagagem", val: f.bag },
                        { icon: Luggage, label: "Mão", val: f.bagHand },
                        { icon: Utensils, label: "Refeição", val: f.meal },
                        { icon: Wifi, label: "Wi-Fi", val: f.wifi ? "Disponível" : "Indisponível" },
                      ].map(d => (
                        <div key={d.label} className="flex items-center gap-1.5">
                          <d.icon className="w-3 h-3" style={{ color: form.accent_color }} />
                          <div>
                            <p className="text-[8px] uppercase" style={{ color: `${textCol}44` }}>{d.label}</p>
                            <p className="text-[10px] font-semibold" style={{ color: textCol }}>{d.val}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {!mob && (
                  <div className="w-[100px] flex flex-col items-center justify-center p-3 border-l" style={{ backgroundColor: `${form.accent_color}08`, borderColor: `${form.accent_color}15` }}>
                    <p className="text-[8px] tracking-wider uppercase mb-1" style={{ color: `${textCol}44` }}>Localizador</p>
                    <p className="text-xs font-bold font-mono tracking-widest" style={{ color: form.accent_color }}>{f.loc}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <SavannahDivider color={textCol} bgColor={bgCol} />

      {/* ══ HOTEL ══ */}
      <section className="px-4 py-10">
        <div className="text-center mb-6">
          <p className="text-[10px] tracking-[0.3em] uppercase mb-2" style={{ color: form.accent_color, fontFamily: bFont }}>Onde você vai ficar</p>
          <h2 className="text-2xl font-bold tracking-tight" style={{ fontFamily: hFont, color: textCol }}>Hospedagem</h2>
        </div>
        <div className="max-w-4xl mx-auto">
          <div className="relative overflow-hidden" style={{ borderRadius: radius, height: mob ? "200px" : "340px" }}>
            <img src={hotelGallery[galleryIdx]} alt="Hotel" className="w-full h-full object-cover transition-all duration-500" />
            <div className="absolute inset-0" style={{ background: mob ? `linear-gradient(to top, ${form.primary_color}cc, transparent 60%)` : `linear-gradient(to right, ${form.primary_color}cc 0%, transparent 50%)` }} />
            <div className={mob ? "absolute bottom-3 left-3 right-3" : "absolute inset-y-0 left-0 flex flex-col justify-center p-8 max-w-[50%]"}>
              <h3 className="font-bold text-white mb-1" style={{ fontFamily: hFont, fontSize: mob ? "1rem" : "1.5rem" }}>Singita Grumeti</h3>
              <div className="flex gap-0.5 mb-2">{[1,2,3,4,5].map(j => <Star key={j} className="w-3 h-3 text-amber-400 fill-amber-400" />)}</div>
              {!mob && <p className="text-xs text-white/60 leading-relaxed mb-3" style={{ fontFamily: bFont }}>Suítes privativas com vista para a savana.</p>}
              <div className="flex flex-wrap gap-1">
                {["Suite Savana", "7 noites", ...(mob ? [] : ["Piscina privativa", "All inclusive"])].map(tag => (
                  <span key={tag} className="text-[9px] px-2 py-0.5 rounded-full border border-white/20 text-white/70">{tag}</span>
                ))}
              </div>
            </div>
            <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded-full flex items-center gap-1">
              <Camera className="w-3 h-3" /> {galleryIdx + 1}/{hotelGallery.length}
            </div>
          </div>
          <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1">
            {hotelGallery.map((img, j) => (
              <div key={j} className="shrink-0 rounded-lg overflow-hidden cursor-pointer border-2 transition-all" style={{ width: mob ? "48px" : "64px", height: mob ? "36px" : "48px", borderColor: galleryIdx === j ? form.accent_color : "transparent", opacity: galleryIdx === j ? 1 : 0.6 }} onClick={() => setGalleryIdx(j)}>
                <img src={img} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
          <div className="mt-4" style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "repeat(3, 1fr)", gap: "12px" }}>
            {[
              { icon: Calendar, label: "Check-in / Check-out", value: "12 ago → 19 ago" },
              { icon: Coffee, label: "Regime", value: "All Inclusive Premium" },
              { icon: MapPin, label: "Localização", value: "Serengeti" },
            ].map(d => (
              <div key={d.label} className="p-3 rounded-xl border" style={{ borderColor: `${form.accent_color}15` }}>
                <d.icon className="w-3.5 h-3.5 mb-1" style={{ color: form.accent_color }} />
                <p className="text-[9px] uppercase" style={{ color: `${textCol}44` }}>{d.label}</p>
                <p className="text-xs font-bold mt-0.5" style={{ fontFamily: hFont, color: textCol }}>{d.value}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 p-3 rounded-xl border" style={{ borderColor: `${form.accent_color}15` }}>
            <p className="text-xs font-bold mb-2" style={{ fontFamily: hFont, color: textCol }}>Comodidades</p>
            <div className="flex flex-wrap gap-1.5">
              {["Piscina infinita", "Spa", "Game drives 2×/dia", "Guia privativo", ...(mob ? [] : ["Wi-Fi satélite", "Lavanderia", "Minibar premium"])].map(a => (
                <span key={a} className="text-[9px] px-2 py-0.5 rounded-full flex items-center gap-0.5" style={{ backgroundColor: `${form.accent_color}08`, color: `${textCol}88` }}>
                  <Check className="w-2.5 h-2.5" style={{ color: form.accent_color }} /> {a}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <DiamondDivider color={form.accent_color} />

      {/* ══ EXPERIENCES ══ */}
      <section className="px-4 py-10" style={{ backgroundColor: `${form.primary_color}06` }}>
        <div className="text-center mb-6">
          <p className="text-[10px] tracking-[0.3em] uppercase mb-2" style={{ color: form.accent_color, fontFamily: bFont }}>Momentos inesquecíveis</p>
          <h2 className="text-2xl font-bold tracking-tight" style={{ fontFamily: hFont, color: textCol }}>Experiências</h2>
        </div>
        <div className="max-w-3xl mx-auto space-y-3">
          {[
            { num: "01", title: "Safari ao Amanhecer", desc: "Big Five no Serengeti ao nascer do sol.", img: safariImg, dur: "5h", included: true },
            { num: "02", title: "Jantar Boma", desc: "Gastronomia africana com fogueira.", img: "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800&h=500&fit=crop&q=80", dur: "3h", included: true },
            { num: "03", title: "Mergulho Mnemba", desc: "Recifes de coral com instrutor PADI.", img: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&h=500&fit=crop&q=80", dur: "4h", included: false },
          ].map((exp) => (
            <div key={exp.num} className="flex gap-3 items-start group cursor-pointer">
              <span className="text-3xl font-bold shrink-0 leading-none" style={{ fontFamily: hFont, color: `${form.accent_color}25` }}>{exp.num}</span>
              <div className="flex-1 border overflow-hidden transition-all group-hover:shadow-lg" style={{ borderRadius: radius, borderColor: `${form.accent_color}15`, backgroundColor: bgCol, display: mob ? "block" : "flex" }}>
                <div className="overflow-hidden shrink-0 relative" style={{ width: mob ? "100%" : "120px", height: mob ? "120px" : "120px" }}>
                  <img src={exp.img} alt={exp.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                </div>
                <div className="p-3 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-bold text-sm" style={{ fontFamily: hFont, color: textCol }}>{exp.title}</h4>
                    {exp.included ? (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5" style={{ backgroundColor: "#dcfce7", color: "#16a34a" }}><Check className="w-2.5 h-2.5" /> Incluído</span>
                    ) : (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "#fef3c7", color: "#92400e" }}>Opcional</span>
                    )}
                  </div>
                  <p className="text-[10px] leading-relaxed" style={{ color: `${textCol}66`, fontFamily: bFont }}>{exp.desc}</p>
                  <span className="text-[10px] flex items-center gap-1 mt-1" style={{ color: `${textCol}44` }}><Clock className="w-3 h-3" /> {exp.dur}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══ INFO ══ */}
      <section className="px-4 py-10">
        <h2 className="text-center text-2xl font-bold mb-6" style={{ fontFamily: hFont, color: textCol }}>Informações</h2>
        <div className="max-w-3xl mx-auto" style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr", gap: "12px" }}>
          {[
            { icon: Shield, title: "Seguro Viagem", desc: "USD 100.000 incluída." },
            { icon: AlertTriangle, title: "Vacinas", desc: "Febre Amarela obrigatória." },
            { icon: Calendar, title: "Cancelamento", desc: "Gratuito até 60 dias." },
            { icon: CreditCard, title: "Pagamento", desc: "PIX ou 10× sem juros." },
          ].map((info) => (
            <div key={info.title} className="p-3 rounded-xl border flex gap-2" style={{ borderColor: `${form.accent_color}15` }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${form.accent_color}10` }}>
                <info.icon className="w-4 h-4" style={{ color: form.accent_color }} />
              </div>
              <div>
                <p className="text-sm font-bold" style={{ fontFamily: hFont, color: textCol }}>{info.title}</p>
                <p className="text-[10px]" style={{ color: `${textCol}55` }}>{info.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <DiamondDivider color={form.accent_color} />

      {/* ══ PRICING ══ */}
      <section className="px-4 py-12" style={{ background: `linear-gradient(135deg, ${form.primary_color}08, ${form.accent_color}06)` }}>
        <div className="max-w-sm mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4" style={{ fontFamily: hFont, color: textCol }}>Investimento</h2>
          <div className="text-left mb-4 space-y-1.5">
            {[
              { item: "Aéreo Executivo (2 pax)", value: "R$ 32.400" },
              { item: "Singita · 7 noites", value: "R$ 28.600" },
              { item: "Zanzibar Resort · 5N", value: "R$ 9.800" },
              { item: "Experiências (6)", value: "R$ 5.200" },
              { item: "Transfers", value: "R$ 2.900" },
            ].map((line) => (
              <div key={line.item} className="flex justify-between py-1 border-b" style={{ borderColor: `${textCol}08` }}>
                <span className="text-[10px]" style={{ color: `${textCol}66` }}>{line.item}</span>
                <span className="text-[10px] font-semibold font-mono" style={{ color: textCol }}>{line.value}</span>
              </div>
            ))}
          </div>
          <p className="font-bold" style={{ fontFamily: hFont, color: form.accent_color, fontSize: mob ? "1.75rem" : "2.25rem" }}>R$ 78.900,00</p>
          <p className="text-[10px] mt-1" style={{ color: `${textCol}44` }}>10× de R$ 7.890 ou PIX -5%</p>
          <button className="mt-6 px-10 py-3 font-bold text-sm text-white transition-all hover:scale-105" style={{ backgroundColor: form.accent_color, borderRadius: "2rem", fontFamily: hFont, boxShadow: `0 8px 30px ${form.accent_color}40` }}>
            {tc.ctaText || "Quero reservar"}
          </button>
        </div>
      </section>

      {/* ══ FOOTER ══ */}
      <footer className="py-8 px-4 text-center" style={{ borderTop: `1px solid ${form.accent_color}12` }}>
        <img src={logoNatleva} alt="NatLeva" className="h-6 mx-auto mb-2 opacity-30" />
        <p className="text-[10px] tracking-wider" style={{ color: `${textCol}25`, fontFamily: bFont }}>Proposta exclusiva · NatLeva Viagens</p>
      </footer>
    </div>
  );
}
