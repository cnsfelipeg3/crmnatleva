import { Plane, AlertCircle, Sparkles, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatBRL } from "./gflightsTypes";
import type { DiscoveredDestination } from "@/hooks/useDiscoverDestinations";

interface Props {
  destination: DiscoveredDestination;
  isCheapest?: boolean;
  onSelectDestination: (dest: DiscoveredDestination) => void;
}

const REGION_BG: Record<string, string> = {
  "Brasil": "from-emerald-500/20 to-yellow-500/20",
  "Américas": "from-blue-500/20 to-cyan-500/20",
  "Caribe": "from-cyan-500/20 to-emerald-500/20",
  "Europa": "from-violet-500/20 to-pink-500/20",
  "Oriente Médio": "from-amber-500/20 to-orange-500/20",
  "Ásia": "from-rose-500/20 to-pink-500/20",
  "África": "from-orange-500/20 to-red-500/20",
};

export function GFlightDestinationCard({ destination, isCheapest, onSelectDestination }: Props) {
  const bg = REGION_BG[destination.region] ?? "from-primary/20 to-primary/10";
  return (
    <Card
      className="overflow-hidden cursor-pointer hover:shadow-lg transition-all hover:-translate-y-0.5 border-border/60"
      onClick={() => onSelectDestination(destination)}
    >
      {/* Hero */}
      <div className={cn("relative h-32 bg-gradient-to-br p-3 flex flex-col justify-end", bg)}>
        {destination.hero_image_url && (
          <img
            src={destination.hero_image_url}
            alt={destination.city}
            className="absolute inset-0 w-full h-full object-cover opacity-80"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent" />
        {isCheapest && (
          <Badge className="absolute top-2 left-2 gap-1 bg-emerald-500 hover:bg-emerald-500 text-white border-0 z-10">
            <Sparkles className="h-3 w-3" /> Melhor preço
          </Badge>
        )}
        {!destination.fitsBudget && (
          <Badge variant="outline" className="absolute top-2 right-2 gap-1 bg-amber-500/90 text-white border-0 z-10">
            <AlertCircle className="h-3 w-3" /> Acima do orçamento
          </Badge>
        )}
        <div className="relative z-10">
          <h3 className="text-lg font-bold text-foreground leading-tight">{destination.city}</h3>
          <p className="text-xs text-muted-foreground">
            {destination.country} · {destination.region}
          </p>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="p-3 space-y-2.5">
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">A partir de</div>
            <div className="text-xl font-bold text-foreground">{formatBRL(destination.minPrice)}</div>
            <div className="text-[10px] text-muted-foreground">por adulto · ida e volta</div>
          </div>
          {destination.visa_required && (
            <Badge variant="outline" className="text-[10px]">Visto</Badge>
          )}
        </div>

        {destination.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {destination.tags.slice(0, 4).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px] capitalize">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-border/40">
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            ~{destination.avg_trip_days} dias
          </span>
          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1">
            Ver voos <Plane className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
