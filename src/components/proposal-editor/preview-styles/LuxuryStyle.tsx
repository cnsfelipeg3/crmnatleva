import { useState } from "react";
import { Clock, MapPin, Star, Heart, Anchor, Wine, Calendar, Coffee, Utensils, Shield, Camera, Check, ChevronDown, Plane, Luggage, Wifi, Users, CreditCard, Sparkles, Sun } from "lucide-react";
import AirlineLogo from "@/components/AirlineLogo";
import logoNatleva from "@/assets/logo-natleva-clean.png";
import { type StylePreviewProps, clickableClass, editOverlay, getRadius, getShadow } from "../TemplatePreview";

const heroImg = "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=1920&h=1080&fit=crop&q=80";
const hotelGallery = [
  "https://images.unsplash.com/photo-1602343168117-bb8ffe3e2e9f?w=600&h=400&fit=crop&q=80",
  "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&h=400&fit=crop&q=80",
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=400&fit=crop&q=80",
  "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600&h=400&fit=crop&q=80",
  "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=600&h=400&fit=crop&q=80",
];

const timeline = [
  { day: "Dia 1", date: "15 jun", title: "São Paulo → Dubai", desc: "Voo noturno Emirates Business", type: "flight" },
  { day: "Dia 2", date: "16 jun", title: "Dubai → Atenas → Santorini", desc: "Conexão + voo doméstico Aegean", type: "flight" },
  { day: "Dia 3-4", date: "17-18 jun", title: "Oia · Exploração", desc: "Caldera walk, blue domes, sunset spot", type: "explore" },
  { day: "Dia 5", date: "19 jun", title: "Sunset Sailing", desc: "Navegação privativa pela Caldera", type: "exp" },
  { day: "Dia 6", date: "20 jun", title: "Wine Tasting", desc: "Vinícolas de Santorini", type: "exp" },
  { day: "Dia 7-8", date: "21-22 jun", title: "Dia livre · Spa", desc: "Descanso, praia, couples spa", type: "relax" },
  { day: "Dia 9", date: "23 jun", title: "Ferry para Mykonos", desc: "Travessia de 2h pelo Egeu", type: "transfer" },
  { day: "Dia 10-11", date: "24-25 jun", title: "Mykonos · Praias", desc: "Psarou, Ornos, Little Venice", type: "explore" },
  { day: "Dia 12", date: "26 jun", title: "Beach Club & Nightlife", desc: "Scorpios Mykonos · Jantar à beira-mar", type: "exp" },
  { day: "Dia 13", date: "27 jun", title: "Retorno", desc: "JMK → ATH → DXB → GRU", type: "flight" },
];

