import { useEffect, useRef, useState } from "react";
import { haptics } from "@/lib/haptics";

interface Options {
  onRefresh: () => Promise<void> | void;
  /** Distância em px pra disparar o refresh */
  threshold?: number;
  /** Resistência (0-1), quanto menor mais "pesado" */
  resistance?: number;
  /** Container scrollável (default: window) */
  scrollContainer?: HTMLElement | null;
  /** Desliga o PTR (ex: desktop) */
  enabled?: boolean;
}

/**
 * Pull-to-refresh nativo (touch) · sem dependências.
 * Retorna pullDistance (px) e refreshing (bool) pro indicador visual.
 */
export function usePullToRefresh({
  onRefresh,
  threshold = 70,
  resistance = 0.45,
  scrollContainer = null,
  enabled = true,
}: Options) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startYRef = useRef(0);
  const isPullingRef = useRef(false);
  const distanceRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    const target: HTMLElement | Window = scrollContainer || window;
    const getScrollTop = () =>
      scrollContainer ? scrollContainer.scrollTop : window.scrollY;

    const onTouchStart = (e: TouchEvent) => {
      if (refreshing) return;
      if (getScrollTop() > 0) {
        isPullingRef.current = false;
        return;
      }
      startYRef.current = e.touches[0].clientY;
      isPullingRef.current = true;
      distanceRef.current = 0;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isPullingRef.current || refreshing) return;
      const dy = e.touches[0].clientY - startYRef.current;
      if (dy > 0 && getScrollTop() === 0) {
        const damped = Math.min(dy * resistance, threshold * 1.6);
        distanceRef.current = damped;
        setPullDistance(damped);
      } else if (dy <= 0) {
        distanceRef.current = 0;
        setPullDistance(0);
      }
    };

    const onTouchEnd = async () => {
      if (!isPullingRef.current) return;
      isPullingRef.current = false;
      const final = distanceRef.current;
      if (final >= threshold) {
        setRefreshing(true);
        haptics.light();
        try {
          await onRefresh();
        } finally {
          setRefreshing(false);
          setPullDistance(0);
        }
      } else {
        setPullDistance(0);
      }
    };

    target.addEventListener("touchstart", onTouchStart as EventListener, { passive: true });
    target.addEventListener("touchmove", onTouchMove as EventListener, { passive: true });
    target.addEventListener("touchend", onTouchEnd as EventListener);
    target.addEventListener("touchcancel", onTouchEnd as EventListener);

    return () => {
      target.removeEventListener("touchstart", onTouchStart as EventListener);
      target.removeEventListener("touchmove", onTouchMove as EventListener);
      target.removeEventListener("touchend", onTouchEnd as EventListener);
      target.removeEventListener("touchcancel", onTouchEnd as EventListener);
    };
  }, [enabled, onRefresh, refreshing, resistance, scrollContainer, threshold]);

  return { pullDistance, refreshing };
}
