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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  Monitor, Smartphone, Tablet, Plus, ChevronRight, Info, Grip,
  RotateCcw, Wand, Droplets, Box, PanelLeft, PanelRight,
  Check, Power, Zap, ExternalLink,
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

const SECTION_DEFS = [
  { type: "hero", label: "Capa / Hero", icon: Camera, desc: "Banner principal com imagem e título", color: "from-rose-500/20 to-orange-500/20", iconColor: "text-rose-400" },
  { type: "intro", label: "Introdução", icon: MessageSquare, desc: "Texto de abertura e citação", color: "from-violet-500/20 to-purple-500/20", iconColor: "text-violet-400" },
  { type: "timeline", label: "Timeline", icon: Clock, desc: "Roteiro dia a dia da viagem", color: "from-blue-500/20 to-cyan-500/20", iconColor: "text-blue-400" },
  { type: "distribution", label: "Distribuição", icon: LayoutGrid, desc: "Barra de proporção por destino", color: "from-teal-500/20 to-emerald-500/20", iconColor: "text-teal-400" },
  { type: "destinations", label: "Destinos", icon: MapPin, desc: "Cards com fotos dos destinos", color: "from-emerald-500/20 to-green-500/20", iconColor: "text-emerald-400" },
  { type: "flights", label: "Voos", icon: Plane, desc: "Boarding passes com detalhes", color: "from-sky-500/20 to-blue-500/20", iconColor: "text-sky-400" },
  { type: "hotels", label: "Hotéis", icon: Hotel, desc: "Galeria de fotos e amenidades", color: "from-amber-500/20 to-yellow-500/20", iconColor: "text-amber-400" },
  { type: "experiences", label: "Experiências", icon: Star, desc: "Atividades e passeios", color: "from-pink-500/20 to-rose-500/20", iconColor: "text-pink-400" },
  { type: "info", label: "Informações", icon: Info, desc: "Seguro, vacinas, cancelamento", color: "from-slate-500/20 to-gray-500/20", iconColor: "text-slate-400" },
  { type: "pricing", label: "Valores", icon: Sparkles, desc: "Breakdown e investimento", color: "from-yellow-500/20 to-amber-500/20", iconColor: "text-yellow-400" },
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
  sections: SECTION_DEFS.map((s, i) => ({ type: s.type, enabled: true, order: i })),
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
  const undo = useCallback(() => { if (index > 0) setIndex(i => i - 1); }, [index]);
  const redo = useCallback(() => { if (index < history.length - 1) setIndex(i => i + 1); }, [index, history.length]);
  return { current: history[index] || initial, push, undo, redo, canUndo: index > 0, canRedo: index < history.length - 1 };
}

const AI_SUGGESTIONS = [
  { name: "Safari Premium", desc: "Tons terrosos para safaris", emoji: "🦁", preset: { primary_color: "#2d1f0e", accent_color: "#d4a853", font_heading: "Cormorant Garamond", font_body: "DM Sans", theme_config: { ...defaultThemeConfig, style: "editorial", heroLayout: "cinematic", heroHeight: "tall", dividerStyle: "diamond", sectionSpacing: "relaxed", shadowIntensity: "medium", borderRadius: "lg" } } },
  { name: "Praia Tropical", desc: "Cores frescas para praias", emoji: "🏝️", preset: { primary_color: "#003d4d", accent_color: "#00c9a7", font_heading: "Libre Baskerville", font_body: "Open Sans", theme_config: { ...defaultThemeConfig, style: "tropical", heroLayout: "classic", heroHeight: "tall", dividerStyle: "wave", ctaStyle: "pill", sectionSpacing: "relaxed", borderRadius: "full" } } },
  { name: "Lua de Mel", desc: "Romântico e sofisticado", emoji: "💍", preset: { primary_color: "#1a1035", accent_color: "#e8b4b8", font_heading: "Playfair Display", font_body: "Lato", theme_config: { ...defaultThemeConfig, style: "luxury", heroLayout: "split", dividerStyle: "diamond", ctaStyle: "gradient", introStyle: "italic", shadowIntensity: "glow", borderRadius: "lg" } } },
  { name: "Ásia Futurista", desc: "Dark mode neon ousado", emoji: "🗼", preset: { primary_color: "#0a0a0a", accent_color: "#ff3366", font_heading: "Montserrat", font_body: "Space Grotesk", theme_config: { ...defaultThemeConfig, style: "modern", heroLayout: "minimal", heroHeight: "short", ctaStyle: "solid", dividerStyle: "dots", borderRadius: "md", shadowIntensity: "strong" } } },
  { name: "Europa Clássica", desc: "Elegante e minimalista", emoji: "🏛️", preset: { primary_color: "#1a1a2e", accent_color: "#c9a84c", font_heading: "Bodoni Moda", font_body: "Inter", theme_config: { ...defaultThemeConfig, style: "editorial", heroLayout: "classic", dividerStyle: "line", cardStyle: "flat", sectionSpacing: "spacious", borderRadius: "sm", shadowIntensity: "none" } } },
  { name: "Minimalista Luxury", desc: "Máximo de espaço", emoji: "◻️", preset: { primary_color: "#000000", accent_color: "#888888", font_heading: "Sora", font_body: "Inter", theme_config: { ...defaultThemeConfig, style: "modern", heroLayout: "minimal", dividerStyle: "line", sectionSpacing: "spacious", shadowIntensity: "none", borderRadius: "none", ctaStyle: "outline", introStyle: "quote" } } },
];

