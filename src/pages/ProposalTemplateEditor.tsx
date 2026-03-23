import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft, Save, Palette, Type, Eye, Layers, Settings2,
  GripVertical, Sparkles, MapPin, Plane, Hotel, Star, CheckCircle,
  ChevronDown, Camera, Globe, Calendar, Clock, Layout, Wand2,
  Undo2, Redo2, ZoomIn, ZoomOut, MousePointerClick, Columns,
  SplitSquareVertical, Maximize, MinusCircle, Square, Circle,
  CornerDownRight, SunMedium, Moon, Heart, Copy, Trash2,
  Download, Paintbrush, Move, LayoutGrid, Sliders, MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { TemplatePreview, type TemplateForm } from "@/components/proposal-editor/TemplatePreview";

const FONT_OPTIONS = [
  "Playfair Display", "Montserrat", "DM Sans", "Cormorant Garamond",
  "Inter", "Open Sans", "Lato", "Poppins", "Raleway", "Merriweather",
  "Libre Baskerville", "Source Serif Pro", "Space Grotesk", "Bodoni Moda",
  "Fraunces", "Crimson Pro", "Outfit", "Sora", "Bricolage Grotesque",
];

const SECTION_TYPES = [
  { type: "hero", label: "Capa / Hero", icon: Camera },
  { type: "destinations", label: "Destinos", icon: MapPin },
  { type: "flights", label: "Voos", icon: Plane },
  { type: "hotels", label: "Hotéis", icon: Hotel },
  { type: "experiences", label: "Experiências", icon: Star },
  { type: "pricing", label: "Valores", icon: Sparkles },
];

type ActivePanel = "colors" | "fonts" | "sections" | "settings" | "layout" | "effects" | "cta" | "ai" | null;

const defaultThemeConfig = {
  style: "classic",
  backgroundPattern: "none",
  heroLayout: "classic",
  heroOverlayOpacity: 100,
  heroHeight: "medium",
  cardStyle: "elevated",
  sectionSpacing: "normal",
  borderRadius: "md",
  shadowIntensity: "soft",
  gradientAngle: 135,
  gradientSecondary: "",
  ctaStyle: "solid",
  ctaText: "Quero reservar",
  logoPosition: "center",
  logoSize: "md",
  animationStyle: "fade",
  dividerStyle: "line",
  introStyle: "quote",
};

const defaultForm: TemplateForm = {
  name: "",
  description: "",
  font_heading: "Playfair Display",
  font_body: "Inter",
  primary_color: "#1a2332",
  accent_color: "#c9a84c",
  text_color: "#1a1a1a",
  bg_color: "#ffffff",
  theme_config: { ...defaultThemeConfig },
  sections: SECTION_TYPES.map((s, i) => ({ type: s.type, enabled: true, order: i })),
  is_default: false,
  is_active: true,
};

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

/* ══ Undo/Redo ══ */
function useUndoRedo(initial: TemplateForm) {
  const [history, setHistory] = useState<TemplateForm[]>([initial]);
  const [index, setIndex] = useState(0);

  const push = useCallback((state: TemplateForm) => {
    setHistory(prev => {
      const newHist = prev.slice(0, index + 1);
      newHist.push(state);
      if (newHist.length > 50) newHist.shift();
      return newHist;
    });
    setIndex(prev => Math.min(prev + 1, 49));
  }, [index]);

  const undo = useCallback(() => {
    if (index > 0) setIndex(i => i - 1);
  }, [index]);

  const redo = useCallback(() => {
    if (index < history.length - 1) setIndex(i => i + 1);
  }, [index, history.length]);

  return { current: history[index] || initial, push, undo, redo, canUndo: index > 0, canRedo: index < history.length - 1 };
}

