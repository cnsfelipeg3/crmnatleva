import { useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Camera, Loader2, ExternalLink, Check, ChevronLeft, ChevronRight,
  ZoomIn, Info, X, MapPin, Globe, Sparkles, FolderOpen, ChevronRight as ChevronNav,
  Bed, Maximize2, Users, Eye, Wifi, ArrowLeft, Droplets, Wind, Tv, LockKeyhole,
  Wine, Coffee, Shirt, Phone
} from "lucide-react";
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

interface SectionDetail {
  description: string;
  details: Record<string, string>;
  amenities: string[];
}

interface Props {
  hotelName: string;
  hotelCity: string;
  hotelCountry: string;
  onSelectPhotos?: (photos: HotelPhoto[]) => void;
}

const categoryConfig: Record<string, { icon: string; label: string }> = {
  quarto: { icon: "🛏️", label: "Quartos" },
  suite: { icon: "👑", label: "Suítes" },
  fachada: { icon: "🏨", label: "Fachada" },
  lobby: { icon: "🛎️", label: "Lobby" },
  piscina: { icon: "🏊", label: "Piscina" },
  praia: { icon: "🏖️", label: "Praia" },
  restaurante: { icon: "🍽️", label: "Restaurantes" },
  bar: { icon: "🍹", label: "Bar & Lounge" },
  spa: { icon: "💆", label: "Spa & Wellness" },
  academia: { icon: "🏋️", label: "Academia" },
  banheiro: { icon: "🚿", label: "Banheiros" },
  area_comum: { icon: "🌿", label: "Áreas Comuns" },
  vista: { icon: "🌅", label: "Vistas" },
  jardim: { icon: "🌺", label: "Jardim" },
  eventos: { icon: "🎪", label: "Eventos" },
  outro: { icon: "📷", label: "Outras Fotos" },
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
    if (error || !data?.photos) return photos;

    const classified = data.photos as Array<{
      index: number; environment_name?: string; category?: string;
      room_type?: string; bed_type?: string; description?: string; confidence?: number;
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
  } catch {
    return photos;
  }
}

type NavState =
  | { level: "categories" }
  | { level: "items"; category: string }
  | { level: "detail"; category: string; itemName: string };

