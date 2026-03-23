import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Plane, Hotel, Star, MapPin, Clock, Camera, Heart,
} from "lucide-react";
import logoNatleva from "@/assets/logo-natleva-clean.png";

export interface TemplateForm {
  name: string;
  description: string;
  font_heading: string;
  font_body: string;
  primary_color: string;
  accent_color: string;
  text_color: string;
  bg_color: string;
  theme_config: {
    style: string;
    backgroundPattern: string;
    heroLayout: string;
    heroOverlayOpacity: number;
    heroHeight: string;
    cardStyle: string;
    sectionSpacing: string;
    borderRadius: string;
    shadowIntensity: string;
    gradientAngle: number;
    gradientSecondary: string;
    ctaStyle: string;
    ctaText: string;
    logoPosition: string;
    logoSize: string;
    animationStyle: string;
    dividerStyle: string;
    introStyle: string;
  };
  sections: { type: string; enabled: boolean; order?: number }[];
  is_default: boolean;
  is_active: boolean;
}

type ActivePanel = "colors" | "fonts" | "sections" | "settings" | "layout" | "effects" | "cta" | "ai" | null;

const heroImg = "https://images.unsplash.com/photo-1488085061387-422e29b40080?w=1920&h=1080&fit=crop&q=80";
const destImgs = [
  "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800&h=600&fit=crop&q=80",
  "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&h=600&fit=crop&q=80",
  "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&h=600&fit=crop&q=80",
];
const hotelImg = "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=400&fit=crop&q=80";
const expImg = "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800&h=500&fit=crop&q=80";

function getDivider(style: string, color: string) {
  if (style === "line") return <div className="w-12 h-px mx-auto my-2" style={{ backgroundColor: color }} />;
  if (style === "dots") return <div className="flex items-center justify-center gap-1.5 my-2">{[0,1,2].map(i=><div key={i} className="w-1.5 h-1.5 rounded-full" style={{backgroundColor: color}} />)}</div>;
  if (style === "diamond") return <div className="flex items-center justify-center gap-3 my-2"><div className="h-px w-8" style={{background:`linear-gradient(to right,transparent,${color}60)`}}/><div className="w-2 h-2 rotate-45" style={{backgroundColor:color}}/><div className="h-px w-8" style={{background:`linear-gradient(to left,transparent,${color}60)`}}/></div>;
  if (style === "wave") return <div className="text-center my-2 opacity-30 text-xs tracking-[0.5em]" style={{color}}>~ ~ ~</div>;
  return <div className="w-10 h-px mx-auto my-2" style={{ backgroundColor: color }} />;
}

function getRadius(r: string) {
  if (r === "none") return "0px";
  if (r === "sm") return "0.375rem";
  if (r === "md") return "0.75rem";
  if (r === "lg") return "1rem";
  if (r === "xl") return "1.5rem";
  if (r === "full") return "2rem";
  return "0.75rem";
}

function getShadow(s: string) {
  if (s === "none") return "none";
  if (s === "soft") return "0 2px 8px rgba(0,0,0,0.06)";
  if (s === "medium") return "0 4px 20px rgba(0,0,0,0.1)";
  if (s === "strong") return "0 8px 40px rgba(0,0,0,0.18)";
  if (s === "glow") return "0 0 30px rgba(0,0,0,0.12)";
  return "0 2px 8px rgba(0,0,0,0.06)";
}

function getSpacing(s: string) {
  if (s === "compact") return "py-5";
  if (s === "normal") return "py-8";
  if (s === "relaxed") return "py-12";
  if (s === "spacious") return "py-16";
  return "py-8";
}

