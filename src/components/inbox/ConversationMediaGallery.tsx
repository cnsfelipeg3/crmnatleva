// ─── Galeria de mídias da conversa · estilo WhatsApp Web ───
// Tabs: Mídia (imagens + vídeos), Documentos, Áudios.
// Virtualizada (react-virtual) · suporta milhares de itens sem perda de performance.
import { useEffect, useMemo, useState, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Image as ImageIcon, FileText, Mic, Play, Download,
  ChevronLeft, ChevronRight, X,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { Message } from "./types";
import { PdfThumbnail } from "./PdfThumbnail";


function LazyPdfThumb({ url, filename, width = 40 }: { url: string; filename?: string; width?: number }) {
  return (
    <div className="h-full w-full flex items-center justify-center">
      <PdfThumbnail url={url} filename={filename} width={width} compact />
    </div>
  );
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messages: Message[];
  contactName?: string;
}

type TabKey = "media" | "docs" | "audio";

const monthLabel = (iso: string) => {
  try { return format(new Date(iso), "MMMM yyyy", { locale: ptBR }); }
  catch { return ""; }
};

const fmtSize = (b?: number) => {
  if (!b) return "";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
};

const mediaUrl = (m: Message) => m.media_storage_url || m.media_url || "";

// Tipos de linha para a lista virtualizada
type Row =
  | { kind: "header"; label: string }
  | { kind: "media-row"; items: Message[]; baseIdx: number }
  | { kind: "doc"; item: Message }
  | { kind: "audio"; item: Message };

const HEADER_H = 28;
const DOC_H = 64;
const AUDIO_H = 78;

export function ConversationMediaGallery({ open, onOpenChange, messages, contactName }: Props) {
  const [tab, setTab] = useState<TabKey>("media");
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  // Filtra por categoria · mais recente primeiro
  const { mediaItems, docItems, audioItems } = useMemo(() => {
    const media: Message[] = [];
    const docs: Message[] = [];
    const audio: Message[] = [];
    for (const m of messages) {
      if (!mediaUrl(m)) continue;
      if (m.message_type === "image" || m.message_type === "video") media.push(m);
      else if (m.message_type === "document") docs.push(m);
      else if (m.message_type === "audio") audio.push(m);
    }
    const byDateDesc = (a: Message, b: Message) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    return {
      mediaItems: media.sort(byDateDesc),
      docItems: docs.sort(byDateDesc),
      audioItems: audio.sort(byDateDesc),
    };
  }, [messages]);

  // Constrói linhas virtualizadas por tab
  const mediaRows = useMemo<Row[]>(() => {
    const rows: Row[] = [];
    let currentMonth = "";
    let buffer: Message[] = [];
    let baseIdx = 0;
    const flush = () => {
      while (buffer.length) {
        const chunk = buffer.splice(0, 3);
        rows.push({ kind: "media-row", items: chunk, baseIdx });
        baseIdx += chunk.length;
      }
    };
    mediaItems.forEach((m) => {
      const month = monthLabel(m.created_at);
      if (month !== currentMonth) {
        flush();
        currentMonth = month;
        rows.push({ kind: "header", label: month });
      }
      buffer.push(m);
    });
    flush();
    return rows;
  }, [mediaItems]);

  const docRows = useMemo<Row[]>(() => {
    const rows: Row[] = [];
    let currentMonth = "";
    docItems.forEach((m) => {
      const month = monthLabel(m.created_at);
      if (month !== currentMonth) {
        currentMonth = month;
        rows.push({ kind: "header", label: month });
      }
      rows.push({ kind: "doc", item: m });
    });
    return rows;
  }, [docItems]);

  const audioRows = useMemo<Row[]>(() => {
    const rows: Row[] = [];
    let currentMonth = "";
    audioItems.forEach((m) => {
      const month = monthLabel(m.created_at);
      if (month !== currentMonth) {
        currentMonth = month;
        rows.push({ kind: "header", label: month });
      }
      rows.push({ kind: "audio", item: m });
    });
    return rows;
  }, [audioItems]);

  // Reset ao fechar
  useEffect(() => {
    if (!open) {
      setLightboxIdx(null);
      setTab("media");
    }
  }, [open]);

  // Teclado no lightbox
  useEffect(() => {
    if (lightboxIdx === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxIdx(null);
      if (e.key === "ArrowLeft") setLightboxIdx(i => (i! > 0 ? i! - 1 : i));
      if (e.key === "ArrowRight") setLightboxIdx(i => (i! < mediaItems.length - 1 ? i! + 1 : i));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIdx, mediaItems.length]);

  const currentLightbox = lightboxIdx !== null ? mediaItems[lightboxIdx] : null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col gap-0">
          <SheetHeader className="px-4 py-3 border-b shrink-0">
            <SheetTitle className="text-base flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              Mídia, links e docs
            </SheetTitle>
            {contactName && (
              <p className="text-xs text-muted-foreground truncate">{contactName}</p>
            )}
          </SheetHeader>

          <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)} className="flex-1 min-h-0 flex flex-col">
            <TabsList className="mx-4 mt-3 grid grid-cols-3 shrink-0">
              <TabsTrigger value="media" className="text-xs gap-1.5">
                <ImageIcon className="h-3.5 w-3.5" /> Mídia
                <span className="text-[10px] opacity-60">{mediaItems.length}</span>
              </TabsTrigger>
              <TabsTrigger value="docs" className="text-xs gap-1.5">
                <FileText className="h-3.5 w-3.5" /> Docs
                <span className="text-[10px] opacity-60">{docItems.length}</span>
              </TabsTrigger>
              <TabsTrigger value="audio" className="text-xs gap-1.5">
                <Mic className="h-3.5 w-3.5" /> Áudio
                <span className="text-[10px] opacity-60">{audioItems.length}</span>
              </TabsTrigger>
            </TabsList>

            {/* MÍDIA · grid 3 colunas virtualizado */}
            <TabsContent value="media" className="flex-1 min-h-0 mt-3 mx-0 px-0 overflow-hidden">
              {mediaItems.length === 0 ? (
                <EmptyState icon={<ImageIcon className="h-8 w-8" />} text="Nenhuma foto ou vídeo nessa conversa" />
              ) : (
                <VirtualList
                  rows={mediaRows}
                  estimateSize={(row) => row.kind === "header" ? HEADER_H : 120}
                  renderRow={(row) => {
                    if (row.kind === "header") return <MonthHeader label={row.label} />;
                    if (row.kind === "media-row") {
                      return (
                        <div className="grid grid-cols-3 gap-0.5 px-0.5">
                          {row.items.map((m, i) => {
                            const idx = row.baseIdx + i;
                            return (
                              <button
                                key={m.id}
                                onClick={() => setLightboxIdx(idx)}
                                className="relative aspect-square bg-muted overflow-hidden group"
                              >
                                {m.message_type === "image" ? (
                                  <img
                                    src={mediaUrl(m)}
                                    alt=""
                                    loading="lazy"
                                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                  />
                                ) : (
                                  <div className="w-full h-full relative">
                                    <video
                                      src={mediaUrl(m)}
                                      className="w-full h-full object-cover"
                                      preload="metadata"
                                      muted
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                      <Play className="h-6 w-6 text-white drop-shadow fill-white" />
                                    </div>
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              )}
            </TabsContent>

            {/* DOCUMENTOS · lista virtualizada */}
            <TabsContent value="docs" className="flex-1 min-h-0 mt-3 mx-0 px-0 overflow-hidden">
              {docItems.length === 0 ? (
                <EmptyState icon={<FileText className="h-8 w-8" />} text="Nenhum documento nessa conversa" />
              ) : (
                <VirtualList
                  rows={docRows}
                  estimateSize={(row) => row.kind === "header" ? HEADER_H : DOC_H}
                  renderRow={(row) => {
                    if (row.kind === "header") return <MonthHeader label={row.label} />;
                    if (row.kind === "doc") {
                      const m = row.item;
                      return (
                        <div className="px-2">
                          <a
                            href={mediaUrl(m)}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-muted/60 transition-colors cursor-pointer"
                            title="Abrir documento"
                          >
                            <div className="shrink-0 h-12 w-10 rounded border bg-card overflow-hidden flex items-center justify-center">
                              {m.media_mimetype?.includes("pdf") || m.media_filename?.toLowerCase().endsWith(".pdf") ? (
                                <LazyPdfThumb url={mediaUrl(m)} filename={m.media_filename || "PDF"} width={40} />
                              ) : (
                                <FileText className="h-5 w-5 text-muted-foreground" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">
                                {m.media_filename || "Documento"}
                              </div>
                              <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                                <span>{format(new Date(m.created_at), "dd MMM · HH:mm", { locale: ptBR })}</span>
                                {m.media_size_bytes ? <span>· {fmtSize(m.media_size_bytes)}</span> : null}
                              </div>
                            </div>
                            <Download className="h-4 w-4 text-muted-foreground shrink-0" />
                          </a>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              )}
            </TabsContent>

            {/* ÁUDIO · lista virtualizada */}
            <TabsContent value="audio" className="flex-1 min-h-0 mt-3 mx-0 px-0 overflow-hidden">
              {audioItems.length === 0 ? (
                <EmptyState icon={<Mic className="h-8 w-8" />} text="Nenhum áudio nessa conversa" />
              ) : (
                <VirtualList
                  rows={audioRows}
                  estimateSize={(row) => row.kind === "header" ? HEADER_H : AUDIO_H}
                  renderRow={(row) => {
                    if (row.kind === "header") return <MonthHeader label={row.label} />;
                    if (row.kind === "audio") {
                      const m = row.item;
                      return (
                        <div className="px-3">
                          <div className="p-2.5 rounded-lg border bg-card/40">
                            <div className="text-[11px] text-muted-foreground mb-1.5 flex items-center gap-1.5">
                              <Mic className="h-3 w-3" />
                              {format(new Date(m.created_at), "dd MMM · HH:mm", { locale: ptBR })}
                              <span className="ml-auto text-[10px]">
                                {m.sender_type === "atendente" ? "Você" : "Cliente"}
                              </span>
                            </div>
                            <audio src={mediaUrl(m)} controls preload="none" className="w-full h-8" />
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              )}
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      {/* Lightbox · imagens e vídeos */}
      {currentLightbox && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
          onClick={() => setLightboxIdx(null)}
        >
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 p-3 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent z-10">
            <div className="text-white text-xs">
              <div className="font-medium">
                {format(new Date(currentLightbox.created_at), "dd MMM yyyy · HH:mm", { locale: ptBR })}
              </div>
              <div className="opacity-60">{lightboxIdx! + 1} de {mediaItems.length}</div>
            </div>
            <div className="flex items-center gap-1">
              <Button asChild variant="ghost" size="icon" className="text-white hover:bg-white/10 h-8 w-8">
                <a href={mediaUrl(currentLightbox)} download target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                  <Download className="h-4 w-4" />
                </a>
              </Button>
              <Button
                variant="ghost" size="icon" className="text-white hover:bg-white/10 h-8 w-8"
                onClick={(e) => { e.stopPropagation(); setLightboxIdx(null); }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Setas */}
          {lightboxIdx! > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightboxIdx(lightboxIdx! - 1); }}
              className="absolute left-2 sm:left-6 z-10 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              aria-label="Anterior"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}
          {lightboxIdx! < mediaItems.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightboxIdx(lightboxIdx! + 1); }}
              className="absolute right-2 sm:right-6 z-10 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              aria-label="Próximo"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}

          {/* Conteúdo */}
          <div
            className="max-w-[95vw] max-h-[90vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {currentLightbox.message_type === "image" ? (
              <img
                src={mediaUrl(currentLightbox)}
                alt=""
                className="max-w-full max-h-[90vh] object-contain"
              />
            ) : (
              <video
                src={mediaUrl(currentLightbox)}
                controls
                autoPlay
                className="max-w-full max-h-[90vh]"
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}

function MonthHeader({ label }: { label: string }) {
  return (
    <div className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/50">
      {label}
    </div>
  );
}

// Lista virtualizada genérica · usa @tanstack/react-virtual
function VirtualList({
  rows,
  estimateSize,
  renderRow,
}: {
  rows: Row[];
  estimateSize: (row: Row) => number;
  renderRow: (row: Row) => React.ReactNode;
}) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (i) => estimateSize(rows[i]),
    overscan: 6,
  });

  return (
    <div ref={parentRef} className="h-full overflow-y-auto overscroll-contain">
      <div style={{ height: virtualizer.getTotalSize(), position: "relative", width: "100%" }}>
        {virtualizer.getVirtualItems().map((vi) => {
          const row = rows[vi.index];
          return (
            <div
              key={vi.key}
              ref={virtualizer.measureElement}
              data-index={vi.index}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${vi.start}px)`,
              }}
            >
              {renderRow(row)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
      <div className="mb-3 opacity-50">{icon}</div>
      <p className="text-xs">{text}</p>
    </div>
  );
}
