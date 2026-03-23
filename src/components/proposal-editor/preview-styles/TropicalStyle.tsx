import { useState } from "react";
import { Plane, Clock, MapPin, Star, Sun, Waves, Shell, Fish, Camera, ChevronDown, Luggage, Utensils, Wifi, Shield, Calendar, CreditCard, Check, Users, Coffee, Sparkles, Heart, Palmtree } from "lucide-react";
import AirlineLogo from "@/components/AirlineLogo";
import logoNatleva from "@/assets/logo-natleva-clean.png";
import { type StylePreviewProps, clickableClass, editOverlay, getRadius, getShadow } from "../TemplatePreview";

const heroImg = "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=1920&h=1080&fit=crop&q=80";
const hotelGallery = [
  "https://images.unsplash.com/photo-1573843981267-be1999ff37cd?w=600&h=400&fit=crop&q=80",
  "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&h=400&fit=crop&q=80",
  "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=600&h=400&fit=crop&q=80",
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=400&fit=crop&q=80",
  "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600&h=400&fit=crop&q=80",
  "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=600&h=400&fit=crop&q=80",
];
const expImgs = [
  "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&h=400&fit=crop&q=80",
  "https://images.unsplash.com/photo-1540202404-a2f29016b523?w=600&h=400&fit=crop&q=80",
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&h=400&fit=crop&q=80",
];

const timeline = [
  { day: "Dia 1", date: "20 dez", title: "São Paulo → Doha", desc: "Voo Qatar Airways Business · Noturno", type: "flight" },
  { day: "Dia 2", date: "21 dez", title: "Doha → Malé", desc: "Conexão + speedboat ao resort", type: "flight" },
  { day: "Dia 3-4", date: "22-23 dez", title: "Relaxamento Total", desc: "Praia, piscina, spa, snorkeling na house reef", type: "relax" },
  { day: "Dia 5", date: "24 dez", title: "Véspera de Natal", desc: "Jantar especial na praia · Show de fogos", type: "special" },
  { day: "Dia 6", date: "25 dez", title: "Natal no Paraíso", desc: "Brunch festivo · Atividades kids · Snorkeling", type: "special" },
  { day: "Dia 7-8", date: "26-27 dez", title: "Aventura Aquática", desc: "Mergulho, jetski, paddleboard, pesca", type: "exp" },
  { day: "Dia 9", date: "28 dez", title: "Dolphin Cruise", desc: "Navegação ao sunset com golfinhos selvagens", type: "exp" },
  { day: "Dia 10", date: "29 dez", title: "Sandbank Privativo", desc: "Piquenique gourmet em banco de areia exclusivo", type: "exp" },
  { day: "Dia 11", date: "30 dez", title: "Spa Day", desc: "Tratamentos ayurvédicos · Yoga ao nascer do sol", type: "relax" },
  { day: "Dia 12", date: "31 dez", title: "Réveillon", desc: "Festa de Ano Novo à beira-mar · DJ · Champagne", type: "special" },
  { day: "Dia 13", date: "01 jan", title: "Último Dia", desc: "Dia livre · Fotos underwater · Packing", type: "relax" },
  { day: "Dia 14", date: "02 jan", title: "Retorno", desc: "MLE → DOH → GRU · Qatar Business", type: "flight" },
];

