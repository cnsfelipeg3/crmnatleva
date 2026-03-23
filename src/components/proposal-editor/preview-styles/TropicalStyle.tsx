import { Plane, Clock, MapPin, Star, Sun, Waves, Shell, Fish } from "lucide-react";
import AirlineLogo from "@/components/AirlineLogo";
import logoNatleva from "@/assets/logo-natleva-clean.png";
import { type StylePreviewProps, clickableClass, editOverlay, getRadius, getShadow } from "../TemplatePreview";

const heroImg = "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=1920&h=1080&fit=crop&q=80";
const villaImg = "https://images.unsplash.com/photo-1573843981267-be1999ff37cd?w=900&h=600&fit=crop&q=80";
const expImgs = [
  "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&h=400&fit=crop&q=80",
  "https://images.unsplash.com/photo-1540202404-a2f29016b523?w=600&h=400&fit=crop&q=80",
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&h=400&fit=crop&q=80",
];

export function TropicalStyle({ form, activePanel, onClickSection }: StylePreviewProps) {
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
      {/* HERO — Classic with wave bottom */}
      <div className={clickableClass("layout", activePanel)} onClick={() => onClickSection("layout")}>
        {editOverlay("Editar layout")}
        <section className="relative h-[480px] overflow-hidden">
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${heroImg})` }} />
          <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, transparent 50%, ${primaryCol}99 80%, ${primaryCol} 100%)` }} />
          {/* Wave SVG at bottom */}
          <svg className="absolute bottom-0 left-0 right-0 w-full" viewBox="0 0 1440 80" fill="none" preserveAspectRatio="none" style={{ height: "60px" }}>
            <path d="M0,40 C360,80 720,0 1080,40 C1260,60 1380,50 1440,40 L1440,80 L0,80 Z" fill={bgCol} />
          </svg>
          <div className="absolute top-6 w-full text-center z-10">
            <img src={logoNatleva} alt="NatLeva" className="h-10 mx-auto drop-shadow-lg opacity-80" />
          </div>
          <div className="absolute bottom-16 left-0 right-0 text-center z-10">
            <p className="text-[10px] tracking-[0.4em] uppercase text-white/50 mb-3" style={{ fontFamily: bFont }}>
              Família Santos · 13 dias
            </p>
            <h1 className="text-5xl font-bold text-white leading-tight mb-2" style={{ fontFamily: hFont, letterSpacing: "-0.02em" }}>
              Maldivas
            </h1>
            <p className="text-lg italic text-white/70" style={{ fontFamily: hFont }}>Overwater Paradise</p>
            <div className="flex items-center justify-center gap-4 mt-4 text-white/40 text-xs" style={{ fontFamily: bFont }}>
              <span className="flex items-center gap-1"><Sun className="w-3.5 h-3.5" /> 30°C</span>
              <span className="flex items-center gap-1"><Waves className="w-3.5 h-3.5" /> 28°C água</span>
              <span>20 dez — 02 jan</span>
            </div>
          </div>
        </section>
      </div>

      {/* INTRO */}
      <div className={clickableClass("fonts", activePanel)} onClick={() => onClickSection("fonts")}>
        {editOverlay("Editar tipografia")}
        <section className="max-w-xl mx-auto px-8 py-14 text-center">
          <Waves className="w-6 h-6 mx-auto mb-4 opacity-20" style={{ color: accentCol }} />
          <p className="text-base leading-relaxed" style={{ fontFamily: hFont, color: `${textCol}88` }}>
            Águas cristalinas, areias brancas infinitas e o luxo de acordar sobre o oceano. Uma experiência de férias inesquecível para toda a família.
          </p>
          <Waves className="w-6 h-6 mx-auto mt-4 opacity-20 rotate-180" style={{ color: accentCol }} />
        </section>
      </div>

      {/* FLIGHTS — Clean cards with colored top stripe */}
      <section className="px-8 py-12" style={{ backgroundColor: `${accentCol}06` }}>
        <h2 className="text-center text-2xl font-bold mb-2 tracking-tight" style={{ fontFamily: hFont, color: textCol }}>Voos</h2>
        <p className="text-center text-xs mb-8" style={{ color: `${textCol}44`, fontFamily: bFont }}>Ida e volta com conforto premium</p>
        <div className="max-w-3xl mx-auto space-y-4">
          {[
            { dir: "IDA", airline: "QR", name: "Qatar Airways", flight: "QR 773", from: "GRU", fromCity: "São Paulo", to: "DOH", toCity: "Doha", dep: "23:15", arr: "17:40", dur: "14h25", date: "20 dez 2026", cls: "Business", bag: "2×32kg" },
            { dir: "CONEXÃO", airline: "QR", name: "Qatar Airways", flight: "QR 672", from: "DOH", fromCity: "Doha", to: "MLE", toCity: "Malé", dep: "02:10", arr: "09:30", dur: "4h20", date: "21 dez 2026", cls: "Business", bag: "2×32kg" },
            { dir: "VOLTA", airline: "QR", name: "Qatar Airways", flight: "QR 673", from: "MLE", fromCity: "Malé", to: "GRU", toCity: "São Paulo", dep: "16:45", arr: "07:30", dur: "20h45", date: "02 jan 2027", cls: "Business", bag: "2×32kg" },
          ].map((f, i) => (
            <div key={i} className="overflow-hidden bg-white" style={{ borderRadius: "1.25rem", boxShadow: "0 4px 24px rgba(0,60,60,0.08)" }}>
              {/* Colored top stripe */}
              <div className="h-1.5" style={{ background: `linear-gradient(to right, ${accentCol}, ${primaryCol})` }} />
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <AirlineLogo iata={f.airline} size={38} />
                    <div>
                      <p className="text-xs font-semibold" style={{ fontFamily: hFont, color: textCol }}>{f.name}</p>
                      <p className="text-[10px] font-mono" style={{ color: `${textCol}55` }}>{f.flight}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: `${accentCol}12`, color: accentCol }}>{f.dir}</span>
                    <span className="text-[10px]" style={{ color: `${textCol}55` }}>{f.date}</span>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div>
                    <p className="text-3xl font-bold" style={{ fontFamily: hFont, color: textCol }}>{f.dep}</p>
                    <p className="text-lg font-bold" style={{ color: accentCol }}>{f.from}</p>
                    <p className="text-[10px]" style={{ color: `${textCol}55` }}>{f.fromCity}</p>
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
                    <div className="flex items-center gap-3 text-[10px]" style={{ color: `${textCol}55` }}>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {f.dur}</span>
                      <span>·</span>
                      <span>{f.cls}</span>
                      <span>·</span>
                      <span>{f.bag}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold" style={{ fontFamily: hFont, color: textCol }}>{f.arr}</p>
                    <p className="text-lg font-bold" style={{ color: accentCol }}>{f.to}</p>
                    <p className="text-[10px]" style={{ color: `${textCol}55` }}>{f.toCity}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* HOTEL — Rounded card with badge */}
      <section className="px-8 py-14">
        <h2 className="text-center text-2xl font-bold mb-8 tracking-tight" style={{ fontFamily: hFont, color: textCol }}>Seu Resort</h2>
        <div className="max-w-3xl mx-auto bg-white overflow-hidden" style={{ borderRadius: "1.5rem", boxShadow: "0 8px 40px rgba(0,60,60,0.1)" }}>
          <div className="relative h-[260px]">
            <img src={villaImg} alt="Soneva Fushi" className="w-full h-full object-cover" />
            {/* Floating badge */}
            <div className="absolute top-4 right-4 px-3 py-1.5 rounded-full text-white text-[10px] font-bold flex items-center gap-1.5" style={{ backgroundColor: accentCol }}>
              <Star className="w-3 h-3 fill-white" /> #1 Maldives
            </div>
          </div>
          <div className="p-8">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold mb-1" style={{ fontFamily: hFont, color: textCol }}>Soneva Fushi</h3>
                <p className="text-xs flex items-center gap-1 mb-2" style={{ color: `${textCol}55` }}>
                  <MapPin className="w-3.5 h-3.5" style={{ color: accentCol }} /> Baa Atoll, Maldivas
                </p>
                <div className="flex gap-0.5 mb-4">{[1,2,3,4,5].map(i => <Star key={i} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />)}</div>
                <p className="text-xs leading-relaxed max-w-md" style={{ color: `${textCol}66`, fontFamily: bFont }}>
                  Water Villa com 250m², deck privativo sobre a lagoa, tobogã direto para o oceano e butler dedicado 24h.
                </p>
              </div>
              <div className="text-center shrink-0 ml-8 p-4 rounded-xl" style={{ backgroundColor: `${accentCol}08` }}>
                <p className="text-[9px] uppercase tracking-wider" style={{ color: `${textCol}55` }}>Diárias</p>
                <p className="text-2xl font-bold" style={{ fontFamily: hFont, color: accentCol }}>12</p>
                <p className="text-[9px] mt-1" style={{ color: `${textCol}44` }}>noites</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-5 pt-4" style={{ borderTop: `1px solid ${accentCol}15` }}>
              {["Overwater Villa", "All Inclusive", "Spa ilimitado", "Mergulho", "Butler 24h", "Kids Club"].map(tag => (
                <span key={tag} className="text-[10px] px-3 py-1 rounded-full" style={{ backgroundColor: `${accentCol}10`, color: primaryCol, fontFamily: bFont }}>{tag}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* EXPERIENCES — Image cards */}
      <section className="px-8 py-12" style={{ backgroundColor: `${accentCol}06` }}>
        <h2 className="text-center text-2xl font-bold mb-8 tracking-tight" style={{ fontFamily: hFont, color: textCol }}>Experiências</h2>
        <div className="max-w-3xl mx-auto grid grid-cols-3 gap-5">
          {[
            { title: "Snorkeling Bioluminescente", desc: "Mergulho noturno com plâncton fluorescente", icon: Fish, img: expImgs[0] },
            { title: "Dolphin Cruise ao Sunset", desc: "Navegação com golfinhos ao entardecer", icon: Shell, img: expImgs[1] },
            { title: "Sandbank Privativo", desc: "Piquenique gourmet em banco de areia exclusivo", icon: Sun, img: expImgs[2] },
          ].map((exp) => (
            <div key={exp.title} className="bg-white overflow-hidden" style={{ borderRadius: "1.25rem", boxShadow: "0 4px 20px rgba(0,60,60,0.06)" }}>
              <div className="h-32 overflow-hidden relative">
                <img src={exp.img} alt={exp.title} className="w-full h-full object-cover" />
                <div className="absolute bottom-2 left-2 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center">
                  <exp.icon className="w-4 h-4" style={{ color: accentCol }} />
                </div>
              </div>
              <div className="p-4">
                <h4 className="font-bold text-sm mb-1" style={{ fontFamily: hFont, color: textCol }}>{exp.title}</h4>
                <p className="text-[10px]" style={{ color: `${textCol}55`, fontFamily: bFont }}>{exp.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING — Gradient card */}
      <section className="px-8 py-16">
        <div className="max-w-md mx-auto text-center p-10 text-white" style={{ borderRadius: "1.5rem", background: `linear-gradient(135deg, ${primaryCol}, ${accentCol})`, boxShadow: `0 8px 40px ${accentCol}30` }}>
          <Sun className="w-6 h-6 mx-auto mb-4 opacity-50" />
          <p className="text-[9px] uppercase tracking-[0.3em] opacity-50 mb-2" style={{ fontFamily: bFont }}>Por pessoa</p>
          <p className="text-2xl font-bold" style={{ fontFamily: hFont }}>R$ 47.800,00</p>
          <div className="my-5 h-px bg-white/15" />
          <p className="text-[9px] uppercase tracking-[0.3em] opacity-50 mb-2" style={{ fontFamily: bFont }}>Família · 2 adultos + 2 crianças</p>
          <p className="text-4xl font-bold" style={{ fontFamily: hFont }}>R$ 163.200,00</p>
          <p className="text-[10px] opacity-40 mt-3">Business class · 12 noites · All inclusive · Kids free</p>
          <button className="mt-8 px-10 py-3.5 font-bold text-sm tracking-wide bg-white" style={{ color: primaryCol, borderRadius: "2rem", fontFamily: hFont }}>
            {tc.ctaText || "Embarcar no Paraíso"}
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-8 px-6 text-center" style={{ borderTop: `1px solid ${accentCol}15` }}>
        <img src={logoNatleva} alt="NatLeva" className="h-8 mx-auto mb-2 opacity-40" />
        <p className="text-[10px] tracking-wider" style={{ color: `${textCol}30`, fontFamily: bFont }}>Proposta exclusiva · NatLeva Viagens</p>
      </footer>
    </div>
  );
}
