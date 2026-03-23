import { useState, useEffect, useCallback, useRef } from "react";
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
  { type: "hero", label: "Capa / Hero", icon: Camera, desc: "Banner principal com imagem e título" },
  { type: "intro", label: "Introdução", icon: MessageSquare, desc: "Texto de abertura e citação" },
  { type: "timeline", label: "Timeline", icon: Clock, desc: "Roteiro dia a dia da viagem" },
  { type: "distribution", label: "Distribuição", icon: LayoutGrid, desc: "Barra de proporção por destino" },
  { type: "destinations", label: "Destinos", icon: MapPin, desc: "Cards com fotos dos destinos" },
  { type: "flights", label: "Voos", icon: Plane, desc: "Boarding passes com detalhes" },
  { type: "hotels", label: "Hotéis", icon: Hotel, desc: "Galeria de fotos e amenidades" },
  { type: "experiences", label: "Experiências", icon: Star, desc: "Atividades e passeios" },
  { type: "info", label: "Informações", icon: Info, desc: "Seguro, vacinas, cancelamento" },
  { type: "pricing", label: "Valores", icon: Sparkles, desc: "Breakdown e investimento" },
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
  { name: "Safari Premium", desc: "Tons terrosos para safaris", preset: { primary_color: "#2d1f0e", accent_color: "#d4a853", font_heading: "Cormorant Garamond", font_body: "DM Sans", theme_config: { ...defaultThemeConfig, style: "editorial", heroLayout: "cinematic", heroHeight: "tall", dividerStyle: "diamond", sectionSpacing: "relaxed", shadowIntensity: "medium", borderRadius: "lg" } } },
  { name: "Praia Tropical", desc: "Cores frescas para praias", preset: { primary_color: "#003d4d", accent_color: "#00c9a7", font_heading: "Libre Baskerville", font_body: "Open Sans", theme_config: { ...defaultThemeConfig, style: "tropical", heroLayout: "classic", heroHeight: "tall", dividerStyle: "wave", ctaStyle: "pill", sectionSpacing: "relaxed", borderRadius: "full" } } },
  { name: "Lua de Mel", desc: "Romântico e sofisticado", preset: { primary_color: "#1a1035", accent_color: "#e8b4b8", font_heading: "Playfair Display", font_body: "Lato", theme_config: { ...defaultThemeConfig, style: "luxury", heroLayout: "split", dividerStyle: "diamond", ctaStyle: "gradient", introStyle: "italic", shadowIntensity: "glow", borderRadius: "lg" } } },
  { name: "Ásia Futurista", desc: "Dark mode neon ousado", preset: { primary_color: "#0a0a0a", accent_color: "#ff3366", font_heading: "Montserrat", font_body: "Space Grotesk", theme_config: { ...defaultThemeConfig, style: "modern", heroLayout: "minimal", heroHeight: "short", ctaStyle: "solid", dividerStyle: "dots", borderRadius: "md", shadowIntensity: "strong" } } },
  { name: "Europa Clássica", desc: "Elegante e minimalista", preset: { primary_color: "#1a1a2e", accent_color: "#c9a84c", font_heading: "Bodoni Moda", font_body: "Inter", theme_config: { ...defaultThemeConfig, style: "editorial", heroLayout: "classic", dividerStyle: "line", cardStyle: "flat", sectionSpacing: "spacious", borderRadius: "sm", shadowIntensity: "none" } } },
  { name: "Minimalista Luxury", desc: "Máximo de espaço", preset: { primary_color: "#000000", accent_color: "#888888", font_heading: "Sora", font_body: "Inter", theme_config: { ...defaultThemeConfig, style: "modern", heroLayout: "minimal", dividerStyle: "line", sectionSpacing: "spacious", shadowIntensity: "none", borderRadius: "none", ctaStyle: "outline", introStyle: "quote" } } },
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

  const panels: { key: ActivePanel; icon: any; label: string; color: string }[] = [
    { key: "sections", icon: Layers, label: "Blocos", color: "text-blue-400" },
    { key: "colors", icon: Palette, label: "Cores", color: "text-pink-400" },
    { key: "fonts", icon: Type, label: "Fontes", color: "text-purple-400" },
    { key: "layout", icon: Layout, label: "Layout", color: "text-cyan-400" },
    { key: "effects", icon: Sliders, label: "Efeitos", color: "text-orange-400" },
    { key: "cta", icon: MousePointerClick, label: "CTA", color: "text-green-400" },
    { key: "ai", icon: Wand2, label: "IA", color: "text-amber-400" },
    { key: "settings", icon: Settings2, label: "Config", color: "text-muted-foreground" },
  ];

  const enabledCount = form.sections.filter(s => s.enabled).length;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-col h-[calc(100vh-64px)]">
        {/* ═══ TOP BAR ═══ */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-card/95 backdrop-blur-sm z-20 shrink-0">
          <div className="flex items-center gap-2">
            <Tooltip><TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/propostas/modelos")}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </TooltipTrigger><TooltipContent side="bottom">Voltar</TooltipContent></Tooltip>

            <div className="h-6 w-px bg-border" />

            <Input
              value={form.name}
              onChange={(e) => update({ name: e.target.value })}
              placeholder="Nome do modelo..."
              className="border-none shadow-none p-0 h-auto text-base font-bold focus-visible:ring-0 bg-transparent w-56"
            />

            {form.is_active ? (
              <Badge className="text-[9px] bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20">Ativo</Badge>
            ) : (
              <Badge variant="secondary" className="text-[9px]">Inativo</Badge>
            )}
            {hasChanges && <span className="text-[10px] text-amber-500 font-mono animate-pulse">● não salvo</span>}
          </div>

          {/* Center toolbar */}
          <div className="flex items-center gap-0.5 bg-muted/60 rounded-lg px-1 py-0.5">
            <Tooltip><TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { undoRedo.undo(); setForm(undoRedo.current); }} disabled={!undoRedo.canUndo}>
                <Undo2 className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger><TooltipContent>Desfazer ⌘Z</TooltipContent></Tooltip>
            <Tooltip><TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { undoRedo.redo(); setForm(undoRedo.current); }} disabled={!undoRedo.canRedo}>
                <Redo2 className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger><TooltipContent>Refazer ⌘⇧Z</TooltipContent></Tooltip>

            <div className="w-px h-4 bg-border mx-0.5" />

            <Tooltip><TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(z => Math.max(0.4, z - 0.1))}>
                <ZoomOut className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger><TooltipContent>Zoom out</TooltipContent></Tooltip>
            <button onClick={() => setZoom(0.7)} className="text-[10px] font-mono text-muted-foreground w-9 text-center hover:text-foreground transition-colors">{Math.round(zoom * 100)}%</button>
            <Tooltip><TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(z => Math.min(1.5, z + 0.1))}>
                <ZoomIn className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger><TooltipContent>Zoom in</TooltipContent></Tooltip>

            <div className="w-px h-4 bg-border mx-0.5" />

            <Tooltip><TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPanelCollapsed(!panelCollapsed)}>
                {panelCollapsed ? <PanelRight className="w-3.5 h-3.5" /> : <PanelLeft className="w-3.5 h-3.5" />}
              </Button>
            </TooltipTrigger><TooltipContent>{panelCollapsed ? "Mostrar painel" : "Esconder painel"}</TooltipContent></Tooltip>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} size="sm" className="gap-1.5 text-xs">
              <Save className="w-3.5 h-3.5" />
              {saveMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>

        {/* ═══ MAIN AREA ═══ */}
        <div className="flex flex-1 overflow-hidden">
          {/* Icon rail */}
          <div className="w-[52px] border-r border-border bg-card flex flex-col items-center py-2 gap-1 shrink-0">
            {panels.map((tab) => {
              const active = activePanel === tab.key && !panelCollapsed;
              return (
                <Tooltip key={tab.key}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => { setActivePanel(activePanel === tab.key ? null : tab.key); setPanelCollapsed(false); }}
                      className={cn(
                        "w-10 h-10 flex flex-col items-center justify-center gap-0.5 rounded-xl text-[8px] font-medium transition-all relative",
                        active ? "bg-primary/10 text-primary shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      )}
                    >
                      {active && <div className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-primary" />}
                      <tab.icon className={cn("w-4 h-4", active && tab.color)} />
                      <span className="leading-none">{tab.label}</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">{tab.label}</TooltipContent>
                </Tooltip>
              );
            })}
          </div>

          {/* Panel content */}
          {activePanel && !panelCollapsed && (
            <div className="w-80 border-r border-border bg-card flex flex-col shrink-0 overflow-hidden">
              <div className="px-4 py-3 border-b border-border/50 shrink-0 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {(() => { const P = panels.find(p => p.key === activePanel); return P ? <P.icon className={cn("w-4 h-4", P.color)} /> : null; })()}
                  <h3 className="text-sm font-bold">{panels.find(p => p.key === activePanel)?.label}</h3>
                </div>
                {activePanel === "sections" && (
                  <Badge variant="secondary" className="text-[9px]">{enabledCount} de {form.sections.length}</Badge>
                )}
              </div>
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-5">
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
          <div className="flex-1 overflow-auto bg-muted/20 relative">
            <div className="sticky top-0 z-10 bg-muted/40 backdrop-blur-sm border-b border-border/30 px-4 py-1.5 flex items-center gap-2">
              <Eye className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground font-medium">Preview ao vivo — clique nas seções para editar</span>
              <div className="ml-auto flex items-center gap-1.5">
                <Badge variant="outline" className="text-[9px] gap-1">
                  <Sparkles className="w-3 h-3" /> {form.theme_config.style || "classic"}
                </Badge>
              </div>
            </div>
            <div className="p-6">
              <div className="max-w-4xl mx-auto">
                <TemplatePreview form={form} activePanel={activePanel} onClickSection={setActivePanel} zoom={zoom} />
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
      {/* Info banner */}
      <div className="p-3 rounded-xl bg-primary/5 border border-primary/15">
        <div className="flex items-center gap-2 mb-1">
          <Grip className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold text-primary">Blocos da Proposta</span>
        </div>
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Arraste os blocos para reordenar. Ative ou desative seções conforme necessário.
        </p>
      </div>

      {/* Draggable blocks */}
      <div className="space-y-1">
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
                "group flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all cursor-grab active:cursor-grabbing",
                sec.enabled ? "border-primary/15 bg-primary/[0.03] hover:bg-primary/[0.06]" : "border-border/40 bg-muted/20 opacity-60 hover:opacity-80",
                isDragging && "opacity-40 scale-95",
                isDragOver && "border-primary/40 bg-primary/10 shadow-sm",
              )}
            >
              <div className="flex flex-col items-center text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors">
                <GripVertical className="w-4 h-4" />
              </div>

              <div className={cn(
                "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                sec.enabled ? "bg-primary/10" : "bg-muted/50"
              )}>
                <Icon className={cn("w-4 h-4", sec.enabled ? "text-primary" : "text-muted-foreground/50")} />
              </div>

              <div className="flex-1 min-w-0">
                <p className={cn("text-xs font-semibold truncate", !sec.enabled && "text-muted-foreground/60")}>{def.label}</p>
                <p className="text-[9px] text-muted-foreground/60 truncate">{def.desc}</p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[9px] font-mono text-muted-foreground/40">#{String(idx + 1).padStart(2, "0")}</span>
                <Switch
                  checked={sec.enabled}
                  onCheckedChange={() => toggleSection(sec.type)}
                  className="scale-75"
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick actions */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1 text-[10px] h-8 gap-1"
          onClick={() => {
            const allEnabled = form.sections.every(s => s.enabled);
            // Toggle all
            const sections = form.sections.map(s => ({ ...s, enabled: !allEnabled }));
            // But always keep hero enabled
            const heroIdx = sections.findIndex(s => s.type === "hero");
            if (heroIdx >= 0) sections[heroIdx].enabled = true;
          }}
        >
          <CheckCircle className="w-3 h-3" /> Todos
        </Button>
        <Button variant="outline" size="sm" className="flex-1 text-[10px] h-8 gap-1"
          onClick={() => {
            const reset = SECTION_DEFS.map((s, i) => ({ type: s.type, enabled: true, order: i }));
          }}
        >
          <RotateCcw className="w-3 h-3" /> Reset
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
      <ColorRow label="Cor principal" description="Fundo da capa e gradientes" value={form.primary_color} onChange={v => update({ primary_color: v })} />
      <ColorRow label="Cor de destaque" description="Separadores, badges e valores" value={form.accent_color} onChange={v => update({ accent_color: v })} />
      <ColorRow label="Cor do texto" description="Textos do corpo" value={form.text_color} onChange={v => update({ text_color: v })} />
      <ColorRow label="Cor de fundo" description="Background das seções" value={form.bg_color} onChange={v => update({ bg_color: v })} />

      <div>
        <Label className="text-xs font-medium mb-2 block">Gradiente secundário</Label>
        <div className="flex items-center gap-2">
          <input type="color" value={form.theme_config.gradientSecondary || form.primary_color} onChange={e => update({ theme_config: { ...form.theme_config, gradientSecondary: e.target.value } })} className="w-10 h-8 rounded-lg border border-border cursor-pointer shrink-0" />
          <Input value={form.theme_config.gradientSecondary || ""} onChange={e => update({ theme_config: { ...form.theme_config, gradientSecondary: e.target.value } })} placeholder="Opcional" className="font-mono text-xs" />
        </div>
        {form.theme_config.gradientSecondary && (
          <>
            <Label className="text-xs mt-3 block">Ângulo: {form.theme_config.gradientAngle}°</Label>
            <Slider value={[form.theme_config.gradientAngle]} onValueChange={([v]) => update({ theme_config: { ...form.theme_config, gradientAngle: v } })} min={0} max={360} step={15} className="mt-2" />
            <div className="mt-2 h-8 rounded-xl" style={{ background: `linear-gradient(${form.theme_config.gradientAngle}deg, ${form.primary_color}, ${form.theme_config.gradientSecondary})` }} />
          </>
        )}
      </div>

      {/* Live preview swatch */}
      <div className="p-4 rounded-xl overflow-hidden relative" style={{ backgroundColor: form.primary_color }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg" style={{ backgroundColor: form.accent_color }} />
          <div>
            <div className="h-2 w-20 rounded-full" style={{ backgroundColor: form.accent_color }} />
            <div className="h-1.5 w-14 rounded-full mt-1.5 opacity-40" style={{ backgroundColor: form.accent_color }} />
          </div>
        </div>
        <div className="h-1 rounded-full opacity-20" style={{ backgroundColor: form.accent_color }} />
      </div>

      <div>
        <Label className="text-xs font-medium mb-2 block">Paletas rápidas</Label>
        <div className="grid grid-cols-4 gap-1.5">
          {presets.map((preset) => (
            <button key={preset.name} onClick={() => update({ primary_color: preset.primary, accent_color: preset.accent })}
              className={cn(
                "group flex flex-col items-center gap-1 p-1.5 rounded-lg transition-all",
                form.primary_color === preset.primary && form.accent_color === preset.accent
                  ? "bg-primary/10 ring-1 ring-primary/30"
                  : "hover:bg-muted/50"
              )}>
              <div className="w-full h-8 rounded-lg overflow-hidden border border-border/50 shadow-sm">
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
    <div>
      <Label className="text-xs font-medium mb-1.5 block">{label}</Label>
      <div className="flex items-center gap-2">
        <div className="relative">
          <input type="color" value={value} onChange={e => onChange(e.target.value)} className="w-10 h-10 rounded-xl border border-border cursor-pointer shrink-0 [&::-webkit-color-swatch-wrapper]:p-1 [&::-webkit-color-swatch]:rounded-lg" />
        </div>
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
    { heading: "Sora", body: "DM Sans", name: "Futurista" },
    { heading: "Libre Baskerville", body: "Raleway", name: "Literário" },
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
      <div className="p-5 rounded-xl border border-border overflow-hidden" style={{ background: `linear-gradient(135deg, ${form.primary_color}, ${form.primary_color}dd)` }}>
        <p className="text-xl font-bold text-white mb-1 leading-tight" style={{ fontFamily: `'${form.font_heading}', serif` }}>Aventura Inesquecível</p>
        <p className="text-xs text-white/60 leading-relaxed" style={{ fontFamily: `'${form.font_body}', sans-serif` }}>
          Descubra paisagens deslumbrantes e experiências únicas com a {form.font_body}.
        </p>
        <div className="mt-3 flex items-center gap-2">
          <div className="h-1 flex-1 rounded-full" style={{ backgroundColor: `${form.accent_color}40` }}>
            <div className="h-full w-2/3 rounded-full" style={{ backgroundColor: form.accent_color }} />
          </div>
          <span className="text-[9px] font-mono text-white/40">Aa</span>
        </div>
      </div>

      <div>
        <Label className="text-xs font-medium mb-2 block">Combinações rápidas</Label>
        <div className="grid grid-cols-2 gap-1.5">
          {combos.map((c) => (
            <button key={c.name} onClick={() => update({ font_heading: c.heading, font_body: c.body })}
              className={cn(
                "text-left px-3 py-2.5 rounded-xl border transition-all",
                form.font_heading === c.heading && form.font_body === c.body
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border/50 hover:bg-muted/50"
              )}>
              <span className="text-xs font-bold block" style={{ fontFamily: `'${c.heading}'` }}>{c.name}</span>
              <span className="text-[9px] text-muted-foreground block mt-0.5 truncate" style={{ fontFamily: `'${c.body}'` }}>{c.heading}</span>
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
              className={cn("flex flex-col items-center gap-1 p-2.5 rounded-xl border text-[10px] transition-all",
                value === opt.value ? "border-primary bg-primary/5 text-primary shadow-sm" : "border-border/40 text-muted-foreground hover:bg-muted/50"
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

      <div>
        <Label className="text-xs font-medium block">Opacidade do overlay: {tc.heroOverlayOpacity}%</Label>
        <Slider value={[tc.heroOverlayOpacity]} onValueChange={([v]) => updateTC({ heroOverlayOpacity: v })} min={20} max={100} step={5} className="mt-2" />
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
            className={cn("text-[10px] px-2 py-2 rounded-xl border transition-all font-medium",
              value === opt.value ? "border-primary bg-primary/5 text-primary shadow-sm" : "border-border/40 text-muted-foreground hover:bg-muted/50"
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
            { value: "solid", label: "Sólido" }, { value: "gradient", label: "Gradiente" },
            { value: "outline", label: "Contorno" }, { value: "pill", label: "Pill" },
          ].map(s => (
            <button key={s.value} onClick={() => updateTC({ ctaStyle: s.value })}
              className={cn("text-xs px-3 py-2.5 rounded-xl border transition-all font-medium",
                tc.ctaStyle === s.value ? "border-primary bg-primary/5 text-primary shadow-sm" : "border-border/40 text-muted-foreground hover:bg-muted/50"
              )}>{s.label}</button>
          ))}
        </div>
      </div>
      <div>
        <Label className="text-xs font-medium mb-1.5 block">Texto do botão</Label>
        <Input value={tc.ctaText} onChange={e => updateTC({ ctaText: e.target.value })} className="text-xs" placeholder="Quero reservar" />
      </div>
      {/* Preview */}
      <div className="p-6 rounded-xl border border-border/30 bg-muted/20 flex items-center justify-center">
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
      <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-accent/5 border border-primary/15">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Wand2 className="w-4 h-4 text-primary" />
          </div>
          <div>
            <span className="text-xs font-bold block">Sugestões Inteligentes</span>
            <span className="text-[9px] text-muted-foreground">Um clique aplica todo o estilo</span>
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        {AI_SUGGESTIONS.map((sug) => (
          <button key={sug.name} onClick={() => applyAISuggestion(sug.preset)}
            className="w-full text-left px-3 py-3 rounded-xl border border-border/40 hover:border-primary/30 hover:bg-primary/[0.03] transition-all group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-border/50 shadow-sm">
                <div className="h-1/2" style={{ backgroundColor: sug.preset.primary_color }} />
                <div className="h-1/2" style={{ backgroundColor: sug.preset.accent_color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold group-hover:text-primary transition-colors truncate">{sug.name}</p>
                <p className="text-[9px] text-muted-foreground truncate">{sug.desc}</p>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-primary transition-colors" />
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

      <div className="space-y-2">
        {[
          { label: "Modelo padrão", desc: "Usar automaticamente em novas propostas", value: form.is_default, key: "is_default" },
          { label: "Ativo", desc: "Disponível para seleção", value: form.is_active, key: "is_active" },
        ].map(item => (
          <div key={item.key} className="flex items-center justify-between px-4 py-3 rounded-xl border border-border/40">
            <div>
              <p className="text-sm font-medium">{item.label}</p>
              <p className="text-[10px] text-muted-foreground">{item.desc}</p>
            </div>
            <Switch checked={item.value} onCheckedChange={(v) => update({ [item.key]: v })} />
          </div>
        ))}
      </div>

      <div className="pt-2">
        <Button variant="outline" size="sm" className="w-full text-xs gap-1.5 text-destructive hover:text-destructive">
          <Trash2 className="w-3.5 h-3.5" /> Excluir modelo
        </Button>
      </div>
    </>
  );
}
