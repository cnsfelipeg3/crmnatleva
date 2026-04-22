/**
 * Helpers para gerar links públicos (compartilhados com clientes)
 * sempre no domínio institucional, em vez do domínio interno do CRM
 * (preview da Lovable, crmnatleva.lovable.app, etc).
 *
 * Ordem de prioridade do "host público":
 *   1. localStorage `natleva.publicHost` (permite override por usuário, ex: testes)
 *   2. VITE_PUBLIC_SITE_URL (build-time)
 *   3. Domínio padrão de produção: https://adm.natleva.com
 *   4. Fallback: window.location.origin
 *
 * Mantemos a possibilidade de fallback para o origin atual em fluxos internos
 * que dependem do mesmo domínio (ex: iframe para export de PDF).
 */

const DEFAULT_PUBLIC_HOST = "https://adm.natleva.com";

export function getPublicHost(): string {
  try {
    const override = typeof window !== "undefined" ? localStorage.getItem("natleva.publicHost") : null;
    if (override) return stripTrailingSlash(override);
  } catch { /* noop */ }

  const envHost = (import.meta as any)?.env?.VITE_PUBLIC_SITE_URL as string | undefined;
  if (envHost) return stripTrailingSlash(envHost);

  return DEFAULT_PUBLIC_HOST;
}

function stripTrailingSlash(s: string) {
  return s.endsWith("/") ? s.slice(0, -1) : s;
}

/** URL pública da proposta (visível para o cliente). */
export function getPublicProposalUrl(slug: string, opts?: { print?: boolean }): string {
  const url = `${getPublicHost()}/proposta/${slug}`;
  return opts?.print ? `${url}?print=1` : url;
}

/** URL do portal do viajante (login do cliente). */
export function getPublicPortalLoginUrl(): string {
  return `${getPublicHost()}/portal/login`;
}
