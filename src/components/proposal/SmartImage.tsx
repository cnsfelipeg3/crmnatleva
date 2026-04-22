/**
 * SmartImage — Robust + performant image loader with proxy fallback.
 *
 * Performance strategy:
 * - Defers mounting the <img> until the wrapper is near the viewport
 *   (IntersectionObserver). Drastically reduces initial network/CPU pressure
 *   when rendering large galleries.
 * - Limits concurrent proxy requests to avoid saturating the browser/network.
 * - Caches resolved proxy URLs in memory so re-renders never refetch.
 * - Uses native lazy-loading + async decoding as a safety net.
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
  /** Skip viewport-deferral (use for above-the-fold / lightbox images). */
  eagerMount?: boolean;
  onResolvedUrl?: (resolved: string) => void;
}

const proxyCache = new Map<string, string>();
const inFlight = new Map<string, Promise<string | null>>();

// Limit concurrent proxy requests (heavy edge function calls).
const MAX_CONCURRENT_PROXY = 4;
let activeProxyRequests = 0;
const proxyQueue: Array<() => void> = [];

function acquireProxySlot(): Promise<void> {
  if (activeProxyRequests < MAX_CONCURRENT_PROXY) {
    activeProxyRequests += 1;
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => {
    proxyQueue.push(() => {
      activeProxyRequests += 1;
      resolve();
    });
  });
}

function releaseProxySlot(): void {
  activeProxyRequests = Math.max(0, activeProxyRequests - 1);
  const next = proxyQueue.shift();
  if (next) next();
}

async function resolveViaProxy(originalUrl: string, refererUrl?: string): Promise<string | null> {
  const cached = proxyCache.get(originalUrl);
  if (cached) return cached;

  const pending = inFlight.get(originalUrl);
  if (pending) return pending;

  const promise = (async () => {
    await acquireProxySlot();
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
      releaseProxySlot();
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
  eagerMount = false,
  onResolvedUrl,
}: SmartImageProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState<boolean>(eagerMount);
  const [currentSrc, setCurrentSrc] = useState<string | null>(() =>
    forceProxy ? proxyCache.get(src) || null : src
  );
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">(
    eagerMount ? "loading" : "idle"
  );
  const triedProxyRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Viewport deferral — only mount the actual <img> when wrapper is near screen.
  useEffect(() => {
    if (eagerMount || inView) return;
    const node = wrapperRef.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            observer.disconnect();
            break;
          }
        }
      },
      { rootMargin: "300px 0px", threshold: 0.01 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [eagerMount, inView]);

  // Reset when src changes
  useEffect(() => {
    triedProxyRef.current = false;
    const cached = proxyCache.get(src);
    if (cached) {
      setCurrentSrc(cached);
      setStatus(inView ? "loading" : "idle");
      return;
    }
    if (forceProxy && inView) {
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
      setStatus(inView ? "loading" : "idle");
    }
  }, [src, forceProxy, refererUrl, onResolvedUrl, inView]);

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

  const showSkeleton = status === "loading" || status === "idle";

  return (
    <div ref={wrapperRef} className={cn("relative overflow-hidden bg-muted/30", className)}>
      {showSkeleton && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/40">
          {status === "loading" && (
            <Loader2 className="h-5 w-5 text-muted-foreground/60 animate-spin" />
          )}
        </div>
      )}
      {status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-muted/30 text-muted-foreground/60">
          <ImageOff className="h-6 w-6" />
          <span className="text-[9px]">Indisponível</span>
        </div>
      )}
      {inView && currentSrc && status !== "error" && (
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
