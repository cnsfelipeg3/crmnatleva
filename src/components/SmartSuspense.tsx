import { Suspense, useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import NatLevaLoader from "./NatLevaLoader";
import { hasCompletedInitialLoad, markInitialLoadComplete, MinimalLoader } from "./AppLoaders";

/**
 * SmartSuspense renders the actual content BEHIND the loader overlay.
 * The loader only appears on the FIRST page load of the session.
 * Subsequent navigations skip the loader entirely.
 */
export default function SmartSuspense({ children }: { children: ReactNode }) {
  const firstLoad = useRef(!hasCompletedInitialLoad());
  const [phase, setPhase] = useState<"loading" | "fading" | "done">(
    firstLoad.current ? "loading" : "done"
  );
  const chunksLoaded = useRef(!firstLoad.current);

  const onContentReady = useCallback(() => {
    if (chunksLoaded.current) return;
    chunksLoaded.current = true;
    markInitialLoadComplete();
    // Wait 2 frames so the browser has actually painted the content
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setPhase("fading");
        // Remove overlay after fade-out animation
        setTimeout(() => setPhase("done"), 400);
      });
    });
  }, []);

  // If not first load, render children directly
  if (!firstLoad.current) {
    return (
      <Suspense fallback={<MinimalLoader />}>
        {children}
      </Suspense>
    );
  }

  return (
    <div className="relative w-full h-full min-h-screen">
      {/* Content renders immediately but invisible until loader fades */}
      <div
        className="w-full h-full"
        style={{
          opacity: phase === "done" ? 1 : phase === "fading" ? 1 : 0,
          visibility: phase === "loading" ? "hidden" : "visible",
        }}
      >
        <Suspense fallback={<SuspenseBridge />}>
          <ContentReadySignal onReady={onContentReady} />
          {children}
        </Suspense>
      </div>

      {/* Loader overlay */}
      {phase !== "done" && (
        <div
          className="fixed inset-0 z-[9999] transition-opacity duration-400"
          style={{ opacity: phase === "fading" ? 0 : 1 }}
        >
          <NatLevaLoader />
        </div>
      )}
    </div>
  );
}

/** Invisible component that fires onReady once it mounts (meaning Suspense resolved) */
function ContentReadySignal({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    onReady();
  }, [onReady]);
  return null;
}

/** While chunks are loading, keep content area empty (loader is visible on top) */
function SuspenseBridge() {
  return <div className="min-h-screen" />;
}
