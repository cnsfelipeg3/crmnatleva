import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Marca <html> como standalone PWA assim que possível (esconde elementos browser-only via CSS)
if (typeof window !== "undefined") {
  const isStandalone =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (isStandalone) document.documentElement.classList.add("pwa-standalone");
}

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
      const updateSW = registerSW({
        immediate: true,
        onNeedRefresh() {
          // Nova versão detectada · ativa skipWaiting e recarrega imediatamente
          // pra que TODA mudança (desktop e mobile) apareça sem clicar nada.
          try { updateSW(true); } catch { /* ignore */ }
          // fallback: força reload caso o SW novo demore
          setTimeout(() => {
            try { window.location.reload(); } catch { /* ignore */ }
          }, 1500);
        },
        onOfflineReady() {
          // app pronto pra uso offline · sem ruído
        },
      });

      // Revalidação proativa · checa nova versão periodicamente e em
      // pontos críticos (volta da aba, reconexão de rede, foco da janela).
      const checkForUpdate = () => {
        try { updateSW(); } catch { /* ignore */ }
        navigator.serviceWorker?.getRegistrations()
          .then((regs) => regs.forEach((r) => r.update().catch(() => {})))
          .catch(() => {});
      };

      // a cada 60s
      setInterval(checkForUpdate, 60_000);
      // ao voltar pra aba (típico no PWA mobile)
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") checkForUpdate();
      });
      // ao recuperar conexão
      window.addEventListener("online", checkForUpdate);
      // ao focar a janela (desktop)
      window.addEventListener("focus", checkForUpdate);

      // Quando o SW assume controle (skipWaiting + clientsClaim), recarrega
      // a página automaticamente · garante que o usuário sempre veja o build novo.
      let reloadingFromSW = false;
      navigator.serviceWorker?.addEventListener("controllerchange", () => {
        if (reloadingFromSW) return;
        reloadingFromSW = true;
        try { window.location.reload(); } catch { /* ignore */ }
      });
    })
    .catch(() => {});
})();
