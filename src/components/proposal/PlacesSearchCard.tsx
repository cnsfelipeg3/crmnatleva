/**
 * PlacesSearchCard — Advanced Google Places search + photo curation for proposals.
 * Three-step flow: Search → Review & Curate Photos → Confirm
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { searchPlaces, getPlaceDetails, getPhotoUrl, type PlaceSearchResult, type PlaceDetailsResult } from "@/lib/placesApi";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Search, Loader2, Star, MapPin, Phone, Globe, Image as ImageIcon,
  X, ChevronLeft, ChevronRight, RotateCcw, Check, Camera, Upload,
  GripVertical, Eye, Crown, CheckSquare, Square, Maximize2,
  Info, Sparkles, FolderOpen, Save,
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

interface CuratedPhoto {
  url: string;
  label: string;
  selected: boolean;
  isCover: boolean;
  source: "google" | "manual";
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
  photos: string[];
  selectedPhotos: string[];
  mainPhotoIndex: number;
  photoLabels: string[];
}

interface PlacesSearchCardProps {
  initialQuery?: string;
  destinationContext?: string;
  onEnrich: (data: PlacesEnrichmentData) => void;
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
  for (const t of types) if (TYPE_LABELS[t]) return TYPE_LABELS[t];
  return "Local";
}

const PHOTO_LABELS = [
  "Fachada", "Lobby", "Quarto Deluxe", "Suíte Junior", "Suíte Master",
  "Piscina", "Restaurante", "Spa", "Vista", "Área Comum", "Bar", "Jardim",
];

function guessPhotoLabel(index: number): string {
  if (index === 0) return "Fachada";
  if (index === 1) return "Lobby";
  if (index <= 4) return `Quarto ${index}`;
  if (index === 5) return "Piscina";
  if (index === 6) return "Restaurante";
  return `Foto ${index + 1}`;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> {
  return await Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
    }),
  ]);
}

/* ═══ Component ═══ */
export default function PlacesSearchCard({
  initialQuery = "",
  destinationContext,
  onEnrich,
  onCancel,
  className,
}: PlacesSearchCardProps) {
  // Search state
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Details state
  const [selectedPlace, setSelectedPlace] = useState<PlaceDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [loadingPhotos, setLoadingPhotos] = useState(false);

  // Curation state
  const [curatedPhotos, setCuratedPhotos] = useState<CuratedPhoto[]>([]);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const requestIdRef = useRef(0);
  const disableEdgeSearchRef = useRef(false);
  const disableClientGoogleRef = useRef(false);

  /* ── Search ── */
  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    setError(null);

    // Primary: use places-search edge function (server-side Google API key)
    try {
      const { data, error: fnError } = await supabase.functions.invoke("places-search", {
        body: {
          action: "search",
          query: destinationContext ? `${q} ${destinationContext}` : q,
        },
      });

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      const mapped: PlaceResult[] = (data?.results || []).map((item: any) => ({
        place_id: item.place_id,
        name: item.name,
        address: item.address || "",
        rating: item.rating ?? null,
        user_ratings_total: item.user_ratings_total || 0,
        types: item.types || [],
        photo_reference: item.photo_reference || null,
        location: item.location || null,
        price_level: item.price_level ?? null,
      }));

      setResults(mapped);
      if (mapped.length === 0) setError("Nenhum local encontrado");
      setLoading(false);
      return;
    } catch (err) {
      console.error("places-search edge function error:", err);
    }

    // Fallback: client-side Google Maps JS SDK
    try {
      const data = await searchPlaces(destinationContext ? `${q} ${destinationContext}` : q);
      if (data.length > 0) {
        setResults(data);
        setLoading(false);
        return;
      }
    } catch (err) {
      console.error("Client-side Places search error:", err);
    }

    // Last resort: hotel-search (Nominatim)
    try {
      const { data, error: fnError } = await supabase.functions.invoke("hotel-search", {
        body: { query: q },
      });

      if (fnError) throw fnError;

      const fallbackResults: PlaceResult[] = (data?.results || []).map((item: any) => ({
        place_id: `fallback:${item.place_id || item.name}`,
        name: item.name || q,
        address: [item.address, item.city, item.country].filter(Boolean).join(", "),
        rating: null,
        user_ratings_total: 0,
        types: ["lodging"],
        photo_reference: null,
        location: Number.isFinite(Number(item.lat)) && Number.isFinite(Number(item.lng))
          ? { lat: Number(item.lat), lng: Number(item.lng) }
          : null,
        price_level: null,
      }));

      setResults(fallbackResults);
      setError(fallbackResults.length === 0 ? "Nenhum hotel encontrado" : null);
    } catch (fallbackErr) {
      console.error("Fallback hotel-search error:", fallbackErr);
      setError("Não foi possível buscar locais. Tente novamente.");
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

  /* ── Select place & load details ── */
  const selectPlace = useCallback(async (placeId: string) => {
    setLoadingDetails(true);
    setError(null);

    // Resultado de fallback (hotel-search)
    if (placeId.startsWith("fallback:")) {
      const fallback = results.find((r) => r.place_id === placeId);
      if (fallback) {
        setSelectedPlace({
          place_id: fallback.place_id,
          name: fallback.name,
          address: fallback.address,
          phone: null,
          website: null,
          rating: null,
          user_ratings_total: 0,
          price_level: null,
          types: fallback.types || ["lodging"],
          location: fallback.location,
          photos: [],
          editorial_summary: null,
          reviews: [],
        });
        setCuratedPhotos([]);
        setResults([]);
        setLoadingDetails(false);
        return;
      }
    }

    try {
      // Primary: edge function for details
      let data: any = null;
      try {
        const { data: edgeData, error: edgeErr } = await supabase.functions.invoke("places-search", {
          body: { action: "details", place_id: placeId },
        });
        if (edgeErr) throw edgeErr;
        if (edgeData?.error) throw new Error(edgeData.error);
        data = edgeData;
      } catch (edgeError) {
        console.error("Edge function details error, trying client-side:", edgeError);
        // Fallback: client-side
        data = await getPlaceDetails(placeId);
      }

      setSelectedPlace(data as any);
      setResults([]);

      if (data?.photos?.length > 0) {
        setLoadingPhotos(true);

        // Resolve photo URLs: edge function returns photo_reference, client-side returns full URLs
        const photos: CuratedPhoto[] = await Promise.all(
          data.photos.slice(0, 10).map(async (photo: any, i: number) => {
            let url = photo.url || "";
            if (!url && photo.photo_reference) {
              // Get photo URL from edge function
              try {
                const { data: photoData } = await supabase.functions.invoke("places-search", {
                  body: { action: "photo", photo_reference: photo.photo_reference, max_width: 800 },
                });
                url = photoData?.url || getPhotoUrl(photo.photo_reference, 800);
              } catch {
                url = getPhotoUrl(photo.photo_reference, 800);
              }
            }
            return {
              url,
              label: guessPhotoLabel(i),
              selected: i < 6,
              isCover: i === 0,
              source: "google" as const,
            };
          })
        );

        setCuratedPhotos(photos);
        setLoadingPhotos(false);
      }
    } catch (err) {
      console.error("Places details error:", err);
      const message = err instanceof Error ? err.message : "Não foi possível carregar detalhes do local";
      setError(message);
    } finally {
      setLoadingDetails(false);
    }
  }, [results]);

  /* ── Photo curation actions ── */
  const toggleSelect = (idx: number) => {
    setCuratedPhotos(prev => prev.map((p, i) => i === idx ? { ...p, selected: !p.selected } : p));
  };

  const setCover = (idx: number) => {
    setCuratedPhotos(prev => prev.map((p, i) => ({
      ...p,
      isCover: i === idx,
      selected: i === idx ? true : p.selected, // Cover must be selected
    })));
  };

  const updateLabel = (idx: number, label: string) => {
    setCuratedPhotos(prev => prev.map((p, i) => i === idx ? { ...p, label } : p));
  };

  const removePhoto = (idx: number) => {
    setCuratedPhotos(prev => {
      const next = prev.filter((_, i) => i !== idx);
      if (prev[idx].isCover && next.length > 0) next[0].isCover = true;
      return next;
    });
  };

  const handleDragStart = (idx: number) => setDragIdx(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    setCuratedPhotos(prev => {
      const next = [...prev];
      const [moved] = next.splice(dragIdx, 1);
      next.splice(idx, 0, moved);
      return next;
    });
    setDragIdx(idx);
  };
  const handleDragEnd = () => setDragIdx(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      const url = URL.createObjectURL(file);
      setCuratedPhotos(prev => [...prev, {
        url,
        label: file.name.replace(/\.[^.]+$/, ""),
        selected: true,
        isCover: false,
        source: "manual",
      }]);
    });
    e.target.value = "";
  };

  /* ── Confirm ── */
  const handleConfirm = useCallback(() => {
    if (!selectedPlace) return;
    const selected = curatedPhotos.filter(p => p.selected);
    const coverIdx = selected.findIndex(p => p.isCover);
    const allUrls = curatedPhotos.map(p => p.url);
    const selectedUrls = selected.map(p => p.url);
    const labels = selected.map(p => p.label);

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
      photos: allUrls,
      selectedPhotos: selectedUrls,
      mainPhotoIndex: coverIdx >= 0 ? coverIdx : 0,
      photoLabels: labels,
    });
  }, [selectedPlace, curatedPhotos, onEnrich]);

  /* ── Save to Media Library ── */
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();

  const saveToLibrary = useCallback(async () => {
    if (!selectedPlace || !user) return;
    setSaving(true);
    try {
      // Resolve place type from Google types
      const isHotel = selectedPlace.types.some(t => ["lodging", "hotel"].includes(t));
      const isRestaurant = selectedPlace.types.some(t => ["restaurant", "cafe", "bar"].includes(t));
      const placeType = isHotel ? "hotel" : isRestaurant ? "restaurant" : "attraction";

      // Parse city/country from address
      const addressParts = (selectedPlace.address || "").split(",").map(s => s.trim());
      const country = addressParts.length >= 2 ? addressParts[addressParts.length - 1] : null;
      const city = addressParts.length >= 3 ? addressParts[addressParts.length - 2] : addressParts[0] || null;

      const selected = curatedPhotos.filter(p => p.selected);
      const coverPhoto = selected.find(p => p.isCover) || selected[0];

      // Upsert place
      const { data: placeData, error: placeErr } = await supabase
        .from("media_places")
        .upsert({
          place_id: selectedPlace.place_id,
          name: selectedPlace.name,
          place_type: placeType,
          city,
          country,
          address: selectedPlace.address,
          rating: selectedPlace.rating,
          user_ratings_total: selectedPlace.user_ratings_total,
          website: selectedPlace.website,
          phone: selectedPlace.phone,
          location: selectedPlace.location,
          types: selectedPlace.types,
          editorial_summary: selectedPlace.editorial_summary,
          cover_image_url: coverPhoto?.url || null,
          created_by: user.id,
          updated_at: new Date().toISOString(),
        } as any, { onConflict: "place_id" })
        .select("id")
        .single();

      if (placeErr) throw placeErr;

      // Insert media items
      const mediaItems = selected.map((photo, i) => ({
        place_id: placeData.id,
        image_url: photo.url,
        label: photo.label || `Foto ${i + 1}`,
        image_type: "geral",
        is_cover: photo.isCover,
        sort_order: i,
        source: photo.source,
        status: photo.isCover ? "capa" : "aprovada",
        created_by: user.id,
      }));

      // Delete existing items for this place first
      await supabase.from("media_items").delete().eq("place_id", placeData.id);
      const { error: itemsErr } = await supabase.from("media_items").insert(mediaItems as any);
      if (itemsErr) throw itemsErr;

      toast.success(`"${selectedPlace.name}" salvo na biblioteca de mídias!`);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar na biblioteca");
    } finally {
      setSaving(false);
    }
  }, [selectedPlace, curatedPhotos, user]);

  const handleReset = () => {
    setSelectedPlace(null);
    setCuratedPhotos([]);
    setLightboxIdx(null);
    setQuery("");
    setResults([]);
    setError(null);
  };

  const selectedCount = curatedPhotos.filter(p => p.selected).length;
  const coverPhoto = curatedPhotos.find(p => p.isCover && p.selected);

  /* ═══════════════════════════════════════════════════════ */
  /* ═══ STEP 2: Details + Photo Curation View ═══ */
  /* ═══════════════════════════════════════════════════════ */
  if (selectedPlace) {
    return (
      <div className={cn("border border-border rounded-2xl bg-card overflow-hidden shadow-lg", className)}>
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-border bg-gradient-to-r from-primary/5 to-transparent flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Camera className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <span className="text-sm font-bold text-foreground block truncate">Curadoria de Conteúdo</span>
              <span className="text-[10px] text-muted-foreground">Google Places</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button variant="ghost" size="sm" onClick={handleReset} className="h-7 px-2 text-xs gap-1">
              <RotateCcw className="h-3 w-3" /> Buscar outro
            </Button>
            <Button variant="ghost" size="icon" onClick={onCancel} className="h-7 w-7">
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Place info bar */}
        <div className="px-5 py-3 bg-muted/20 border-b border-border/50 flex items-start gap-3">
          {coverPhoto && (
            <div className="w-16 h-12 rounded-lg overflow-hidden shrink-0 shadow-sm">
              <img src={coverPhoto.url} alt="" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-foreground truncate">{selectedPlace.name}</h3>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
              <MapPin className="h-3 w-3 shrink-0" /> {selectedPlace.address}
            </p>
            <div className="flex items-center gap-2 mt-1">
              {selectedPlace.rating && (
                <span className="inline-flex items-center gap-1 text-warning text-xs font-semibold">
                  <Star className="h-3 w-3 fill-warning" /> {selectedPlace.rating.toFixed(1)}
                  <span className="text-muted-foreground/60 font-normal">({selectedPlace.user_ratings_total})</span>
                </span>
              )}
              <Badge variant="outline" className="text-[9px] h-4">{resolveType(selectedPlace.types)}</Badge>
              {selectedPlace.price_level != null && (
                <Badge variant="outline" className="text-[9px] h-4">{"$".repeat(selectedPlace.price_level)}</Badge>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1 shrink-0 text-right">
            {selectedPlace.website && (
              <a href={selectedPlace.website} target="_blank" rel="noreferrer" className="text-[10px] text-primary hover:underline flex items-center gap-1 justify-end">
                <Globe className="h-3 w-3" /> Website
              </a>
            )}
            {selectedPlace.phone && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-1 justify-end">
                <Phone className="h-3 w-3" /> {selectedPlace.phone}
              </span>
            )}
          </div>
        </div>

        {selectedPlace.editorial_summary && (
          <div className="px-5 py-2.5 border-b border-border/30">
            <p className="text-xs text-muted-foreground leading-relaxed border-l-2 border-primary/30 pl-3 italic">
              {selectedPlace.editorial_summary}
            </p>
          </div>
        )}

        {/* ── Photo Gallery Curation ── */}
        <div className="px-5 py-3 border-b border-border/30">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-primary" />
              <span className="text-xs font-bold text-foreground">Galeria de Fotos</span>
              <Badge variant="secondary" className="text-[9px] h-4">
                {selectedCount} selecionada{selectedCount !== 1 ? "s" : ""}
              </Badge>
            </div>
            <div className="flex items-center gap-1.5">
              {selectedCount < 5 && (
                <span className="text-[9px] text-muted-foreground/60 flex items-center gap-1">
                  <Info className="h-3 w-3" /> Ideal: 5–8 fotos
                </span>
              )}
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="h-7 px-2 text-[10px] gap-1">
                <Upload className="h-3 w-3" /> Upload
              </Button>
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileUpload} />
            </div>
          </div>

          {loadingPhotos ? (
            <div className="flex items-center justify-center py-10 gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Carregando fotos do Google...</span>
            </div>
          ) : curatedPhotos.length > 0 ? (
            <ScrollArea className="max-h-[360px]">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {curatedPhotos.map((photo, i) => (
                  <div
                    key={i}
                    draggable
                    onDragStart={() => handleDragStart(i)}
                    onDragOver={(e) => handleDragOver(e, i)}
                    onDragEnd={handleDragEnd}
                    className={cn(
                      "group relative rounded-xl overflow-hidden border-2 transition-all cursor-grab active:cursor-grabbing",
                      photo.selected
                        ? photo.isCover
                          ? "border-primary ring-2 ring-primary/20 shadow-md"
                          : "border-primary/50 shadow-sm"
                        : "border-border/30 opacity-50 hover:opacity-80",
                      dragIdx === i && "scale-95 opacity-70"
                    )}
                  >
                    {/* Image */}
                    <div className="aspect-[4/3] bg-muted/20 relative">
                      <img src={photo.url} alt={photo.label} className="w-full h-full object-cover" loading="lazy" />

                      {/* Overlay actions */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />

                      {/* Top-left: Selection checkbox */}
                      <button
                        onClick={() => toggleSelect(i)}
                        className="absolute top-1.5 left-1.5 z-10"
                      >
                        {photo.selected ? (
                          <CheckSquare className="h-5 w-5 text-primary drop-shadow-md" />
                        ) : (
                          <Square className="h-5 w-5 text-white/80 drop-shadow-md" />
                        )}
                      </button>

                      {/* Top-right: Drag handle + actions */}
                      <div className="absolute top-1.5 right-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <button onClick={() => setLightboxIdx(i)} className="w-6 h-6 rounded-md bg-black/40 backdrop-blur-sm flex items-center justify-center hover:bg-black/60">
                          <Maximize2 className="h-3 w-3 text-white" />
                        </button>
                        <button onClick={() => removePhoto(i)} className="w-6 h-6 rounded-md bg-black/40 backdrop-blur-sm flex items-center justify-center hover:bg-destructive/80">
                          <X className="h-3 w-3 text-white" />
                        </button>
                      </div>

                      {/* Cover badge */}
                      {photo.isCover && photo.selected && (
                        <div className="absolute top-1.5 left-1/2 -translate-x-1/2 z-10">
                          <Badge className="bg-primary text-primary-foreground text-[8px] h-4 px-1.5 gap-0.5 shadow-md">
                            <Crown className="h-2.5 w-2.5" /> CAPA
                          </Badge>
                        </div>
                      )}

                      {/* Source badge */}
                      {photo.source === "manual" && (
                        <div className="absolute bottom-1.5 right-1.5 z-10">
                          <Badge variant="secondary" className="text-[8px] h-4 px-1.5 bg-background/80 backdrop-blur-sm">
                            Upload
                          </Badge>
                        </div>
                      )}

                      {/* Bottom: Label + Set as cover */}
                      <div className="absolute bottom-0 left-0 right-0 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-end justify-between gap-1">
                        {photo.selected && !photo.isCover && (
                          <button
                            onClick={() => setCover(i)}
                            className="text-[9px] font-medium text-white bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-md hover:bg-primary/80 transition-colors flex items-center gap-1 whitespace-nowrap"
                          >
                            <Crown className="h-2.5 w-2.5" /> Definir capa
                          </button>
                        )}
                        <div className="flex-1" />
                        <GripVertical className="h-4 w-4 text-white/60" />
                      </div>
                    </div>

                    {/* Label */}
                    <div className="px-2 py-1.5 bg-card">
                      <input
                        type="text"
                        value={photo.label}
                        onChange={(e) => updateLabel(i, e.target.value)}
                        className="w-full text-[10px] font-medium text-foreground bg-transparent outline-none placeholder:text-muted-foreground/40 truncate"
                        placeholder="Legenda..."
                      />
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-8">
              <ImageIcon className="h-10 w-10 text-muted-foreground/20 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Sem fotos disponíveis</p>
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="mt-2 text-xs gap-1">
                <Upload className="h-3 w-3" /> Adicionar fotos manualmente
              </Button>
            </div>
          )}
        </div>

        {/* ── Proposal Preview ── */}
        {selectedCount > 0 && (
          <div className="px-5 py-3 border-b border-border/30 bg-muted/10">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] font-bold text-foreground uppercase tracking-wider">Preview na Proposta</span>
            </div>
            <div className="rounded-xl border border-border/50 overflow-hidden bg-card shadow-sm">
              {coverPhoto && (
                <div className="h-32 overflow-hidden">
                  <img src={coverPhoto.url} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="p-3">
                <h4 className="text-sm font-bold text-foreground">{selectedPlace.name}</h4>
                <p className="text-[10px] text-muted-foreground mt-0.5">{selectedPlace.address}</p>
                {selectedPlace.rating && (
                  <span className="text-[10px] text-warning flex items-center gap-0.5 mt-1">
                    <Star className="h-3 w-3 fill-warning" /> {selectedPlace.rating.toFixed(1)}
                  </span>
                )}
                {selectedCount > 1 && (
                  <div className="flex gap-1 mt-2 overflow-x-auto">
                    {curatedPhotos.filter(p => p.selected && !p.isCover).slice(0, 4).map((p, i) => (
                      <div key={i} className="w-12 h-9 rounded-md overflow-hidden shrink-0">
                        <img src={p.url} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                    {selectedCount > 5 && (
                      <div className="w-12 h-9 rounded-md bg-muted/60 flex items-center justify-center shrink-0 text-[9px] font-semibold text-muted-foreground">
                        +{selectedCount - 5}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Actions ── */}
        <div className="px-5 py-3 flex items-center gap-2">
          <Button onClick={handleConfirm} disabled={selectedCount === 0} className="flex-1 gap-2">
            <Sparkles className="h-4 w-4" /> Usar na proposta · {selectedCount} foto{selectedCount !== 1 ? "s" : ""}
          </Button>
          <Button variant="outline" onClick={saveToLibrary} disabled={selectedCount === 0 || saving} className="gap-1.5">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {saving ? "Salvando..." : "Salvar na biblioteca"}
          </Button>
        </div>

        {/* ── Lightbox ── */}
        <Dialog open={lightboxIdx !== null} onOpenChange={() => setLightboxIdx(null)}>
          <DialogContent className="max-w-3xl p-0 overflow-hidden bg-black/95 border-none">
            {lightboxIdx !== null && curatedPhotos[lightboxIdx] && (
              <div className="relative">
                <img
                  src={curatedPhotos[lightboxIdx].url}
                  alt={curatedPhotos[lightboxIdx].label}
                  className="w-full max-h-[80vh] object-contain"
                />
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                  <p className="text-white text-sm font-semibold">{curatedPhotos[lightboxIdx].label}</p>
                  <p className="text-white/60 text-xs">{resolveType(selectedPlace.types)} · Foto {lightboxIdx + 1} de {curatedPhotos.length}</p>
                </div>
                {lightboxIdx > 0 && (
                  <button onClick={() => setLightboxIdx(i => i !== null ? i - 1 : null)} className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70">
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                )}
                {lightboxIdx < curatedPhotos.length - 1 && (
                  <button onClick={() => setLightboxIdx(i => i !== null ? i + 1 : null)} className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70">
                    <ChevronRight className="h-5 w-5" />
                  </button>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════ */
  /* ═══ STEP 1: Search View ═══ */
  /* ═══════════════════════════════════════════════════════ */
  return (
    <div className={cn("border border-border rounded-2xl bg-card overflow-hidden shadow-lg", className)}>
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-border bg-gradient-to-r from-primary/5 to-transparent flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Search className="h-4 w-4 text-primary" />
          </div>
          <div>
            <span className="text-sm font-bold text-foreground block">Buscar no Google Places</span>
            <span className="text-[10px] text-muted-foreground">Hotéis, atrações, restaurantes</span>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onCancel} className="h-7 w-7">
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Search Input */}
      <div className="p-4">
        <div className="relative">
          <Input
            value={query}
            onChange={(e) => handleInput(e.target.value)}
            placeholder="Buscar hotel, lugar ou atração..."
            className="pr-8 h-11 text-sm"
            autoFocus
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <Search className="h-4 w-4 text-muted-foreground/40" />
            )}
          </div>
        </div>
        {destinationContext && (
          <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
            <MapPin className="h-2.5 w-2.5" /> Prioridade: {destinationContext}
          </p>
        )}
      </div>

      {error && (
        <div className="px-4 pb-3">
          <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
        </div>
      )}

      {loadingDetails && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Importando dados e fotos...</span>
          <span className="text-[10px] text-muted-foreground/60">Isso pode levar alguns segundos</span>
        </div>
      )}

      {results.length > 0 && !loadingDetails && (
        <ScrollArea className="max-h-[380px]">
          <div className="px-3 pb-3 space-y-1">
            {results.map((place) => (
              <button
                key={place.place_id}
                onClick={() => selectPlace(place.place_id)}
                className="w-full text-left flex items-start gap-3 px-3 py-3 rounded-xl hover:bg-muted/50 transition-all border border-transparent hover:border-border/50 hover:shadow-sm"
              >
                {place.photo_reference ? (
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted/20 shrink-0 shadow-sm">
                    <PlaceThumbnail photoRef={place.photo_reference} alt={place.name} />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-muted/30 flex items-center justify-center shrink-0">
                    <MapPin className="h-5 w-5 text-muted-foreground/40" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{place.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">{place.address}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    {place.rating && (
                      <span className="inline-flex items-center gap-1 text-warning text-xs font-semibold">
                        <Star className="h-3 w-3 fill-warning" /> {place.rating.toFixed(1)}
                      </span>
                    )}
                    {place.user_ratings_total > 0 && (
                      <span className="text-[10px] text-muted-foreground">({place.user_ratings_total})</span>
                    )}
                    <Badge variant="outline" className="text-[9px] h-4 px-1.5">{resolveType(place.types)}</Badge>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/30 shrink-0 mt-5" />
              </button>
            ))}
          </div>
        </ScrollArea>
      )}

      {query.length >= 2 && results.length === 0 && !loading && !loadingDetails && !error && (
        <div className="px-4 pb-6 text-center py-8">
          <MapPin className="h-10 w-10 text-muted-foreground/15 mx-auto mb-3" />
          <p className="text-xs text-muted-foreground">Nenhum local encontrado</p>
          <p className="text-[10px] text-muted-foreground/50 mt-1">Tente outro nome ou endereço</p>
        </div>
      )}
    </div>
  );
}

/* ═══ Thumbnail subcomponent ═══ */
function PlaceThumbnail({ photoRef, alt }: { photoRef: string; alt: string }) {
  const [src, setSrc] = useState<string>(() => {
    // If it's already a full URL, use it directly
    if (/^https?:\/\//i.test(photoRef)) return photoRef;
    return "";
  });

  useEffect(() => {
    if (src) return; // Already resolved
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.functions.invoke("places-search", {
          body: { action: "photo", photo_reference: photoRef, max_width: 200 },
        });
        if (!cancelled && data?.url) setSrc(data.url);
      } catch {
        // Fallback to client-side URL builder
        if (!cancelled) setSrc(getPhotoUrl(photoRef, 200));
      }
    })();
    return () => { cancelled = true; };
  }, [photoRef, src]);

  if (!src) return <div className="w-full h-full bg-muted/30 flex items-center justify-center"><MapPin className="h-4 w-4 text-muted-foreground/30" /></div>;
  return <img src={src} alt={alt} className="w-full h-full object-cover" />;
}
