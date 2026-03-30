import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Trash2, Sparkles, FileText, Image, Mic, Video, File } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import UploadProgressBar, { type UploadPhase } from "./UploadProgressBar";

const CATEGORIES = [
  { value: "destinos", label: "Destinos & Roteiros" },
  { value: "atendimento", label: "Atendimento & Scripts" },
  { value: "cultura", label: "Cultura & Tom de Voz" },
  { value: "comercial", label: "Comercial & Vendas" },
  { value: "operacional", label: "Operacional & Processos" },
  { value: "treinamento", label: "Treinamento" },
  { value: "regras", label: "Regras & Políticas" },
  { value: "geral", label: "Geral" },
];

const ACCEPT_TYPES = ".txt,.pdf,.jpg,.jpeg,.png,.webp,.mp3,.wav,.m4a,.ogg,.mp4,.mov,.webm";

function getFileIcon(mime: string) {
  if (mime.startsWith("image/")) return Image;
  if (mime.startsWith("audio/")) return Mic;
  if (mime.startsWith("video/")) return Video;
  if (mime.includes("pdf")) return FileText;
  if (mime.startsWith("text/")) return FileText;
  return File;
}

function getFileTypeLabel(mime: string): string {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("video/")) return "video";
  if (mime.includes("pdf")) return "pdf";
  return "text";
}

