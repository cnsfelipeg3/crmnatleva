import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import {
  X, Plus, Send, FileText, FileImage, Film, FileArchive, File as FileIcon, Trash2,
} from "lucide-react";

export type AttachmentItem = { file: File; previewUrl: string };

export function buildAttachmentItems(files: File[]): AttachmentItem[] {
  return files.map((file) => ({
    file,
    previewUrl: file.type.startsWith("image/") || file.type.startsWith("video/")
      ? URL.createObjectURL(file)
      : "",
  }));
}

function fileKind(file: File): "image" | "video" | "pdf" | "doc" {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) return "pdf";
  return "doc";
}

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIconFor({ file }: { file: File }) {
  const k = fileKind(file);
  if (k === "image") return <FileImage className="h-8 w-8 text-primary" />;
  if (k === "video") return <Film className="h-8 w-8 text-primary" />;
  if (k === "pdf") return <FileText className="h-8 w-8 text-rose-500" />;
  if (file.name.match(/\.(zip|rar|7z)$/i)) return <FileArchive className="h-8 w-8 text-amber-500" />;
  return <FileIcon className="h-8 w-8 text-muted-foreground" />;
}

const MAX_BYTES = 16 * 1024 * 1024;

interface Props {
  open: boolean;
  files: File[];
  onClose: () => void;
  onAddMore: (files: File[]) => void;
  onSend: (items: { file: File; caption: string }[]) => Promise<void> | void;
  isSending?: boolean;
}

export function AttachmentPreviewDialog({ open, files, onClose, onAddMore, onSend, isSending }: Props) {
  const [items, setItems] = useState<AttachmentItem[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [captions, setCaptions] = useState<Record<number, string>>({});
  const [sharedCaption, setSharedCaption] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      const next = buildAttachmentItems(files);
      setItems(next);
      setActiveIdx(0);
      setCaptions({});
      setSharedCaption("");
    } else {
      // revoke object urls
      items.forEach((i) => i.previewUrl && URL.revokeObjectURL(i.previewUrl));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, files]);

  const active = items[activeIdx];

  const oversize = useMemo(() => items.find((i) => i.file.size > MAX_BYTES), [items]);

  const handleAddMore = () => fileInputRef.current?.click();

  const handleAddFiles = (newFiles: File[]) => {
    if (!newFiles.length) return;
    onAddMore(newFiles);
    const merged = buildAttachmentItems([...items.map((i) => i.file), ...newFiles]);
    setItems(merged);
  };

  const handleRemove = (idx: number) => {
    const it = items[idx];
    if (it?.previewUrl) URL.revokeObjectURL(it.previewUrl);
    const next = items.filter((_, i) => i !== idx);
    setItems(next);
    setActiveIdx((cur) => Math.max(0, Math.min(cur, next.length - 1)));
    if (next.length === 0) onClose();
  };

  const handleSendAll = async () => {
    if (!items.length || isSending || oversize) return;
    const payload = items.map((it, i) => ({
      file: it.file,
      caption: (captions[i] ?? sharedCaption ?? "").trim(),
    }));
    await onSend(payload);
  };

  // shortcuts
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); handleSendAll(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, items, captions, sharedCaption]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden border-0 gap-0">
        <div className="h-1 bg-gradient-to-r from-amber-300 via-amber-500 to-amber-300" />
        <div className="grid grid-cols-[1fr_220px] min-h-[520px] bg-card">
          {/* preview */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between px-5 py-3 border-b border-border/60">
              <div className="text-sm font-semibold text-foreground">
                Enviar anexo {items.length > 1 ? `· ${activeIdx + 1}/${items.length}` : ""}
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 flex items-center justify-center p-6 bg-muted/30">
              {active ? (
                <PreviewBody item={active} />
              ) : (
                <div className="text-sm text-muted-foreground">Nenhum arquivo</div>
              )}
            </div>

            {oversize && (
              <div className="px-5 py-2 text-xs text-destructive bg-destructive/10 border-t border-destructive/20">
                {oversize.file.name} excede 16 MB · remova ou comprima antes de enviar.
              </div>
            )}

            <div className="border-t border-border/60 p-4 space-y-3">
              <Textarea
                value={items.length > 1 ? (captions[activeIdx] ?? "") : sharedCaption}
                onChange={(e) => {
                  if (items.length > 1) {
                    setCaptions((p) => ({ ...p, [activeIdx]: e.target.value }));
                  } else {
                    setSharedCaption(e.target.value);
                  }
                }}
                placeholder="Adicionar legenda (opcional)..."
                className="min-h-[60px] max-h-[120px] resize-none border-border/60 focus-visible:ring-1"
              />
              <div className="flex items-center justify-between gap-2">
                <Button variant="outline" size="sm" onClick={handleAddMore} className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> Adicionar
                </Button>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground hidden sm:inline">⌘+Enter</span>
                  <Button
                    onClick={handleSendAll}
                    disabled={!items.length || isSending || !!oversize}
                    className="gap-1.5"
                  >
                    <Send className="h-3.5 w-3.5" />
                    {isSending ? "Enviando..." : `Enviar${items.length > 1 ? ` (${items.length})` : ""}`}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* sidebar */}
          <div className="border-l border-border/60 bg-muted/20 flex flex-col">
            <div className="px-3 py-3 text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border/60">
              Fila ({items.length})
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {items.map((it, i) => (
                <button
                  key={i}
                  onClick={() => setActiveIdx(i)}
                  className={`w-full text-left rounded-lg border transition-all p-2 flex items-center gap-2 group ${
                    i === activeIdx
                      ? "border-primary bg-primary/5"
                      : "border-border/60 hover:border-border bg-card"
                  }`}
                >
                  <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                    {fileKind(it.file) === "image" && it.previewUrl ? (
                      <img src={it.previewUrl} className="h-full w-full object-cover" alt="" />
                    ) : (
                      <FileIconFor file={it.file} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-foreground truncate">{it.file.name}</div>
                    <div className="text-[10px] text-muted-foreground">{formatBytes(it.file.size)}</div>
                  </div>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => { e.stopPropagation(); handleRemove(i); }}
                    className="h-6 w-6 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-destructive transition cursor-pointer"
                  >
                    <Trash2 className="h-3 w-3" />
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            const fl = Array.from(e.target.files || []);
            handleAddFiles(fl);
            e.target.value = "";
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function PreviewBody({ item }: { item: AttachmentItem }) {
  const k = fileKind(item.file);
  if (k === "image") {
    return (
      <motion.img
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        src={item.previewUrl}
        alt={item.file.name}
        className="max-h-[360px] max-w-full rounded-lg shadow-lg object-contain"
      />
    );
  }
  if (k === "video") {
    return (
      <video src={item.previewUrl} controls className="max-h-[360px] max-w-full rounded-lg shadow-lg" />
    );
  }
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-8 rounded-xl bg-card border border-border/60 shadow-sm">
      <div className="h-20 w-20 rounded-2xl bg-muted flex items-center justify-center">
        <FileIconFor file={item.file} />
      </div>
      <div className="text-sm font-semibold text-foreground text-center max-w-[280px] truncate">
        {item.file.name}
      </div>
      <div className="text-xs text-muted-foreground">{formatBytes(item.file.size)}</div>
    </div>
  );
}
