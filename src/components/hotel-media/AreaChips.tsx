import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HotelPhoto } from "./types";

const AREA_CONFIG: Record<string, { icon: string; label: string; priority: number }> = {
  piscina: { icon: "🏊", label: "Piscina", priority: 1 },
  restaurante: { icon: "🍽️", label: "Restaurante", priority: 2 },
  spa: { icon: "🧖", label: "Spa", priority: 3 },
  lobby: { icon: "🏛️", label: "Lobby", priority: 4 },
  fachada: { icon: "📸", label: "Fachada", priority: 5 },
  vista: { icon: "🌅", label: "Vista", priority: 6 },
  bar: { icon: "🍹", label: "Bar", priority: 7 },
  academia: { icon: "🏋️", label: "Academia", priority: 8 },
  jardim: { icon: "🌺", label: "Jardim", priority: 9 },
  praia: { icon: "🏖️", label: "Praia", priority: 10 },
  area_comum: { icon: "🌿", label: "Áreas Comuns", priority: 11 },
  banheiro: { icon: "🚿", label: "Banheiros", priority: 12 },
  eventos: { icon: "🎪", label: "Eventos", priority: 13 },
};

const MAX_VISIBLE = 6;

interface Props {
  areaGroups: Record<string, HotelPhoto[]>;
  onSelectArea: (category: string) => void;
  activeArea: string | null;
}

export default function AreaChips({ areaGroups, onSelectArea, activeArea }: Props) {
  const [expanded, setExpanded] = useState(false);

  const sorted = Object.entries(areaGroups)
    .map(([cat, photos]) => ({ cat, photos, config: AREA_CONFIG[cat] || { icon: "📷", label: cat, priority: 99 } }))
    .sort((a, b) => a.config.priority - b.config.priority);

  const visible = expanded ? sorted : sorted.slice(0, MAX_VISIBLE);
  const hasMore = sorted.length > MAX_VISIBLE;

  if (sorted.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Áreas do Hotel</h3>
      <div className="flex flex-wrap gap-1.5">
        {visible.map(({ cat, photos, config }) => (
          <button
            key={cat}
            onClick={() => onSelectArea(cat)}
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs border transition-all",
              activeArea === cat
                ? "border-primary bg-primary/10 text-primary font-medium"
                : "border-border/50 bg-card hover:border-primary/30 text-foreground"
            )}
          >
            <span>{config.icon}</span>
            <span>{config.label}</span>
            <Badge variant="secondary" className="text-[9px] h-4 px-1 min-w-0">{photos.length}</Badge>
          </button>
        ))}
        {hasMore && !expanded && (
          <button
            onClick={() => setExpanded(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs border border-border/50 bg-card hover:border-primary/30 text-muted-foreground"
          >
            + Mais áreas
            <ChevronDown className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}
