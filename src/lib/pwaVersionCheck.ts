// Verificador de versão pro PWA · garante que toda reabertura do app
// instalado pegue o build mais recente. Funciona em paralelo ao service worker.
//
// Estratégia: ao abrir o app standalone (PWA), busca /index.html com
// cache:no-store. Se a referência do script principal (/src/main.tsx ou
// /assets/index-*.js) mudou em relação ao build atualmente em execução,
// faz force refresh automático.

import { forceAppRefresh, isStandalonePWA } from "./forceRefresh";

const STORAGE_KEY = "__natleva_pwa_build_id__";
const LAST_CHECK_KEY = "__natleva_pwa_last_check__";
const MIN_INTERVAL_MS = 15_000; // não checa mais que 1x a cada 15s

function extractMainScript(html: string): string | null {
  // Captura o primeiro <script type="module" src="...">
  const m = html.match(/<script[^>]*type=["']module["'][^>]*src=["']([^"']+)["']/i);
  return m?.[1] ?? null;
}

async function getCurrentBuildId(): Promise<string | null> {
  // Em produção, o script principal é algo como /assets/index-<hash>.js
  // Pega o primeiro script type=module do DOM atual.
  const el = document.querySelector('script[type="module"][src]') as HTMLScriptElement | null;
  return el?.getAttribute("src") ?? null;
}

async function fetchRemoteBuildId(): Promise<string | null> {
  try {
    const url = `/?_v=${Date.now()}`;
    const res = await fetch(url, {
      cache: "no-store",
      credentials: "same-origin",
      headers: { "Cache-Control": "no-cache, no-store, must-revalidate" },
    });
    if (!res.ok) return null;
    const html = await res.text();
    return extractMainScript(html);
  } catch {
    return null;
  }
}

async function runCheck(opts: { silent?: boolean } = {}) {
  try {
    const now = Date.now();
    const last = Number(sessionStorage.getItem(LAST_CHECK_KEY) || "0");
    if (now - last < MIN_INTERVAL_MS) return;
    sessionStorage.setItem(LAST_CHECK_KEY, String(now));

    const current = await getCurrentBuildId();
    const remote = await fetchRemoteBuildId();
    if (!current || !remote) return;

    // Normaliza · ignora query strings residuais
    const norm = (s: string) => s.split("?")[0];
    if (norm(current) === norm(remote)) {
      // build igual · salva como referência
      try { localStorage.setItem(STORAGE_KEY, norm(current)); } catch { /* ignore */ }
      return;
    }

    // Build mudou · força atualização completa
    // eslint-disable-next-line no-console
    console.warn("[pwa-version] Build novo detectado · forçando refresh", {
      current: norm(current),
      remote: norm(remote),
    });
    await forceAppRefresh({ silent: opts.silent ?? true });
  } catch {
    /* ignore */
  }
}

export function initPWAVersionCheck() {
  if (typeof window === "undefined") return;

  // Só roda em PWA standalone instalado · no browser normal o SW + reload
  // automático já bastam, evitamos overhead extra.
  if (!isStandalonePWA()) return;

  // Check imediato ao abrir
  // delay curto pra não competir com a hidratação do React
  setTimeout(() => { runCheck({ silent: true }); }, 1500);

  // Check ao voltar pra aba (típico de reabrir app no iOS/Android)
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      runCheck({ silent: true });
    }
  });

  // Check ao recuperar conexão de rede
  window.addEventListener("online", () => { runCheck({ silent: true }); });
}
