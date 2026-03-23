import { useState } from "react";
import { Plane, Clock, MapPin, Star, Zap, Train, Camera, ChevronDown, Luggage, Utensils, Wifi, Shield, Calendar, CreditCard, Check, Users, Coffee } from "lucide-react";
import AirlineLogo from "@/components/AirlineLogo";
import logoNatleva from "@/assets/logo-natleva-clean.png";
import { type StylePreviewProps, clickableClass, editOverlay, isMob, isMobOrTab } from "../TemplatePreview";

const heroImg = "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1920&h=1080&fit=crop&q=80";
const hotelGallery1 = [
  "https://images.unsplash.com/photo-1535827841776-24afc1e255ac?w=600&h=400&fit=crop&q=80",
  "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&h=400&fit=crop&q=80",
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=400&fit=crop&q=80",
  "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=600&h=400&fit=crop&q=80",
];

const timeline = [
  { day: "01", date: "03 out", title: "São Paulo → Tóquio", desc: "Voo ANA Business via Houston · 24h45", type: "flight" },
  { day: "02", date: "04 out", title: "Chegada em Narita", desc: "Transfer ao hotel · Descanso · Exploração livre", type: "arrival" },
  { day: "03", date: "05 out", title: "Shibuya & Shinjuku", desc: "Crossing, Meiji Shrine, Golden Gai night tour", type: "explore" },
  { day: "04", date: "06 out", title: "Akihabara & Asakusa", desc: "Senso-ji, eletrônicos, ramen autêntico", type: "explore" },
  { day: "05", date: "07 out", title: "Tsukiji & TeamLab", desc: "Mercado de peixes, arte digital imersiva", type: "exp" },
  { day: "06", date: "08 out", title: "Day Trip: Hakone", desc: "Monte Fuji, onsen tradicional", type: "exp" },
  { day: "07-08", date: "09-10 out", title: "Tokyo Livre", desc: "Harajuku, Roppongi, Ginza, Odaiba", type: "explore" },
  { day: "09", date: "11 out", title: "Shinkansen → Kyoto", desc: "Trem-bala 320km/h · Vista Mt. Fuji", type: "transfer" },
  { day: "10", date: "12 out", title: "Fushimi Inari", desc: "Mil torii vermelhos ao amanhecer", type: "exp" },
  { day: "11", date: "13 out", title: "Arashiyama", desc: "Floresta de bambu, templo dourado", type: "exp" },
  { day: "12", date: "14 out", title: "Nara Day Trip", desc: "Cervos sagrados, Grande Buda", type: "explore" },
  { day: "13", date: "15 out", title: "Kyoto → Osaka", desc: "Dotonbori · Street food tour", type: "transfer" },
  { day: "14", date: "16 out", title: "Osaka Castle & Food", desc: "Castelo, Shinsekai, takoyaki", type: "explore" },
  { day: "15", date: "17 out", title: "Retorno KIX → GRU", desc: "Voo ANA Business", type: "flight" },
];

function GlitchLine({ color }: { color: string }) {
  return (
    <div className="relative h-px my-8 max-w-3xl mx-auto overflow-hidden">
      <div className="absolute inset-0" style={{ background: `linear-gradient(to right, transparent, ${color}30, ${color}, ${color}30, transparent)` }} />
      <div className="absolute top-0 left-1/4 w-2 h-px" style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }} />
      <div className="absolute top-0 right-1/3 w-4 h-px" style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }} />
    </div>
  );
}