export function LuxuryStyle({ form, activePanel, onClickSection }: StylePreviewProps) {
  const [galleryIdx, setGalleryIdx] = useState(0);
  const [expandedFlight, setExpandedFlight] = useState<number | null>(0);
  const tc = form.theme_config;
  const textCol = form.text_color || "#f5f0eb";
  const bgCol = form.bg_color || "#0f0a1a";
  const hFont = `'${form.font_heading}', serif`;
  const bFont = `'${form.font_body}', sans-serif`;
  const gradBg = `linear-gradient(${tc.gradientAngle || 135}deg, ${form.primary_color}, ${tc.gradientSecondary || "#2d1b4e"})`;

  return (
    <div style={{ backgroundColor: bgCol, color: textCol }}>
      {/* HERO — Split */}
      <div className={clickableClass("layout", activePanel)} onClick={() => onClickSection("layout")}>
        {editOverlay("Editar layout")}
        <section className="flex h-[460px] overflow-hidden">
          <div className="w-[55%] h-full relative">
            <img src={heroImg} alt="Santorini" className="w-full h-full object-cover" />
          </div>
          <div className="w-[45%] h-full flex flex-col items-center justify-center px-10" style={{ background: gradBg }}>
            <img src={logoNatleva} alt="NatLeva" className="h-7 mb-10 opacity-70" />
            <p className="text-[10px] tracking-[0.4em] uppercase opacity-40 mb-4" style={{ fontFamily: bFont }}>Uma viagem para dois</p>
            <h1 className="text-4xl font-bold text-center leading-[1.15] mb-3" style={{ fontFamily: hFont, letterSpacing: "-0.02em" }}>Lua de Mel</h1>
            <p className="text-xl italic opacity-70 mb-6" style={{ fontFamily: hFont }}>Santorini & Mykonos</p>
            <div className="flex items-center gap-3 opacity-40 text-xs" style={{ fontFamily: bFont }}>
              <Heart className="w-3.5 h-3.5" />
              <span>Carolina & Rafael</span>
              <span className="w-1 h-1 rounded-full bg-current" />
              <span>15 — 28 jun 2026</span>
            </div>
            <div className="mt-6 flex items-center gap-4 opacity-20">
              <div className="h-px w-16" style={{ backgroundColor: form.accent_color }} />
              <Heart className="w-3 h-3 fill-current" style={{ color: form.accent_color }} />
              <div className="h-px w-16" style={{ backgroundColor: form.accent_color }} />
            </div>
          </div>
        </section>
      </div>

      {/* TRIP OVERVIEW */}
      <section className="px-8 py-5 flex items-center justify-center gap-8 border-b" style={{ borderColor: `${form.accent_color}10` }}>
        {[
          { label: "Duração", value: "13 noites" },
          { label: "Ilhas", value: "2 destinos" },
          { label: "Voos", value: "5 trechos" },
          { label: "Classe", value: "Business" },
          { label: "Estilo", value: "Romântico" },
        ].map((item) => (
          <div key={item.label} className="text-center">
            <p className="text-[9px] uppercase tracking-[0.15em] opacity-30" style={{ fontFamily: bFont }}>{item.label}</p>
            <p className="text-sm font-bold mt-0.5" style={{ fontFamily: hFont }}>{item.value}</p>
          </div>
        ))}
      </section>

      {/* INTRO */}
      <div className={clickableClass("fonts", activePanel)} onClick={() => onClickSection("fonts")}>
        {editOverlay("Editar tipografia")}
        <section className="max-w-xl mx-auto px-8 py-14 text-center">
          <p className="text-lg italic leading-relaxed opacity-60" style={{ fontFamily: hFont }}>
            "Dois corações, um destino. Descubram juntos as ilhas mais românticas do Mediterrâneo, onde cada pôr do sol é uma promessa e cada amanhecer é uma celebração do amor."
          </p>
        </section>
      </div>

      {/* TIMELINE */}
      <section className="px-8 py-14" style={{ backgroundColor: `${form.accent_color}05` }}>
        <h2 className="text-center text-2xl font-bold mb-2 tracking-tight" style={{ fontFamily: hFont }}>Roteiro da Viagem</h2>
        <p className="text-center text-xs mb-10 opacity-40" style={{ fontFamily: bFont }}>13 dias de romance pelas ilhas gregas</p>
        <div className="max-w-2xl mx-auto relative">
          <div className="absolute left-[18px] top-2 bottom-2 w-px" style={{ backgroundColor: `${form.accent_color}20` }} />
          {timeline.map((item, i) => {
            const typeColors: Record<string, string> = { flight: form.accent_color, exp: "#f472b6", explore: "#a78bfa", relax: "#34d399", transfer: "#60a5fa" };
            const col = typeColors[item.type] || form.accent_color;
            return (
              <div key={i} className="flex items-start gap-4 mb-3">
                <div className="w-[36px] shrink-0 flex justify-center pt-1.5">
                  <div className="w-[10px] h-[10px] rounded-full z-10" style={{ backgroundColor: col, boxShadow: `0 0 8px ${col}40` }} />
                </div>
                <div className="flex-1 pb-3 border-b" style={{ borderColor: `${form.accent_color}08` }}>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-bold font-mono" style={{ color: col }}>{item.day}</span>
                    <span className="text-[10px] opacity-30">{item.date}</span>
                  </div>
                  <p className="text-sm font-semibold" style={{ fontFamily: hFont }}>{item.title}</p>
                  <p className="text-[10px] opacity-40 mt-0.5" style={{ fontFamily: bFont }}>{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* TRIP DISTRIBUTION */}
      <section className="px-8 py-10">
        <h3 className="text-center text-lg font-bold mb-6" style={{ fontFamily: hFont }}>Distribuição da Viagem</h3>
        <div className="max-w-2xl mx-auto">
          <div className="flex rounded-full overflow-hidden h-3 mb-3" style={{ backgroundColor: `${form.accent_color}10` }}>
            <div className="h-full" style={{ width: "15%", backgroundColor: `${form.accent_color}60` }} title="Voos" />
            <div className="h-full" style={{ width: "55%", backgroundColor: form.accent_color }} title="Santorini" />
            <div className="h-full" style={{ width: "23%", backgroundColor: `${form.accent_color}80` }} title="Mykonos" />
            <div className="h-full" style={{ width: "7%", backgroundColor: `${form.accent_color}40` }} title="Transfer" />
          </div>
          <div className="flex text-[9px] opacity-40">
            <span style={{ width: "15%" }}>Voos</span>
            <span style={{ width: "55%" }}>Santorini · 7 noites</span>
            <span style={{ width: "23%" }}>Mykonos · 3 noites</span>
            <span style={{ width: "7%" }}>Ferry</span>
          </div>
        </div>
      </section>

      {/* FLIGHTS — Vertical Timeline */}
      <section className="px-8 py-14">
        <h2 className="text-center text-2xl font-bold mb-2 tracking-tight" style={{ fontFamily: hFont }}>Itinerário Aéreo</h2>
        <p className="text-center text-xs mb-10 opacity-40" style={{ fontFamily: bFont }}>5 trechos · Emirates Business + Aegean</p>
        <div className="max-w-lg mx-auto relative">
          <div className="absolute left-[22px] top-4 bottom-4 w-px" style={{ backgroundColor: `${form.accent_color}30` }} />
          {[
            { airline: "EK", name: "Emirates", flight: "EK 262", from: "GRU", fromCity: "São Paulo", dep: "03:15", to: "DXB", toCity: "Dubai", arr: "01:05", dur: "14h50", date: "15 jun", cls: "Business", aircraft: "A380-800", meal: "Jantar gourmet + Café", bag: "2×32kg", bagHand: "1×7kg", seat: "Lie-flat 180°", wifi: true, next: true, isMain: true },
            { label: "Conexão Dubai · 4h20 · Lounge Emirates", isConnection: true },
            { airline: "EK", name: "Emirates", flight: "EK 105", from: "DXB", fromCity: "Dubai", dep: "05:25", to: "ATH", toCity: "Atenas", arr: "09:40", dur: "5h15", date: "16 jun", cls: "Business", aircraft: "B777-300ER", meal: "Café da manhã", bag: "2×32kg", bagHand: "1×7kg", seat: "Lie-flat", wifi: true, isMain: true },
            { label: "Conexão Atenas · 4h40 · Transfer aeroporto", isConnection: true },
            { airline: "A3", name: "Aegean Airlines", flight: "A3 356", from: "ATH", fromCity: "Atenas", dep: "14:20", to: "JTR", toCity: "Santorini", arr: "15:10", dur: "0h50", date: "16 jun", cls: "Econômica", aircraft: "A320neo", meal: "Snack", bag: "1×23kg", bagHand: "1×8kg", seat: "Reclinável", wifi: false, isMain: false },
          ].map((item: any, i) => {
            if (item.isConnection) {
              return (
                <div key={i} className="flex items-center gap-4 py-2 pl-2">
                  <div className="w-[10px] h-[10px] rounded-full border-2 shrink-0 z-10" style={{ borderColor: form.accent_color, backgroundColor: bgCol }} />
                  <p className="text-[10px] italic opacity-30" style={{ fontFamily: bFont }}>{item.label}</p>
                </div>
              );
            }
            return (
              <div key={i} className="flex items-start gap-4 py-3 pl-2">
                <div className="w-[10px] h-[10px] rounded-full shrink-0 mt-3 z-10" style={{ backgroundColor: form.accent_color, boxShadow: `0 0 8px ${form.accent_color}40` }} />
                <div className="flex-1 p-4 border rounded-xl cursor-pointer" style={{ borderColor: `${form.accent_color}15`, backgroundColor: `${form.accent_color}05` }} onClick={() => setExpandedFlight(expandedFlight === i ? null : i)}>
                  <div className="flex items-center gap-3 mb-3">
                    <AirlineLogo iata={item.airline} size={32} />
                    <div>
                      <p className="text-xs font-semibold" style={{ fontFamily: hFont }}>{item.name}</p>
                      <p className="text-[10px] font-mono opacity-40">{item.flight} · {item.aircraft}</p>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                      <span className="text-[9px] px-2 py-0.5 rounded-full" style={{ backgroundColor: `${form.accent_color}15`, color: form.accent_color }}>{item.cls}</span>
                      <ChevronDown className={`w-3.5 h-3.5 opacity-30 transition-transform ${expandedFlight === i ? "rotate-180" : ""}`} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold font-mono" style={{ letterSpacing: "-0.05em" }}>{item.dep}</p>
                      <p className="text-sm font-bold font-mono" style={{ color: form.accent_color }}>{item.from}</p>
                      <p className="text-[10px] opacity-30">{item.fromCity}</p>
                    </div>
                    <div className="flex flex-col items-center gap-1 px-4">
                      <p className="text-[10px] opacity-30">{item.date}</p>
                      <div className="w-16 h-px" style={{ backgroundColor: `${form.accent_color}25` }} />
                      <p className="text-[10px] opacity-30 flex items-center gap-1"><Clock className="w-3 h-3" /> {item.dur}</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-baseline justify-end gap-1">
                        <p className="text-2xl font-bold font-mono" style={{ letterSpacing: "-0.05em" }}>{item.arr}</p>
                        {item.next && <span className="text-xs font-bold" style={{ color: form.accent_color }}>+1</span>}
                      </div>
                      <p className="text-sm font-bold font-mono" style={{ color: form.accent_color }}>{item.to}</p>
                      <p className="text-[10px] opacity-30">{item.toCity}</p>
                    </div>
                  </div>
                  {/* Expanded details */}
                  {expandedFlight === i && (
                    <div className="mt-3 pt-3 border-t grid grid-cols-3 gap-3" style={{ borderColor: `${form.accent_color}10` }}>
                      <div><p className="text-[8px] uppercase opacity-30">Bagagem</p><p className="text-[10px] mt-0.5">{item.bag} desp. · {item.bagHand} mão</p></div>
                      <div><p className="text-[8px] uppercase opacity-30">Refeição</p><p className="text-[10px] mt-0.5">{item.meal}</p></div>
                      <div><p className="text-[8px] uppercase opacity-30">Assento</p><p className="text-[10px] mt-0.5">{item.seat}</p></div>
                      <div><p className="text-[8px] uppercase opacity-30">Wi-Fi</p><p className="text-[10px] mt-0.5">{item.wifi ? "✓ Disponível" : "✗ Indisponível"}</p></div>
                      <div><p className="text-[8px] uppercase opacity-30">Aeronave</p><p className="text-[10px] mt-0.5">{item.aircraft}</p></div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* HOTEL with Gallery */}
      <section className="px-8 py-14">
        <h2 className="text-center text-2xl font-bold mb-10 tracking-tight" style={{ fontFamily: hFont }}>Hospedagem</h2>
        <div className="max-w-3xl mx-auto relative">
          {/* Main image */}
          <div className="rounded-2xl overflow-hidden h-[300px] relative">
            <img src={hotelGallery[galleryIdx]} alt="Canaves" className="w-full h-full object-cover transition-all duration-500" />
            <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-sm text-white text-[10px] px-2.5 py-1 rounded-full flex items-center gap-1.5">
              <Camera className="w-3 h-3" /> {galleryIdx + 1}/{hotelGallery.length}
            </div>
          </div>
          {/* Gallery strip */}
          <div className="flex gap-2 mt-3">
            {hotelGallery.map((img, j) => (
              <div key={j} className="flex-1 h-16 rounded-lg overflow-hidden cursor-pointer border-2 transition-all" style={{ borderColor: galleryIdx === j ? form.accent_color : "transparent", opacity: galleryIdx === j ? 1 : 0.5 }} onClick={() => setGalleryIdx(j)}>
                <img src={img} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
          {/* Floating card */}
          <div className="relative -mt-4 mx-6 p-6 border backdrop-blur-sm" style={{ borderRadius: "1.25rem", borderColor: `${form.accent_color}15`, backgroundColor: `${bgCol}ee`, boxShadow: `0 8px 40px ${form.accent_color}10` }}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[9px] tracking-[0.3em] uppercase opacity-25 mb-1" style={{ fontFamily: bFont }}>Oia, Santorini</p>
                <h3 className="text-xl font-bold mb-2" style={{ fontFamily: hFont }}>Canaves Oia Epitome</h3>
                <div className="flex gap-0.5 mb-3">{[1,2,3,4,5].map(j => <Star key={j} className="w-3 h-3 text-amber-400 fill-amber-400" />)}</div>
                <p className="text-xs opacity-40 leading-relaxed max-w-md" style={{ fontFamily: bFont }}>
                  Suite com piscina privativa infinity e vista 180° para a Caldera. Café da manhã na varanda com champagne ao nascer do sol. Butler dedicado.
                </p>
              </div>
              <div className="text-right shrink-0 ml-6">
                <p className="text-[9px] uppercase tracking-wider opacity-25 mb-1">Check-in</p>
                <p className="text-sm font-bold" style={{ fontFamily: hFont }}>16 jun · 15h</p>
                <p className="text-[9px] uppercase tracking-wider opacity-25 mt-3 mb-1">Check-out</p>
                <p className="text-sm font-bold" style={{ fontFamily: hFont }}>23 jun · 12h</p>
                <p className="text-lg font-bold mt-3" style={{ color: form.accent_color }}>7 noites</p>
              </div>
            </div>
            {/* Details grid */}
            <div className="grid grid-cols-3 gap-3 mt-4 pt-4" style={{ borderTop: `1px solid ${form.accent_color}10` }}>
              <div className="flex items-center gap-2">
                <Coffee className="w-3.5 h-3.5" style={{ color: form.accent_color }} />
                <div><p className="text-[8px] uppercase opacity-25">Regime</p><p className="text-[10px]">Café da manhã</p></div>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5" style={{ color: form.accent_color }} />
                <div><p className="text-[8px] uppercase opacity-25">Quarto</p><p className="text-[10px]">Infinity Suite</p></div>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5" style={{ color: form.accent_color }} />
                <div><p className="text-[8px] uppercase opacity-25">Vista</p><p className="text-[10px]">Caldera Sunset</p></div>
              </div>
            </div>
            {/* Amenities */}
            <div className="flex flex-wrap gap-1.5 mt-4 pt-3" style={{ borderTop: `1px solid ${form.accent_color}08` }}>
              {["Piscina infinity", "Spa casais", "Jacuzzi privativa", "Room service 24h", "Transfer porto", "Concierge", "Champagne welcome", "Turndown service"].map(tag => (
                <span key={tag} className="text-[9px] px-2 py-0.5 rounded-full border flex items-center gap-1" style={{ borderColor: `${form.accent_color}15`, color: `${form.accent_color}aa` }}>
                  <Check className="w-2.5 h-2.5" /> {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* EXPERIENCES — Circular images enriched */}
      <section className="px-8 py-14">
        <h2 className="text-center text-2xl font-bold mb-2 tracking-tight" style={{ fontFamily: hFont }}>Experiências</h2>
        <p className="text-center text-xs mb-10 opacity-30" style={{ fontFamily: bFont }}>Momentos únicos selecionados para vocês</p>
        <div className="max-w-3xl mx-auto grid grid-cols-3 gap-8">
          {[
            { icon: Anchor, title: "Sunset Sailing", desc: "Navegação privativa ao pôr do sol pela Caldera com champagne e finger food gourmet.", img: "https://images.unsplash.com/photo-1530841377377-3ff06c0ca713?w=400&h=400&fit=crop&q=80", dur: "4h", when: "17:00", included: true },
            { icon: Wine, title: "Wine Tasting", desc: "Degustação de vinhos vulcânicos Assyrtiko nas vinícolas centenárias de Santorini.", img: "https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=400&h=400&fit=crop&q=80", dur: "3h", when: "11:00", included: true },
            { icon: Heart, title: "Couples Spa", desc: "Ritual de spa à dois com óleos essenciais gregos e vista panorâmica do Egeu.", img: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&h=400&fit=crop&q=80", dur: "2h", when: "15:00", included: true },
            { icon: Sun, title: "Mykonos Beach Club", desc: "Day pass VIP no Scorpios com espreguiçadeiras frente ao mar e DJ set ao vivo.", img: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=400&fit=crop&q=80", dur: "Dia", when: "10:00", included: false },
            { icon: Camera, title: "Photo Session", desc: "Ensaio fotográfico profissional nos blue domes de Oia ao golden hour.", img: "https://images.unsplash.com/photo-1533105079780-92b9be482077?w=400&h=400&fit=crop&q=80", dur: "1h30", when: "18:00", included: true },
            { icon: Utensils, title: "Jantar Romântico", desc: "Mesa privativa à beira do penhasco com menu degustação e sommelier dedicado.", img: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=400&fit=crop&q=80", dur: "3h", when: "20:00", included: true },
          ].map((exp) => (
            <div key={exp.title} className="text-center group cursor-pointer">
              <div className="w-28 h-28 mx-auto mb-3 rounded-full overflow-hidden border-2 transition-all group-hover:border-4" style={{ borderColor: `${form.accent_color}40` }}>
                <img src={exp.img} alt={exp.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
              </div>
              <h4 className="font-bold text-sm mb-1" style={{ fontFamily: hFont }}>{exp.title}</h4>
              <p className="text-[10px] opacity-30 leading-relaxed mb-2" style={{ fontFamily: bFont }}>{exp.desc}</p>
              <div className="flex items-center justify-center gap-2 text-[9px] opacity-30">
                <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" /> {exp.dur}</span>
                <span>·</span>
                <span>{exp.when}</span>
              </div>
              {exp.included ? (
                <span className="text-[9px] mt-1 inline-flex items-center gap-0.5" style={{ color: form.accent_color }}><Check className="w-3 h-3" /> Incluído</span>
              ) : (
                <span className="text-[9px] mt-1 inline-block opacity-30">Opcional</span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* IMPORTANT INFO */}
      <section className="px-8 py-12" style={{ backgroundColor: `${form.accent_color}05` }}>
        <h2 className="text-center text-xl font-bold mb-8" style={{ fontFamily: hFont }}>Informações Importantes</h2>
        <div className="max-w-2xl mx-auto grid grid-cols-2 gap-3">
          {[
            { icon: Shield, title: "Seguro Viagem", desc: "Cobertura Europa USD 60.000 incluída" },
            { icon: Calendar, title: "Cancelamento", desc: "Gratuito até 45 dias antes da viagem" },
            { icon: Luggage, title: "Bagagem Total", desc: "2×32kg despachada + 1×7kg mão/pax" },
            { icon: CreditCard, title: "Pagamento", desc: "10× sem juros ou 5% desconto PIX" },
          ].map(info => (
            <div key={info.title} className="flex gap-3 p-3 rounded-xl border" style={{ borderColor: `${form.accent_color}10` }}>
              <info.icon className="w-4 h-4 shrink-0 mt-0.5" style={{ color: form.accent_color }} />
              <div>
                <p className="text-xs font-bold" style={{ fontFamily: hFont }}>{info.title}</p>
                <p className="text-[10px] opacity-30 mt-0.5">{info.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING — Glass card with breakdown */}
      <section className="px-8 py-16">
        <div className="max-w-sm mx-auto text-center p-8 border backdrop-blur-sm" style={{ borderRadius: "1.5rem", borderColor: `${form.accent_color}15`, backgroundColor: `${form.accent_color}06`, boxShadow: `0 0 60px ${form.accent_color}08` }}>
          <Heart className="w-5 h-5 mx-auto mb-4 opacity-25" style={{ color: form.accent_color }} />
          <h2 className="text-xl font-bold mb-6" style={{ fontFamily: hFont }}>Investimento</h2>

          {/* Breakdown */}
          <div className="text-left mb-4 space-y-1.5">
            {[
              { item: "Aéreo Business (2 pax)", value: "R$ 48.200" },
              { item: "Canaves Oia · 7 noites", value: "R$ 36.800" },
              { item: "Myconian Villa · 3 noites", value: "R$ 12.600" },
              { item: "Experiências (5 incluídas)", value: "R$ 4.800" },
              { item: "Transfers e ferry", value: "R$ 2.400" },
            ].map(line => (
              <div key={line.item} className="flex justify-between py-1 border-b" style={{ borderColor: `${form.accent_color}08` }}>
                <span className="text-[10px] opacity-40">{line.item}</span>
                <span className="text-[10px] font-mono font-semibold">{line.value}</span>
              </div>
            ))}
          </div>

          <p className="text-[9px] uppercase tracking-[0.3em] opacity-25 mb-2" style={{ fontFamily: bFont }}>Por pessoa</p>
          <p className="text-xl font-bold" style={{ fontFamily: hFont }}>R$ 52.400,00</p>
          <div className="my-4 h-px" style={{ backgroundColor: `${form.accent_color}12` }} />
          <p className="text-[9px] uppercase tracking-[0.3em] opacity-25 mb-2" style={{ fontFamily: bFont }}>Casal · Valor total</p>
          <p className="text-3xl font-bold" style={{ fontFamily: hFont, color: form.accent_color }}>R$ 104.800,00</p>
          <p className="text-[10px] opacity-25 mt-2">10× de R$ 10.480 ou PIX R$ 99.560</p>
          <button className="mt-6 px-10 py-3 font-semibold text-sm tracking-wide border-2" style={{ borderColor: form.accent_color, color: form.accent_color, borderRadius: "2rem", fontFamily: hFont }}>
            {tc.ctaText || "Confirmar Viagem dos Sonhos"}
          </button>
          <p className="text-[9px] mt-3 opacity-15">Válida por 7 dias · Sujeita a disponibilidade</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-8 px-6 text-center" style={{ borderTop: `1px solid ${form.accent_color}08` }}>
        <img src={logoNatleva} alt="NatLeva" className="h-7 mx-auto mb-2 opacity-25" />
        <p className="text-[10px] tracking-wider opacity-15" style={{ fontFamily: bFont }}>Proposta exclusiva · NatLeva Viagens</p>
      </footer>
    </div>
  );
}