export function TemplatePreview({ form, activePanel, onClickSection, zoom }: {
  form: TemplateForm;
  activePanel: ActivePanel;
  onClickSection: (panel: ActivePanel) => void;
  zoom: number;
}) {
  const tc = form.theme_config;
  const enabledSections = form.sections.filter((s) => s.enabled).map((s) => s.type);
  const radius = getRadius(tc.borderRadius);
  const shadow = getShadow(tc.shadowIntensity);
  const spacing = getSpacing(tc.sectionSpacing);
  const textCol = form.text_color || "#1a1a1a";
  const bgCol = form.bg_color || "#ffffff";

  const clickableClass = (panel: ActivePanel) =>
    cn(
      "cursor-pointer transition-all duration-200 relative group/edit",
      activePanel === panel && "ring-2 ring-primary ring-offset-2 ring-offset-background rounded-lg"
    );

  const editOverlay = (label: string) => (
    <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover/edit:opacity-100 transition-opacity rounded-lg flex items-center justify-center z-10 pointer-events-none">
      <Badge className="text-[10px] shadow-lg">{label}</Badge>
    </div>
  );

  const heroHeight = tc.heroHeight === "short" ? "h-[260px]" : tc.heroHeight === "tall" ? "h-[440px]" : tc.heroHeight === "full" ? "h-[520px]" : "h-[340px]";

  const logoEl = (
    <img src={logoNatleva} alt="NatLeva" className={cn(
      "drop-shadow-lg",
      tc.logoSize === "sm" ? "h-6" : tc.logoSize === "lg" ? "h-12" : "h-8"
    )} />
  );

  const gradientBg = tc.gradientSecondary
    ? `linear-gradient(${tc.gradientAngle || 135}deg, ${form.primary_color}, ${tc.gradientSecondary})`
    : form.primary_color;

  return (
    <div
      style={{ transform: `scale(${zoom})`, transformOrigin: "top center", backgroundColor: bgCol }}
      className="rounded-xl border border-border overflow-hidden shadow-inner transition-transform"
    >
      {/* HERO */}
      {enabledSections.includes("hero") && (
        <div className={clickableClass("layout")} onClick={() => onClickSection("layout")}>
          {editOverlay("Editar layout")}
          <section className={cn("relative flex overflow-hidden", heroHeight,
            tc.heroLayout === "split" ? "flex-row" : "items-end justify-center"
          )}>
            {tc.heroLayout === "split" ? (
              <>
                <div className="w-1/2 h-full bg-cover bg-center" style={{ backgroundImage: `url(${heroImg})` }} />
                <div className="w-1/2 h-full flex flex-col items-center justify-center p-8" style={{ background: gradientBg }}>
                  {logoEl}
                  <p className="text-[10px] tracking-[0.35em] uppercase opacity-60 mt-6 mb-3 text-white" style={{ fontFamily: `'${form.font_body}', sans-serif` }}>
                    Maria & João Silva
                  </p>
                  <h1 className="text-2xl font-bold text-white text-center leading-tight mb-2" style={{ fontFamily: `'${form.font_heading}', serif` }}>
                    Safari de Luxo · Tanzânia & Zanzibar
                  </h1>
                  <p className="text-sm text-white/70" style={{ fontFamily: `'${form.font_body}', sans-serif` }}>10 — 24 de agosto de 2026</p>
                </div>
              </>
            ) : tc.heroLayout === "minimal" ? (
              <>
                <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${heroImg})` }} />
                <div className="absolute inset-0" style={{ backgroundColor: form.primary_color, opacity: tc.heroOverlayOpacity / 100 }} />
                <div className="relative z-10 text-center text-white p-8 flex flex-col items-center justify-center h-full">
                  <h1 className="text-4xl font-bold leading-tight" style={{ fontFamily: `'${form.font_heading}', serif` }}>
                    Safari de Luxo
                  </h1>
                  <p className="text-sm opacity-70 mt-3" style={{ fontFamily: `'${form.font_body}', sans-serif` }}>Tanzânia & Zanzibar · Agosto 2026</p>
                </div>
              </>
            ) : tc.heroLayout === "cinematic" ? (
              <>
                <div className="absolute inset-0 bg-cover bg-center scale-110" style={{ backgroundImage: `url(${heroImg})` }} />
                <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, transparent 0%, ${form.primary_color}90 60%, ${form.primary_color} 100%)` }} />
                <div className="relative z-10 text-center text-white pb-10 px-6 max-w-2xl">
                  <div className={cn("mb-8", tc.logoPosition === "left" ? "text-left" : tc.logoPosition === "right" ? "text-right" : "text-center")}>
                    {logoEl}
                  </div>
                  <p className="text-[10px] tracking-[0.35em] uppercase opacity-60 mb-3" style={{ fontFamily: `'${form.font_body}', sans-serif` }}>Maria & João Silva</p>
                  <h1 className="text-4xl font-bold leading-tight mb-3" style={{ fontFamily: `'${form.font_heading}', serif`, letterSpacing: "-0.03em" }}>
                    Safari de Luxo · Tanzânia & Zanzibar
                  </h1>
                  <p className="text-sm opacity-70 tracking-wide" style={{ fontFamily: `'${form.font_body}', sans-serif` }}>10 — 24 de agosto de 2026</p>
                </div>
              </>
            ) : (
              <>
                <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${heroImg})` }} />
                <div className="absolute inset-0" style={{
                  background: `linear-gradient(to top, ${form.primary_color} 0%, ${form.primary_color}80 40%, transparent 100%)`,
                  opacity: tc.heroOverlayOpacity / 100,
                }} />
                <div className={cn("absolute top-5 z-10", tc.logoPosition === "left" ? "left-6" : tc.logoPosition === "right" ? "right-6" : "left-1/2 -translate-x-1/2")}>
                  {logoEl}
                </div>
                <div className="relative z-10 text-center text-white pb-8 px-6 max-w-2xl">
                  <p className="text-[10px] tracking-[0.35em] uppercase opacity-60 mb-3" style={{ fontFamily: `'${form.font_body}', sans-serif` }}>Maria & João Silva</p>
                  <h1 className="text-3xl font-bold leading-tight mb-3" style={{ fontFamily: `'${form.font_heading}', serif`, letterSpacing: "-0.02em" }}>
                    Safari de Luxo · Tanzânia & Zanzibar
                  </h1>
                  <p className="text-sm opacity-70 font-light tracking-wide" style={{ fontFamily: `'${form.font_body}', sans-serif` }}>10 — 24 de agosto de 2026</p>
                  <div className="flex items-center justify-center gap-3 mt-5 opacity-40">
                    <div className="h-px w-8 bg-white/50" />
                    <span className="text-[9px] tracking-[0.3em] uppercase">Proposta exclusiva</span>
                    <div className="h-px w-8 bg-white/50" />
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      )}

      {/* INTRO */}
      <div className={clickableClass("fonts")} onClick={() => onClickSection("fonts")}>
        {editOverlay("Editar tipografia")}
        <section className={cn("max-w-2xl mx-auto px-6 text-center", spacing)}>
          {getDivider(tc.dividerStyle, form.accent_color)}
          <p className={cn("text-base leading-relaxed font-light", tc.introStyle === "italic" ? "italic" : "")}
            style={{ fontFamily: `'${form.font_body}', sans-serif`, color: `${textCol}88` }}>
            {tc.introStyle === "quote"
              ? "\"Uma jornada exclusiva pelos cenários mais deslumbrantes da África, com hospedagens de luxo e experiências inesquecíveis.\""
              : "Uma jornada exclusiva pelos cenários mais deslumbrantes da África, com hospedagens de luxo e experiências inesquecíveis."
            }
          </p>
          {getDivider(tc.dividerStyle, form.accent_color)}
        </section>
      </div>

      {/* DESTINATIONS */}
      {enabledSections.includes("destinations") && (
        <div className={clickableClass("sections")} onClick={() => onClickSection("sections")}>
          {editOverlay("Editar seções")}
          <section className={cn("px-6", spacing)}>
            <div className="text-center mb-6">
              {getDivider(tc.dividerStyle, form.accent_color)}
              <h2 className="text-2xl font-bold tracking-tight" style={{ fontFamily: `'${form.font_heading}', serif`, color: textCol }}>Seus Destinos</h2>
              <p className="text-xs mt-1" style={{ fontFamily: `'${form.font_body}', sans-serif`, color: `${textCol}66` }}>Os lugares que você vai explorar</p>
            </div>
            <div className="max-w-4xl mx-auto grid grid-cols-3 gap-3">
              {["Roma", "Paris", "Londres"].map((dest, i) => (
                <div key={dest} className="overflow-hidden relative h-40" style={{ borderRadius: radius, boxShadow: shadow }}>
                  <img src={destImgs[i]} alt={dest} className="w-full h-full object-cover" />
                  <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${form.primary_color}cc, transparent)` }} />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <h3 className="text-sm font-bold text-white" style={{ fontFamily: `'${form.font_heading}', serif` }}>{dest}</h3>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* FLIGHTS */}
      {enabledSections.includes("flights") && (
        <section className={cn("px-6", spacing)} style={{ backgroundColor: `${form.accent_color}08` }}>
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold tracking-tight" style={{ fontFamily: `'${form.font_heading}', serif`, color: textCol }}>Voos</h2>
          </div>
          <div className="max-w-2xl mx-auto">
            <div className="border bg-white/80 p-5" style={{ borderRadius: radius, boxShadow: shadow, borderColor: `${form.accent_color}20` }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Plane className="w-4 h-4" style={{ color: form.accent_color }} />
                  <span className="font-bold text-sm" style={{ fontFamily: `'${form.font_heading}', sans-serif`, color: textCol }}>LATAM Airlines</span>
                  <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono">LA8084</span>
                </div>
                <span className="text-xs" style={{ color: `${textCol}88` }}>10 de ago. de 2026</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-left">
                  <p className="text-2xl font-bold" style={{ fontFamily: `'${form.font_heading}', sans-serif`, color: textCol }}>23:55</p>
                  <p className="text-lg font-bold" style={{ color: textCol }}>GRU</p>
                </div>
                <div className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex items-center">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: form.accent_color }} />
                    <div className="flex-1 h-px bg-muted-foreground/25 mx-1" />
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: form.accent_color }} />
                  </div>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> 11h45min</span>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold" style={{ fontFamily: `'${form.font_heading}', sans-serif`, color: textCol }}>14:40</p>
                  <p className="text-lg font-bold" style={{ color: textCol }}>FCO</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* HOTELS */}
      {enabledSections.includes("hotels") && (
        <section className={cn("px-6", spacing)}>
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold tracking-tight" style={{ fontFamily: `'${form.font_heading}', serif`, color: textCol }}>Hospedagens</h2>
          </div>
          <div className="max-w-2xl mx-auto">
            <div className={cn("border overflow-hidden", tc.cardStyle === "flat" ? "" : "")} style={{ borderRadius: radius, boxShadow: shadow, borderColor: `${form.accent_color}15`, backgroundColor: bgCol }}>
              <div className="h-36 overflow-hidden">
                <img src={hotelImg} alt="Hotel" className="w-full h-full object-cover" />
              </div>
              <div className="p-5">
                <h3 className="font-semibold text-base" style={{ fontFamily: `'${form.font_heading}', serif`, color: textCol }}>Hotel Hassler Roma</h3>
                <div className="flex gap-0.5 mt-1">{[1,2,3,4,5].map(i => <Star key={i} className="w-3 h-3 text-amber-400 fill-amber-400" />)}</div>
                <p className="text-xs flex items-center gap-1 mt-1" style={{ color: `${textCol}66` }}>
                  <MapPin className="w-3 h-3" style={{ color: `${form.accent_color}99` }} /> Piazza della Trinità dei Monti
                </p>
                <div className="flex gap-2 mt-3">
                  {["Suite Deluxe", "Café incluso", "5 noites"].map(tag => (
                    <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full border" style={{
                      color: form.accent_color, borderColor: `${form.accent_color}25`, backgroundColor: `${form.accent_color}08`,
                    }}>{tag}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* EXPERIENCES */}
      {enabledSections.includes("experiences") && (
        <section className={cn("px-6", spacing)} style={{ backgroundColor: `${form.primary_color}06` }}>
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold tracking-tight" style={{ fontFamily: `'${form.font_heading}', serif`, color: textCol }}>Experiências</h2>
          </div>
          <div className="max-w-3xl mx-auto grid grid-cols-2 gap-4">
            {[
              { name: "Safari ao Amanhecer", desc: "Encontro com a vida selvagem" },
              { name: "Jantar sob as Estrelas", desc: "Gastronomia exclusiva no bush" },
            ].map((exp) => (
              <div key={exp.name} className="overflow-hidden border" style={{ borderRadius: radius, boxShadow: shadow, borderColor: `${form.accent_color}15` }}>
                <div className="h-28 overflow-hidden">
                  <img src={expImg} alt={exp.name} className="w-full h-full object-cover" />
                </div>
                <div className="p-4" style={{ backgroundColor: bgCol }}>
                  <h4 className="font-semibold text-sm" style={{ fontFamily: `'${form.font_heading}', serif`, color: textCol }}>{exp.name}</h4>
                  <p className="text-xs mt-1" style={{ color: `${textCol}66` }}>{exp.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* PRICING */}
      {enabledSections.includes("pricing") && (
        <section className={cn("px-6", spacing)}>
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold tracking-tight" style={{ fontFamily: `'${form.font_heading}', serif`, color: textCol }}>Investimento</h2>
          </div>
          <div className="max-w-md mx-auto">
            <div className="border p-8 text-center" style={{ borderRadius: radius, boxShadow: shadow, borderColor: `${form.accent_color}25`, backgroundColor: bgCol }}>
              <p className="text-[9px] uppercase tracking-[0.25em] mb-1" style={{ color: `${textCol}44` }}>Valor por pessoa</p>
              <p className="text-2xl font-bold" style={{ fontFamily: `'${form.font_heading}', sans-serif`, color: textCol }}>R$ 24.500,00</p>
              <div className="my-4 h-px" style={{ backgroundColor: `${form.accent_color}20` }} />
              <p className="text-[9px] uppercase tracking-[0.25em] mb-1" style={{ color: `${textCol}44` }}>Valor total da viagem</p>
              <p className="text-3xl font-bold" style={{ fontFamily: `'${form.font_heading}', sans-serif`, color: form.accent_color }}>R$ 49.000,00</p>
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <div className={clickableClass("cta")} onClick={() => onClickSection("cta")}>
        {editOverlay("Editar botão")}
        <section className={cn("px-6 text-center", spacing)}>
          {tc.ctaStyle === "gradient" ? (
            <button className="px-8 py-3 text-white font-semibold text-sm tracking-wide" style={{
              background: `linear-gradient(135deg, ${form.accent_color}, ${form.primary_color})`,
              borderRadius: radius,
              fontFamily: `'${form.font_heading}', sans-serif`,
              boxShadow: `0 4px 20px ${form.accent_color}40`,
            }}>
              {tc.ctaText || "Quero reservar"}
            </button>
          ) : tc.ctaStyle === "outline" ? (
            <button className="px-8 py-3 font-semibold text-sm tracking-wide border-2" style={{
              borderColor: form.accent_color,
              color: form.accent_color,
              borderRadius: radius,
              fontFamily: `'${form.font_heading}', sans-serif`,
            }}>
              {tc.ctaText || "Quero reservar"}
            </button>
          ) : tc.ctaStyle === "pill" ? (
            <button className="px-10 py-3 text-white font-semibold text-sm tracking-wide rounded-full" style={{
              backgroundColor: form.accent_color,
              fontFamily: `'${form.font_heading}', sans-serif`,
              boxShadow: `0 4px 20px ${form.accent_color}40`,
            }}>
              <Heart className="w-4 h-4 inline mr-2" />
              {tc.ctaText || "Quero reservar"}
            </button>
          ) : (
            <button className="px-8 py-3 text-white font-semibold text-sm tracking-wide" style={{
              backgroundColor: form.accent_color,
              borderRadius: radius,
              fontFamily: `'${form.font_heading}', sans-serif`,
            }}>
              {tc.ctaText || "Quero reservar"}
            </button>
          )}
        </section>
      </div>

      {/* FOOTER */}
      <footer className="py-6 px-6 border-t" style={{ borderColor: `${textCol}10` }}>
        <div className="text-center">
          <img src={logoNatleva} alt="NatLeva" className="h-7 mx-auto mb-2 opacity-50" />
          <p className="text-[10px] tracking-wide" style={{ color: `${textCol}33`, fontFamily: `'${form.font_heading}', sans-serif` }}>
            Proposta exclusiva · NatLeva Viagens
          </p>
        </div>
      </footer>
    </div>
  );
}
