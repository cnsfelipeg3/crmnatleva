import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft, Save, Palette, Type, Eye, Layers, Settings2,
  GripVertical, Sparkles, MapPin, Plane, Hotel, Star, CheckCircle,
  ChevronDown, Camera, Globe, Calendar, Clock,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import logoNatleva from "@/assets/logo-natleva-clean.png";

const FONT_OPTIONS = [
  "Playfair Display", "Montserrat", "DM Sans", "Cormorant Garamond",
  "Inter", "Open Sans", "Lato", "Poppins", "Raleway", "Merriweather",
  "Libre Baskerville", "Source Serif Pro", "Space Grotesk",
];

const SECTION_TYPES = [
  { type: "hero", label: "Capa / Hero", icon: Camera },
  { type: "destinations", label: "Destinos", icon: MapPin },
  { type: "flights", label: "Voos", icon: Plane },
  { type: "hotels", label: "Hotéis", icon: Hotel },
  { type: "experiences", label: "Experiências", icon: Star },
  { type: "pricing", label: "Valores", icon: Sparkles },
];

type ActivePanel = "colors" | "fonts" | "sections" | "settings" | null;

const defaultForm = {
  name: "",
  description: "",
  font_heading: "Playfair Display",
  font_body: "Inter",
  primary_color: "#1a2332",
  accent_color: "#c9a84c",
  theme_config: { style: "classic", backgroundPattern: "none" },
  sections: SECTION_TYPES.map((s) => ({ type: s.type, enabled: true })),
  is_default: false,
  is_active: true,
};

