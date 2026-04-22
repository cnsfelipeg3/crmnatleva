import { useEffect, useState, type ReactNode } from "react";

interface DeferredRenderProps {
  children: ReactNode;
  fallback?: ReactNode;
  delayMs?: number;
  timeoutMs?: number;
  enabled?: boolean;
}

type IdleCapableWindow = Window & {
  requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
  cancelIdleCallback?: (handle: number) => void;
};

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
    const browser = window as IdleCapableWindow;

    let cancelled = false;
    let delayTimer: number | undefined;
    let idleId: number | undefined;
    let fallbackTimer: number | undefined;

    const reveal = () => {
      if (!cancelled) setReady(true);
    };

    const schedule = () => {
      if (typeof browser.requestIdleCallback === "function") {
        idleId = browser.requestIdleCallback(reveal, { timeout: timeoutMs });
        return;
      }
      fallbackTimer = window.setTimeout(reveal, Math.min(timeoutMs, 250));
    };

    if (delayMs > 0) delayTimer = window.setTimeout(schedule, delayMs);
    else schedule();

    return () => {
      cancelled = true;
      if (delayTimer) window.clearTimeout(delayTimer);
      if (fallbackTimer) window.clearTimeout(fallbackTimer);
      if (idleId && typeof browser.cancelIdleCallback === "function") {
        browser.cancelIdleCallback(idleId);
      }
    };
  }, [delayMs, enabled, timeoutMs]);

  return ready ? <>{children}</> : <>{fallback}</>;
}