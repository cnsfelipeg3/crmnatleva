import { useState } from "react";
import { Plane, Clock, MapPin, Star, Zap, Train, Camera, ChevronDown, Luggage, Utensils, Wifi, Shield, Calendar, CreditCard, Check, Users, Coffee } from "lucide-react";
import AirlineLogo from "@/components/AirlineLogo";
import logoNatleva from "@/assets/logo-natleva-clean.png";
import { type StylePreviewProps, clickableClass, editOverlay } from "../TemplatePreview";

const heroImg = "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1920&h=1080&fit=crop&q=80";
const hotelGallery1 = [
  "https://images.unsplash.com/photo-1535827841776-24afc1e255ac?w=600&h=400&fit=crop&q=80",
  "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&h=400&fit=crop&q=80",
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=400&fit=crop&q=80",
  "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=600&h=400&fit=crop&q=80",
];
const hotelGallery2 = [
  "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=600&h=400&fit=crop&q=80",
  "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600&h=400&fit=crop&q=80",
  "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=600&h=400&fit=crop&q=80",
];

const timeline = [
  { day: "01", date: "03 out", title: "São Paulo → Tóquio", desc: "Voo ANA Business via Houston · 24h45", type: "flight" },
  { day: "02", date: "04 out", title: "Chegada em Narita", desc: "Transfer ao hotel · Descanso · Exploração livre", type: "arrival" },
  { day: "03", date: "05 out", title: "Shibuya & Shinjuku", desc: "Crossing, Meiji Shrine, Golden Gai night tour", type: "explore" },
  { day: "04", date: "06 out", title: "Akihabara & Asakusa", desc: "Senso-ji, eletrônicos, ramen autêntico", type: "explore" },
  { day: "05", date: "07 out", title: "Tsukiji & TeamLab", desc: "Mercado de peixes, arte digital imersiva", type: "exp" },
  { day: "06", date: "08 out", title: "Day Trip: Hakone", desc: "Monte Fuji, onsen tradicional, trem panorâmico", type: "exp" },
  { day: "07-08", date: "09-10 out", title: "Tokyo Livre", desc: "Harajuku, Roppongi, Ginza, Odaiba", type: "explore" },
  { day: "09", date: "11 out", title: "Shinkansen → Kyoto", desc: "Trem-bala 320km/h · Vista Mt. Fuji · 2h14", type: "transfer" },
  { day: "10", date: "12 out", title: "Fushimi Inari", desc: "Mil torii vermelhos ao amanhecer exclusivo", type: "exp" },
  { day: "11", date: "13 out", title: "Arashiyama", desc: "Floresta de bambu, templo dourado, cerimônia do chá", type: "exp" },
  { day: "12", date: "14 out", title: "Nara Day Trip", desc: "Cervos sagrados, Grande Buda, mochi fresco", type: "explore" },
  { day: "13", date: "15 out", title: "Kyoto → Osaka", desc: "Trem local · Dotonbori · Street food tour", type: "transfer" },
  { day: "14", date: "16 out", title: "Osaka Castle & Food", desc: "Castelo, Shinsekai, takoyaki, okonomiyaki", type: "explore" },
  { day: "15", date: "17 out", title: "Retorno KIX → GRU", desc: "Voo ANA Business via Houston · 26h45", type: "flight" },
];

