import { useState } from "react";
import { Plane, Clock, MapPin, Star, Luggage, ChevronDown, ChevronRight, Calendar, Utensils, Shield, Info, Camera, Wifi, Coffee, Sun, Moon, Sunrise, Check, AlertTriangle, Users, CreditCard, ArrowRight, Compass, Mountain, TreePine, Binoculars } from "lucide-react";
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

/* SVG section dividers */
function SavannahDivider({ color, bgColor }: { color: string; bgColor: string }) {
  return (
    <svg viewBox="0 0 1440 120" preserveAspectRatio="none" className="w-full" style={{ height: "80px", display: "block" }}>
      <path d="M0,120 L0,60 Q120,20 240,50 Q400,90 560,40 Q720,0 880,30 Q1040,60 1200,20 Q1320,0 1440,40 L1440,120 Z" fill={bgColor} />
      {/* Trees silhouettes */}
      <g opacity="0.08" fill={color}>
        <path d="M200,70 L210,30 L220,70 Z" /><rect x="208" y="70" width="4" height="12" />
        <path d="M600,55 L615,15 L630,55 Z" /><rect x="613" y="55" width="4" height="15" />
        <circle cx="800" cy="50" r="12" /><rect x="798" y="62" width="4" height="18" />
        <path d="M1100,60 L1115,20 L1130,60 Z" /><rect x="1113" y="60" width="4" height="12" />
      </g>
    </svg>
  );
}

function DiamondDivider({ color }: { color: string }) {
  return (
    <div className="flex items-center gap-4 justify-center py-6">
      <div className="h-px flex-1 max-w-[120px]" style={{ background: `linear-gradient(to right, transparent, ${color}30)` }} />
      <div className="w-3 h-3 rotate-45 border" style={{ borderColor: `${color}40` }} />
      <div className="w-2 h-2 rotate-45" style={{ backgroundColor: `${color}40` }} />
      <div className="w-3 h-3 rotate-45 border" style={{ borderColor: `${color}40` }} />
      <div className="h-px flex-1 max-w-[120px]" style={{ background: `linear-gradient(to left, transparent, ${color}30)` }} />
    </div>
  );
}

