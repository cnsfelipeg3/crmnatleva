import { Suspense, useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import NatLevaLoader from "./NatLevaLoader";
import { hasCompletedInitialLoad, markInitialLoadComplete, MinimalLoader } from "./AppLoaders";

/**
 * SmartSuspense renders the actual content BEHIND the loader overlay.
 * The loader only appears on the FIRST page load of the session.
 * Subsequent navigations skip the loader entirely.
 *
 * Fail-safe: even if Suspense never resolves cleanly, we hard-show content after MAX_HOLD_MS.
 */
const MAX_HOLD_MS = 1500;

export default function SmartSuspense({ children }: { children: ReactNode }) {
  const firstLoad = useRef(!hasCompletedInitialLoad());
  const [phase, setPhase] = useState<"loading" | "fading" | "done">(
    firstLoad.current ? "loading" : "done"
  );
  const chunksLoaded = useRef(!firstLoad.current);

  const triggerReady = useCallback(() => {
    if (chunksLoaded.current) return;
    chunksLoaded.current = true;
    markInitialLoadComplete();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setPhase("fading");
        setTimeout(() => setPhase("done"), 300);
      });
    });
  }, []);

  // Fail-safe: never hold longer than MAX_HOLD_MS
  useEffect(() => {
    if (!firstLoad.current) return;
    const t = window.setTimeout(triggerReady, MAX_HOLD_MS);
    return () => window.clearTimeout(t);
  }, [triggerReady]);

  if (!firstLoad.current) {
    return (
      <Suspense fallback={<MinimalLoader />}>
        {children}
      </Suspense>
    );
  }

  return (
    <div className="relative w-full h-full min-h-screen">
      <div
        className="w-full h-full"
        style={{
          opacity: phase === "loading" ? 0 : 1,
          visibility: phase === "loading" ? "hidden" : "visible",
        }}
      >
        <Suspense fallback={<SuspenseBridge />}>
          <ContentReadySignal onReady={triggerReady} />
          {children}
        </Suspense>
      </div>

      {phase !== "done" && (
        <div
          className="fixed inset-0 z-[9999] transition-opacity duration-300"
          style={{ opacity: phase === "fading" ? 0 : 1 }}
        >
          <NatLevaLoader />
        </div>
      )}
    </div>
  );
}

function ContentReadySignal({ onReady }: { onReady: () => void }) {
  useEffect(() => { onReady(); }, [onReady]);
  return null;
}

function SuspenseBridge() {
  return <div className="min-h-screen" />;
}
