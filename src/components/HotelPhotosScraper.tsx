import { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Camera, Loader2, ExternalLink, Check, ChevronLeft, ChevronRight, ZoomIn, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface HotelPhoto {
  url: string;
  alt: string;
  category: string;
  confidence: number;
  room_name?: string;
  room_details?: {
    size_sqm?: number;
    max_guests?: number;
    bed_type?: string;
    amenities?: string[];
    view?: string;
  };
}

interface Props {
  hotelName: string;
  hotelCity: string;
  hotelCountry: string;
  onSelectPhotos?: (photos: HotelPhoto[]) => void;
}

const categoryOrder = [
  "fachada", "lobby", "piscina", "praia", "restaurante", "bar", "spa",
  "quarto_standard", "quarto_superior", "quarto_deluxe", "quarto_family", "quarto_premium",
  "area_comum", "vista", "outro"
];

const categoryIcons: Record<string, string> = {
  fachada: "🏨", lobby: "🛎️", piscina: "🏊", praia: "🏖️",
  restaurante: "🍽️", bar: "🍹", spa: "💆",
  quarto_standard: "🛏️", quarto_superior: "👑", quarto_deluxe: "💎",
  quarto_family: "👨‍👩‍👧", quarto_premium: "🌟",
  area_comum: "🌿", vista: "🌅", outro: "📷",
};

const categoryLabels: Record<string, string> = {
  fachada: "Fachada & Exterior",
  lobby: "Recepção & Lobby",
  piscina: "Piscinas",
  praia: "Praia",
  restaurante: "Restaurantes",
  bar: "Bares & Lounges",
  spa: "Spa & Bem-estar",
  quarto_standard: "Quartos Standard",
  quarto_superior: "Suítes Superiores",
  quarto_deluxe: "Quartos Deluxe",
  quarto_family: "Quartos Familiares",
  quarto_premium: "Suítes Premium",
  area_comum: "Áreas Comuns & Lazer",
  vista: "Vistas Panorâmicas",
  outro: "Outros Espaços",
};

export default function HotelPhotosScraper({ hotelName, hotelCity, hotelCountry, onSelectPhotos }: Props) {
  const [loading, setLoading] = useState(false);
  const [photos, setPhotos] = useState<HotelPhoto[]>([]);
  const [sourceUrl, setSourceUrl] = useState("");
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [scraped, setScraped] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const scrapePhotos = async () => {
    if (!hotelName) { toast.error("Selecione um hotel primeiro"); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("scrape-hotel-photos", {
        body: { hotel_name: hotelName, hotel_city: hotelCity, hotel_country: hotelCountry },
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      setPhotos(data.photos || []);
      setSourceUrl(data.source_url || "");
      setScraped(true);
      if (data.photos?.length > 0) {
        toast.success(`${data.photos.length} fotos encontradas e classificadas por IA`);
      } else {
        toast.info("Nenhuma foto relevante encontrada no site do hotel");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao buscar fotos do hotel");
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = useCallback((url: string) => {
    setSelectedPhotos(prev => {
      const next = new Set(prev);
      next.has(url) ? next.delete(url) : next.add(url);
      return next;
    });
  }, []);

  const handleConfirmSelection = () => {
    const selected = photos.filter(p => selectedPhotos.has(p.url));
    onSelectPhotos?.(selected);
    toast.success(`${selected.length} fotos adicionadas à proposta`);
  };

  // Group by category, sorted
  const grouped = photos.reduce((acc, photo) => {
    const key = photo.category || "outro";
    if (!acc[key]) acc[key] = [];
    acc[key].push(photo);
    return acc;
  }, {} as Record<string, HotelPhoto[]>);

  const sortedCategories = categoryOrder.filter(c => grouped[c]);
  // Add any categories not in the predefined order
  Object.keys(grouped).forEach(c => { if (!sortedCategories.includes(c)) sortedCategories.push(c); });

  // Flat list for lightbox navigation
  const allPhotos = sortedCategories.flatMap(c => grouped[c]);

  // Lightbox
  const lightboxPhoto = lightboxIndex !== null ? allPhotos[lightboxIndex] : null;

  const goNext = useCallback(() => {
    if (lightboxIndex === null) return;
    setLightboxIndex((lightboxIndex + 1) % allPhotos.length);
  }, [lightboxIndex, allPhotos.length]);

  const goPrev = useCallback(() => {
    if (lightboxIndex === null) return;
    setLightboxIndex((lightboxIndex - 1 + allPhotos.length) % allPhotos.length);
  }, [lightboxIndex, allPhotos.length]);

  useEffect(() => {
    if (lightboxIndex === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "Escape") setLightboxIndex(null);
      else if (e.key === " ") { e.preventDefault(); if (lightboxPhoto) toggleSelect(lightboxPhoto.url); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxIndex, goNext, goPrev, lightboxPhoto, toggleSelect]);

  const openLightbox = (photo: HotelPhoto) => {
    const idx = allPhotos.findIndex(p => p.url === photo.url);
    setLightboxIndex(idx >= 0 ? idx : 0);
  };

  // --- Initial button ---
  if (!scraped && photos.length === 0) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={scrapePhotos} disabled={loading || !hotelName} className="gap-2 text-xs">
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
        {loading ? "Buscando fotos oficiais..." : "Buscar fotos do site oficial"}
      </Button>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Galeria Oficial — {hotelName}</span>
          <Badge variant="secondary" className="text-[10px]">{photos.length} fotos</Badge>
        </div>
        <div className="flex items-center gap-1.5">
          {sourceUrl && (
            <a href={sourceUrl} target="_blank" rel="noreferrer" className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-1">
              <ExternalLink className="w-3 h-3" /> Site
            </a>
          )}
          <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedPhotos(new Set(photos.map(p => p.url)))} className="text-[10px] h-6 px-2">
            Selecionar todas
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={scrapePhotos} disabled={loading} className="text-[10px] h-6 px-2">
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "↻ Rebuscar"}
          </Button>
        </div>
      </div>

      {/* Selection bar (sticky) */}
      {selectedPhotos.size > 0 && (
        <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
          <span className="text-xs font-medium text-primary">{selectedPhotos.size} foto(s) selecionada(s)</span>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedPhotos(new Set())} className="text-xs h-7">Limpar</Button>
            <Button type="button" size="sm" onClick={handleConfirmSelection} className="text-xs h-7">Usar na proposta</Button>
          </div>
        </div>
      )}

      {/* Sections organized by category */}
      <div className="space-y-5">
        {sortedCategories.map(cat => {
          const catPhotos = grouped[cat];
          if (!catPhotos || catPhotos.length === 0) return null;

          // Group room photos by room_name within category
          const roomGroups = cat.startsWith("quarto_")
            ? catPhotos.reduce((acc, p) => {
                const name = p.room_name || categoryLabels[cat] || cat;
                if (!acc[name]) acc[name] = [];
                acc[name].push(p);
                return acc;
              }, {} as Record<string, HotelPhoto[]>)
            : null;

          return (
            <div key={cat} className="space-y-2">
              {/* Section header */}
              <div className="flex items-center gap-2 border-b border-border pb-1.5">
                <span className="text-base">{categoryIcons[cat] || "📷"}</span>
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  {categoryLabels[cat] || cat}
                </h3>
                <Badge variant="outline" className="text-[9px] ml-auto">{catPhotos.length}</Badge>
              </div>

              {/* If room category, show sub-groups by room name */}
              {roomGroups ? (
                <div className="space-y-3 pl-1">
                  {Object.entries(roomGroups).map(([roomName, roomPhotos]) => (
                    <div key={roomName} className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-foreground/80">{roomName}</span>
                        {roomPhotos[0]?.room_details?.size_sqm && (
                          <span className="text-[10px] text-muted-foreground">📐 {roomPhotos[0].room_details.size_sqm}m²</span>
                        )}
                        {roomPhotos[0]?.room_details?.bed_type && (
                          <span className="text-[10px] text-muted-foreground">🛏️ {roomPhotos[0].room_details.bed_type}</span>
                        )}
                        {roomPhotos[0]?.room_details?.max_guests && (
                          <span className="text-[10px] text-muted-foreground">👥 {roomPhotos[0].room_details.max_guests}</span>
                        )}
                      </div>
                      <PhotoGrid photos={roomPhotos} selectedPhotos={selectedPhotos} toggleSelect={toggleSelect} openLightbox={openLightbox} />
                    </div>
                  ))}
                </div>
              ) : (
                <PhotoGrid photos={catPhotos} selectedPhotos={selectedPhotos} toggleSelect={toggleSelect} openLightbox={openLightbox} />
              )}
            </div>
          );
        })}
      </div>

      {/* Lightbox */}
      <Dialog open={lightboxIndex !== null} onOpenChange={() => { setLightboxIndex(null); setShowInfo(false); }}>
        <DialogContent className="fixed inset-0 max-w-none w-screen h-screen translate-x-0 translate-y-0 top-0 left-0 p-0 gap-0 bg-black border-none rounded-none overflow-hidden [&>button]:hidden data-[state=open]:slide-in-from-bottom-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Galeria de fotos</DialogTitle>
          </DialogHeader>

          {lightboxPhoto && (
            <div className="flex flex-col w-full h-full">
              {/* Top bar */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-black/80 backdrop-blur-sm z-10 shrink-0 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <span className="text-white/60 text-xs font-mono">
                    {(lightboxIndex ?? 0) + 1} / {allPhotos.length}
                  </span>
                  <span className="text-white/90 text-sm font-medium">
                    {lightboxPhoto.room_name || categoryLabels[lightboxPhoto.category] || lightboxPhoto.category}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {lightboxPhoto.room_details && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => setShowInfo(!showInfo)}
                      className="text-white/70 hover:text-white hover:bg-white/10 h-7 px-2 text-xs gap-1">
                      <Info className="w-3.5 h-3.5" /> Detalhes
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant={selectedPhotos.has(lightboxPhoto.url) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleSelect(lightboxPhoto.url)}
                    className="h-7 px-3 text-xs gap-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    {selectedPhotos.has(lightboxPhoto.url) ? "Selecionada" : "Selecionar"}
                  </Button>
                  <Button type="button" variant="ghost" size="icon"
                    onClick={() => { setLightboxIndex(null); setShowInfo(false); }}
                    className="text-white/70 hover:text-white hover:bg-white/10 h-8 w-8">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Image area */}
              <div className="flex-1 relative flex items-center justify-center min-h-0 overflow-hidden">
                <button onClick={goPrev}
                  className="absolute left-4 z-10 w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors">
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <img
                  src={lightboxPhoto.url}
                  alt={lightboxPhoto.room_name || lightboxPhoto.alt || ""}
                  className="max-w-[85%] max-h-[calc(100%-1rem)] object-contain select-none"
                  draggable={false}
                />

                <button onClick={goNext}
                  className="absolute right-4 z-10 w-10 h-10 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors">
                  <ChevronRight className="w-5 h-5" />
                </button>

                {/* Room details overlay */}
                {showInfo && lightboxPhoto.room_details && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-sm text-white rounded-xl p-4 max-w-md w-[90%] space-y-2 z-20">
                    <h4 className="font-semibold text-sm">{lightboxPhoto.room_name}</h4>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-white/80">
                      {lightboxPhoto.room_details.size_sqm && <div>📐 {lightboxPhoto.room_details.size_sqm} m²</div>}
                      {lightboxPhoto.room_details.max_guests && <div>👥 Até {lightboxPhoto.room_details.max_guests} hóspedes</div>}
                      {lightboxPhoto.room_details.bed_type && <div>🛏️ {lightboxPhoto.room_details.bed_type}</div>}
                      {lightboxPhoto.room_details.view && <div>🌅 Vista: {lightboxPhoto.room_details.view}</div>}
                    </div>
                    {lightboxPhoto.room_details.amenities && lightboxPhoto.room_details.amenities.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {lightboxPhoto.room_details.amenities.map((a, i) => (
                          <span key={i} className="px-1.5 py-0.5 bg-white/10 rounded text-[10px]">{a}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Thumbnail strip */}
              <div className="px-4 py-2 bg-black/80 backdrop-blur-sm shrink-0 border-t border-white/10">
                <ScrollArea className="w-full">
                  <div className="flex gap-1.5 justify-center">
                    {allPhotos.map((p, i) => (
                      <button
                        key={p.url + i}
                        onClick={() => setLightboxIndex(i)}
                        className={cn(
                          "shrink-0 w-14 h-10 rounded overflow-hidden border-2 transition-all",
                          i === lightboxIndex ? "border-primary opacity-100 scale-105" : "border-transparent opacity-40 hover:opacity-70"
                        )}
                      >
                        <img src={p.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                      </button>
                    ))}
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── Photo Grid Sub-component ─── */

function PhotoGrid({
  photos,
  selectedPhotos,
  toggleSelect,
  openLightbox,
}: {
  photos: HotelPhoto[];
  selectedPhotos: Set<string>;
  toggleSelect: (url: string) => void;
  openLightbox: (photo: HotelPhoto) => void;
}) {
  return (
    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-1.5">
      {photos.map((photo, i) => {
        const isSelected = selectedPhotos.has(photo.url);
        return (
          <div
            key={photo.url + i}
            className={cn(
              "relative group aspect-[3/2] rounded-md overflow-hidden border-2 transition-all cursor-pointer",
              isSelected
                ? "border-primary ring-1 ring-primary/30"
                : "border-transparent hover:border-muted-foreground/20"
            )}
            onClick={() => openLightbox(photo)}
          >
            <img
              src={photo.url}
              alt={photo.room_name || photo.alt || photo.category}
              className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
              loading="lazy"
              onError={(e) => {
                const el = (e.target as HTMLImageElement).closest("div");
                if (el) el.style.display = "none";
              }}
            />

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />

            {/* Selection checkbox */}
            <button
              onClick={(e) => { e.stopPropagation(); toggleSelect(photo.url); }}
              className={cn(
                "absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center transition-all border",
                isSelected
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-black/30 text-white border-white/30 opacity-0 group-hover:opacity-100"
              )}
            >
              <Check className="w-3 h-3" />
            </button>

            {/* Expand icon */}
            <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <ZoomIn className="w-3.5 h-3.5 text-white drop-shadow-lg" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
