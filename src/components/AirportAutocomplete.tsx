import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Plane, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface AirportResult {
  iata: string;
  name: string;
  city: string;
  country: string;
  subType: string;
}

interface Props {
  value: string;
  onChange: (iata: string, name?: string) => void;
  placeholder?: string;
  className?: string;
  "data-testid"?: string;
}

export default function AirportAutocomplete({ value, onChange, placeholder = "GRU", className, "data-testid": testId }: Props) {
  const [selectedLabel, setSelectedLabel] = useState("");
  const [query, setQuery] = useState(value || "");
  const [results, setResults] = useState<AirportResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  // Show label when not focused, raw query when focused
  const displayValue = isFocused ? query : (selectedLabel || value || "");

  useEffect(() => {
    if (!isFocused) {
      setQuery(value || "");
    }
  }, [value, isFocused]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setIsFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const search = (keyword: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (keyword.length < 2) { setResults([]); setOpen(false); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("amadeus-search", {
          body: { action: "airport_search", keyword },
        });
        if (!error && data?.data) {
          setResults(data.data);
          setOpen(data.data.length > 0);
        }
      } catch (e) {
        console.error("Airport search error:", e);
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  const handleInputChange = (val: string) => {
    const upper = val.toUpperCase();
    setQuery(upper);
    setSelectedLabel("");
    search(upper);
    if (upper.length === 3 && /^[A-Z]{3}$/.test(upper)) {
      onChange(upper);
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    setQuery(value || "");
    if (value && value.length >= 2) {
      search(value);
    }
  };

  const handleSelect = (r: AirportResult) => {
    const label = `${r.iata} — ${r.city || r.name}`;
    setSelectedLabel(label);
    setQuery(r.iata);
    onChange(r.iata, r.name);
    setOpen(false);
    setIsFocused(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <Input
        data-testid={testId}
        value={query}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder={placeholder}
        maxLength={30}
        className={cn("font-mono", className)}
      />
      {open && (
        <div className="absolute z-50 top-full mt-1 w-full min-w-[280px] bg-popover border border-border rounded-md shadow-lg max-h-[240px] overflow-y-auto">
          {results.map((r, i) => (
            <button
              key={`${r.iata}-${i}`}
              className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-accent text-sm transition-colors"
              onClick={() => handleSelect(r)}
            >
              {r.subType === "AIRPORT" ? (
                <Plane className="w-3.5 h-3.5 text-primary shrink-0" />
              ) : (
                <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              )}
              <span className="font-mono font-bold text-primary w-8">{r.iata}</span>
              <span className="truncate text-foreground">{r.name}</span>
              <span className="text-muted-foreground text-xs ml-auto shrink-0">
                {r.city}{r.country ? `, ${r.country}` : ""}
              </span>
            </button>
          ))}
          {loading && (
            <div className="px-3 py-2 text-xs text-muted-foreground text-center">Buscando...</div>
          )}
        </div>
      )}
    </div>
  );
}
