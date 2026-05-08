import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

interface UseChatScrollAnchorOptions {
  conversationId: string | null | undefined;
  messageCount: number;
  lastMessageId?: string | null;
  loading?: boolean;
}

/**
 * WhatsApp-like chat scroll controller:
 * 1) Hides thread (ready=false) until first scroll-to-bottom paints (no flash).
 * 2) Auto-scrolls INSTANT on boot, with multi-pass to absorb late image/video reflow.
 * 3) Keeps pinned to bottom via ResizeObserver while user is at bottom.
 * 4) Auto-scrolls SMOOTH on new messages while user is at bottom.
 * 5) Tracks unreadCount when user is reading older messages.
 */
export function useChatScrollAnchor({
  conversationId,
  messageCount,
  lastMessageId,
  loading,
}: UseChatScrollAnchorOptions) {
  const containerRef = useRef<HTMLElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const lastSeenIdRef = useRef<string | null | undefined>(null);
  const isAtBottomRef = useRef(true);
  const readyRef = useRef(false);
  const suppressScrollRef = useRef(false);
  const suppressTimerRef = useRef<number | null>(null);

  useEffect(() => { isAtBottomRef.current = isAtBottom; }, [isAtBottom]);
  useEffect(() => { readyRef.current = ready; }, [ready]);

  const snapToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
    const c = containerRef.current;
    if (!c) return;
    suppressScrollRef.current = true;
    if (suppressTimerRef.current) window.clearTimeout(suppressTimerRef.current);
    suppressTimerRef.current = window.setTimeout(() => {
      suppressScrollRef.current = false;
    }, behavior === "smooth" ? 600 : 160);
    c.scrollTo({ top: c.scrollHeight, behavior });
  }, []);

  // Reset on conversation change
  useLayoutEffect(() => {
    setReady(false);
    readyRef.current = false;
    setIsAtBottom(true);
    isAtBottomRef.current = true;
    setUnreadCount(0);
    lastSeenIdRef.current = null;
  }, [conversationId]);

  // Initial scroll: instant, before paint, with multi-pass to handle late media reflow
  useLayoutEffect(() => {
    if (loading || !conversationId || messageCount === 0) return;
    const c = containerRef.current;
    if (!c) return;

    const rafs: number[] = [];
    const timeouts: number[] = [];

    const pin = () => {
      suppressScrollRef.current = true;
      c.scrollTop = c.scrollHeight;
    };

    // Immediate sync pin (before browser paints layout shift)
    pin();
    // Two RAFs to land after first paint
    rafs.push(requestAnimationFrame(() => {
      pin();
      rafs.push(requestAnimationFrame(() => {
        pin();
        lastSeenIdRef.current = lastMessageId;
        setReady(true);
        readyRef.current = true;
        // Late passes: catches images/videos/stickers that resolve after initial layout
        [80, 200, 450, 900].forEach((delay) => {
          timeouts.push(window.setTimeout(() => {
            if (isAtBottomRef.current) pin();
          }, delay));
        });
        if (suppressTimerRef.current) window.clearTimeout(suppressTimerRef.current);
        suppressTimerRef.current = window.setTimeout(() => {
          suppressScrollRef.current = false;
        }, 1000);
      }));
    }));

    return () => {
      rafs.forEach(cancelAnimationFrame);
      timeouts.forEach((t) => window.clearTimeout(t));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, loading, messageCount > 0]);

  // Stay pinned while at bottom: ResizeObserver + image load listeners
  useEffect(() => {
    const c = containerRef.current;
    if (!c) return;

    const keepPinned = () => {
      if (!readyRef.current) return;
      if (!isAtBottomRef.current) return;
      suppressScrollRef.current = true;
      c.scrollTop = c.scrollHeight;
      if (suppressTimerRef.current) window.clearTimeout(suppressTimerRef.current);
      suppressTimerRef.current = window.setTimeout(() => {
        suppressScrollRef.current = false;
      }, 120);
    };

    const ro = new ResizeObserver(() => keepPinned());
    // Observe direct children (the messages content)
    Array.from(c.children).forEach((child) => ro.observe(child as Element));
    ro.observe(c);

    // Re-pin when any media inside finishes loading
    const onMediaLoad = (e: Event) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (t.tagName === "IMG" || t.tagName === "VIDEO") keepPinned();
    };
    c.addEventListener("load", onMediaLoad, true);
    c.addEventListener("loadeddata", onMediaLoad, true);

    return () => {
      ro.disconnect();
      c.removeEventListener("load", onMediaLoad, true);
      c.removeEventListener("loadeddata", onMediaLoad, true);
    };
  }, [conversationId]);

  // New message arrival
  useEffect(() => {
    if (!ready || !lastMessageId) return;
    if (lastMessageId === lastSeenIdRef.current) return;

    const c = containerRef.current;
    if (!c) return;

    if (isAtBottom) {
      requestAnimationFrame(() => snapToBottom("smooth"));
      lastSeenIdRef.current = lastMessageId;
      setUnreadCount(0);
    } else {
      setUnreadCount((n) => n + 1);
    }
  }, [lastMessageId, ready, isAtBottom, snapToBottom]);

  // Track scroll position (ignored during programmatic scrolls)
  useEffect(() => {
    const c = containerRef.current;
    if (!c) return;
    const onScroll = () => {
      if (suppressScrollRef.current) return;
      const distance = c.scrollHeight - c.scrollTop - c.clientHeight;
      const atBottom = distance < 80;
      setIsAtBottom(atBottom);
      isAtBottomRef.current = atBottom;
      if (atBottom) {
        setUnreadCount(0);
        lastSeenIdRef.current = lastMessageId;
      }
    };
    c.addEventListener("scroll", onScroll, { passive: true });
    return () => c.removeEventListener("scroll", onScroll);
  }, [lastMessageId, ready]);

  const goToBottom = useCallback(() => {
    snapToBottom("smooth");
    setUnreadCount(0);
  }, [snapToBottom]);

  return {
    containerRef,
    endRef,
    ready,
    isAtBottom,
    unreadCount,
    goToBottom,
    scrollToBottom: snapToBottom,
  };
}
