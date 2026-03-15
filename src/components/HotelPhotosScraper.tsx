import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

const categoryLabels: Record<string, string> = {
  fachada: "🏨 Fachada",
  lobby: "🛎️ Lobby",
  quarto_standard: "🛏️ Standard",
  quarto_superior: "👑 Suíte / Superior",
  quarto_deluxe: "💎 Deluxe",
  quarto_family: "👨‍👩‍👧 Familiar",
  quarto_premium: "🌟 Premium",
  restaurante: "🍽️ Restaurante",
  piscina: "🏊 Piscina",
  spa: "💆 Spa",
  area_comum: "🌿 Áreas Comuns",
  vista: "🌅 Vista",
  bar: "🍹 Bar",
  praia: "🏖️ Praia",
  outro: "📷 Outros",
};

const categoryColors: Record<string, string> = {
  fachada: "bg-blue-500/10 text-blue-700 border-blue-300",
  lobby: "bg-amber-500/10 text-amber-700 border-amber-300",
  quarto_standard: "bg-indigo-500/10 text-indigo-700 border-indigo-300",
  quarto_superior: "bg-purple-500/10 text-purple-700 border-purple-300",
  quarto_deluxe: "bg-violet-500/10 text-violet-700 border-violet-300",
  quarto_family: "bg-teal-500/10 text-teal-700 border-teal-300",
  quarto_premium: "bg-yellow-500/10 text-yellow-700 border-yellow-300",
  restaurante: "bg-orange-500/10 text-orange-700 border-orange-300",
  piscina: "bg-cyan-500/10 text-cyan-700 border-cyan-300",
  spa: "bg-pink-500/10 text-pink-700 border-pink-300",
  area_comum: "bg-green-500/10 text-green-700 border-green-300",
  vista: "bg-rose-500/10 text-rose-700 border-rose-300",
  bar: "bg-amber-500/10 text-amber-700 border-amber-300",
  praia: "bg-sky-500/10 text-sky-700 border-sky-300",
  outro: "bg-muted text-muted-foreground border-border",
};

