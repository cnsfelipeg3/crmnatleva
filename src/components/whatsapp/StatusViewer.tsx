// Visualizador full-screen estilo WhatsApp Stories
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useMarkStatusViewed, type WhatsAppStatus } from "@/hooks/useWhatsAppStatus";
import { formatPhoneDisplay } from "@/lib/phone";

interface Props {
  statuses: WhatsAppStatus[];
  initialIndex: number;
  onClose: () => void;
}

const TEXT_DEFAULT_BG = "#075E54";
const IMG_TEXT_MS = 5000;

export function StatusViewer({ statuses, initialIndex, onClose }: Props) {
  const [idx, setIdx] = useState(initialIndex);
  const markViewed = useMarkStatusViewed();
  const startedAt = useRef(Date.now());
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const current = statuses[idx];

  // Marca como visto ao abrir cada status
  useEffect(() => {
    if (!current || current.is_mine) return;
    markViewed.mutate(current.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  // Progresso para imagem/texto (5s)
  useEffect(() => {
    if (!current) return;
    if (current.status_type === "video") return;
    startedAt.current = Date.now();
    setProgress(0);
    const t = setInterval(() => {
      const elapsed = Date.now() - startedAt.current;
      const p = Math.min(100, (elapsed / IMG_TEXT_MS) * 100);
      setProgress(p);
      if (p >= 100) {
        clearInterval(t);
        next();
      }
    }, 50);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, current?.status_type]);

  // Atalhos teclado
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  function next() {
    if (idx >= statuses.length - 1) onClose();
    else setIdx(idx + 1);
  }
  function prev() {
    if (idx > 0) setIdx(idx - 1);
  }

  if (!current) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center" role="dialog" aria-modal="true">
      {/* Barras de progresso */}
      <div className="absolute top-0 left-0 right-0 flex gap-1 p-2 z-20" style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))" }}>
        {statuses.map((_, i) => (
          <div key={i} className="flex-1 h-1 bg-white/30 rounded overflow-hidden">
            <div
              className="h-full bg-white transition-all"
              style={{ width: i < idx ? "100%" : i === idx ? `${current.status_type === "video" ? 0 : progress}%` : "0%" }}
            />
          </div>
        ))}
      </div>

      {/* Header com nome e timestamp */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 pt-6 text-white">
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-semibold truncate">
            {current.is_mine ? "Você" : (current.contact_name || formatPhoneDisplay(current.phone))}
          </span>
          <span className="text-xs opacity-80">{new Date(current.posted_at).toLocaleString("pt-BR")}</span>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-black/40 hover:bg-black/60 transition"
          aria-label="Fechar"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Conteúdo */}
      <div className="absolute inset-0 flex items-center justify-center">
        {current.status_type === "text" && (
          <div
            className="w-full h-full flex items-center justify-center px-8"
            style={{ backgroundColor: current.background_color || TEXT_DEFAULT_BG, fontFamily: current.font || "sans-serif" }}
          >
            <p className="text-white text-2xl sm:text-3xl text-center font-semibold leading-snug whitespace-pre-wrap break-words">
              {current.text_content}
            </p>
          </div>
        )}
        {current.status_type === "image" && current.media_url && (
          <img src={current.media_url} alt="status" className="max-h-full max-w-full object-contain" />
        )}
        {current.status_type === "video" && current.media_url && (
          <video
            ref={videoRef}
            src={current.media_url}
            autoPlay
            playsInline
            controls
            onEnded={next}
            className="max-h-full max-w-full"
          />
        )}
      </div>

      {/* Caption */}
      {current.caption && (current.status_type === "image" || current.status_type === "video") && (
        <div className="absolute bottom-12 left-0 right-0 px-6 z-10 pointer-events-none">
          <p className="text-white text-sm bg-black/40 rounded-lg px-3 py-2 inline-block max-w-full">
            {current.caption}
          </p>
        </div>
      )}

      {/* Áreas de toque para navegar */}
      <button onClick={prev} className="absolute left-0 top-0 bottom-0 w-1/3 z-10" aria-label="Anterior" />
      <button onClick={next} className="absolute right-0 top-0 bottom-0 w-1/3 z-10" aria-label="Próximo" />
    </div>
  );
}

export default StatusViewer;
