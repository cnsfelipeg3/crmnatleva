// =====================================================================
// Editor estilo Canva · adiciona, edita e arrasta camadas de texto/forma
// sobre uma arte existente. Exporta em PNG via html2canvas e salva como
// nova versão no histórico (bucket marketing-assets).
// =====================================================================
import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Type, Square, Trash2, Bold, Italic, AlignLeft, AlignCenter, AlignRight,
  Loader2, Save, Download, Plus, X, Copy as CopyIcon, ArrowUp, ArrowDown,
  ScanText, ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import { supabase } from "@/integrations/supabase/client";
import { NATLEVA_BRAND } from "@/lib/marketing/natlevaBrand";
import { findFormat, type FormatId } from "@/lib/marketing/formats";
import {
  detectTextRegions,
  findForbiddenInBlob,
  type DetectedWord,
} from "@/lib/marketing/ocrCheck";

type LayerType = "text" | "rect";

interface BaseLayer {
  id: string;
  type: LayerType;
  // posição em % do canvas (0..100) para escalar bem em qualquer tamanho
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
  rotation: number;
  z: number;
}

interface TextLayer extends BaseLayer {
  type: "text";
  text: string;
  color: string;
  bgColor: string; // transparente se ""
  fontFamily: string;
  fontSizePct: number;  // % da altura do canvas
  weight: 400 | 700;
  italic: boolean;
  align: "left" | "center" | "right";
  letterSpacing: number; // em px
  paddingX: number;
  paddingY: number;
  radius: number;
}

interface RectLayer extends BaseLayer {
  type: "rect";
  bgColor: string;
  radius: number;
  opacity: number;
}

type Layer = TextLayer | RectLayer;

interface Asset {
  id: string;
  product_id: string;
  format: string;
  url: string;
  model: string | null;
  created_at: string;
  prompt: any;
}

interface Props {
  asset: Asset | null;
  onClose: () => void;
  onSaved: () => void;
}

const FONT_OPTIONS = [
  { label: "Playfair Display (display)", value: "'Playfair Display', serif" },
  { label: "Instrument Sans (body)", value: "'Instrument Sans', system-ui, sans-serif" },
  { label: "Inter", value: "Inter, system-ui, sans-serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Helvetica", value: "Helvetica, Arial, sans-serif" },
];

const PALETTE = [
  { name: "Linen", v: NATLEVA_BRAND.colors.linen },
  { name: "Sand", v: NATLEVA_BRAND.colors.sand },
  { name: "Ink", v: NATLEVA_BRAND.colors.ink },
  { name: "Rolex", v: NATLEVA_BRAND.colors.rolexGreen },
  { name: "Hunter", v: NATLEVA_BRAND.colors.hunter },
  { name: "Eucalyptus", v: NATLEVA_BRAND.colors.eucalyptus },
  { name: "Champagne", v: NATLEVA_BRAND.colors.champagne },
  { name: "Branco", v: "#FFFFFF" },
  { name: "Preto", v: "#000000" },
];

const uid = () => Math.random().toString(36).slice(2, 9);

function newTextLayer(partial?: Partial<TextLayer>): TextLayer {
  return {
    id: uid(),
    type: "text",
    xPct: 10, yPct: 10, wPct: 60, hPct: 12,
    rotation: 0, z: 1,
    text: "Novo texto",
    color: NATLEVA_BRAND.colors.linen,
    bgColor: "",
    fontFamily: "'Playfair Display', serif",
    fontSizePct: 5,
    weight: 700,
    italic: false,
    align: "left",
    letterSpacing: 0,
    paddingX: 12,
    paddingY: 6,
    radius: 8,
    ...partial,
  };
}

function newRectLayer(partial?: Partial<RectLayer>): RectLayer {
  return {
    id: uid(),
    type: "rect",
    xPct: 20, yPct: 40, wPct: 40, hPct: 12,
    rotation: 0, z: 0,
    bgColor: NATLEVA_BRAND.colors.champagne,
    radius: 12,
    opacity: 1,
    ...partial,
  };
}

