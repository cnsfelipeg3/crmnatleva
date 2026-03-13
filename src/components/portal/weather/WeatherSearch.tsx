import { useState, useRef, useEffect, useCallback } from "react";
import { Search, X, MapPin } from "lucide-react";
import { searchCities, type GeoResult } from "./utils";

interface WeatherSearchProps {
  defaultCity: string | null;
  currentCity: string;
  onSelectCity: (city: string) => void;
}

export default function WeatherSearch({ defaultCity, currentCity, onSelectCity }: WeatherSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeoResult[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const isCustom = defaultCity && currentCity.toLowerCase() !== defaultCity.toLowerCase();

  const handleSearch = useCallback((value: string) => {
    setQuery(value);
    clearTimeout(debounceRef.current);
    if (value.length < 2) { setResults([]); return; }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const r = await searchCities(value);
      setResults(r);
      setSearching(false);
    }, 350);
  }, []);

  const handleSelect = (city: string) => {
    onSelectCity(city);
    setQuery("");
    setResults([]);
    setOpen(false);
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setResults([]);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} className="relative mx-4 mt-3">
      {/* Search input */}
      <div className="flex items-center gap-2 rounded-xl bg-white/[0.12] backdrop-blur-md border border-white/[0.08] px-3 py-2 transition-colors focus-within:bg-white/[0.18]">
        <Search className="h-3.5 w-3.5 opacity-50 shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Buscar outra localização…"
          className="flex-1 bg-transparent text-xs text-white placeholder:text-white/40 outline-none"
        />
        {query && (
          <button onClick={() => { setQuery(""); setResults([]); }} className="opacity-50 hover:opacity-100 transition-opacity">
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Results dropdown */}
      {open && results.length > 0 && (
        <div className="absolute z-20 left-0 right-0 mt-1.5 rounded-xl bg-slate-800/95 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden">
          {results.map((r, i) => (
            <button
              key={i}
              onClick={() => handleSelect(r.name)}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left text-xs text-white/90 hover:bg-white/10 transition-colors"
            >
              <MapPin className="h-3 w-3 opacity-40 shrink-0" />
              <span className="font-medium">{r.name}</span>
              <span className="opacity-40 ml-auto text-[10px]">{r.admin1 ? `${r.admin1}, ` : ""}{r.country}</span>
            </button>
          ))}
        </div>
      )}

      {open && searching && (
        <div className="absolute z-20 left-0 right-0 mt-1.5 rounded-xl bg-slate-800/95 backdrop-blur-xl border border-white/10 shadow-2xl px-4 py-3">
          <p className="text-[10px] text-white/40 text-center">Buscando…</p>
        </div>
      )}

      {/* Return to default destination */}
      {isCustom && (
        <button
          onClick={() => defaultCity && handleSelect(defaultCity)}
          className="mt-2 flex items-center gap-1.5 text-[10px] font-medium text-white/50 hover:text-white/80 transition-colors mx-auto"
        >
          <MapPin className="h-3 w-3" />
          Voltar para {defaultCity}
        </button>
      )}
    </div>
  );
}
