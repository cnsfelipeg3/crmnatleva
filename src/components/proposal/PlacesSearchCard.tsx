/**
 * PlacesSearchCard — Google Places search + enrichment for the Proposal Editor.
 * Lets consultants search for hotels, attractions, restaurants via Google Places,
 * then auto-imports name, address, rating, photos, and details.
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Search, Loader2, Star, MapPin, Phone, Globe, Image as ImageIcon,
  X, ChevronLeft, ChevronRight, RotateCcw, Check, Camera,
} from "lucide-react";

/* ═══ Types ═══ */
interface PlaceResult {
  place_id: string;
  name: string;
  address: string;
  rating: number | null;
  user_ratings_total: number;
  types: string[];
  photo_reference: string | null;
  location: { lat: number; lng: number } | null;
  price_level: number | null;
}

interface PlacePhoto {
  photo_reference: string;
  width: number;
  height: number;
  url?: string;
}

interface PlaceDetails {
  place_id: string;
  name: string;
  address: string;
  phone: string | null;
  website: string | null;
  rating: number | null;
  user_ratings_total: number;
  price_level: number | null;
  types: string[];
  location: { lat: number; lng: number } | null;
  photos: PlacePhoto[];
  editorial_summary: string | null;
  reviews: { author: string; rating: number; text: string; time: string }[];
}

export interface PlacesEnrichmentData {
  place_id: string;
  name: string;
  address: string;
  rating: number | null;
  user_ratings_total: number;
  website: string | null;
  phone: string | null;
  location: { lat: number; lng: number } | null;
  types: string[];
  editorial_summary: string | null;
  photos: string[]; // resolved URLs
  mainPhotoIndex: number;
}

interface PlacesSearchCardProps {
  /** Pre-fill search query (e.g., hotel name already typed) */
  initialQuery?: string;
  /** Destination context for biased search (e.g., "Milan, Italy") */
  destinationContext?: string;
  /** Called with enrichment data when user confirms selection */
  onEnrich: (data: PlacesEnrichmentData) => void;
  /** Called when user cancels/closes */
  onCancel: () => void;
  className?: string;
}

/* ═══ Helpers ═══ */
const TYPE_LABELS: Record<string, string> = {
  lodging: "Hotel", hotel: "Hotel", restaurant: "Restaurante",
  tourist_attraction: "Atração", museum: "Museu", spa: "Spa",
  point_of_interest: "Ponto de Interesse", park: "Parque",
  church: "Igreja", art_gallery: "Galeria", shopping_mall: "Shopping",
  bar: "Bar", cafe: "Café", night_club: "Casa Noturna",
  amusement_park: "Parque Temático", zoo: "Zoológico",
  aquarium: "Aquário", casino: "Cassino", stadium: "Estádio",
};

function resolveType(types: string[]): string {
  for (const t of types) {
    if (TYPE_LABELS[t]) return TYPE_LABELS[t];
  }
  return "Local";
}

function renderStars(rating: number | null) {
  if (!rating) return null;
  return (
    <span className="inline-flex items-center gap-1 text-warning">
      <Star className="h-3.5 w-3.5 fill-warning" />
      <span className="text-xs font-semibold">{rating.toFixed(1)}</span>
    </span>
  );
}

const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;

function photoUrl(ref: string, maxWidth = 600): string {
  // We'll resolve this through the edge function
  return `https://${PROJECT_ID}.supabase.co/functions/v1/places-search`;
}

