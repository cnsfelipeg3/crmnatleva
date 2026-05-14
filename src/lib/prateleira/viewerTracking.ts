// =====================================================================
// Tracking de comportamento na página pública de venda da prateleira
// · heartbeat de tempo ativo (atualiza active_seconds)
// · IntersectionObserver registra section_view por seção
// · helper trackClick para CTAs, galeria, share, whatsapp etc.
// =====================================================================

import { supabase } from "@/integrations/supabase/client";

interface InitOpts {
  productId: string;
  email: string;
}

interface Tracker {
  trackClick: (target: string, section?: string, metadata?: Record<string, any>) => void;
  trackEvent: (eventType: string, opts?: { section?: string; target?: string; metadata?: Record<string, any> }) => void;
  dispose: () => void;
}

const HEARTBEAT_MS = 15_000;
const SECTION_THRESHOLD = 0.45;

export function initViewerTracking({ productId, email }: InitOpts): Tracker {
  let viewerId: string | null = null;
  let activeMs = 0;
  let lastTick = Date.now();
  let visible = !document.hidden;
  const seenSections = new Set<string>();

  // Resolve viewer_id (best effort) e flush inicial
  (async () => {
    try {
      const { data } = await (supabase as any)
        .from("prateleira_product_viewers")
        .select("id, active_seconds")
        .eq("product_id", productId)
        .eq("email", email)
        .maybeSingle();
      if (data) viewerId = data.id;
    } catch {}
  })();

  const recordEvent = (
    eventType: string,
    section?: string,
    target?: string,
    metadata?: Record<string, any>
  ) => {
    try {
      (supabase as any).from("prateleira_viewer_events").insert({
        viewer_id: viewerId,
        product_id: productId,
        email,
        event_type: eventType,
        section: section || null,
        target: target || null,
        metadata: metadata || null,
      });
    } catch {}
  };

  const flushHeartbeat = (force = false) => {
    const now = Date.now();
    if (visible) activeMs += now - lastTick;
    lastTick = now;
    const seconds = Math.floor(activeMs / 1000);
    if (seconds < 5 && !force) return;
    activeMs = activeMs - seconds * 1000;
    try {
      (supabase as any).rpc("noop"); // no-op if not exists, ignored
    } catch {}
    // Increment via update (sem RPC para não depender de função)
    (async () => {
      try {
        if (!viewerId) {
          const { data } = await (supabase as any)
            .from("prateleira_product_viewers")
            .select("id, active_seconds")
            .eq("product_id", productId).eq("email", email).maybeSingle();
          if (!data) return;
          viewerId = data.id;
          await (supabase as any).from("prateleira_product_viewers")
            .update({
              active_seconds: (data.active_seconds || 0) + seconds,
              last_active_at: new Date().toISOString(),
            }).eq("id", viewerId);
        } else {
          // increment com RPC manual via select+update (single roundtrip aceitável aqui)
          const { data } = await (supabase as any)
            .from("prateleira_product_viewers")
            .select("active_seconds").eq("id", viewerId).maybeSingle();
          await (supabase as any).from("prateleira_product_viewers")
            .update({
              active_seconds: (data?.active_seconds || 0) + seconds,
              last_active_at: new Date().toISOString(),
            }).eq("id", viewerId);
        }
      } catch {}
    })();
  };

  const onVisibility = () => {
    const nowVisible = !document.hidden;
    if (visible && !nowVisible) flushHeartbeat(true);
    visible = nowVisible;
    lastTick = Date.now();
  };

  const heartbeat = window.setInterval(() => flushHeartbeat(false), HEARTBEAT_MS);
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("pagehide", () => flushHeartbeat(true));
  window.addEventListener("beforeunload", () => flushHeartbeat(true));

  // IntersectionObserver para data-section="..."
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting && e.intersectionRatio >= SECTION_THRESHOLD) {
        const section = (e.target as HTMLElement).dataset.section;
        if (!section || seenSections.has(section)) continue;
        seenSections.add(section);
        recordEvent("section_view", section);
      }
    }
  }, { threshold: [SECTION_THRESHOLD] });

  // Observa seções já presentes + futuras
  const observeAll = () => {
    document.querySelectorAll<HTMLElement>("[data-section]").forEach((el) => io.observe(el));
  };
  observeAll();
  const mo = new MutationObserver(() => observeAll());
  mo.observe(document.body, { childList: true, subtree: true });

  return {
    trackClick: (target, section, metadata) =>
      recordEvent("click", section, target, metadata),
    trackEvent: (eventType, opts) =>
      recordEvent(eventType, opts?.section, opts?.target, opts?.metadata),
    dispose: () => {
      window.clearInterval(heartbeat);
      document.removeEventListener("visibilitychange", onVisibility);
      io.disconnect();
      mo.disconnect();
      flushHeartbeat(true);
    },
  };
}
