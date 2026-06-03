import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { captureRefFromUrl, pingReferralTime } from "@/lib/affiliateTracking";

/**
 * Captures ?ref=<code> on public storefront routes and persists the affiliate attribution.
 * Also pings time-on-page periodically to enrich the referral row.
 * Mounted once at app root inside the Router context.
 */
export function RefTracker() {
  const location = useLocation();
  const referralIdRef = useRef<string | null>(null);
  const startRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!location.search.match(/[?&](ref|aff|afiliado)=/)) return;
    if (!/^\/(loja|p|vitrine\/pacotes)(\/|$)/.test(location.pathname)) return;

    const slug = location.pathname.match(/^\/(?:loja|p|vitrine\/pacotes)\/([^/]+)/)?.[1] || null;
    startRef.current = Date.now();
    captureRefFromUrl({ productSlug: slug })
      .then((id) => {
        referralIdRef.current = id;
      })
      .catch(() => {});
  }, [location.pathname, location.search]);

  // Ping de tempo na página · ao desmontar / sair
  useEffect(() => {
    const interval = setInterval(() => {
      if (referralIdRef.current) {
        const secs = Math.round((Date.now() - startRef.current) / 1000);
        if (secs > 5 && secs < 60 * 30) pingReferralTime(referralIdRef.current, secs);
      }
    }, 30_000);
    const onUnload = () => {
      if (referralIdRef.current) {
        const secs = Math.round((Date.now() - startRef.current) / 1000);
        if (secs > 5 && secs < 60 * 30) pingReferralTime(referralIdRef.current, secs);
      }
    };
    window.addEventListener("beforeunload", onUnload);
    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", onUnload);
    };
  }, []);

  return null;
}
