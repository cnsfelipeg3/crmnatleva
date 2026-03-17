import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { HotelPhoto, SectionDetail, CoverageState } from "./types";

// ── Utility functions (extracted from HotelPhotosScraper) ──

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
      body: {
        photo_urls: photos.map(p => p.url),
        hotel_name: hotelName,
        room_names: roomNames || [],
        photo_contexts: photos.map(p => p.html_context || ""),
      },
    });
    if (error || !data?.photos) return photos;
    const classified = data.photos as Array<{
      index: number; environment_name?: string; category?: string;
      room_type?: string; bed_type?: string; description?: string; confidence?: number;
    }>;
    const hotelNameLower = hotelName.toLowerCase().trim();
    const cleanEnvName = (name: string | undefined): string => {
      if (!name) return "";
      const cleaned = name.trim();
      if (cleaned.toLowerCase() === hotelNameLower) return "";
      if (cleaned.toLowerCase().startsWith(hotelNameLower + " -")) {
        return cleaned.slice(hotelNameLower.length + 2).trim();
      }
      return cleaned;
    };
    return photos.map((photo, idx) => {
      const match = classified.find(c => c.index === idx);
      if (!match) return photo;
      const envName = cleanEnvName(match.environment_name) || match.category || photo.category || "outro";
      return {
        ...photo,
        environment_name: envName,
        category: match.category || photo.category,
        room_name: envName,
        room_type: match.room_type || photo.room_type,
        bed_type: match.bed_type || photo.bed_type,
        description: match.description || photo.description,
        confidence: match.confidence ?? photo.confidence,
      };
    });
  } catch { return photos; }
}

// ── Hook ──

interface UseHotelMediaProps {
  hotelName: string;
  hotelCity: string;
  hotelCountry: string;
}

