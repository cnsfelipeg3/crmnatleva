import { useEffect, useState, type ReactNode } from "react";

interface DeferredRenderProps {
  children: ReactNode;
  fallback?: ReactNode;
  delayMs?: number;
  timeoutMs?: number;
  enabled?: boolean;
}

export default function DeferredRender({
  children,
  fallback = null,
  delayMs = 0,
  timeoutMs = 1200,
  enabled = true,
}: DeferredRenderProps) {
  const [ready, setReady] = useState(!enabled);

  useEffect(() => {
    if (!enabled) {
      setReady(true);
      return;
    }

    setReady(false);

    let cancelled = false;
    let delayTimer: number | undefined;
    let idleId: number | undefined;
    let fallbackTimer: number | undefined;

    const reveal = () => {
      if (!cancelled) setReady(true);
    };

    const schedule = () => {
      if (typeof window !== "undefined" && "requestIdleCallback" in window) {
        idleId = window.requestIdleCallback(reveal, { timeout: timeoutMs });
      } else {
        fallbackTimer = window.setTimeout(reveal, Math.min(timeoutMs, 250));
      }
    };

    if (typeof window === "undefined") {
      setReady(true);
      return;
    }

    if (delayMs > 0) delayTimer = window.setTimeout(schedule, delayMs);
    else schedule();

    return () => {
      cancelled = true;
      if (delayTimer) window.clearTimeout(delayTimer);
      if (fallbackTimer) window.clearTimeout(fallbackTimer);
      if (idleId && typeof window !== "undefined" && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId);
      }
    };
  }, [delayMs, enabled, timeoutMs]);

  return ready ? <>{children}</> : <>{fallback}</>;
}