export function ModernStyle({ form, activePanel, onClickSection }: StylePreviewProps) {
  const [galleryIdx, setGalleryIdx] = useState(0);
  const [activeHotel, setActiveHotel] = useState(0);
  const [expandedFlight, setExpandedFlight] = useState<number | null>(0);
  const tc = form.theme_config;
  const textCol = form.text_color || "#e5e5e5";
  const bgCol = form.bg_color || "#0a0a0a";
  const accentCol = form.accent_color || "#ff3366";
  const hFont = `'${form.font_heading}', sans-serif`;
  const bFont = `'${form.font_body}', sans-serif`;

  const galleries = [hotelGallery1, hotelGallery2];
  const currentGallery = galleries[activeHotel];

  return (
    <div style={{ backgroundColor: bgCol, color: textCol }}>
      {/* HERO */}
      <div className={clickableClass("layout", activePanel)} onClick={() => onClickSection("layout")}>
        {editOverlay("Editar layout")}
        <section className="relative h-[420px] overflow-hidden">
          <div className="absolute inset-0 bg-cover bg-center opacity-30" style={{ backgroundImage: `url(${heroImg})` }} />
          <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${bgCol} 0%, transparent 30%, ${bgCol} 100%)` }} />
          <div className="relative z-10 h-full flex flex-col justify-between p-10">
            <div className="flex items-center justify-between">
              <img src={logoNatleva} alt="NatLeva" className="h-6 opacity-50" />
              <span className="text-[9px] font-mono tracking-widest opacity-30" style={{ color: accentCol }}>2026.10.03 — 2026.10.18</span>
            </div>
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1 h-8" style={{ backgroundColor: accentCol }} />
                <div>
                  <p className="text-[10px] tracking-[0.4em] uppercase opacity-40" style={{ fontFamily: bFont }}>Lucas Tanaka · 15 dias · 3 cidades</p>
                </div>
              </div>
              <h1 className="text-6xl font-black leading-[0.95] tracking-tighter mb-2" style={{ fontFamily: hFont }}>
                TOKYO<br /><span style={{ color: accentCol }}>KYOTO</span><br />OSAKA
              </h1>
              <div className="flex items-center gap-4 mt-4 text-xs opacity-30 font-mono">
                <span className="flex items-center gap-1"><Users className="w-3 h-3" /> 1 pax</span>
                <span>·</span>
                <span>Business Class</span>
                <span>·</span>
                <span>14 noites</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* OVERVIEW BAR */}
      <section className="px-8 py-4 flex items-center justify-between border-b" style={{ borderColor: `${accentCol}10` }}>
        {[
          { label: "DURAÇÃO", value: "15 DIAS" },
          { label: "CIDADES", value: "3" },
          { label: "VOOS", value: "3 TRECHOS" },
          { label: "HOTÉIS", value: "2" },
          { label: "ATIVIDADES", value: "10" },
          { label: "CLASSE", value: "BUSINESS" },
        ].map(item => (
          <div key={item.label} className="text-center">
            <p className="text-[8px] font-mono uppercase opacity-20">{item.label}</p>
            <p className="text-xs font-black mt-0.5 font-mono" style={{ fontFamily: hFont }}>{item.value}</p>
          </div>
        ))}
      </section>

      {/* TIMELINE */}
      <section className="px-8 py-12">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-1 h-5" style={{ backgroundColor: accentCol }} />
          <h2 className="text-xl font-black tracking-tight uppercase" style={{ fontFamily: hFont }}>Timeline</h2>
          <span className="text-[10px] font-mono opacity-30 ml-auto">15 dias · 3 cidades</span>
        </div>
        <div className="max-w-3xl mx-auto grid grid-cols-2 gap-x-6 gap-y-2">
          {timeline.map((item, i) => {
            const typeColors: Record<string, string> = { flight: accentCol, explore: "#a78bfa", exp: "#f472b6", transfer: "#60a5fa", arrival: "#34d399" };
            const col = typeColors[item.type] || accentCol;
            return (
              <div key={i} className="flex items-center gap-3 py-2 border-b" style={{ borderColor: `${accentCol}06` }}>
                <span className="text-lg font-black font-mono shrink-0 w-8" style={{ color: `${col}40` }}>{item.day}</span>
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: col }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate" style={{ fontFamily: hFont }}>{item.title}</p>
                  <p className="text-[9px] opacity-30 truncate">{item.desc}</p>
                </div>
                <span className="text-[8px] font-mono opacity-20 shrink-0">{item.date}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* DISTRIBUTION */}
      <section className="px-8 py-8">
        <div className="max-w-3xl mx-auto">
          <h3 className="text-sm font-black uppercase mb-4" style={{ fontFamily: hFont }}>Distribuição</h3>
          <div className="flex rounded-lg overflow-hidden h-4 mb-2" style={{ backgroundColor: `${accentCol}10` }}>
            <div className="h-full flex items-center justify-center text-[8px] font-mono text-white font-bold" style={{ width: "10%", backgroundColor: accentCol }}>GRU</div>
            <div className="h-full flex items-center justify-center text-[8px] font-mono" style={{ width: "50%", backgroundColor: `${accentCol}cc`, color: "white" }}>TOKYO · 8N</div>
            <div className="h-full flex items-center justify-center text-[8px] font-mono" style={{ width: "25%", backgroundColor: `${accentCol}88`, color: "white" }}>KYOTO · 3N</div>
            <div className="h-full flex items-center justify-center text-[8px] font-mono" style={{ width: "10%", backgroundColor: `${accentCol}55`, color: "white" }}>OSA</div>
            <div className="h-full" style={{ width: "5%", backgroundColor: `${accentCol}33` }} />
          </div>
        </div>
      </section>

      {/* FLIGHTS — Dark dashboard */}
      <section className="px-8 py-12">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-1 h-5" style={{ backgroundColor: accentCol }} />
          <h2 className="text-xl font-black tracking-tight uppercase" style={{ fontFamily: hFont }}>Voos</h2>
          <span className="text-[10px] font-mono opacity-30 ml-auto">3 trechos · ANA + JAL</span>
        </div>
        <div className="max-w-3xl mx-auto space-y-3">
          {[
            { airline: "NH", name: "ANA · All Nippon Airways", flight: "NH 6284", from: "GRU", fromCity: "Guarulhos T3", to: "NRT", toCity: "Narita T1", dep: "23:45", arr: "06:30", dur: "24h45", date: "03 OUT", cls: "BUSINESS", aircraft: "Boeing 787-9 Dreamliner", next: "+1", bag: "2×32kg", bagHand: "1×10kg", meal: "Jantar + Café + Almoço", seat: "THE Room (lie-flat 180°)", wifi: true, conn: "Escala IAH · 3h15" },
            { airline: "JL", name: "Japan Airlines", flight: "JL 125", from: "NRT", fromCity: "Narita T2", to: "KIX", toCity: "Kansai T1", dep: "10:00", arr: "11:25", dur: "1h25", date: "12 OUT", cls: "PREMIUM ECO", aircraft: "Airbus A350-900", bag: "2×23kg", bagHand: "1×10kg", meal: "Snack premium", seat: "38\" pitch", wifi: true },
            { airline: "NH", name: "ANA · All Nippon Airways", flight: "NH 6283", from: "KIX", fromCity: "Kansai T1", to: "GRU", toCity: "Guarulhos T3", dep: "11:15", arr: "07:00", dur: "26h45", date: "18 OUT", cls: "BUSINESS", aircraft: "Boeing 777-300ER", next: "+1", bag: "2×32kg", bagHand: "1×10kg", meal: "Almoço + Jantar + Café", seat: "THE Room (lie-flat 180°)", wifi: true, conn: "Escala IAH · 4h20" },
          ].map((f, i) => (
            <div key={i} className="relative border overflow-hidden cursor-pointer" style={{ borderColor: `${accentCol}15`, borderRadius: "0.75rem", backgroundColor: `${accentCol}05` }} onClick={() => setExpandedFlight(expandedFlight === i ? null : i)}>
              <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: accentCol }} />
              <div className="pl-5 pr-5 py-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <AirlineLogo iata={f.airline} size={36} />
                    <div>
                      <p className="text-xs font-bold" style={{ fontFamily: hFont }}>{f.name}</p>
                      <p className="text-[10px] font-mono opacity-30">{f.flight} · {f.aircraft}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono px-2 py-1 rounded" style={{ backgroundColor: `${accentCol}15`, color: accentCol, fontWeight: 700 }}>{f.cls}</span>
                    <span className="text-[10px] font-mono opacity-30">{f.date}</span>
                    <ChevronDown className={`w-4 h-4 opacity-20 transition-transform ${expandedFlight === i ? "rotate-180" : ""}`} />
                  </div>
                </div>
                {f.conn && (
                  <div className="mb-3 px-3 py-1.5 rounded text-[10px] font-mono flex items-center gap-2" style={{ backgroundColor: `${accentCol}08`, color: `${accentCol}aa` }}>
                    <Clock className="w-3 h-3" /> {f.conn}
                  </div>
                )}
                <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
                  <div>
                    <p className="text-4xl font-black font-mono tracking-tighter">{f.dep}</p>
                    <p className="text-lg font-black font-mono" style={{ color: accentCol }}>{f.from}</p>
                    <p className="text-[10px] font-mono opacity-25">{f.fromCity}</p>
                  </div>
                  <div className="flex flex-col items-center gap-2 px-4">
                    <div className="flex items-center w-20">
                      <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: accentCol }} />
                      <div className="flex-1 h-px mx-1" style={{ backgroundColor: `${accentCol}40` }} />
                      <Plane className="w-3.5 h-3.5 rotate-90" style={{ color: accentCol }} />
                      <div className="flex-1 h-px mx-1" style={{ backgroundColor: `${accentCol}40` }} />
                      <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: accentCol }} />
                    </div>
                    <span className="text-[10px] font-mono opacity-30 flex items-center gap-1"><Clock className="w-3 h-3" /> {f.dur}</span>
                  </div>
                  <div className="text-right">
                    <div className="flex items-baseline justify-end gap-1">
                      <p className="text-4xl font-black font-mono tracking-tighter">{f.arr}</p>
                      {f.next && <span className="text-xs font-bold" style={{ color: accentCol }}>{f.next}</span>}
                    </div>
                    <p className="text-lg font-black font-mono" style={{ color: accentCol }}>{f.to}</p>
                    <p className="text-[10px] font-mono opacity-25">{f.toCity}</p>
                  </div>
                </div>

                {/* Expanded details */}
                {expandedFlight === i && (
                  <div className="mt-4 pt-4 border-t grid grid-cols-4 gap-3" style={{ borderColor: `${accentCol}10` }}>
                    <div>
                      <p className="text-[8px] font-mono uppercase opacity-20">DESP.</p>
                      <p className="text-[10px] font-mono mt-0.5 flex items-center gap-1"><Luggage className="w-3 h-3" style={{ color: accentCol }} /> {f.bag}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-mono uppercase opacity-20">MÃO</p>
                      <p className="text-[10px] font-mono mt-0.5">{f.bagHand}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-mono uppercase opacity-20">REFEIÇÃO</p>
                      <p className="text-[10px] font-mono mt-0.5 flex items-center gap-1"><Utensils className="w-3 h-3" style={{ color: accentCol }} /> {f.meal}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-mono uppercase opacity-20">WI-FI</p>
                      <p className="text-[10px] font-mono mt-0.5 flex items-center gap-1"><Wifi className="w-3 h-3" style={{ color: f.wifi ? accentCol : `${textCol}20` }} /> {f.wifi ? "Free" : "N/A"}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[8px] font-mono uppercase opacity-20">ASSENTO</p>
                      <p className="text-[10px] font-mono mt-0.5">{f.seat}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[8px] font-mono uppercase opacity-20">AERONAVE</p>
                      <p className="text-[10px] font-mono mt-0.5">{f.aircraft}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          {/* Baggage summary */}
          <div className="flex items-center gap-4 p-3 rounded-lg border" style={{ borderColor: `${accentCol}10` }}>
            <Luggage className="w-4 h-4" style={{ color: accentCol }} />
            <p className="text-[10px] font-mono opacity-40">Total bagagem: 2×32kg desp. + 1×10kg mão por trecho · <span style={{ color: accentCol }}>✓ Incluído</span></p>
          </div>
          {/* Shinkansen bonus */}
          <div className="p-4 rounded-lg border" style={{ borderColor: `${accentCol}15`, backgroundColor: `${accentCol}05` }}>
            <div className="flex items-center gap-3 mb-2">
              <Train className="w-5 h-5" style={{ color: accentCol }} />
              <div>
                <p className="text-xs font-black" style={{ fontFamily: hFont }}>SHINKANSEN · BÔNUS INCLUÍDO</p>
                <p className="text-[10px] font-mono opacity-30">Tokyo → Kyoto · Nozomi N700S · 2h14 · 320km/h</p>
              </div>
            </div>
            <p className="text-[10px] opacity-30 ml-8">Assento reservado na Green Car (1ª classe) · Vista do Monte Fuji pelo lado E · Japan Rail Pass 7 dias incluído</p>
          </div>
        </div>
      </section>

      {/* HOTELS — Dark grid with gallery */}
      <section className="px-8 py-12">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-1 h-5" style={{ backgroundColor: accentCol }} />
          <h2 className="text-xl font-black tracking-tight uppercase" style={{ fontFamily: hFont }}>Hospedagem</h2>
        </div>
        {/* Hotel tabs */}
        <div className="max-w-3xl mx-auto">
          <div className="flex gap-2 mb-4">
            {["Aman Tokyo", "Park Hyatt Kyoto"].map((name, idx) => (
              <button key={name} className="px-4 py-2 rounded-lg text-xs font-bold transition-all" style={{
                backgroundColor: activeHotel === idx ? `${accentCol}20` : `${accentCol}05`,
                color: activeHotel === idx ? accentCol : `${textCol}55`,
                border: `1px solid ${activeHotel === idx ? accentCol : `${accentCol}10`}`,
                fontFamily: hFont,
              }} onClick={() => { setActiveHotel(idx); setGalleryIdx(0); }}>{name}</button>
            ))}
          </div>

          {/* Gallery */}
          <div className="rounded-xl overflow-hidden h-[250px] relative mb-2">
            <img src={currentGallery[galleryIdx]} alt="Hotel" className="w-full h-full object-cover transition-all duration-500" />
            <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${bgCol} 0%, transparent 40%)` }} />
            <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm text-white text-[10px] px-2.5 py-1 rounded-full flex items-center gap-1.5">
              <Camera className="w-3 h-3" /> {galleryIdx + 1}/{currentGallery.length}
            </div>
            <div className="absolute bottom-4 left-4 right-4">
              <h3 className="font-black text-lg" style={{ fontFamily: hFont }}>{["Aman Tokyo", "Park Hyatt Kyoto"][activeHotel]}</h3>
              <p className="text-[10px] font-mono opacity-40 flex items-center gap-1"><MapPin className="w-3 h-3" /> {["Tokyo · Otemachi", "Kyoto · Higashiyama"][activeHotel]}</p>
            </div>
          </div>
          <div className="flex gap-1.5 mb-4">
            {currentGallery.map((img, j) => (
              <div key={j} className="flex-1 h-14 rounded-lg overflow-hidden cursor-pointer border-2 transition-all" style={{ borderColor: galleryIdx === j ? accentCol : "transparent", opacity: galleryIdx === j ? 1 : 0.4 }} onClick={() => setGalleryIdx(j)}>
                <img src={img} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>

          {/* Hotel details */}
          <div className="grid grid-cols-2 gap-3">
            {[
              [
                { stars: 5, nights: "9 noites", room: "Premier Room", regime: "Café da manhã", checkin: "04 out · 15h", checkout: "12 out · 12h", amenities: ["Spa & Onsen", "Fitness 24h", "Lobby lounge", "Concierge", "Room service", "Lavanderia express"] },
              ],
              [
                { stars: 5, nights: "3 noites", room: "Garden Suite", regime: "Café da manhã kaiseki", checkin: "12 out · 15h", checkout: "15 out · 11h", amenities: ["Jardim zen privativo", "Ryokan spa", "Tea ceremony room", "Kyoto concierge", "Bicicletas"] },
              ],
            ][activeHotel].map((h, idx) => (
              <div key={idx} className="col-span-2 p-4 rounded-lg border" style={{ borderColor: `${accentCol}10` }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-0.5">{Array(h.stars).fill(0).map((_, j) => <Star key={j} className="w-3 h-3 fill-current" style={{ color: accentCol }} />)}</div>
                    <span className="text-[10px] font-mono" style={{ color: accentCol }}>{h.nights}</span>
                  </div>
                  <span className="text-[10px] font-mono opacity-30">{h.room}</span>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div><p className="text-[8px] font-mono uppercase opacity-20">CHECK-IN</p><p className="text-[10px] font-mono mt-0.5">{h.checkin}</p></div>
                  <div><p className="text-[8px] font-mono uppercase opacity-20">CHECK-OUT</p><p className="text-[10px] font-mono mt-0.5">{h.checkout}</p></div>
                  <div><p className="text-[8px] font-mono uppercase opacity-20">REGIME</p><p className="text-[10px] font-mono mt-0.5">{h.regime}</p></div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {h.amenities.map(a => (
                    <span key={a} className="text-[9px] px-2 py-0.5 rounded font-mono flex items-center gap-1" style={{ backgroundColor: `${accentCol}08`, color: `${accentCol}aa` }}>
                      <Check className="w-2.5 h-2.5" /> {a}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* EXPERIENCES */}
      <section className="px-8 py-12">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-1 h-5" style={{ backgroundColor: accentCol }} />
          <h2 className="text-xl font-black tracking-tight uppercase" style={{ fontFamily: hFont }}>Experiências</h2>
        </div>
        <div className="max-w-3xl mx-auto grid grid-cols-2 gap-3">
          {[
            { num: "01", title: "Cerimônia do Chá", desc: "Ritual milenar em casa de chá centenária de Uji com mestre certificado. Inclui matcha premium e wagashi.", dur: "2h", when: "10:00", included: true },
            { num: "02", title: "Shibuya Night Tour", desc: "Exploração noturna por Shinjuku Golden Gai, Memory Lane e kabukicho com guia local bilíngue.", dur: "4h", when: "19:00", included: true },
            { num: "03", title: "Fushimi Inari Sunrise", desc: "Trilha exclusiva pelos 10.000 torii vermelhos ao amanhecer, antes dos turistas. Guia fotógrafo.", dur: "3h", when: "05:30", included: true },
            { num: "04", title: "Hakone Day Trip", desc: "Monte Fuji, cruzeiro no lago Ashi, teleférico Owakudani e onsen tradicional ryokan.", dur: "Dia", when: "07:00", included: true },
            { num: "05", title: "Cooking Class", desc: "Aula de ramen artesanal em workshop de chef estrela Michelin no bairro de Ebisu.", dur: "3h", when: "11:00", included: false },
            { num: "06", title: "TeamLab Borderless", desc: "Arte digital imersiva no museu interativo mais famoso do mundo. Ingresso VIP sem fila.", dur: "2h", when: "16:00", included: true },
          ].map((exp) => (
            <div key={exp.num} className="flex items-center gap-3 p-4 border rounded-lg" style={{ borderColor: `${accentCol}10`, backgroundColor: `${accentCol}03` }}>
              <span className="text-2xl font-black font-mono shrink-0" style={{ color: `${accentCol}20` }}>{exp.num}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h4 className="font-bold text-sm truncate" style={{ fontFamily: hFont }}>{exp.title}</h4>
                  {exp.included ? (
                    <span className="text-[8px] px-1.5 py-0.5 rounded shrink-0" style={{ backgroundColor: `${accentCol}15`, color: accentCol }}>✓</span>
                  ) : (
                    <span className="text-[8px] px-1.5 py-0.5 rounded opacity-30 shrink-0">OPC</span>
                  )}
                </div>
                <p className="text-[9px] opacity-30 leading-relaxed" style={{ fontFamily: bFont }}>{exp.desc}</p>
                <div className="flex items-center gap-2 mt-1 text-[9px] opacity-20 font-mono">
                  <span><Clock className="w-3 h-3 inline" /> {exp.dur}</span>
                  <span>· {exp.when}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* INFO */}
      <section className="px-8 py-10" style={{ backgroundColor: `${accentCol}05` }}>
        <div className="max-w-3xl mx-auto grid grid-cols-4 gap-3">
          {[
            { icon: Shield, title: "Seguro", desc: "USD 100k cobertura Asia" },
            { icon: Calendar, title: "Validade", desc: "7 dias · Cancelamento 45d" },
            { icon: Luggage, title: "Bagagem", desc: "Incluída em todos trechos" },
            { icon: CreditCard, title: "Pagamento", desc: "10× ou PIX -5%" },
          ].map(info => (
            <div key={info.title} className="p-3 rounded-lg border text-center" style={{ borderColor: `${accentCol}08` }}>
              <info.icon className="w-4 h-4 mx-auto mb-1.5" style={{ color: accentCol }} />
              <p className="text-[10px] font-black" style={{ fontFamily: hFont }}>{info.title}</p>
              <p className="text-[9px] opacity-25 mt-0.5">{info.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section className="px-8 py-14">
        <div className="max-w-sm mx-auto text-center p-8 relative" style={{ borderRadius: "1rem" }}>
          <div className="absolute inset-0 rounded-[1rem]" style={{ background: `linear-gradient(135deg, ${accentCol}, ${form.primary_color})`, padding: "1px" }}>
            <div className="w-full h-full rounded-[calc(1rem-1px)]" style={{ backgroundColor: bgCol }} />
          </div>
          <div className="relative z-10">
            <Zap className="w-5 h-5 mx-auto mb-4" style={{ color: accentCol }} />
            <h2 className="text-xl font-black mb-4 uppercase" style={{ fontFamily: hFont }}>Investimento</h2>

            {/* Breakdown */}
            <div className="text-left mb-4 space-y-1">
              {[
                { item: "Aéreo Business ANA (1 pax)", value: "R$ 18.900" },
                { item: "Aman Tokyo · 9 noites", value: "R$ 13.500" },
                { item: "Park Hyatt Kyoto · 3 noites", value: "R$ 5.400" },
                { item: "JR Pass + Shinkansen Green", value: "R$ 1.800" },
                { item: "Experiências (5 incluídas)", value: "R$ 1.600" },
              ].map(line => (
                <div key={line.item} className="flex justify-between py-1 border-b font-mono" style={{ borderColor: `${accentCol}08` }}>
                  <span className="text-[9px] opacity-30">{line.item}</span>
                  <span className="text-[9px] font-semibold">{line.value}</span>
                </div>
              ))}
            </div>

            <p className="text-[9px] uppercase tracking-[0.3em] opacity-20 mb-2 font-mono">Total · 1 passageiro</p>
            <p className="text-3xl font-black" style={{ fontFamily: hFont, color: accentCol }}>R$ 41.200,00</p>
            <p className="text-[10px] opacity-20 mt-2 font-mono">10× R$ 4.120 ou PIX R$ 39.140</p>
            <button className="mt-6 px-10 py-3 font-black text-sm tracking-wide text-white" style={{ backgroundColor: accentCol, borderRadius: "0.75rem", fontFamily: hFont }}>
              {tc.ctaText || "Iniciar Jornada"}
            </button>
            <p className="text-[9px] mt-3 opacity-10 font-mono">Válida 7 dias · Sujeita a disponibilidade</p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-8 px-6 text-center" style={{ borderTop: `1px solid ${accentCol}08` }}>
        <img src={logoNatleva} alt="NatLeva" className="h-6 mx-auto mb-2 opacity-15" />
        <p className="text-[10px] font-mono tracking-wider opacity-10">NATLEVA · PROPOSTA EXCLUSIVA</p>
      </footer>
    </div>
  );
}