/* ══ AI Suggestion Engine ══ */
const AI_SUGGESTIONS = [
  { name: "Safari Premium", desc: "Tons terrosos e elegantes para viagens de safari", preset: { primary_color: "#2d1f0e", accent_color: "#d4a853", font_heading: "Cormorant Garamond", font_body: "DM Sans", theme_config: { ...defaultThemeConfig, heroLayout: "cinematic", heroHeight: "tall", dividerStyle: "diamond", sectionSpacing: "relaxed", shadowIntensity: "medium", borderRadius: "lg" } } },
  { name: "Praia Tropical", desc: "Cores vibrantes e frescas para destinos de praia", preset: { primary_color: "#064e3b", accent_color: "#f59e0b", font_heading: "Montserrat", font_body: "Open Sans", theme_config: { ...defaultThemeConfig, heroLayout: "classic", heroHeight: "tall", dividerStyle: "wave", ctaStyle: "pill", sectionSpacing: "relaxed", borderRadius: "xl" } } },
  { name: "Lua de Mel", desc: "Romântico e sofisticado para casais", preset: { primary_color: "#4a1942", accent_color: "#e8a0bf", font_heading: "Playfair Display", font_body: "Lato", theme_config: { ...defaultThemeConfig, heroLayout: "cinematic", dividerStyle: "diamond", ctaStyle: "gradient", introStyle: "italic", shadowIntensity: "glow", borderRadius: "lg" } } },
  { name: "Europa Clássica", desc: "Elegante e minimalista para roteiros europeus", preset: { primary_color: "#1a1a2e", accent_color: "#c9a84c", font_heading: "Bodoni Moda", font_body: "Inter", theme_config: { ...defaultThemeConfig, heroLayout: "classic", dividerStyle: "line", cardStyle: "flat", sectionSpacing: "spacious", borderRadius: "sm", shadowIntensity: "none" } } },
  { name: "Aventura Radical", desc: "Audacioso para viagens de aventura", preset: { primary_color: "#0f172a", accent_color: "#ef4444", font_heading: "Space Grotesk", font_body: "Outfit", theme_config: { ...defaultThemeConfig, heroLayout: "minimal", heroHeight: "short", ctaStyle: "solid", dividerStyle: "dots", borderRadius: "md", shadowIntensity: "strong" } } },
  { name: "Minimalista Luxury", desc: "Máximo de espaço, mínimo de ruído", preset: { primary_color: "#000000", accent_color: "#888888", font_heading: "Sora", font_body: "Inter", theme_config: { ...defaultThemeConfig, heroLayout: "minimal", dividerStyle: "line", sectionSpacing: "spacious", shadowIntensity: "none", borderRadius: "none", ctaStyle: "outline", introStyle: "quote" } } },
];