export function TropicalStyle({ form, activePanel, onClickSection }: StylePreviewProps) {
  const [galleryIdx, setGalleryIdx] = useState(0);
  const [expandedFlight, setExpandedFlight] = useState<number | null>(0);
  const tc = form.theme_config;
  const textCol = form.text_color || "#1a2a2e";
  const bgCol = form.bg_color || "#f8fffe";
  const accentCol = form.accent_color || "#00c9a7";
  const primaryCol = form.primary_color || "#003d4d";
  const radius = getRadius(tc.borderRadius);
  const shadow = getShadow(tc.shadowIntensity);
  const hFont = `'${form.font_heading}', serif`;
  const bFont = `'${form.font_body}', sans-serif`;

  return (
    <div style={{ backgroundColor: bgCol }}>
      {/* HERO — Wave bottom */}
      <div className={clickableClass("layout", activePanel)} onClick={() => onClickSection("layout")}>
        {editOverlay("Editar layout")}
        <section className="relative h-[480px] overflow-hidden">
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${heroImg})` }} />
          <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, transparent 50%, ${primaryCol}99 80%, ${primaryCol} 100%)` }} />
          <svg className="absolute bottom-0 left-0 right-0 w-full" viewBox="0 0 1440 80" fill="none" preserveAspectRatio="none" style={{ height: "60px" }}>
            <path d="M0,40 C360,80 720,0 1080,40 C1260,60 1380,50 1440,40 L1440,80 L0,80 Z" fill={bgCol} />
          </svg>
          <div className="absolute top-6 w-full text-center z-10">
            <img src={logoNatleva} alt="NatLeva" className="h-10 mx-auto drop-shadow-lg opacity-80" />
          </div>
          <div className="absolute bottom-16 left-0 right-0 text-center z-10">
            <p className="text-[10px] tracking-[0.4em] uppercase text-white/50 mb-3" style={{ fontFamily: bFont }}>Família Santos · 4 passageiros · 13 dias</p>
            <h1 className="text-5xl font-bold text-white leading-tight mb-2" style={{ fontFamily: hFont, letterSpacing: "-0.02em" }}>Maldivas</h1>
            <p className="text-lg italic text-white/70" style={{ fontFamily: hFont }}>Overwater Paradise</p>
            <div className="flex items-center justify-center gap-4 mt-4 text-white/40 text-xs" style={{ fontFamily: bFont }}>
              <span className="flex items-center gap-1"><Sun className="w-3.5 h-3.5" /> 30°C</span>
              <span className="flex items-center gap-1"><Waves className="w-3.5 h-3.5" /> 28°C água</span>
              <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> 2 adultos + 2 crianças</span>
              <span>20 dez — 02 jan</span>
            </div>
          </div>
        </section>
      </div>

      {/* OVERVIEW */}
      <section className="px-8 py-5 flex items-center justify-center gap-10 border-b" style={{ borderColor: `${accentCol}15` }}>
        {[
          { label: "Duração", value: "12 noites" },
          { label: "Resort", value: "Soneva Fushi" },
          { label: "Classe", value: "Business" },
          { label: "Família", value: "2+2" },
          { label: "Regime", value: "All Inclusive" },
        ].map(item => (
          <div key={item.label} className="text-center">
            <p className="text-[9px] uppercase tracking-[0.15em]" style={{ color: `${textCol}44`, fontFamily: bFont }}>{item.label}</p>
            <p className="text-sm font-bold mt-0.5" style={{ fontFamily: hFont, color: textCol }}>{item.value}</p>
          </div>
        ))}
      </section>

      {/* INTRO */}
      <div className={clickableClass("fonts", activePanel)} onClick={() => onClickSection("fonts")}>
        {editOverlay("Editar tipografia")}
        <section className="max-w-xl mx-auto px-8 py-14 text-center">
          <Waves className="w-6 h-6 mx-auto mb-4 opacity-20" style={{ color: accentCol }} />
          <p className="text-base leading-relaxed" style={{ fontFamily: hFont, color: `${textCol}88` }}>
            Águas cristalinas, areias brancas infinitas e o luxo de acordar sobre o oceano. Natal e Réveillon em família no destino mais exclusivo do mundo.
          </p>
          <Waves className="w-6 h-6 mx-auto mt-4 opacity-20 rotate-180" style={{ color: accentCol }} />
        </section>
      </div>

      {/* TIMELINE */}
      <section className="px-8 py-12" style={{ backgroundColor: `${accentCol}04` }}>
        <h2 className="text-center text-2xl font-bold mb-2 tracking-tight" style={{ fontFamily: hFont, color: textCol }}>Roteiro da Viagem</h2>
        <p className="text-center text-xs mb-8" style={{ color: `${textCol}44`, fontFamily: bFont }}>14 dias de paraíso · Natal & Réveillon</p>
        <div className="max-w-3xl mx-auto grid grid-cols-2 gap-x-8 gap-y-2">
          {timeline.map((item, i) => {
            const typeColors: Record<string, string> = { flight: accentCol, exp: "#f472b6", relax: "#60a5fa", special: "#fbbf24", transfer: primaryCol };
            const col = typeColors[item.type] || accentCol;
            return (
              <div key={i} className="flex items-center gap-3 py-2 border-b" style={{ borderColor: `${accentCol}08` }}>
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: col }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold" style={{ color: col }}>{item.day}</span>
                    <span className="text-[9px]" style={{ color: `${textCol}33` }}>{item.date}</span>
                  </div>
                  <p className="text-xs font-semibold truncate" style={{ fontFamily: hFont, color: textCol }}>{item.title}</p>
                  <p className="text-[9px] truncate" style={{ color: `${textCol}44` }}>{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* DISTRIBUTION */}
      <section className="px-8 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex rounded-full overflow-hidden h-3 mb-2" style={{ backgroundColor: `${accentCol}10` }}>
            <div className="h-full" style={{ width: "14%", background: `linear-gradient(to right, ${primaryCol}, ${accentCol})` }} />
            <div className="h-full" style={{ width: "79%", backgroundColor: accentCol }} />
            <div className="h-full" style={{ width: "7%", background: `linear-gradient(to right, ${accentCol}, ${primaryCol})` }} />
          </div>
          <div className="flex text-[9px]" style={{ color: `${textCol}44` }}>
            <span style={{ width: "14%" }}>Voos ida</span>
            <span style={{ width: "79%", textAlign: "center" }}>Soneva Fushi · 12 noites</span>
            <span style={{ width: "7%", textAlign: "right" }}>Volta</span>
          </div>
        </div>
      </section>

      {/* FLIGHTS */}
      <section className="px-8 py-12" style={{ backgroundColor: `${accentCol}06` }}>
        <h2 className="text-center text-2xl font-bold mb-2 tracking-tight" style={{ fontFamily: hFont, color: textCol }}>Voos</h2>
        <p className="text-center text-xs mb-8" style={{ color: `${textCol}44`, fontFamily: bFont }}>Qatar Airways Business · 3 trechos</p>
        <div className="max-w-3xl mx-auto space-y-4">
          {[
            { dir: "IDA", airline: "QR", name: "Qatar Airways", flight: "QR 773", from: "GRU", fromCity: "São Paulo · Guarulhos T3", to: "DOH", toCity: "Doha · Hamad Intl", dep: "23:15", arr: "17:40", dur: "14h25", date: "20 dez 2026", cls: "Business", bag: "2×32kg", bagHand: "1×10kg", aircraft: "Boeing 777-300ER", meal: "Jantar + Café da manhã", seat: "Qsuite (suite privativa)", wifi: true, next: true },
            { dir: "CONEXÃO", airline: "QR", name: "Qatar Airways", flight: "QR 672", from: "DOH", fromCity: "Doha · Hamad Intl", to: "MLE", toCity: "Malé · Velana Intl", dep: "02:10", arr: "09:30", dur: "4h20", date: "21 dez 2026", cls: "Business", bag: "2×32kg", bagHand: "1×10kg", aircraft: "Airbus A350-900", meal: "Jantar leve + Café", seat: "Qsuite", wifi: true, conn: "8h30 em Doha · Al Mourjan Lounge" },
            { dir: "VOLTA", airline: "QR", name: "Qatar Airways", flight: "QR 673 + QR 774", from: "MLE", fromCity: "Malé · Velana Intl", to: "GRU", toCity: "São Paulo · Guarulhos T3", dep: "16:45", arr: "07:30", dur: "20h45", date: "02 jan 2027", cls: "Business", bag: "2×32kg", bagHand: "1×10kg", aircraft: "A350 + B777", meal: "Almoço + Jantar + Café", seat: "Qsuite", wifi: true, next: true, conn: "Conexão DOH · 3h10" },
          ].map((f, i) => (
            <div key={i} className="overflow-hidden bg-white cursor-pointer" style={{ borderRadius: "1.25rem", boxShadow: "0 4px 24px rgba(0,60,60,0.08)" }} onClick={() => setExpandedFlight(expandedFlight === i ? null : i)}>
              <div className="h-1.5" style={{ background: `linear-gradient(to right, ${accentCol}, ${primaryCol})` }} />
              {f.conn && (
                <div className="px-5 py-2 flex items-center gap-2 text-[10px] border-b" style={{ backgroundColor: `${accentCol}06`, borderColor: `${accentCol}10`, color: `${textCol}66` }}>
                  <Clock className="w-3 h-3" style={{ color: accentCol }} />
                  <span>{f.conn}</span>
                </div>
              )}
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <AirlineLogo iata={f.airline} size={38} />
                    <div>
                      <p className="text-xs font-semibold" style={{ fontFamily: hFont, color: textCol }}>{f.name}</p>
                      <p className="text-[10px] font-mono" style={{ color: `${textCol}44` }}>{f.flight} · {f.aircraft}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: `${accentCol}12`, color: accentCol }}>{f.dir}</span>
                    <span className="text-[10px]" style={{ color: `${textCol}44` }}>{f.date}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${expandedFlight === i ? "rotate-180" : ""}`} style={{ color: `${textCol}25` }} />
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div>
                    <p className="text-3xl font-bold" style={{ fontFamily: hFont, color: textCol }}>{f.dep}</p>
                    <p className="text-lg font-bold" style={{ color: accentCol }}>{f.from}</p>
                    <p className="text-[10px]" style={{ color: `${textCol}44` }}>{f.fromCity}</p>
                  </div>
                  <div className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full flex items-center">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: accentCol }} />
                      <div className="flex-1 relative mx-2">
                        <div className="h-px" style={{ backgroundColor: `${accentCol}30` }} />
                        <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-white px-1">
                          <Plane className="w-4 h-4 rotate-90" style={{ color: accentCol }} />
                        </div>
                      </div>
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: accentCol }} />
                    </div>
                    <div className="flex items-center gap-3 text-[10px]" style={{ color: `${textCol}44` }}>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {f.dur}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-baseline justify-end gap-1">
                      <p className="text-3xl font-bold" style={{ fontFamily: hFont, color: textCol }}>{f.arr}</p>
                      {f.next && <span className="text-xs font-bold" style={{ color: accentCol }}>+1</span>}
                    </div>
                    <p className="text-lg font-bold" style={{ color: accentCol }}>{f.to}</p>
                    <p className="text-[10px]" style={{ color: `${textCol}44` }}>{f.toCity}</p>
                  </div>
                </div>

                {/* Expanded */}
                {expandedFlight === i && (
                  <div className="mt-4 pt-4 border-t grid grid-cols-4 gap-3" style={{ borderColor: `${accentCol}10` }}>
                    <div className="flex items-center gap-2">
                      <Luggage className="w-3.5 h-3.5" style={{ color: accentCol }} />
                      <div><p className="text-[9px] uppercase" style={{ color: `${textCol}33` }}>Despachada</p><p className="text-[10px] font-semibold" style={{ color: textCol }}>{f.bag}</p></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Luggage className="w-3.5 h-3.5" style={{ color: accentCol }} />
                      <div><p className="text-[9px] uppercase" style={{ color: `${textCol}33` }}>Mão</p><p className="text-[10px] font-semibold" style={{ color: textCol }}>{f.bagHand}</p></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Utensils className="w-3.5 h-3.5" style={{ color: accentCol }} />
                      <div><p className="text-[9px] uppercase" style={{ color: `${textCol}33` }}>Refeição</p><p className="text-[10px] font-semibold" style={{ color: textCol }}>{f.meal}</p></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Wifi className="w-3.5 h-3.5" style={{ color: accentCol }} />
                      <div><p className="text-[9px] uppercase" style={{ color: `${textCol}33` }}>Wi-Fi</p><p className="text-[10px] font-semibold" style={{ color: textCol }}>{f.wifi ? "✓ Onboard" : "—"}</p></div>
                    </div>
                    <div className="col-span-2 flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5" style={{ color: accentCol }} />
                      <div><p className="text-[9px] uppercase" style={{ color: `${textCol}33` }}>Assento</p><p className="text-[10px] font-semibold" style={{ color: textCol }}>{f.seat}</p></div>
                    </div>
                    <div className="col-span-2 flex items-center gap-2">
                      <Plane className="w-3.5 h-3.5" style={{ color: accentCol }} />
                      <div><p className="text-[9px] uppercase" style={{ color: `${textCol}33` }}>Aeronave</p><p className="text-[10px] font-semibold" style={{ color: textCol }}>{f.aircraft}</p></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          {/* Baggage summary */}
          <div className="p-4 bg-white flex items-center gap-4" style={{ borderRadius: "1rem", boxShadow: "0 2px 12px rgba(0,60,60,0.04)" }}>
            <Luggage className="w-5 h-5" style={{ color: accentCol }} />
            <div className="flex-1">
              <p className="text-xs font-bold" style={{ fontFamily: hFont, color: textCol }}>Bagagem por passageiro</p>
              <p className="text-[10px]" style={{ color: `${textCol}44` }}>2 malas despachadas (32kg cada) + 1 mão (10kg) em todos os trechos</p>
            </div>
            <span className="text-[9px] font-bold flex items-center gap-1" style={{ color: "#16a34a" }}><Check className="w-3.5 h-3.5" /> Incluído</span>
          </div>
        </div>
      </section>

      {/* HOTEL with Gallery */}
      <section className="px-8 py-14">
        <h2 className="text-center text-2xl font-bold mb-2 tracking-tight" style={{ fontFamily: hFont, color: textCol }}>Seu Resort</h2>
        <p className="text-center text-xs mb-8" style={{ color: `${textCol}44`, fontFamily: bFont }}>Soneva Fushi · Baa Atoll · 12 noites</p>
        <div className="max-w-3xl mx-auto bg-white overflow-hidden" style={{ borderRadius: "1.5rem", boxShadow: "0 8px 40px rgba(0,60,60,0.1)" }}>
          <div className="relative h-[280px]">
            <img src={hotelGallery[galleryIdx]} alt="Soneva" className="w-full h-full object-cover transition-all duration-500" />
            <div className="absolute top-4 right-4 px-3 py-1.5 rounded-full text-white text-[10px] font-bold flex items-center gap-1.5" style={{ backgroundColor: accentCol }}>
              <Star className="w-3 h-3 fill-white" /> #1 Maldives Resort
            </div>
            <div className="absolute top-4 left-4 bg-black/40 backdrop-blur-sm text-white text-[10px] px-2.5 py-1 rounded-full flex items-center gap-1.5">
              <Camera className="w-3 h-3" /> {galleryIdx + 1}/{hotelGallery.length}
            </div>
          </div>
          {/* Gallery strip */}
          <div className="flex gap-1.5 px-4 -mt-6 relative z-10">
            {hotelGallery.map((img, j) => (
              <div key={j} className="flex-1 h-16 rounded-lg overflow-hidden cursor-pointer border-2 transition-all shadow-md" style={{ borderColor: galleryIdx === j ? accentCol : "white", opacity: galleryIdx === j ? 1 : 0.7 }} onClick={() => setGalleryIdx(j)}>
                <img src={img} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
          <div className="p-8 pt-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold mb-1" style={{ fontFamily: hFont, color: textCol }}>Soneva Fushi</h3>
                <p className="text-xs flex items-center gap-1 mb-2" style={{ color: `${textCol}44` }}>
                  <MapPin className="w-3.5 h-3.5" style={{ color: accentCol }} /> Baa Atoll, Maldivas · UNESCO Biosphere Reserve
                </p>
                <div className="flex gap-0.5 mb-3">{[1,2,3,4,5].map(j => <Star key={j} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />)}</div>
                <p className="text-xs leading-relaxed max-w-md" style={{ color: `${textCol}55`, fontFamily: bFont }}>
                  Water Villa com 250m², deck privativo sobre a lagoa, tobogã direto para o oceano e butler dedicado 24h. Duas suítes para as crianças com conectante.
                </p>
              </div>
              <div className="text-center shrink-0 ml-8 p-4 rounded-xl" style={{ backgroundColor: `${accentCol}08` }}>
                <p className="text-[9px] uppercase tracking-wider" style={{ color: `${textCol}44` }}>Diárias</p>
                <p className="text-2xl font-bold" style={{ fontFamily: hFont, color: accentCol }}>12</p>
                <p className="text-[9px]" style={{ color: `${textCol}33` }}>noites</p>
              </div>
            </div>

            {/* Details grid */}
            <div className="grid grid-cols-3 gap-3 mt-5 pt-4" style={{ borderTop: `1px solid ${accentCol}10` }}>
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" style={{ color: accentCol }} />
                <div><p className="text-[9px] uppercase" style={{ color: `${textCol}33` }}>Check-in</p><p className="text-[10px] font-semibold" style={{ color: textCol }}>21 dez · 14h</p></div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" style={{ color: accentCol }} />
                <div><p className="text-[9px] uppercase" style={{ color: `${textCol}33` }}>Check-out</p><p className="text-[10px] font-semibold" style={{ color: textCol }}>02 jan · 12h</p></div>
              </div>
              <div className="flex items-center gap-2">
                <Coffee className="w-3.5 h-3.5" style={{ color: accentCol }} />
                <div><p className="text-[9px] uppercase" style={{ color: `${textCol}33` }}>Regime</p><p className="text-[10px] font-semibold" style={{ color: textCol }}>All Inclusive Premium</p></div>
              </div>
            </div>

            {/* Amenities */}
            <div className="flex flex-wrap gap-2 mt-4 pt-3" style={{ borderTop: `1px solid ${accentCol}08` }}>
              {["Overwater Villa 250m²", "Tobogã privativo", "Butler 24h", "Spa ilimitado", "Mergulho incluído", "Kids Club", "Cinema ao ar livre", "Restaurante subaquático", "Bicicletas", "Equipamento snorkel"].map(a => (
                <span key={a} className="text-[10px] px-3 py-1 rounded-full flex items-center gap-1" style={{ backgroundColor: `${accentCol}08`, color: primaryCol, fontFamily: bFont }}>
                  <Check className="w-3 h-3" style={{ color: accentCol }} /> {a}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* EXPERIENCES */}
      <section className="px-8 py-12" style={{ backgroundColor: `${accentCol}06` }}>
        <h2 className="text-center text-2xl font-bold mb-2 tracking-tight" style={{ fontFamily: hFont, color: textCol }}>Experiências</h2>
        <p className="text-center text-xs mb-8" style={{ color: `${textCol}44`, fontFamily: bFont }}>Atividades selecionadas para toda a família</p>
        <div className="max-w-3xl mx-auto grid grid-cols-3 gap-5">
          {[
            { title: "Snorkeling Bioluminescente", desc: "Mergulho noturno com plâncton fluorescente na house reef. Equipamento e guia incluídos.", icon: Fish, img: expImgs[0], dur: "2h", when: "20:00", included: true },
            { title: "Dolphin Cruise ao Sunset", desc: "Navegação com golfinhos selvagens ao entardecer. Champagne para os pais, suco para kids.", icon: Shell, img: expImgs[1], dur: "3h", when: "16:30", included: true },
            { title: "Sandbank Privativo", desc: "Piquenique gourmet em banco de areia exclusivo. Picnic basket + snorkel gear.", icon: Sun, img: expImgs[2], dur: "4h", when: "10:00", included: true },
            { title: "Aula de Mergulho PADI", desc: "Curso básico PADI para toda família. Instrutor dedicado, recife protegido.", icon: Waves, img: "https://images.unsplash.com/photo-1682687982501-1e58ab814714?w=600&h=400&fit=crop&q=80", dur: "3h", when: "09:00", included: false },
            { title: "Yoga ao Nascer do Sol", desc: "Sessão de yoga no deck sobre o oceano com instrutor certificado.", icon: Heart, img: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&h=400&fit=crop&q=80", dur: "1h", when: "06:00", included: true },
            { title: "Spa Ayurvédico", desc: "Tratamento de casal ayurvédico com óleos locais. Kids spa simultâneo.", icon: Sparkles, img: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=600&h=400&fit=crop&q=80", dur: "2h", when: "14:00", included: true },
          ].map((exp) => (
            <div key={exp.title} className="bg-white overflow-hidden group cursor-pointer" style={{ borderRadius: "1.25rem", boxShadow: "0 4px 20px rgba(0,60,60,0.06)" }}>
              <div className="h-32 overflow-hidden relative">
                <img src={exp.img} alt={exp.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                <div className="absolute bottom-2 left-2 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center">
                  <exp.icon className="w-4 h-4" style={{ color: accentCol }} />
                </div>
                {exp.included ? (
                  <div className="absolute top-2 right-2 bg-white/90 text-[8px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5" style={{ color: "#16a34a" }}><Check className="w-3 h-3" /> Incluído</div>
                ) : (
                  <div className="absolute top-2 right-2 bg-white/90 text-[8px] font-bold px-2 py-0.5 rounded-full" style={{ color: "#92400e" }}>Opcional</div>
                )}
              </div>
              <div className="p-4">
                <h4 className="font-bold text-sm mb-1" style={{ fontFamily: hFont, color: textCol }}>{exp.title}</h4>
                <p className="text-[10px] leading-relaxed" style={{ color: `${textCol}44`, fontFamily: bFont }}>{exp.desc}</p>
                <div className="flex items-center gap-2 mt-2 text-[9px]" style={{ color: `${textCol}33` }}>
                  <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" /> {exp.dur}</span>
                  <span>· {exp.when}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* IMPORTANT INFO */}
      <section className="px-8 py-12">
        <h2 className="text-center text-xl font-bold mb-8 tracking-tight" style={{ fontFamily: hFont, color: textCol }}>Informações Importantes</h2>
        <div className="max-w-3xl mx-auto grid grid-cols-2 gap-4">
          {[
            { icon: Shield, title: "Seguro Viagem", desc: "Cobertura internacional USD 150.000 para toda família. Assistência 24h.", inc: true },
            { icon: Plane, title: "Transfer Speedboat", desc: "Malé → Soneva Fushi speedboat privativo (35 min). Ida e volta incluídos.", inc: true },
            { icon: Calendar, title: "Cancelamento", desc: "Gratuito até 60 dias. 50% multa 60-30 dias. 100% após 30 dias.", inc: false },
            { icon: CreditCard, title: "Pagamento", desc: "PIX, transferência ou cartão em até 12× sem juros. 5% desconto à vista.", inc: false },
            { icon: Users, title: "Kids Policy", desc: "Crianças até 12 anos: Kids Club gratuito, menu kids, berço sob demanda.", inc: true },
            { icon: Coffee, title: "All Inclusive", desc: "Todas refeições, bebidas premium, minibar, room service 24h incluídos.", inc: true },
          ].map(info => (
            <div key={info.title} className="flex gap-3 p-4 bg-white rounded-xl" style={{ boxShadow: "0 2px 12px rgba(0,60,60,0.04)" }}>
              <info.icon className="w-5 h-5 shrink-0 mt-0.5" style={{ color: accentCol }} />
              <div>
                <p className="text-sm font-bold" style={{ fontFamily: hFont, color: textCol }}>{info.title}</p>
                <p className="text-[10px] mt-0.5 leading-relaxed" style={{ color: `${textCol}44` }}>{info.desc}</p>
                {info.inc && <span className="text-[9px] mt-1 inline-flex items-center gap-0.5" style={{ color: "#16a34a" }}><Check className="w-3 h-3" /> Incluído no pacote</span>}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section className="px-8 py-16">
        <div className="max-w-md mx-auto text-center p-10 text-white" style={{ borderRadius: "1.5rem", background: `linear-gradient(135deg, ${primaryCol}, ${accentCol})`, boxShadow: `0 8px 40px ${accentCol}30` }}>
          <Sun className="w-6 h-6 mx-auto mb-4 opacity-50" />
          <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: hFont }}>Investimento</h2>

          {/* Breakdown */}
          <div className="text-left mb-6 space-y-1.5">
            {[
              { item: "Aéreo Business Qatar (4 pax)", value: "R$ 72.000" },
              { item: "Soneva Fushi · 12 noites", value: "R$ 62.400" },
              { item: "Experiências incluídas (5)", value: "R$ 8.200" },
              { item: "Transfers speedboat", value: "R$ 3.600" },
              { item: "Seguro família", value: "R$ 4.800" },
              { item: "Réveillon & Natal especial", value: "R$ 12.200" },
            ].map(line => (
              <div key={line.item} className="flex justify-between py-1 border-b border-white/10">
                <span className="text-[10px] opacity-60">{line.item}</span>
                <span className="text-[10px] font-semibold font-mono">{line.value}</span>
              </div>
            ))}
          </div>

          <p className="text-[9px] uppercase tracking-[0.3em] opacity-50 mb-2" style={{ fontFamily: bFont }}>Por pessoa</p>
          <p className="text-2xl font-bold" style={{ fontFamily: hFont }}>R$ 40.800,00</p>
          <div className="my-5 h-px bg-white/15" />
          <p className="text-[9px] uppercase tracking-[0.3em] opacity-50 mb-2" style={{ fontFamily: bFont }}>Família · 2 adultos + 2 crianças</p>
          <p className="text-4xl font-bold" style={{ fontFamily: hFont }}>R$ 163.200,00</p>
          <p className="text-[10px] opacity-40 mt-2">12× de R$ 13.600 ou PIX R$ 155.040 (-5%)</p>
          <p className="text-[10px] opacity-30 mt-1">Crianças até 12: cortesia no resort</p>
          <button className="mt-8 px-10 py-3.5 font-bold text-sm tracking-wide bg-white" style={{ color: primaryCol, borderRadius: "2rem", fontFamily: hFont }}>
            {tc.ctaText || "Embarcar no Paraíso"}
          </button>
          <p className="text-[9px] mt-3 opacity-20">Válida 7 dias · Sujeita a disponibilidade · Natal limitado</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-8 px-6 text-center" style={{ borderTop: `1px solid ${accentCol}15` }}>
        <img src={logoNatleva} alt="NatLeva" className="h-8 mx-auto mb-2 opacity-40" />
        <p className="text-[10px] tracking-wider" style={{ color: `${textCol}25`, fontFamily: bFont }}>Proposta exclusiva · NatLeva Viagens</p>
        <p className="text-[9px] mt-1" style={{ color: `${textCol}15` }}>Documento confidencial · Destinado exclusivamente ao cliente</p>
      </footer>
    </div>
  );
}
