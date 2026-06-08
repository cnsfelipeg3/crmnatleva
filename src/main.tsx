import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initChunkErrorRecovery } from "./lib/chunkErrorRecovery";

// Auto-recovery de bundles desatualizados (PWA com cache velho · clique
// que "não faz nada" porque o chunk JS pedido não existe mais no servidor).
// Tem que ser a PRIMEIRA coisa pra capturar erros de import durante o boot.
initChunkErrorRecovery();

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

