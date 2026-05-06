// Preview full-screen de um status antes de publicar (não persiste nada)
import { useEffect } from "react";
import { X, Eye } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  kind: "text" | "image" | "video";
  text?: string;
  backgroundColor?: string;
  font?: string;
  mediaUrl?: string | null;
  caption?: string;
}

export function StatusPreview({ open, onClose, kind, text, backgroundColor, font, mediaUrl, caption }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center" role="dialog" aria-modal="true">
      {/* Barra de progresso fake (estática 100% no início, só ilustrativa) */}
      <div className="absolute top-0 left-0 right-0 flex gap-1 p-2 z-20" style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}>
        <div className="flex-1 h-1 bg-white/30 rounded overflow-hidden">
          <div className="h-full bg-white w-1/3" />
        </div>
      </div>

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 pt-6 text-white">
        <div className="flex items-center gap-2 min-w-0">
          <Eye className="h-4 w-4 opacity-80" />
          <span className="text-sm font-semibold truncate">Pré-visualização · Você</span>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-black/40 hover:bg-black/60 transition"
          aria-label="Fechar pré-visualização"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Container 9:16 estilo celular */}
      <div className="relative h-[90vh] aspect-[9/16] max-w-[95vw] rounded-2xl overflow-hidden shadow-2xl bg-black">
        {kind === "text" && (
          <div
            className="w-full h-full flex items-center justify-center px-8"
            style={{ backgroundColor: backgroundColor || "#075E54", fontFamily: font || "sans-serif" }}
          >
            <p className="text-white text-2xl sm:text-3xl text-center font-semibold leading-snug whitespace-pre-wrap break-words">
              {text || "Digite seu status..."}
            </p>
          </div>
        )}
        {kind === "image" && mediaUrl && (
          <img src={mediaUrl} alt="preview" className="w-full h-full object-contain bg-black" />
        )}
        {kind === "video" && mediaUrl && (
          <video src={mediaUrl} autoPlay loop playsInline muted className="w-full h-full object-contain bg-black" />
        )}

        {/* Caption sobreposta como no viewer real */}
        {caption && (kind === "image" || kind === "video") && (
          <div className="absolute bottom-6 left-0 right-0 px-4 pointer-events-none">
            <p className="text-white text-sm bg-black/50 rounded-lg px-3 py-2 inline-block max-w-full break-words">
              {caption}
            </p>
          </div>
        )}
      </div>

      <p className="absolute bottom-3 left-0 right-0 text-center text-xs text-white/60">
        Esta é apenas uma pré-visualização · nada foi publicado
      </p>
    </div>
  );
}

export default StatusPreview;
