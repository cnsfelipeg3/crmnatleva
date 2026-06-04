// Edge function: infinitepay-create-link
// Recebe um pedido do frontend, cria a linha em prateleira_orders,
// gera o link de checkout na InfinitePay e devolve a URL pro cliente.
import { createClient } from "npm:@supabase/supabase-js@2";
import { buildCorsHeaders, handlePreflight } from "../_shared/cors.ts";
import { rateLimit } from "../_shared/rate-limit.ts";
import { createLogger } from "../_shared/logger.ts";
import { createCheckoutLink, reaisToCents } from "../_shared/infinitepay.ts";

const log = createLogger("infinitepay-create-link");

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const PUBLIC_SITE_URL = "https://adm.natleva.com";
const FUNCTIONS_BASE = `${SUPABASE_URL}/functions/v1`;

type PaymentIntent = "pix" | "cartao" | "entrada";

function jsonResponse(req: Request, status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" },
  });
}

function readNum(v: unknown, allowZero = false): number | undefined {
  const n = Number(v);
  if (!Number.isFinite(n)) return undefined;
  if (allowZero ? n < 0 : n <= 0) return undefined;
  return n;
}

Deno.serve(async (req) => {
  const pre = handlePreflight(req);
  if (pre) return pre;

  if (req.method !== "POST") {
    return jsonResponse(req, 405, { error: "Method not allowed" });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
  const rl = rateLimit(`ipay-create:${ip}`, { limit: 20, windowMs: 60_000 });
  if (!rl.allowed) {
    return jsonResponse(req, 429, { error: "Too many requests" });
  }

  let body: {
    product_id?: string;
    payment_intent?: PaymentIntent;
    buyer?: { name?: string; email?: string; phone?: string };
    affiliate_ref?: string;
    source?: "catalogo_publico" | "link_avulso";
  };
  try {
    body = await req.json();
  } catch {
    return jsonResponse(req, 400, { error: "Invalid JSON" });
  }

  const productId = body.product_id;
  const intent = (body.payment_intent ?? "cartao") as PaymentIntent;
  if (!productId) return jsonResponse(req, 400, { error: "product_id required" });
  if (!["pix", "cartao", "entrada"].includes(intent)) {
    return jsonResponse(req, 400, { error: "invalid payment_intent" });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data: product, error: prodErr } = await supabase
    .from("experience_products")
    .select(
      "id, slug, title, is_active, sale_page_enabled, price_from, price_promo, is_promo, pix_discount_percent, payment_terms, currency, commission_per_sale",
    )
    .eq("id", productId)
    .maybeSingle();

  if (prodErr || !product) {
    log.warn("product not found", { productId, err: prodErr?.message });
    return jsonResponse(req, 404, { error: "Produto não encontrado" });
  }
  if (product.is_active === false || product.sale_page_enabled === false) {
    return jsonResponse(req, 403, { error: "Produto não disponível para venda online" });
  }

  // Preço base (sempre recalculado no servidor)
  const base = product.is_promo && readNum(product.price_promo)
    ? Number(product.price_promo)
    : Number(product.price_from);
  if (!Number.isFinite(base) || base <= 0) {
    return jsonResponse(req, 400, { error: "Produto sem preço configurado" });
  }

  const terms = (product.payment_terms ?? {}) as Record<string, unknown>;
  const entryPercent = readNum(terms.entry_percent, true);
  const entryAmount = readNum(terms.entry_amount, true);
  const hasEntry =
    (entryPercent !== undefined && entryPercent > 0 && entryPercent < 100) ||
    (entryAmount !== undefined && entryAmount > 0 && entryAmount < base);

  let amountReais = base;
  let isEntryOnly = false;
  let balanceCents: number | null = null;
  let descriptionSuffix = "";

  if (intent === "entrada") {
    if (!hasEntry) {
      return jsonResponse(req, 400, { error: "Produto não possui plano de entrada+saldo" });
    }
    const entry = entryAmount !== undefined && entryAmount > 0
      ? entryAmount
      : Math.round(base * ((entryPercent as number) / 100) * 100) / 100;
    amountReais = entry;
    isEntryOnly = true;
    balanceCents = reaisToCents(base - entry);
    descriptionSuffix = " · entrada";
  } else if (intent === "pix") {
    const disc = readNum(product.pix_discount_percent);
    if (disc && disc > 0) {
      amountReais = Math.round(base * (1 - disc / 100) * 100) / 100;
    }
  }
  // cartao: amount = base, InfinitePay define parcelas/método na tela hospedada

  const amountCents = reaisToCents(amountReais);
  if (amountCents < 100) {
    return jsonResponse(req, 400, { error: "Valor mínimo R$ 1,00" });
  }

  const commissionCents =
    readNum(product.commission_per_sale) !== undefined
      ? reaisToCents(Number(product.commission_per_sale))
      : null;

  // Insere ordem pending
  const { data: order, error: insErr } = await supabase
    .from("prateleira_orders")
    .insert({
      product_id: product.id,
      product_slug: product.slug,
      product_title: product.title,
      buyer_name: body.buyer?.name ?? null,
      buyer_email: body.buyer?.email ?? null,
      buyer_phone: body.buyer?.phone ?? null,
      amount_cents: amountCents,
      currency: product.currency ?? "BRL",
      payment_intent: intent,
      is_entry_only: isEntryOnly,
      balance_cents: balanceCents,
      source: body.source ?? "catalogo_publico",
      affiliate_ref: body.affiliate_ref ?? null,
      commission_cents: commissionCents,
      status: "pending",
    })
    .select("id, webhook_token")
    .single();

  if (insErr || !order) {
    log.error("failed to insert order", { err: insErr?.message });
    return jsonResponse(req, 500, { error: "Falha ao registrar pedido" });
  }

  const redirectUrl = `${PUBLIC_SITE_URL}/loja/${product.slug ?? ""}/retorno`;
  const webhookUrl = `${FUNCTIONS_BASE}/infinitepay-webhook?token=${order.webhook_token}&order=${order.id}`;

  const itemDescription =
    `${product.title ?? "Pacote"}${descriptionSuffix}`.slice(0, 250);

  try {
    const { url } = await createCheckoutLink({
      orderNsu: order.id,
      redirectUrl,
      webhookUrl,
      items: [{ quantity: 1, price: amountCents, description: itemDescription }],
      customer: body.buyer
        ? {
            name: body.buyer.name,
            email: body.buyer.email,
            phone_number: body.buyer.phone,
          }
        : undefined,
    });

    await supabase
      .from("prateleira_orders")
      .update({ checkout_url: url })
      .eq("id", order.id);

    log.info("checkout link created", {
      orderId: order.id,
      productId: product.id,
      amountCents,
      intent,
      isEntryOnly,
    });

    return jsonResponse(req, 200, { checkout_url: url, order_id: order.id });
  } catch (e) {
    log.error("infinitepay error", { err: (e as Error).message, orderId: order.id });
    return jsonResponse(req, 502, { error: "Falha ao gerar link de pagamento" });
  }
});