export default function ProposalTemplateEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNew = !id || id === "novo";
  const [form, setForm] = useState<TemplateForm>(defaultForm);
  const [activePanel, setActivePanel] = useState<ActivePanel>("sections");
  const [hasChanges, setHasChanges] = useState(false);
  const [zoom, setZoom] = useState(0.7);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const undoRedo = useUndoRedo(defaultForm);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");

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
    update({ sections: form.sections.map((s) => s.type === type ? { ...s, enabled: !s.enabled } : s) });
  };

  const moveSection = (fromIdx: number, toIdx: number) => {
    const arr = [...form.sections];
    const [moved] = arr.splice(fromIdx, 1);
    arr.splice(toIdx, 0, moved);
    update({ sections: arr.map((s, i) => ({ ...s, order: i })) });
  };

  const applyAISuggestion = (preset: any) => {
    update({ ...preset, theme_config: { ...form.theme_config, ...preset.theme_config } });
    toast.success("Estilo aplicado!");
  };

  if (isLoading) return <div className="flex items-center justify-center h-full text-muted-foreground">Carregando...</div>;

  const panels: { key: ActivePanel; icon: any; label: string }[] = [
    { key: "sections", icon: Layers, label: "Blocos" },
    { key: "colors", icon: Palette, label: "Cores" },
    { key: "fonts", icon: Type, label: "Fontes" },
    { key: "layout", icon: Layout, label: "Layout" },
    { key: "effects", icon: Sliders, label: "Efeitos" },
    { key: "cta", icon: MousePointerClick, label: "CTA" },
    { key: "ai", icon: Wand2, label: "IA" },
    { key: "settings", icon: Settings2, label: "Config" },
  ];

  const enabledCount = form.sections.filter(s => s.enabled).length;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-col h-[calc(100vh-64px)] bg-background">
        {/* ═══ TOP BAR — Glass morphism ═══ */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50 bg-card/80 backdrop-blur-xl z-20 shrink-0">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:bg-primary/10" onClick={() => navigate("/propostas/modelos")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>

            <div className="h-5 w-px bg-border/50" />

            <Input
              value={form.name}
              onChange={(e) => update({ name: e.target.value })}
              placeholder="Nome do modelo..."
              className="border-none shadow-none p-0 h-auto text-base font-bold focus-visible:ring-0 bg-transparent w-56"
            />

            {form.is_active ? (
              <Badge className="text-[9px] bg-emerald-500/15 text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/20 gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Ativo
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-[9px]">Inativo</Badge>
            )}
            {hasChanges && (
              <span className="text-[10px] text-amber-400 font-mono flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                não salvo
              </span>
            )}
          </div>

          {/* Center toolbar */}
          <div className="flex items-center gap-0.5 bg-muted/40 backdrop-blur-sm rounded-xl px-1.5 py-1 border border-border/30">
            <Tooltip><TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => { undoRedo.undo(); setForm(undoRedo.current); }} disabled={!undoRedo.canUndo}>
                <Undo2 className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger><TooltipContent>Desfazer ⌘Z</TooltipContent></Tooltip>
            <Tooltip><TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => { undoRedo.redo(); setForm(undoRedo.current); }} disabled={!undoRedo.canRedo}>
                <Redo2 className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger><TooltipContent>Refazer ⌘⇧Z</TooltipContent></Tooltip>

            <div className="w-px h-4 bg-border/40 mx-1" />

            {/* Device preview */}
            {(["desktop", "tablet", "mobile"] as const).map(device => (
              <Tooltip key={device}><TooltipTrigger asChild>
                <Button
                  variant="ghost" size="icon"
                  className={cn("h-7 w-7 rounded-lg transition-all", previewDevice === device && "bg-primary/15 text-primary shadow-sm")}
                  onClick={() => setPreviewDevice(device)}
                >
                  {device === "desktop" ? <Monitor className="w-3.5 h-3.5" /> : device === "tablet" ? <Tablet className="w-3.5 h-3.5" /> : <Smartphone className="w-3.5 h-3.5" />}
                </Button>
              </TooltipTrigger><TooltipContent className="capitalize">{device}</TooltipContent></Tooltip>
            ))}

            <div className="w-px h-4 bg-border/40 mx-1" />

            <Tooltip><TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => setZoom(z => Math.max(0.4, z - 0.1))}>
                <ZoomOut className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger><TooltipContent>Zoom out</TooltipContent></Tooltip>
            <button onClick={() => setZoom(0.7)} className="text-[10px] font-mono text-muted-foreground w-9 text-center hover:text-foreground transition-colors">{Math.round(zoom * 100)}%</button>
            <Tooltip><TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => setZoom(z => Math.min(1.5, z + 0.1))}>
                <ZoomIn className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger><TooltipContent>Zoom in</TooltipContent></Tooltip>

            <div className="w-px h-4 bg-border/40 mx-1" />

            <Tooltip><TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => setPanelCollapsed(!panelCollapsed)}>
                {panelCollapsed ? <PanelRight className="w-3.5 h-3.5" /> : <PanelLeft className="w-3.5 h-3.5" />}
              </Button>
            </TooltipTrigger><TooltipContent>{panelCollapsed ? "Mostrar painel" : "Esconder painel"}</TooltipContent></Tooltip>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} size="sm" className="gap-1.5 text-xs rounded-xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
              <Save className="w-3.5 h-3.5" />
              {saveMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>

        {/* ═══ MAIN AREA ═══ */}
        <div className="flex flex-1 overflow-hidden">
          {/* Icon rail — Floating glass */}
          <div className="w-[56px] border-r border-border/30 bg-card/50 backdrop-blur-sm flex flex-col items-center py-3 gap-0.5 shrink-0">
            {panels.map((tab) => {
              const active = activePanel === tab.key && !panelCollapsed;
              return (
                <Tooltip key={tab.key}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => { setActivePanel(activePanel === tab.key ? null : tab.key); setPanelCollapsed(false); }}
                      className={cn(
                        "w-10 h-10 flex flex-col items-center justify-center gap-0.5 rounded-xl text-[8px] font-medium transition-all relative",
                        active
                          ? "bg-primary/15 text-primary shadow-md shadow-primary/10"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                      )}
                    >
                      {active && <div className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-primary shadow-lg shadow-primary/50" />}
                      <tab.icon className="w-4 h-4" />
                      <span className="leading-none">{tab.label}</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">{tab.label}</TooltipContent>
                </Tooltip>
              );
            })}
          </div>

          {/* Panel content — Glass sidebar */}
          {activePanel && !panelCollapsed && (
            <div className="w-[320px] border-r border-border/30 bg-card/60 backdrop-blur-sm flex flex-col shrink-0 overflow-hidden">
              {/* Panel header */}
              <div className="px-5 py-4 border-b border-border/30 shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {(() => { const P = panels.find(p => p.key === activePanel); return P ? <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center"><P.icon className="w-4 h-4 text-primary" /></div> : null; })()}
                    <div>
                      <h3 className="text-sm font-bold">{panels.find(p => p.key === activePanel)?.label}</h3>
                      {activePanel === "sections" && (
                        <p className="text-[10px] text-muted-foreground">{enabledCount} de {form.sections.length} ativos</p>
                      )}
                      {activePanel === "colors" && (
                        <p className="text-[10px] text-muted-foreground">Paleta e gradientes</p>
                      )}
                      {activePanel === "fonts" && (
                        <p className="text-[10px] text-muted-foreground">Tipografia e combinações</p>
                      )}
                      {activePanel === "layout" && (
                        <p className="text-[10px] text-muted-foreground">Estrutura e espaçamento</p>
                      )}
                      {activePanel === "effects" && (
                        <p className="text-[10px] text-muted-foreground">Bordas, sombras e divisores</p>
                      )}
                      {activePanel === "cta" && (
                        <p className="text-[10px] text-muted-foreground">Botão de conversão</p>
                      )}
                      {activePanel === "ai" && (
                        <p className="text-[10px] text-muted-foreground">Presets inteligentes</p>
                      )}
                      {activePanel === "settings" && (
                        <p className="text-[10px] text-muted-foreground">Nome e status</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-4">
                  {activePanel === "colors" && <ColorsPanel form={form} update={update} />}
                  {activePanel === "fonts" && <FontsPanel form={form} update={update} />}
                  {activePanel === "layout" && <LayoutPanel form={form} updateTC={updateTC} />}
                  {activePanel === "effects" && <EffectsPanel form={form} updateTC={updateTC} />}
                  {activePanel === "sections" && (
                    <SectionsPanel
                      form={form}
                      toggleSection={toggleSection}
                      moveSection={moveSection}
                      dragIdx={dragIdx}
                      setDragIdx={setDragIdx}
                      dragOverIdx={dragOverIdx}
                      setDragOverIdx={setDragOverIdx}
                    />
                  )}
                  {activePanel === "cta" && <CTAPanel form={form} updateTC={updateTC} />}
                  {activePanel === "ai" && <AIPanel form={form} applyAISuggestion={applyAISuggestion} />}
                  {activePanel === "settings" && <SettingsPanel form={form} update={update} />}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Preview */}
          <div className="flex-1 overflow-auto bg-muted/10 relative">
            <div className="sticky top-0 z-10 bg-background/60 backdrop-blur-xl border-b border-border/20 px-4 py-1.5 flex items-center gap-2">
              <Eye className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground font-medium">Preview ao vivo</span>
              <div className="ml-auto flex items-center gap-1.5">
                <Button variant="ghost" size="sm" className="h-6 px-2 text-[9px] gap-1 text-muted-foreground hover:text-foreground" onClick={() => {
                  const w = window.open("", "_blank");
                  if (!w) return;
                  const style = form.theme_config.style;
                  w.document.title = `Preview: ${form.name || "Modelo"}`;
                  w.document.body.innerHTML = '<div id="root"></div>';
                  w.document.head.innerHTML = `<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">`;
                  // Copy stylesheets
                  document.querySelectorAll('link[rel="stylesheet"], style').forEach(el => w.document.head.appendChild(el.cloneNode(true)));
                  // Render preview via React portal would be complex; instead open current URL with preview param
                  w.location.href = window.location.href + "?preview=1";
                }}>
                  <ExternalLink className="w-3 h-3" /> Abrir em nova aba
                </Button>
                <Badge variant="outline" className="text-[9px] gap-1 rounded-lg border-border/40">
                  {previewDevice === "desktop" ? <Monitor className="w-3 h-3" /> : previewDevice === "tablet" ? <Tablet className="w-3 h-3" /> : <Smartphone className="w-3 h-3" />}
                  {previewDevice === "desktop" ? "1280px" : previewDevice === "tablet" ? "768px" : "375px"}
                </Badge>
                <Badge variant="outline" className="text-[9px] gap-1 rounded-lg border-border/40">
                  <Sparkles className="w-3 h-3" /> {form.theme_config.style || "classic"}
                </Badge>
              </div>
            </div>
            <div className="p-6 flex justify-center">
              <div
                className={cn(
                  "transition-all duration-500 ease-out",
                  previewDevice === "tablet" && "border-x border-border/40 shadow-2xl rounded-2xl overflow-hidden",
                  previewDevice === "mobile" && "border border-border/50 shadow-2xl rounded-[2.5rem] overflow-hidden ring-8 ring-border/10",
                )}
                style={{
                  width: previewDevice === "desktop" ? "100%" : previewDevice === "tablet" ? "768px" : "375px",
                  maxWidth: previewDevice === "desktop" ? "1280px" : undefined,
                }}
              >
                {previewDevice === "mobile" && (
                  <div className="h-7 bg-black flex items-center justify-center relative">
                    <div className="w-24 h-[5px] rounded-full bg-white/15" />
                  </div>
                )}
                <TemplatePreview form={form} activePanel={activePanel} onClickSection={setActivePanel} zoom={previewDevice === "desktop" ? zoom : previewDevice === "tablet" ? Math.min(zoom, 1) : 1} device={previewDevice} />
                {previewDevice === "mobile" && (
                  <div className="h-6 bg-black flex items-center justify-center">
                    <div className="w-32 h-1 rounded-full bg-white/10" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

/* ══════════════ PANEL COMPONENTS ══════════════ */

function SectionsPanel({
  form, toggleSection, moveSection,
  dragIdx, setDragIdx, dragOverIdx, setDragOverIdx,
}: {
  form: TemplateForm;
  toggleSection: (type: string) => void;
  moveSection: (from: number, to: number) => void;
  dragIdx: number | null;
  setDragIdx: (v: number | null) => void;
  dragOverIdx: number | null;
  setDragOverIdx: (v: number | null) => void;
}) {
  return (
    <>
      {/* Draggable blocks — Rich cards */}
      <div className="space-y-1.5">
        {form.sections.map((sec, idx) => {
          const def = SECTION_DEFS.find(d => d.type === sec.type);
          if (!def) return null;
          const Icon = def.icon;
          const isDragging = dragIdx === idx;
          const isDragOver = dragOverIdx === idx;

          return (
            <div
              key={sec.type}
              draggable
              onDragStart={() => setDragIdx(idx)}
              onDragEnd={() => { if (dragIdx !== null && dragOverIdx !== null && dragIdx !== dragOverIdx) moveSection(dragIdx, dragOverIdx); setDragIdx(null); setDragOverIdx(null); }}
              onDragOver={(e) => { e.preventDefault(); setDragOverIdx(idx); }}
              onDragLeave={() => setDragOverIdx(null)}
              className={cn(
                "group flex items-center gap-3 px-3 py-3 rounded-xl border transition-all cursor-grab active:cursor-grabbing relative overflow-hidden",
                sec.enabled
                  ? "border-border/40 bg-card hover:bg-card/80 hover:border-primary/20 hover:shadow-md"
                  : "border-border/20 bg-muted/30 opacity-50 hover:opacity-70",
                isDragging && "opacity-30 scale-95",
                isDragOver && "border-primary/50 bg-primary/5 shadow-lg shadow-primary/5",
              )}
            >
              {/* Gradient accent stripe */}
              {sec.enabled && (
                <div className={cn("absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b rounded-r-full", def.color.replace("from-", "from-").replace("/20", "/60").replace("to-", "to-").replace("/20", "/40"))}
                  style={{ background: `linear-gradient(to bottom, var(--tw-gradient-from, hsl(var(--primary) / 0.4)), var(--tw-gradient-to, hsl(var(--primary) / 0.15)))` }}
                />
              )}

              <div className="flex flex-col items-center text-muted-foreground/20 group-hover:text-muted-foreground/50 transition-colors">
                <GripVertical className="w-3.5 h-3.5" />
              </div>

              <div className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all bg-gradient-to-br",
                sec.enabled ? def.color : "from-muted/50 to-muted/30"
              )}>
                <Icon className={cn("w-4 h-4 transition-colors", sec.enabled ? def.iconColor : "text-muted-foreground/40")} />
              </div>

              <div className="flex-1 min-w-0">
                <p className={cn("text-xs font-semibold truncate", !sec.enabled && "text-muted-foreground/50")}>{def.label}</p>
                <p className="text-[9px] text-muted-foreground/50 truncate">{def.desc}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Switch
                  checked={sec.enabled}
                  onCheckedChange={() => toggleSection(sec.type)}
                  className="scale-[0.7]"
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick actions */}
      <div className="flex gap-2 pt-1">
        <Button variant="outline" size="sm" className="flex-1 text-[10px] h-8 gap-1.5 rounded-xl border-border/40"
          onClick={() => {
            const allEnabled = form.sections.every(s => s.enabled);
            const sections = form.sections.map(s => ({ ...s, enabled: !allEnabled }));
            const heroIdx = sections.findIndex(s => s.type === "hero");
            if (heroIdx >= 0) sections[heroIdx].enabled = true;
          }}
        >
          <Power className="w-3 h-3" /> {form.sections.every(s => s.enabled) ? "Desativar" : "Ativar"} todos
        </Button>
        <Button variant="outline" size="sm" className="flex-1 text-[10px] h-8 gap-1.5 rounded-xl border-border/40"
          onClick={() => {
            SECTION_DEFS.map((s, i) => ({ type: s.type, enabled: true, order: i }));
          }}
        >
          <RotateCcw className="w-3 h-3" /> Resetar ordem
        </Button>
      </div>
    </>
  );
}

function ColorsPanel({ form, update }: { form: TemplateForm; update: (p: Partial<TemplateForm>) => void }) {
  const presets = [
    { primary: "#1a2332", accent: "#c9a84c", name: "Clássico" },
    { primary: "#003d4d", accent: "#00c9a7", name: "Tropical" },
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
      {/* Live preview at top */}
      <div className="p-5 rounded-2xl overflow-hidden relative" style={{ background: `linear-gradient(135deg, ${form.primary_color}, ${form.primary_color}cc)` }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl shadow-lg" style={{ backgroundColor: form.accent_color }} />
          <div className="flex-1">
            <div className="h-2.5 w-24 rounded-full" style={{ backgroundColor: form.accent_color }} />
            <div className="h-1.5 w-16 rounded-full mt-2 opacity-30" style={{ backgroundColor: form.accent_color }} />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex-1 h-8 rounded-lg" style={{ backgroundColor: `${form.accent_color}20` }} />
          <div className="w-20 h-8 rounded-lg" style={{ backgroundColor: form.accent_color }} />
        </div>
        <div className="flex items-center gap-2 mt-3">
          <div className="h-1 flex-1 rounded-full opacity-20" style={{ backgroundColor: form.accent_color }} />
          <span className="text-[8px] font-mono" style={{ color: `${form.accent_color}80` }}>{form.primary_color} + {form.accent_color}</span>
        </div>
      </div>

      <ColorRow label="Cor principal" description="Fundo da capa e gradientes" value={form.primary_color} onChange={v => update({ primary_color: v })} />
      <ColorRow label="Cor de destaque" description="Separadores, badges e valores" value={form.accent_color} onChange={v => update({ accent_color: v })} />
      <ColorRow label="Cor do texto" description="Textos do corpo" value={form.text_color} onChange={v => update({ text_color: v })} />
      <ColorRow label="Cor de fundo" description="Background das seções" value={form.bg_color} onChange={v => update({ bg_color: v })} />

      <div>
        <Label className="text-xs font-medium mb-2 block">Gradiente secundário</Label>
        <div className="flex items-center gap-2">
          <input type="color" value={form.theme_config.gradientSecondary || form.primary_color} onChange={e => update({ theme_config: { ...form.theme_config, gradientSecondary: e.target.value } })} className="w-10 h-9 rounded-xl border border-border/50 cursor-pointer shrink-0" />
          <Input value={form.theme_config.gradientSecondary || ""} onChange={e => update({ theme_config: { ...form.theme_config, gradientSecondary: e.target.value } })} placeholder="Opcional" className="font-mono text-xs rounded-xl" />
        </div>
        {form.theme_config.gradientSecondary && (
          <>
            <Label className="text-xs mt-3 block">Ângulo: {form.theme_config.gradientAngle}°</Label>
            <Slider value={[form.theme_config.gradientAngle]} onValueChange={([v]) => update({ theme_config: { ...form.theme_config, gradientAngle: v } })} min={0} max={360} step={15} className="mt-2" />
            <div className="mt-2 h-10 rounded-2xl shadow-inner" style={{ background: `linear-gradient(${form.theme_config.gradientAngle}deg, ${form.primary_color}, ${form.theme_config.gradientSecondary})` }} />
          </>
        )}
      </div>

      <div>
        <Label className="text-xs font-medium mb-2 block">Paletas rápidas</Label>
        <div className="grid grid-cols-4 gap-1.5">
          {presets.map((preset) => (
            <button key={preset.name} onClick={() => update({ primary_color: preset.primary, accent_color: preset.accent })}
              className={cn(
                "group flex flex-col items-center gap-1 p-1.5 rounded-xl transition-all",
                form.primary_color === preset.primary && form.accent_color === preset.accent
                  ? "bg-primary/10 ring-2 ring-primary/30 shadow-sm"
                  : "hover:bg-muted/50"
              )}>
              <div className="w-full h-9 rounded-xl overflow-hidden border border-border/30 shadow-sm">
                <div className="h-1/2" style={{ backgroundColor: preset.primary }} />
                <div className="h-1/2" style={{ backgroundColor: preset.accent }} />
              </div>
              <span className="text-[8px] text-muted-foreground group-hover:text-foreground leading-none">{preset.name}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

function ColorRow({ label, description, value, onChange }: { label: string; description: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-border/30 bg-card/50 hover:bg-card transition-colors">
      <div className="relative">
        <input type="color" value={value} onChange={e => onChange(e.target.value)} className="w-10 h-10 rounded-xl border-2 border-border/50 cursor-pointer shrink-0 [&::-webkit-color-swatch-wrapper]:p-1 [&::-webkit-color-swatch]:rounded-lg shadow-sm" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold">{label}</p>
        <p className="text-[10px] text-muted-foreground">{description}</p>
      </div>
      <Input value={value} onChange={e => onChange(e.target.value)} className="font-mono text-[10px] w-24 h-7 rounded-lg border-border/40 bg-muted/30 text-center" />
    </div>
  );
}

function FontsPanel({ form, update }: { form: TemplateForm; update: (p: Partial<TemplateForm>) => void }) {
  const combos = [
    { heading: "Playfair Display", body: "Inter", name: "Clássico", emoji: "📜" },
    { heading: "Cormorant Garamond", body: "DM Sans", name: "Editorial", emoji: "📰" },
    { heading: "Montserrat", body: "Open Sans", name: "Moderno", emoji: "🔲" },
    { heading: "Bodoni Moda", body: "Lato", name: "Elegante", emoji: "✨" },
    { heading: "Space Grotesk", body: "Inter", name: "Tech", emoji: "💻" },
    { heading: "Fraunces", body: "Outfit", name: "Artístico", emoji: "🎨" },
    { heading: "Sora", body: "DM Sans", name: "Futurista", emoji: "🚀" },
    { heading: "Libre Baskerville", body: "Raleway", name: "Literário", emoji: "📖" },
  ];

  return (
    <>
      {/* Live font preview */}
      <div className="p-6 rounded-2xl overflow-hidden relative" style={{ background: `linear-gradient(135deg, ${form.primary_color}, ${form.primary_color}dd)` }}>
        <p className="text-2xl font-bold text-white mb-2 leading-tight" style={{ fontFamily: `'${form.font_heading}', serif` }}>Aventura Inesquecível</p>
        <p className="text-xs text-white/50 leading-relaxed" style={{ fontFamily: `'${form.font_body}', sans-serif` }}>
          Descubra paisagens deslumbrantes e experiências únicas nesta jornada exclusiva.
        </p>
        <div className="mt-4 flex items-center gap-3">
          <div className="px-4 py-1.5 rounded-full text-[9px] font-bold text-white" style={{ backgroundColor: form.accent_color }}>
            Reservar
          </div>
          <div className="h-1 flex-1 rounded-full opacity-20" style={{ backgroundColor: form.accent_color }} />
        </div>
      </div>

      <div>
        <Label className="text-xs font-medium mb-1.5 block">Fonte de títulos</Label>
        <Select value={form.font_heading} onValueChange={(v) => update({ font_heading: v })}>
          <SelectTrigger className="text-xs rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent>
            {FONT_OPTIONS.map((f) => <SelectItem key={f} value={f}><span style={{ fontFamily: `'${f}'` }}>{f}</span></SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs font-medium mb-1.5 block">Fonte do corpo</Label>
        <Select value={form.font_body} onValueChange={(v) => update({ font_body: v })}>
          <SelectTrigger className="text-xs rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent>
            {FONT_OPTIONS.map((f) => <SelectItem key={f} value={f}><span style={{ fontFamily: `'${f}'` }}>{f}</span></SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-xs font-medium mb-2 block">Combinações rápidas</Label>
        <div className="grid grid-cols-2 gap-1.5">
          {combos.map((c) => (
            <button key={c.name} onClick={() => update({ font_heading: c.heading, font_body: c.body })}
              className={cn(
                "text-left px-3 py-3 rounded-xl border transition-all group",
                form.font_heading === c.heading && form.font_body === c.body
                  ? "border-primary/40 bg-primary/5 shadow-md shadow-primary/5"
                  : "border-border/30 hover:bg-muted/40 hover:border-border/50"
              )}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm">{c.emoji}</span>
                <span className="text-[10px] font-bold" style={{ fontFamily: `'${c.heading}'` }}>{c.name}</span>
              </div>
              <span className="text-[9px] text-muted-foreground block truncate" style={{ fontFamily: `'${c.body}'` }}>{c.heading} + {c.body}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

function LayoutPanel({ form, updateTC }: { form: TemplateForm; updateTC: (p: Partial<TemplateForm["theme_config"]>) => void }) {
  const tc = form.theme_config;

  const OptionGrid = ({ label, options, value, onChange, cols = 2 }: { label: string; options: { value: string; label: string; icon?: any; desc?: string }[]; value: string; onChange: (v: string) => void; cols?: number }) => (
    <div>
      <Label className="text-xs font-medium mb-2 block">{label}</Label>
      <div className={`grid gap-1.5`} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {options.map(opt => {
          const Icon = opt.icon;
          return (
            <button key={opt.value} onClick={() => onChange(opt.value)}
              className={cn("flex flex-col items-center gap-1 p-3 rounded-xl border text-[10px] transition-all",
                value === opt.value
                  ? "border-primary/40 bg-primary/8 text-primary shadow-md shadow-primary/5"
                  : "border-border/30 text-muted-foreground hover:bg-muted/40 hover:border-border/50"
              )}>
              {Icon && <Icon className="w-4 h-4" />}
              <span className="font-medium">{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      <OptionGrid label="Estilo do template" options={[
        { value: "editorial", label: "Editorial", icon: Square },
        { value: "luxury", label: "Luxury", icon: Heart },
        { value: "modern", label: "Modern", icon: Sparkles },
        { value: "tropical", label: "Tropical", icon: Globe },
      ]} value={tc.style} onChange={v => updateTC({ style: v })} />

      <OptionGrid label="Layout do Hero" options={[
        { value: "classic", label: "Clássico", icon: Square },
        { value: "cinematic", label: "Cinemático", icon: Maximize },
        { value: "split", label: "Dividido", icon: Columns },
        { value: "minimal", label: "Minimal", icon: MinusCircle },
      ]} value={tc.heroLayout} onChange={v => updateTC({ heroLayout: v })} />

      <OptionGrid label="Altura do Hero" cols={4} options={[
        { value: "short", label: "Curto" },
        { value: "medium", label: "Médio" },
        { value: "tall", label: "Alto" },
        { value: "full", label: "Full" },
      ]} value={tc.heroHeight} onChange={v => updateTC({ heroHeight: v })} />

      <div className="p-3 rounded-xl border border-border/30 bg-card/50">
        <Label className="text-xs font-medium block mb-2">Opacidade do overlay: {tc.heroOverlayOpacity}%</Label>
        <Slider value={[tc.heroOverlayOpacity]} onValueChange={([v]) => updateTC({ heroOverlayOpacity: v })} min={20} max={100} step={5} />
      </div>

      <OptionGrid label="Posição do logo" cols={3} options={[
        { value: "left", label: "Esquerda" },
        { value: "center", label: "Centro" },
        { value: "right", label: "Direita" },
      ]} value={tc.logoPosition} onChange={v => updateTC({ logoPosition: v })} />

      <OptionGrid label="Espaçamento" cols={4} options={[
        { value: "compact", label: "Compacto" },
        { value: "normal", label: "Normal" },
        { value: "relaxed", label: "Amplo" },
        { value: "spacious", label: "Máximo" },
      ]} value={tc.sectionSpacing} onChange={v => updateTC({ sectionSpacing: v })} />

      <OptionGrid label="Estilo da introdução" cols={3} options={[
        { value: "quote", label: "Citação" },
        { value: "italic", label: "Itálico" },
        { value: "plain", label: "Simples" },
      ]} value={tc.introStyle} onChange={v => updateTC({ introStyle: v })} />
    </>
  );
}

function EffectsPanel({ form, updateTC }: { form: TemplateForm; updateTC: (p: Partial<TemplateForm["theme_config"]>) => void }) {
  const tc = form.theme_config;

  const OptionGrid = ({ label, options, value, onChange, cols = 3 }: { label: string; options: { value: string; label: string }[]; value: string; onChange: (v: string) => void; cols?: number }) => (
    <div>
      <Label className="text-xs font-medium mb-2 block">{label}</Label>
      <div className={`grid gap-1.5`} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {options.map(opt => (
          <button key={opt.value} onClick={() => onChange(opt.value)}
            className={cn("text-[10px] px-2 py-2.5 rounded-xl border transition-all font-medium",
              value === opt.value
                ? "border-primary/40 bg-primary/8 text-primary shadow-md shadow-primary/5"
                : "border-border/30 text-muted-foreground hover:bg-muted/40"
            )}>{opt.label}</button>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <OptionGrid label="Bordas arredondadas" options={[
        { value: "none", label: "Reto" }, { value: "sm", label: "Suave" }, { value: "md", label: "Médio" },
        { value: "lg", label: "Grande" }, { value: "xl", label: "Extra" }, { value: "full", label: "Máximo" },
      ]} value={tc.borderRadius} onChange={v => updateTC({ borderRadius: v })} />

      <OptionGrid label="Intensidade da sombra" options={[
        { value: "none", label: "Sem" }, { value: "soft", label: "Suave" }, { value: "medium", label: "Média" },
        { value: "strong", label: "Forte" }, { value: "glow", label: "Glow" },
      ]} value={tc.shadowIntensity} onChange={v => updateTC({ shadowIntensity: v })} />

      <OptionGrid label="Divisores" cols={2} options={[
        { value: "line", label: "Linha" }, { value: "dots", label: "Pontos" },
        { value: "diamond", label: "Diamante" }, { value: "wave", label: "Onda" },
      ]} value={tc.dividerStyle} onChange={v => updateTC({ dividerStyle: v })} />

      <OptionGrid label="Animação de entrada" options={[
        { value: "fade", label: "Fade" }, { value: "slide", label: "Slide" },
        { value: "scale", label: "Scale" }, { value: "none", label: "Sem" },
      ]} value={tc.animationStyle} onChange={v => updateTC({ animationStyle: v })} cols={4} />
    </>
  );
}

function CTAPanel({ form, updateTC }: { form: TemplateForm; updateTC: (p: Partial<TemplateForm["theme_config"]>) => void }) {
  const tc = form.theme_config;
  return (
    <>
      <div>
        <Label className="text-xs font-medium mb-2 block">Estilo do botão</Label>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { value: "solid", label: "Sólido", icon: Square },
            { value: "gradient", label: "Gradiente", icon: Sparkles },
            { value: "outline", label: "Contorno", icon: Circle },
            { value: "pill", label: "Pill", icon: Heart },
          ].map(s => (
            <button key={s.value} onClick={() => updateTC({ ctaStyle: s.value })}
              className={cn("flex items-center gap-2 text-xs px-3 py-3 rounded-xl border transition-all font-medium",
                tc.ctaStyle === s.value
                  ? "border-primary/40 bg-primary/8 text-primary shadow-md shadow-primary/5"
                  : "border-border/30 text-muted-foreground hover:bg-muted/40"
              )}>
              <s.icon className="w-3.5 h-3.5" />
              {s.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <Label className="text-xs font-medium mb-1.5 block">Texto do botão</Label>
        <Input value={tc.ctaText} onChange={e => updateTC({ ctaText: e.target.value })} className="text-xs rounded-xl" placeholder="Quero reservar" />
      </div>
      {/* Preview */}
      <div className="p-8 rounded-2xl border border-border/20 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${form.primary_color}15, ${form.accent_color}08)` }}>
        {tc.ctaStyle === "gradient" ? (
          <div className="px-8 py-3 text-white font-bold text-sm rounded-xl shadow-lg" style={{ background: `linear-gradient(135deg, ${form.accent_color}, ${form.primary_color})` }}>{tc.ctaText || "Quero reservar"}</div>
        ) : tc.ctaStyle === "outline" ? (
          <div className="px-8 py-3 font-bold text-sm rounded-xl border-2" style={{ borderColor: form.accent_color, color: form.accent_color }}>{tc.ctaText || "Quero reservar"}</div>
        ) : tc.ctaStyle === "pill" ? (
          <div className="px-10 py-3 text-white font-bold text-sm rounded-full flex items-center gap-2 shadow-lg" style={{ backgroundColor: form.accent_color }}><Heart className="w-4 h-4" /> {tc.ctaText || "Quero reservar"}</div>
        ) : (
          <div className="px-8 py-3 text-white font-bold text-sm rounded-xl shadow-lg" style={{ backgroundColor: form.accent_color }}>{tc.ctaText || "Quero reservar"}</div>
        )}
      </div>
    </>
  );
}

function AIPanel({ form, applyAISuggestion }: { form: TemplateForm; applyAISuggestion: (preset: any) => void }) {
  return (
    <>
      {/* Hero card */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-primary/15 via-primary/5 to-accent/5 border border-primary/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shadow-lg shadow-primary/10">
              <Wand2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <span className="text-sm font-bold block">Sugestões IA</span>
              <span className="text-[10px] text-muted-foreground">Um clique aplica cores, fontes e layout</span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {AI_SUGGESTIONS.map((sug) => (
          <button key={sug.name} onClick={() => applyAISuggestion(sug.preset)}
            className="w-full text-left px-4 py-3.5 rounded-xl border border-border/30 hover:border-primary/30 hover:bg-primary/[0.03] transition-all group hover:shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-border/30 shadow-sm relative">
                <div className="h-1/2" style={{ backgroundColor: sug.preset.primary_color }} />
                <div className="h-1/2" style={{ backgroundColor: sug.preset.accent_color }} />
                <div className="absolute inset-0 flex items-center justify-center text-lg">{sug.emoji}</div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold group-hover:text-primary transition-colors truncate">{sug.name}</p>
                <p className="text-[9px] text-muted-foreground truncate">{sug.desc}</p>
                <p className="text-[8px] text-muted-foreground/50 mt-0.5 font-mono truncate">{sug.preset.font_heading}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Zap className="w-3.5 h-3.5 text-muted-foreground/20 group-hover:text-primary transition-colors" />
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
        <Input value={form.name} onChange={(e) => update({ name: e.target.value })} className="text-xs rounded-xl" />
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-medium">Descrição</Label>
        <Textarea value={form.description} onChange={(e) => update({ description: e.target.value })} rows={3} className="text-xs rounded-xl" />
      </div>

      <div className="space-y-2">
        {[
          { label: "Modelo padrão", desc: "Usar automaticamente em novas propostas", value: form.is_default, key: "is_default" },
          { label: "Ativo", desc: "Disponível para seleção", value: form.is_active, key: "is_active" },
        ].map(item => (
          <div key={item.key} className="flex items-center justify-between px-4 py-3.5 rounded-xl border border-border/30 bg-card/50 hover:bg-card transition-colors">
            <div>
              <p className="text-sm font-medium">{item.label}</p>
              <p className="text-[10px] text-muted-foreground">{item.desc}</p>
            </div>
            <Switch checked={item.value} onCheckedChange={(v) => update({ [item.key]: v })} />
          </div>
        ))}
      </div>

      <div className="pt-2">
        <Button variant="outline" size="sm" className="w-full text-xs gap-1.5 text-destructive hover:text-destructive rounded-xl border-destructive/20 hover:bg-destructive/5">
          <Trash2 className="w-3.5 h-3.5" /> Excluir modelo
        </Button>
      </div>
    </>
  );
}