export function useHotelMedia({ hotelName, hotelCity, hotelCountry }: UseHotelMediaProps) {
  const [loading, setLoading] = useState(false);
  const [classifying, setClassifying] = useState(false);
  const [photos, setPhotos] = useState<HotelPhoto[]>([]);
  const [sectionDetails, setSectionDetails] = useState<Record<string, SectionDetail>>({});
  const [sourceUrl, setSourceUrl] = useState("");
  const [knownRoomNames, setKnownRoomNames] = useState<string[]>([]);
  const [scraped, setScraped] = useState(false);
  const [activeSource, setActiveSource] = useState<"official" | "google" | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [cacheAgeHours, setCacheAgeHours] = useState<number | null>(null);

  // Image proxy state
  const [proxiedImageUrls, setProxiedImageUrls] = useState<Record<string, string>>({});
  const [failedImageUrls, setFailedImageUrls] = useState<Set<string>>(new Set());
  const [resolvingImageUrls, setResolvingImageUrls] = useState<Set<string>>(new Set());
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

  const getDisplayUrl = useCallback((url: string) => proxiedImageUrls[url] || url, [proxiedImageUrls]);

  const handleImageError = useCallback((url: string) => {
    if (!url) return;
    if (proxiedImageUrls[url]) { setFailedImageUrls((prev) => new Set(prev).add(url)); return; }
    // Try proxy
    if (failedImageUrls.has(url) || resolvingImageUrls.has(url)) return;
    setResolvingImageUrls((prev) => new Set(prev).add(url));
    fetchProxiedImageUrl(url, sourceUrl || undefined).then((resolved) => {
      proxiedObjectUrlsRef.current.push(resolved);
      setProxiedImageUrls((prev) => ({ ...prev, [url]: resolved }));
      setFailedImageUrls((prev) => { const next = new Set(prev); next.delete(url); return next; });
    }).catch(() => {
      setFailedImageUrls((prev) => new Set(prev).add(url));
    }).finally(() => {
      setResolvingImageUrls((prev) => { const next = new Set(prev); next.delete(url); return next; });
    });
  }, [failedImageUrls, proxiedImageUrls, resolvingImageUrls, sourceUrl]);

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
    try {
      const classified = await classifyPhotosWithAI(photosToClassify, hotelName, roomNames || knownRoomNames);
      setPhotos(classified);
      toast.success(`✨ ${new Set(classified.map(p => p.environment_name).filter(Boolean)).size} ambientes identificados`);
    } catch {
      toast.error("Erro ao classificar fotos");
    } finally {
      setClassifying(false);
    }
  }, [hotelName, knownRoomNames]);

  const scrapeOfficial = useCallback(async (forceRefresh = false) => {
    if (!hotelName) return;
    setLoading(true);
    try {
      toast.info(forceRefresh ? "🔄 Re-buscando..." : "🕷️ Buscando site oficial...", { duration: 5000 });
      const { data, error } = await supabase.functions.invoke("scrape-hotel-photos", {
        body: { hotel_name: hotelName, hotel_city: hotelCity, hotel_country: hotelCountry, force_refresh: forceRefresh },
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      setFromCache(data.from_cache === true);
      setCacheAgeHours(data.cache_age_hours ?? null);

      const rawPhotos: HotelPhoto[] = (data.photos || []).map((p: any) => ({
        ...p,
        environment_name: p.section_name || p.environment_name || "",
        room_name: p.section_name || p.room_name || "",
        source: p.source || "official",
        html_context: p.html_context || "",
      }));
      const scraperRoomNames: string[] = data.room_names || [];
      const scrapedSectionDetails: Record<string, SectionDetail> = data.section_details || {};
      const resolvedPhotos = await resolveHotelPhotosUrls(rawPhotos);

      clearProxiedImages();
      setPhotos(resolvedPhotos);
      setSectionDetails(scrapedSectionDetails);
      setSourceUrl(data.source_url || "");
      setScraped(true);
      setActiveSource("official");
      setKnownRoomNames(scraperRoomNames);

      if (resolvedPhotos.length > 0) {
        toast.success(`📸 ${resolvedPhotos.length} fotos encontradas`);
        preloadViaProxy(resolvedPhotos, data.source_url || undefined);

        const photosWithSections = resolvedPhotos.filter(p => p.environment_name && p.environment_name.length > 2).length;
        const uniqueEnvNames = new Set(resolvedPhotos.map(p => p.environment_name).filter(Boolean)).size;
        const sectionRatio = resolvedPhotos.length > 0 ? photosWithSections / resolvedPhotos.length : 0;
        if (!data.from_cache && (sectionRatio < 0.7 || uniqueEnvNames < 3)) {
          await runClassification(resolvedPhotos, scraperRoomNames);
        }
      } else {
        toast.info("Nenhuma foto encontrada");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao buscar fotos");
    } finally {
      setLoading(false);
    }
  }, [hotelName, hotelCity, hotelCountry, clearProxiedImages, preloadViaProxy, runClassification]);

  // Computed values
  const roomPhotos = photos.filter(p => p.category === "quarto" || p.category === "suite");
  const areaPhotos = photos.filter(p => p.category !== "quarto" && p.category !== "suite" && p.category !== "outro");

  const roomGroups = roomPhotos.reduce((acc, p) => {
    const name = p.environment_name || p.room_name || "Quarto";
    if (!acc[name]) acc[name] = [];
    acc[name].push(p);
    return acc;
  }, {} as Record<string, HotelPhoto[]>);

  const areaGroups = areaPhotos.reduce((acc, p) => {
    const cat = p.category || "area_comum";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {} as Record<string, HotelPhoto[]>);

  const officialCount = photos.filter(p => p.source === "official").length;
  const officialPercent = photos.length > 0 ? Math.round((officialCount / photos.length) * 100) : 0;

  const coverage: CoverageState = (() => {
    if (!scraped) return { level: "low", message: "", officialPercent: 0 };
    if (photos.length === 0) return { level: "error", message: "Nenhuma foto encontrada", officialPercent: 0 };
    if (photos.length < 10) return { level: "low", message: "Cobertura limitada de mídia", officialPercent };
    if (officialPercent < 50) return { level: "partial", message: "Conteúdo majoritariamente complementar", officialPercent };
    if (Object.keys(roomGroups).length === 0) return { level: "partial", message: "Quartos não identificados", officialPercent };
    return { level: "full", message: "", officialPercent };
  })();

  return {
    loading, classifying, photos, sectionDetails, sourceUrl, scraped, activeSource,
    fromCache, cacheAgeHours, knownRoomNames,
    roomGroups, areaGroups, coverage,
    officialPercent,
    failedImageUrls, resolvingImageUrls,
    getDisplayUrl, handleImageError,
    scrapeOfficial, runClassification,
  };
}