export default function MarketingAssetEditor({ asset, onClose, onSaved }: Props) {
  const [layers, setLayers] = useState<Layer[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [imageReady, setImageReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [detectedWords, setDetectedWords] = useState<DetectedWord[]>([]);
  const [detecting, setDetecting] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{
    id: string; mode: "move" | "resize"; startX: number; startY: number;
    initX: number; initY: number; initW: number; initH: number;
    rectW: number; rectH: number;
  } | null>(null);

  const fmt = useMemo(
    () => (asset ? findFormat((asset.format as FormatId) || "feed") : null),
    [asset],
  );

  // Quando trocar a arte, reset
  useEffect(() => {
    setLayers([]);
    setSelectedId(null);
    setImageReady(false);
    setDetectedWords([]);
  }, [asset?.id]);

  if (!asset || !fmt) return null;

  const aspect = `${fmt.width} / ${fmt.height}`;

  const selected = layers.find((l) => l.id === selectedId) || null;
  const updateSelected = (patch: Partial<Layer>) => {
    if (!selected) return;
    setLayers((prev) => prev.map((l) => (l.id === selected.id ? { ...l, ...(patch as any) } : l)));
  };

  const onDragStart = (e: React.PointerEvent, id: string, mode: "move" | "resize") => {
    e.stopPropagation();
    e.preventDefault();
    const stage = stageRef.current!;
    const rect = stage.getBoundingClientRect();
    const layer = layers.find((l) => l.id === id);
    if (!layer) return;
    setSelectedId(id);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    dragState.current = {
      id, mode,
      startX: e.clientX, startY: e.clientY,
      initX: layer.xPct, initY: layer.yPct,
      initW: layer.wPct, initH: layer.hPct,
      rectW: rect.width, rectH: rect.height,
    };
  };

  const onDragMove = (e: React.PointerEvent) => {
    const ds = dragState.current;
    if (!ds) return;
    const dxPct = ((e.clientX - ds.startX) / ds.rectW) * 100;
    const dyPct = ((e.clientY - ds.startY) / ds.rectH) * 100;
    setLayers((prev) =>
      prev.map((l) => {
        if (l.id !== ds.id) return l;
        if (ds.mode === "move") {
          return { ...l, xPct: Math.max(-10, Math.min(110, ds.initX + dxPct)), yPct: Math.max(-10, Math.min(110, ds.initY + dyPct)) };
        }
        return {
          ...l,
          wPct: Math.max(4, ds.initW + dxPct),
          hPct: Math.max(3, ds.initH + dyPct),
        };
      }),
    );
  };

  const onDragEnd = () => { dragState.current = null; };

  const addText = (preset?: Partial<TextLayer>) => {
    const l = newTextLayer(preset);
    setLayers((prev) => [...prev, l]);
    setSelectedId(l.id);
  };
  const addRect = () => {
    const l = newRectLayer();
    setLayers((prev) => [...prev, l]);
    setSelectedId(l.id);
  };

  const duplicateLayer = (id: string) => {
    const l = layers.find((x) => x.id === id);
    if (!l) return;
    const copy: Layer = { ...l, id: uid(), xPct: l.xPct + 3, yPct: l.yPct + 3 } as Layer;
    setLayers((prev) => [...prev, copy]);
    setSelectedId(copy.id);
  };

  const removeLayer = (id: string) => {
    setLayers((prev) => prev.filter((l) => l.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const moveZ = (id: string, dir: 1 | -1) => {
    setLayers((prev) => {
      const idx = prev.findIndex((l) => l.id === id);
      if (idx < 0) return prev;
      const target = idx + dir;
      if (target < 0 || target >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[target]] = [copy[target], copy[idx]];
      return copy;
    });
  };

  // OCR · detecta palavras na arte para permitir clique-para-editar
  async function runDetect() {
    if (!asset) return;
    setDetecting(true);
    try {
      const words = await detectTextRegions(asset.url);
      setDetectedWords(words);
      if (words.length === 0) toast.info("Nenhum texto detectado na arte");
      else toast.success(`${words.length} palavras detectadas · clique sobre uma para editar`);
    } catch (e: any) {
      toast.error("Falha no OCR", { description: e?.message });
    } finally {
      setDetecting(false);
    }
  }

  // Clique em uma palavra detectada · cria patch (cobre original) + camada de texto editável
  function editDetectedWord(w: DetectedWord) {
    const padX = 0.4, padY = 0.3;
    const patch = newRectLayer({
      xPct: Math.max(0, w.xPct - padX),
      yPct: Math.max(0, w.yPct - padY),
      wPct: w.wPct + padX * 2,
      hPct: w.hPct + padY * 2,
      bgColor: w.bg,
      radius: 2,
      opacity: 1,
      z: 0,
    });
    const fontSizePct = Math.max(1.5, Math.min(12, w.hPct * 0.95));
    const text = newTextLayer({
      xPct: w.xPct,
      yPct: w.yPct - 0.2,
      wPct: w.wPct + 6,
      hPct: w.hPct,
      text: w.text,
      color: NATLEVA_BRAND.colors.linen,
      bgColor: "",
      fontFamily: "'Instrument Sans', sans-serif",
      fontSizePct,
      weight: 700,
      paddingX: 0,
      paddingY: 0,
      align: "left",
      z: 1,
    });
    setLayers((prev) => [...prev, patch, text]);
    setSelectedId(text.id);
    setDetectedWords((prev) => prev.filter((x) => x !== w));
  }

  // Export · cria render em alta resolução baseado nas dimensões reais do formato
  async function exportAndSave(action: "save" | "download") {
    if (!stageRef.current) return;
    setSaving(true);
    try {
      // Desenha em PNG no tamanho real do formato
      const targetW = fmt!.width;
      const scale = targetW / stageRef.current.getBoundingClientRect().width;
      const canvas = await html2canvas(stageRef.current, {
        useCORS: true,
        allowTaint: false,
        backgroundColor: null,
        scale,
        logging: false,
      });
      const blob: Blob = await new Promise((res, rej) =>
        canvas.toBlob((b) => (b ? res(b) : rej(new Error("toBlob failed"))), "image/png", 0.95),
      );

      // Verificação OCR · bloqueia se restou alguma palavra proibida na imagem final
      toast.info("Validando arte (OCR)...");
      const hits = await findForbiddenInBlob(blob).catch(() => []);
      if (hits.length > 0) {
        const list = hits.map((h) => `· ${h.token}`).join("\n");
        toast.error("Arte bloqueada · termos proibidos detectados na imagem final", {
          description: `Cubra ou remova antes de salvar:\n${list}`,
          duration: 8000,
        });
        return;
      }

      if (action === "download") {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `natleva-${asset!.format}-edit-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success("Arte exportada");
        return;
      }

      // Save: upload pra storage e cria nova linha em product_marketing_assets
      const path = `${asset!.product_id}/edit-${Date.now()}-${asset!.format}.png`;
      const { error: upErr } = await supabase.storage
        .from("marketing-assets")
        .upload(path, blob, { contentType: "image/png", upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("marketing-assets").getPublicUrl(path);
      const url = pub.publicUrl;

      const { error: insErr } = await (supabase as any).from("product_marketing_assets").insert({
        product_id: asset!.product_id,
        format: asset!.format,
        url,
        model: "editor",
        prompt: { edited_from: asset!.id, layers, edited_at: new Date().toISOString() },
      });
      if (insErr) throw insErr;
      toast.success("Edição salva no histórico");
      onSaved();
      onClose();
    } catch (e: any) {
      toast.error("Falha ao exportar", { description: e?.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={!!asset} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[min(1280px,98vw)] w-[98vw] p-0 overflow-hidden">
        <DialogHeader className="px-4 py-3 border-b">
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="text-sm">Editor de arte · {fmt.label}</DialogTitle>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={runDetect} disabled={detecting || !imageReady}>
                {detecting ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <ScanText className="w-4 h-4 mr-1.5" />}
                {detectedWords.length > 0 ? `${detectedWords.length} textos detectados` : "Detectar textos clicáveis"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => exportAndSave("download")} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Download className="w-4 h-4 mr-1.5" />}
                Baixar PNG
              </Button>
              <Button size="sm" onClick={() => exportAndSave("save")} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Save className="w-4 h-4 mr-1.5" />}
                Salvar como nova arte
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr,320px] max-h-[85vh]">
          {/* CANVAS */}
          <div
            className="bg-muted/20 p-4 overflow-auto flex items-start justify-center"
            onPointerMove={onDragMove}
            onPointerUp={onDragEnd}
            onPointerLeave={onDragEnd}
          >
            <div
              ref={stageRef}
              className="relative shadow-xl rounded-md overflow-hidden bg-black select-none"
              style={{ aspectRatio: aspect, width: "min(100%, 720px)" }}
              onPointerDown={() => setSelectedId(null)}
            >
              <img
                src={asset.url}
                alt=""
                crossOrigin="anonymous"
                onLoad={() => setImageReady(true)}
                draggable={false}
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              />
              {!imageReady && (
                <div className="absolute inset-0 flex items-center justify-center text-white/70 text-xs">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" /> carregando arte...
                </div>
              )}

              {layers.map((l) => {
                const isSelected = l.id === selectedId;
                const baseStyle: React.CSSProperties = {
                  position: "absolute",
                  left: `${l.xPct}%`,
                  top: `${l.yPct}%`,
                  width: `${l.wPct}%`,
                  minHeight: l.type === "text" ? undefined : `${l.hPct}%`,
                  transform: `rotate(${l.rotation}deg)`,
                  outline: isSelected ? "2px solid hsl(var(--primary))" : "1px dashed transparent",
                  outlineOffset: 2,
                  cursor: dragState.current?.id === l.id ? "grabbing" : "grab",
                };

                if (l.type === "text") {
                  return (
                    <div
                      key={l.id}
                      style={{
                        ...baseStyle,
                        background: l.bgColor || "transparent",
                        borderRadius: l.radius,
                        padding: `${l.paddingY}px ${l.paddingX}px`,
                        textAlign: l.align,
                      }}
                      onPointerDown={(e) => onDragStart(e, l.id, "move")}
                      onClick={(e) => { e.stopPropagation(); setSelectedId(l.id); }}
                    >
                      <span
                        style={{
                          color: l.color,
                          fontFamily: l.fontFamily,
                          fontWeight: l.weight,
                          fontStyle: l.italic ? "italic" : "normal",
                          letterSpacing: `${l.letterSpacing}px`,
                          fontSize: `calc(${l.fontSizePct} * (var(--stage-h, 1px)))`,
                          // fallback usando a altura do stage via cqh quando disponível
                          lineHeight: 1.15,
                          whiteSpace: "pre-wrap",
                          display: "inline-block",
                          width: "100%",
                        }}
                      >
                        {l.text}
                      </span>
                      {isSelected && (
                        <span
                          onPointerDown={(e) => onDragStart(e, l.id, "resize")}
                          className="absolute -right-2 -bottom-2 w-4 h-4 bg-primary border-2 border-background rounded-full cursor-se-resize"
                        />
                      )}
                    </div>
                  );
                }
                // rect
                return (
                  <div
                    key={l.id}
                    style={{
                      ...baseStyle,
                      background: l.bgColor,
                      opacity: l.opacity,
                      borderRadius: l.radius,
                    }}
                    onPointerDown={(e) => onDragStart(e, l.id, "move")}
                    onClick={(e) => { e.stopPropagation(); setSelectedId(l.id); }}
                  >
                    {isSelected && (
                      <span
                        onPointerDown={(e) => onDragStart(e, l.id, "resize")}
                        className="absolute -right-2 -bottom-2 w-4 h-4 bg-primary border-2 border-background rounded-full cursor-se-resize"
                      />
                    )}
                  </div>
                );
              })}

              <StageHeightVar stageRef={stageRef} layers={layers} />
            </div>
          </div>

          {/* PANEL */}
          <div className="border-l overflow-y-auto">
            <div className="p-3 border-b space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Adicionar</div>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" onClick={() => addText({ text: "Headline", fontFamily: "'Playfair Display', serif", fontSizePct: 7, weight: 700, color: NATLEVA_BRAND.colors.linen })}>
                  <Type className="w-4 h-4 mr-1.5" /> Headline
                </Button>
                <Button variant="outline" size="sm" onClick={() => addText({ text: "Subheadline", fontFamily: "'Instrument Sans', sans-serif", fontSizePct: 3.5, weight: 400, color: NATLEVA_BRAND.colors.sand })}>
                  <Type className="w-4 h-4 mr-1.5" /> Subtítulo
                </Button>
                <Button variant="outline" size="sm" onClick={() => addText({ text: "Entrada R$ 0", fontFamily: "'Playfair Display', serif", fontSizePct: 6, weight: 700, color: NATLEVA_BRAND.colors.champagne, bgColor: NATLEVA_BRAND.colors.linen, paddingX: 18, paddingY: 12, radius: 12 })}>
                  <Type className="w-4 h-4 mr-1.5" /> Preço
                </Button>
                <Button variant="outline" size="sm" onClick={() => addText({ text: "Valor total para 2 pessoas", fontFamily: "'Instrument Sans', sans-serif", fontSizePct: 1.6, italic: true, color: NATLEVA_BRAND.colors.eucalyptus })}>
                  <Type className="w-4 h-4 mr-1.5" /> Caption
                </Button>
                <Button variant="outline" size="sm" onClick={() => addText()}>
                  <Plus className="w-4 h-4 mr-1.5" /> Texto livre
                </Button>
                <Button variant="outline" size="sm" onClick={addRect}>
                  <Square className="w-4 h-4 mr-1.5" /> Retângulo
                </Button>
              </div>
            </div>

            {/* LISTA DE CAMADAS */}
            <div className="p-3 border-b">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Camadas</div>
              {layers.length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhuma camada ainda. Adicione textos ou formas acima.</p>
              )}
              <div className="space-y-1">
                {[...layers].reverse().map((l) => (
                  <button
                    key={l.id}
                    onClick={() => setSelectedId(l.id)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-xs ${selectedId === l.id ? "bg-primary/10 border border-primary/40" : "hover:bg-muted"}`}
                  >
                    {l.type === "text" ? <Type className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                    <span className="flex-1 truncate">
                      {l.type === "text" ? (l as TextLayer).text : "Forma"}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* PROPRIEDADES */}
            {selected && (
              <div className="p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Propriedades</div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => moveZ(selected.id, 1)} title="Subir"><ArrowUp className="w-3.5 h-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => moveZ(selected.id, -1)} title="Descer"><ArrowDown className="w-3.5 h-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => duplicateLayer(selected.id)} title="Duplicar"><CopyIcon className="w-3.5 h-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeLayer(selected.id)} title="Remover"><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>

                {selected.type === "text" && (
                  <>
                    <div>
                      <Label className="text-xs">Texto</Label>
                      <Textarea
                        rows={2}
                        value={(selected as TextLayer).text}
                        onChange={(e) => updateSelected({ text: e.target.value } as any)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Fonte</Label>
                      <Select
                        value={(selected as TextLayer).fontFamily}
                        onValueChange={(v) => updateSelected({ fontFamily: v } as any)}
                      >
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {FONT_OPTIONS.map((f) => (
                            <SelectItem key={f.value} value={f.value}>
                              <span style={{ fontFamily: f.value }}>{f.label}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Tamanho ({(selected as TextLayer).fontSizePct.toFixed(1)}% da altura)</Label>
                      <Slider
                        min={1} max={15} step={0.1}
                        value={[(selected as TextLayer).fontSizePct]}
                        onValueChange={(v) => updateSelected({ fontSizePct: v[0] } as any)}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <Button variant={(selected as TextLayer).weight === 700 ? "default" : "outline"} size="sm" onClick={() => updateSelected({ weight: (selected as TextLayer).weight === 700 ? 400 : 700 } as any)}><Bold className="w-4 h-4" /></Button>
                      <Button variant={(selected as TextLayer).italic ? "default" : "outline"} size="sm" onClick={() => updateSelected({ italic: !(selected as TextLayer).italic } as any)}><Italic className="w-4 h-4" /></Button>
                      <div className="flex gap-1">
                        <Button variant={(selected as TextLayer).align === "left" ? "default" : "outline"} size="sm" className="px-2" onClick={() => updateSelected({ align: "left" } as any)}><AlignLeft className="w-3.5 h-3.5" /></Button>
                        <Button variant={(selected as TextLayer).align === "center" ? "default" : "outline"} size="sm" className="px-2" onClick={() => updateSelected({ align: "center" } as any)}><AlignCenter className="w-3.5 h-3.5" /></Button>
                        <Button variant={(selected as TextLayer).align === "right" ? "default" : "outline"} size="sm" className="px-2" onClick={() => updateSelected({ align: "right" } as any)}><AlignRight className="w-3.5 h-3.5" /></Button>
                      </div>
                    </div>
                    <ColorRow label="Cor do texto" value={(selected as TextLayer).color} onChange={(v) => updateSelected({ color: v } as any)} />
                    <ColorRow label="Fundo (pílula)" value={(selected as TextLayer).bgColor} allowEmpty onChange={(v) => updateSelected({ bgColor: v } as any)} />
                  </>
                )}

                {selected.type === "rect" && (
                  <>
                    <ColorRow label="Cor de fundo" value={(selected as RectLayer).bgColor} onChange={(v) => updateSelected({ bgColor: v } as any)} />
                    <div>
                      <Label className="text-xs">Opacidade</Label>
                      <Slider min={0} max={1} step={0.05}
                        value={[(selected as RectLayer).opacity]}
                        onValueChange={(v) => updateSelected({ opacity: v[0] } as any)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Arredondamento</Label>
                      <Slider min={0} max={48} step={1}
                        value={[(selected as RectLayer).radius]}
                        onValueChange={(v) => updateSelected({ radius: v[0] } as any)}
                      />
                    </div>
                  </>
                )}

                <div className="pt-2 border-t">
                  <Label className="text-xs">Posição & tamanho</Label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <NumInput label="X %" value={selected.xPct} onChange={(v) => updateSelected({ xPct: v } as any)} />
                    <NumInput label="Y %" value={selected.yPct} onChange={(v) => updateSelected({ yPct: v } as any)} />
                    <NumInput label="Largura %" value={selected.wPct} onChange={(v) => updateSelected({ wPct: v } as any)} />
                    <NumInput label="Altura %" value={selected.hPct} onChange={(v) => updateSelected({ hPct: v } as any)} />
                  </div>
                  <div className="mt-2">
                    <Label className="text-xs">Rotação ({selected.rotation}°)</Label>
                    <Slider min={-180} max={180} step={1}
                      value={[selected.rotation]}
                      onValueChange={(v) => updateSelected({ rotation: v[0] } as any)}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ===== Helpers =====

function ColorRow({
  label, value, onChange, allowEmpty,
}: { label: string; value: string; onChange: (v: string) => void; allowEmpty?: boolean }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="flex flex-wrap gap-1 mt-1">
        {allowEmpty && (
          <button
            type="button"
            onClick={() => onChange("")}
            className={`w-6 h-6 rounded border bg-background flex items-center justify-center ${!value ? "ring-2 ring-primary" : ""}`}
            title="Sem fundo"
          >
            <X className="w-3 h-3 text-muted-foreground" />
          </button>
        )}
        {PALETTE.map((p) => (
          <button
            key={p.v}
            type="button"
            title={p.name}
            onClick={() => onChange(p.v)}
            className={`w-6 h-6 rounded border ${value?.toLowerCase() === p.v.toLowerCase() ? "ring-2 ring-primary" : ""}`}
            style={{ background: p.v }}
          />
        ))}
        <Input
          type="color"
          value={value || "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="w-9 h-7 p-0 border-0"
        />
      </div>
    </div>
  );
}

function NumInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <Label className="text-[10px] text-muted-foreground">{label}</Label>
      <Input
        type="number"
        value={Number.isFinite(value) ? Math.round(value * 10) / 10 : 0}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="h-8 text-xs"
      />
    </div>
  );
}

// Mantém uma CSS variable --stage-h em px atualizada conforme o stage redimensiona,
// pra que fontSize em % da altura funcione cross-browser sem container queries.
function StageHeightVar({
  stageRef, layers,
}: { stageRef: React.RefObject<HTMLDivElement>; layers: Layer[] }) {
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const update = () => {
      const h = el.getBoundingClientRect().height;
      el.style.setProperty("--stage-h", `${h / 100}px`);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [stageRef, layers.length]);
  return null;
}
