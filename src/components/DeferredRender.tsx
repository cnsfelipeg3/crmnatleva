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

    if (typeof window === "undefined") {
      setReady(true);
      return;
    }

    setReady(false);
    const browser = window as Window & typeof globalThis;

    let cancelled = false;
    let delayTimer: number | undefined;
    let idleId: number | undefined;
    let fallbackTimer: number | undefined;

    const reveal = () => {
      if (!cancelled) setReady(true);
    };

    const schedule = () => {
      if ("requestIdleCallback" in browser) {
        idleId = browser.requestIdleCallback(reveal, { timeout: timeoutMs });
        return;
      }
      fallbackTimer = browser.setTimeout(reveal, Math.min(timeoutMs, 250));
    };

    if (delayMs > 0) delayTimer = browser.setTimeout(schedule, delayMs);
    else schedule();

    return () => {
      cancelled = true;
      if (delayTimer) browser.clearTimeout(delayTimer);
      if (fallbackTimer) browser.clearTimeout(fallbackTimer);
      if (idleId && "cancelIdleCallback" in browser) {
        browser.cancelIdleCallback(idleId);
      }
    };
  }, [delayMs, enabled, timeoutMs]);

  return ready ? <>{children}</> : <>{fallback}</>;
}