/* ═══ Google Fonts Loader ═══ */
function useGoogleFont(fontName: string) {
  useEffect(() => {
    if (!fontName) return;
    const id = `gfont-${fontName.replace(/\s+/g, "-")}`;
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}:wght@300;400;500;600;700&display=swap`;
    document.head.appendChild(link);
  }, [fontName]);
}

/* ═══ Live Preview Component ═══ */
function TemplatePreview({ form, activePanel, onClickSection }: {
  form: typeof defaultForm;
  activePanel: ActivePanel;
  onClickSection: (panel: ActivePanel) => void;
}) {
  const enabledSections = form.sections.filter((s) => s.enabled).map((s) => s.type);
  const heroImg = "https://images.unsplash.com/photo-1488085061387-422e29b40080?w=1920&h=1080&fit=crop&q=80";
  const destImgs = [
    "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800&h=600&fit=crop&q=80",
    "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&h=600&fit=crop&q=80",
    "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&h=600&fit=crop&q=80",
  ];
  const hotelImg = "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=400&fit=crop&q=80";

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

  return (
    <div className="bg-background rounded-xl border border-border overflow-hidden shadow-inner">
      {/* HERO */}
      {enabledSections.includes("hero") && (
        <div
          className={clickableClass("colors")}
          onClick={() => onClickSection("colors")}
        >
          {editOverlay("Editar cores")}
          <section className="relative h-[340px] flex items-end justify-center overflow-hidden">
            <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${heroImg})` }} />
            <div className="absolute inset-0" style={{
              background: `linear-gradient(to top, ${form.primary_color} 0%, ${form.primary_color}80 40%, transparent 100%)`,
            }} />

            <div className="absolute top-5 left-1/2 -translate-x-1/2 z-10">
              <img src={logoNatleva} alt="NatLeva" className="h-8 drop-shadow-lg" />
            </div>

            <div className="relative z-10 text-center text-white pb-8 px-6 max-w-2xl">
              <p className="text-[10px] tracking-[0.35em] uppercase opacity-60 mb-3" style={{ fontFamily: `'${form.font_body}', sans-serif` }}>
                Maria & João Silva
              </p>
              <h1
                className="text-3xl font-bold leading-tight mb-3"
                style={{ fontFamily: `'${form.font_heading}', serif`, letterSpacing: "-0.02em" }}
              >
                Safari de Luxo · Tanzânia & Zanzibar
              </h1>
              <p className="text-sm opacity-70 font-light tracking-wide" style={{ fontFamily: `'${form.font_body}', sans-serif` }}>
                10 — 24 de agosto de 2026
              </p>
              <div className="flex items-center justify-center gap-3 mt-5 opacity-40">
                <div className="h-px w-8 bg-white/50" />
                <span className="text-[9px] tracking-[0.3em] uppercase" style={{ fontFamily: `'${form.font_heading}', sans-serif` }}>
                  Proposta exclusiva
                </span>
                <div className="h-px w-8 bg-white/50" />
              </div>
            </div>
          </section>
        </div>
      )}

      {/* INTRO */}
      <div
        className={clickableClass("fonts")}
        onClick={() => onClickSection("fonts")}
      >
        {editOverlay("Editar tipografia")}
        <section className="max-w-2xl mx-auto py-10 px-6 text-center">
          <div className="w-10 h-px mx-auto mb-6" style={{ backgroundColor: form.accent_color }} />
          <p className="text-base leading-relaxed text-muted-foreground font-light italic" style={{ fontFamily: `'${form.font_body}', sans-serif` }}>
            "Uma jornada exclusiva pelos cenários mais deslumbrantes da África, 
            com hospedagens de luxo e experiências inesquecíveis."
          </p>
          <div className="w-10 h-px mx-auto mt-6" style={{ backgroundColor: form.accent_color }} />
        </section>
      </div>

      {/* DESTINATIONS */}
      {enabledSections.includes("destinations") && (
        <div
          className={clickableClass("sections")}
          onClick={() => onClickSection("sections")}
        >
          {editOverlay("Editar seções")}
          <section className="py-8 px-6">
            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-3 mb-2">
                <div className="h-px w-8" style={{ background: `linear-gradient(to right, transparent, ${form.accent_color}60)` }} />
                <h2 className="text-2xl font-bold tracking-tight" style={{ fontFamily: `'${form.font_heading}', serif` }}>
                  Seus Destinos
                </h2>
                <div className="h-px w-8" style={{ background: `linear-gradient(to left, transparent, ${form.accent_color}60)` }} />
              </div>
              <p className="text-xs text-muted-foreground" style={{ fontFamily: `'${form.font_body}', sans-serif` }}>
                Os lugares que você vai explorar
              </p>
            </div>
            <div className="max-w-4xl mx-auto grid grid-cols-3 gap-3">
              {["Roma", "Paris", "Londres"].map((dest, i) => (
                <div key={dest} className="rounded-xl overflow-hidden relative h-40 shadow-sm">
                  <img src={destImgs[i]} alt={dest} className="w-full h-full object-cover" />
                  <div className="absolute inset-0" style={{
                    background: `linear-gradient(to top, ${form.primary_color}cc, transparent)`,
                  }} />
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
        <section className="py-8 px-6" style={{ backgroundColor: `${form.accent_color}08` }}>
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold tracking-tight" style={{ fontFamily: `'${form.font_heading}', serif` }}>Voos</h2>
            <p className="text-xs text-muted-foreground" style={{ fontFamily: `'${form.font_body}', sans-serif` }}>Seus voos com todos os detalhes</p>
          </div>
          <div className="max-w-2xl mx-auto">
            <div className="rounded-xl border border-border/40 bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Plane className="w-4 h-4" style={{ color: form.accent_color }} />
                  <span className="font-bold text-sm" style={{ fontFamily: `'${form.font_heading}', sans-serif` }}>LATAM Airlines</span>
                  <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono">LA8084</span>
                </div>
                <span className="text-xs text-muted-foreground">10 de ago. de 2026</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-left">
                  <p className="text-2xl font-bold" style={{ fontFamily: `'${form.font_heading}', sans-serif` }}>23:55</p>
                  <p className="text-lg font-bold">GRU</p>
                </div>
                <div className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex items-center">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: form.accent_color }} />
                    <div className="flex-1 h-px bg-muted-foreground/25 mx-1" />
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: form.accent_color }} />
                  </div>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" /> 11h45min
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold" style={{ fontFamily: `'${form.font_heading}', sans-serif` }}>14:40</p>
                  <p className="text-lg font-bold">FCO</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* HOTELS */}
      {enabledSections.includes("hotels") && (
        <section className="py-8 px-6">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold tracking-tight" style={{ fontFamily: `'${form.font_heading}', serif` }}>Hospedagens</h2>
          </div>
          <div className="max-w-2xl mx-auto">
            <div className="rounded-xl border border-border/30 bg-card overflow-hidden shadow-sm">
              <div className="h-36 overflow-hidden">
                <img src={hotelImg} alt="Hotel" className="w-full h-full object-cover" />
              </div>
              <div className="p-5">
                <h3 className="font-semibold text-base" style={{ fontFamily: `'${form.font_heading}', serif` }}>Hotel Hassler Roma</h3>
                <div className="flex gap-0.5 mt-1">{[1,2,3,4,5].map(i => <Star key={i} className="w-3 h-3 text-amber-400 fill-amber-400" />)}</div>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <MapPin className="w-3 h-3" style={{ color: `${form.accent_color}99` }} /> Piazza della Trinità dei Monti
                </p>
                <div className="flex gap-2 mt-3">
                  {["Suite Deluxe", "Café incluso", "5 noites"].map(tag => (
                    <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full border" style={{
                      color: form.accent_color,
                      borderColor: `${form.accent_color}25`,
                      backgroundColor: `${form.accent_color}08`,
                    }}>{tag}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* PRICING */}
      {enabledSections.includes("pricing") && (
        <section className="py-8 px-6">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold tracking-tight" style={{ fontFamily: `'${form.font_heading}', serif` }}>Investimento</h2>
          </div>
          <div className="max-w-md mx-auto">
            <div className="rounded-xl border p-8 text-center shadow-sm" style={{ borderColor: `${form.accent_color}25` }}>
              <p className="text-[9px] uppercase tracking-[0.25em] text-muted-foreground/50 mb-1" style={{ fontFamily: `'${form.font_heading}', sans-serif` }}>
                Valor por pessoa
              </p>
              <p className="text-2xl font-bold" style={{ fontFamily: `'${form.font_heading}', sans-serif` }}>R$ 24.500,00</p>
              <div className="my-4 h-px" style={{ backgroundColor: `${form.accent_color}20` }} />
              <p className="text-[9px] uppercase tracking-[0.25em] text-muted-foreground/50 mb-1" style={{ fontFamily: `'${form.font_heading}', sans-serif` }}>
                Valor total da viagem
              </p>
              <p className="text-3xl font-bold" style={{ fontFamily: `'${form.font_heading}', sans-serif`, color: form.accent_color }}>
                R$ 49.000,00
              </p>
            </div>
          </div>
        </section>
      )}

      {/* FOOTER */}
      <footer className="py-6 px-6 border-t border-border/30">
        <div className="text-center">
          <img src={logoNatleva} alt="NatLeva" className="h-7 mx-auto mb-2 opacity-50" />
          <p className="text-[10px] text-muted-foreground/40 tracking-wide" style={{ fontFamily: `'${form.font_heading}', sans-serif` }}>
            Proposta exclusiva · NatLeva Viagens
          </p>
        </div>
      </footer>
    </div>
  );
}

/* ═══ Main Editor ═══ */
export default function ProposalTemplateEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNew = !id || id === "novo";
  const [form, setForm] = useState(defaultForm);
  const [activePanel, setActivePanel] = useState<ActivePanel>("colors");
  const [hasChanges, setHasChanges] = useState(false);

  useGoogleFont(form.font_heading);
  useGoogleFont(form.font_body);

  const { data: template, isLoading } = useQuery({
    queryKey: ["proposal_template", id],
    queryFn: async () => {
      if (isNew) return null;
      const { data, error } = await supabase
        .from("proposal_templates")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !isNew,
  });

  useEffect(() => {
    if (template) {
      setForm({
        name: template.name || "",
        description: template.description || "",
        font_heading: template.font_heading || "Playfair Display",
        font_body: template.font_body || "Inter",
        primary_color: template.primary_color || "#1a2332",
        accent_color: template.accent_color || "#c9a84c",
        theme_config: (template.theme_config as any) || { style: "classic", backgroundPattern: "none" },
        sections: Array.isArray(template.sections) && (template.sections as any[]).length ? template.sections as any[] : defaultForm.sections,
        is_default: template.is_default || false,
        is_active: template.is_active ?? true,
      });
    }
  }, [template]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (isNew) {
        const { error } = await supabase.from("proposal_templates").insert(form);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("proposal_templates").update({ ...form, updated_at: new Date().toISOString() }).eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposal_templates"] });
      toast.success("Modelo salvo!");
      setHasChanges(false);
      if (isNew) navigate("/propostas/modelos");
    },
    onError: () => toast.error("Erro ao salvar"),
  });

  const update = (patch: Partial<typeof defaultForm>) => {
    setForm((f) => ({ ...f, ...patch }));
    setHasChanges(true);
  };

  const toggleSection = (type: string) => {
    update({
      sections: form.sections.map((s) => s.type === type ? { ...s, enabled: !s.enabled } : s),
    });
  };

  if (isLoading) return <div className="p-6 text-center text-muted-foreground">Carregando...</div>;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] animate-fade-in">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background/95 backdrop-blur-sm z-10 shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/propostas/modelos")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <Input
              value={form.name}
              onChange={(e) => update({ name: e.target.value })}
              placeholder="Nome do modelo..."
              className="border-none shadow-none p-0 h-auto text-lg font-semibold focus-visible:ring-0 bg-transparent"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && <Badge variant="secondary" className="text-[10px]">Alterações não salvas</Badge>}
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="gap-2">
            <Save className="w-4 h-4" />
            {saveMutation.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel - tools */}
        <div className="w-80 border-r border-border bg-muted/20 flex flex-col shrink-0 overflow-hidden">
          {/* Panel tabs */}
          <div className="flex border-b border-border shrink-0">
            {[
              { key: "colors" as const, icon: Palette, label: "Cores" },
              { key: "fonts" as const, icon: Type, label: "Fontes" },
              { key: "sections" as const, icon: Layers, label: "Seções" },
              { key: "settings" as const, icon: Settings2, label: "Config" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActivePanel(tab.key)}
                className={cn(
                  "flex-1 flex flex-col items-center gap-1 py-3 text-[10px] font-medium transition-colors",
                  activePanel === tab.key
                    ? "text-primary border-b-2 border-primary bg-primary/5"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Panel content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {activePanel === "colors" && (
              <>
                <div>
                  <Label className="text-xs font-medium mb-2 block">Cor principal</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color" value={form.primary_color}
                      onChange={(e) => update({ primary_color: e.target.value })}
                      className="w-12 h-10 rounded-lg border border-border cursor-pointer shrink-0"
                    />
                    <Input value={form.primary_color} onChange={(e) => update({ primary_color: e.target.value })} className="font-mono text-xs" />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">Usada no fundo da capa e gradientes dos destinos</p>
                </div>

                <div>
                  <Label className="text-xs font-medium mb-2 block">Cor de destaque</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color" value={form.accent_color}
                      onChange={(e) => update({ accent_color: e.target.value })}
                      className="w-12 h-10 rounded-lg border border-border cursor-pointer shrink-0"
                    />
                    <Input value={form.accent_color} onChange={(e) => update({ accent_color: e.target.value })} className="font-mono text-xs" />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">Usada em separadores, badges e valores</p>
                </div>

                {/* Quick presets */}
                <div>
                  <Label className="text-xs font-medium mb-2 block">Paletas rápidas</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { primary: "#1a2332", accent: "#c9a84c", name: "Clássico" },
                      { primary: "#0e7c61", accent: "#f59e0b", name: "Tropical" },
                      { primary: "#111827", accent: "#6366f1", name: "Moderno" },
                      { primary: "#4a1942", accent: "#e8a0bf", name: "Romântico" },
                      { primary: "#1a472a", accent: "#d4a853", name: "NatLeva" },
                      { primary: "#0c1426", accent: "#38bdf8", name: "Oceano" },
                      { primary: "#27180e", accent: "#f97316", name: "Deserto" },
                      { primary: "#1e1b2e", accent: "#a78bfa", name: "Noturno" },
                    ].map((preset) => (
                      <button
                        key={preset.name}
                        onClick={() => update({ primary_color: preset.primary, accent_color: preset.accent })}
                        className="group flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-lg overflow-hidden border border-border shadow-sm">
                          <div className="h-1/2" style={{ backgroundColor: preset.primary }} />
                          <div className="h-1/2" style={{ backgroundColor: preset.accent }} />
                        </div>
                        <span className="text-[9px] text-muted-foreground group-hover:text-foreground">{preset.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {activePanel === "fonts" && (
              <>
                <div>
                  <Label className="text-xs font-medium mb-2 block">Fonte de títulos</Label>
                  <Select value={form.font_heading} onValueChange={(v) => update({ font_heading: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FONT_OPTIONS.map((f) => (
                        <SelectItem key={f} value={f}>
                          <span style={{ fontFamily: `'${f}', sans-serif` }}>{f}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="mt-3 p-3 rounded-lg bg-muted/50 border border-border/50">
                    <p className="text-xl font-bold" style={{ fontFamily: `'${form.font_heading}', serif` }}>Título Exemplo</p>
                    <p className="text-sm text-muted-foreground" style={{ fontFamily: `'${form.font_heading}', serif` }}>Subtítulo da proposta</p>
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-medium mb-2 block">Fonte do corpo</Label>
                  <Select value={form.font_body} onValueChange={(v) => update({ font_body: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FONT_OPTIONS.map((f) => (
                        <SelectItem key={f} value={f}>
                          <span style={{ fontFamily: `'${f}', sans-serif` }}>{f}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="mt-3 p-3 rounded-lg bg-muted/50 border border-border/50">
                    <p className="text-sm" style={{ fontFamily: `'${form.font_body}', sans-serif` }}>
                      Uma jornada exclusiva pelos cenários mais deslumbrantes, com hospedagens de luxo e experiências inesquecíveis.
                    </p>
                  </div>
                </div>

                {/* Font combo preview */}
                <div className="p-4 rounded-xl border border-border" style={{
                  background: `linear-gradient(135deg, ${form.primary_color} 0%, ${form.primary_color}dd 100%)`,
                }}>
                  <p className="text-lg font-bold text-white mb-1" style={{ fontFamily: `'${form.font_heading}', serif` }}>
                    Preview Combinação
                  </p>
                  <p className="text-xs text-white/70" style={{ fontFamily: `'${form.font_body}', sans-serif` }}>
                    {form.font_heading} + {form.font_body}
                  </p>
                </div>
              </>
            )}

            {activePanel === "sections" && (
              <>
                <p className="text-xs text-muted-foreground">Ative ou desative as seções da proposta. O preview atualiza em tempo real.</p>
                <div className="space-y-1.5">
                  {SECTION_TYPES.map((sec) => {
                    const formSec = form.sections.find((s) => s.type === sec.type);
                    const enabled = formSec?.enabled ?? true;
                    return (
                      <div
                        key={sec.type}
                        className={cn(
                          "flex items-center justify-between px-3 py-3 rounded-lg border transition-colors",
                          enabled ? "border-primary/20 bg-primary/5" : "border-border/50 bg-transparent"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40" />
                          <sec.icon className={cn("w-4 h-4", enabled ? "text-primary" : "text-muted-foreground/40")} />
                          <span className={cn("text-sm font-medium", !enabled && "text-muted-foreground/60")}>
                            {sec.label}
                          </span>
                        </div>
                        <Switch checked={enabled} onCheckedChange={() => toggleSection(sec.type)} />
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {activePanel === "settings" && (
              <>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Nome do modelo</Label>
                  <Input value={form.name} onChange={(e) => update({ name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Descrição</Label>
                  <Textarea value={form.description} onChange={(e) => update({ description: e.target.value })} rows={3} />
                </div>

                <div className="flex items-center justify-between px-3 py-3 rounded-lg border border-border/50">
                  <div>
                    <p className="text-sm font-medium">Modelo padrão</p>
                    <p className="text-[10px] text-muted-foreground">Usar automaticamente em novas propostas</p>
                  </div>
                  <Switch checked={form.is_default} onCheckedChange={(v) => update({ is_default: v })} />
                </div>

                <div className="flex items-center justify-between px-3 py-3 rounded-lg border border-border/50">
                  <div>
                    <p className="text-sm font-medium">Ativo</p>
                    <p className="text-[10px] text-muted-foreground">Disponível para seleção</p>
                  </div>
                  <Switch checked={form.is_active} onCheckedChange={(v) => update({ is_active: v })} />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right panel - live preview */}
        <div className="flex-1 overflow-y-auto bg-muted/30 p-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-2 mb-4">
              <Eye className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">Preview ao vivo — clique nas seções para editar</span>
            </div>
            <TemplatePreview
              form={form}
              activePanel={activePanel}
              onClickSection={setActivePanel}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