interface SmartUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export default function SmartUploadModal({ open, onOpenChange, onSaved }: SmartUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("geral");
  const [showManualText, setShowManualText] = useState(false);
  const [manualText, setManualText] = useState("");
  const [phase, setPhase] = useState<UploadPhase | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  const isProcessing = phase !== null && phase !== "done" && phase !== "error";

  const reset = () => {
    setFile(null); setTitle(""); setCategory("geral"); setManualText("");
    setShowManualText(false); setPhase(null); setProgress(0); setError("");
  };

  const handleClose = (o: boolean) => {
    if (isProcessing) return;
    if (!o) reset();
    onOpenChange(o);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) {
      setFile(f);
      if (!title) setTitle(f.name.replace(/\.[^.]+$/, ""));
    }
  }, [title]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      if (!title) setTitle(f.name.replace(/\.[^.]+$/, ""));
    }
  };

  const handleSubmit = async () => {
    // Validate
    const hasFile = !!file;
    const hasText = manualText.trim().length > 0;
    if (!hasFile && !hasText) {
      toast.error("Forneça um arquivo ou texto para processar");
      return;
    }
    if (!title.trim()) {
      toast.error("Título obrigatório");
      return;
    }

    try {
      let storageKey = "";
      let fileType = "text";
      let mimeType = "text/plain";
      let extractedContent = "";

      if (hasFile) {
        // Phase 1: Upload to storage
        setPhase("uploading");
        setProgress(20);
        mimeType = file!.type || "application/octet-stream";
        fileType = getFileTypeLabel(mimeType);
        storageKey = `kb-uploads/${Date.now()}-${file!.name}`;

        const { error: upErr } = await supabase.storage
          .from("ai-knowledge-base")
          .upload(storageKey, file!);
        if (upErr) throw upErr;
        setProgress(40);

        // Phase 2: Extract content via edge function
        setPhase("extracting");
        setProgress(50);
        const { data: extractData, error: extractErr } = await supabase.functions.invoke("smart-upload-process", {
          body: { storageKey, mimeType, title: title.trim() },
        });
        if (extractErr) throw extractErr;
        extractedContent = extractData?.content || "";
        setProgress(70);
      } else {
        // Text-only: skip upload/extraction
        extractedContent = manualText.trim();
        fileType = "text";
        setPhase("extracting");
        setProgress(70);
      }

      // Phase 3: Save to KB
      const { data: urlData } = storageKey
        ? supabase.storage.from("ai-knowledge-base").getPublicUrl(storageKey)
        : { data: { publicUrl: null } };

      const payload = {
        title: title.trim(),
        category,
        content_text: extractedContent || manualText.trim() || null,
        raw_transcript: hasFile && extractedContent ? extractedContent : null,
        file_url: urlData?.publicUrl || null,
        file_name: file?.name || null,
        file_type: fileType,
        is_active: true,
        description: hasFile ? `Processado via Upload Inteligente (${fileType})` : null,
      };

      const { data: inserted, error: insertErr } = await supabase
        .from("ai_knowledge_base")
        .insert(payload)
        .select("id")
        .single();
      if (insertErr) throw insertErr;

      // Phase 4: ÓRION enrichment (async, non-blocking on failure)
      if (extractedContent && extractedContent.length > 50) {
        setPhase("orion");
        setProgress(80);
        try {
          const { data: orgData } = await supabase.functions.invoke("organize-knowledge", {
            body: {
              content: extractedContent,
              title: title.trim(),
              tipo: fileType,
            },
          });
          if (orgData?.taxonomy) {
            const tax = orgData.taxonomy;
            await supabase.from("ai_knowledge_base").update({
              taxonomy: tax.taxonomia || tax,
              tags: tax.tags || [],
              confidence: tax.taxonomia?.confianca ?? tax.confianca ?? null,
              updated_at: new Date().toISOString(),
            }).eq("id", inserted.id);
          }
        } catch (orionErr) {
          console.warn("ÓRION enrichment failed (non-blocking):", orionErr);
        }
      }

      setPhase("done");
      setProgress(100);
      toast.success("Item adicionado à Base de Conhecimento!");

      setTimeout(() => {
        reset();
        onOpenChange(false);
        onSaved();
      }, 800);
    } catch (err: any) {
      console.error("SmartUpload error:", err);
      setPhase("error");
      setError(err.message || "Erro desconhecido");
      toast.error("Erro: " + (err.message || "Erro no upload"));
    }
  };

  const FileIcon = file ? getFileIcon(file.type) : Upload;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Upload Inteligente
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Drag & Drop Zone */}
          <div
            className={cn(
              "border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer",
              dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
              file && "border-primary/30 bg-primary/5",
              isProcessing && "pointer-events-none opacity-60",
            )}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => !isProcessing && document.getElementById("smart-upload-input")?.click()}
          >
            <FileIcon className={cn("w-8 h-8 mx-auto mb-2", file ? "text-primary" : "text-muted-foreground")} />
            {file ? (
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                <p className="text-[10px] text-muted-foreground">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                <Button
                  variant="ghost" size="sm" className="text-[10px] h-6 text-destructive"
                  onClick={(e) => { e.stopPropagation(); setFile(null); }}
                >
                  <Trash2 className="w-3 h-3 mr-1" /> Remover
                </Button>
              </div>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">Arraste um arquivo aqui ou clique para selecionar</p>
                <p className="text-[10px] text-muted-foreground mt-1">TXT, PDF, JPG, PNG, MP3, WAV, MP4 (até 20MB)</p>
              </>
            )}
            <input
              type="file" id="smart-upload-input" className="hidden"
              accept={ACCEPT_TYPES}
              onChange={handleFileSelect}
            />
          </div>

          {/* Manual text toggle */}
          {!file && (
            <button
              type="button"
              className="text-[11px] text-muted-foreground hover:text-primary underline underline-offset-2 transition-colors"
              onClick={() => setShowManualText(!showManualText)}
            >
              {showManualText ? "Ocultar texto manual" : "Ou cole texto manualmente"}
            </button>
          )}

          {/* Manual text input */}
          {showManualText && !file && (
            <div className="space-y-1">
              <Label className="text-xs">Texto</Label>
              <Textarea
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                placeholder="Cole o conteúdo aqui: roteiros, scripts, informações de destinos..."
                rows={5}
                className="text-xs"
                disabled={isProcessing}
              />
            </div>
          )}

          {/* Title */}
          <div className="space-y-1">
            <Label className="text-xs">Título *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Roteiro Tailândia 10 dias"
              className="text-xs h-8"
              disabled={isProcessing}
            />
          </div>

          {/* Category */}
          <div className="space-y-1">
            <Label className="text-xs">Categoria</Label>
            <Select value={category} onValueChange={setCategory} disabled={isProcessing}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Progress */}
          {phase && (
            <UploadProgressBar
              phase={phase}
              progress={progress}
              fileName={file?.name}
              error={error}
            />
          )}

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={isProcessing || (!file && !manualText.trim())}
            className="w-full text-xs"
            size="sm"
          >
            <Sparkles className="w-3 h-3 mr-1" />
            {isProcessing ? "Processando..." : "Processar e Salvar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