export default function HotelPhotosScraper({ hotelName, hotelCity, hotelCountry, onSelectPhotos }: Props) {
  const [loading, setLoading] = useState(false);
  const [loadingSource, setLoadingSource] = useState<"google" | "official" | null>(null);
  const [classifying, setClassifying] = useState(false);
  const [photos, setPhotos] = useState<HotelPhoto[]>([]);
  const [sectionDetails, setSectionDetails] = useState<Record<string, SectionDetail>>({});
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
  const [nav, setNav] = useState<NavState>({ level: "categories" });
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
          } catch { /* fallback */ }
        })
      );
    }
  }, []);

  const runClassification = useCallback(async (photosToClassify: HotelPhoto[], roomNames?: string[]) => {
    setClassifying(true);
    toast.info("🤖 Classificando fotos por ambiente...", { duration: 3000 });
    try {
      const classified = await classifyPhotosWithAI(photosToClassify, hotelName, roomNames || knownRoomNames);
      setPhotos(classified);
      const envCount = new Set(classified.map(p => p.environment_name).filter(Boolean)).size;
      toast.success(`✨ ${envCount} ambientes identificados em ${classified.length} fotos`);
    } catch {
      toast.error("Erro ao classificar fotos");
    } finally {
      setClassifying(false);
    }
  }, [hotelName, knownRoomNames]);

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
      if (!placeId || placeId.startsWith("fallback:")) { toast.info("Fotos não disponíveis no Google Places"); return; }
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
      setSectionDetails({});
      setSourceUrl("");
      setScraped(true);
      setActiveSource("google");
      setNav({ level: "categories" });
      if (validPhotos.length > 0) {
        toast.success(`${validPhotos.length} fotos encontradas via Google Places`);
        preloadViaProxy(validPhotos);
        await runClassification(validPhotos);
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
      toast.info("🕷️ Navegando pelo site completo do hotel...", { duration: 5000 });
      const { data, error } = await supabase.functions.invoke("scrape-hotel-photos", {
        body: { hotel_name: hotelName, hotel_city: hotelCity, hotel_country: hotelCountry },
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      const rawPhotos: HotelPhoto[] = (data.photos || []).map((p: any) => ({
        ...p,
        environment_name: p.section_name || p.environment_name || "",
        room_name: p.section_name || p.room_name || "",
      }));
      const scraperRoomNames: string[] = data.room_names || [];
      const scrapedSectionDetails: Record<string, SectionDetail> = data.section_details || {};
      const pagesScraped: number = data.pages_scraped || 0;
      const resolvedPhotos = await resolveHotelPhotosUrls(rawPhotos);

      clearProxiedImages();
      setPhotos(resolvedPhotos);
      setSectionDetails(scrapedSectionDetails);
      setSourceUrl(data.source_url || "");
      setScraped(true);
      setActiveSource("official");
      setKnownRoomNames(scraperRoomNames);
      setNav({ level: "categories" });

      const photosWithSections = resolvedPhotos.filter(p => p.environment_name && p.environment_name.length > 2).length;
      const sectionRatio = resolvedPhotos.length > 0 ? photosWithSections / resolvedPhotos.length : 0;

      if (resolvedPhotos.length > 0) {
        const sectionCount = new Set(resolvedPhotos.map(p => p.environment_name).filter(Boolean)).size;
        toast.success(
          `📸 ${resolvedPhotos.length} fotos HD em ${pagesScraped} páginas — ${sectionCount} ambientes`,
          { duration: 5000 }
        );
        preloadViaProxy(resolvedPhotos, data.source_url || undefined);
        if (sectionRatio < 0.5) {
          await runClassification(resolvedPhotos, scraperRoomNames);
        }
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

  // Group by category → then by environment_name within each category
  const categoryGroups = photos.reduce((acc, photo) => {
    const cat = photo.category || "outro";
    const envName = photo.environment_name || photo.room_name || "Sem nome";
    if (!acc[cat]) acc[cat] = {};
    if (!acc[cat][envName]) acc[cat][envName] = [];
    acc[cat][envName].push(photo);
    return acc;
  }, {} as Record<string, Record<string, HotelPhoto[]>>);

  const sortedCategories = Object.keys(categoryGroups).sort((a, b) => {
    const idxA = categorySortOrder.indexOf(a);
    const idxB = categorySortOrder.indexOf(b);
    return (idxA >= 0 ? idxA : 99) - (idxB >= 0 ? idxB : 99);
  });

  // Current view photos for lightbox
  const currentViewPhotos = (() => {
    if (nav.level === "detail") {
      return categoryGroups[nav.category]?.[nav.itemName] || [];
    }
    if (nav.level === "items") {
      const items = categoryGroups[nav.category] || {};
      return Object.values(items).flat();
    }
    return photos;
  })();

  const lightboxPhoto = lightboxIndex !== null ? currentViewPhotos[lightboxIndex] : null;

  const goNext = useCallback(() => {
    if (lightboxIndex === null) return;
    setLightboxIndex((lightboxIndex + 1) % currentViewPhotos.length);
  }, [lightboxIndex, currentViewPhotos.length]);

  const goPrev = useCallback(() => {
    if (lightboxIndex === null) return;
    setLightboxIndex((lightboxIndex - 1 + currentViewPhotos.length) % currentViewPhotos.length);
  }, [lightboxIndex, currentViewPhotos.length]);

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
    const idx = currentViewPhotos.findIndex(p => p.url === photo.url);
    setLightboxIndex(idx >= 0 ? idx : 0);
  };

  // ── Initial buttons ──
  if (!scraped && photos.length === 0) {
    return (
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={fetchGooglePlacesPhotos} disabled={loading || !hotelName} className="gap-2 text-xs">
          {loadingSource === "google" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MapPin className="w-3.5 h-3.5" />}
          {loadingSource === "google" ? "Buscando..." : "Google Places"}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={scrapePhotos} disabled={loading || !hotelName} className="gap-2 text-xs">
          {loadingSource === "official" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
          {loadingSource === "official" ? "Navegando site completo..." : "Site Oficial (HD)"}
        </Button>
      </div>
    );
  }

  // ── Breadcrumb ──
  const renderBreadcrumb = () => {
    const crumbs: { label: string; onClick?: () => void }[] = [
      { label: "📂 Galeria", onClick: nav.level !== "categories" ? () => setNav({ level: "categories" }) : undefined },
    ];
    if (nav.level === "items" || nav.level === "detail") {
      const cfg = categoryConfig[nav.category] || { icon: "📷", label: nav.category };
      crumbs.push({
        label: `${cfg.icon} ${cfg.label}`,
        onClick: nav.level === "detail" ? () => setNav({ level: "items", category: nav.category }) : undefined,
      });
    }
    if (nav.level === "detail") {
      crumbs.push({ label: nav.itemName });
    }

    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground flex-wrap">
        {crumbs.map((c, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronNav className="w-3 h-3 text-muted-foreground/40" />}
            {c.onClick ? (
              <button onClick={c.onClick} className="hover:text-foreground transition-colors font-medium">
                {c.label}
              </button>
            ) : (
              <span className="text-foreground font-semibold">{c.label}</span>
            )}
          </span>
        ))}
      </div>
    );
  };

  // ── Category folders view ──
  const renderCategories = () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {sortedCategories.map(cat => {
        const items = categoryGroups[cat];
        const itemNames = Object.keys(items);
        const totalPhotos = Object.values(items).reduce((sum, arr) => sum + arr.length, 0);
        const coverPhoto = Object.values(items).flat()[0];
        const cfg = categoryConfig[cat] || { icon: "📷", label: cat };

        return (
          <button
            key={cat}
            onClick={() => {
              // If only one item in category, skip to detail
              if (itemNames.length === 1) {
                setNav({ level: "detail", category: cat, itemName: itemNames[0] });
              } else {
                setNav({ level: "items", category: cat });
              }
            }}
            className="group relative rounded-xl overflow-hidden border border-border/50 hover:border-primary/30 hover:shadow-md transition-all text-left bg-card"
          >
            <div className="aspect-[4/3] overflow-hidden bg-muted">
              {coverPhoto && (
                <img
                  src={getDisplayUrl(coverPhoto.url)}
                  alt={cfg.label}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  crossOrigin="anonymous"
                  onError={() => handleImageError(coverPhoto.url)}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <div className="flex items-center gap-1.5">
                <span className="text-lg">{cfg.icon}</span>
                <span className="text-sm font-bold text-white drop-shadow-lg">{cfg.label}</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-white/70">{totalPhotos} fotos</span>
                {itemNames.length > 1 && (
                  <span className="text-[10px] text-white/70">• {itemNames.length} ambientes</span>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );

  // ── Items list within a category ──
  const renderItems = () => {
    if (nav.level !== "items") return null;
    const items = categoryGroups[nav.category] || {};
    const itemNames = Object.keys(items).sort((a, b) => a.localeCompare(b, "pt-BR"));
    const cfg = categoryConfig[nav.category] || { icon: "📷", label: nav.category };

    return (
      <div className="space-y-2">
        {itemNames.map(name => {
          const itemPhotos = items[name];
          const coverPhoto = itemPhotos[0];
          const detail = sectionDetails[name];

          return (
            <button
              key={name}
              onClick={() => setNav({ level: "detail", category: nav.category, itemName: name })}
              className="w-full group flex items-stretch gap-3 rounded-xl overflow-hidden border border-border/40 hover:border-primary/30 hover:shadow-md transition-all bg-card text-left"
            >
              <div className="w-28 sm:w-36 flex-shrink-0 overflow-hidden bg-muted">
                {coverPhoto && (
                  <img
                    src={getDisplayUrl(coverPhoto.url)}
                    alt={name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 aspect-[4/3]"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    crossOrigin="anonymous"
                    onError={() => handleImageError(coverPhoto.url)}
                  />
                )}
              </div>
              <div className="flex-1 py-3 pr-3 min-w-0">
                <h4 className="text-sm font-bold text-foreground truncate">{name}</h4>
                {detail?.description && (
                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">{detail.description}</p>
                )}
                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                  <Badge variant="outline" className="text-[9px] gap-1">
                    <Camera className="w-2.5 h-2.5" /> {itemPhotos.length}
                  </Badge>
                  {detail?.details?.["Tamanho"] && (
                    <Badge variant="outline" className="text-[9px] gap-1">
                      <Maximize2 className="w-2.5 h-2.5" /> {detail.details["Tamanho"]}
                    </Badge>
                  )}
                  {detail?.details?.["Cama"] && (
                    <Badge variant="outline" className="text-[9px] gap-1">
                      <Bed className="w-2.5 h-2.5" /> {detail.details["Cama"]}
                    </Badge>
                  )}
                  {detail?.details?.["Capacidade"] && (
                    <Badge variant="outline" className="text-[9px] gap-1">
                      <Users className="w-2.5 h-2.5" /> {detail.details["Capacidade"]}
                    </Badge>
                  )}
                  {detail?.details?.["Vista"] && (
                    <Badge variant="outline" className="text-[9px] gap-1">
                      <Eye className="w-2.5 h-2.5" /> {detail.details["Vista"]}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center pr-3">
                <ChevronNav className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  // ── Detail view: photos + info for a specific item ──
  const renderDetail = () => {
    if (nav.level !== "detail") return null;
    const itemPhotos = categoryGroups[nav.category]?.[nav.itemName] || [];
    const detail = sectionDetails[nav.itemName];
    const hasInfo = detail && (detail.description || Object.keys(detail.details).length > 0 || detail.amenities.length > 0);

    // Map detail keys to icons
    const detailIcons: Record<string, React.ReactNode> = {
      "Tamanho": <Maximize2 className="w-4 h-4" />,
      "Cama": <Bed className="w-4 h-4" />,
      "Capacidade": <Users className="w-4 h-4" />,
      "Vista": <Eye className="w-4 h-4" />,
      "Andar": <MapPin className="w-4 h-4" />,
      "Banheiro": <Droplets className="w-4 h-4" />,
    };

    // Map amenities to icons
    const amenityIcon = (amenity: string): React.ReactNode => {
      const a = amenity.toLowerCase();
      if (a.includes("wi-fi") || a.includes("wifi") || a.includes("internet")) return <Wifi className="w-3 h-3" />;
      if (a.includes("ar-condicionado") || a.includes("air") || a.includes("climate")) return <Wind className="w-3 h-3" />;
      if (a.includes("tv") || a.includes("televisão")) return <Tv className="w-3 h-3" />;
      if (a.includes("cofre") || a.includes("safe")) return <Lock className="w-3 h-3" />;
      if (a.includes("minibar") || a.includes("frigobar")) return <Wine className="w-3 h-3" />;
      if (a.includes("café") || a.includes("coffee") || a.includes("chá")) return <Coffee className="w-3 h-3" />;
      if (a.includes("banheir") || a.includes("ducha") || a.includes("chuveiro") || a.includes("banheira")) return <Droplets className="w-3 h-3" />;
      if (a.includes("roupão") || a.includes("chinelo") || a.includes("toalha")) return <Shirt className="w-3 h-3" />;
      if (a.includes("telefone") || a.includes("phone")) return <Phone className="w-3 h-3" />;
      if (a.includes("serviço") || a.includes("room service") || a.includes("concierge")) return <Sparkles className="w-3 h-3" />;
      return <Check className="w-3 h-3" />;
    };

    return (
      <div className="space-y-4">
        {/* Hero banner with first photo */}
        {itemPhotos.length > 0 && hasInfo && (
          <div className="relative rounded-xl overflow-hidden h-48 sm:h-56">
            <img
              src={getDisplayUrl(itemPhotos[0].url)}
              alt={nav.itemName}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              crossOrigin="anonymous"
              onError={() => handleImageError(itemPhotos[0].url)}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <h3 className="text-xl font-bold text-white drop-shadow-lg">{nav.itemName}</h3>
              {detail?.description && (
                <p className="text-sm text-white/85 mt-1.5 leading-relaxed max-w-2xl line-clamp-2">{detail.description}</p>
              )}
            </div>
          </div>
        )}

        {/* Info card — structured */}
        {hasInfo && (
          <div className="space-y-4">
            {/* Details grid */}
            {Object.keys(detail.details).length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {Object.entries(detail.details).map(([key, val]) => (
                  <div key={key} className="flex items-center gap-3 rounded-xl border border-border/50 bg-card p-3">
                    <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      {detailIcons[key] || <Info className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">{key}</span>
                      <span className="text-sm font-semibold text-foreground block truncate">{val}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Description (only if no hero banner showed it) */}
            {detail.description && itemPhotos.length === 0 && (
              <p className="text-sm text-muted-foreground leading-relaxed">{detail.description}</p>
            )}

            {/* Amenities */}
            {detail.amenities.length > 0 && (
              <div className="rounded-xl border border-border/50 bg-card p-4">
                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  Comodidades
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {detail.amenities.slice(0, 24).map((a, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground py-1">
                      <span className="text-primary/70 flex-shrink-0">{amenityIcon(a)}</span>
                      <span className="truncate">{a}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Photo grid */}
        <PhotoGrid
          photos={hasInfo ? itemPhotos.slice(1) : itemPhotos}
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
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {nav.level !== "categories" && (
            <Button
              type="button" variant="ghost" size="sm"
              onClick={() => {
                if (nav.level === "detail") setNav({ level: "items", category: nav.category });
                else setNav({ level: "categories" });
              }}
              className="h-7 w-7 p-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <Camera className="w-4 h-4 text-primary flex-shrink-0" />
          <span className="text-sm font-semibold text-foreground truncate">
            {activeSource === "google" ? "Google Places" : "Site Oficial"} — {hotelName}
          </span>
          <Badge variant="secondary" className="text-[10px] flex-shrink-0">{photos.length} fotos</Badge>
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
          <Button type="button" variant="outline" size="sm" onClick={() => runClassification(photos)} disabled={classifying || photos.length === 0} className="text-[10px] h-6 px-2 gap-1">
            {classifying ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            Reclassificar
          </Button>
          <Button type="button" variant={activeSource === "google" ? "default" : "outline"} size="sm" onClick={fetchGooglePlacesPhotos} disabled={loading} className="text-[10px] h-6 px-2 gap-1">
            {loadingSource === "google" ? <Loader2 className="w-3 h-3 animate-spin" /> : <MapPin className="w-3 h-3" />}
            Google
          </Button>
          <Button type="button" variant={activeSource === "official" ? "default" : "outline"} size="sm" onClick={scrapePhotos} disabled={loading} className="text-[10px] h-6 px-2 gap-1">
            {loadingSource === "official" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Globe className="w-3 h-3" />}
            Site Oficial
          </Button>
        </div>
      </div>

      {/* Breadcrumb */}
      {renderBreadcrumb()}

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

      {/* Content based on navigation level */}
      {nav.level === "categories" && renderCategories()}
      {nav.level === "items" && renderItems()}
      {nav.level === "detail" && renderDetail()}

      {/* Lightbox */}
      {lightboxIndex !== null && lightboxPhoto && createPortal(
        <div className="fixed inset-0 z-50 bg-black flex flex-col" role="dialog" aria-modal="true">
          <div className="absolute inset-0" onClick={() => { setLightboxIndex(null); setShowInfo(false); }} />

          {/* Top bar */}
          <div className="relative flex items-center justify-between px-3 sm:px-5 py-2.5 bg-black/90 backdrop-blur-sm z-10 shrink-0 border-b border-white/10">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <span className="text-white/50 text-xs font-mono shrink-0">
                {(lightboxIndex ?? 0) + 1}/{currentViewPhotos.length}
              </span>
              <span className="text-white text-xs sm:text-sm font-medium truncate">
                {lightboxPhoto.environment_name || lightboxPhoto.room_name || lightboxPhoto.category}
              </span>
              {lightboxPhoto.room_type && (
                <Badge className="bg-white/10 text-white/80 text-[9px] border-0">{lightboxPhoto.room_type}</Badge>
              )}
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {(lightboxPhoto.description || sectionDetails[lightboxPhoto.environment_name || ""]) && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowInfo(!showInfo)}
                  className="text-white/70 hover:text-white hover:bg-white/10 h-8 px-2 text-xs gap-1">
                  <Info className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Detalhes</span>
                </Button>
              )}
              <Button
                type="button" size="sm"
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
            {showInfo && (() => {
              const envName = lightboxPhoto.environment_name || "";
              const detail = sectionDetails[envName];
              const desc = lightboxPhoto.description || detail?.description;
              if (!desc && !detail) return null;
              return (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/85 backdrop-blur-md text-white rounded-xl p-4 max-w-md w-[90%] sm:w-auto space-y-2 z-20 border border-white/10">
                  <h4 className="font-semibold text-sm">{envName || lightboxPhoto.room_name}</h4>
                  {desc && <p className="text-xs text-white/80">{desc}</p>}
                  {detail && Object.keys(detail.details).length > 0 && (
                    <div className="flex flex-wrap gap-3 text-xs text-white/70">
                      {Object.entries(detail.details).map(([k, v]) => (
                        <span key={k}>📐 {k}: {v}</span>
                      ))}
                    </div>
                  )}
                  {detail?.amenities && detail.amenities.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {detail.amenities.slice(0, 12).map((a, i) => (
                        <span key={i} className="px-1.5 py-0.5 bg-white/10 rounded text-[10px]">{a}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Thumbnail strip */}
          <div className="relative px-3 sm:px-5 py-2 bg-black/90 backdrop-blur-sm shrink-0 border-t border-white/10">
            <ScrollArea className="w-full">
              <div className="flex gap-1.5">
                {currentViewPhotos.map((p, i) => (
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
