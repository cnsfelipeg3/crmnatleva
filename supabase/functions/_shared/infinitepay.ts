// Helper compartilhado para integração com InfinitePay Checkout
// Endpoint: POST https://api.checkout.infinitepay.io/links
// Auth: somente pelo handle (InfiniteTag). Sem API key.

const INFINITEPAY_ENDPOINT = "https://api.checkout.infinitepay.io/links";

export const INFINITEPAY_HANDLE =
  Deno.env.get("INFINITEPAY_HANDLE") ?? "tiagodalri";

export function reaisToCents(v: number | string | null | undefined): number {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n * 100);
}

export interface InfinitePayItem {
  quantity: number;
  price: number; // centavos
  description: string;
}

export interface InfinitePayCustomer {
  name?: string;
  email?: string;
  phone_number?: string;
}

export interface CreateLinkParams {
  items: InfinitePayItem[];
  orderNsu: string;
  redirectUrl: string;
  webhookUrl: string;
  customer?: InfinitePayCustomer;
}

export async function createCheckoutLink(
  params: CreateLinkParams,
): Promise<{ url: string }> {
  const body: Record<string, unknown> = {
    handle: INFINITEPAY_HANDLE,
    redirect_url: params.redirectUrl,
    webhook_url: params.webhookUrl,
    order_nsu: params.orderNsu,
    items: params.items,
  };
  if (params.customer && (params.customer.name || params.customer.email || params.customer.phone_number)) {
    body.customer = params.customer;
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10_000);
  let resp: Response;
  try {
    resp = await fetch(INFINITEPAY_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
  } catch (e) {
    clearTimeout(timer);
    throw new Error(`InfinitePay network error: ${(e as Error).message}`);
  }
  clearTimeout(timer);

  const text = await resp.text();
  if (!resp.ok) {
    throw new Error(`InfinitePay HTTP ${resp.status}: ${text.slice(0, 500)}`);
  }
  let json: { url?: string };
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`InfinitePay invalid JSON: ${text.slice(0, 200)}`);
  }
  if (!json.url || typeof json.url !== "string") {
    throw new Error(`InfinitePay missing url in response: ${text.slice(0, 200)}`);
  }
  return { url: json.url };
}

// ============================================================
// Cálculo centralizado do valor do pedido
// ============================================================

export type PaymentIntent = "pix" | "cartao" | "entrada";

export interface ProductForPricing {
  price_from?: number | string | null;
  price_promo?: number | string | null;
  is_promo?: boolean | null;
  pix_discount_percent?: number | string | null;
  payment_terms?: Record<string, unknown> | null;
  price_label?: string | null;
  pax_min?: number | string | null;
  pax_max?: number | string | null;
  currency?: string | null;
  commission_per_sale?: number | string | null;
}

export interface ComputeOrderResult {
  amountCents: number;
  unitPriceCents: number;
  groupReais: number;
  unitReais: number;
  isEntryOnly: boolean;
  balanceCents: number | null;
  paxApplied: number;
  perPerson: boolean;
  descriptionSuffix: string;
  commissionCents: number | null;
}

function readNum(v: unknown, allowZero = false): number | undefined {
  const n = Number(v);
  if (!Number.isFinite(n)) return undefined;
  if (allowZero ? n < 0 : n <= 0) return undefined;
  return n;
}

export function isPerPersonLabel(label: unknown): boolean {
  if (label === null || label === undefined) return true;
  const s = String(label).trim();
  if (!s) return true;
  return /pessoa/i.test(s);
}

export function computeOrderAmount(
  product: ProductForPricing,
  opts: { intent: PaymentIntent; pax?: number },
): ComputeOrderResult {
  const unitReais = product.is_promo && readNum(product.price_promo)
    ? Number(product.price_promo)
    : Number(product.price_from);
  if (!Number.isFinite(unitReais) || unitReais <= 0) {
    throw new Error("Produto sem preço configurado");
  }

  const perPerson = isPerPersonLabel(product.price_label);
  const paxMin = Math.max(1, Number(product.pax_min) || 1);
  const paxMaxRaw = Number(product.pax_max);
  const paxMax = Number.isFinite(paxMaxRaw) && paxMaxRaw > 0 ? paxMaxRaw : Math.max(paxMin, 20);

  let pax = Math.floor(Number(opts.pax ?? paxMin));
  if (!Number.isFinite(pax) || pax < 1) pax = paxMin;
  if (perPerson) {
    if (pax < paxMin || pax > paxMax) {
      throw new Error(`Número de passageiros inválido (mín ${paxMin}, máx ${paxMax})`);
    }
  } else {
    pax = Math.max(1, pax);
  }

  const paxMultiplier = perPerson ? pax : 1;
  const groupReais = Math.round(unitReais * paxMultiplier * 100) / 100;

  const terms = (product.payment_terms ?? {}) as Record<string, unknown>;
  const entryPercent = readNum(terms.entry_percent, true);
  const entryAmount = readNum(terms.entry_amount, true);
  const hasEntry =
    (entryPercent !== undefined && entryPercent > 0 && entryPercent < 100) ||
    (entryAmount !== undefined && entryAmount > 0 && entryAmount < groupReais);

  let amountReais = groupReais;
  let isEntryOnly = false;
  let balanceCents: number | null = null;
  let descriptionSuffix = "";

  if (opts.intent === "entrada") {
    if (!hasEntry) {
      throw new Error("Produto não possui plano de entrada+saldo");
    }
    const entry = entryAmount !== undefined && entryAmount > 0
      ? Math.min(entryAmount, groupReais)
      : Math.round(groupReais * ((entryPercent as number) / 100) * 100) / 100;
    amountReais = entry;
    isEntryOnly = true;
    balanceCents = reaisToCents(groupReais - entry);
    descriptionSuffix = " · entrada";
  } else if (opts.intent === "pix") {
    const disc = readNum(product.pix_discount_percent);
    if (disc && disc > 0) {
      amountReais = Math.round(groupReais * (1 - disc / 100) * 100) / 100;
    }
  }

  const amountCents = reaisToCents(amountReais);
  if (amountCents < 100) {
    throw new Error("Valor mínimo R$ 1,00");
  }

  const commissionCents = readNum(product.commission_per_sale) !== undefined
    ? reaisToCents(Number(product.commission_per_sale) * paxMultiplier)
    : null;

  return {
    amountCents,
    unitPriceCents: reaisToCents(unitReais),
    groupReais,
    unitReais,
    isEntryOnly,
    balanceCents,
    paxApplied: pax,
    perPerson,
    descriptionSuffix,
    commissionCents,
  };
}
