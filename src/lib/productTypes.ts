/**
 * Catálogo unificado de tipos de produto (vendas).
 *
 * Filosofia:
 *  - O banco passa a armazenar SLUGS canônicos (ex: "aereo", "hospedagem", "pacote").
 *  - A UI sempre exibe LABELS legíveis (ex: "Aéreo", "Hospedagem", "Pacote").
 *  - Durante a transição, este helper aceita BOTH (slug ou label antigo) e normaliza.
 *
 * Fonte de verdade:
 *  - Tabela `product_types` (Supabase) — carregada via React Query (1h de cache).
 *  - Catálogo hard-coded abaixo serve como fallback caso o fetch falhe.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Plane, Hotel, Package, Car, Train, Bus, Ship, MapPin, Ticket,
  Shield, Luggage, Armchair, ShoppingBag,
  type LucideIcon,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface ProductType {
  slug: string;
  label: string;
  icon_name: string;
  icon_color: string;
  category: string;
  is_composite: boolean;
  is_active?: boolean;
  sort_order?: number;
}

export interface ProductMeta {
  slug: string;
  label: string;
  icon: LucideIcon;
  className: string;
  category: string;
  isComposite: boolean;
}

// ─── Map de ícones (icon_name → componente) ────────────────────────────────

const ICON_REGISTRY: Record<string, LucideIcon> = {
  Plane, Hotel, Package, Car, Train, Bus, Ship, MapPin, Ticket,
  Shield, Luggage, Armchair, ShoppingBag,
};

// ─── Catálogo fallback (espelha o seed da tabela product_types) ────────────

const FALLBACK_CATALOG: ProductType[] = [
  { slug: "aereo",                  label: "Aéreo",                  icon_name: "Plane",       icon_color: "text-primary",            category: "transporte",  is_composite: false, sort_order: 10 },
  { slug: "hospedagem",             label: "Hospedagem",             icon_name: "Hotel",       icon_color: "text-accent",             category: "hospedagem",  is_composite: false, sort_order: 20 },
  { slug: "pacote",                 label: "Pacote",                 icon_name: "Package",     icon_color: "text-primary",            category: "pacote",      is_composite: true,  sort_order: 30 },
  { slug: "transfer",               label: "Transfer",               icon_name: "Car",         icon_color: "text-chart-3",            category: "transporte",  is_composite: false, sort_order: 40 },
  { slug: "aluguel-carro",          label: "Aluguel de Carro",       icon_name: "Car",         icon_color: "text-chart-3",            category: "transporte",  is_composite: false, sort_order: 50 },
  { slug: "trem",                   label: "Passagem de Trem",       icon_name: "Train",       icon_color: "text-chart-4",            category: "transporte",  is_composite: false, sort_order: 60 },
  { slug: "onibus",                 label: "Passagem de Ônibus",     icon_name: "Bus",         icon_color: "text-chart-5",            category: "transporte",  is_composite: false, sort_order: 70 },
  { slug: "cruzeiro",               label: "Cruzeiro",               icon_name: "Ship",        icon_color: "text-chart-1",            category: "transporte",  is_composite: false, sort_order: 80 },
  { slug: "passeios",               label: "Passeios e Tours",       icon_name: "MapPin",      icon_color: "text-chart-4",            category: "experiencia", is_composite: false, sort_order: 90 },
  { slug: "ingressos",              label: "Ingressos",              icon_name: "Ticket",      icon_color: "text-chart-2",            category: "experiencia", is_composite: false, sort_order: 100 },
  { slug: "seguro-viagem",          label: "Seguro Viagem",          icon_name: "Shield",      icon_color: "text-info",               category: "seguranca",   is_composite: false, sort_order: 110 },
  { slug: "bagagem",                label: "Bagagem",                icon_name: "Luggage",     icon_color: "text-muted-foreground",   category: "transporte",  is_composite: false, sort_order: 120 },
  { slug: "assento-conforto",       label: "Assento Conforto",       icon_name: "Armchair",    icon_color: "text-chart-5",            category: "transporte",  is_composite: false, sort_order: 130 },
  { slug: "remarcacao-aereo",       label: "Remarcação Aérea",       icon_name: "Plane",       icon_color: "text-warning-foreground", category: "transporte",  is_composite: false, sort_order: 140 },
  { slug: "roteiro-personalizado",  label: "Roteiro Personalizado",  icon_name: "MapPin",      icon_color: "text-chart-3",            category: "experiencia", is_composite: false, sort_order: 150 },
  { slug: "servicos-extras",        label: "Serviços Extras",        icon_name: "Package",     icon_color: "text-muted-foreground",   category: "outros",      is_composite: false, sort_order: 160 },
  { slug: "outros",                 label: "Outros",                 icon_name: "ShoppingBag", icon_color: "text-muted-foreground",   category: "outros",      is_composite: false, sort_order: 170 },
];

// ─── Mapa de aliases legados (label antigo → slug canônico) ────────────────
// Cobre 100% dos labels históricos identificados no diagnóstico.

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
  // Compostos (combo legado)
  "Passagem Aérea e Hospedagem": ["pacote", "aereo", "hospedagem"],
  // String concatenada legada
  "Passagem Aérea Serviços Extras Seguro Viagem": ["aereo", "servicos-extras", "seguro-viagem"],
  // Aliases UI internos (NewSale costumava usar estes value="seguro" etc)
  "transfer": "transfer",
  "trem": "trem",
  "seguro": "seguro-viagem",
  "passeio": "passeios",
  "ingresso": "ingressos",
  "aluguel_carro": "aluguel-carro",
  "roteiro": "roteiro-personalizado",
  "outros": "outros",
};

// ─── Hook principal: useProductTypes ───────────────────────────────────────

export function useProductTypes() {
  const query = useQuery({
    queryKey: ["product_types"],
    queryFn: async (): Promise<ProductType[]> => {
      const { data, error } = await supabase
        .from("product_types" as any)
        .select("slug,label,icon_name,icon_color,category,is_composite,is_active,sort_order")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data as unknown as ProductType[]) || FALLBACK_CATALOG;
    },
    staleTime: 1000 * 60 * 60, // 1h
    gcTime:    1000 * 60 * 60 * 6,
    retry: 1,
  });

  return {
    catalog: query.data ?? FALLBACK_CATALOG,
    isLoading: query.isLoading,
    error: query.error,
  };
}

// ─── Funções utilitárias (puras, não-React) ────────────────────────────────
// Usam o catálogo fallback. Para reatividade ao catálogo do banco, use useProductTypes.

const warnedLabels = new Set<string>();

function warnLegacyOnce(input: string, slug: string) {
  if (process.env.NODE_ENV === "production") return;
  if (warnedLabels.has(input)) return;
  warnedLabels.add(input);
   
  console.warn(`[productTypes] legacy label detected: "${input}" — should be migrated to slug "${slug}"`);
}

/** Converte qualquer entrada (slug ou label antigo) para slug canônico. */
export function getProductSlug(input: string | null | undefined, catalog: ProductType[] = FALLBACK_CATALOG): string {
  if (!input) return "outros";
  const trimmed = input.trim();
  // já é slug
  if (catalog.some(p => p.slug === trimmed)) return trimmed;
  // alias legado
  const alias = LEGACY_LABEL_TO_SLUG[trimmed];
  if (alias) {
    const slug = Array.isArray(alias) ? alias[0] : alias;
    warnLegacyOnce(trimmed, slug);
    return slug;
  }
  // fallback: tenta match case-insensitive por label
  const byLabel = catalog.find(p => p.label.toLowerCase() === trimmed.toLowerCase());
  if (byLabel) return byLabel.slug;
  return "outros";
}

