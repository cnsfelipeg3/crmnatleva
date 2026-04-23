import { useState, useMemo, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Star, Camera, Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { SmartImg } from "@/components/ui/SmartImg";
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
  const [used, setUsed] = useState(false);

  const pickCover = useCallback((): HotelPhoto | null => {
    const sorted = (arr: HotelPhoto[]) => [...arr].sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
    for (const [cat, src] of [["fachada", "official"], ["vista", "official"], ["fachada", null], ["vista", null], ["piscina", "official"]] as const) {
      const pool = photos.filter(p => p.category === cat && (src ? p.source === src : true));
      if (pool.length) return sorted(pool)[0];
    }
    return photos[0] || null;
  }, [photos]);

  const sortedRoomNames = useMemo(() => {
    return Object.entries(roomGroups)
      .map(([name, ps]) => ({
        name,
        score: ps.length * (ps.reduce((s, p) => s + (p.confidence || 0.5), 0) / ps.length),
      }))
      .sort((a, b) => b.score - a.score)
      .map(r => r.name);
  }, [roomGroups]);

  const [coverPhoto, setCoverPhoto] = useState<HotelPhoto | null>(null);
  const [primaryRoomIdx, setPrimaryRoomIdx] = useState(0);
  const [areaSlots, setAreaSlots] = useState<Record<string, HotelPhoto>>({});

  const effectiveCover = coverPhoto || pickCover();
  const primaryRoomName = sortedRoomNames[primaryRoomIdx] || sortedRoomNames[0];
  const primaryRoomPhotos = primaryRoomName ? (roomGroups[primaryRoomName] || []).slice(0, 3) : [];

  const effectiveAreaSlots = useMemo(() => {
    const result: { category: string; photo: HotelPhoto }[] = [];
    for (const cat of AREA_PRIORITY) {
      const pool = areaGroups[cat];
      if (!pool || pool.length === 0) continue;
      const overridden = areaSlots[cat];
      result.push({ category: cat, photo: overridden || [...pool].sort((a, b) => (b.confidence || 0) - (a.confidence || 0))[0] });
      if (result.length >= 3) break;
    }
    return result;
  }, [areaGroups, areaSlots]);

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

  // Target: cover + 3 room + 3 area = 7
  const targetCount = 1 + 3 + 3;
  const currentCount = allSlots.length;
  const progressLabel = currentCount >= targetCount
    ? "Proposta pronta"
    : `${currentCount} de ${targetCount} mídias`;

  const handleUse = () => {
    if (!effectiveCover) return;
    const roomDetail = primaryRoomName ? sectionDetails[primaryRoomName] : undefined;
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
    setUsed(true);
    toast.success("Seleção adicionada à proposta", { duration: 2000 });
    setTimeout(() => setUsed(false), 1500);
  };

  const coverAlternatives = photos.filter(p => ["fachada", "vista", "piscina", "lobby"].includes(p.category));

  if (allSlots.length === 0) return null;

  return (
    <div className={cn(
      "space-y-3 rounded-xl border bg-gradient-to-b from-accent/[0.03] to-transparent p-4 transition-all duration-300",
      used ? "border-accent/40 shadow-[0_0_20px_-5px_hsl(var(--accent)/0.2)]" : "border-accent/20"
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accent" />
          <span className="text-sm font-bold text-foreground">Sugestão pronta para proposta</span>
          <span className="text-[10px] text-muted-foreground font-medium">{progressLabel}</span>
        </div>

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
        <div className="flex gap-2.5 pb-1">
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
              <button className="group shrink-0 w-36 space-y-1">
                <div className="relative aspect-[3/2] rounded-lg overflow-hidden border border-border/40 group-hover:border-accent/40 transition-all duration-200">
                  <SmartImg
                    src={getDisplayUrl(slot.photo.url)}
                    alt={slot.label}
                    displayWidth={160}
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-200"
                    referrerPolicy="no-referrer"
                    onError={() => onImageError(slot.photo.url)}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors duration-200 flex items-center justify-center">
                    <Camera className="w-3.5 h-3.5 text-white opacity-0 group-hover:opacity-80 transition-opacity duration-200" />
                  </div>
                  {/* Role badge */}
                  <div className={cn(
                    "absolute top-1.5 left-1.5 text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider",
                    slot.role === "cover" ? "bg-warning/90 text-warning-foreground" :
                    slot.role === "room" ? "bg-primary/90 text-primary-foreground" :
                    "bg-black/50 text-white"
                  )}>
                    {slot.label}
                  </div>
                </div>
              </button>
            </MediaSwapPopover>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <Button
        type="button"
        size="sm"
        onClick={handleUse}
        disabled={used}
        className={cn(
          "w-full gap-2 text-xs font-semibold bg-gradient-to-r from-accent to-accent/80 text-accent-foreground hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 shadow-[0_2px_12px_-3px_hsl(var(--accent)/0.35)]",
          used && "opacity-80"
        )}
      >
        {used ? (
          <>
            <Check className="w-3.5 h-3.5" />
            Adicionado à proposta
          </>
        ) : (
          <>
            <Sparkles className="w-3.5 h-3.5" />
            Adicionar seleção à proposta
          </>
        )}
      </Button>
    </div>
  );
}