export function EditorialStyle({ form, activePanel, onClickSection }: StylePreviewProps) {
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

  return (
    <div style={{ backgroundColor: bgCol }}>
      {/* ══ HERO — Cinematic full-bleed ══ */}
      <div className={clickableClass("layout", activePanel)} onClick={() => onClickSection("layout")}>
        {editOverlay("Editar layout")}
        <section className="relative h-[520px] overflow-hidden">
          <div className="absolute inset-0 bg-cover bg-center scale-105" style={{ backgroundImage: `url(${heroImg})`, animation: "pulse 20s ease-in-out infinite" }} />
          <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, transparent 10%, ${form.primary_color}40 40%, ${form.primary_color}dd 70%, ${form.primary_color} 100%)` }} />
          {/* Decorative grain overlay */}
          <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg viewBox=\"0 0 200 200\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cfilter id=\"noise\"%3E%3CfeTurbulence type=\"fractalNoise\" baseFrequency=\"0.9\" /%3E%3C/filter%3E%3Crect width=\"100%25\" height=\"100%25\" filter=\"url(%23noise)\" /%3E%3C/svg%3E')" }} />
          {/* Compass illustration */}
          <div className="absolute top-8 right-10 z-10 opacity-[0.07]">
            <svg viewBox="0 0 120 120" className="w-32 h-32" fill="none" stroke={form.accent_color} strokeWidth="0.5">
              <circle cx="60" cy="60" r="55" /><circle cx="60" cy="60" r="45" strokeDasharray="4 4" />
              <line x1="60" y1="5" x2="60" y2="115" /><line x1="5" y1="60" x2="115" y2="60" />
              <path d="M60 15 L65 55 L60 60 L55 55 Z" fill={form.accent_color} opacity="0.3" />
              <text x="60" y="12" textAnchor="middle" fill={form.accent_color} fontSize="6" fontWeight="bold">N</text>
              <text x="110" y="62" textAnchor="middle" fill={form.accent_color} fontSize="6">E</text>
              <text x="60" y="114" textAnchor="middle" fill={form.accent_color} fontSize="6">S</text>
              <text x="10" y="62" textAnchor="middle" fill={form.accent_color} fontSize="6">W</text>
            </svg>
          </div>
          <div className="absolute top-6 left-8 z-10">
            <img src={logoNatleva} alt="NatLeva" className="h-8 drop-shadow-lg opacity-80" />
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-10 z-10">
            <p className="text-[10px] tracking-[0.4em] uppercase text-white/50 mb-3" style={{ fontFamily: bFont }}>Proposta exclusiva para</p>
            <p className="text-sm text-white/70 mb-1 tracking-widest uppercase" style={{ fontFamily: bFont }}>Alexandre & Beatriz Montenegro</p>
            <h1 className="text-5xl font-bold text-white leading-[1.1] mb-4" style={{ fontFamily: hFont, letterSpacing: "-0.03em" }}>Safari de Luxo</h1>
            <div className="flex items-center gap-3 text-white/50 text-xs" style={{ fontFamily: bFont }}>
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> Tanzânia & Zanzibar</span>
              <span className="w-1 h-1 rounded-full bg-white/30" />
              <span>14 noites</span>
              <span className="w-1 h-1 rounded-full bg-white/30" />
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> 10 — 24 de agosto de 2026</span>
              <span className="w-1 h-1 rounded-full bg-white/30" />
              <span className="flex items-center gap-1"><Users className="w-3 h-3" /> 2 passageiros</span>
            </div>
          </div>
          {/* Bottom scenic transition */}
          <svg className="absolute bottom-0 left-0 right-0 w-full" viewBox="0 0 1440 60" preserveAspectRatio="none" style={{ height: "40px" }}>
            <path d="M0,60 L0,30 Q200,0 400,20 Q600,40 800,15 Q1000,0 1200,25 Q1350,35 1440,20 L1440,60 Z" fill={bgCol} />
          </svg>
        </section>
      </div>

      {/* ══ OVERVIEW BAR with icons ══ */}
      <section className="px-8 py-6 flex items-center justify-between" style={{ backgroundColor: `${form.accent_color}05` }}>
        {[
          { label: "Duração", value: "14 noites", icon: Clock },
          { label: "Destinos", value: "3 cidades", icon: MapPin },
          { label: "Voos", value: "4 trechos", icon: Plane },
          { label: "Hospedagens", value: "2 lodges", icon: Coffee },
          { label: "Experiências", value: "8 atividades", icon: Compass },
          { label: "Classe", value: "Executiva", icon: Star },
        ].map((item) => (
          <div key={item.label} className="text-center flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${form.accent_color}10` }}>
              <item.icon className="w-4 h-4" style={{ color: form.accent_color }} />
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-[0.15em]" style={{ color: `${textCol}44`, fontFamily: bFont }}>{item.label}</p>
              <p className="text-sm font-bold mt-0.5" style={{ fontFamily: hFont, color: textCol }}>{item.value}</p>
            </div>
          </div>
        ))}
      </section>

      <DiamondDivider color={form.accent_color} />

      {/* ══ INTRO — with illustration ══ */}
      <div className={clickableClass("fonts", activePanel)} onClick={() => onClickSection("fonts")}>
        {editOverlay("Editar tipografia")}
        <section className="max-w-2xl mx-auto px-8 py-10 text-center relative">
          {/* African pattern border */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 opacity-[0.06]">
            <svg viewBox="0 0 200 30" fill={form.accent_color}>
              {[0,20,40,60,80,100,120,140,160,180].map(x => (
                <g key={x}><rect x={x} y="0" width="10" height="10" /><rect x={x+10} y="10" width="10" height="10" /><rect x={x} y="20" width="10" height="10" /></g>
              ))}
            </svg>
          </div>
          <p className="text-xl italic leading-relaxed relative z-10" style={{ fontFamily: hFont, color: `${textCol}aa` }}>
            "Uma jornada pelos cenários mais selvagens e deslumbrantes da África Oriental, onde a natureza se revela em sua forma mais pura e majestosa."
          </p>
          <p className="text-xs mt-4" style={{ color: `${textCol}44`, fontFamily: bFont }}>— Equipe NatLeva Viagens</p>
        </section>
      </div>

      {/* ══ SAVANNAH DIVIDER ══ */}
      <SavannahDivider color={textCol} bgColor={`${form.primary_color}06`} />

      {/* ══ TRIP TIMELINE — Interactive ══ */}
      <section className="px-8 py-14" style={{ backgroundColor: `${form.primary_color}06` }}>
        <div className="text-center mb-10">
          <p className="text-[10px] tracking-[0.3em] uppercase mb-2" style={{ color: form.accent_color, fontFamily: bFont }}>Roteiro completo</p>
          <h2 className="text-3xl font-bold tracking-tight" style={{ fontFamily: hFont, color: textCol }}>Timeline da Viagem</h2>
          <p className="text-xs mt-2" style={{ color: `${textCol}55`, fontFamily: bFont }}>Clique nos dias para mais detalhes</p>
        </div>
        <div className="max-w-3xl mx-auto relative">
          <div className="absolute left-[23px] top-2 bottom-2 w-px" style={{ background: `linear-gradient(to bottom, transparent, ${form.accent_color}30, transparent)` }} />
          {timeline.map((item, i) => {
            const Icon = item.icon;
            const typeColors: Record<string, string> = { flight: form.accent_color, experience: "#4ade80", hotel: "#60a5fa" };
            const col = typeColors[item.type] || form.accent_color;
            const isActive = activeTimeline === i;
            return (
              <div
                key={i}
                className="flex items-start gap-4 mb-3 last:mb-0 cursor-pointer group"
                onClick={() => setActiveTimeline(isActive ? null : i)}
              >
                <div className="w-[46px] shrink-0 flex flex-col items-center">
                  <div
                    className="w-[14px] h-[14px] rounded-full z-10 flex items-center justify-center transition-all"
                    style={{
                      backgroundColor: col,
                      boxShadow: isActive ? `0 0 12px ${col}60` : "none",
                      transform: isActive ? "scale(1.3)" : "scale(1)",
                    }}
                  >
                    <div className="w-[6px] h-[6px] rounded-full bg-white" />
                  </div>
                </div>
                <div
                  className="flex-1 pb-3 border-b transition-all"
                  style={{
                    borderColor: `${textCol}08`,
                    backgroundColor: isActive ? `${col}05` : "transparent",
                    borderRadius: isActive ? radius : "0",
                    padding: isActive ? "12px" : "0 0 12px 0",
                  }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded" style={{ backgroundColor: `${col}15`, color: col }}>{item.day}</span>
                    <span className="text-[10px]" style={{ color: `${textCol}44` }}>{item.date}</span>
                    <Icon className="w-3.5 h-3.5 ml-auto" style={{ color: `${col}66` }} />
                  </div>
                  <p className="text-sm font-semibold" style={{ fontFamily: hFont, color: textCol }}>{item.title}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: `${textCol}55`, fontFamily: bFont }}>{item.desc}</p>
                  {isActive && (
                    <div className="mt-3 p-3 rounded-lg border" style={{ borderColor: `${col}15`, backgroundColor: `${col}05` }}>
                      <p className="text-[10px] leading-relaxed" style={{ color: `${textCol}66` }}>
                        {item.type === "flight" ? "Inclui transfer aeroporto, lounge VIP e assistência em solo." :
                         item.type === "experience" ? "Guia especializado, equipamentos incluídos, refeição no local." :
                         "Regime all-inclusive premium com experiências exclusivas."}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ══ DESTINATIONS — Scenic cards ══ */}
      <div className={clickableClass("sections", activePanel)} onClick={() => onClickSection("sections")}>
        {editOverlay("Editar seções")}
        <section className="px-8 py-14">
          <div className="text-center mb-8">
            <p className="text-[10px] tracking-[0.3em] uppercase mb-2" style={{ color: form.accent_color, fontFamily: bFont }}>Explore cada destino</p>
            <h2 className="text-3xl font-bold tracking-tight" style={{ fontFamily: hFont, color: textCol }}>Seus Destinos</h2>
          </div>
          <div className="max-w-4xl mx-auto grid grid-cols-3 gap-4">
            {[
              { name: "Serengeti", sub: "5 noites · Big Five · Grande Migração", img: destImgs[0], temp: "28°C", best: "Ago-Out" },
              { name: "Ngorongoro", sub: "2 noites · Cratera · Flamingos", img: destImgs[1], temp: "22°C", best: "Jun-Out" },
              { name: "Zanzibar", sub: "5 noites · Praias · Stone Town", img: destImgs[2], temp: "30°C", best: "Jun-Mar" },
            ].map((dest, i) => (
              <div key={dest.name} className="relative overflow-hidden group cursor-pointer" style={{ borderRadius: radius, height: "280px" }}>
                <img src={dest.img} alt={dest.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${form.primary_color}ee 0%, ${form.primary_color}60 40%, transparent 70%)` }} />
                {/* Temperature badge */}
                <div className="absolute top-3 left-3 flex items-center gap-1 bg-white/90 rounded-full px-2.5 py-1">
                  <Sun className="w-3 h-3" style={{ color: form.accent_color }} />
                  <span className="text-[9px] font-bold" style={{ color: form.primary_color }}>{dest.temp}</span>
                </div>
                <div className="absolute top-3 right-3 bg-white/90 rounded-full px-2 py-0.5 text-[9px] font-bold" style={{ color: form.primary_color }}>
                  {["36%", "14%", "36%"][i]} da viagem
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <p className="text-[9px] tracking-[0.3em] uppercase text-white/40 mb-1" style={{ fontFamily: bFont }}>Destino {String(i + 1).padStart(2, "0")}</p>
                  <h3 className="text-xl font-bold text-white" style={{ fontFamily: hFont }}>{dest.name}</h3>
                  <p className="text-[10px] text-white/50 mt-1">{dest.sub}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/10 text-white/60">Melhor: {dest.best}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* Distribution bar */}
          <div className="max-w-4xl mx-auto mt-5">
            <div className="flex rounded-full overflow-hidden h-3" style={{ backgroundColor: `${textCol}08` }}>
              <div className="h-full relative flex items-center justify-center" style={{ width: "36%", backgroundColor: form.accent_color }}>
                <span className="text-[7px] font-bold text-white">SERENGETI</span>
              </div>
              <div className="h-full" style={{ width: "14%", backgroundColor: `${form.accent_color}88` }} />
              <div className="h-full relative flex items-center justify-center" style={{ width: "36%", backgroundColor: `${form.accent_color}55` }}>
                <span className="text-[7px] font-bold text-white/80">ZANZIBAR</span>
              </div>
              <div className="h-full" style={{ width: "14%", backgroundColor: `${form.accent_color}30` }} />
            </div>
          </div>
        </section>
      </div>

      <DiamondDivider color={form.accent_color} />

      {/* ══ FLIGHTS — Boarding Pass Style ══ */}
      <section className="px-8 py-14" style={{ backgroundColor: `${form.primary_color}08` }}>
        <div className="text-center mb-8">
          <p className="text-[10px] tracking-[0.3em] uppercase mb-2" style={{ color: form.accent_color, fontFamily: bFont }}>Itinerário aéreo</p>
          <h2 className="text-3xl font-bold tracking-tight" style={{ fontFamily: hFont, color: textCol }}>Voos</h2>
          <p className="text-xs mt-2" style={{ color: `${textCol}55`, fontFamily: bFont }}>4 trechos · Classe Executiva · Ethiopian Airlines</p>
        </div>
        <div className="max-w-3xl mx-auto space-y-4">
          {[
            { airline: "ET", name: "Ethiopian Airlines", flight: "ET 507", from: "GRU", fromCity: "São Paulo · Guarulhos", to: "ADD", toCity: "Addis Ababa · Bole", dep: "23:55", arr: "17:40", dur: "14h45", date: "10 ago 2026", cls: "Executiva", bag: "2×32kg", bagHand: "1×10kg", term: "Terminal 3", termArr: "Terminal 2", loc: "XKWP3M", aircraft: "Boeing 787-9 Dreamliner", meal: "Jantar + Café da manhã", seat: "Lie-flat 180°", wifi: true, next: true },
            { airline: "ET", name: "Ethiopian Airlines", flight: "ET 815", from: "ADD", fromCity: "Addis Ababa · Bole", to: "JRO", toCity: "Kilimanjaro", dep: "21:30", arr: "23:45", dur: "2h15", date: "11 ago 2026", cls: "Executiva", bag: "2×32kg", bagHand: "1×10kg", term: "Terminal 2", termArr: "—", loc: "XKWP3M", aircraft: "Boeing 737-800", meal: "Snack", seat: "Reclinável", wifi: false, conn: "3h50" },
          ].map((f, i) => (
            <div key={i} className="relative border-2 overflow-hidden" style={{ borderRadius: radius, borderColor: `${form.accent_color}30`, backgroundColor: bgCol, boxShadow: shadow }}>
              {f.conn && (
                <div className="px-5 py-2 flex items-center gap-2 text-[10px] border-b" style={{ backgroundColor: `${form.accent_color}08`, borderColor: `${form.accent_color}15`, color: `${textCol}66` }}>
                  <Clock className="w-3 h-3" style={{ color: form.accent_color }} />
                  <span>Conexão de {f.conn} em {f.fromCity.split("·")[0].trim()}</span>
                </div>
              )}
              <div className="absolute top-0 bottom-0 right-[110px]" style={{ borderRight: `2px dashed ${form.accent_color}20` }} />
              <div className="flex">
                <div className="flex-1 p-5 cursor-pointer" onClick={() => setExpandedFlight(expandedFlight === i ? null : i)}>
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
                  <div className="flex items-center gap-6">
                    <div>
                      <p className="text-3xl font-bold font-mono" style={{ color: textCol, letterSpacing: "-0.05em" }}>{f.dep}</p>
                      <p className="text-xl font-bold font-mono mt-1" style={{ color: form.accent_color }}>{f.from}</p>
                      <p className="text-[10px] mt-0.5" style={{ color: `${textCol}55` }}>{f.fromCity}</p>
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
                    </div>
                  </div>
                  {expandedFlight === i && (
                    <div className="mt-4 pt-4 border-t grid grid-cols-4 gap-3" style={{ borderColor: `${form.accent_color}15` }}>
                      {[
                        { icon: Luggage, label: "Despachada", val: f.bag },
                        { icon: Luggage, label: "Mão", val: f.bagHand },
                        { icon: Utensils, label: "Refeição", val: f.meal },
                        { icon: Wifi, label: "Wi-Fi", val: f.wifi ? "Disponível" : "Indisponível" },
                      ].map(d => (
                        <div key={d.label} className="flex items-center gap-2">
                          <d.icon className="w-3.5 h-3.5" style={{ color: form.accent_color }} />
                          <div>
                            <p className="text-[9px] uppercase" style={{ color: `${textCol}44` }}>{d.label}</p>
                            <p className="text-[11px] font-semibold" style={{ color: textCol }}>{d.val}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="w-[110px] flex flex-col items-center justify-center p-4" style={{ backgroundColor: `${form.accent_color}08` }}>
                  <p className="text-[8px] tracking-[0.2em] uppercase mb-2" style={{ color: `${textCol}44` }}>Localizador</p>
                  <p className="text-sm font-bold font-mono tracking-widest" style={{ color: form.accent_color }}>{f.loc}</p>
                  <div className="w-14 h-14 mt-3 rounded" style={{ background: `repeating-conic-gradient(${form.accent_color}30 0% 25%, transparent 0% 50%) 50%/8px 8px` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <SavannahDivider color={textCol} bgColor={bgCol} />

      {/* ══ HOTEL with Gallery ══ */}
      <section className="px-8 py-14">
        <div className="text-center mb-8">
          <p className="text-[10px] tracking-[0.3em] uppercase mb-2" style={{ color: form.accent_color, fontFamily: bFont }}>Onde você vai ficar</p>
          <h2 className="text-3xl font-bold tracking-tight" style={{ fontFamily: hFont, color: textCol }}>Hospedagem</h2>
        </div>
        <div className="max-w-4xl mx-auto">
          <div className="relative overflow-hidden" style={{ borderRadius: radius, height: "340px" }}>
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
            <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm text-white text-[10px] px-2.5 py-1 rounded-full flex items-center gap-1.5">
              <Camera className="w-3 h-3" /> {galleryIdx + 1}/{hotelGallery.length}
            </div>
          </div>
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
            {hotelGallery.map((img, j) => (
              <div key={j} className="w-16 h-12 rounded-lg overflow-hidden cursor-pointer shrink-0 border-2 transition-all" style={{ borderColor: galleryIdx === j ? form.accent_color : "transparent", opacity: galleryIdx === j ? 1 : 0.6 }} onClick={() => setGalleryIdx(j)}>
                <img src={img} alt={`Foto ${j+1}`} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-4 mt-6">
            {[
              { icon: Calendar, label: "Check-in / Check-out", value: "12 ago · 14h → 19 ago · 11h" },
              { icon: Coffee, label: "Regime", value: "All Inclusive Premium", sub: "Café, almoço, jantar + bebidas" },
              { icon: MapPin, label: "Localização", value: "Dentro do Serengeti", sub: "Transfer 4×4 incluso" },
            ].map(d => (
              <div key={d.label} className="p-4 rounded-xl border" style={{ borderColor: `${form.accent_color}15` }}>
                <d.icon className="w-4 h-4 mb-2" style={{ color: form.accent_color }} />
                <p className="text-[9px] uppercase" style={{ color: `${textCol}44` }}>{d.label}</p>
                <p className="text-sm font-bold mt-1" style={{ fontFamily: hFont, color: textCol }}>{d.value}</p>
                {d.sub && <p className="text-[10px] mt-0.5" style={{ color: `${textCol}55` }}>{d.sub}</p>}
              </div>
            ))}
          </div>
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

      <DiamondDivider color={form.accent_color} />

      {/* ══ EXPERIENCES — Visual cards ══ */}
      <section className="px-8 py-14" style={{ backgroundColor: `${form.primary_color}06` }}>
        <div className="text-center mb-8">
          <p className="text-[10px] tracking-[0.3em] uppercase mb-2" style={{ color: form.accent_color, fontFamily: bFont }}>Momentos inesquecíveis</p>
          <h2 className="text-3xl font-bold tracking-tight" style={{ fontFamily: hFont, color: textCol }}>Experiências</h2>
        </div>
        <div className="max-w-3xl mx-auto space-y-4">
          {[
            { num: "01", title: "Safari ao Amanhecer", desc: "Encontro com os Big Five no Serengeti ao nascer do sol.", img: safariImg, dur: "5h", when: "05:30", included: true },
            { num: "02", title: "Jantar Boma sob Estrelas", desc: "Experiência gastronômica africana com fogueira cerimonial.", img: "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800&h=500&fit=crop&q=80", dur: "3h", when: "19:00", included: true },
            { num: "03", title: "Mergulho em Mnemba Atoll", desc: "Recifes de coral com instrutor PADI. Golfinhos frequentes.", img: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&h=500&fit=crop&q=80", dur: "4h", when: "08:00", included: false },
          ].map((exp) => (
            <div key={exp.num} className="flex gap-5 items-start group cursor-pointer">
              <span className="text-5xl font-bold shrink-0 leading-none transition-colors group-hover:opacity-80" style={{ fontFamily: hFont, color: `${form.accent_color}25` }}>{exp.num}</span>
              <div className="flex-1 flex gap-4 border overflow-hidden transition-all group-hover:shadow-lg" style={{ borderRadius: radius, boxShadow: shadow, borderColor: `${form.accent_color}15`, backgroundColor: bgCol }}>
                <div className="w-36 h-36 overflow-hidden shrink-0 relative">
                  <img src={exp.img} alt={exp.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  <div className="absolute inset-0" style={{ background: `linear-gradient(to right, transparent, ${bgCol}20)` }} />
                </div>
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

      {/* ══ INFO ══ */}
      <section className="px-8 py-14">
        <h2 className="text-center text-3xl font-bold mb-8 tracking-tight" style={{ fontFamily: hFont, color: textCol }}>Informações Importantes</h2>
        <div className="max-w-3xl mx-auto grid grid-cols-2 gap-4">
          {[
            { icon: Shield, title: "Seguro Viagem", desc: "USD 100.000 incluída. Assistência 24h.", included: true },
            { icon: AlertTriangle, title: "Vacinas", desc: "Febre Amarela obrigatória (CIVP). Tomar 10 dias antes.", included: false },
            { icon: Calendar, title: "Cancelamento", desc: "Gratuito até 60 dias. 50% multa 60-30 dias.", included: false },
            { icon: CreditCard, title: "Pagamento", desc: "PIX, transferência ou 10× sem juros.", included: false },
          ].map((info) => (
            <div key={info.title} className="p-4 rounded-xl border flex gap-3 group hover:shadow-md transition-all" style={{ borderColor: `${form.accent_color}15` }}>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${form.accent_color}10` }}>
                <info.icon className="w-5 h-5" style={{ color: form.accent_color }} />
              </div>
              <div>
                <p className="text-sm font-bold" style={{ fontFamily: hFont, color: textCol }}>{info.title}</p>
                <p className="text-[10px] mt-0.5 leading-relaxed" style={{ color: `${textCol}55` }}>{info.desc}</p>
                {info.included && <span className="text-[9px] mt-1 inline-flex items-center gap-0.5" style={{ color: "#16a34a" }}><Check className="w-3 h-3" /> Incluído</span>}
              </div>
            </div>
          ))}
        </div>
      </section>

      <DiamondDivider color={form.accent_color} />

      {/* ══ PRICING ══ */}
      <section className="px-8 py-16" style={{ background: `linear-gradient(135deg, ${form.primary_color}08, ${form.accent_color}06)` }}>
        <div className="max-w-lg mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6 tracking-tight" style={{ fontFamily: hFont, color: textCol }}>Investimento</h2>
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
          <p className="text-[9px] uppercase tracking-[0.3em] mb-2" style={{ color: `${textCol}44`, fontFamily: bFont }}>Por pessoa</p>
          <p className="text-2xl font-bold" style={{ fontFamily: hFont, color: textCol }}>R$ 39.450,00</p>
          <div className="my-5 h-px" style={{ backgroundColor: `${form.accent_color}15` }} />
          <p className="text-4xl font-bold" style={{ fontFamily: hFont, color: form.accent_color }}>R$ 78.900,00</p>
          <p className="text-[10px] mt-2" style={{ color: `${textCol}44` }}>10× de R$ 7.890,00 ou PIX com 5% desconto</p>
          <button className="mt-8 px-12 py-4 font-bold text-sm tracking-wide text-white transition-all hover:scale-105" style={{ backgroundColor: form.accent_color, borderRadius: "2rem", fontFamily: hFont, boxShadow: `0 8px 30px ${form.accent_color}40` }}>
            {tc.ctaText || "Quero reservar"}
          </button>
          <p className="text-[9px] mt-3" style={{ color: `${textCol}33` }}>Válida por 7 dias · Sujeita a disponibilidade</p>
        </div>
      </section>

      {/* ══ FOOTER ══ */}
      <footer className="py-10 px-6 text-center" style={{ borderTop: `1px solid ${form.accent_color}12` }}>
        <img src={logoNatleva} alt="NatLeva" className="h-7 mx-auto mb-3 opacity-30" />
        <p className="text-[10px] tracking-wider" style={{ color: `${textCol}25`, fontFamily: bFont }}>Proposta exclusiva · NatLeva Viagens</p>
        <p className="text-[9px] mt-1" style={{ color: `${textCol}15` }}>Documento confidencial</p>
      </footer>
    </div>
  );
}
