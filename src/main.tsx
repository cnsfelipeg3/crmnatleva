import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// Fade out the pre-React boot loader as soon as React mounts
requestAnimationFrame(() => {
  const el = document.getElementById("boot-loader");
  if (!el) return;
  el.classList.add("hide");
  setTimeout(() => el.remove(), 400);
});

// ────────────────────────────────────────────────────────────────────
// PWA · registro de service worker com guard contra iframe / Lovable preview
// SW só roda em produção e fora do editor preview, pra evitar cache stale.
// ────────────────────────────────────────────────────────────────────
(() => {
  if (typeof window === "undefined") return;

  const isInIframe = (() => {
    try { return window.self !== window.top; } catch { return true; }
  })();
  const host = window.location.hostname;
  const isPreviewHost =
    host.includes("id-preview--") ||
    host.includes("preview--") ||
    host.includes("lovableproject.com") ||
    host.includes("lovableproject-dev.com");

  if (isInIframe || isPreviewHost) {
    // Limpa qualquer SW registrado anteriormente nesse host
    navigator.serviceWorker?.getRegistrations().then((regs) => {
      regs.forEach((r) => r.unregister());
    }).catch(() => {});
    return;
  }

  if (!import.meta.env.PROD) return;

  import("virtual:pwa-register")
    .then(({ registerSW }) => {
      registerSW({ immediate: true });
    })
    .catch(() => {});
})();
