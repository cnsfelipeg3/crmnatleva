// Utilitário pra forçar atualização completa do app · limpa SW, caches e bundle.
// Usado pelo botão "Forçar atualização" e pelo verificador automático de versão.

export async function forceAppRefresh(opts: { silent?: boolean } = {}) {
  const { silent = false } = opts;

  try {
    // 1) Desregistra todos os service workers desse origin
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister().catch(() => false)));
    }
  } catch { /* ignore */ }

  try {
    // 2) Apaga todos os caches do Cache Storage (workbox, runtime, etc.)
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k).catch(() => false)));
    }
  } catch { /* ignore */ }

  try {
    // 3) Marca timestamp da última limpeza
    localStorage.setItem("__natleva_last_force_refresh__", String(Date.now()));
  } catch { /* ignore */ }

  // 4) Reload com cache-bust query param · força o browser a buscar HTML novo
  const url = new URL(window.location.href);
  url.searchParams.set("_r", String(Date.now()));

  if (!silent) {
    // pequeno delay pra UI mostrar feedback antes de reload
    await new Promise((res) => setTimeout(res, 150));
  }

  window.location.replace(url.toString());
}

// Detecta se estamos rodando como PWA instalado (standalone)
export function isStandalonePWA(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}
