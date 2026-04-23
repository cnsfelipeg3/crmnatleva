import { useState, useEffect, useRef } from "react";
import { Plane, Loader2, MapPin, Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useFlightDestinations } from "@/hooks/useBookingRapidApi";
import type { FlightLocation } from "./flightTypes";

interface Props {
  value: FlightLocation | null;
  onChange: (loc: FlightLocation | null) => void;
  placeholder?: string;
  className?: string;
  icon?: "plane" | "mapPin";
}

function buildLabel(loc: FlightLocation): string {
  if (loc.type === "AIRPORT") {
    return `${loc.code} — ${loc.name}`;
  }
  return `${loc.name} (todos os aeroportos)`;
}

export function AirportAutocomplete({
  value,
  onChange,
  placeholder = "Ex: GRU, São Paulo, JFK...",
  className,
  icon = "plane",
}: Props) {
  const [text, setText] = useState(value ? buildLabel(value) : "");
  const [debounced, setDebounced] = useState(text);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(text), 400);
    return () => clearTimeout(t);
  }, [text]);

  const { data: suggestions, isFetching } = useFlightDestinations(
    debounced,
    debounced.length >= 2,
  );

  const pick = (loc: FlightLocation) => {
    onChange(loc);
    setText(buildLabel(loc));
    setOpen(false);
  };

  const Icon = icon === "plane" ? Plane : MapPin;

  return (
    <div className={cn("w-full", className)}>
      <Popover open={open && debounced.length >= 2} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Icon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setOpen(true);
                if (value) onChange(null);
              }}
              onFocus={() => setOpen(true)}
              placeholder={placeholder}
              className="pl-9 pr-9"
              autoComplete="off"
            />
            {isFetching && (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent
          className="w-[--radix-popover-trigger-width] p-0"
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="max-h-80 overflow-y-auto py-1">
            {!suggestions?.length && !isFetching && debounced.length >= 2 && (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                Nenhum aeroporto encontrado.
              </div>
            )}
            {suggestions?.map((s) => {
              const isCity = s.type === "CITY";
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => pick(s)}
                  className="flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted"
                >
                  <div className="mt-0.5 shrink-0">
                    {isCity ? (
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Plane className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                        {s.code}
                      </span>
                      <span className="truncate">{s.name}</span>
                    </div>
                    <div className="mt-0.5 truncate text-xs text-muted-foreground">
                      {[s.cityName, s.regionName, s.countryName]
                        .filter(Boolean)
                        .join(", ")}
                      {isCity && (
                        <span className="ml-1">· todos os aeroportos</span>
                      )}
                      {s.distanceToCity && (
                        <span className="ml-1">
                          · {Math.round(s.distanceToCity.value)} km do centro
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
