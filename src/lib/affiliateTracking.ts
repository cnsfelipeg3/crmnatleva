import { supabase } from "@/integrations/supabase/client";

const LS_KEY = "natleva_ref";
const LS_LAST_CLICK = "natleva_ref_last_click";

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

/**
 * Captures ?ref= from URL, persists in localStorage, and registers a click in affiliate_referrals.
 * Dedupes click inserts within a 1h window per (ref + path).
 */
export async function captureRefFromUrl(opts?: {
  productId?: string | null;
  productSlug?: string | null;
}) {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  const ref =
    url.searchParams.get("ref") ||
    url.searchParams.get("aff") ||
    url.searchParams.get("afiliado");
  if (!ref) return;

  // Resolve affiliate (only approved counts)
  const { data: aff } = await supabase
    .from("affiliates")
    .select("id, ref_code, status")
    .eq("ref_code", ref)
    .maybeSingle();

  if (!aff || aff.status !== "approved") return;

  // Persist (extend window each visit)
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
      if (parsed.key === dedupeKey && Date.now() - parsed.at < 60 * 60 * 1000) return;
    } catch {
      /* ignore */
    }
  }

  await supabase.from("affiliate_referrals").insert({
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
  });

  localStorage.setItem(LS_LAST_CLICK, JSON.stringify({ key: dedupeKey, at: Date.now() }));
}
