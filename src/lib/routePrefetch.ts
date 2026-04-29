/**
 * routePrefetch — On hover/focus of a sidebar link, eagerly start fetching the
 * route's lazy chunk so navigation feels instant.
 *
 * Each entry uses the SAME `import("...")` specifier as `App.tsx`, so Vite/Rollup
 * dedupes them to the exact same chunk (the second import is just a cache hit).
 *
 * Calls are idempotent: results are cached, and we swallow errors silently
 * (the real navigation will surface any real failure via Suspense).
 */
const cache = new Map<string, Promise<unknown>>();

type Loader = () => Promise<unknown>;

const loaders: Record<string, Loader> = {
  "/dashboard": () => import("@/pages/Dashboard"),
  "/sales": () => import("@/pages/Sales"),
  "/sales/new": () => import("@/pages/NewSale"),
  "/pendencias": () => import("@/pages/Pendencias"),
  "/cotacoes": () => import("@/pages/CotacoesPropostasPipeline"),
  "/midias": () => import("@/pages/MediaLibrary"),
  "/passengers": () => import("@/pages/Passengers"),
  "/inteligencia-clientes": () => import("@/pages/ClientIntelligence"),
  "/natleva-intelligence": () => import("@/pages/NatLevaIntelligence"),
  "/birthdays": () => import("@/pages/Birthdays"),
  "/viagens": () => import("@/pages/TorreDeControle"),
  "/viagens/monitor": () => import("@/pages/Viagens"),
  "/checkin": () => import("@/pages/Checkin"),
  "/hospedagem": () => import("@/pages/Lodging"),
  "/alteracoes": () => import("@/pages/TripAlterations"),
  "/itinerario": () => import("@/pages/Itinerary"),
  "/propostas": () => import("@/pages/Proposals"),
  "/propostas/nova": () => import("@/pages/ProposalEditor"),
  "/propostas/modelos": () => import("@/pages/ProposalTemplates"),
  "/livechat": () => import("@/pages/LiveChat"),
  "/financeiro": () => import("@/pages/financeiro/FinanceiroIndex"),
  "/financeiro/receber": () => import("@/pages/financeiro/ContasReceber"),
  "/financeiro/pagar": () => import("@/pages/financeiro/ContasPagar"),
  "/financeiro/fluxo": () => import("@/pages/financeiro/FluxoCaixa"),
  "/financeiro/cartoes": () => import("@/pages/financeiro/CartaoCredito"),
  "/financeiro/fornecedores": () => import("@/pages/financeiro/Fornecedores"),
  "/financeiro/taxas": () => import("@/pages/financeiro/TaxasTarifas"),
  "/financeiro/gateways": () => import("@/pages/financeiro/GatewayPagamentos"),
  "/financeiro/simulador": () => import("@/pages/financeiro/SimuladorTaxas"),
  "/financeiro/plano-contas": () => import("@/pages/financeiro/PlanoContas"),
  "/financeiro/comissoes": () => import("@/pages/financeiro/Comissoes"),
  "/financeiro/fechamento": () => import("@/pages/financeiro/FechamentoFornecedores"),
  "/financeiro/dre": () => import("@/pages/financeiro/DREReport"),
  "/rh": () => import("@/pages/rh/RHIndex"),
  "/ai-team": () => import("@/components/ai-team/AITeamLayout"),
  "/operacao/inbox": () => import("@/pages/operacao/OperacaoInbox"),
  "/settings": () => import("@/pages/settings/SettingsIndex"),
  "/import": () => import("@/pages/ImportData"),
  "/apresentacao": () => import("@/pages/ApresentacaoGeral"),
};

/**
 * Detecta conexão lenta ou modo poupança via Network Information API.
 */
function shouldSkipPrefetch(): boolean {
  if (typeof navigator === "undefined") return false;
  const conn = (navigator as any).connection;
  if (!conn) return false;
  if (conn.saveData === true) return true;
  const slow = ["slow-2g", "2g"];
  if (conn.effectiveType && slow.includes(conn.effectiveType)) return true;
  return false;
}

export function prefetchRoute(path: string): void {
  const loader = loaders[path];
  if (!loader) return;
  if (cache.has(path)) return;
  try {
    // Defer to idle so it never competes with critical work in flight.
    const start = () => {
      const p = loader().catch(() => undefined);
      cache.set(path, p);
    };
    if (typeof (window as any).requestIdleCallback === "function") {
      (window as any).requestIdleCallback(start, { timeout: 800 });
    } else {
      setTimeout(start, 80);
    }
  } catch {
    /* noop */
  }
}

/**
 * Lista priorizada · prefetch SOMENTE rotas mais usadas.
 * Resto fica para hover/focus na sidebar (prefetchRoute).
 */
const HIGH_PRIORITY_ROUTES = [
  "/dashboard",
  "/sales",
  "/livechat",
  "/cotacoes",
  "/viagens",
  "/financeiro",
  "/operacao/inbox",
  "/propostas",
];

/**
 * Prefetch das rotas top-priority com concorrência limitada (3 paralelas).
 * Pula completamente em conexão lenta ou modo "Save Data".
 */
let warmedAll = false;
export function prefetchAllRoutes(): void {
  if (warmedAll) return;
  warmedAll = true;

  if (shouldSkipPrefetch()) {
    if (typeof console !== "undefined") {
      console.log("[prefetch] skipped: slow connection or saveData");
    }
    return;
  }

  const queue = HIGH_PRIORITY_ROUTES.filter((p) => !cache.has(p) && loaders[p]);
  let active = 0;
  let i = 0;

  const next = () => {
    while (active < 3 && i < queue.length) {
      const path = queue[i++];
      const loader = loaders[path];
      active++;
      const promise = loader()
        .catch(() => null)
        .finally(() => {
          active--;
          next();
        });
      cache.set(path, promise);
    }
  };
  next();
}
