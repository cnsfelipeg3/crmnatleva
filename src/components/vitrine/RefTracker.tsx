import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { captureRefFromUrl } from "@/lib/affiliateTracking";

/**
 * Captures ?ref=<code> on public routes (/loja, /loja/:slug) and persists the affiliate attribution.
 * Mounted once at app root inside the Router context.
 */
export function RefTracker() {
  const location = useLocation();

  useEffect(() => {
    if (!location.search.match(/[?&](ref|aff|afiliado)=/)) return;
    // Only track public storefront routes
    if (!/^\/(loja|p)(\/|$)/.test(location.pathname)) return;

    const slug = location.pathname.match(/^\/(?:loja|p)\/([^/]+)/)?.[1] || null;
    captureRefFromUrl({ productSlug: slug }).catch(() => {});
  }, [location.pathname, location.search]);

  return null;
}
