import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, X, Sparkles, FileText, Image, Mic, Video, File, AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
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

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + " KB";
  return (bytes / 1024 / 1024).toFixed(1) + " MB";
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
  const canSubmit = (!!file || manualText.trim().length > 0) && title.trim().length > 0;

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
      setError("");
      setPhase(null);
    }
  }, [title]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      if (!title) setTitle(f.name.replace(/\.[^.]+$/, ""));
      setError("");
      setPhase(null);
    }
  };

  const handleSubmit = async () => {
    const hasFile = !!file;
    const hasText = manualText.trim().length > 0;
    if (!hasFile && !hasText) return;
    if (!title.trim()) return;

    setError("");

    try {
      let storageKey = "";
      let fileType = "text";
      let mimeType = "text/plain";
      let extractedContent = "";

      if (hasFile) {
        setPhase("uploading");
        setProgress(20);
        mimeType = file!.type || "application/octet-stream";
        fileType = getFileTypeLabel(mimeType);
        const safeName = file!.name
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-zA-Z0-9._-]/g, "-")
          .replace(/-+/g, "-")
          .toLowerCase();
        storageKey = `kb-uploads/${Date.now()}-${safeName}`;

        const { error: upErr } = await supabase.storage
          .from("ai-knowledge-base")
          .upload(storageKey, file!);
        if (upErr) throw upErr;
        setProgress(40);

        setPhase("extracting");
        setProgress(50);
        const { data: extractData, error: extractErr } = await supabase.functions.invoke("smart-upload-process", {
          body: { storageKey, mimeType, title: title.trim() },
        });
        if (extractErr) throw extractErr;
        extractedContent = extractData?.content || "";
        setProgress(70);
      } else {
        extractedContent = manualText.trim();
        fileType = "text";
        setPhase("extracting");
        setProgress(70);
      }

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

      if (extractedContent && extractedContent.length > 50) {
        setPhase("orion");
        setProgress(80);
        try {
          const { data: orgData } = await supabase.functions.invoke("organize-knowledge", {
            body: { content: extractedContent, title: title.trim(), tipo: fileType },
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

      setTimeout(() => {
        reset();
        onOpenChange(false);
        onSaved();
      }, 1200);
    } catch (err: any) {
      console.error("SmartUpload error:", err);
      setPhase("error");
      setError(err.message || "Erro desconhecido ao processar arquivo");
    }
  };

  const FileIcon = file ? getFileIcon(file.type) : Upload;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[520px] max-w-[95vw] max-h-[80vh] overflow-y-auto p-0">
        <DialogHeader className="px-5 pt-5 pb-0">
          <DialogTitle className="text-sm flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Upload Inteligente
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Envie arquivos para extração automática de conteúdo via IA.
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 pb-5 space-y-4">
          {/* ── Drag & Drop Zone OR File Card ── */}
          {!file ? (
            <div
              className={cn(
                "border-2 border-dashed rounded-lg h-[160px] flex flex-col items-center justify-center gap-2 transition-colors cursor-pointer",
                dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
                isProcessing && "pointer-events-none opacity-50",
              )}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => !isProcessing && document.getElementById("smart-upload-input")?.click()}
            >
              <Upload className="w-8 h-8 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Arraste um arquivo ou clique para selecionar</p>
              <p className="text-[10px] text-muted-foreground/70">Vídeo, PDF, imagem, áudio, texto (até 500MB)</p>
              <input
                type="file" id="smart-upload-input" className="hidden"
                accept={ACCEPT_TYPES}
                onChange={handleFileSelect}
              />
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
              <FileIcon className="w-5 h-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{file.name}</p>
                <p className="text-[10px] text-muted-foreground">{formatSize(file.size)}</p>
              </div>
              {!isProcessing && (
                <button
                  onClick={() => { setFile(null); setPhase(null); setError(""); }}
                  className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {/* ── Title ── */}
          <div className="space-y-1.5">
            <Label className="text-xs">Título *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Roteiro Tailândia 10 dias"
              className="text-xs h-9"
              disabled={isProcessing}
            />
          </div>

          {/* ── Category ── */}
          <div className="space-y-1.5">
            <Label className="text-xs">Categoria</Label>
            <Select value={category} onValueChange={setCategory} disabled={isProcessing}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => (
                  <SelectItem key={c.value} value={c.value} className="text-xs">{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* ── Manual text ── */}
          {showManualText && !file && (
            <div className="space-y-1.5">
              <Label className="text-xs">Texto</Label>
              <Textarea
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                placeholder="Cole o conteúdo aqui: roteiros, scripts, informações de destinos..."
                rows={4}
                className="text-xs resize-none"
                disabled={isProcessing}
              />
            </div>
          )}

          {/* ── Progress Bar (replaces button when processing) ── */}
          {phase && phase !== "error" && (
            <UploadProgressBar
              phase={phase}
              progress={progress}
              fileName={file?.name}
              error={error}
            />
          )}

          {/* ── Error display ── */}
          {phase === "error" && error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-xs text-destructive">{error}</p>
              </div>
              <Button
                onClick={() => { setPhase(null); setError(""); setProgress(0); handleSubmit(); }}
                variant="outline"
                size="sm"
                className="w-full text-xs h-8 border-destructive/30 text-destructive hover:bg-destructive/10"
              >
                <RefreshCw className="w-3 h-3 mr-1.5" />
                Tentar novamente
              </Button>
            </div>
          )}

          {/* ── Submit button (hidden during processing/error) ── */}
          {(!phase || phase === "done") && (
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit || isProcessing}
              className="w-full text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white"
              size="sm"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              Processar e Salvar
            </Button>
          )}

          {/* ── Manual text toggle ── */}
          {!file && !isProcessing && phase !== "error" && (
            <button
              type="button"
              className="w-full text-center text-[11px] text-muted-foreground hover:text-primary transition-colors"
              onClick={() => setShowManualText(!showManualText)}
            >
              {showManualText ? "Ocultar texto manual" : "Ou cole um texto manualmente"}
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
