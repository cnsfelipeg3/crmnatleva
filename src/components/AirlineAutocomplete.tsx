import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface AirlineResult {
  iata: string;
  icao: string;
  name: string;
}

interface Props {
  value: string;
  onChange: (iata: string, name?: string) => void;
  placeholder?: string;
  className?: string;
}

// Common airlines fallback for quick search
const COMMON_AIRLINES: AirlineResult[] = [
  { iata: "LA", icao: "LAN", name: "LATAM Airlines" },
  { iata: "G3", icao: "GLO", name: "GOL Linhas Aéreas" },
  { iata: "AD", icao: "AZU", name: "Azul" },
  { iata: "TP", icao: "TAP", name: "TAP Air Portugal" },
  { iata: "AA", icao: "AAL", name: "American Airlines" },
  { iata: "UA", icao: "UAL", name: "United Airlines" },
  { iata: "DL", icao: "DAL", name: "Delta Air Lines" },
  { iata: "AF", icao: "AFR", name: "Air France" },
  { iata: "LH", icao: "DLH", name: "Lufthansa" },
  { iata: "BA", icao: "BAW", name: "British Airways" },
  { iata: "IB", icao: "IBE", name: "Iberia" },
  { iata: "EK", icao: "UAE", name: "Emirates" },
  { iata: "QR", icao: "QTR", name: "Qatar Airways" },
  { iata: "TK", icao: "THY", name: "Turkish Airlines" },
  { iata: "AV", icao: "AVA", name: "Avianca" },
  { iata: "CM", icao: "CMP", name: "Copa Airlines" },
  { iata: "ET", icao: "ETH", name: "Ethiopian Airlines" },
  { iata: "KL", icao: "KLM", name: "KLM" },
  { iata: "AZ", icao: "ITY", name: "ITA Airways" },
  { iata: "AC", icao: "ACA", name: "Air Canada" },
];

export default function AirlineAutocomplete({ value, onChange, placeholder = "Ex: Emirates ou EK", className }: Props) {
  const [selectedLabel, setSelectedLabel] = useState(() => {
    // Initialize with name if value matches a known airline
    const match = COMMON_AIRLINES.find(a => a.iata === value);
    return match ? `${match.iata} — ${match.name}` : "";
  });
  const [query, setQuery] = useState(value || "");
  const [results, setResults] = useState<AirlineResult[]>([]);
  const [open, setOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const displayValue = isFocused ? query : (selectedLabel || value || "");

  useEffect(() => {
    if (!isFocused) {
      setQuery(value || "");
      if (value && !selectedLabel) {
        const match = COMMON_AIRLINES.find(a => a.iata === value);
        if (match) setSelectedLabel(`${match.iata} — ${match.name}`);
      }
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
    if (keyword.length < 1) { setResults(COMMON_AIRLINES.slice(0, 10)); setOpen(true); return; }

    debounceRef.current = setTimeout(async () => {
      const kw = keyword.toUpperCase();
      const local = COMMON_AIRLINES.filter(a =>
        a.iata.includes(kw) || a.icao.includes(kw) || a.name.toUpperCase().includes(kw)
      );

      if (kw.length === 2) {
        try {
          const { data } = await supabase.functions.invoke("amadeus-search", {
            body: { action: "airline_search", keyword: kw },
          });
          if (data?.data?.length > 0) {
            const merged = [...data.data];
            local.forEach(l => {
              if (!merged.find((m: AirlineResult) => m.iata === l.iata)) merged.push(l);
            });
            setResults(merged.slice(0, 10));
            setOpen(merged.length > 0);
            return;
          }
        } catch { /* fallback to local */ }
      }

      setResults(local.slice(0, 10));
      setOpen(local.length > 0);
    }, 200);
  };

  const handleInputChange = (val: string) => {
    setQuery(val);
    setSelectedLabel("");
    search(val);
  };

  const handleFocus = () => {
    setIsFocused(true);
    setQuery("");
    search("");
  };

  const handleSelect = (r: AirlineResult) => {
    const label = `${r.iata} — ${r.name}`;
    setSelectedLabel(label);
    setQuery(r.iata);
    onChange(r.iata, r.name);
    setOpen(false);
    setIsFocused(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={displayValue}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={handleFocus}
        placeholder={placeholder}
        className={cn("text-sm", className)}
      />
      {open && (
        <div className="absolute z-50 top-full mt-1 w-full min-w-[240px] bg-popover border border-border rounded-md shadow-lg max-h-[240px] overflow-y-auto">
          {results.map((r, i) => (
            <button
              key={`${r.iata}-${i}`}
              className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-accent text-sm transition-colors"
              onClick={() => handleSelect(r)}
            >
              <span className="font-mono font-bold text-primary w-6">{r.iata}</span>
              <span className="truncate text-foreground">{r.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
