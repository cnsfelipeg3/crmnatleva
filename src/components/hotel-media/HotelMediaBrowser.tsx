import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";

import { Globe, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useHotelMedia } from "./useHotelMedia";
import MediaStatusBar from "./MediaStatusBar";
import MediaExpressSelection from "./MediaExpressSelection";
import RoomCard from "./RoomCard";
import AreaChips from "./AreaChips";
import RoomGalleryDrawer from "./RoomGalleryDrawer";
import type { HotelPhoto, RoomBlock } from "./types";

interface Props {
  hotelName: string;
  hotelCity: string;
  hotelCountry: string;
  onSelectPhotos?: (photos: HotelPhoto[]) => void;
  onSelectRoomBlock?: (block: RoomBlock) => void;
}

export default function HotelMediaBrowser({ hotelName, hotelCity, hotelCountry, onSelectPhotos, onSelectRoomBlock }: Props) {
  const media = useHotelMedia({ hotelName, hotelCity, hotelCountry });
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [galleryName, setGalleryName] = useState<string | null>(null);
  const [activeArea, setActiveArea] = useState<string | null>(null);

  const toggleSelect = useCallback((url: string) => {
    setSelectedPhotos(prev => {
      const next = new Set(prev);
      next.has(url) ? next.delete(url) : next.add(url);
      return next;
    });
  }, []);

  const handleConfirmSelection = () => {
    const selected = media.photos.filter(p => selectedPhotos.has(p.url));
    onSelectPhotos?.(selected);
    toast.success(`${selected.length} fotos adicionadas à proposta`);
  };

  const handleUseSelection = (rooms: RoomBlock[], cover: HotelPhoto, areas: HotelPhoto[]) => {
    const allPhotos = [cover, ...rooms.flatMap(r => r.photos), ...areas];
    onSelectPhotos?.(allPhotos);
    if (rooms.length > 0 && onSelectRoomBlock) {
      rooms.forEach(r => onSelectRoomBlock(r));
    }
    toast.success(`✨ ${allPhotos.length} mídias + bloco de quarto inseridos na proposta`);
  };

  const handleUseRoom = (block: RoomBlock) => {
    onSelectPhotos?.(block.photos);
    onSelectRoomBlock?.(block);
    toast.success(`Quarto "${block.room_name}" adicionado à proposta`);
  };

  const handleAreaClick = (category: string) => {
    setActiveArea(prev => prev === category ? null : category);
    // Open gallery for this area
    setGalleryName(`area:${category}`);
  };

  // Gallery photos based on galleryName
  const getGalleryPhotos = (): { name: string; photos: HotelPhoto[] } => {
    if (!galleryName) return { name: "", photos: [] };
    if (galleryName.startsWith("area:")) {
      const cat = galleryName.replace("area:", "");
      const areaConfig: Record<string, string> = {
        piscina: "Piscina", restaurante: "Restaurante", spa: "Spa",
        lobby: "Lobby", fachada: "Fachada", vista: "Vista",
        bar: "Bar", academia: "Academia", jardim: "Jardim",
        praia: "Praia", area_comum: "Áreas Comuns", banheiro: "Banheiros",
      };
      return { name: areaConfig[cat] || cat, photos: media.areaGroups[cat] || [] };
    }
    return { name: galleryName, photos: media.roomGroups[galleryName] || [] };
  };

  const gallery = getGalleryPhotos();

  // ── Initial state: not yet scraped ──
  if (!media.scraped && media.photos.length === 0) {
    return (
      <Button
        type="button" variant="outline" size="sm"
        onClick={() => media.scrapeOfficial()}
        disabled={media.loading || !hotelName}
        className="gap-2 text-xs"
      >
        {media.loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
        {media.loading ? "Buscando mídias..." : "Buscar mídias do hotel"}
      </Button>
    );
  }

  const roomNames = Object.keys(media.roomGroups).sort((a, b) => {
    const aScore = media.roomGroups[a].length * (media.roomGroups[a].reduce((s, p) => s + (p.confidence || 0.5), 0) / media.roomGroups[a].length);
    const bScore = media.roomGroups[b].length * (media.roomGroups[b].reduce((s, p) => s + (p.confidence || 0.5), 0) / media.roomGroups[b].length);
    return bScore - aScore;
  });

  return (
    <div className="space-y-6">
      {/* ZONA A — Status Bar */}
      <MediaStatusBar
        hotelName={hotelName}
        sourceUrl={media.sourceUrl}
        totalPhotos={media.photos.length}
        roomCount={roomNames.length}
        coverage={media.coverage}
        fromCache={media.fromCache}
        cacheAgeHours={media.cacheAgeHours}
        loading={media.loading}
        classifying={media.classifying}
        onRefresh={() => media.scrapeOfficial(true)}
      />

      {/* ZONA B — Seleção Expressa */}
      {media.photos.length > 0 && (
        <MediaExpressSelection
          photos={media.photos}
          roomGroups={media.roomGroups}
          areaGroups={media.areaGroups}
          sectionDetails={media.sectionDetails}
          getDisplayUrl={media.getDisplayUrl}
          onImageError={media.handleImageError}
          onUseSelection={handleUseSelection}
        />
      )}

      {/* Selection bar */}
      {selectedPhotos.size > 0 && (
        <div className="flex items-center justify-between bg-accent/5 border border-accent/20 rounded-lg px-3 py-2">
          <span className="text-xs font-medium text-primary">{selectedPhotos.size} foto(s) selecionada(s)</span>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedPhotos(new Set())} className="text-xs h-7">Limpar</Button>
            <Button type="button" size="sm" onClick={handleConfirmSelection} className="text-xs h-7">Usar na proposta</Button>
          </div>
        </div>
      )}

      {/* ZONA C — Exploração */}
      {roomNames.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Acomodações</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {roomNames.map(name => (
              <RoomCard
                key={name}
                name={name}
                photos={media.roomGroups[name]}
                detail={media.sectionDetails[name]}
                getDisplayUrl={media.getDisplayUrl}
                onImageError={media.handleImageError}
                onViewGallery={setGalleryName}
                onUseRoom={handleUseRoom}
              />
            ))}
          </div>
        </div>
      )}

      {/* Area chips */}
      <AreaChips
        areaGroups={media.areaGroups}
        onSelectArea={handleAreaClick}
        activeArea={activeArea}
      />

      {/* Gallery Drawer */}
      <RoomGalleryDrawer
        open={!!galleryName}
        onClose={() => { setGalleryName(null); setActiveArea(null); }}
        name={gallery.name}
        photos={gallery.photos}
        detail={galleryName && !galleryName.startsWith("area:") ? media.sectionDetails[galleryName] : undefined}
        getDisplayUrl={media.getDisplayUrl}
        onImageError={media.handleImageError}
        selectedPhotos={selectedPhotos}
        toggleSelect={toggleSelect}
      />
    </div>
  );
}
