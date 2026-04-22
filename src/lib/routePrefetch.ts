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
 * Warm up ALL known routes during browser idle time.
 * Called once after the app shell mounts so any sidebar click is instant —
 * the chunks are already in memory by the time the user moves the mouse.
 */
let warmedAll = false;
export function prefetchAllRoutes(): void {
  if (warmedAll) return;
  warmedAll = true;
  const paths = Object.keys(loaders);
  const ric: (cb: () => void, opts?: { timeout: number }) => void =
    (window as any).requestIdleCallback || ((cb: () => void) => setTimeout(cb, 200));
  // Stagger so we don't fire 40+ network requests at the exact same instant.
  paths.forEach((path, i) => {
    setTimeout(() => ric(() => prefetchRoute(path), { timeout: 2000 }), i * 60);
  });
}

