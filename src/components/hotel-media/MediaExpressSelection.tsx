import { useState, useMemo, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Star, Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import MediaSwapPopover from "./MediaSwapPopover";
import type { HotelPhoto, SectionDetail, RoomBlock } from "./types";

interface Props {
  photos: HotelPhoto[];
  roomGroups: Record<string, HotelPhoto[]>;
  areaGroups: Record<string, HotelPhoto[]>;
  sectionDetails: Record<string, SectionDetail>;
  getDisplayUrl: (url: string) => string;
  onImageError: (url: string) => void;
  onUseSelection: (rooms: RoomBlock[], cover: HotelPhoto, areas: HotelPhoto[]) => void;
}

const AREA_PRIORITY = ["piscina", "restaurante", "spa", "lobby", "fachada", "vista"];
const AREA_LABELS: Record<string, string> = {
  piscina: "Piscina", restaurante: "Restaurante", spa: "Spa",
  lobby: "Lobby", fachada: "Fachada", vista: "Vista",
};

type SlotPhoto = { photo: HotelPhoto; label: string; role: "cover" | "room" | "area"; category: string; roomName?: string };

export default function MediaExpressSelection({
  photos, roomGroups, areaGroups, sectionDetails,
  getDisplayUrl, onImageError, onUseSelection,
}: Props) {
  // Pick best cover: prioritize official fachada > official vista > any fachada > any vista > first photo
  const pickCover = useCallback((): HotelPhoto | null => {
    const officialFachada = photos.filter(p => p.category === "fachada" && p.source === "official").sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
    if (officialFachada.length) return officialFachada[0];
    const officialVista = photos.filter(p => p.category === "vista" && p.source === "official").sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
    if (officialVista.length) return officialVista[0];
    const anyFachada = photos.filter(p => p.category === "fachada").sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
    if (anyFachada.length) return anyFachada[0];
    const anyVista = photos.filter(p => p.category === "vista").sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
    if (anyVista.length) return anyVista[0];
    const officialPiscina = photos.filter(p => p.category === "piscina" && p.source === "official").sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
    if (officialPiscina.length) return officialPiscina[0];
    return photos[0] || null;
  }, [photos]);

  // Sort rooms: most photos × highest avg confidence
  const sortedRoomNames = useMemo(() => {
    return Object.entries(roomGroups)
      .map(([name, ps]) => ({
        name,
        score: ps.length * (ps.reduce((s, p) => s + (p.confidence || 0.5), 0) / ps.length),
      }))
      .sort((a, b) => b.score - a.score)
      .map(r => r.name);
  }, [roomGroups]);

  // State for swappable slots
  const [coverPhoto, setCoverPhoto] = useState<HotelPhoto | null>(null);
  const [primaryRoomIdx, setPrimaryRoomIdx] = useState(0);
  const [areaSlots, setAreaSlots] = useState<Record<string, HotelPhoto>>({});

  // Initialize on first render / when data changes
  const effectiveCover = coverPhoto || pickCover();
  const primaryRoomName = sortedRoomNames[primaryRoomIdx] || sortedRoomNames[0];
  const primaryRoomPhotos = primaryRoomName ? (roomGroups[primaryRoomName] || []).slice(0, 3) : [];

  // Pick area photos
  const effectiveAreaSlots = useMemo(() => {
    const result: { category: string; photo: HotelPhoto }[] = [];
    for (const cat of AREA_PRIORITY) {
      const pool = areaGroups[cat];
      if (!pool || pool.length === 0) continue;
      const overridden = areaSlots[cat];
      result.push({ category: cat, photo: overridden || pool.sort((a, b) => (b.confidence || 0) - (a.confidence || 0))[0] });
      if (result.length >= 3) break;
    }
    return result;
  }, [areaGroups, areaSlots]);

  // Build all slots for strip
  const allSlots: SlotPhoto[] = useMemo(() => {
    const slots: SlotPhoto[] = [];
    if (effectiveCover) slots.push({ photo: effectiveCover, label: "Capa", role: "cover", category: effectiveCover.category });
    primaryRoomPhotos.forEach((p, i) => {
      slots.push({ photo: p, label: i === 0 ? (primaryRoomName || "Quarto") : `Quarto ${i + 1}`, role: "room", category: p.category, roomName: primaryRoomName });
    });
    effectiveAreaSlots.forEach(({ category, photo }) => {
      slots.push({ photo, label: AREA_LABELS[category] || category, role: "area", category });
    });
    return slots;
  }, [effectiveCover, primaryRoomPhotos, effectiveAreaSlots, primaryRoomName]);

  const handleUse = () => {
    if (!effectiveCover) return;
    const roomDetail = primaryRoomName ? sectionDetails[primaryRoomName] : undefined;
    // Build auto description from structured data (same logic as RoomCard)
    const parts: string[] = [];
    if (roomDetail?.details?.["Tamanho"]) parts.push(roomDetail.details["Tamanho"]);
    if (roomDetail?.details?.["Cama"]) parts.push(roomDetail.details["Cama"]);
    if (roomDetail?.details?.["Capacidade"]) parts.push(roomDetail.details["Capacidade"]);
    const autoDesc = parts.join(" · ").slice(0, 60);
    const roomBlock: RoomBlock = {
      room_name: primaryRoomName || "Quarto",
      description: roomDetail?.description || autoDesc,
      amenities: roomDetail?.amenities || [],
      photos: primaryRoomPhotos,
      source: primaryRoomPhotos[0]?.source || "official",
    };
    onUseSelection([roomBlock], effectiveCover, effectiveAreaSlots.map(a => a.photo));
  };

  // Alternatives for cover swap: all fachada + vista + piscina photos
  const coverAlternatives = photos.filter(p => ["fachada", "vista", "piscina", "lobby"].includes(p.category));

  if (allSlots.length === 0) return null;

  return (
    <div className="space-y-3 rounded-xl border border-border/60 bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4 text-warning" />
          <span className="text-sm font-semibold text-foreground">Pronto para proposta</span>
          <Badge variant="secondary" className="text-[10px]">{allSlots.length} mídias</Badge>
        </div>

        {/* Room switcher */}
        {sortedRoomNames.length > 1 && (
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-muted-foreground">Quarto:</span>
            <select
              value={primaryRoomIdx}
              onChange={(e) => setPrimaryRoomIdx(Number(e.target.value))}
              className="text-[10px] bg-muted/50 border border-border/50 rounded px-1.5 py-0.5 text-foreground"
            >
              {sortedRoomNames.map((name, i) => (
                <option key={name} value={i}>{name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Thumbnail strip */}
      <ScrollArea className="w-full">
        <div className="flex gap-2 pb-1">
          {allSlots.map((slot, i) => (
            <MediaSwapPopover
              key={slot.photo.url + i}
              alternatives={
                slot.role === "cover" ? coverAlternatives :
                slot.role === "room" ? (roomGroups[slot.roomName || ""] || []) :
                (areaGroups[slot.category] || [])
              }
              currentUrl={slot.photo.url}
              getDisplayUrl={getDisplayUrl}
              onImageError={onImageError}
              onSwap={(newPhoto) => {
                if (slot.role === "cover") setCoverPhoto(newPhoto);
                else if (slot.role === "area") setAreaSlots(prev => ({ ...prev, [slot.category]: newPhoto }));
              }}
            >
              <button className="group shrink-0 w-28 space-y-1">
                <div className="relative aspect-[3/2] rounded-lg overflow-hidden border border-border/50 group-hover:border-primary/40 transition-all">
                  <img
                    src={getDisplayUrl(slot.photo.url)}
                    alt={slot.label}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={() => onImageError(slot.photo.url)}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <Camera className="w-3.5 h-3.5 text-white opacity-0 group-hover:opacity-80 transition-opacity" />
                  </div>
                  {/* Role badge */}
                  <div className={cn(
                    "absolute top-1 left-1 text-[8px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider",
                    slot.role === "cover" ? "bg-warning/90 text-warning-foreground" :
                    slot.role === "room" ? "bg-primary/90 text-primary-foreground" :
                    "bg-muted/80 text-foreground backdrop-blur-sm"
                  )}>
                    {slot.label}
                  </div>
                  {/* Source indicator */}
                  {slot.photo.source !== "official" && (
                    <div className="absolute bottom-1 right-1 text-[7px] font-bold bg-info/80 text-info-foreground px-1 py-0.5 rounded-sm">
                      Compl.
                    </div>
                  )}
                </div>
              </button>
            </MediaSwapPopover>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <Button type="button" size="sm" onClick={handleUse} className="w-full gap-2 text-xs">
        <Star className="w-3.5 h-3.5" />
        Usar seleção na proposta
      </Button>
    </div>
  );
}
