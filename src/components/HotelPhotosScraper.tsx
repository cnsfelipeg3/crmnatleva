import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Camera, Loader2, ExternalLink, X, ImageIcon, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface HotelPhoto {
  url: string;
  alt: string;
  category: string;
  confidence: number;
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
  quarto_standard: "🛏️ Quarto Standard",
  quarto_superior: "👑 Suíte / Superior",
  restaurante: "🍽️ Restaurante",
  piscina: "🏊 Piscina",
  spa: "💆 Spa",
  area_comum: "🌿 Áreas Comuns",
  vista: "🌅 Vista",
  outro: "📷 Outros",
};

const categoryColors: Record<string, string> = {
  fachada: "bg-blue-500/10 text-blue-700 border-blue-300",
  lobby: "bg-amber-500/10 text-amber-700 border-amber-300",
  quarto_standard: "bg-indigo-500/10 text-indigo-700 border-indigo-300",
  quarto_superior: "bg-purple-500/10 text-purple-700 border-purple-300",
  restaurante: "bg-orange-500/10 text-orange-700 border-orange-300",
  piscina: "bg-cyan-500/10 text-cyan-700 border-cyan-300",
  spa: "bg-pink-500/10 text-pink-700 border-pink-300",
  area_comum: "bg-green-500/10 text-green-700 border-green-300",
  vista: "bg-rose-500/10 text-rose-700 border-rose-300",
  outro: "bg-muted text-muted-foreground border-border",
};

export default function HotelPhotosScraper({ hotelName, hotelCity, hotelCountry, onSelectPhotos }: Props) {
  const [loading, setLoading] = useState(false);
  const [photos, setPhotos] = useState<HotelPhoto[]>([]);
  const [sourceUrl, setSourceUrl] = useState("");
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [scraped, setScraped] = useState(false);

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
        </div>
        <div className="flex items-center gap-2">
          {sourceUrl && (
            <a href={sourceUrl} target="_blank" rel="noreferrer" className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-1">
              <ExternalLink className="w-3 h-3" /> Fonte
            </a>
          )}
          <Button type="button" variant="ghost" size="sm" onClick={scrapePhotos} disabled={loading} className="text-xs h-7 px-2">
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
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {filteredPhotos.map((photo, i) => {
            const isSelected = selectedPhotos.has(photo.url);
            return (
              <div
                key={photo.url + i}
                className={cn(
                  "relative group aspect-[4/3] rounded-lg overflow-hidden border-2 cursor-pointer transition-all",
                  isSelected ? "border-primary ring-2 ring-primary/30" : "border-transparent hover:border-muted-foreground/30"
                )}
                onClick={() => toggleSelect(photo.url)}
              >
                <img
                  src={photo.url}
                  alt={photo.alt || photo.category}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
                {/* Category badge */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1.5">
                  <span className="text-[9px] text-white font-medium">
                    {categoryLabels[photo.category] || photo.category}
                  </span>
                </div>
                {/* Selection indicator */}
                <div className={cn(
                  "absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center transition-all",
                  isSelected ? "bg-primary text-primary-foreground" : "bg-black/40 text-white opacity-0 group-hover:opacity-100"
                )}>
                  <Check className="w-3 h-3" />
                </div>
                {/* Zoom */}
                <button
                  onClick={(e) => { e.stopPropagation(); setLightbox(photo.url); }}
                  className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ImageIcon className="w-3 h-3" />
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
              Usar selecionadas
            </Button>
          </div>
        </div>
      )}

      {/* Lightbox */}
      <Dialog open={!!lightbox} onOpenChange={() => setLightbox(null)}>
        <DialogContent className="max-w-4xl p-2">
          <DialogHeader className="sr-only">
            <DialogTitle>Foto do hotel</DialogTitle>
          </DialogHeader>
          {lightbox && (
            <img src={lightbox} alt="Hotel" className="w-full rounded-lg object-contain max-h-[80vh]" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
