// Edge function: infinitepay-create-link
// Dois modos:
//  1) Sem order_id: cria pedido pending do zero (link avulso / fluxo legado).
//  2) Com order_id: finaliza um rascunho existente (status='draft' → 'pending')
//     recalculando o valor a partir dos dados salvos no servidor.
import { createClient } from "npm:@supabase/supabase-js@2";
import { buildCorsHeaders, handlePreflight } from "../_shared/cors.ts";
import { rateLimit } from "../_shared/rate-limit.ts";
import { createLogger } from "../_shared/logger.ts";
import {
  computeOrderAmount,
  createCheckoutLink,
  type PaymentIntent,
} from "../_shared/infinitepay.ts";

const log = createLogger("infinitepay-create-link");

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const PUBLIC_SITE_URL = "https://adm.natleva.com";
const FUNCTIONS_BASE = `${SUPABASE_URL}/functions/v1`;

function jsonResponse(req: Request, status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" },
  });
}

async function loadProduct(supabase: ReturnType<typeof createClient>, productId: string) {
  return supabase
    .from("experience_products")
    .select(
      "id, slug, title, is_active, sale_page_enabled, price_from, price_promo, is_promo, pix_discount_percent, payment_terms, currency, commission_per_sale, price_label, pax_min, pax_max",
    )
    .eq("id", productId)
    .maybeSingle();
}

