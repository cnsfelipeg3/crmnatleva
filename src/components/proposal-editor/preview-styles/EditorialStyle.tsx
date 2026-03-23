import { Plane, Clock, MapPin, Star, Luggage } from "lucide-react";
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

export function EditorialStyle({ form, activePanel, onClickSection }: StylePreviewProps) {
  const tc = form.theme_config;
  const textCol = form.text_color || "#1a1a1a";
  const bgCol = form.bg_color || "#faf8f5";
  const radius = getRadius(tc.borderRadius);
  const shadow = getShadow(tc.shadowIntensity);
  const hFont = `'${form.font_heading}', serif`;
  const bFont = `'${form.font_body}', sans-serif`;

  return (
    <div style={{ backgroundColor: bgCol }}>
      {/* HERO — Cinematic full-bleed */}
      <div className={clickableClass("layout", activePanel)} onClick={() => onClickSection("layout")}>
        {editOverlay("Editar layout")}
        <section className="relative h-[480px] overflow-hidden">
          <div className="absolute inset-0 bg-cover bg-center scale-105" style={{ backgroundImage: `url(${heroImg})` }} />
          <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, transparent 20%, ${form.primary_color}dd 70%, ${form.primary_color} 100%)` }} />
          {/* Film grain overlay */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg viewBox=\"0 0 200 200\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cfilter id=\"noise\"%3E%3CfeTurbulence type=\"fractalNoise\" baseFrequency=\"0.9\" /%3E%3C/filter%3E%3Crect width=\"100%25\" height=\"100%25\" filter=\"url(%23noise)\" /%3E%3C/svg%3E')" }} />
          <div className="absolute top-6 left-8 z-10">
            <img src={logoNatleva} alt="NatLeva" className="h-8 drop-shadow-lg opacity-80" />
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-10 z-10">
            <p className="text-[10px] tracking-[0.4em] uppercase text-white/50 mb-3" style={{ fontFamily: bFont }}>
              Proposta exclusiva para
            </p>
            <p className="text-sm text-white/70 mb-1 tracking-widest uppercase" style={{ fontFamily: bFont }}>
              Alexandre & Beatriz Montenegro
            </p>
            <h1 className="text-5xl font-bold text-white leading-[1.1] mb-4" style={{ fontFamily: hFont, letterSpacing: "-0.03em" }}>
              Safari de Luxo
            </h1>
            <div className="flex items-center gap-3 text-white/50 text-xs" style={{ fontFamily: bFont }}>
              <span>Tanzânia & Zanzibar</span>
              <span className="w-1 h-1 rounded-full bg-white/30" />
              <span>14 noites</span>
              <span className="w-1 h-1 rounded-full bg-white/30" />
              <span>10 — 24 de agosto de 2026</span>
            </div>
          </div>
        </section>
      </div>

      {/* INTRO — Editorial quote */}
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

      {/* DESTINATIONS — Magazine grid */}
      <div className={clickableClass("sections", activePanel)} onClick={() => onClickSection("sections")}>
        {editOverlay("Editar seções")}
        <section className="px-8 pb-14">
          <h2 className="text-center text-3xl font-bold mb-2 tracking-tight" style={{ fontFamily: hFont, color: textCol }}>Seus Destinos</h2>
          <p className="text-center text-xs mb-8" style={{ color: `${textCol}55`, fontFamily: bFont }}>Três cenários extraordinários em uma única jornada</p>
          <div className="max-w-4xl mx-auto grid grid-cols-3 gap-4">
            {["Serengeti", "Ngorongoro", "Zanzibar"].map((dest, i) => (
              <div key={dest} className="relative overflow-hidden group" style={{ borderRadius: radius, height: "220px" }}>
                <img src={destImgs[i]} alt={dest} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${form.primary_color}ee 0%, transparent 60%)` }} />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <p className="text-[9px] tracking-[0.3em] uppercase text-white/40 mb-1" style={{ fontFamily: bFont }}>Destino {String(i + 1).padStart(2, "0")}</p>
                  <h3 className="text-lg font-bold text-white" style={{ fontFamily: hFont }}>{dest}</h3>
                  <p className="text-[10px] text-white/50 mt-1">{["5 noites · Big Five", "2 noites · Cratera", "5 noites · Praias"][i]}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* FLIGHTS — Boarding Pass Style */}
      <section className="px-8 py-14" style={{ backgroundColor: `${form.primary_color}08` }}>
        <h2 className="text-center text-3xl font-bold mb-8 tracking-tight" style={{ fontFamily: hFont, color: textCol }}>Voos</h2>
        <div className="max-w-3xl mx-auto space-y-4">
          {[
            { airline: "ET", name: "Ethiopian Airlines", flight: "ET 507", from: "GRU", fromCity: "São Paulo", to: "ADD", toCity: "Addis Ababa", dep: "23:55", arr: "17:40", dur: "14h45", date: "10 ago 2026", cls: "Executiva", bag: "2×32kg", term: "Terminal 3", loc: "XKWP3M" },
            { airline: "ET", name: "Ethiopian Airlines", flight: "ET 815", from: "ADD", fromCity: "Addis Ababa", to: "JRO", toCity: "Kilimanjaro", dep: "21:30", arr: "23:45", dur: "2h15", date: "11 ago 2026", cls: "Executiva", bag: "2×32kg", term: "Terminal 2", loc: "XKWP3M" },
          ].map((f, i) => (
            <div key={i} className="relative border-2 overflow-hidden" style={{ borderRadius: radius, borderColor: `${form.accent_color}30`, backgroundColor: bgCol, boxShadow: shadow }}>
              {/* Perforated line */}
              <div className="absolute top-0 bottom-0 right-[100px]" style={{ borderRight: `2px dashed ${form.accent_color}25` }} />
              <div className="flex">
                <div className="flex-1 p-6">
                  {/* Header with airline */}
                  <div className="flex items-center gap-3 mb-5">
                    <AirlineLogo iata={f.airline} size={40} />
                    <div>
                      <p className="font-bold text-sm" style={{ fontFamily: hFont, color: textCol }}>{f.name}</p>
                      <p className="text-[10px] font-mono tracking-wider" style={{ color: `${textCol}66` }}>{f.flight}</p>
                    </div>
                    <div className="ml-auto text-right">
                      <p className="text-[10px]" style={{ color: `${textCol}55`, fontFamily: bFont }}>{f.date}</p>
                      <span className="text-[9px] px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: `${form.accent_color}15`, color: form.accent_color }}>{f.cls}</span>
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
                      <div className="w-full flex items-center">
                        <div className="w-3 h-3 rounded-full border-2" style={{ borderColor: form.accent_color }} />
                        <div className="flex-1 h-px mx-2 relative" style={{ backgroundColor: `${form.accent_color}40` }}>
                          <Plane className="w-4 h-4 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-90" style={{ color: form.accent_color }} />
                        </div>
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: form.accent_color }} />
                      </div>
                      <div className="flex items-center gap-2 text-[10px]" style={{ color: `${textCol}55` }}>
                        <Clock className="w-3 h-3" />
                        <span>{f.dur}</span>
                        <span className="mx-1">·</span>
                        <Luggage className="w-3 h-3" />
                        <span>{f.bag}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold font-mono" style={{ color: textCol, letterSpacing: "-0.05em" }}>{f.arr}</p>
                      <p className="text-xl font-bold font-mono mt-1" style={{ color: form.accent_color }}>{f.to}</p>
                      <p className="text-[10px] mt-0.5" style={{ color: `${textCol}55` }}>{f.toCity}</p>
                      {i === 0 && <p className="text-[9px] mt-0.5 font-semibold" style={{ color: form.accent_color }}>+1 dia</p>}
                    </div>
                  </div>
                </div>
                {/* Right stub */}
                <div className="w-[100px] flex flex-col items-center justify-center p-4" style={{ backgroundColor: `${form.accent_color}08` }}>
                  <p className="text-[8px] tracking-[0.2em] uppercase mb-2" style={{ color: `${textCol}44` }}>Localizador</p>
                  <p className="text-sm font-bold font-mono tracking-widest" style={{ color: form.accent_color }}>{f.loc}</p>
                  <div className="w-14 h-14 mt-3 rounded" style={{ background: `repeating-conic-gradient(${form.accent_color}30 0% 25%, transparent 0% 50%) 50%/8px 8px` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* HOTEL — Magazine spread */}
      <section className="px-8 py-14">
        <h2 className="text-center text-3xl font-bold mb-8 tracking-tight" style={{ fontFamily: hFont, color: textCol }}>Hospedagem</h2>
        <div className="max-w-4xl mx-auto relative" style={{ borderRadius: radius, overflow: "hidden", boxShadow: shadow }}>
          <img src={lodgeImg} alt="Singita" className="w-full h-[320px] object-cover" />
          <div className="absolute inset-0" style={{ background: `linear-gradient(to right, ${form.primary_color}ee 0%, ${form.primary_color}88 40%, transparent 70%)` }} />
          <div className="absolute inset-y-0 left-0 flex flex-col justify-center p-10 max-w-[55%]">
            <p className="text-[9px] tracking-[0.3em] uppercase text-white/40 mb-2" style={{ fontFamily: bFont }}>Serengeti, Tanzânia</p>
            <h3 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: hFont }}>Singita Grumeti Reserves</h3>
            <div className="flex gap-0.5 mb-3">{[1,2,3,4,5].map(i => <Star key={i} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />)}</div>
            <p className="text-xs text-white/60 leading-relaxed mb-4" style={{ fontFamily: bFont }}>
              Suítes privativas com vista para a savana, deck infinito e experiência gastronômica no coração da grande migração.
            </p>
            <div className="flex flex-wrap gap-2">
              {["Suite Savana", "Piscina privativa", "7 noites", "All inclusive"].map(tag => (
                <span key={tag} className="text-[9px] px-2.5 py-1 rounded-full border border-white/20 text-white/70">{tag}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* EXPERIENCES — Numbered editorial blocks */}
      <section className="px-8 py-14" style={{ backgroundColor: `${form.primary_color}06` }}>
        <h2 className="text-center text-3xl font-bold mb-8 tracking-tight" style={{ fontFamily: hFont, color: textCol }}>Experiências</h2>
        <div className="max-w-3xl mx-auto space-y-6">
          {[
            { num: "01", title: "Safari ao Amanhecer", desc: "Encontro com os Big Five no Serengeti ao nascer do sol, com guia privativo e veículo 4×4 exclusivo.", img: safariImg },
            { num: "02", title: "Jantar Boma sob as Estrelas", desc: "Experiência gastronômica africana ao ar livre, com fogueira cerimonial e música ao vivo dos Maasai.", img: "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800&h=500&fit=crop&q=80" },
            { num: "03", title: "Mergulho em Zanzibar", desc: "Exploração dos recifes de coral de Mnemba Atoll com equipamento profissional e instrutor certificado.", img: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&h=500&fit=crop&q=80" },
          ].map((exp) => (
            <div key={exp.num} className="flex gap-6 items-start">
              <span className="text-5xl font-bold shrink-0 leading-none" style={{ fontFamily: hFont, color: `${form.accent_color}30` }}>{exp.num}</span>
              <div className="flex-1 flex gap-4 border overflow-hidden" style={{ borderRadius: radius, boxShadow: shadow, borderColor: `${form.accent_color}15`, backgroundColor: bgCol }}>
                <img src={exp.img} alt={exp.title} className="w-32 h-28 object-cover shrink-0" />
                <div className="p-4 flex flex-col justify-center">
                  <h4 className="font-bold text-base mb-1" style={{ fontFamily: hFont, color: textCol }}>{exp.title}</h4>
                  <p className="text-xs leading-relaxed" style={{ color: `${textCol}66`, fontFamily: bFont }}>{exp.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section className="px-8 py-16">
        <div className="max-w-md mx-auto text-center">
          <div className="w-12 h-px mx-auto mb-6" style={{ backgroundColor: form.accent_color }} />
          <p className="text-[9px] uppercase tracking-[0.3em] mb-2" style={{ color: `${textCol}44`, fontFamily: bFont }}>Investimento por pessoa</p>
          <p className="text-2xl font-bold" style={{ fontFamily: hFont, color: textCol }}>R$ 39.450,00</p>
          <div className="my-5 h-px" style={{ backgroundColor: `${form.accent_color}15` }} />
          <p className="text-[9px] uppercase tracking-[0.3em] mb-2" style={{ color: `${textCol}44`, fontFamily: bFont }}>Valor total · 2 passageiros</p>
          <p className="text-4xl font-bold" style={{ fontFamily: hFont, color: form.accent_color }}>R$ 78.900,00</p>
          <p className="text-[10px] mt-4" style={{ color: `${textCol}44` }}>Em até 10× no cartão · Inclui voos, hospedagem e experiências</p>
          <button className="mt-8 px-10 py-3.5 text-white font-semibold text-sm tracking-wide" style={{ backgroundColor: form.accent_color, borderRadius: radius, fontFamily: hFont }}>
            {tc.ctaText || "Reservar Aventura"}
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-8 px-6 text-center" style={{ borderTop: `1px solid ${textCol}08` }}>
        <img src={logoNatleva} alt="NatLeva" className="h-7 mx-auto mb-2 opacity-40" />
        <p className="text-[10px] tracking-wider" style={{ color: `${textCol}30`, fontFamily: bFont }}>Proposta exclusiva · NatLeva Viagens</p>
      </footer>
    </div>
  );
}
