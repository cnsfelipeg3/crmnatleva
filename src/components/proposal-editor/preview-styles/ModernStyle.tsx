import { Plane, Clock, MapPin, Star, Zap, Train, Camera } from "lucide-react";
import AirlineLogo from "@/components/AirlineLogo";
import logoNatleva from "@/assets/logo-natleva-clean.png";
import { type StylePreviewProps, clickableClass, editOverlay } from "../TemplatePreview";

const heroImg = "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1920&h=1080&fit=crop&q=80";
const hotelImgs = [
  "https://images.unsplash.com/photo-1535827841776-24afc1e255ac?w=600&h=400&fit=crop&q=80",
  "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=600&h=400&fit=crop&q=80",
];

export function ModernStyle({ form, activePanel, onClickSection }: StylePreviewProps) {
  const tc = form.theme_config;
  const textCol = form.text_color || "#e5e5e5";
  const bgCol = form.bg_color || "#0a0a0a";
  const accentCol = form.accent_color || "#ff3366";
  const hFont = `'${form.font_heading}', sans-serif`;
  const bFont = `'${form.font_body}', sans-serif`;

  return (
    <div style={{ backgroundColor: bgCol, color: textCol }}>
      {/* HERO — Minimal dark */}
      <div className={clickableClass("layout", activePanel)} onClick={() => onClickSection("layout")}>
        {editOverlay("Editar layout")}
        <section className="relative h-[420px] overflow-hidden">
          <div className="absolute inset-0 bg-cover bg-center opacity-30" style={{ backgroundImage: `url(${heroImg})` }} />
          <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${bgCol} 0%, transparent 30%, ${bgCol} 100%)` }} />
          <div className="relative z-10 h-full flex flex-col justify-between p-10">
            <div className="flex items-center justify-between">
              <img src={logoNatleva} alt="NatLeva" className="h-6 opacity-50" />
              <span className="text-[9px] font-mono tracking-widest opacity-30" style={{ color: accentCol }}>2026.10.03</span>
            </div>
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1 h-8" style={{ backgroundColor: accentCol }} />
                <p className="text-[10px] tracking-[0.4em] uppercase opacity-40" style={{ fontFamily: bFont }}>Lucas Tanaka · 15 dias</p>
              </div>
              <h1 className="text-6xl font-black leading-[0.95] tracking-tighter mb-2" style={{ fontFamily: hFont }}>
                TOKYO<br />
                <span style={{ color: accentCol }}>KYOTO</span><br />
                OSAKA
              </h1>
              <p className="text-xs opacity-30 font-mono mt-4">03 — 18 de outubro de 2026</p>
            </div>
          </div>
        </section>
      </div>

      {/* FLIGHTS — Dark dashboard */}
      <section className="px-8 py-12">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-1 h-5" style={{ backgroundColor: accentCol }} />
          <h2 className="text-xl font-black tracking-tight uppercase" style={{ fontFamily: hFont }}>Voos</h2>
        </div>
        <div className="max-w-3xl mx-auto space-y-3">
          {[
            { airline: "NH", name: "ANA · All Nippon Airways", flight: "NH 6284", from: "GRU", fromCity: "Guarulhos T3", to: "NRT", toCity: "Narita T1", dep: "23:45", arr: "06:30", dur: "24h45", date: "03 OUT", cls: "BUSINESS", aircraft: "Boeing 787-9", next: "+1" },
            { airline: "JL", name: "Japan Airlines", flight: "JL 125", from: "NRT", fromCity: "Narita T2", to: "KIX", toCity: "Kansai T1", dep: "10:00", arr: "11:25", dur: "1h25", date: "12 OUT", cls: "PREMIUM ECO", aircraft: "Airbus A350" },
            { airline: "NH", name: "ANA · All Nippon Airways", flight: "NH 6283", from: "KIX", fromCity: "Kansai T1", to: "GRU", toCity: "Guarulhos T3", dep: "11:15", arr: "07:00", dur: "26h45", date: "18 OUT", cls: "BUSINESS", aircraft: "Boeing 777-300ER", next: "+1" },
          ].map((f, i) => (
            <div key={i} className="relative border overflow-hidden" style={{ borderColor: `${accentCol}15`, borderRadius: "0.75rem", backgroundColor: `${accentCol}05` }}>
              {/* Accent bar left */}
              <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: accentCol }} />
              <div className="pl-5 pr-5 py-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <AirlineLogo iata={f.airline} size={36} />
                    <div>
                      <p className="text-xs font-bold" style={{ fontFamily: hFont }}>{f.name}</p>
                      <p className="text-[10px] font-mono opacity-40">{f.flight} · {f.aircraft}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono px-2 py-1 rounded" style={{ backgroundColor: `${accentCol}15`, color: accentCol, fontWeight: 700 }}>{f.cls}</span>
                    <span className="text-[10px] font-mono opacity-40">{f.date}</span>
                  </div>
                </div>
                {/* Route — Dashboard style */}
                <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
                  <div>
                    <p className="text-4xl font-black font-mono tracking-tighter" style={{ color: textCol }}>{f.dep}</p>
                    <p className="text-lg font-black font-mono" style={{ color: accentCol }}>{f.from}</p>
                    <p className="text-[10px] font-mono opacity-30">{f.fromCity}</p>
                  </div>
                  <div className="flex flex-col items-center gap-2 px-4">
                    <div className="flex items-center w-20">
                      <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: accentCol }} />
                      <div className="flex-1 h-px mx-1" style={{ backgroundColor: `${accentCol}40` }} />
                      <Plane className="w-3.5 h-3.5 rotate-90" style={{ color: accentCol }} />
                      <div className="flex-1 h-px mx-1" style={{ backgroundColor: `${accentCol}40` }} />
                      <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: accentCol }} />
                    </div>
                    <span className="text-[10px] font-mono opacity-40 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {f.dur}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="flex items-baseline justify-end gap-1">
                      <p className="text-4xl font-black font-mono tracking-tighter" style={{ color: textCol }}>{f.arr}</p>
                      {f.next && <span className="text-xs font-bold" style={{ color: accentCol }}>{f.next}</span>}
                    </div>
                    <p className="text-lg font-black font-mono" style={{ color: accentCol }}>{f.to}</p>
                    <p className="text-[10px] font-mono opacity-30">{f.toCity}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* HOTELS — Dark grid */}
      <section className="px-8 py-12">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-1 h-5" style={{ backgroundColor: accentCol }} />
          <h2 className="text-xl font-black tracking-tight uppercase" style={{ fontFamily: hFont }}>Hospedagem</h2>
        </div>
        <div className="max-w-3xl mx-auto grid grid-cols-2 gap-4">
          {[
            { name: "Aman Tokyo", city: "Tokyo · Otemachi", stars: 5, nights: "9 noites", tags: ["Suite Deluxe", "Spa", "Onsen"], img: hotelImgs[0] },
            { name: "Park Hyatt Kyoto", city: "Kyoto · Higashiyama", stars: 5, nights: "4 noites", tags: ["Garden Suite", "Ryokan", "Tea Room"], img: hotelImgs[1] },
          ].map((h) => (
            <div key={h.name} className="border overflow-hidden" style={{ borderColor: `${accentCol}15`, borderRadius: "0.75rem" }}>
              <div className="h-40 relative overflow-hidden group">
                <img src={h.img} alt={h.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${bgCol} 0%, transparent 60%)` }} />
                <div className="absolute bottom-3 left-3 right-3">
                  <h3 className="font-black text-base" style={{ fontFamily: hFont }}>{h.name}</h3>
                  <p className="text-[10px] font-mono opacity-40 flex items-center gap-1"><MapPin className="w-3 h-3" /> {h.city}</p>
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex gap-0.5">{Array(h.stars).fill(0).map((_,i) => <Star key={i} className="w-3 h-3 fill-current" style={{ color: accentCol }} />)}</div>
                  <span className="text-[10px] font-mono" style={{ color: accentCol }}>{h.nights}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {h.tags.map(t => (
                    <span key={t} className="text-[9px] px-2 py-0.5 rounded font-mono" style={{ backgroundColor: `${accentCol}10`, color: `${accentCol}cc` }}>{t}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* EXPERIENCES — Numbered */}
      <section className="px-8 py-12">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-1 h-5" style={{ backgroundColor: accentCol }} />
          <h2 className="text-xl font-black tracking-tight uppercase" style={{ fontFamily: hFont }}>Experiências</h2>
        </div>
        <div className="max-w-2xl mx-auto space-y-4">
          {[
            { num: "01", title: "Cerimônia do Chá em Kyoto", desc: "Ritual milenar em casa de chá centenária com mestre certificado", icon: Camera },
            { num: "02", title: "Shibuya Night Tour", desc: "Exploração noturna de Tokyo com guia local por Shinjuku e Golden Gai", icon: Zap },
            { num: "03", title: "Shinkansen Experience", desc: "Viagem de trem-bala Tokyo → Kyoto a 320km/h com vista do Monte Fuji", icon: Train },
            { num: "04", title: "Fushimi Inari ao Amanhecer", desc: "Trilha exclusiva pelos mil torii vermelhos antes da abertura pública", icon: Camera },
          ].map((exp) => (
            <div key={exp.num} className="flex items-center gap-4 p-4 border" style={{ borderColor: `${accentCol}10`, borderRadius: "0.75rem", backgroundColor: `${accentCol}03` }}>
              <span className="text-3xl font-black font-mono shrink-0" style={{ color: `${accentCol}25` }}>{exp.num}</span>
              <div className="flex-1">
                <h4 className="font-bold text-sm" style={{ fontFamily: hFont }}>{exp.title}</h4>
                <p className="text-[10px] opacity-40 mt-0.5" style={{ fontFamily: bFont }}>{exp.desc}</p>
              </div>
              <exp.icon className="w-5 h-5 opacity-20 shrink-0" style={{ color: accentCol }} />
            </div>
          ))}
        </div>
      </section>

      {/* PRICING — Gradient border */}
      <section className="px-8 py-14">
        <div className="max-w-sm mx-auto text-center p-10 relative" style={{ borderRadius: "1rem" }}>
          {/* Gradient border effect */}
          <div className="absolute inset-0 rounded-[1rem]" style={{ background: `linear-gradient(135deg, ${accentCol}, ${form.primary_color})`, padding: "1px" }}>
            <div className="w-full h-full rounded-[calc(1rem-1px)]" style={{ backgroundColor: bgCol }} />
          </div>
          <div className="relative z-10">
            <Zap className="w-5 h-5 mx-auto mb-4" style={{ color: accentCol }} />
            <p className="text-[9px] uppercase tracking-[0.3em] opacity-30 mb-2 font-mono">Por pessoa</p>
            <p className="text-xl font-black" style={{ fontFamily: hFont }}>R$ 41.200,00</p>
            <div className="my-4 h-px" style={{ backgroundColor: `${accentCol}15` }} />
            <p className="text-[9px] uppercase tracking-[0.3em] opacity-30 mb-2 font-mono">Total · 1 passageiro</p>
            <p className="text-3xl font-black" style={{ fontFamily: hFont, color: accentCol }}>R$ 41.200,00</p>
            <p className="text-[10px] opacity-30 mt-3 font-mono">Business + Premium Eco · 15 dias · 2 cidades</p>
            <button className="mt-8 px-10 py-3 font-black text-sm tracking-wide text-white" style={{ backgroundColor: accentCol, borderRadius: "0.75rem", fontFamily: hFont }}>
              {tc.ctaText || "Iniciar Jornada"}
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-8 px-6 text-center" style={{ borderTop: `1px solid ${accentCol}10` }}>
        <img src={logoNatleva} alt="NatLeva" className="h-6 mx-auto mb-2 opacity-20" />
        <p className="text-[10px] font-mono tracking-wider opacity-15">NATLEVA · PROPOSTA EXCLUSIVA</p>
      </footer>
    </div>
  );
}
