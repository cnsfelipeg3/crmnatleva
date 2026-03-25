import { Suspense, useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import NatLevaLoader from "./NatLevaLoader";

/**
 * SmartSuspense renders the actual content BEHIND the loader overlay.
 * The loader only disappears after the content has fully mounted and painted,
 * eliminating the "fake loader" effect where users see a second loading flash.
 */
export default function SmartSuspense({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<"loading" | "fading" | "done">("loading");
  const contentRef = useRef<HTMLDivElement>(null);
  const chunksLoaded = useRef(false);

  const onContentReady = useCallback(() => {
    if (chunksLoaded.current) return;
    chunksLoaded.current = true;
    // Wait 2 frames so the browser has actually painted the content
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setPhase("fading");
        // Remove overlay after fade-out animation
        setTimeout(() => setPhase("done"), 400);
      });
    });
  }, []);

  return (
    <div className="relative w-full h-full min-h-screen">
      {/* Content renders immediately but invisible until loader fades */}
      <div
        ref={contentRef}
        className="w-full h-full"
        style={{
          opacity: phase === "done" ? 1 : phase === "fading" ? 1 : 0,
          // Keep in DOM flow so it loads, but visually hidden behind loader
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
