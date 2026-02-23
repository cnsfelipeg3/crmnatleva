import { useState, useEffect } from "react";
import { Plane } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface AirlineLogoProps {
  iata: string;
  name?: string;
  size?: number;
  className?: string;
  showName?: boolean;
}

// Fallback logo URL using a reliable CDN
function getLogoUrl(iata: string): string {
  if (!iata) return "";
  const code = iata.toUpperCase().trim();
  // Use pics.avs.io which is a well-known airline logo CDN
  return `https://pics.avs.io/60/60/${code}.png`;
}

export default function AirlineLogo({ iata, name, size = 20, className, showName = false }: AirlineLogoProps) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setError(false);
    setLoaded(false);
  }, [iata]);

  if (!iata) return null;

  const code = iata.toUpperCase().trim();
  const displayName = name || code;
  const logoUrl = getLogoUrl(code);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn("inline-flex items-center gap-1.5 shrink-0 relative", className)}>
          {!error && logoUrl ? (
            <img
              src={logoUrl}
              alt={`Logo ${displayName}`}
              width={size}
              height={size}
              className={cn("object-contain rounded-sm", !loaded && "opacity-0")}
              onLoad={() => setLoaded(true)}
              onError={() => setError(true)}
              loading="lazy"
            />
          ) : (
            <span
              className="flex items-center justify-center bg-muted rounded-sm"
              style={{ width: size, height: size }}
            >
              <Plane className="text-muted-foreground" style={{ width: size * 0.6, height: size * 0.6 }} />
            </span>
          )}
          {/* Show placeholder while loading */}
          {!error && logoUrl && !loaded && (
            <span
              className="flex items-center justify-center bg-muted rounded-sm absolute"
              style={{ width: size, height: size }}
            >
              <Plane className="text-muted-foreground" style={{ width: size * 0.6, height: size * 0.6 }} />
            </span>
          )}
          {showName && <span className="text-xs text-muted-foreground truncate max-w-[80px]">{code}</span>}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs">{displayName} ({code})</p>
      </TooltipContent>
    </Tooltip>
  );
}

interface AirlineLogosStackProps {
  airlines: string[];
  names?: Record<string, string>;
  size?: number;
  max?: number;
}

export function AirlineLogosStack({ airlines, names, size = 20, max = 3 }: AirlineLogosStackProps) {
  const unique = [...new Set(airlines.filter(Boolean).map(a => a.toUpperCase().trim()))];
  if (unique.length === 0) return null;

  const visible = unique.slice(0, max);
  const remaining = unique.length - max;

  return (
    <span className="inline-flex items-center gap-0.5">
      {visible.map((iata) => (
        <AirlineLogo key={iata} iata={iata} name={names?.[iata]} size={size} />
      ))}
      {remaining > 0 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-[10px] text-muted-foreground bg-muted rounded-full px-1.5 py-0.5 font-medium">
              +{remaining}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">{unique.slice(max).join(", ")}</p>
          </TooltipContent>
        </Tooltip>
      )}
    </span>
  );
}
