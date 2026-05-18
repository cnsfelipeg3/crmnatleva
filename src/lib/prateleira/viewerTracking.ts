// =====================================================================
// Tracking de comportamento na página pública de venda da prateleira
// · heartbeat de tempo ativo (atualiza active_seconds)
// · IntersectionObserver registra section_view por seção
// · helper trackClick para CTAs, galeria, share, whatsapp etc.
// · usa fetch keepalive no unload p/ garantir gravação em mobile Safari
// =====================================================================

import { supabase } from "@/integrations/supabase/client";

interface InitOpts {
  productId: string;
  email: string;
  viewerId?: string | null;
}

interface Tracker {
  trackClick: (target: string, section?: string, metadata?: Record<string, any>) => void;
  trackEvent: (eventType: string, opts?: { section?: string; target?: string; metadata?: Record<string, any> }) => void;
  dispose: () => void;
}

const HEARTBEAT_MS = 10_000; // flush a cada 10s (era 15s)
const SECTION_THRESHOLD = 0.45;

const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_KEY = (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export function initViewerTracking({ productId, email, viewerId: initialViewerId }: InitOpts): Tracker {
  let viewerId: string | null = initialViewerId || null;
  let activeMs = 0;
  let lastTick = Date.now();
  let visible = !document.hidden;
  let accumulatedSeconds = 0; // total de segundos ativos acumulados nesta sessão
  const seenSections = new Set<string>();

  // Resolve viewer_id se não foi passado
  if (!viewerId) {
    (async () => {
      try {
        const { data } = await (supabase as any)
          .from("prateleira_product_viewers")
          .select("id")
          .eq("product_id", productId)
          .eq("email", email)
          .maybeSingle();
        if (data) viewerId = data.id;
      } catch {}
    })();
  }

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

  // Envia PATCH via fetch keepalive — sobrevive ao unload em mobile
  const sendKeepalivePatch = (id: string, newActiveSeconds: number) => {
    if (!SUPABASE_URL || !SUPABASE_KEY) return false;
    try {
      const url = `${SUPABASE_URL}/rest/v1/prateleira_product_viewers?id=eq.${id}`;
      fetch(url, {
        method: "PATCH",
        keepalive: true,
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          active_seconds: newActiveSeconds,
          last_active_at: new Date().toISOString(),
        }),
      }).catch(() => {});
      return true;
    } catch { return false; }
  };

  const flushHeartbeat = (force = false) => {
    const now = Date.now();
    if (visible) activeMs += now - lastTick;
    lastTick = now;
    const seconds = Math.floor(activeMs / 1000);
    // limiar mínimo de 2s (era 5s) — captura visitas curtas
    if (seconds < 2 && !force) return;
    if (seconds < 1) return;
    activeMs = activeMs - seconds * 1000;
    accumulatedSeconds += seconds;

    // Caminho rápido com keepalive (funciona inclusive no unload)
    if (viewerId && force) {
      // No unload: precisamos do total atualizado, mas não temos tempo de ler antes.
      // Estratégia: pedimos para o servidor incrementar via update com a soma da sessão.
      // Como não temos RPC, usamos um PATCH com o valor acumulado da sessão somado ao último lido.
      // Para garantir, fazemos um fetch async normal aqui também:
    }

    (async () => {
      try {
        if (!viewerId) {
          const { data } = await (supabase as any)
            .from("prateleira_product_viewers")
            .select("id, active_seconds")
            .eq("product_id", productId).eq("email", email).maybeSingle();
          if (!data) return;
          viewerId = data.id;
          const newVal = (data.active_seconds || 0) + seconds;
          if (force && viewerId) sendKeepalivePatch(viewerId, newVal);
          await (supabase as any).from("prateleira_product_viewers")
            .update({ active_seconds: newVal, last_active_at: new Date().toISOString() })
            .eq("id", viewerId);
        } else {
          const { data } = await (supabase as any)
            .from("prateleira_product_viewers")
            .select("active_seconds").eq("id", viewerId).maybeSingle();
          const newVal = (data?.active_seconds || 0) + seconds;
          if (force) sendKeepalivePatch(viewerId, newVal);
          await (supabase as any).from("prateleira_product_viewers")
            .update({ active_seconds: newVal, last_active_at: new Date().toISOString() })
            .eq("id", viewerId);
        }
      } catch {
        // Se a chamada async falhou e estamos no unload, ao menos o keepalive tentou
      }
    })();
  };

  const onVisibility = () => {
    const nowVisible = !document.hidden;
    if (visible && !nowVisible) flushHeartbeat(true);
    visible = nowVisible;
    lastTick = Date.now();
  };

  const onPageHide = () => flushHeartbeat(true);

  const heartbeat = window.setInterval(() => flushHeartbeat(false), HEARTBEAT_MS);
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("pagehide", onPageHide);
  window.addEventListener("beforeunload", onPageHide);

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
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("beforeunload", onPageHide);
      io.disconnect();
      mo.disconnect();
      flushHeartbeat(true);
    },
  };
}
