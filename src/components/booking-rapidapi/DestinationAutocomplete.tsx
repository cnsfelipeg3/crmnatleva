import { useState, useEffect, useRef } from "react";
import { Search, Loader2, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useDestinationSearch } from "@/hooks/useBookingRapidApi";
import type { BookingDestination } from "./types";

interface Props {
  value: BookingDestination | null;
  onChange: (dest: BookingDestination | null) => void;
  placeholder?: string;
  className?: string;
}

export function DestinationAutocomplete({
  value,
  onChange,
  placeholder = "Ex: Rio de Janeiro, Paris, Orlando...",
  className,
}: Props) {
  const [text, setText] = useState(value?.label ?? value?.name ?? "");
  const [debounced, setDebounced] = useState(text);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(text), 400);
    return () => clearTimeout(t);
  }, [text]);

  const { data: suggestions, isFetching } = useDestinationSearch(
    debounced,
    debounced.length >= 2,
  );

  const pick = (dest: BookingDestination) => {
    onChange(dest);
    setText(dest.label || dest.name);
    setOpen(false);
  };

  return (
    <div className={cn("relative w-full", className)}>
      <Popover open={open && debounced.length >= 2} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="max-h-80 overflow-y-auto py-1">
            {!suggestions?.length && !isFetching && debounced.length >= 2 && (
              <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                Nenhum destino encontrado.
              </div>
            )}
            {suggestions?.map((s) => (
              <button
                key={`${s.dest_id}-${s.search_type}`}
                type="button"
                onClick={() => pick(s)}
                className="flex w-full items-start gap-3 px-3 py-2.5 text-left hover:bg-accent transition-colors"
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">
                    {s.name || s.label}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {[s.region, s.country].filter(Boolean).join(", ")}
                    {typeof s.hotels === "number" && (
                      <> · {s.hotels.toLocaleString("pt-BR")} hotéis</>
                    )}
                    {s.search_type && <> · {s.search_type}</>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
