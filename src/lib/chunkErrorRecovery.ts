/**
 * Auto-recovery de chunks desatualizados (stale PWA bundles).
 *
 * Sintoma típico (relatado em PWA instalado em desktop/mobile):
 *  · "cliques não fazem nada"
 *  · "erro de carregamento toda hora"
 *  · alguns botões funcionam, outros não
 *
 * Causa: o computador tem o bundle V1 cacheado (Service Worker ou HTTP cache),
 * mas o servidor já está na V2. Toda vez que o app faz `import()` dinâmico
 * (lazy de página, lazy de dialog, lazy de chart), o navegador pede um
 * `/assets/xxx-<hash>.js` que não existe mais → throw → o clique vira no-op.
 *
 * Solução: capturar esse tipo específico de erro, limpar caches + service
 * worker e forçar reload automático SEM intervenção do usuário.
 *
 * Roda apenas uma vez por sessão pra evitar loop de reload.
 */
const RECOVERY_KEY = "__chunk_recovery_attempted__";

const CHUNK_ERROR_PATTERNS = [
  /Failed to fetch dynamically imported module/i,
  /Importing a module script failed/i,
  /Loading chunk \d+ failed/i,
  /Loading CSS chunk/i,
  /error loading dynamically imported module/i,
  /Unable to preload CSS/i,
  /ChunkLoadError/i,
];

function isChunkError(input: unknown): boolean {
  if (!input) return false;
  const text = (() => {
    if (input instanceof Error) return `${input.name} ${input.message}`;
    if (typeof input === "string") return input;
    try { return String((input as { message?: unknown }).message ?? input); }
    catch { return ""; }
  })();
  return CHUNK_ERROR_PATTERNS.some((re) => re.test(text));
}

async function nukeAndReload(reason: string) {
  // Evita loop · só uma tentativa por sessão da aba
  if (typeof sessionStorage !== "undefined") {
    if (sessionStorage.getItem(RECOVERY_KEY)) {
      // Já tentamos uma vez · se ainda quebra, não fica em loop. Loga e desiste.
      // eslint-disable-next-line no-console
      console.warn("[chunk-recovery] already attempted recovery, giving up:", reason);
      return;
    }
    sessionStorage.setItem(RECOVERY_KEY, String(Date.now()));
  }

  // eslint-disable-next-line no-console
  console.warn("[chunk-recovery] stale bundle detected, recovering:", reason);

  try {
    // 1) Limpa todos os caches do navegador (Workbox · imagens · API)
    if (typeof caches !== "undefined") {
      const names = await caches.keys();
      await Promise.all(names.map((n) => caches.delete(n)));
    }
  } catch { /* ignore */ }

  try {
    // 2) Desregistra qualquer service worker velho
    const regs = await navigator.serviceWorker?.getRegistrations();
    if (regs) await Promise.all(regs.map((r) => r.unregister().catch(() => false)));
  } catch { /* ignore */ }

  // 3) Hard reload bypassando HTTP cache
  try {
    const url = new URL(window.location.href);
    url.searchParams.set("__r", String(Date.now()));
    window.location.replace(url.toString());
  } catch {
    window.location.reload();
  }
}

export function initChunkErrorRecovery() {
  if (typeof window === "undefined") return;

  // 1) Promises não tratadas (caso mais comum · import() em event handler)
  window.addEventListener("unhandledrejection", (event) => {
    if (isChunkError(event.reason)) {
      event.preventDefault();
      void nukeAndReload(`unhandledrejection: ${String(event.reason)}`);
    }
  });

  // 2) Erros síncronos / erros de carregamento de <script>
  window.addEventListener("error", (event) => {
    if (isChunkError(event.error) || isChunkError(event.message)) {
      void nukeAndReload(`error: ${event.message}`);
      return;
    }
    // <script src> ou <link rel=stylesheet> que falhou: o `event.target`
    // é o elemento que falhou em carregar (não há `error` no event).
    const tgt = event.target as HTMLElement | null;
    if (tgt && (tgt.tagName === "SCRIPT" || tgt.tagName === "LINK")) {
      const src = (tgt as HTMLScriptElement).src || (tgt as HTMLLinkElement).href || "";
      if (src.includes("/assets/")) {
        void nukeAndReload(`asset load failed: ${src}`);
      }
    }
  }, true); // capture phase · pega resource errors que não burbulham
}
