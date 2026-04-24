/**
 * Versão server-safe (Deno edge functions) do catálogo de produtos.
 * ESPELHA src/lib/productTypes.ts — DEVE ser mantido em sincronia.
 *
 * Diferenças vs frontend:
 *  - Sem React/lucide (apenas dados puros).
 *  - Sem fetch ao banco (catálogo hard-coded como fonte canônica).
 *  - inferProductSlugsFromSale + normalizeProductsToSlugs idênticas.
 *
 * Uso típico em edges de escrita:
 *   import { normalizeProductsToSlugs, inferProductSlugsFromSale } from "../_shared/productTypes.ts";
 *   const products = normalizeProductsToSlugs(rawProducts);  // slugs canônicos
 */

export interface ProductType {
  slug: string;
  label: string;
  category: string;
  is_composite: boolean;
}

const CANONICAL_SLUGS = new Set<string>([
  "aereo", "hospedagem", "pacote", "transfer", "aluguel-carro", "trem", "onibus",
  "cruzeiro", "passeios", "ingressos", "seguro-viagem", "bagagem",
  "assento-conforto", "remarcacao-aereo", "roteiro-personalizado",
  "servicos-extras", "outros",
]);

const LEGACY_LABEL_TO_SLUG: Record<string, string | string[]> = {
  // 1:1
  "Passagem Aérea": "aereo",
  "Aéreo": "aereo",
  "Hospedagem": "hospedagem",
  "Hotel": "hospedagem",
  "Seguro Viagem": "seguro-viagem",
  "Transfer": "transfer",
  "Serviços Extras": "servicos-extras",
  "Passeios e Tours": "passeios",
  "Aluguel de Carro": "aluguel-carro",
  "Ingressos": "ingressos",
  "Passagem de Trem": "trem",
  "Assento Conforto": "assento-conforto",
  "Bagagem": "bagagem",
  "Remarcação Passagem Aérea": "remarcacao-aereo",
  "Passagem de Ônibus": "onibus",
  "Cruzeiro": "cruzeiro",
  "Outros": "outros",
  // Compostos
  "Passagem Aérea e Hospedagem": ["pacote", "aereo", "hospedagem"],
  "Passagem Aérea Serviços Extras Seguro Viagem": ["aereo", "servicos-extras", "seguro-viagem"],
  // Aliases internos
  "transfer": "transfer",
  "trem": "trem",
  "seguro": "seguro-viagem",
  "passeio": "passeios",
  "ingresso": "ingressos",
  "aluguel_carro": "aluguel-carro",
  "roteiro": "roteiro-personalizado",
  "outros": "outros",
};

/** Converte um input (slug, label antigo, alias) em slug canônico. */
export function getProductSlug(input: string | null | undefined): string {
  if (!input) return "outros";
  const trimmed = String(input).trim();
  if (CANONICAL_SLUGS.has(trimmed)) return trimmed;
  const alias = LEGACY_LABEL_TO_SLUG[trimmed];
  if (alias) return Array.isArray(alias) ? alias[0] : alias;
  // tenta lower-case match
  const lower = trimmed.toLowerCase();
  if (CANONICAL_SLUGS.has(lower)) return lower;
  return "outros";
}

/** Expande um label que pode mapear a múltiplos slugs (ex: combo). */
export function expandLegacyLabel(input: string | null | undefined): string[] {
  if (!input) return [];
  const trimmed = String(input).trim();
  const alias = LEGACY_LABEL_TO_SLUG[trimmed];
  if (Array.isArray(alias)) return alias;
  return [getProductSlug(trimmed)];
}

/** Normaliza um array de products → slugs canônicos únicos. Expande combos. */
export function normalizeProductsToSlugs(arr: (string | null | undefined)[] | null | undefined): string[] {
  if (!arr || arr.length === 0) return [];
  const out = new Set<string>();
  for (const item of arr) {
    if (!item) continue;
    for (const slug of expandLegacyLabel(item)) out.add(slug);
  }
  return Array.from(out);
}

export interface SaleInferenceInput {
  airline?: string | null;
  origin_iata?: string | null;
  destination_iata?: string | null;
  departure_date?: string | null;
  hotel_name?: string | null;
  hotel_city?: string | null;
  hotel_checkin_date?: string | null;
  hotel_reservation_code?: string | null;
  hotel_address?: string | null;
  airCost?: number;
  hotelCost?: number;
  flightSegmentsCount?: number;
  hotelEntriesCount?: number;
  explicitOtherSlugs?: string[];
}

/** Infere slugs de produtos a partir de sinais estruturados de uma venda. */
export function inferProductSlugsFromSale(input: SaleInferenceInput): string[] {
  const slugs = new Set<string>();

  const hasAereo =
    (input.airCost ?? 0) > 0 ||
    !!input.airline ||
    !!input.origin_iata ||
    !!input.destination_iata ||
    !!input.departure_date ||
    (input.flightSegmentsCount ?? 0) > 0;
  if (hasAereo) slugs.add("aereo");

  const hasHospedagem =
    (input.hotelCost ?? 0) > 0 ||
    !!input.hotel_name ||
    !!input.hotel_city ||
    !!input.hotel_checkin_date ||
    !!input.hotel_reservation_code ||
    !!input.hotel_address ||
    (input.hotelEntriesCount ?? 0) > 0;
  if (hasHospedagem) slugs.add("hospedagem");

  for (const s of input.explicitOtherSlugs ?? []) {
    if (s) slugs.add(getProductSlug(s));
  }

  if (slugs.has("aereo") && slugs.has("hospedagem")) slugs.add("pacote");

  return Array.from(slugs);
}