export function ModernStyle({ form, activePanel, onClickSection, device }: StylePreviewProps) {
  const [galleryIdx, setGalleryIdx] = useState(0);
  const [expandedFlight, setExpandedFlight] = useState<number | null>(0);
  const tc = form.theme_config;
  const textCol = form.text_color || "#e5e5e5";
  const bgCol = form.bg_color || "#0a0a0a";
  const accentCol = form.accent_color || "#ff3366";
  const hFont = `'${form.font_heading}', sans-serif`;
  const bFont = `'${form.font_body}', sans-serif`;
  const mob = isMob(device);
  const mobTab = isMobOrTab(device);

  return (
    <div style={{ backgroundColor: bgCol, color: textCol }}>
      {/* ══ HERO ══ */}
      <div className={clickableClass("layout", activePanel)} onClick={() => onClickSection("layout")}>
        {editOverlay("Editar layout")}
        <section className="relative overflow-hidden" style={{ height: mob ? "320px" : mobTab ? "380px" : "450px" }}>
          <div className="absolute inset-0 bg-cover bg-center opacity-25" style={{ backgroundImage: `url(${heroImg})` }} />
          <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${bgCol} 0%, transparent 30%, ${bgCol} 100%)` }} />
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `linear-gradient(${accentCol} 1px, transparent 1px), linear-gradient(90deg, ${accentCol} 1px, transparent 1px)`, backgroundSize: "40px 40px" }} />
          {!mob && (
            <svg className="absolute top-6 right-6 w-20 h-20 opacity-[0.06]" viewBox="0 0 80 80" stroke={accentCol} fill="none" strokeWidth="1">
              <rect x="5" y="5" width="70" height="70" /><rect x="15" y="15" width="50" height="50" strokeDasharray="4 4" /><line x1="5" y1="5" x2="15" y2="15" /><line x1="75" y1="5" x2="65" y2="15" /><line x1="5" y1="75" x2="15" y2="65" /><line x1="75" y1="75" x2="65" y2="65" />
            </svg>
          )}
          <div className="relative z-10 h-full flex flex-col justify-between" style={{ padding: mob ? "20px" : "40px" }}>
            <div className="flex items-center justify-between">
              <img src={logoNatleva} alt="NatLeva" className="h-6 opacity-50" />
              {!mob && <span className="text-[9px] font-mono tracking-widest opacity-30" style={{ color: accentCol }}>2026.10.03 — 2026.10.18</span>}
            </div>
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-1" style={{ height: mob ? "24px" : "32px", backgroundColor: accentCol, boxShadow: `0 0 10px ${accentCol}40` }} />
                <p className="text-[10px] tracking-[0.3em] uppercase opacity-40" style={{ fontFamily: bFont }}>
                  {mob ? "15 dias · 3 cidades" : "Lucas Tanaka · 15 dias · 3 cidades"}
                </p>
              </div>
              <h1 className="font-black leading-[0.95] tracking-tighter mb-2" style={{ fontFamily: hFont, fontSize: mob ? "2rem" : mobTab ? "2.5rem" : "3.75rem" }}>
                TOKYO<br /><span style={{ color: accentCol, textShadow: `0 0 30px ${accentCol}30` }}>KYOTO</span><br />OSAKA
              </h1>
              <div className="flex items-center gap-3 mt-3 text-xs opacity-30 font-mono flex-wrap">
                <span className="flex items-center gap-1"><Users className="w-3 h-3" /> 1 pax</span>
                <span>·</span>
                <span>Business</span>
                <span>·</span>
                <span>14 noites</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ══ OVERVIEW BAR ══ */}
      <section className="px-4 py-3 border-b" style={{ borderColor: `${accentCol}10` }}>
        <div className={mob ? "grid grid-cols-3 gap-2" : "flex items-center justify-between"}>
          {[
            { label: "DURAÇÃO", value: "15 DIAS" },
            { label: "CIDADES", value: "3" },
            { label: "VOOS", value: "3 TRECHOS" },
            ...(mob ? [] : [{ label: "HOTÉIS", value: "2" }, { label: "CLASSE", value: "BUSINESS" }]),
          ].map(item => (
            <div key={item.label} className="text-center">
              <p className="text-[8px] font-mono uppercase opacity-20">{item.label}</p>
              <p className="text-xs font-black mt-0.5 font-mono" style={{ fontFamily: hFont }}>{item.value}</p>
            </div>
          ))}
        </div>
      </section>

      <GlitchLine color={accentCol} />

      {/* ══ TIMELINE ══ */}
      <section style={{ padding: mob ? "16px" : "32px" }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1 h-5" style={{ backgroundColor: accentCol, boxShadow: `0 0 10px ${accentCol}40` }} />
          <h2 className="text-lg font-black tracking-tight uppercase" style={{ fontFamily: hFont }}>Timeline</h2>
          {!mob && <span className="text-[10px] font-mono opacity-30 ml-auto">15 dias · 3 cidades</span>}
        </div>
        <div className="max-w-3xl mx-auto" style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr", gap: mob ? "4px" : "8px 24px" }}>
          {timeline.map((item, i) => {
            const typeColors: Record<string, string> = { flight: accentCol, explore: "#a78bfa", exp: "#f472b6", transfer: "#60a5fa", arrival: "#34d399" };
            const col = typeColors[item.type] || accentCol;
            return (
              <div key={i} className="flex items-center gap-2 py-2 border-b group hover:bg-white/[0.02] transition-colors px-2 rounded" style={{ borderColor: `${accentCol}06` }}>
                <span className="font-black font-mono shrink-0 w-7" style={{ fontSize: mob ? "14px" : "18px", color: `${col}40` }}>{item.day}</span>
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: col, boxShadow: `0 0 6px ${col}40` }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate" style={{ fontFamily: hFont }}>{item.title}</p>
                  <p className="text-[9px] opacity-30 truncate">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ══ DISTRIBUTION ══ */}
      <section style={{ padding: mob ? "12px 16px" : "16px 32px" }}>
        <div className="max-w-3xl mx-auto">
          <h3 className="text-sm font-black uppercase mb-3" style={{ fontFamily: hFont }}>Distribuição</h3>
          <div className="flex rounded-lg overflow-hidden h-5 mb-2" style={{ backgroundColor: `${accentCol}10` }}>
            <div className="h-full flex items-center justify-center text-[7px] font-mono text-white font-bold" style={{ width: "10%", backgroundColor: accentCol }}>GRU</div>
            <div className="h-full flex items-center justify-center text-[7px] font-mono text-white" style={{ width: "50%", backgroundColor: `${accentCol}cc` }}>{mob ? "TYO" : "TOKYO · 8N"}</div>
            <div className="h-full flex items-center justify-center text-[7px] font-mono text-white" style={{ width: "25%", backgroundColor: `${accentCol}88` }}>{mob ? "KYO" : "KYOTO · 3N"}</div>
            <div className="h-full flex items-center justify-center text-[7px] font-mono text-white" style={{ width: "10%", backgroundColor: `${accentCol}55` }}>OSA</div>
            <div className="h-full" style={{ width: "5%", backgroundColor: `${accentCol}33` }} />
          </div>
        </div>
      </section>

      <GlitchLine color={accentCol} />

      {/* ══ FLIGHTS ══ */}
      <section style={{ padding: mob ? "16px" : "32px" }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1 h-5" style={{ backgroundColor: accentCol, boxShadow: `0 0 10px ${accentCol}40` }} />
          <h2 className="text-lg font-black tracking-tight uppercase" style={{ fontFamily: hFont }}>Voos</h2>
        </div>
        <div className="max-w-3xl mx-auto space-y-3">
          {[
            { airline: "NH", name: "ANA", flight: "NH 6284", from: "GRU", fromCity: "Guarulhos T3", to: "NRT", toCity: "Narita T1", dep: "23:45", arr: "06:30", dur: "24h45", date: "03 OUT", cls: "BUSINESS", aircraft: "Boeing 787-9", next: "+1", bag: "2×32kg", meal: "Jantar + Café + Almoço", seat: "THE Room (lie-flat 180°)", wifi: true, conn: "Escala IAH · 3h15" },
            { airline: "NH", name: "ANA", flight: "NH 6283", from: "KIX", fromCity: "Kansai T1", to: "GRU", toCity: "Guarulhos T3", dep: "11:15", arr: "07:00", dur: "26h45", date: "18 OUT", cls: "BUSINESS", aircraft: "Boeing 777-300ER", next: "+1", bag: "2×32kg", meal: "Almoço + Jantar + Café", seat: "THE Room (lie-flat 180°)", wifi: true, conn: "Escala IAH · 4h20" },
          ].map((f, i) => (
            <div key={i} className="relative border overflow-hidden cursor-pointer group transition-all hover:shadow-lg" style={{ borderColor: `${accentCol}15`, borderRadius: "0.75rem", backgroundColor: `${accentCol}05` }} onClick={() => setExpandedFlight(expandedFlight === i ? null : i)}>
              <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: accentCol, boxShadow: `0 0 8px ${accentCol}40` }} />
              <div style={{ padding: mob ? "12px 12px 12px 16px" : "20px 20px 20px 24px" }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <AirlineLogo iata={f.airline} size={mob ? 28 : 36} />
                    <div>
                      <p className="text-xs font-bold" style={{ fontFamily: hFont }}>{f.name}</p>
                      <p className="text-[9px] font-mono opacity-30">{f.flight}</p>
                    </div>
                  </div>
                  <span className="text-[9px] font-mono px-2 py-1 rounded" style={{ backgroundColor: `${accentCol}15`, color: accentCol, fontWeight: 700 }}>{f.cls}</span>
                </div>
                {f.conn && (
                  <div className="mb-3 px-2 py-1 rounded text-[9px] font-mono flex items-center gap-1" style={{ backgroundColor: `${accentCol}08`, color: `${accentCol}aa` }}>
                    <Clock className="w-3 h-3" /> {f.conn}
                  </div>
                )}
                {mob ? (
                  /* Mobile: stacked layout */
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-black font-mono tracking-tighter">{f.dep}</p>
                      <p className="text-sm font-black font-mono" style={{ color: accentCol }}>{f.from}</p>
                    </div>
                    <div className="flex flex-col items-center gap-1 px-2">
                      <Plane className="w-3.5 h-3.5 rotate-90" style={{ color: accentCol }} />
                      <span className="text-[9px] font-mono opacity-30">{f.dur}</span>
                    </div>
                    <div className="text-right">
                      <div className="flex items-baseline justify-end gap-1">
                        <p className="text-2xl font-black font-mono tracking-tighter">{f.arr}</p>
                        {f.next && <span className="text-[9px] font-bold" style={{ color: accentCol }}>{f.next}</span>}
                      </div>
                      <p className="text-sm font-black font-mono" style={{ color: accentCol }}>{f.to}</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
                    <div>
                      <p className="text-4xl font-black font-mono tracking-tighter">{f.dep}</p>
                      <p className="text-lg font-black font-mono" style={{ color: accentCol, textShadow: `0 0 15px ${accentCol}20` }}>{f.from}</p>
                      <p className="text-[10px] font-mono opacity-25">{f.fromCity}</p>
                    </div>
                    <div className="flex flex-col items-center gap-2 px-4">
                      <div className="flex items-center w-20">
                        <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: accentCol, boxShadow: `0 0 6px ${accentCol}60` }} />
                        <div className="flex-1 h-px mx-1" style={{ backgroundColor: `${accentCol}40` }} />
                        <Plane className="w-3.5 h-3.5 rotate-90" style={{ color: accentCol }} />
                        <div className="flex-1 h-px mx-1" style={{ backgroundColor: `${accentCol}40` }} />
                        <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: accentCol, boxShadow: `0 0 6px ${accentCol}60` }} />
                      </div>
                      <span className="text-[10px] font-mono opacity-30 flex items-center gap-1"><Clock className="w-3 h-3" /> {f.dur}</span>
                    </div>
                    <div className="text-right">
                      <div className="flex items-baseline justify-end gap-1">
                        <p className="text-4xl font-black font-mono tracking-tighter">{f.arr}</p>
                        {f.next && <span className="text-xs font-bold" style={{ color: accentCol }}>{f.next}</span>}
                      </div>
                      <p className="text-lg font-black font-mono" style={{ color: accentCol, textShadow: `0 0 15px ${accentCol}20` }}>{f.to}</p>
                      <p className="text-[10px] font-mono opacity-25">{f.toCity}</p>
                    </div>
                  </div>
                )}
                {expandedFlight === i && (
                  <div className="mt-3 pt-3 border-t" style={{ borderColor: `${accentCol}10`, display: "grid", gridTemplateColumns: mob ? "1fr 1fr" : "repeat(4, 1fr)", gap: "8px" }}>
                    {[
                      { icon: Luggage, label: "BAGAGEM", val: f.bag },
                      { icon: Utensils, label: "REFEIÇÃO", val: mob ? f.meal.split("+")[0] : f.meal },
                      { icon: Wifi, label: "WI-FI", val: f.wifi ? "Free" : "N/A" },
                      { icon: Star, label: "ASSENTO", val: mob ? "Lie-flat" : f.seat },
                    ].map(d => (
                      <div key={d.label}>
                        <p className="text-[8px] font-mono uppercase opacity-20">{d.label}</p>
                        <p className="text-[10px] font-mono mt-0.5 flex items-center gap-1"><d.icon className="w-3 h-3" style={{ color: accentCol }} /> {d.val}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {/* Shinkansen */}
          <div className="p-3 rounded-lg border" style={{ borderColor: `${accentCol}15`, backgroundColor: `${accentCol}05` }}>
            <div className="flex items-center gap-2 mb-1">
              <Train className="w-4 h-4" style={{ color: accentCol }} />
              <div>
                <p className="text-xs font-black" style={{ fontFamily: hFont }}>SHINKANSEN · BÔNUS</p>
                <p className="text-[9px] font-mono opacity-30">Tokyo → Kyoto · 2h14 · 320km/h</p>
              </div>
            </div>
            {!mob && <p className="text-[10px] opacity-30 ml-6">Green Car (1ª classe) · Vista Mt. Fuji · JR Pass 7 dias incluído</p>}
          </div>
        </div>
      </section>

      <GlitchLine color={accentCol} />

      {/* ══ HOTELS ══ */}
      <section style={{ padding: mob ? "16px" : "32px" }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1 h-5" style={{ backgroundColor: accentCol, boxShadow: `0 0 10px ${accentCol}40` }} />
          <h2 className="text-lg font-black tracking-tight uppercase" style={{ fontFamily: hFont }}>Hospedagem</h2>
        </div>
        <div className="max-w-3xl mx-auto">
          <div className="rounded-xl overflow-hidden relative mb-2" style={{ height: mob ? "180px" : "250px" }}>
            <img src={hotelGallery1[galleryIdx]} alt="Hotel" className="w-full h-full object-cover transition-all duration-500" />
            <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${bgCol} 0%, transparent 40%)` }} />
            <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm text-white text-[10px] px-2 py-1 rounded-full flex items-center gap-1">
              <Camera className="w-3 h-3" /> {galleryIdx + 1}/{hotelGallery1.length}
            </div>
            <div className="absolute bottom-3 left-3 right-3">
              <h3 className="font-black text-base" style={{ fontFamily: hFont }}>Aman Tokyo</h3>
              <p className="text-[10px] font-mono opacity-40 flex items-center gap-1"><MapPin className="w-3 h-3" /> Tokyo · Otemachi</p>
            </div>
          </div>
          <div className="flex gap-1 mb-3">
            {hotelGallery1.map((img, j) => (
              <div key={j} className="flex-1 rounded-md overflow-hidden cursor-pointer border-2 transition-all" style={{ height: mob ? "36px" : "56px", borderColor: galleryIdx === j ? accentCol : "transparent", opacity: galleryIdx === j ? 1 : 0.4 }} onClick={() => setGalleryIdx(j)}>
                <img src={img} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
          <div className="p-3 rounded-lg border" style={{ borderColor: `${accentCol}10` }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5">{Array(5).fill(0).map((_, j) => <Star key={j} className="w-3 h-3 fill-current" style={{ color: accentCol }} />)}</div>
                <span className="text-[10px] font-mono" style={{ color: accentCol }}>9 noites</span>
              </div>
              {!mob && <span className="text-[10px] font-mono opacity-30">Premier Room</span>}
            </div>
            <div className="flex flex-wrap gap-1">
              {["Spa & Onsen", "Fitness 24h", "Concierge", "Room service", ...(mob ? [] : ["Lobby lounge", "Lavanderia express"])].map(a => (
                <span key={a} className="text-[9px] px-2 py-0.5 rounded font-mono flex items-center gap-1" style={{ backgroundColor: `${accentCol}08`, color: `${accentCol}aa` }}>
                  <Check className="w-2.5 h-2.5" /> {a}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ PRICING ══ */}
      <section style={{ padding: mob ? "20px 16px" : "56px 32px" }}>
        <div className="max-w-sm mx-auto text-center p-6 relative" style={{ borderRadius: "1rem" }}>
          <div className="absolute inset-0 rounded-[1rem]" style={{ background: `linear-gradient(135deg, ${accentCol}, ${form.primary_color})`, padding: "1px" }}>
            <div className="w-full h-full rounded-[calc(1rem-1px)]" style={{ backgroundColor: bgCol }} />
          </div>
          <div className="relative z-10">
            <Zap className="w-5 h-5 mx-auto mb-3" style={{ color: accentCol, filter: `drop-shadow(0 0 8px ${accentCol}40)` }} />
            <h2 className="text-lg font-black mb-3 uppercase" style={{ fontFamily: hFont }}>Investimento</h2>
            <div className="text-left mb-3 space-y-1">
              {[
                { item: "Aéreo Business ANA", value: "R$ 18.900" },
                { item: "Aman Tokyo · 9 noites", value: "R$ 13.500" },
                { item: "Park Hyatt Kyoto · 3N", value: "R$ 5.400" },
                { item: "JR Pass + Shinkansen", value: "R$ 1.800" },
              ].map(line => (
                <div key={line.item} className="flex justify-between py-1 border-b font-mono" style={{ borderColor: `${accentCol}08` }}>
                  <span className="text-[9px] opacity-30">{line.item}</span>
                  <span className="text-[9px] font-semibold">{line.value}</span>
                </div>
              ))}
            </div>
            <p className="font-black" style={{ fontFamily: hFont, color: accentCol, textShadow: `0 0 30px ${accentCol}20`, fontSize: mob ? "1.5rem" : "1.875rem" }}>R$ 41.200,00</p>
            <p className="text-[10px] opacity-20 mt-1 font-mono">10× R$ 4.120 ou PIX R$ 39.140</p>
            <button className="mt-5 px-8 py-3 font-black text-sm text-white transition-all hover:scale-105" style={{ backgroundColor: accentCol, borderRadius: "0.75rem", fontFamily: hFont, boxShadow: `0 4px 20px ${accentCol}40` }}>
              {tc.ctaText || "Iniciar Jornada"}
            </button>
          </div>
        </div>
      </section>

      {/* ══ FOOTER ══ */}
      <footer className="py-6 px-4 text-center" style={{ borderTop: `1px solid ${accentCol}08` }}>
        <img src={logoNatleva} alt="NatLeva" className="h-5 mx-auto mb-2 opacity-15" />
        <p className="text-[10px] font-mono tracking-wider opacity-10">NATLEVA · PROPOSTA EXCLUSIVA</p>
      </footer>
    </div>
  );
}