Deno.serve(async (req) => {
  const pre = handlePreflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return jsonResponse(req, 405, { error: "Method not allowed" });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
  const rl = rateLimit(`ipay-create:${ip}`, { limit: 20, windowMs: 60_000 });
  if (!rl.allowed) return jsonResponse(req, 429, { error: "Too many requests" });

  let body: {
    product_id?: string;
    order_id?: string;
    payment_intent?: PaymentIntent;
    pax?: number;
    buyer?: { name?: string; email?: string; phone?: string };
    affiliate_ref?: string;
    source?: "catalogo_publico" | "link_avulso";
  };
  try {
    body = await req.json();
  } catch {
    return jsonResponse(req, 400, { error: "Invalid JSON" });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  // ============================================================
  // Modo 2: finaliza rascunho existente
  // ============================================================
  if (body.order_id) {
    const { data: order, error: ordErr } = await supabase
      .from("prateleira_orders")
      .select("*")
      .eq("id", body.order_id)
      .maybeSingle();

    if (ordErr || !order) return jsonResponse(req, 404, { error: "Pedido não encontrado" });
    if (order.status === "pending" && order.checkout_url) {
      // Já tem link · devolve o mesmo
      return jsonResponse(req, 200, { checkout_url: order.checkout_url, order_id: order.id });
    }
    if (order.status !== "draft") {
      return jsonResponse(req, 409, { error: "Pedido não está em rascunho", status: order.status });
    }

    const { data: product, error: prodErr } = await loadProduct(supabase, order.product_id);
    if (prodErr || !product) return jsonResponse(req, 404, { error: "Produto não encontrado" });
    if (product.is_active === false || product.sale_page_enabled === false) {
      return jsonResponse(req, 403, { error: "Produto não disponível" });
    }

    const intent = (order.payment_intent ?? "cartao") as PaymentIntent;
    const pax = Number(order.pax) || 1;
    let calc;
    try {
      calc = computeOrderAmount(product as any, { intent, pax });
    } catch (e) {
      return jsonResponse(req, 400, { error: (e as Error).message });
    }

    const redirectUrl = `${PUBLIC_SITE_URL}/loja/${product.slug ?? ""}/retorno?order=${order.id}`;
    const webhookUrl = `${FUNCTIONS_BASE}/infinitepay-webhook?token=${order.webhook_token}&order=${order.id}`;
    const paxSuffix = calc.perPerson && calc.paxApplied > 1 ? ` · ${calc.paxApplied} passageiros` : "";
    const itemDescription =
      `${product.title ?? "Pacote"}${paxSuffix}${calc.descriptionSuffix}`.slice(0, 250);

    try {
      const { url } = await createCheckoutLink({
        orderNsu: order.id,
        redirectUrl,
        webhookUrl,
        items: [{ quantity: 1, price: calc.amountCents, description: itemDescription }],
        customer: order.buyer_name || order.buyer_email || order.buyer_phone
          ? {
              name: order.buyer_name ?? undefined,
              email: order.buyer_email ?? undefined,
              phone_number: order.buyer_phone ?? undefined,
            }
          : undefined,
      });

      await supabase
        .from("prateleira_orders")
        .update({
          status: "pending",
          amount_cents: calc.amountCents,
          unit_price_cents: calc.unitPriceCents,
          is_entry_only: calc.isEntryOnly,
          balance_cents: calc.balanceCents,
          commission_cents: calc.commissionCents,
          checkout_url: url,
        })
        .eq("id", order.id)
        .eq("status", "draft");

      log.info("draft finalized", { orderId: order.id, amountCents: calc.amountCents, intent });
      return jsonResponse(req, 200, { checkout_url: url, order_id: order.id });
    } catch (e) {
      log.error("infinitepay error (draft)", { err: (e as Error).message, orderId: order.id });
      return jsonResponse(req, 502, { error: "Falha ao gerar link de pagamento" });
    }
  }

  // ============================================================
  // Modo 1: cria pedido pending do zero
  // ============================================================
  const productId = body.product_id;
  const intent = (body.payment_intent ?? "cartao") as PaymentIntent;
  if (!productId) return jsonResponse(req, 400, { error: "product_id required" });
  if (!["pix", "cartao", "entrada"].includes(intent)) {
    return jsonResponse(req, 400, { error: "invalid payment_intent" });
  }

  const { data: product, error: prodErr } = await loadProduct(supabase, productId);
  if (prodErr || !product) return jsonResponse(req, 404, { error: "Produto não encontrado" });
  if (product.is_active === false || product.sale_page_enabled === false) {
    return jsonResponse(req, 403, { error: "Produto não disponível para venda online" });
  }

  let calc;
  try {
    calc = computeOrderAmount(product as any, { intent, pax: body.pax });
  } catch (e) {
    return jsonResponse(req, 400, { error: (e as Error).message });
  }

  const { data: order, error: insErr } = await supabase
    .from("prateleira_orders")
    .insert({
      product_id: product.id,
      product_slug: product.slug,
      product_title: product.title,
      buyer_name: body.buyer?.name ?? null,
      buyer_email: body.buyer?.email ?? null,
      buyer_phone: body.buyer?.phone ?? null,
      amount_cents: calc.amountCents,
      unit_price_cents: calc.unitPriceCents,
      pax: calc.paxApplied,
      currency: product.currency ?? "BRL",
      payment_intent: intent,
      is_entry_only: calc.isEntryOnly,
      balance_cents: calc.balanceCents,
      source: body.source ?? "catalogo_publico",
      affiliate_ref: body.affiliate_ref ?? null,
      commission_cents: calc.commissionCents,
      status: "pending",
    })
    .select("id, webhook_token")
    .single();

  if (insErr || !order) {
    log.error("failed to insert order", { err: insErr?.message });
    return jsonResponse(req, 500, { error: "Falha ao registrar pedido" });
  }

  const redirectUrl = `${PUBLIC_SITE_URL}/loja/${product.slug ?? ""}/retorno?order=${order.id}`;
  const webhookUrl = `${FUNCTIONS_BASE}/infinitepay-webhook?token=${order.webhook_token}&order=${order.id}`;
  const paxSuffix = calc.perPerson && calc.paxApplied > 1 ? ` · ${calc.paxApplied} passageiros` : "";
  const itemDescription =
    `${product.title ?? "Pacote"}${paxSuffix}${calc.descriptionSuffix}`.slice(0, 250);

  try {
    const { url } = await createCheckoutLink({
      orderNsu: order.id,
      redirectUrl,
      webhookUrl,
      items: [{ quantity: 1, price: calc.amountCents, description: itemDescription }],
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
      orderId: order.id, productId: product.id, amountCents: calc.amountCents, intent,
    });
    return jsonResponse(req, 200, { checkout_url: url, order_id: order.id });
  } catch (e) {
    log.error("infinitepay error", { err: (e as Error).message, orderId: order.id });
    return jsonResponse(req, 502, { error: "Falha ao gerar link de pagamento" });
  }
});
