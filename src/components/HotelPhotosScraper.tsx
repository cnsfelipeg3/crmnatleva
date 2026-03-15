import { useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Camera, Loader2, ExternalLink, Check, ChevronLeft, ChevronRight, ZoomIn, Info, X, MapPin, Globe, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export interface HotelPhoto {
  url: string;
  alt: string;
  category: string;
  confidence: number;
  environment_name?: string;
  room_name?: string;
  room_type?: string;
  bed_type?: string;
  description?: string;
  room_details?: {
    size_sqm?: number;
    max_guests?: number;
    bed_type?: string;
    amenities?: string[];
    view?: string;
  };
}

interface Props {
  hotelName: string;
  hotelCity: string;
  hotelCountry: string;
  onSelectPhotos?: (photos: HotelPhoto[]) => void;
}

const categoryIcons: Record<string, string> = {
  fachada: "🏨", lobby: "🛎️", piscina: "🏊", praia: "🏖️",
  restaurante: "🍽️", bar: "🍹", spa: "💆", academia: "🏋️",
  quarto: "🛏️", suite: "👑", banheiro: "🚿",
  area_comum: "🌿", vista: "🌅", jardim: "🌺", eventos: "🎪", outro: "📷",
};

const categorySortOrder = [
  "fachada", "lobby", "quarto", "suite", "banheiro", "piscina", "praia",
  "restaurante", "bar", "spa", "academia", "area_comum", "jardim", "vista", "eventos", "outro"
];

function isGoogleJsPhotoServiceUrl(value: string): boolean {
  return /maps\.googleapis\.com\/maps\/api\/place\/js\/PhotoService\.GetPhoto/i.test(value);
}

function extractGoogleJsPhotoReference(value: string): string | null {
  const match = value.match(/[?&]1s([^&]+)/i);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

async function resolveGooglePhotoUrl(url: string): Promise<string> {
  if (!url || !isGoogleJsPhotoServiceUrl(url)) return url;
  const photoReference = extractGoogleJsPhotoReference(url);
  if (!photoReference) return url;
  try {
    const { data, error } = await supabase.functions.invoke("places-search", {
      body: { action: "photo", photo_reference: photoReference, max_width: 1200 },
    });
    if (error || data?.error || !data?.url) return url;
    return data.url;
  } catch { return url; }
}

async function resolveHotelPhotosUrls(inputPhotos: HotelPhoto[]): Promise<HotelPhoto[]> {
  const cache = new Map<string, string>();
  return Promise.all(
    inputPhotos.map(async (photo) => {
      if (cache.has(photo.url)) return { ...photo, url: cache.get(photo.url) || photo.url };
      const resolvedUrl = await resolveGooglePhotoUrl(photo.url);
      cache.set(photo.url, resolvedUrl);
      return { ...photo, url: resolvedUrl };
    })
  );
}

async function fetchProxiedImageUrl(imageUrl: string, refererUrl?: string): Promise<string> {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!projectId || !publishableKey) throw new Error("Configuração do backend indisponível");

  const { data: { session } } = await supabase.auth.getSession();

  const response = await fetch(`https://${projectId}.supabase.co/functions/v1/image-proxy`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: publishableKey,
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify({ imageUrl, refererUrl }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(errorText || `Falha no proxy (${response.status})`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const data = await response.json();
    if (data.publicUrl) return data.publicUrl;
    throw new Error("Resposta inesperada do proxy");
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

async function classifyPhotosWithAI(photos: HotelPhoto[], hotelName: string, roomNames?: string[]): Promise<HotelPhoto[]> {
  if (photos.length === 0) return photos;

  try {
    const { data, error } = await supabase.functions.invoke("classify-hotel-photos", {
      body: { photo_urls: photos.map(p => p.url), hotel_name: hotelName, room_names: roomNames || [] },
    });

    if (error || !data?.photos) {
      console.warn("Classification failed, returning unclassified photos");
      return photos;
    }

    const classified = data.photos as Array<{
      index: number;
      environment_name?: string;
      category?: string;
      room_type?: string;
      bed_type?: string;
      description?: string;
      confidence?: number;
    }>;

    return photos.map((photo, idx) => {
      const match = classified.find(c => c.index === idx);
      if (!match) return photo;

      return {
        ...photo,
        environment_name: match.environment_name || photo.environment_name,
        category: match.category || photo.category,
        room_name: match.environment_name || photo.room_name,
        room_type: match.room_type || photo.room_type,
        bed_type: match.bed_type || photo.bed_type,
        description: match.description || photo.description,
        confidence: match.confidence ?? photo.confidence,
      };
    });
  } catch (err) {
    console.error("Classification error:", err);
    return photos;
  }
}

export default function HotelPhotosScraper({ hotelName, hotelCity, hotelCountry, onSelectPhotos }: Props) {
  const [loading, setLoading] = useState(false);
  const [loadingSource, setLoadingSource] = useState<"google" | "official" | null>(null);
  const [classifying, setClassifying] = useState(false);
  const [photos, setPhotos] = useState<HotelPhoto[]>([]);
  const [sourceUrl, setSourceUrl] = useState("");
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [scraped, setScraped] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [activeSource, setActiveSource] = useState<"google" | "official" | null>(null);
  const [proxiedImageUrls, setProxiedImageUrls] = useState<Record<string, string>>({});
  const [failedImageUrls, setFailedImageUrls] = useState<Set<string>>(new Set());
  const [resolvingImageUrls, setResolvingImageUrls] = useState<Set<string>>(new Set());
  const [knownRoomNames, setKnownRoomNames] = useState<string[]>([]);
  const proxiedObjectUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    return () => {
      proxiedObjectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      proxiedObjectUrlsRef.current = [];
    };
  }, []);

  const clearProxiedImages = useCallback(() => {
    proxiedObjectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    proxiedObjectUrlsRef.current = [];
    setProxiedImageUrls({});
    setFailedImageUrls(new Set());
    setResolvingImageUrls(new Set());
  }, []);

  const resolveImageForDisplay = useCallback(async (url: string) => {
    if (!url || proxiedImageUrls[url] || failedImageUrls.has(url) || resolvingImageUrls.has(url)) return;

    setResolvingImageUrls((prev) => new Set(prev).add(url));
    try {
      const resolvedUrl = await fetchProxiedImageUrl(url, sourceUrl || undefined);
      proxiedObjectUrlsRef.current.push(resolvedUrl);
      setProxiedImageUrls((prev) => ({ ...prev, [url]: resolvedUrl }));
      setFailedImageUrls((prev) => { const next = new Set(prev); next.delete(url); return next; });
    } catch {
      setFailedImageUrls((prev) => new Set(prev).add(url));
    } finally {
      setResolvingImageUrls((prev) => { const next = new Set(prev); next.delete(url); return next; });
    }
  }, [failedImageUrls, proxiedImageUrls, resolvingImageUrls, sourceUrl]);

  const handleImageError = useCallback((url: string) => {
    if (!url) return;
    if (proxiedImageUrls[url]) { setFailedImageUrls((prev) => new Set(prev).add(url)); return; }
    void resolveImageForDisplay(url);
  }, [proxiedImageUrls, resolveImageForDisplay]);

  const getDisplayUrl = useCallback((url: string) => proxiedImageUrls[url] || url, [proxiedImageUrls]);

  const preloadViaProxy = useCallback(async (photosToLoad: HotelPhoto[], refererUrl?: string) => {
    const batchSize = 5;
    for (let i = 0; i < photosToLoad.length; i += batchSize) {
      const batch = photosToLoad.slice(i, i + batchSize);
      await Promise.allSettled(
        batch.map(async (photo) => {
          if (!photo.url) return;
          try {
            const resolvedUrl = await fetchProxiedImageUrl(photo.url, refererUrl);
            proxiedObjectUrlsRef.current.push(resolvedUrl);
            setProxiedImageUrls((prev) => ({ ...prev, [photo.url]: resolvedUrl }));
          } catch { /* fallback to direct URL */ }
        })
      );
    }
  }, []);

  const runClassification = useCallback(async (photosToClassify: HotelPhoto[]) => {
    setClassifying(true);
    toast.info("🤖 Classificando fotos por ambiente...", { duration: 3000 });
    try {
      const classified = await classifyPhotosWithAI(photosToClassify, hotelName);
      setPhotos(classified);
      const envCount = new Set(classified.map(p => p.environment_name).filter(Boolean)).size;
      toast.success(`✨ ${envCount} ambientes identificados em ${classified.length} fotos`);
    } catch {
      toast.error("Erro ao classificar fotos");
    } finally {
      setClassifying(false);
    }
  }, [hotelName]);

  const fetchGooglePlacesPhotos = async () => {
    if (!hotelName) { toast.error("Selecione um hotel primeiro"); return; }
    setLoading(true);
    setLoadingSource("google");
    try {
      const searchQuery = `${hotelName} ${hotelCity || ""} ${hotelCountry || ""} hotel`.trim();
      const { data: searchData, error: searchError } = await supabase.functions.invoke("places-search", {
        body: { action: "search", query: searchQuery },
      });
      if (searchError) throw searchError;

      const results = searchData?.results || [];
      if (results.length === 0) { toast.info("Hotel não encontrado no Google Places"); return; }

      const placeId = results[0].place_id;
      if (!placeId || placeId.startsWith("fallback:")) {
        toast.info("Fotos não disponíveis para este local no Google Places");
        return;
      }

      const { data: detailsData, error: detailsError } = await supabase.functions.invoke("places-search", {
        body: { action: "details", place_id: placeId },
      });
      if (detailsError) throw detailsError;

      const placePhotos = detailsData?.photos || [];
      if (placePhotos.length === 0) { toast.info("Nenhuma foto encontrada no Google Places"); return; }

      const resolvedPhotos: HotelPhoto[] = await Promise.all(
        placePhotos.map(async (ph: any, idx: number) => {
          let url = "";
          try {
            const { data: photoData } = await supabase.functions.invoke("places-search", {
              body: { action: "photo", photo_reference: ph.photo_reference, max_width: 1200 },
            });
            url = photoData?.url || "";
          } catch { /* skip */ }
          return { url, alt: `${hotelName} foto ${idx + 1}`, category: "outro", confidence: 0.5 } as HotelPhoto;
        })
      );

      const validPhotos = resolvedPhotos.filter(p => p.url);
      clearProxiedImages();
      setPhotos(validPhotos);
      setSourceUrl("");
      setScraped(true);
      setActiveSource("google");

      if (validPhotos.length > 0) {
        toast.success(`${validPhotos.length} fotos encontradas via Google Places`);
        preloadViaProxy(validPhotos);
        // Auto-classify
        await runClassification(validPhotos);
      } else {
        toast.info("Não foi possível carregar as fotos do Google Places");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao buscar fotos no Google Places");
    } finally {
      setLoading(false);
      setLoadingSource(null);
    }
  };

  const scrapePhotos = async () => {
    if (!hotelName) { toast.error("Selecione um hotel primeiro"); return; }
    setLoading(true);
    setLoadingSource("official");
    try {
      const { data, error } = await supabase.functions.invoke("scrape-hotel-photos", {
        body: { hotel_name: hotelName, hotel_city: hotelCity, hotel_country: hotelCountry },
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      const rawPhotos: HotelPhoto[] = data.photos || [];
      const resolvedPhotos = await resolveHotelPhotosUrls(rawPhotos);

      clearProxiedImages();
      setPhotos(resolvedPhotos);
      setSourceUrl(data.source_url || "");
      setScraped(true);
      setActiveSource("official");

      if (resolvedPhotos.length > 0) {
        toast.success(`${resolvedPhotos.length} fotos encontradas no site oficial`);
        preloadViaProxy(resolvedPhotos, data.source_url || undefined);
        // Auto-classify
        await runClassification(resolvedPhotos);
      } else {
        toast.info("Nenhuma foto encontrada. Tente Google Places.");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao buscar fotos do hotel");
    } finally {
      setLoading(false);
      setLoadingSource(null);
    }
  };

  const toggleSelect = useCallback((url: string) => {
    setSelectedPhotos(prev => {
      const next = new Set(prev);
      next.has(url) ? next.delete(url) : next.add(url);
      return next;
    });
  }, []);

  const handleConfirmSelection = () => {
    const selected = photos.filter(p => selectedPhotos.has(p.url));
    onSelectPhotos?.(selected);
    toast.success(`${selected.length} fotos adicionadas à proposta`);
  };

  // Group by environment_name (real name from AI), falling back to category
  const grouped = photos.reduce((acc, photo) => {
    const key = photo.environment_name || photo.room_name || photo.category || "outro";
    if (!acc[key]) acc[key] = { photos: [], category: photo.category || "outro" };
    acc[key].photos.push(photo);
    return acc;
  }, {} as Record<string, { photos: HotelPhoto[]; category: string }>);

  // Sort groups: by category order, then alphabetically within same category
  const sortedGroupKeys = Object.keys(grouped).sort((a, b) => {
    const catA = categorySortOrder.indexOf(grouped[a].category);
    const catB = categorySortOrder.indexOf(grouped[b].category);
    const orderA = catA >= 0 ? catA : 99;
    const orderB = catB >= 0 ? catB : 99;
    if (orderA !== orderB) return orderA - orderB;
    return a.localeCompare(b, "pt-BR");
  });

  // Flat list for lightbox
  const allPhotos = sortedGroupKeys.flatMap(key => grouped[key].photos);
  const lightboxPhoto = lightboxIndex !== null ? allPhotos[lightboxIndex] : null;

  const goNext = useCallback(() => {
    if (lightboxIndex === null) return;
    setLightboxIndex((lightboxIndex + 1) % allPhotos.length);
  }, [lightboxIndex, allPhotos.length]);

  const goPrev = useCallback(() => {
    if (lightboxIndex === null) return;
    setLightboxIndex((lightboxIndex - 1 + allPhotos.length) % allPhotos.length);
  }, [lightboxIndex, allPhotos.length]);

  useEffect(() => {
    if (lightboxIndex === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "Escape") setLightboxIndex(null);
      else if (e.key === " ") { e.preventDefault(); if (lightboxPhoto) toggleSelect(lightboxPhoto.url); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxIndex, goNext, goPrev, lightboxPhoto, toggleSelect]);

  const openLightbox = (photo: HotelPhoto) => {
    const idx = allPhotos.findIndex(p => p.url === photo.url);
    setLightboxIndex(idx >= 0 ? idx : 0);
  };

  // --- Initial buttons ---
  if (!scraped && photos.length === 0) {
    return (
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={fetchGooglePlacesPhotos} disabled={loading || !hotelName} className="gap-2 text-xs">
          {loadingSource === "google" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MapPin className="w-3.5 h-3.5" />}
          {loadingSource === "google" ? "Buscando..." : "Google Places"}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={scrapePhotos} disabled={loading || !hotelName} className="gap-2 text-xs">
          {loadingSource === "official" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
          {loadingSource === "official" ? "Buscando..." : "Site Oficial"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">
            {activeSource === "google" ? "Google Places" : "Site Oficial"} — {hotelName}
          </span>
          <Badge variant="secondary" className="text-[10px]">{photos.length} fotos</Badge>
          {classifying && (
            <Badge variant="outline" className="text-[10px] gap-1 animate-pulse">
              <Sparkles className="w-3 h-3" /> Classificando...
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {sourceUrl && (
            <a href={sourceUrl} target="_blank" rel="noreferrer" className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-1">
              <ExternalLink className="w-3 h-3" /> Site
            </a>
          )}
          <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedPhotos(new Set(photos.map(p => p.url)))} className="text-[10px] h-6 px-2">
            Selecionar todas
          </Button>
          {/* Re-classify button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => runClassification(photos)}
            disabled={classifying || photos.length === 0}
            className="text-[10px] h-6 px-2 gap-1"
          >
            {classifying ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            Reclassificar
          </Button>
          {/* Switch source */}
          <Button
            type="button"
            variant={activeSource === "google" ? "default" : "outline"}
            size="sm"
            onClick={fetchGooglePlacesPhotos}
            disabled={loading}
            className="text-[10px] h-6 px-2 gap-1"
          >
            {loadingSource === "google" ? <Loader2 className="w-3 h-3 animate-spin" /> : <MapPin className="w-3 h-3" />}
            Google Places
          </Button>
          <Button
            type="button"
            variant={activeSource === "official" ? "default" : "outline"}
            size="sm"
            onClick={scrapePhotos}
            disabled={loading}
            className="text-[10px] h-6 px-2 gap-1"
          >
            {loadingSource === "official" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Globe className="w-3 h-3" />}
            Site Oficial
          </Button>
        </div>
      </div>

      {/* Selection bar */}
      {selectedPhotos.size > 0 && (
        <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
          <span className="text-xs font-medium text-primary">{selectedPhotos.size} foto(s) selecionada(s)</span>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedPhotos(new Set())} className="text-xs h-7">Limpar</Button>
            <Button type="button" size="sm" onClick={handleConfirmSelection} className="text-xs h-7">Usar na proposta</Button>
          </div>
        </div>
      )}

      {/* Sections grouped by real environment name */}
      <div className="space-y-5">
        {sortedGroupKeys.map(envName => {
          const group = grouped[envName];
          if (!group || group.photos.length === 0) return null;
          const cat = group.category;
          const icon = categoryIcons[cat] || "📷";

          // Show bed type / room type info from first photo
          const firstPhoto = group.photos[0];
          const roomType = firstPhoto?.room_type;
          const bedType = firstPhoto?.bed_type;

          return (
            <div key={envName} className="space-y-2">
              <div className="flex items-center gap-2 border-b border-border pb-1.5">
                <span className="text-base">{icon}</span>
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  {envName}
                </h3>
                {roomType && (
                  <Badge variant="outline" className="text-[9px] font-normal">🛏️ {roomType}</Badge>
                )}
                {bedType && !roomType?.toLowerCase().includes(bedType.toLowerCase()) && (
                  <Badge variant="outline" className="text-[9px] font-normal">Cama {bedType}</Badge>
                )}
                <Badge variant="outline" className="text-[9px] ml-auto">{group.photos.length}</Badge>
              </div>

              {/* Description from AI */}
              {firstPhoto?.description && (
                <p className="text-[11px] text-muted-foreground pl-7 -mt-1">{firstPhoto.description}</p>
              )}

              <PhotoGrid
                photos={group.photos}
                selectedPhotos={selectedPhotos}
                toggleSelect={toggleSelect}
                openLightbox={openLightbox}
                failedUrls={failedImageUrls}
                resolvingUrls={resolvingImageUrls}
                getDisplayUrl={getDisplayUrl}
                onImageError={handleImageError}
              />
            </div>
          );
        })}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && lightboxPhoto && createPortal(
        <div className="fixed inset-0 z-50 bg-black flex flex-col" role="dialog" aria-modal="true">
          <div className="absolute inset-0" onClick={() => { setLightboxIndex(null); setShowInfo(false); }} />

          {/* Top bar */}
          <div className="relative flex items-center justify-between px-3 sm:px-5 py-2.5 bg-black/90 backdrop-blur-sm z-10 shrink-0 border-b border-white/10">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <span className="text-white/50 text-xs font-mono shrink-0">
                {(lightboxIndex ?? 0) + 1}/{allPhotos.length}
              </span>
              <span className="text-white text-xs sm:text-sm font-medium truncate">
                {lightboxPhoto.environment_name || lightboxPhoto.room_name || lightboxPhoto.category}
              </span>
              {lightboxPhoto.room_type && (
                <Badge className="bg-white/10 text-white/80 text-[9px] border-0">{lightboxPhoto.room_type}</Badge>
              )}
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {lightboxPhoto.description && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowInfo(!showInfo)}
                  className="text-white/70 hover:text-white hover:bg-white/10 h-8 px-2 text-xs gap-1">
                  <Info className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Detalhes</span>
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                onClick={() => toggleSelect(lightboxPhoto.url)}
                className={cn(
                  "h-8 px-3 text-xs gap-1.5 transition-all",
                  selectedPhotos.has(lightboxPhoto.url)
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-white/10 text-white border border-white/20 hover:bg-white/20"
                )}
              >
                <Check className="w-3.5 h-3.5" />
                {selectedPhotos.has(lightboxPhoto.url) ? "Selecionada" : "Selecionar"}
              </Button>
              <button
                onClick={() => { setLightboxIndex(null); setShowInfo(false); }}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Image */}
          <div className="relative flex-1 flex items-center justify-center min-h-0 overflow-hidden px-12 sm:px-16">
            <button onClick={goPrev}
              className="absolute left-2 sm:left-4 z-10 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors backdrop-blur-sm">
              <ChevronLeft className="w-5 h-5" />
            </button>

            <img
              src={getDisplayUrl(lightboxPhoto.url)}
              alt={lightboxPhoto.environment_name || lightboxPhoto.alt || ""}
              className="max-w-full max-h-full object-contain select-none"
              draggable={false}
              referrerPolicy="no-referrer"
              crossOrigin="anonymous"
              onError={() => handleImageError(lightboxPhoto.url)}
            />

            <button onClick={goNext}
              className="absolute right-2 sm:right-4 z-10 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors backdrop-blur-sm">
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Details overlay */}
            {showInfo && lightboxPhoto.description && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/85 backdrop-blur-md text-white rounded-xl p-4 max-w-md w-[90%] sm:w-auto space-y-2 z-20 border border-white/10">
                <h4 className="font-semibold text-sm">{lightboxPhoto.environment_name || lightboxPhoto.room_name}</h4>
                <p className="text-xs text-white/80">{lightboxPhoto.description}</p>
                <div className="flex flex-wrap gap-2 text-xs text-white/70">
                  {lightboxPhoto.room_type && <span>🛏️ {lightboxPhoto.room_type}</span>}
                  {lightboxPhoto.bed_type && <span>Cama: {lightboxPhoto.bed_type}</span>}
                  {lightboxPhoto.room_details?.size_sqm && <span>📐 {lightboxPhoto.room_details.size_sqm} m²</span>}
                  {lightboxPhoto.room_details?.max_guests && <span>👥 Até {lightboxPhoto.room_details.max_guests}</span>}
                  {lightboxPhoto.room_details?.view && <span>🌅 {lightboxPhoto.room_details.view}</span>}
                </div>
                {lightboxPhoto.room_details?.amenities && lightboxPhoto.room_details.amenities.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {lightboxPhoto.room_details.amenities.map((a, i) => (
                      <span key={i} className="px-1.5 py-0.5 bg-white/10 rounded text-[10px]">{a}</span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Thumbnail strip */}
          <div className="relative px-3 sm:px-5 py-2 bg-black/90 backdrop-blur-sm shrink-0 border-t border-white/10">
            <ScrollArea className="w-full">
              <div className="flex gap-1.5">
                {allPhotos.map((p, i) => (
                  <button
                    key={p.url + i}
                    onClick={() => setLightboxIndex(i)}
                    className={cn(
                      "shrink-0 w-14 h-10 rounded overflow-hidden border-2 transition-all",
                      i === lightboxIndex ? "border-primary opacity-100 scale-110" : "border-transparent opacity-40 hover:opacity-70"
                    )}
                  >
                    <img src={getDisplayUrl(p.url)} alt="" className="w-full h-full object-cover" loading="lazy" referrerPolicy="no-referrer" crossOrigin="anonymous" onError={() => handleImageError(p.url)} />
                  </button>
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

/* ─── Photo Grid Sub-component ─── */

const PhotoGrid = ({
  photos, selectedPhotos, toggleSelect, openLightbox, failedUrls, resolvingUrls, getDisplayUrl, onImageError,
}: {
  photos: HotelPhoto[];
  selectedPhotos: Set<string>;
  toggleSelect: (url: string) => void;
  openLightbox: (photo: HotelPhoto) => void;
  failedUrls: Set<string>;
  resolvingUrls: Set<string>;
  getDisplayUrl: (url: string) => string;
  onImageError: (url: string) => void;
}) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
      {photos.map((photo, i) => {
        const isSelected = selectedPhotos.has(photo.url);
        const isFailed = failedUrls.has(photo.url);
        const isResolving = resolvingUrls.has(photo.url);
        const displayUrl = getDisplayUrl(photo.url);

        return (
          <div
            key={photo.url + i}
            className={cn(
              "relative group aspect-[3/2] rounded-md overflow-hidden border-2 transition-all cursor-pointer",
              isSelected ? "border-primary ring-1 ring-primary/30" : "border-transparent hover:border-muted-foreground/20"
            )}
            onClick={() => openLightbox(photo)}
          >
            {isFailed ? (
              <div className="w-full h-full bg-muted/50 flex flex-col items-center justify-center gap-1 p-2">
                <Camera className="w-5 h-5 text-muted-foreground/40" />
                <span className="text-[9px] text-muted-foreground/60 text-center line-clamp-2">
                  {photo.environment_name || photo.alt || "Foto indisponível"}
                </span>
              </div>
            ) : (
              <img
                src={displayUrl}
                alt={photo.environment_name || photo.alt || photo.category}
                className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                loading="lazy"
                referrerPolicy="no-referrer"
                crossOrigin="anonymous"
                onError={() => onImageError(photo.url)}
              />
            )}

            {isResolving && !isFailed && (
              <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
                <Loader2 className="w-4 h-4 text-primary animate-spin" />
              </div>
            )}

            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />

            {/* Selection */}
            <button
              onClick={(e) => { e.stopPropagation(); toggleSelect(photo.url); }}
              className={cn(
                "absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center transition-all border",
                isSelected
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-black/30 text-white border-white/30 opacity-0 group-hover:opacity-100"
              )}
            >
              <Check className="w-3 h-3" />
            </button>

            {/* Zoom icon */}
            {!isFailed && !isResolving && (
              <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <ZoomIn className="w-3.5 h-3.5 text-white drop-shadow-lg" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
