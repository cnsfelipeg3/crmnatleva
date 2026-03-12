import { useState, useRef } from "react";
import { getNodeDefinition, type ConfigField } from "./nodeTypes";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { X, Trash2, Plus, GripVertical, Upload, FileAudio, Loader2, Maximize2 } from "lucide-react";
import type { Node } from "@xyflow/react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Props {
  node: Node;
  onUpdate: (nodeId: string, config: Record<string, unknown>) => void;
  onLabelChange: (nodeId: string, label: string) => void;
  onDelete: (nodeId: string) => void;
  onClose: () => void;
}

interface RouteEntry {
  label: string;
  keywords: string[];
}

export function FlowBlockConfig({ node, onUpdate, onLabelChange, onDelete, onClose }: Props) {
  const def = getNodeDefinition(node.data.nodeType as string);
  const [uploading, setUploading] = useState(false);
  const [expandedField, setExpandedField] = useState<string | null>(null);
  const [expandedValue, setExpandedValue] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  if (!def) return null;

  const config = (node.data.config as Record<string, unknown>) || {};
  const isRouter = (node.data.nodeType as string) === "condition_router";
  const isSendMedia = (node.data.nodeType as string) === "send_media";
  const mediaType = config.media_type as string;

  const handleChange = (key: string, value: unknown) => {
    onUpdate(node.id, { ...config, [key]: value });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `flow-audio/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("flow-media").upload(path, file);
    if (error) {
      toast({ title: "Erro no upload", description: error.message, variant: "destructive" });
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("flow-media").getPublicUrl(path);
    handleChange("media_url", urlData.publicUrl);
    toast({ title: "Arquivo enviado com sucesso" });
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Router routes helpers
  const getRoutes = (): RouteEntry[] => {
    try {
      const routesStr = config.routes as string;
      return routesStr ? JSON.parse(routesStr) : [{ label: "Rota 1", keywords: [] }];
    } catch {
      return [{ label: "Rota 1", keywords: [] }];
    }
  };

  const setRoutes = (routes: RouteEntry[]) => {
    handleChange("routes", JSON.stringify(routes));
  };

  const renderField = (field: ConfigField) => {
    const val = config[field.key];

    switch (field.type) {
      case "text":
      case "variable":
        return (
          <Input
            value={(val as string) || ""}
            onChange={e => handleChange(field.key, e.target.value)}
            placeholder={field.placeholder}
            className="h-8 text-xs"
          />
        );
      case "textarea":
      case "json":
        return (
          <div className="relative">
            <Textarea
              value={(val as string) || ""}
              onChange={e => handleChange(field.key, e.target.value)}
              placeholder={field.placeholder}
              className="text-xs min-h-[60px] resize-y pr-8"
            />
            <button
              type="button"
              onClick={() => { setExpandedField(field.key); setExpandedValue((val as string) || ""); }}
              className="absolute top-1.5 right-1.5 h-5 w-5 rounded bg-muted/80 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              title="Expandir editor"
            >
              <Maximize2 className="h-3 w-3" />
            </button>
          </div>
        );
      case "number":
        return (
          <Input
            type="number"
            value={(val as number) || ""}
            onChange={e => handleChange(field.key, Number(e.target.value))}
            placeholder={field.placeholder}
            className="h-8 text-xs"
          />
        );
      case "boolean":
        return (
          <Switch
            checked={!!val}
            onCheckedChange={v => handleChange(field.key, v)}
          />
        );
      case "select":
        return (
          <Select value={(val as string) || ""} onValueChange={v => handleChange(field.key, v)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Selecionar..." />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map(opt => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case "tags":
        return (
          <Input
            value={(val as string) || ""}
            onChange={e => handleChange(field.key, e.target.value)}
            placeholder={field.placeholder || "Separar por vírgula"}
            className="h-8 text-xs"
          />
        );
      default:
        return <Input value={(val as string) || ""} onChange={e => handleChange(field.key, e.target.value)} className="h-8 text-xs" />;
    }
  };

  const renderRouterEditor = () => {
    const routes = getRoutes();

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Rotas de saída</Label>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-[10px] gap-1"
            onClick={() => setRoutes([...routes, { label: `Rota ${routes.length + 1}`, keywords: [] }])}
          >
            <Plus className="h-3 w-3" /> Rota
          </Button>
        </div>
        {routes.map((route, i) => (
          <div key={i} className="border border-border rounded-lg p-2.5 space-y-2 bg-muted/30">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                <div className="h-2 w-2 rounded-full bg-amber-500" />
              </div>
              <Input
                value={route.label}
                onChange={e => {
                  const updated = [...routes];
                  updated[i] = { ...updated[i], label: e.target.value };
                  setRoutes(updated);
                }}
                className="h-7 text-xs font-bold flex-1"
                placeholder="Nome da rota"
              />
              {routes.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0 text-destructive hover:text-destructive"
                  onClick={() => setRoutes(routes.filter((_, j) => j !== i))}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
            <div>
              <Label className="text-[9px] text-muted-foreground">Palavras-chave (separar por vírgula)</Label>
              <Input
                value={route.keywords.join(", ")}
                onChange={e => {
                  const updated = [...routes];
                  updated[i] = { ...updated[i], keywords: e.target.value.split(",").map(k => k.trim()).filter(Boolean) };
                  setRoutes(updated);
                }}
                className="h-7 text-xs mt-0.5"
                placeholder="carro, veículo, informações"
              />
            </div>
          </div>
        ))}
        <div className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-rose-500/10 text-[10px] text-rose-400">
          <div className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
          <span className="font-medium">Nenhuma correspondência → saída "fallback"</span>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="w-[280px] border-l border-border bg-card/50 flex flex-col shrink-0">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded" style={{ backgroundColor: `${def.color}20` }}>
              <div className="h-full w-full flex items-center justify-center">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: def.color }} />
              </div>
            </div>
            <span className="text-xs font-bold">{def.label}</span>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-3 space-y-3">
            {/* Label */}
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Nome do bloco</Label>
              <Input
                value={(node.data.label as string) || def.label}
                onChange={e => onLabelChange(node.id, e.target.value)}
                className="h-8 text-xs mt-1"
              />
            </div>

            {/* Config fields - for router, show visual editor instead of raw JSON for routes */}
            {isRouter ? (
              <>
                {def.configSchema.filter(f => f.key !== "routes").map(field => (
                  <div key={field.key}>
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      {field.label}
                      {field.required && <span className="text-destructive">*</span>}
                    </Label>
                    {field.description && (
                      <p className="text-[9px] text-muted-foreground/70 mb-1">{field.description}</p>
                    )}
                    <div className="mt-1">{renderField(field)}</div>
                  </div>
                ))}
                {renderRouterEditor()}
              </>
            ) : (
              def.configSchema.map(field => {
                // Show file upload for media_url when send_media + audio/image/video/document
                const showFileUpload = isSendMedia && field.key === "media_url";
                return (
                  <div key={field.key}>
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      {field.label}
                      {field.required && <span className="text-destructive">*</span>}
                    </Label>
                    {field.description && (
                      <p className="text-[9px] text-muted-foreground/70 mb-1">{field.description}</p>
                    )}
                    <div className="mt-1">{renderField(field)}</div>
                    {showFileUpload && (
                      <div className="mt-2 space-y-2">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept={mediaType === "audio" ? "audio/*" : mediaType === "image" ? "image/*" : mediaType === "video" ? "video/*" : "*/*"}
                          className="hidden"
                          onChange={handleFileUpload}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-xs gap-1.5"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploading}
                        >
                          {uploading ? (
                            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Enviando...</>
                          ) : (
                            <><Upload className="h-3.5 w-3.5" /> Enviar arquivo do computador</>
                          )}
                        </Button>
                        {config.media_url && (
                          <div className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-muted/50 border border-border">
                            <FileAudio className="h-3 w-3 text-primary shrink-0" />
                            <span className="text-[9px] text-muted-foreground truncate flex-1">
                              {(config.media_url as string).split("/").pop()}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        <div className="p-3 border-t border-border">
          <Button
            variant="destructive"
            size="sm"
            className="w-full text-xs"
            onClick={() => onDelete(node.id)}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" /> Excluir bloco
          </Button>
        </div>
      </div>

      {/* Fullscreen Prompt Editor Dialog */}
      <Dialog open={!!expandedField} onOpenChange={(open) => { if (!open) setExpandedField(null); }}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-sm">
              {expandedField && def.configSchema.find(f => f.key === expandedField)?.label || "Editor"}
            </DialogTitle>
          </DialogHeader>
          <Textarea
            value={expandedValue}
            onChange={e => setExpandedValue(e.target.value)}
            className="flex-1 text-sm resize-none font-mono leading-relaxed"
            placeholder="Digite o conteúdo aqui..."
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setExpandedField(null)}>Cancelar</Button>
            <Button size="sm" onClick={() => {
              if (expandedField) handleChange(expandedField, expandedValue);
              setExpandedField(null);
            }}>Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}