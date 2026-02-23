import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Hotel, Loader2, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface HotelResult {
  name: string;
  city: string;
  country: string;
  address: string;
  lat: number;
  lng: number;
  place_id: string;
}

interface HotelAutocompleteProps {
  value: string;
  onChange: (name: string) => void;
  onSelect?: (hotel: HotelResult) => void;
  className?: string;
}

export default function HotelAutocomplete({ value, onChange, onSelect, className }: HotelAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<HotelResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => { setQuery(value); }, [value]);

  const search = useCallback(async (q: string) => {
    if (q.length < 3) { setResults([]); setOpen(false); return; }
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("hotel-search", {
        body: { query: q },
      });
      if (fnError) throw fnError;
      setResults(data?.results || []);
      setOpen(true);
      setSelectedIndex(-1);
    } catch {
      setError("Não foi possível buscar hotéis");
      setResults([]);
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (val: string) => {
    setQuery(val);
    onChange(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 350);
  };

  const handleSelect = (hotel: HotelResult) => {
    setQuery(hotel.name);
    onChange(hotel.name);
    onSelect?.(hotel);
    setOpen(false);
    setResults([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Input
          data-testid="input-hotel"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (results.length > 0) setOpen(true); }}
          placeholder="Buscar hotel..."
          className={cn("pr-8", className)}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /> : <Hotel className="w-4 h-4 text-muted-foreground" />}
        </div>
      </div>

      {error && <p className="text-[10px] text-destructive mt-1">{error}</p>}

      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg max-h-[300px] overflow-y-auto">
          {results.map((hotel, i) => (
            <button
              key={hotel.place_id + i}
              onClick={() => handleSelect(hotel)}
              className={cn(
                "w-full px-3 py-2.5 text-left flex items-start gap-2 hover:bg-accent transition-colors border-b border-border/50 last:border-0",
                selectedIndex === i && "bg-accent"
              )}
            >
              <Hotel className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{hotel.name}</p>
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3 shrink-0" />
                  {[hotel.city, hotel.country].filter(Boolean).join(", ")}
                </p>
                {hotel.address && (
                  <p className="text-[10px] text-muted-foreground/70 truncate">{hotel.address}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {open && results.length === 0 && !loading && query.length >= 3 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg p-3 text-center">
          <p className="text-xs text-muted-foreground">Nenhum hotel encontrado</p>
          <p className="text-[10px] text-muted-foreground mt-1">O nome digitado será usado como texto livre</p>
        </div>
      )}
    </div>
  );
}
