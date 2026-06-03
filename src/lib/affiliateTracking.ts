import { supabase } from "@/integrations/supabase/client";

const LS_KEY = "natleva_ref";
const LS_LAST_CLICK = "natleva_ref_last_click";
const LS_SESSION = "natleva_aff_session";

export type StoredRef = {
  code: string;
  affiliateId: string;
  savedAt: string;
};

export function getStoredRef(): StoredRef | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredRef;
  } catch {
    return null;
  }
}

export function clearStoredRef() {
  localStorage.removeItem(LS_KEY);
  localStorage.removeItem(LS_LAST_CLICK);
}

function getOrCreateSessionId(): string {
  try {
    const existing = localStorage.getItem(LS_SESSION);
    if (existing) {
      const parsed = JSON.parse(existing) as { id: string; at: number };
      // session válida por 24h
      if (Date.now() - parsed.at < 24 * 60 * 60 * 1000) {
        return parsed.id;
      }
    }
  } catch {
    /* ignore */
  }
  const id = crypto.randomUUID();
  try {
    localStorage.setItem(LS_SESSION, JSON.stringify({ id, at: Date.now() }));
  } catch {
    /* ignore */
  }
  return id;
}

function detectDevice(): "mobile" | "tablet" | "desktop" {
  const ua = navigator.userAgent || "";
  if (/iPad|Tablet|PlayBook|Silk/i.test(ua)) return "tablet";
  if (/Mobi|Android|iPhone|iPod/i.test(ua)) return "mobile";
  return "desktop";
}

/**
 * Captures ?ref= from URL, persists in localStorage, and registers a click in affiliate_referrals.
 * Dedupes click inserts within a 1h window per (ref + path).
 * Returns the referral id (when a new click row was created) so callers can use it for ping updates.
 */
export async function captureRefFromUrl(opts?: {
  productId?: string | null;
  productSlug?: string | null;
}): Promise<string | null> {
  if (typeof window === "undefined") return null;

  const url = new URL(window.location.href);
  const ref =
    url.searchParams.get("ref") ||
    url.searchParams.get("aff") ||
    url.searchParams.get("afiliado");
  if (!ref) return null;

  const { data: aff } = await supabase
    .from("affiliates")
    .select("id, ref_code, status")
    .eq("ref_code", ref)
    .maybeSingle();

  if (!aff || aff.status !== "approved") return null;

  const stored: StoredRef = {
    code: aff.ref_code,
    affiliateId: aff.id,
    savedAt: new Date().toISOString(),
  };
  localStorage.setItem(LS_KEY, JSON.stringify(stored));

  // Dedupe click within 1h per path
  const dedupeKey = `${ref}|${url.pathname}`;
  const lastClick = localStorage.getItem(LS_LAST_CLICK);
  if (lastClick) {
    try {
      const parsed = JSON.parse(lastClick) as { key: string; at: number };
      if (parsed.key === dedupeKey && Date.now() - parsed.at < 60 * 60 * 1000) return null;
    } catch {
      /* ignore */
    }
  }

  const sessionId = getOrCreateSessionId();
  const device = detectDevice();
  const referrer = document.referrer || "direct";

  const { data: inserted } = await supabase
    .from("affiliate_referrals")
    .insert({
      affiliate_id: aff.id,
      ref_code: aff.ref_code,
      product_id: opts?.productId ?? null,
      product_slug: opts?.productSlug ?? null,
      source_page: url.pathname + url.search,
      utm_source: url.searchParams.get("utm_source"),
      utm_medium: url.searchParams.get("utm_medium"),
      utm_campaign: url.searchParams.get("utm_campaign"),
      user_agent: navigator.userAgent.slice(0, 500),
      status: "click",
      device_type: device,
      referrer: referrer.slice(0, 300),
      session_id: sessionId,
      time_on_page_seconds: 0,
    })
    .select("id")
    .maybeSingle();

  localStorage.setItem(LS_LAST_CLICK, JSON.stringify({ key: dedupeKey, at: Date.now() }));

  return inserted?.id ?? null;
}

/**
 * Updates time_on_page_seconds for a referral row. Safe to call repeatedly.
 */
export async function pingReferralTime(referralId: string, seconds: number) {
  if (!referralId || seconds <= 0) return;
  await supabase
    .from("affiliate_referrals")
    .update({ time_on_page_seconds: Math.round(seconds) })
    .eq("id", referralId);
}
