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
      if ("requestIdleCallback" in win) {
        idleId = win.requestIdleCallback(reveal, { timeout: timeoutMs });
        return;
      }
      fallbackTimer = win.setTimeout(reveal, Math.min(timeoutMs, 250));
    };

    if (typeof window === "undefined") {
      setReady(true);
      return;
    }

    const win = window;

    if (delayMs > 0) delayTimer = win.setTimeout(schedule, delayMs);
    else schedule();

    return () => {
      cancelled = true;
      if (delayTimer) win.clearTimeout(delayTimer);
      if (fallbackTimer) win.clearTimeout(fallbackTimer);
      if (idleId && "cancelIdleCallback" in win) {
        win.cancelIdleCallback(idleId);
      }
    };
  }, [delayMs, enabled, timeoutMs]);

  return ready ? <>{children}</> : <>{fallback}</>;
}