export default function HotelPhotosScraper({ hotelName, hotelCity, hotelCountry, onSelectPhotos }: Props) {
  const [loading, setLoading] = useState(false);
  const [photos, setPhotos] = useState<HotelPhoto[]>([]);
  const [sourceUrl, setSourceUrl] = useState("");
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [scraped, setScraped] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const scrapePhotos = async () => {
    if (!hotelName) {
      toast.error("Selecione um hotel primeiro");
      return;
    }
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
        toast.success(`${data.photos.length} fotos encontradas e classificadas!`);
      } else {
        toast.info("Nenhuma foto relevante encontrada no site do hotel");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao buscar fotos do hotel");
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (url: string) => {
    setSelectedPhotos(prev => {
      const next = new Set(prev);
      next.has(url) ? next.delete(url) : next.add(url);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedPhotos(new Set(filteredPhotos.map(p => p.url)));
  };

  const handleConfirmSelection = () => {
    const selected = photos.filter(p => selectedPhotos.has(p.url));
    onSelectPhotos?.(selected);
    toast.success(`${selected.length} fotos selecionadas`);
  };

  // Group photos by category
  const grouped = photos.reduce((acc, photo) => {
    if (!acc[photo.category]) acc[photo.category] = [];
    acc[photo.category].push(photo);
    return acc;
  }, {} as Record<string, HotelPhoto[]>);

  const categories = Object.keys(grouped);
  const filteredPhotos = activeCategory ? (grouped[activeCategory] || []) : photos;

  // Lightbox navigation
  const lightboxPhoto = lightboxIndex !== null ? filteredPhotos[lightboxIndex] : null;

  const goNext = useCallback(() => {
    if (lightboxIndex === null) return;
    setLightboxIndex((lightboxIndex + 1) % filteredPhotos.length);
  }, [lightboxIndex, filteredPhotos.length]);

  const goPrev = useCallback(() => {
    if (lightboxIndex === null) return;
    setLightboxIndex((lightboxIndex - 1 + filteredPhotos.length) % filteredPhotos.length);
  }, [lightboxIndex, filteredPhotos.length]);

  // Keyboard navigation
  useEffect(() => {
    if (lightboxIndex === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "Escape") setLightboxIndex(null);
      else if (e.key === " ") {
        e.preventDefault();
        if (lightboxPhoto) toggleSelect(lightboxPhoto.url);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxIndex, goNext, goPrev, lightboxPhoto]);

  if (!scraped && photos.length === 0) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={scrapePhotos}
        disabled={loading || !hotelName}
        className="gap-2 text-xs"
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Camera className="w-3.5 h-3.5" />
        )}
        {loading ? "Buscando fotos oficiais..." : "Buscar fotos do site oficial"}
      </Button>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold text-foreground">Fotos Oficiais</span>
          <Badge variant="secondary" className="text-[10px]">{photos.length} fotos</Badge>
          {selectedPhotos.size > 0 && (
            <Badge className="text-[10px] bg-primary">{selectedPhotos.size} selecionadas</Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          {sourceUrl && (
            <a href={sourceUrl} target="_blank" rel="noreferrer" className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-1 mr-1">
              <ExternalLink className="w-3 h-3" /> Fonte
            </a>
          )}
          <Button type="button" variant="ghost" size="sm" onClick={selectAll} className="text-[10px] h-6 px-2">
            Selecionar todas
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={scrapePhotos} disabled={loading} className="text-[10px] h-6 px-2">
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "↻ Rebuscar"}
          </Button>
        </div>
      </div>

      {/* Category filters */}
      {categories.length > 1 && (
        <ScrollArea className="w-full">
          <div className="flex gap-1.5 pb-1">
            <button
              onClick={() => setActiveCategory(null)}
              className={cn(
                "shrink-0 px-2.5 py-1 rounded-full text-[10px] font-medium border transition-colors",
                !activeCategory ? "bg-primary text-primary-foreground border-primary" : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
              )}
            >
              Todas ({photos.length})
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                className={cn(
                  "shrink-0 px-2.5 py-1 rounded-full text-[10px] font-medium border transition-colors",
                  activeCategory === cat
                    ? "bg-primary text-primary-foreground border-primary"
                    : categoryColors[cat] || "bg-muted/50 text-muted-foreground border-border"
                )}
              >
                {categoryLabels[cat] || cat} ({grouped[cat].length})
              </button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}

      {/* Photo grid */}
      {filteredPhotos.length > 0 ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
          {filteredPhotos.map((photo, i) => {
            const isSelected = selectedPhotos.has(photo.url);
            return (
              <div
                key={photo.url + i}
                className={cn(
                  "relative group aspect-[4/3] rounded-lg overflow-hidden border-2 cursor-pointer transition-all",
                  isSelected ? "border-primary ring-2 ring-primary/30 scale-[0.97]" : "border-transparent hover:border-muted-foreground/30"
                )}
              >
                <img
                  src={photo.url}
                  alt={photo.room_name || photo.alt || photo.category}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLImageElement).closest("div")!.style.display = "none";
                  }}
                />
                {/* Bottom overlay with category & room name */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-1.5 pt-4">
                  <span className="text-[9px] text-white font-medium block leading-tight">
                    {photo.room_name || categoryLabels[photo.category] || photo.category}
                  </span>
                </div>
                {/* Selection checkbox */}
                <button
                  onClick={(e) => { e.stopPropagation(); toggleSelect(photo.url); }}
                  className={cn(
                    "absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center transition-all",
                    isSelected ? "bg-primary text-primary-foreground" : "bg-black/40 text-white opacity-0 group-hover:opacity-100"
                  )}
                >
                  <Check className="w-3 h-3" />
                </button>
                {/* Expand button */}
                <button
                  onClick={(e) => { e.stopPropagation(); setLightboxIndex(i); }}
                  className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60"
                >
                  <ZoomIn className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-6 bg-muted/20 rounded-lg">
          <Camera className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">Nenhuma foto encontrada nesta categoria</p>
        </div>
      )}

      {/* Selection actions */}
      {selectedPhotos.size > 0 && (
        <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-lg p-2.5">
          <span className="text-xs font-medium text-primary">{selectedPhotos.size} foto(s) selecionada(s)</span>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedPhotos(new Set())} className="text-xs h-7">
              Limpar
            </Button>
            <Button type="button" size="sm" onClick={handleConfirmSelection} className="text-xs h-7">
              Usar na proposta
            </Button>
          </div>
        </div>
      )}

      {/* Full-screen Lightbox with navigation */}
      <Dialog open={lightboxIndex !== null} onOpenChange={() => { setLightboxIndex(null); setShowInfo(false); }}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 gap-0 bg-black/95 border-none overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Galeria de fotos do hotel</DialogTitle>
          </DialogHeader>

          {lightboxPhoto && (
            <div className="relative flex flex-col h-[90vh]">
              {/* Top bar */}
              <div className="flex items-center justify-between px-4 py-2 bg-black/60 z-10">
                <div className="flex items-center gap-3">
                  <span className="text-white/70 text-xs">
                    {lightboxIndex !== null ? lightboxIndex + 1 : 0} / {filteredPhotos.length}
                  </span>
                  <Badge className={cn("text-[10px]", categoryColors[lightboxPhoto.category])}>
                    {lightboxPhoto.room_name || categoryLabels[lightboxPhoto.category] || lightboxPhoto.category}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  {lightboxPhoto.room_details && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowInfo(!showInfo)}
                      className="text-white/70 hover:text-white h-7 px-2 text-xs"
                    >
                      <Info className="w-3.5 h-3.5 mr-1" /> Detalhes
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant={selectedPhotos.has(lightboxPhoto.url) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleSelect(lightboxPhoto.url)}
                    className="h-7 px-3 text-xs"
                  >
                    <Check className="w-3.5 h-3.5 mr-1" />
                    {selectedPhotos.has(lightboxPhoto.url) ? "Selecionada" : "Selecionar"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => { setLightboxIndex(null); setShowInfo(false); }}
                    className="text-white/70 hover:text-white h-7 w-7"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Main image area */}
              <div className="flex-1 relative flex items-center justify-center min-h-0">
                {/* Previous */}
                <button
                  onClick={goPrev}
                  className="absolute left-2 z-10 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>

                {/* Image */}
                <img
                  src={lightboxPhoto.url}
                  alt={lightboxPhoto.room_name || lightboxPhoto.alt || ""}
                  className="max-w-full max-h-full object-contain px-14"
                />

                {/* Next */}
                <button
                  onClick={goNext}
                  className="absolute right-2 z-10 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>

                {/* Room details panel */}
                {showInfo && lightboxPhoto.room_details && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-sm text-white rounded-xl p-4 max-w-md w-[90%] space-y-2">
                    <h4 className="font-semibold text-sm">{lightboxPhoto.room_name}</h4>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-white/80">
                      {lightboxPhoto.room_details.size_sqm && (
                        <div>📐 {lightboxPhoto.room_details.size_sqm} m²</div>
                      )}
                      {lightboxPhoto.room_details.max_guests && (
                        <div>👥 Até {lightboxPhoto.room_details.max_guests} hóspedes</div>
                      )}
                      {lightboxPhoto.room_details.bed_type && (
                        <div>🛏️ {lightboxPhoto.room_details.bed_type}</div>
                      )}
                      {lightboxPhoto.room_details.view && (
                        <div>🌅 Vista: {lightboxPhoto.room_details.view}</div>
                      )}
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
              <div className="px-4 py-2 bg-black/60">
                <ScrollArea className="w-full">
                  <div className="flex gap-1.5">
                    {filteredPhotos.map((p, i) => (
                      <button
                        key={p.url + i}
                        onClick={() => setLightboxIndex(i)}
                        className={cn(
                          "shrink-0 w-14 h-10 rounded overflow-hidden border-2 transition-all",
                          i === lightboxIndex ? "border-primary opacity-100" : "border-transparent opacity-50 hover:opacity-80"
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
