import { Clock, MapPin, Star, Heart, Anchor, Wine } from "lucide-react";
import AirlineLogo from "@/components/AirlineLogo";
import logoNatleva from "@/assets/logo-natleva-clean.png";
import { type StylePreviewProps, clickableClass, editOverlay, getRadius, getShadow } from "../TemplatePreview";

const heroImg = "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=1920&h=1080&fit=crop&q=80";
const hotelImg = "https://images.unsplash.com/photo-1602343168117-bb8ffe3e2e9f?w=900&h=600&fit=crop&q=80";

export function LuxuryStyle({ form, activePanel, onClickSection }: StylePreviewProps) {
  const tc = form.theme_config;
  const textCol = form.text_color || "#f5f0eb";
  const bgCol = form.bg_color || "#0f0a1a";
  const radius = getRadius(tc.borderRadius);
  const shadow = getShadow(tc.shadowIntensity);
  const hFont = `'${form.font_heading}', serif`;
  const bFont = `'${form.font_body}', sans-serif`;
  const gradBg = `linear-gradient(${tc.gradientAngle || 135}deg, ${form.primary_color}, ${tc.gradientSecondary || "#2d1b4e"})`;

  return (
    <div style={{ backgroundColor: bgCol, color: textCol }}>
      {/* HERO — Split layout */}
      <div className={clickableClass("layout", activePanel)} onClick={() => onClickSection("layout")}>
        {editOverlay("Editar layout")}
        <section className="flex h-[460px] overflow-hidden">
          <div className="w-[55%] h-full bg-cover bg-center relative">
            <img src={heroImg} alt="Santorini" className="w-full h-full object-cover" />
          </div>
          <div className="w-[45%] h-full flex flex-col items-center justify-center px-10" style={{ background: gradBg }}>
            <img src={logoNatleva} alt="NatLeva" className="h-7 mb-10 opacity-70" />
            <p className="text-[10px] tracking-[0.4em] uppercase opacity-40 mb-4" style={{ fontFamily: bFont }}>
              Uma viagem para dois
            </p>
            <h1 className="text-4xl font-bold text-center leading-[1.15] mb-3" style={{ fontFamily: hFont, letterSpacing: "-0.02em" }}>
              Lua de Mel
            </h1>
            <p className="text-xl italic opacity-70 mb-6" style={{ fontFamily: hFont }}>Santorini & Mykonos</p>
            <div className="flex items-center gap-3 opacity-40 text-xs" style={{ fontFamily: bFont }}>
              <Heart className="w-3.5 h-3.5" />
              <span>Carolina & Rafael</span>
              <span className="w-1 h-1 rounded-full bg-current" />
              <span>15 — 28 jun 2026</span>
            </div>
            {/* Decorative */}
            <div className="mt-8 flex items-center gap-4 opacity-20">
              <div className="h-px w-16" style={{ backgroundColor: form.accent_color }} />
              <Heart className="w-3 h-3 fill-current" style={{ color: form.accent_color }} />
              <div className="h-px w-16" style={{ backgroundColor: form.accent_color }} />
            </div>
          </div>
        </section>
      </div>

      {/* INTRO */}
      <div className={clickableClass("fonts", activePanel)} onClick={() => onClickSection("fonts")}>
        {editOverlay("Editar tipografia")}
        <section className="max-w-xl mx-auto px-8 py-16 text-center">
          <p className="text-lg italic leading-relaxed opacity-60" style={{ fontFamily: hFont }}>
            "Dois corações, um destino. Descubram juntos as ilhas mais românticas do Mediterrâneo, onde cada pôr do sol é uma promessa."
          </p>
        </section>
      </div>

      {/* FLIGHTS — Vertical Timeline */}
      <section className="px-8 py-14">
        <h2 className="text-center text-2xl font-bold mb-10 tracking-tight" style={{ fontFamily: hFont }}>Itinerário Aéreo</h2>
        <div className="max-w-lg mx-auto relative">
          {/* Vertical golden line */}
          <div className="absolute left-[22px] top-4 bottom-4 w-px" style={{ backgroundColor: `${form.accent_color}40` }} />
          
          {[
            { airline: "EK", name: "Emirates", flight: "EK 262", from: "GRU", fromCity: "São Paulo", dep: "03:15", to: "DXB", toCity: "Dubai", arr: "01:05", dur: "14h50", date: "15 jun", cls: "Business", next: true },
            { label: "Conexão Dubai · 4h20", isConnection: true },
            { airline: "EK", name: "Emirates", flight: "EK 105", from: "DXB", fromCity: "Dubai", dep: "05:25", to: "ATH", toCity: "Atenas", arr: "09:40", dur: "5h15", date: "16 jun", cls: "Business" },
            { label: "Voo doméstico", isConnection: true },
            { airline: "A3", name: "Aegean Airlines", flight: "A3 356", from: "ATH", fromCity: "Atenas", dep: "14:20", to: "JTR", toCity: "Santorini", arr: "15:10", dur: "0h50", date: "16 jun", cls: "Econômica Premium" },
          ].map((item: any, i) => {
            if (item.isConnection) {
              return (
                <div key={i} className="flex items-center gap-4 py-3 pl-2">
                  <div className="w-[10px] h-[10px] rounded-full border-2 shrink-0 z-10" style={{ borderColor: form.accent_color, backgroundColor: bgCol }} />
                  <p className="text-[10px] italic opacity-40" style={{ fontFamily: bFont }}>{item.label}</p>
                </div>
              );
            }
            return (
              <div key={i} className="flex items-start gap-4 py-4 pl-2">
                <div className="w-[10px] h-[10px] rounded-full shrink-0 mt-3 z-10" style={{ backgroundColor: form.accent_color }} />
                <div className="flex-1 p-4 border rounded-xl" style={{ borderColor: `${form.accent_color}15`, backgroundColor: `${form.accent_color}05` }}>
                  <div className="flex items-center gap-3 mb-3">
                    <AirlineLogo iata={item.airline} size={32} />
                    <div>
                      <p className="text-xs font-semibold" style={{ fontFamily: hFont }}>{item.name}</p>
                      <p className="text-[10px] font-mono opacity-50">{item.flight}</p>
                    </div>
                    <span className="ml-auto text-[9px] px-2 py-0.5 rounded-full" style={{ backgroundColor: `${form.accent_color}15`, color: form.accent_color }}>{item.cls}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold font-mono" style={{ letterSpacing: "-0.05em" }}>{item.dep}</p>
                      <p className="text-sm font-bold font-mono" style={{ color: form.accent_color }}>{item.from}</p>
                      <p className="text-[10px] opacity-40">{item.fromCity}</p>
                    </div>
                    <div className="flex flex-col items-center gap-1 px-4">
                      <p className="text-[10px] opacity-40">{item.date}</p>
                      <div className="w-16 h-px" style={{ backgroundColor: `${form.accent_color}30` }} />
                      <p className="text-[10px] opacity-40 flex items-center gap-1"><Clock className="w-3 h-3" /> {item.dur}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold font-mono" style={{ letterSpacing: "-0.05em" }}>{item.arr}</p>
                      <p className="text-sm font-bold font-mono" style={{ color: form.accent_color }}>{item.to}</p>
                      <p className="text-[10px] opacity-40">{item.toCity}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* HOTEL — Overlapping card */}
      <section className="px-8 py-14">
        <h2 className="text-center text-2xl font-bold mb-10 tracking-tight" style={{ fontFamily: hFont }}>Hospedagem</h2>
        <div className="max-w-3xl mx-auto relative">
          <div className="rounded-2xl overflow-hidden h-[280px]">
            <img src={hotelImg} alt="Canaves" className="w-full h-full object-cover" />
          </div>
          {/* Floating card overlapping */}
          <div className="relative -mt-20 mx-8 p-8 border backdrop-blur-sm" style={{ borderRadius: radius, borderColor: `${form.accent_color}20`, backgroundColor: `${bgCol}ee`, boxShadow: `0 8px 40px ${form.accent_color}10` }}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[9px] tracking-[0.3em] uppercase opacity-30 mb-1" style={{ fontFamily: bFont }}>Oia, Santorini</p>
                <h3 className="text-xl font-bold mb-2" style={{ fontFamily: hFont }}>Canaves Oia Epitome</h3>
                <div className="flex gap-0.5 mb-3">{[1,2,3,4,5].map(i => <Star key={i} className="w-3 h-3 text-amber-400 fill-amber-400" />)}</div>
                <p className="text-xs opacity-50 leading-relaxed max-w-md" style={{ fontFamily: bFont }}>
                  Suite com piscina privativa e vista infinita para a Caldera. Café da manhã na varanda com champagne ao nascer do sol.
                </p>
              </div>
              <div className="text-right shrink-0 ml-6">
                <p className="text-[9px] uppercase tracking-wider opacity-30 mb-1">Check-in</p>
                <p className="text-sm font-bold" style={{ fontFamily: hFont }}>16 jun</p>
                <p className="text-[9px] uppercase tracking-wider opacity-30 mt-3 mb-1">Check-out</p>
                <p className="text-sm font-bold" style={{ fontFamily: hFont }}>25 jun</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-5 pt-4" style={{ borderTop: `1px solid ${form.accent_color}15` }}>
              {["Honeymoon Suite", "Piscina infinita", "9 noites", "Café & jantar", "Spa incluído"].map(tag => (
                <span key={tag} className="text-[9px] px-2.5 py-1 rounded-full border" style={{ borderColor: `${form.accent_color}20`, color: `${form.accent_color}cc` }}>{tag}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* EXPERIENCES — Circular images */}
      <section className="px-8 py-14">
        <h2 className="text-center text-2xl font-bold mb-10 tracking-tight" style={{ fontFamily: hFont }}>Experiências</h2>
        <div className="max-w-3xl mx-auto grid grid-cols-3 gap-8">
          {[
            { icon: Anchor, title: "Sunset Sailing", desc: "Navegação privativa ao pôr do sol pela Caldera com champagne e finger food.", img: "https://images.unsplash.com/photo-1530841377377-3ff06c0ca713?w=400&h=400&fit=crop&q=80" },
            { icon: Wine, title: "Wine Tasting", desc: "Degustação de vinhos vulcânicos nas vinícolas centenárias de Santorini.", img: "https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=400&h=400&fit=crop&q=80" },
            { icon: Heart, title: "Couples Spa", desc: "Ritual de spa à dois com óleos essenciais gregos e vista para o Egeu.", img: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&h=400&fit=crop&q=80" },
          ].map((exp) => (
            <div key={exp.title} className="text-center">
              <div className="w-28 h-28 mx-auto mb-4 rounded-full overflow-hidden border-2" style={{ borderColor: `${form.accent_color}30` }}>
                <img src={exp.img} alt={exp.title} className="w-full h-full object-cover" />
              </div>
              <h4 className="font-bold text-sm mb-1" style={{ fontFamily: hFont }}>{exp.title}</h4>
              <p className="text-[10px] opacity-40 leading-relaxed" style={{ fontFamily: bFont }}>{exp.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING — Glass card */}
      <section className="px-8 py-16">
        <div className="max-w-sm mx-auto text-center p-10 border backdrop-blur-sm" style={{ borderRadius: "1.5rem", borderColor: `${form.accent_color}20`, backgroundColor: `${form.accent_color}08`, boxShadow: `0 0 60px ${form.accent_color}08` }}>
          <Heart className="w-5 h-5 mx-auto mb-4 opacity-30" style={{ color: form.accent_color }} />
          <p className="text-[9px] uppercase tracking-[0.3em] opacity-30 mb-2" style={{ fontFamily: bFont }}>Por pessoa</p>
          <p className="text-xl font-bold" style={{ fontFamily: hFont }}>R$ 52.400,00</p>
          <div className="my-4 h-px" style={{ backgroundColor: `${form.accent_color}15` }} />
          <p className="text-[9px] uppercase tracking-[0.3em] opacity-30 mb-2" style={{ fontFamily: bFont }}>Casal · Valor total</p>
          <p className="text-3xl font-bold" style={{ fontFamily: hFont, color: form.accent_color }}>R$ 104.800,00</p>
          <p className="text-[10px] opacity-30 mt-3">Voos Business · 9 noites · Tudo incluído</p>
          <button className="mt-8 px-10 py-3 font-semibold text-sm tracking-wide border-2" style={{ borderColor: form.accent_color, color: form.accent_color, borderRadius: "2rem", fontFamily: hFont }}>
            {tc.ctaText || "Confirmar Viagem dos Sonhos"}
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-8 px-6 text-center" style={{ borderTop: `1px solid ${form.accent_color}10` }}>
        <img src={logoNatleva} alt="NatLeva" className="h-7 mx-auto mb-2 opacity-30" />
        <p className="text-[10px] tracking-wider opacity-20" style={{ fontFamily: bFont }}>Proposta exclusiva · NatLeva Viagens</p>
      </footer>
    </div>
  );
}
