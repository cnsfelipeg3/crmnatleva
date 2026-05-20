import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

interface UseChatScrollAnchorOptions {
  conversationId: string | null | undefined;
  messageCount: number;
  lastMessageId?: string | null;
  loading?: boolean;
}

/**
 * WhatsApp-like chat scroll controller.
 *
 * Design rules (fixed bugs):
 * 1) Hide thread (ready=false) until first scroll-to-bottom paints (no flash).
 * 2) Auto-scrolls INSTANT on boot, with multi-pass to absorb late image/video reflow.
 * 3) Auto-pin to bottom (ResizeObserver) ONLY while the user has NOT taken control.
 *    User intent is detected by wheel/touchmove/keydown — once detected the
 *    container will NEVER be programmatically scrolled until the user explicitly
 *    returns to bottom (clicks the "↓ N new" badge) or switches conversations.
 * 4) New messages auto-snap (smooth) only if user is still at bottom.
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
  // True once the user has actively scrolled the thread (wheel/touch/keys).
  // While true we never auto-pin or auto-snap. Reset on conversation change
  // or when user explicitly clicks "go to bottom".
  const userTookControlRef = useRef(false);

  useEffect(() => { isAtBottomRef.current = isAtBottom; }, [isAtBottom]);
  useEffect(() => { readyRef.current = ready; }, [ready]);

  const pinNow = useCallback(() => {
    const c = containerRef.current;
    if (!c) return;
    c.scrollTop = c.scrollHeight;
  }, []);

  const snapToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
    const c = containerRef.current;
    if (!c) return;
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
    userTookControlRef.current = false;
  }, [conversationId]);

  // Initial scroll: instant, before paint, with multi-pass to handle late media reflow.
  // Each pass is GATED by userTookControlRef so a user who starts scrolling
  // during the first second is never yanked back.
  useLayoutEffect(() => {
    if (loading || !conversationId || messageCount === 0) return;
    const c = containerRef.current;
    if (!c) return;

    const rafs: number[] = [];
    const timeouts: number[] = [];

    const safePin = () => {
      if (userTookControlRef.current) return;
      c.scrollTop = c.scrollHeight;
    };

    safePin();
    rafs.push(requestAnimationFrame(() => {
      safePin();
      rafs.push(requestAnimationFrame(() => {
        safePin();
        lastSeenIdRef.current = lastMessageId;
        setReady(true);
        readyRef.current = true;
        [80, 200, 450, 900].forEach((delay) => {
          timeouts.push(window.setTimeout(safePin, delay));
        });
      }));
    }));

    return () => {
      rafs.forEach(cancelAnimationFrame);
      timeouts.forEach((t) => window.clearTimeout(t));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, loading, messageCount > 0]);

  // Stay pinned while at bottom AND user has not taken control.
  // Triggered by content size changes (media loading, new message append).
  useEffect(() => {
    const c = containerRef.current;
    if (!c) return;

    const keepPinned = () => {
      if (!readyRef.current) return;
      if (userTookControlRef.current) return;
      if (!isAtBottomRef.current) return;
      c.scrollTop = c.scrollHeight;
    };

    const ro = new ResizeObserver(() => keepPinned());
    Array.from(c.children).forEach((child) => ro.observe(child as Element));
    ro.observe(c);

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

  // Detect real user intent — once detected, user is in control until they
  // explicitly hit the "go to bottom" badge.
  useEffect(() => {
    const c = containerRef.current;
    if (!c) return;
    const markUserControl = () => {
      userTookControlRef.current = true;
    };
    // Passive listeners on the scroll container only — won't fire from
    // programmatic scrollTop writes.
    c.addEventListener("wheel", markUserControl, { passive: true });
    c.addEventListener("touchmove", markUserControl, { passive: true });
    c.addEventListener("keydown", markUserControl, { passive: true } as any);
    return () => {
      c.removeEventListener("wheel", markUserControl);
      c.removeEventListener("touchmove", markUserControl);
      c.removeEventListener("keydown", markUserControl as any);
    };
  }, [conversationId]);

  // New message arrival
  useEffect(() => {
    if (!ready || !lastMessageId) return;
    if (lastMessageId === lastSeenIdRef.current) return;

    const c = containerRef.current;
    if (!c) return;

    if (isAtBottom && !userTookControlRef.current) {
      requestAnimationFrame(() => snapToBottom("smooth"));
      lastSeenIdRef.current = lastMessageId;
      setUnreadCount(0);
    } else {
      setUnreadCount((n) => n + 1);
    }
  }, [lastMessageId, ready, isAtBottom, snapToBottom]);

  // Track real scroll position (always — no suppression).
  // A truly-at-bottom user gets userTookControlRef cleared so auto-pin resumes.
  useEffect(() => {
    const c = containerRef.current;
    if (!c) return;
    const onScroll = () => {
      const distance = c.scrollHeight - c.scrollTop - c.clientHeight;
      const atBottom = distance < 40;
      setIsAtBottom(atBottom);
      isAtBottomRef.current = atBottom;
      if (atBottom) {
        userTookControlRef.current = false;
        setUnreadCount(0);
        lastSeenIdRef.current = lastMessageId;
      }
    };
    c.addEventListener("scroll", onScroll, { passive: true });
    return () => c.removeEventListener("scroll", onScroll);
  }, [lastMessageId, ready]);

  const goToBottom = useCallback(() => {
    userTookControlRef.current = false;
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
