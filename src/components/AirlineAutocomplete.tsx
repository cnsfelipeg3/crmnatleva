import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { searchAirlines, ALL_AIRLINES, type AirlineData } from "@/lib/airlinesData";

interface Props {
  value: string;
  onChange: (iata: string, name?: string) => void;
  placeholder?: string;
  className?: string;
}

export default function AirlineAutocomplete({ value, onChange, placeholder = "Ex: Emirates ou EK", className }: Props) {
  const [selectedLabel, setSelectedLabel] = useState(() => {
    const match = ALL_AIRLINES.find(a => a.iata === value);
    return match ? `${match.iata} — ${match.name}` : "";
  });
  const [query, setQuery] = useState(value || "");
  const [results, setResults] = useState<AirlineData[]>([]);
  const [open, setOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const displayValue = isFocused ? query : (selectedLabel || value || "");

  useEffect(() => {
    if (!isFocused) {
      setQuery(value || "");
      if (value && !selectedLabel) {
        const match = ALL_AIRLINES.find(a => a.iata === value);
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
    const found = searchAirlines(keyword, 15);
    setResults(found);
    setOpen(found.length > 0);
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

  const handleSelect = (r: AirlineData) => {
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