export default function ProposalTemplateEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNew = !id || id === "novo";
  const [form, setForm] = useState<TemplateForm>(defaultForm);
  const [activePanel, setActivePanel] = useState<ActivePanel>("colors");
  const [hasChanges, setHasChanges] = useState(false);
  const [zoom, setZoom] = useState(1);
  const undoRedo = useUndoRedo(defaultForm);

  useGoogleFont(form.font_heading);
  useGoogleFont(form.font_body);

  const { data: template, isLoading } = useQuery({
    queryKey: ["proposal_template", id],
    queryFn: async () => {
      if (isNew) return null;
      const { data, error } = await supabase.from("proposal_templates").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
    enabled: !isNew,
  });

  useEffect(() => {
    if (template) {
      const loaded: TemplateForm = {
        name: template.name || "",
        description: template.description || "",
        font_heading: template.font_heading || "Playfair Display",
        font_body: template.font_body || "Inter",
        primary_color: template.primary_color || "#1a2332",
        accent_color: template.accent_color || "#c9a84c",
        text_color: (template.theme_config as any)?.text_color || "#1a1a1a",
        bg_color: (template.theme_config as any)?.bg_color || "#ffffff",
        theme_config: { ...defaultThemeConfig, ...((template.theme_config as any) || {}) },
        sections: Array.isArray(template.sections) && (template.sections as any[]).length ? template.sections as any[] : defaultForm.sections,
        is_default: template.is_default || false,
        is_active: template.is_active ?? true,
      };
      setForm(loaded);
    }
  }, [template]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault(); undoRedo.undo(); setForm(undoRedo.current);
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault(); undoRedo.redo(); setForm(undoRedo.current);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault(); saveMutation.mutate();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undoRedo]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        description: form.description,
        font_heading: form.font_heading,
        font_body: form.font_body,
        primary_color: form.primary_color,
        accent_color: form.accent_color,
        theme_config: { ...form.theme_config, text_color: form.text_color, bg_color: form.bg_color },
        sections: form.sections,
        is_default: form.is_default,
        is_active: form.is_active,
      };
      if (isNew) {
        const { error } = await supabase.from("proposal_templates").insert(payload);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("proposal_templates").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", id);
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

  const update = (patch: Partial<TemplateForm>) => {
    const next = { ...form, ...patch };
    setForm(next);
    undoRedo.push(next);
    setHasChanges(true);
  };

  const updateTC = (patch: Partial<TemplateForm["theme_config"]>) => {
    update({ theme_config: { ...form.theme_config, ...patch } });
  };

  const toggleSection = (type: string) => {
    update({
      sections: form.sections.map((s) => s.type === type ? { ...s, enabled: !s.enabled } : s),
    });
  };

  const applyAISuggestion = (preset: any) => {
    update({
      ...preset,
      theme_config: { ...form.theme_config, ...preset.theme_config },
    });
    toast.success("Sugestão aplicada!");
  };

  if (isLoading) return <div className="p-6 text-center text-muted-foreground">Carregando...</div>;

  const panels: { key: ActivePanel; icon: any; label: string }[] = [
    { key: "colors", icon: Palette, label: "Cores" },
    { key: "fonts", icon: Type, label: "Fontes" },
    { key: "layout", icon: Layout, label: "Layout" },
    { key: "effects", icon: Sliders, label: "Efeitos" },
    { key: "sections", icon: Layers, label: "Seções" },
    { key: "cta", icon: MousePointerClick, label: "CTA" },
    { key: "ai", icon: Wand2, label: "IA" },
    { key: "settings", icon: Settings2, label: "Config" },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] animate-fade-in">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-background/95 backdrop-blur-sm z-10 shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/propostas/modelos")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Input
            value={form.name}
            onChange={(e) => update({ name: e.target.value })}
            placeholder="Nome do modelo..."
            className="border-none shadow-none p-0 h-auto text-lg font-semibold focus-visible:ring-0 bg-transparent w-60"
          />
        </div>

        {/* Center toolbar */}
        <div className="flex items-center gap-1 bg-muted/50 rounded-lg px-1.5 py-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { undoRedo.undo(); setForm(undoRedo.current); }} disabled={!undoRedo.canUndo} title="Desfazer (⌘Z)">
            <Undo2 className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { undoRedo.redo(); setForm(undoRedo.current); }} disabled={!undoRedo.canRedo} title="Refazer (⌘⇧Z)">
            <Redo2 className="w-3.5 h-3.5" />
          </Button>
          <div className="w-px h-4 bg-border mx-1" />
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} title="Zoom out">
            <ZoomOut className="w-3.5 h-3.5" />
          </Button>
          <span className="text-[10px] font-mono text-muted-foreground w-10 text-center">{Math.round(zoom * 100)}%</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(z => Math.min(1.5, z + 0.1))} title="Zoom in">
            <ZoomIn className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(1)} title="Resetar zoom">
            <Maximize className="w-3.5 h-3.5" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {hasChanges && <Badge variant="secondary" className="text-[10px]">Não salvo</Badge>}
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="gap-2">
            <Save className="w-4 h-4" />
            {saveMutation.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel tabs */}
        <div className="w-12 border-r border-border bg-muted/20 flex flex-col items-center py-2 gap-0.5 shrink-0">
          {panels.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActivePanel(activePanel === tab.key ? null : tab.key)}
              className={cn(
                "w-10 h-10 flex flex-col items-center justify-center gap-0.5 rounded-lg text-[8px] font-medium transition-colors",
                activePanel === tab.key ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
              title={tab.label}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Panel content */}
        {activePanel && (
          <div className="w-72 border-r border-border bg-muted/10 flex flex-col shrink-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-border/50 shrink-0">
              <h3 className="text-sm font-semibold">{panels.find(p => p.key === activePanel)?.label}</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {activePanel === "colors" && <ColorsPanel form={form} update={update} />}
              {activePanel === "fonts" && <FontsPanel form={form} update={update} />}
              {activePanel === "layout" && <LayoutPanel form={form} updateTC={updateTC} />}
              {activePanel === "effects" && <EffectsPanel form={form} updateTC={updateTC} />}
              {activePanel === "sections" && <SectionsPanel form={form} toggleSection={toggleSection} />}
              {activePanel === "cta" && <CTAPanel form={form} updateTC={updateTC} />}
              {activePanel === "ai" && <AIPanel form={form} applyAISuggestion={applyAISuggestion} />}
              {activePanel === "settings" && <SettingsPanel form={form} update={update} />}
            </div>
          </div>
        )}

        {/* Preview */}
        <div className="flex-1 overflow-auto bg-muted/30 p-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-2 mb-4">
              <Eye className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">Preview ao vivo — clique nas seções para editar</span>
            </div>
            <TemplatePreview form={form} activePanel={activePanel} onClickSection={setActivePanel} zoom={zoom} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════ PANEL COMPONENTS ══════════════ */

function ColorsPanel({ form, update }: { form: TemplateForm; update: (p: Partial<TemplateForm>) => void }) {
  const presets = [
    { primary: "#1a2332", accent: "#c9a84c", name: "Clássico" },
    { primary: "#0e7c61", accent: "#f59e0b", name: "Tropical" },
    { primary: "#111827", accent: "#6366f1", name: "Moderno" },
    { primary: "#4a1942", accent: "#e8a0bf", name: "Romântico" },
    { primary: "#1a472a", accent: "#d4a853", name: "NatLeva" },
    { primary: "#0c1426", accent: "#38bdf8", name: "Oceano" },
    { primary: "#27180e", accent: "#f97316", name: "Deserto" },
    { primary: "#1e1b2e", accent: "#a78bfa", name: "Noturno" },
    { primary: "#0f0f0f", accent: "#e5e5e5", name: "B&W" },
    { primary: "#1e3a5f", accent: "#fbbf24", name: "Navy" },
    { primary: "#701a75", accent: "#fb923c", name: "Sunset" },
    { primary: "#14532d", accent: "#86efac", name: "Forest" },
  ];

  return (
    <>
      <ColorRow label="Cor principal" description="Fundo da capa e gradientes" value={form.primary_color} onChange={v => update({ primary_color: v })} />
      <ColorRow label="Cor de destaque" description="Separadores, badges e valores" value={form.accent_color} onChange={v => update({ accent_color: v })} />
      <ColorRow label="Cor do texto" description="Textos do corpo da proposta" value={form.text_color} onChange={v => update({ text_color: v })} />
      <ColorRow label="Cor de fundo" description="Background das seções" value={form.bg_color} onChange={v => update({ bg_color: v })} />

      <div>
        <Label className="text-xs font-medium mb-2 block">Gradiente secundário</Label>
        <div className="flex items-center gap-2">
          <input type="color" value={form.theme_config.gradientSecondary || form.primary_color} onChange={e => update({ theme_config: { ...form.theme_config, gradientSecondary: e.target.value } })} className="w-10 h-8 rounded border border-border cursor-pointer shrink-0" />
          <Input value={form.theme_config.gradientSecondary || ""} onChange={e => update({ theme_config: { ...form.theme_config, gradientSecondary: e.target.value } })} placeholder="Opcional" className="font-mono text-xs" />
        </div>
        {form.theme_config.gradientSecondary && (
          <>
            <Label className="text-xs mt-3 block">Ângulo: {form.theme_config.gradientAngle}°</Label>
            <Slider value={[form.theme_config.gradientAngle]} onValueChange={([v]) => update({ theme_config: { ...form.theme_config, gradientAngle: v } })} min={0} max={360} step={15} className="mt-2" />
            <div className="mt-2 h-8 rounded-lg" style={{ background: `linear-gradient(${form.theme_config.gradientAngle}deg, ${form.primary_color}, ${form.theme_config.gradientSecondary})` }} />
          </>
        )}
      </div>

      <div>
        <Label className="text-xs font-medium mb-2 block">Paletas rápidas</Label>
        <div className="grid grid-cols-4 gap-2">
          {presets.map((preset) => (
            <button key={preset.name} onClick={() => update({ primary_color: preset.primary, accent_color: preset.accent })}
              className="group flex flex-col items-center gap-1 p-1.5 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="w-8 h-8 rounded-lg overflow-hidden border border-border shadow-sm">
                <div className="h-1/2" style={{ backgroundColor: preset.primary }} />
                <div className="h-1/2" style={{ backgroundColor: preset.accent }} />
              </div>
              <span className="text-[8px] text-muted-foreground group-hover:text-foreground">{preset.name}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

function ColorRow({ label, description, value, onChange }: { label: string; description: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-xs font-medium mb-1.5 block">{label}</Label>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={e => onChange(e.target.value)} className="w-10 h-8 rounded border border-border cursor-pointer shrink-0" />
        <Input value={value} onChange={e => onChange(e.target.value)} className="font-mono text-xs" />
      </div>
      <p className="text-[10px] text-muted-foreground mt-1">{description}</p>
    </div>
  );
}

function FontsPanel({ form, update }: { form: TemplateForm; update: (p: Partial<TemplateForm>) => void }) {
  const combos = [
    { heading: "Playfair Display", body: "Inter", name: "Clássico" },
    { heading: "Cormorant Garamond", body: "DM Sans", name: "Editorial" },
    { heading: "Montserrat", body: "Open Sans", name: "Moderno" },
    { heading: "Bodoni Moda", body: "Lato", name: "Elegante" },
    { heading: "Space Grotesk", body: "Inter", name: "Tech" },
    { heading: "Fraunces", body: "Outfit", name: "Artístico" },
  ];

  return (
    <>
      <div>
        <Label className="text-xs font-medium mb-1.5 block">Fonte de títulos</Label>
        <Select value={form.font_heading} onValueChange={(v) => update({ font_heading: v })}>
          <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {FONT_OPTIONS.map((f) => <SelectItem key={f} value={f}><span style={{ fontFamily: `'${f}'` }}>{f}</span></SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs font-medium mb-1.5 block">Fonte do corpo</Label>
        <Select value={form.font_body} onValueChange={(v) => update({ font_body: v })}>
          <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {FONT_OPTIONS.map((f) => <SelectItem key={f} value={f}><span style={{ fontFamily: `'${f}'` }}>{f}</span></SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Font preview */}
      <div className="p-4 rounded-xl border border-border" style={{ background: `linear-gradient(135deg, ${form.primary_color}, ${form.primary_color}dd)` }}>
        <p className="text-lg font-bold text-white mb-1" style={{ fontFamily: `'${form.font_heading}', serif` }}>Título de Exemplo</p>
        <p className="text-xs text-white/70" style={{ fontFamily: `'${form.font_body}', sans-serif` }}>
          Texto do corpo com a fonte {form.font_body}
        </p>
      </div>

      <div>
        <Label className="text-xs font-medium mb-2 block">Combinações rápidas</Label>
        <div className="space-y-1.5">
          {combos.map((c) => (
            <button key={c.name} onClick={() => update({ font_heading: c.heading, font_body: c.body })}
              className={cn(
                "w-full text-left px-3 py-2 rounded-lg border transition-colors text-xs",
                form.font_heading === c.heading && form.font_body === c.body ? "border-primary bg-primary/5" : "border-border/50 hover:bg-muted/50"
              )}>
              <span className="font-semibold" style={{ fontFamily: `'${c.heading}'` }}>{c.name}</span>
              <span className="text-muted-foreground ml-2" style={{ fontFamily: `'${c.body}'` }}>— {c.heading} + {c.body}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

function LayoutPanel({ form, updateTC }: { form: TemplateForm; updateTC: (p: Partial<TemplateForm["theme_config"]>) => void }) {
  const tc = form.theme_config;
  return (
    <>
      <div>
        <Label className="text-xs font-medium mb-2 block">Layout do Hero</Label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: "classic", label: "Clássico", icon: Square },
            { value: "cinematic", label: "Cinemático", icon: Maximize },
            { value: "split", label: "Dividido", icon: Columns },
            { value: "minimal", label: "Minimal", icon: MinusCircle },
          ].map(opt => (
            <button key={opt.value} onClick={() => updateTC({ heroLayout: opt.value })}
              className={cn("flex flex-col items-center gap-1.5 p-3 rounded-lg border text-xs transition-colors",
                tc.heroLayout === opt.value ? "border-primary bg-primary/5 text-primary" : "border-border/50 text-muted-foreground hover:bg-muted/50"
              )}>
              <opt.icon className="w-5 h-5" />
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-xs font-medium mb-2 block">Altura do Hero</Label>
        <div className="grid grid-cols-4 gap-1.5">
          {["short", "medium", "tall", "full"].map(h => (
            <button key={h} onClick={() => updateTC({ heroHeight: h })}
              className={cn("text-[10px] px-2 py-1.5 rounded border transition-colors capitalize",
                tc.heroHeight === h ? "border-primary bg-primary/5 text-primary" : "border-border/50 text-muted-foreground hover:bg-muted/50"
              )}>{h === "short" ? "Curto" : h === "medium" ? "Médio" : h === "tall" ? "Alto" : "Full"}</button>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-xs font-medium block">Opacidade do overlay: {tc.heroOverlayOpacity}%</Label>
        <Slider value={[tc.heroOverlayOpacity]} onValueChange={([v]) => updateTC({ heroOverlayOpacity: v })} min={20} max={100} step={5} className="mt-2" />
      </div>

      <div>
        <Label className="text-xs font-medium mb-2 block">Posição do logo</Label>
        <div className="grid grid-cols-3 gap-1.5">
          {["left", "center", "right"].map(p => (
            <button key={p} onClick={() => updateTC({ logoPosition: p })}
              className={cn("text-[10px] px-2 py-1.5 rounded border transition-colors capitalize",
                tc.logoPosition === p ? "border-primary bg-primary/5 text-primary" : "border-border/50 text-muted-foreground hover:bg-muted/50"
              )}>{p === "left" ? "Esquerda" : p === "center" ? "Centro" : "Direita"}</button>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-xs font-medium mb-2 block">Tamanho do logo</Label>
        <div className="grid grid-cols-3 gap-1.5">
          {["sm", "md", "lg"].map(s => (
            <button key={s} onClick={() => updateTC({ logoSize: s })}
              className={cn("text-[10px] px-2 py-1.5 rounded border transition-colors",
                tc.logoSize === s ? "border-primary bg-primary/5 text-primary" : "border-border/50 text-muted-foreground hover:bg-muted/50"
              )}>{s === "sm" ? "Pequeno" : s === "md" ? "Médio" : "Grande"}</button>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-xs font-medium mb-2 block">Espaçamento entre seções</Label>
        <div className="grid grid-cols-4 gap-1.5">
          {["compact", "normal", "relaxed", "spacious"].map(s => (
            <button key={s} onClick={() => updateTC({ sectionSpacing: s })}
              className={cn("text-[10px] px-1.5 py-1.5 rounded border transition-colors",
                tc.sectionSpacing === s ? "border-primary bg-primary/5 text-primary" : "border-border/50 text-muted-foreground hover:bg-muted/50"
              )}>{s === "compact" ? "Compacto" : s === "normal" ? "Normal" : s === "relaxed" ? "Amplo" : "Máximo"}</button>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-xs font-medium mb-2 block">Estilo da introdução</Label>
        <div className="grid grid-cols-3 gap-1.5">
          {["quote", "italic", "plain"].map(s => (
            <button key={s} onClick={() => updateTC({ introStyle: s })}
              className={cn("text-[10px] px-2 py-1.5 rounded border transition-colors",
                tc.introStyle === s ? "border-primary bg-primary/5 text-primary" : "border-border/50 text-muted-foreground hover:bg-muted/50"
              )}>{s === "quote" ? "Citação" : s === "italic" ? "Itálico" : "Simples"}</button>
          ))}
        </div>
      </div>
    </>
  );
}

function EffectsPanel({ form, updateTC }: { form: TemplateForm; updateTC: (p: Partial<TemplateForm["theme_config"]>) => void }) {
  const tc = form.theme_config;
  return (
    <>
      <div>
        <Label className="text-xs font-medium mb-2 block">Bordas arredondadas</Label>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { value: "none", label: "Reto" },
            { value: "sm", label: "Suave" },
            { value: "md", label: "Médio" },
            { value: "lg", label: "Grande" },
            { value: "xl", label: "Extra" },
            { value: "full", label: "Máximo" },
          ].map(r => (
            <button key={r.value} onClick={() => updateTC({ borderRadius: r.value })}
              className={cn("text-[10px] px-2 py-1.5 rounded border transition-colors",
                tc.borderRadius === r.value ? "border-primary bg-primary/5 text-primary" : "border-border/50 text-muted-foreground hover:bg-muted/50"
              )}>{r.label}</button>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-xs font-medium mb-2 block">Intensidade da sombra</Label>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { value: "none", label: "Sem" },
            { value: "soft", label: "Suave" },
            { value: "medium", label: "Média" },
            { value: "strong", label: "Forte" },
            { value: "glow", label: "Glow" },
          ].map(s => (
            <button key={s.value} onClick={() => updateTC({ shadowIntensity: s.value })}
              className={cn("text-[10px] px-2 py-1.5 rounded border transition-colors",
                tc.shadowIntensity === s.value ? "border-primary bg-primary/5 text-primary" : "border-border/50 text-muted-foreground hover:bg-muted/50"
              )}>{s.label}</button>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-xs font-medium mb-2 block">Estilo dos divisores</Label>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { value: "line", label: "Linha" },
            { value: "dots", label: "Pontos" },
            { value: "diamond", label: "Diamante" },
            { value: "wave", label: "Onda" },
          ].map(d => (
            <button key={d.value} onClick={() => updateTC({ dividerStyle: d.value })}
              className={cn("text-[10px] px-2 py-2 rounded border transition-colors",
                tc.dividerStyle === d.value ? "border-primary bg-primary/5 text-primary" : "border-border/50 text-muted-foreground hover:bg-muted/50"
              )}>{d.label}</button>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-xs font-medium mb-2 block">Animação de entrada</Label>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { value: "fade", label: "Fade" },
            { value: "slide", label: "Slide" },
            { value: "scale", label: "Scale" },
            { value: "none", label: "Sem" },
          ].map(a => (
            <button key={a.value} onClick={() => updateTC({ animationStyle: a.value })}
              className={cn("text-[10px] px-2 py-1.5 rounded border transition-colors",
                tc.animationStyle === a.value ? "border-primary bg-primary/5 text-primary" : "border-border/50 text-muted-foreground hover:bg-muted/50"
              )}>{a.label}</button>
          ))}
        </div>
      </div>
    </>
  );
}

function SectionsPanel({ form, toggleSection }: { form: TemplateForm; toggleSection: (type: string) => void }) {
  return (
    <>
      <p className="text-xs text-muted-foreground">Ative/desative seções. Arraste para reordenar.</p>
      <div className="space-y-1.5">
        {SECTION_TYPES.map((sec) => {
          const formSec = form.sections.find((s) => s.type === sec.type);
          const enabled = formSec?.enabled ?? true;
          return (
            <div key={sec.type} className={cn("flex items-center justify-between px-3 py-3 rounded-lg border transition-colors",
              enabled ? "border-primary/20 bg-primary/5" : "border-border/50")}>
              <div className="flex items-center gap-3">
                <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40 cursor-grab" />
                <sec.icon className={cn("w-4 h-4", enabled ? "text-primary" : "text-muted-foreground/40")} />
                <span className={cn("text-sm font-medium", !enabled && "text-muted-foreground/60")}>{sec.label}</span>
              </div>
              <Switch checked={enabled} onCheckedChange={() => toggleSection(sec.type)} />
            </div>
          );
        })}
      </div>
    </>
  );
}

function CTAPanel({ form, updateTC }: { form: TemplateForm; updateTC: (p: Partial<TemplateForm["theme_config"]>) => void }) {
  const tc = form.theme_config;
  return (
    <>
      <div>
        <Label className="text-xs font-medium mb-2 block">Estilo do botão</Label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: "solid", label: "Sólido" },
            { value: "gradient", label: "Gradiente" },
            { value: "outline", label: "Contorno" },
            { value: "pill", label: "Pill" },
          ].map(s => (
            <button key={s.value} onClick={() => updateTC({ ctaStyle: s.value })}
              className={cn("text-xs px-3 py-2.5 rounded-lg border transition-colors",
                tc.ctaStyle === s.value ? "border-primary bg-primary/5 text-primary" : "border-border/50 text-muted-foreground hover:bg-muted/50"
              )}>{s.label}</button>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-xs font-medium mb-1.5 block">Texto do botão</Label>
        <Input value={tc.ctaText} onChange={e => updateTC({ ctaText: e.target.value })} className="text-xs" placeholder="Quero reservar" />
      </div>

      {/* Preview */}
      <div className="p-4 rounded-lg border border-border/50 bg-muted/30 flex items-center justify-center">
        {tc.ctaStyle === "gradient" ? (
          <div className="px-6 py-2.5 text-white font-semibold text-sm rounded-lg" style={{ background: `linear-gradient(135deg, ${form.accent_color}, ${form.primary_color})` }}>
            {tc.ctaText || "Quero reservar"}
          </div>
        ) : tc.ctaStyle === "outline" ? (
          <div className="px-6 py-2.5 font-semibold text-sm rounded-lg border-2" style={{ borderColor: form.accent_color, color: form.accent_color }}>
            {tc.ctaText || "Quero reservar"}
          </div>
        ) : tc.ctaStyle === "pill" ? (
          <div className="px-8 py-2.5 text-white font-semibold text-sm rounded-full flex items-center gap-2" style={{ backgroundColor: form.accent_color }}>
            <Heart className="w-4 h-4" /> {tc.ctaText || "Quero reservar"}
          </div>
        ) : (
          <div className="px-6 py-2.5 text-white font-semibold text-sm rounded-lg" style={{ backgroundColor: form.accent_color }}>
            {tc.ctaText || "Quero reservar"}
          </div>
        )}
      </div>
    </>
  );
}

function AIPanel({ form, applyAISuggestion }: { form: TemplateForm; applyAISuggestion: (preset: any) => void }) {
  return (
    <>
      <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
        <div className="flex items-center gap-2 mb-2">
          <Wand2 className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold">Sugestões Inteligentes</span>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Escolha um estilo e aplicaremos cores, fontes, layout e efeitos automaticamente.
        </p>
      </div>

      <div className="space-y-2">
        {AI_SUGGESTIONS.map((sug) => (
          <button key={sug.name} onClick={() => applyAISuggestion(sug.preset)}
            className="w-full text-left px-3 py-3 rounded-lg border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all group">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-border/50">
                <div className="h-1/2" style={{ backgroundColor: sug.preset.primary_color }} />
                <div className="h-1/2" style={{ backgroundColor: sug.preset.accent_color }} />
              </div>
              <div>
                <p className="text-xs font-semibold group-hover:text-primary transition-colors">{sug.name}</p>
                <p className="text-[10px] text-muted-foreground">{sug.desc}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </>
  );
}

function SettingsPanel({ form, update }: { form: TemplateForm; update: (p: Partial<TemplateForm>) => void }) {
  return (
    <>
      <div className="space-y-2">
        <Label className="text-xs font-medium">Nome do modelo</Label>
        <Input value={form.name} onChange={(e) => update({ name: e.target.value })} className="text-xs" />
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-medium">Descrição</Label>
        <Textarea value={form.description} onChange={(e) => update({ description: e.target.value })} rows={3} className="text-xs" />
      </div>

      <div className="flex items-center justify-between px-3 py-3 rounded-lg border border-border/50">
        <div>
          <p className="text-sm font-medium">Modelo padrão</p>
          <p className="text-[10px] text-muted-foreground">Usar automaticamente</p>
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
  );
}
