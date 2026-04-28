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
              key={`${r.id}-${r.name}`}
              type="button"
              onClick={() => { onChange(r); setOpen(false); setQuery(""); }}
              className={cn(
                "w-full flex items-start gap-2 px-3 py-2 text-left text-sm hover:bg-accent transition-colors",
              )}
            >
              <Plane className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="font-medium">
                  <span className="font-mono text-primary">{r.id}</span>
                  {r.city && <span className="ml-2">{r.city}</span>}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {r.name}{r.country ? ` · ${r.country}` : ""}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
