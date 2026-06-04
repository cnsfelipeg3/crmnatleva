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
