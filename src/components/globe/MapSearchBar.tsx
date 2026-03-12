/// <reference types="google.maps" />
/**
 * MapSearchBar — Google Places Autocomplete search for the Journey Globe.
 * Premium, minimal overlay that floats above the Cesium canvas.
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, MapPin, Building2, Plane, Landmark, Navigation } from "lucide-react";
import { getGoogleMapsApiKey } from "@/lib/cesium/config";

/* ═══ Types ═══ */
export interface SearchResult {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  types: string[];
  category: string;
}

interface MapSearchBarProps {
  onSelect: (result: SearchResult) => void;
  onClear: () => void;
  isMobile?: boolean;
}

/* ═══ Helpers ═══ */
const CATEGORY_MAP: Record<string, { label: string; icon: typeof MapPin }> = {
  airport: { label: "Aeroporto", icon: Plane },
  lodging: { label: "Hospedagem", icon: Building2 },
  tourist_attraction: { label: "Atração", icon: Landmark },
  point_of_interest: { label: "Ponto de Interesse", icon: Landmark },
  locality: { label: "Cidade", icon: MapPin },
  administrative_area_level_1: { label: "Estado", icon: MapPin },
  country: { label: "País", icon: MapPin },
  default: { label: "Local", icon: Navigation },
};

function resolveCategory(types: string[]): { label: string; icon: typeof MapPin } {
  for (const t of types) {
    if (CATEGORY_MAP[t]) return CATEGORY_MAP[t];
  }
  return CATEGORY_MAP.default;
}

/* ═══ Google Places loader ═══ */
let placesServicePromise: Promise<void> | null = null;

function loadGooglePlaces(): Promise<void> {
  if (placesServicePromise) return placesServicePromise;
  const apiKey = getGoogleMapsApiKey();
  if (!apiKey) return Promise.reject(new Error("Google Maps API key missing"));

  placesServicePromise = new Promise((resolve, reject) => {
    if ((window as any).google?.maps?.places) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=pt-BR`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Places"));
    document.head.appendChild(script);
  });

  return placesServicePromise;
}

/* ═══ Component ═══ */
export default function MapSearchBar({ onSelect, onClear, isMobile }: MapSearchBarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAvailable, setIsAvailable] = useState(true);
  const [isFocused, setIsFocused] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesRef = useRef<google.maps.places.PlacesService | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Init Google Places
  useEffect(() => {
    const apiKey = getGoogleMapsApiKey();
    if (!apiKey) {
      setIsAvailable(false);
      return;
    }

    loadGooglePlaces()
      .then(() => {
        autocompleteRef.current = new google.maps.places.AutocompleteService();
        // PlacesService needs a div
        const div = document.createElement("div");
        placesRef.current = new google.maps.places.PlacesService(div);
      })
      .catch(() => setIsAvailable(false));
  }, []);

  // Click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsFocused(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Autocomplete search
  const searchPlaces = useCallback((input: string) => {
    if (!autocompleteRef.current || input.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    autocompleteRef.current.getPlacePredictions(
      {
        input,
        types: [],
      },
      (predictions, status) => {
        setIsLoading(false);
        if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
          setResults(predictions.slice(0, 6));
          setIsOpen(true);
        } else {
          setResults([]);
          setIsOpen(false);
        }
      }
    );
  }, []);

  const handleInput = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchPlaces(value), 300);
  };

  const handleSelect = (prediction: google.maps.places.AutocompletePrediction) => {
    if (!placesRef.current) return;

    placesRef.current.getDetails(
      {
        placeId: prediction.place_id,
        fields: ["geometry", "name", "formatted_address", "types", "place_id"],
      },
      (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
          const result: SearchResult = {
            placeId: place.place_id || prediction.place_id,
            name: place.name || prediction.structured_formatting.main_text,
            address: place.formatted_address || prediction.description,
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
            types: place.types || [],
            category: resolveCategory(place.types || []).label,
          };

          setQuery(result.name);
          setIsOpen(false);
          setIsFocused(false);
          onSelect(result);
        }
      }
    );
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setIsOpen(false);
    onClear();
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      setIsFocused(false);
      inputRef.current?.blur();
    }
  };

  if (!isAvailable) return null;

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1, duration: 0.5 }}
      className={`absolute z-10 ${
        isMobile
          ? "left-3 right-3 top-14"
          : "left-1/2 top-4 -translate-x-1/2 w-[360px]"
      }`}
    >
      {/* Search input */}
      <div
        className={`relative flex items-center rounded-xl border bg-background/80 backdrop-blur-2xl shadow-lg transition-all duration-200 ${
          isFocused
            ? "border-primary/30 shadow-primary/5"
            : "border-border/20 shadow-black/10"
        }`}
      >
        <Search className="ml-3.5 h-4 w-4 shrink-0 text-muted-foreground/50" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => {
            setIsFocused(true);
            if (results.length > 0) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Pesquisar local no globo..."
          className="flex-1 bg-transparent px-3 py-2.5 text-[13px] text-foreground placeholder:text-muted-foreground/40 outline-none"
        />
        {isLoading && (
          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground/20 border-t-primary" />
        )}
        {query && !isLoading && (
          <button
            onClick={handleClear}
            className="mr-2 flex h-5 w-5 items-center justify-center rounded-md text-muted-foreground/40 transition-colors hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Results dropdown */}
      <AnimatePresence>
        {isOpen && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="mt-1.5 overflow-hidden rounded-xl border border-border/20 bg-background/90 shadow-xl backdrop-blur-2xl"
          >
            {results.map((prediction, i) => {
              const cat = resolveCategory(prediction.types || []);
              const Icon = cat.icon;
              return (
                <button
                  key={prediction.place_id}
                  onClick={() => handleSelect(prediction)}
                  className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/30 ${
                    i > 0 ? "border-t border-border/10" : ""
                  }`}
                >
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/15 bg-muted/20">
                    <Icon className="h-3.5 w-3.5 text-primary/70" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-foreground/90">
                      {prediction.structured_formatting.main_text}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground/60">
                      {prediction.structured_formatting.secondary_text}
                    </p>
                  </div>
                  <span className="mt-1 shrink-0 text-[9px] font-medium uppercase tracking-wider text-muted-foreground/40">
                    {cat.label}
                  </span>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
