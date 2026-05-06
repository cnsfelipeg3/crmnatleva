import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

interface UseChatScrollAnchorOptions {
  conversationId: string | null | undefined;
  messageCount: number;
  lastMessageId?: string | null;
  loading?: boolean;
}

/**
 * WhatsApp-like chat scroll controller:
 * 1) Hides thread (ready=false) until first scroll-to-bottom paints.
 * 2) Auto-scrolls INSTANT on boot (no flash, no layout shift).
 * 3) Auto-scrolls SMOOTH on new messages while user is at bottom.
 * 4) Tracks unreadCount when user is reading older messages.
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
  const suppressScrollRef = useRef(false);
  const suppressTimerRef = useRef<number | null>(null);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
    const c = containerRef.current;
    if (!c) return;
    suppressScrollRef.current = true;
    if (suppressTimerRef.current) window.clearTimeout(suppressTimerRef.current);
    suppressTimerRef.current = window.setTimeout(() => {
      suppressScrollRef.current = false;
    }, behavior === "smooth" ? 600 : 120);
    c.scrollTo({ top: c.scrollHeight, behavior });
  }, []);

  // Reset on conversation change
  useLayoutEffect(() => {
    setReady(false);
    setIsAtBottom(true);
    setUnreadCount(0);
    lastSeenIdRef.current = null;
  }, [conversationId]);

  // Initial scroll: instant, before paint
  useLayoutEffect(() => {
    if (loading || !conversationId || messageCount === 0) return;
    const c = containerRef.current;
    if (!c) return;

    let raf1 = 0;
    let raf2 = 0;
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        suppressScrollRef.current = true;
        c.scrollTo({ top: c.scrollHeight, behavior: "auto" });
        lastSeenIdRef.current = lastMessageId;
        setReady(true);
        if (suppressTimerRef.current) window.clearTimeout(suppressTimerRef.current);
        suppressTimerRef.current = window.setTimeout(() => {
          suppressScrollRef.current = false;
        }, 120);
      });
    });

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, loading, messageCount > 0]);

  // New message arrival
  useEffect(() => {
    if (!ready || !lastMessageId) return;
    if (lastMessageId === lastSeenIdRef.current) return;

    const c = containerRef.current;
    if (!c) return;

    if (isAtBottom) {
      requestAnimationFrame(() => scrollToBottom("smooth"));
      lastSeenIdRef.current = lastMessageId;
      setUnreadCount(0);
    } else {
      setUnreadCount((n) => n + 1);
    }
  }, [lastMessageId, ready, isAtBottom, scrollToBottom]);

  // Track scroll position (ignored during programmatic scrolls)
  useEffect(() => {
    const c = containerRef.current;
    if (!c) return;
    const onScroll = () => {
      if (suppressScrollRef.current) return;
      const distance = c.scrollHeight - c.scrollTop - c.clientHeight;
      const atBottom = distance < 80;
      setIsAtBottom(atBottom);
      if (atBottom) {
        setUnreadCount(0);
        lastSeenIdRef.current = lastMessageId;
      }
    };
    c.addEventListener("scroll", onScroll, { passive: true });
    return () => c.removeEventListener("scroll", onScroll);
  }, [lastMessageId, ready]);

  const goToBottom = useCallback(() => {
    scrollToBottom("smooth");
    setUnreadCount(0);
  }, [scrollToBottom]);

  return {
    containerRef,
    endRef,
    ready,
    isAtBottom,
    unreadCount,
    goToBottom,
    scrollToBottom,
  };
}
