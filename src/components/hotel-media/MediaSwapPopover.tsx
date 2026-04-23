import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import { cn } from "@/lib/utils";
import { SmartImg } from "@/components/ui/SmartImg";
import type { HotelPhoto } from "./types";

interface Props {
  alternatives: HotelPhoto[];
  currentUrl: string;
  getDisplayUrl: (url: string) => string;
  onImageError: (url: string) => void;
  onSwap: (photo: HotelPhoto) => void;
  children: React.ReactNode;
}

export default function MediaSwapPopover({ alternatives, currentUrl, getDisplayUrl, onImageError, onSwap, children }: Props) {
  const filteredAlts = alternatives.filter(p => p.url !== currentUrl).slice(0, 9);
  if (filteredAlts.length === 0) return <>{children}</>;

  return (
    <Popover>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="center" side="bottom">
        <p className="text-[10px] text-muted-foreground mb-2 font-medium">Trocar imagem</p>
        <div className="grid grid-cols-3 gap-1.5">
          {filteredAlts.map((photo, i) => (
            <button
              key={photo.url + i}
              onClick={() => onSwap(photo)}
              className={cn(
                "aspect-[3/2] rounded overflow-hidden border border-border/50",
                "hover:border-primary hover:ring-1 hover:ring-primary/30 transition-all"
              )}
            >
              <SmartImg
                src={getDisplayUrl(photo.url)}
                alt=""
                displayWidth={96}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                onError={() => onImageError(photo.url)}
              />
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
