/**
 * SmartImage — Robust image loader with automatic proxy fallback.
 *
 * Behavior:
 * 1. Tries to load the original URL directly.
 * 2. If it fails (CORS, hotlink protection, 403, etc.), invokes the
 *    `image-proxy` edge function which downloads the image server-side,
 *    uploads it to Supabase Storage, and returns a stable `publicUrl`.
 * 3. Shows a skeleton while loading and a graceful placeholder on hard failure.
 *
 * Resolved proxy URLs are cached in-memory so that re-renders don't refetch.
 */
import { useEffect, useRef, useState } from "react";
import { ImageOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface SmartImageProps {
  src: string;
  alt?: string;
  className?: string;
  imgClassName?: string;
  refererUrl?: string;
  /** When true, skip the direct attempt and go straight through the proxy. */
  forceProxy?: boolean;
  loading?: "lazy" | "eager";
  onResolvedUrl?: (resolved: string) => void;
}

const proxyCache = new Map<string, string>();
const inFlight = new Map<string, Promise<string | null>>();

async function resolveViaProxy(originalUrl: string, refererUrl?: string): Promise<string | null> {
  const cached = proxyCache.get(originalUrl);
  if (cached) return cached;

  const pending = inFlight.get(originalUrl);
  if (pending) return pending;

  const promise = (async () => {
    try {
      const { data, error } = await supabase.functions.invoke("image-proxy", {
        body: { imageUrl: originalUrl, refererUrl: refererUrl || "" },
      });
      if (error) throw error;
      const publicUrl = (data as any)?.publicUrl as string | undefined;
      if (publicUrl) {
        proxyCache.set(originalUrl, publicUrl);
        return publicUrl;
      }
      return null;
    } catch {
      return null;
    } finally {
      inFlight.delete(originalUrl);
    }
  })();

  inFlight.set(originalUrl, promise);
  return promise;
}

export default function SmartImage({
  src,
  alt = "",
  className,
  imgClassName,
  refererUrl,
  forceProxy = false,
  loading = "lazy",
  onResolvedUrl,
}: SmartImageProps) {
  const [currentSrc, setCurrentSrc] = useState<string | null>(() =>
    forceProxy ? proxyCache.get(src) || null : src
  );
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    forceProxy && !proxyCache.get(src) ? "loading" : "loading"
  );
  const triedProxyRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Reset when src changes
  useEffect(() => {
    triedProxyRef.current = false;
    const cached = proxyCache.get(src);
    if (cached) {
      setCurrentSrc(cached);
      setStatus("loading");
      return;
    }
    if (forceProxy) {
      setCurrentSrc(null);
      setStatus("loading");
      triedProxyRef.current = true;
      resolveViaProxy(src, refererUrl).then((resolved) => {
        if (!mountedRef.current) return;
        if (resolved) {
          setCurrentSrc(resolved);
          onResolvedUrl?.(resolved);
        } else {
          setStatus("error");
        }
      });
    } else {
      setCurrentSrc(src);
      setStatus("loading");
    }
  }, [src, forceProxy, refererUrl, onResolvedUrl]);

  const handleError = async () => {
    if (triedProxyRef.current) {
      if (mountedRef.current) setStatus("error");
      return;
    }
    triedProxyRef.current = true;
    setStatus("loading");
    const resolved = await resolveViaProxy(src, refererUrl);
    if (!mountedRef.current) return;
    if (resolved) {
      setCurrentSrc(resolved);
      onResolvedUrl?.(resolved);
    } else {
      setStatus("error");
    }
  };

  return (
    <div className={cn("relative overflow-hidden bg-muted/30", className)}>
      {status === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/40 animate-pulse">
          <Loader2 className="h-5 w-5 text-muted-foreground/60 animate-spin" />
        </div>
      )}
      {status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-muted/30 text-muted-foreground/60">
          <ImageOff className="h-6 w-6" />
          <span className="text-[9px]">Indisponível</span>
        </div>
      )}
      {currentSrc && status !== "error" && (
        <img
          src={currentSrc}
          alt={alt}
          loading={loading}
          referrerPolicy="no-referrer"
          decoding="async"
          onLoad={() => mountedRef.current && setStatus("ready")}
          onError={handleError}
          className={cn(
            "w-full h-full object-cover transition-opacity duration-300",
            status === "ready" ? "opacity-100" : "opacity-0",
            imgClassName,
          )}
        />
      )}
    </div>
  );
}
