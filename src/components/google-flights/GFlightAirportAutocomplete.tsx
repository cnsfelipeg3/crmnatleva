import { useEffect, useRef, useState } from "react";
import { MapPin, Plane, Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAirportSearch } from "@/hooks/useGoogleFlights";
import type { GAirport } from "./gflightsTypes";
import { cn } from "@/lib/utils";

interface Props {
  value: GAirport | null;
  onChange: (a: GAirport | null) => void;
  placeholder?: string;
  icon?: "plane" | "mapPin";
}

export function GFlightAirportAutocomplete({ value, onChange, placeholder, icon = "plane" }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const Icon = icon === "plane" ? Plane : MapPin;

  const { data: results = [], isLoading } = useAirportSearch(query, open && !value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (value) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm">
        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">
            {value.id} · {value.city || value.name}
          </div>
          {value.country && (
            <div className="text-xs text-muted-foreground truncate">{value.country}</div>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={() => { onChange(null); setQuery(""); setOpen(true); }}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="pl-9"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
        )}
      </div>
      {open && query.length >= 2 && (
        <div className="absolute z-50 mt-1 w-full max-h-72 overflow-y-auto rounded-md border border-border bg-popover shadow-lg">
          {results.length === 0 && !isLoading && (
            <div className="px-3 py-4 text-xs text-muted-foreground">Nenhum aeroporto encontrado.</div>
          )}
          {results.map((r) => (
            <button
              key={`${r.id}-${r.nearLabel || ''}`}
              type="button"
              onClick={() => { onChange(r); setOpen(false); setQuery(""); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-accent transition-colors border-b border-border/30 last:border-0"
            >
              <div className="shrink-0 flex h-9 w-12 items-center justify-center rounded-md border border-success/30 bg-success/10">
                <span className="font-mono text-xs font-bold text-success">{r.id}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate text-foreground">
                  {r.city || r.name}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {r.name && r.name !== r.city ? r.name : r.country || "Aeroporto"}
                </div>
                {r.nearLabel && (
                  <div className="mt-0.5 truncate text-[10px] text-muted-foreground/80">
                    próximo a {r.nearLabel}
                    {r.distance && ` · ${r.distance}`}
                  </div>
                )}
              </div>
              <Plane className="h-4 w-4 text-muted-foreground/50 shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