/** Expande um label que pode mapear a múltiplos slugs (ex: combo). */
export function expandLegacyLabel(input: string): string[] {
  const alias = LEGACY_LABEL_TO_SLUG[input?.trim()];
  if (Array.isArray(alias)) return alias;
  return [getProductSlug(input)];
}

/** Retorna metadados completos (label, ícone, cor) para exibição. */
export function getProductMeta(input: string | null | undefined, catalog: ProductType[] = FALLBACK_CATALOG): ProductMeta {
  const slug = getProductSlug(input, catalog);
  const pt = catalog.find(p => p.slug === slug) ?? FALLBACK_CATALOG.find(p => p.slug === slug) ?? FALLBACK_CATALOG[FALLBACK_CATALOG.length - 1];
  return {
    slug: pt.slug,
    label: pt.label,
    icon: ICON_REGISTRY[pt.icon_name] || ShoppingBag,
    className: pt.icon_color || "text-muted-foreground",
    category: pt.category,
    isComposite: pt.is_composite,
  };
}

export function getProductLabel(input: string | null | undefined, catalog?: ProductType[]) {
  return getProductMeta(input, catalog).label;
}

export function getProductIcon(input: string | null | undefined, catalog?: ProductType[]) {
  return getProductMeta(input, catalog).icon;
}

export function getProductColor(input: string | null | undefined, catalog?: ProductType[]) {
  return getProductMeta(input, catalog).className;
}

export function isComposite(input: string | null | undefined, catalog?: ProductType[]) {
  return getProductMeta(input, catalog).isComposite;
}

/** Normaliza um array de products (slug ou label) → slugs únicos. Expande combos. */
export function normalizeProductsToSlugs(arr: (string | null | undefined)[] | null | undefined): string[] {
  if (!arr || arr.length === 0) return [];
  const out = new Set<string>();
  for (const item of arr) {
    if (!item) continue;
    for (const slug of expandLegacyLabel(item)) out.add(slug);
  }
  return Array.from(out);
}

/** Verifica se um array de products contém determinado slug (aceita labels antigos). */
export function hasProduct(arr: (string | null | undefined)[] | null | undefined, slug: string): boolean {
  return normalizeProductsToSlugs(arr).includes(slug);
}
