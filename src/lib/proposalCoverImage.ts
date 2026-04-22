/**
 * Helpers para tratar a capa pública das propostas.
 *
 * Algumas propostas antigas foram salvas com `cover_image_url` contendo um
 * data URL gigantesco (base64 com vários MB). Quando isso vai parar dentro de
 * um <img src="..."> em tela cheia, o browser do cliente trava antes de
 * conseguir pintar qualquer coisa, dando a sensação de loading infinito.
 *
 * Esses helpers normalizam o valor para a UI:
 *   - Mantém URLs http/https normais.
 *   - Mantém data URLs pequenos (até ~150 KB de string base64).
 *   - Descarta data URLs gigantes para que a UI use o fallback visual.
 */

const MAX_DATA_URL_LENGTH = 150_000; // ~110 KB binário

export function sanitizeProposalCoverUrl(raw?: string | null): string | null {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("data:")) {
    if (trimmed.length > MAX_DATA_URL_LENGTH) return null;
    return trimmed;
  }

  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("/")) return trimmed;

  return null;
}