import { useEffect, useRef, useState, lazy, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { TravelMap2DWaypoint, TravelMap2DRoute } from "./TravelMap2D";

const TravelMap2D = lazy(() =>
  import("./TravelMap2D").then((m) => ({ default: m.TravelMap2D })),
);

interface Props {
  waypoints?: TravelMap2DWaypoint[];
  routes?: TravelMap2DRoute[];
  className?: string;
  onWaypointClick?: (id: string) => void;
}

/**
 * Mesma assinatura do antigo LazyViewportGlobe.
 * Carrega o mapa SOMENTE quando entra na viewport.
 */
export default function LazyViewportTravelMap({
  waypoints,
  routes,
  className,
  onWaypointClick,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    if (shouldLoad) return;
    const el = containerRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setShouldLoad(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShouldLoad(true);
          obs.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [shouldLoad]);

  const placeholder = <Skeleton className={cn("rounded-2xl", className)} />;

  return (
    <div ref={containerRef} className={className}>
      {shouldLoad ? (
        <Suspense fallback={placeholder}>
          <TravelMap2D
            className={className}
            waypoints={waypoints}
            routes={routes}
            onWaypointClick={onWaypointClick}
          />
        </Suspense>
      ) : (
        placeholder
      )}
    </div>
  );
}