/* ═══ Component ═══ */
export default function PlacesSearchCard({
  initialQuery = "",
  destinationContext,
  onEnrich,
  onCancel,
  className,
}: PlacesSearchCardProps) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Details state
  const [selectedPlace, setSelectedPlace] = useState<PlaceDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [resolvedPhotos, setResolvedPhotos] = useState<string[]>([]);
  const [mainPhotoIdx, setMainPhotoIdx] = useState(0);
  const [loadingPhotos, setLoadingPhotos] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  /* ── Search ── */
  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    setError(null);
    try {
      const body: any = { action: "search", query: q };
      // If we have destination context, try to geocode bias
      if (destinationContext) {
        body.query = `${q} ${destinationContext}`;
      }
      const { data, error: fnErr } = await supabase.functions.invoke("places-search", { body });
      if (fnErr) throw fnErr;
      setResults(data?.results || []);
    } catch {
      setError("Não foi possível buscar locais");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [destinationContext]);

  const handleInput = (val: string) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 400);
  };

  /* ── Select & get details ── */
  const selectPlace = useCallback(async (placeId: string) => {
    setLoadingDetails(true);
    setError(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("places-search", {
        body: { action: "details", place_id: placeId },
      });
      if (fnErr) throw fnErr;
      setSelectedPlace(data);
      setResults([]);

      // Resolve photo URLs
      if (data?.photos?.length > 0) {
        setLoadingPhotos(true);
        const urls: string[] = [];
        for (const photo of data.photos.slice(0, 8)) {
          try {
            const { data: photoData } = await supabase.functions.invoke("places-search", {
              body: { action: "photo", photo_reference: photo.photo_reference, max_width: 800 },
            });
            if (photoData?.url) urls.push(photoData.url);
          } catch {
            // Skip failed photos
          }
        }
        setResolvedPhotos(urls);
        setMainPhotoIdx(0);
        setLoadingPhotos(false);
      }
    } catch {
      setError("Não foi possível carregar detalhes do local");
    } finally {
      setLoadingDetails(false);
    }
  }, []);

  /* ── Confirm enrichment ── */
  const handleConfirm = useCallback(() => {
    if (!selectedPlace) return;
    onEnrich({
      place_id: selectedPlace.place_id,
      name: selectedPlace.name,
      address: selectedPlace.address,
      rating: selectedPlace.rating,
      user_ratings_total: selectedPlace.user_ratings_total,
      website: selectedPlace.website,
      phone: selectedPlace.phone,
      location: selectedPlace.location,
      types: selectedPlace.types,
      editorial_summary: selectedPlace.editorial_summary,
      photos: resolvedPhotos,
      mainPhotoIndex: mainPhotoIdx,
    });
  }, [selectedPlace, resolvedPhotos, mainPhotoIdx, onEnrich]);

  /* ── Reset ── */
  const handleReset = () => {
    setSelectedPlace(null);
    setResolvedPhotos([]);
    setMainPhotoIdx(0);
    setQuery("");
    setResults([]);
    setError(null);
  };

  /* ═══ Render: Details View ═══ */
  if (selectedPlace) {
    return (
      <div ref={containerRef} className={cn("border border-border rounded-xl bg-card overflow-hidden", className)}>
        {/* Header */}
        <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Camera className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm font-semibold text-foreground truncate">Conteúdo importado do Google</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button variant="ghost" size="sm" onClick={handleReset} className="h-7 px-2 text-xs gap-1">
              <RotateCcw className="h-3 w-3" /> Buscar outro
            </Button>
            <Button variant="ghost" size="sm" onClick={onCancel} className="h-7 px-2 text-xs">
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Photos Gallery */}
        {loadingPhotos ? (
          <div className="h-48 flex items-center justify-center bg-muted/20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Carregando fotos...</span>
          </div>
        ) : resolvedPhotos.length > 0 ? (
          <div className="relative">
            <div className="h-52 overflow-hidden bg-muted/10">
              <img
                src={resolvedPhotos[mainPhotoIdx]}
                alt={selectedPlace.name}
                className="w-full h-full object-cover"
              />
            </div>
            {resolvedPhotos.length > 1 && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-background/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-border/50">
                <button
                  onClick={() => setMainPhotoIdx(i => Math.max(0, i - 1))}
                  disabled={mainPhotoIdx === 0}
                  className="p-0.5 text-foreground/70 hover:text-foreground disabled:opacity-30"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <span className="text-[10px] font-medium text-foreground/70 min-w-[40px] text-center">
                  {mainPhotoIdx + 1} / {resolvedPhotos.length}
                </span>
                <button
                  onClick={() => setMainPhotoIdx(i => Math.min(resolvedPhotos.length - 1, i + 1))}
                  disabled={mainPhotoIdx === resolvedPhotos.length - 1}
                  className="p-0.5 text-foreground/70 hover:text-foreground disabled:opacity-30"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            {/* Mini thumbnails */}
            {resolvedPhotos.length > 1 && (
              <div className="px-3 py-2 flex gap-1.5 overflow-x-auto border-b border-border/50">
                {resolvedPhotos.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => setMainPhotoIdx(i)}
                    className={cn(
                      "w-14 h-10 rounded-md overflow-hidden shrink-0 border-2 transition-all",
                      i === mainPhotoIdx ? "border-primary ring-1 ring-primary/30" : "border-transparent opacity-60 hover:opacity-100"
                    )}
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="h-32 flex items-center justify-center bg-muted/10">
            <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
            <span className="ml-2 text-sm text-muted-foreground">Sem fotos disponíveis</span>
          </div>
        )}

        {/* Info */}
        <div className="p-4 space-y-3">
          <div>
            <h3 className="text-base font-bold text-foreground">{selectedPlace.name}</h3>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <MapPin className="h-3 w-3 shrink-0" /> {selectedPlace.address}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {selectedPlace.rating && (
              <Badge variant="secondary" className="gap-1">
                <Star className="h-3 w-3 fill-warning text-warning" />
                {selectedPlace.rating.toFixed(1)}
                <span className="text-muted-foreground/70 font-normal">({selectedPlace.user_ratings_total})</span>
              </Badge>
            )}
            <Badge variant="outline" className="text-[10px]">{resolveType(selectedPlace.types)}</Badge>
            {selectedPlace.price_level != null && (
              <Badge variant="outline" className="text-[10px]">{"$".repeat(selectedPlace.price_level)}</Badge>
            )}
          </div>

          {selectedPlace.editorial_summary && (
            <p className="text-xs text-muted-foreground leading-relaxed border-l-2 border-primary/30 pl-3 italic">
              {selectedPlace.editorial_summary}
            </p>
          )}

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {selectedPlace.phone && (
              <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {selectedPlace.phone}</span>
            )}
            {selectedPlace.website && (
              <a href={selectedPlace.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                <Globe className="h-3 w-3" /> Website
              </a>
            )}
          </div>

          {/* Confirm button */}
          <Button onClick={handleConfirm} className="w-full gap-2 mt-2">
            <Check className="h-4 w-4" /> Usar na proposta
          </Button>
        </div>
      </div>
    );
  }

  /* ═══ Render: Search View ═══ */
  return (
    <div ref={containerRef} className={cn("border border-border rounded-xl bg-card overflow-hidden", className)}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Buscar no Google Places</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onCancel} className="h-7 px-2">
          <X className="h-3 w-3" />
        </Button>
      </div>

      {/* Search Input */}
      <div className="p-3">
        <div className="relative">
          <Input
            value={query}
            onChange={(e) => handleInput(e.target.value)}
            placeholder="Buscar hotel, atração ou restaurante..."
            className="pr-8"
            autoFocus
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <Search className="h-4 w-4 text-muted-foreground/50" />
            )}
          </div>
        </div>
        {destinationContext && (
          <p className="text-[10px] text-muted-foreground mt-1.5 flex items-center gap-1">
            <MapPin className="h-2.5 w-2.5" /> Prioridade: {destinationContext}
          </p>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="px-3 pb-3">
          <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
        </div>
      )}

      {/* Loading details */}
      {loadingDetails && (
        <div className="px-3 pb-4 flex items-center justify-center gap-2 py-8">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Importando dados do local...</span>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && !loadingDetails && (
        <ScrollArea className="max-h-[320px]">
          <div className="px-3 pb-3 space-y-1">
            {results.map((place) => (
              <button
                key={place.place_id}
                onClick={() => selectPlace(place.place_id)}
                className="w-full text-left flex items-start gap-3 px-3 py-3 rounded-xl hover:bg-muted/50 transition-colors border border-transparent hover:border-border/50"
              >
                {/* Thumbnail */}
                {place.photo_reference ? (
                  <div className="w-14 h-14 rounded-lg overflow-hidden bg-muted/20 shrink-0">
                    <PlaceThumbnail photoRef={place.photo_reference} alt={place.name} />
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-muted/30 flex items-center justify-center shrink-0">
                    <MapPin className="h-5 w-5 text-muted-foreground/40" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{place.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{place.address}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {place.rating && renderStars(place.rating)}
                    {place.user_ratings_total > 0 && (
                      <span className="text-[10px] text-muted-foreground">({place.user_ratings_total})</span>
                    )}
                    <Badge variant="outline" className="text-[9px] h-4 px-1.5">{resolveType(place.types)}</Badge>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Empty state */}
      {query.length >= 2 && results.length === 0 && !loading && !loadingDetails && !error && (
        <div className="px-3 pb-4 text-center py-6">
          <MapPin className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">Nenhum local encontrado</p>
          <p className="text-[10px] text-muted-foreground/60 mt-0.5">Tente outro nome ou endereço</p>
        </div>
      )}
    </div>
  );
}

/* ═══ Photo Thumbnail (lazy-loaded via edge function) ═══ */
function PlaceThumbnail({ photoRef, alt }: { photoRef: string; alt: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase.functions.invoke("places-search", {
      body: { action: "photo", photo_reference: photoRef, max_width: 200 },
    }).then(({ data }) => {
      if (!cancelled && data?.url) setUrl(data.url);
    });
    return () => { cancelled = true; };
  }, [photoRef]);

  if (!url) return <div className="w-full h-full bg-muted/30 animate-pulse" />;
  return <img src={url} alt={alt} className="w-full h-full object-cover" />;
}
