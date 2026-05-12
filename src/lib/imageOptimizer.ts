// Otimizador de imagens · gera srcset AVIF/WebP responsivo
// Suporta Unsplash (query params nativos) e Supabase Storage (image render endpoint)
// Fallback transparente para URLs externas que não suportam transform

const DEFAULT_WIDTHS = [400, 640, 900, 1280, 1600, 2000];

type Format = "avif" | "webp" | "auto";

function isUnsplash(url: string) {
  return /(?:^|\/\/)images\.unsplash\.com\//.test(url);
}

function isSupabaseStorage(url: string) {
  return /\/storage\/v1\/object\/public\//.test(url);
}

function buildUnsplash(url: string, w: number, fmt: Format, q = 72) {
  try {
    const u = new URL(url);
    u.searchParams.set("auto", "format,compress");
    u.searchParams.set("fit", "crop");
    u.searchParams.set("w", String(w));
    u.searchParams.set("q", String(q));
    if (fmt !== "auto") u.searchParams.set("fm", fmt);
    return u.toString();
  } catch {
    return url;
  }
}

function buildSupabase(url: string, w: number, fmt: Format, q = 72) {
  try {
    const transformed = url.replace(
      "/storage/v1/object/public/",
      "/storage/v1/render/image/public/"
    );
    const u = new URL(transformed);
    u.searchParams.set("width", String(w));
    u.searchParams.set("quality", String(q));
    u.searchParams.set("resize", "cover");
    if (fmt !== "auto") u.searchParams.set("format", fmt === "avif" ? "origin" : "webp");
    // Supabase render só suporta webp/origin · AVIF cai no origin (sem perda visível)
    return u.toString();
  } catch {
    return url;
  }
}

function buildOne(url: string, w: number, fmt: Format) {
  if (isUnsplash(url)) return buildUnsplash(url, w, fmt);
  if (isSupabaseStorage(url)) return buildSupabase(url, w, fmt);
  return url;
}

export function buildSrcSet(
  url: string | null | undefined,
  widths: number[] = DEFAULT_WIDTHS
) {
  if (!url) return null;
  const supportsTransform = isUnsplash(url) || isSupabaseStorage(url);
  if (!supportsTransform) {
    return { avif: null, webp: null, fallback: url, supportsTransform: false };
  }
  const avif = widths.map((w) => `${buildOne(url, w, "avif")} ${w}w`).join(", ");
  const webp = widths.map((w) => `${buildOne(url, w, "webp")} ${w}w`).join(", ");
  const fallback = buildOne(url, widths[Math.floor(widths.length / 2)], "auto");
  return { avif, webp, fallback, supportsTransform: true };
}

export const DEFAULT_CARD_SIZES =
  "(min-width: 1280px) 22vw, (min-width: 768px) 33vw, (min-width: 480px) 50vw, 90vw";

export const HERO_SIZES =
  "(min-width: 1280px) 60vw, (min-width: 768px) 80vw, 100vw";
