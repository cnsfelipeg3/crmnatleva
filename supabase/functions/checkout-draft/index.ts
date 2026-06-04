// Edge function: checkout-draft (verify_jwt = false)
// Gerencia o rascunho do checkout do convidado em prateleira_orders.
// Acesso pelo order_id (UUID não-adivinhável). Só opera em pedidos status='draft'.
import { createClient } from "npm:@supabase/supabase-js@2";
import { buildCorsHeaders, handlePreflight } from "../_shared/cors.ts";
import { rateLimit } from "../_shared/rate-limit.ts";
import { createLogger } from "../_shared/logger.ts";
import {
  computeOrderAmount,
  isPerPersonLabel,
  type PaymentIntent,
} from "../_shared/infinitepay.ts";

const log = createLogger("checkout-draft");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const STEPS = ["resumo", "contato", "passageiros", "termos", "pagamento"] as const;
type Step = typeof STEPS[number];

function jsonResponse(req: Request, status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" },
  });
}

function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
}

async function loadProduct(supabase: ReturnType<typeof createClient>, productId: string) {
  return supabase
    .from("experience_products")
    .select("*")
    .eq("id", productId)
    .maybeSingle();
}

function summarizeOrder(order: any, product: any) {
  return {
    order_id: order.id,
    status: order.status,
    checkout_step: order.checkout_step ?? "resumo",
    product: product
      ? {
          id: product.id,
          slug: product.slug,
          title: product.title,
          currency: product.currency,
          price_from: product.price_from,
          price_promo: product.price_promo,
          is_promo: product.is_promo,
          pix_discount_percent: product.pix_discount_percent,
          payment_terms: product.payment_terms,
          price_label: product.price_label,
          pax_min: product.pax_min,
          pax_max: product.pax_max,
          departure_date: product.departure_date,
          destination: product.destination,
          destination_country: product.destination_country,
        }
      : null,
    pax: order.pax,
    payment_intent: order.payment_intent,
    amount_cents: order.amount_cents,
    unit_price_cents: order.unit_price_cents,
    is_entry_only: order.is_entry_only,
    balance_cents: order.balance_cents,
    currency: order.currency,
    buyer_name: order.buyer_name,
    buyer_email: order.buyer_email,
    buyer_phone: order.buyer_phone,
    buyer_address: order.buyer_address,
    passengers: order.passengers,
    terms_version: order.terms_version,
    terms_accepted_at: order.terms_accepted_at,
  };
}

Deno.serve(async (req) => {
  const pre = handlePreflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return jsonResponse(req, 405, { error: "Method not allowed" });

  const ip = clientIp(req);
  const rl = rateLimit(`checkout-draft:${ip}`, { limit: 60, windowMs: 60_000 });
  if (!rl.allowed) return jsonResponse(req, 429, { error: "Too many requests" });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(req, 400, { error: "Invalid JSON" });
  }

  const action = String(body.action ?? "");
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  // ---------------- CREATE ----------------
  if (action === "create") {
    const productId = String(body.product_id ?? "");
    if (!productId) return jsonResponse(req, 400, { error: "product_id required" });

    const { data: product, error: prodErr } = await loadProduct(supabase, productId);
    if (prodErr || !product) return jsonResponse(req, 404, { error: "Produto não encontrado" });
    if (product.is_active === false || product.sale_page_enabled === false) {
      return jsonResponse(req, 403, { error: "Produto não disponível" });
    }

    const perPerson = isPerPersonLabel(product.price_label);
    const paxMin = Math.max(1, Number(product.pax_min) || 1);
    const initialIntent: PaymentIntent = "cartao";

    let calc;
    try {
      calc = computeOrderAmount(product as any, { intent: initialIntent, pax: paxMin });
    } catch (e) {
      return jsonResponse(req, 400, { error: (e as Error).message });
    }

    const { data: order, error: insErr } = await supabase
      .from("prateleira_orders")
      .insert({
        product_id: product.id,
        product_slug: product.slug,
        product_title: product.title,
        amount_cents: calc.amountCents,
        unit_price_cents: calc.unitPriceCents,
        pax: perPerson ? paxMin : 1,
        currency: product.currency ?? "BRL",
        payment_intent: initialIntent,
        is_entry_only: calc.isEntryOnly,
        balance_cents: calc.balanceCents,
        commission_cents: calc.commissionCents,
        source: body.source ?? "catalogo_publico",
        affiliate_ref: body.affiliate_ref ?? null,
        status: "draft",
        checkout_step: "resumo",
      })
      .select("*")
      .single();

    if (insErr || !order) {
      log.error("create draft failed", { err: insErr?.message });
      return jsonResponse(req, 500, { error: "Falha ao criar rascunho" });
    }

    log.info("draft created", { orderId: order.id, productId });
    return jsonResponse(req, 200, { order_id: order.id, draft: summarizeOrder(order, product) });
  }

  // ---------------- GET ----------------
  if (action === "get") {
    const orderId = String(body.order_id ?? "");
    if (!orderId) return jsonResponse(req, 400, { error: "order_id required" });

    const { data: order, error } = await supabase
      .from("prateleira_orders")
      .select("*")
      .eq("id", orderId)
      .maybeSingle();

    if (error || !order) return jsonResponse(req, 404, { error: "Pedido não encontrado" });

    let product: any = null;
    if (order.product_id) {
      const { data: p } = await loadProduct(supabase, order.product_id);
      product = p;
    }

    return jsonResponse(req, 200, {
      draft: summarizeOrder(order, product),
      redirect: order.status !== "draft" ? "/loja/" + (order.product_slug ?? "") + "/retorno?order=" + order.id : null,
    });
  }

  // ---------------- UPDATE ----------------
  if (action === "update") {
    const orderId = String(body.order_id ?? "");
    const patch = body.patch ?? {};
    if (!orderId) return jsonResponse(req, 400, { error: "order_id required" });

    const { data: order, error } = await supabase
      .from("prateleira_orders")
      .select("*")
      .eq("id", orderId)
      .maybeSingle();
    if (error || !order) return jsonResponse(req, 404, { error: "Pedido não encontrado" });
    if (order.status !== "draft") {
      return jsonResponse(req, 409, { error: "Pedido já finalizado", status: order.status });
    }

    const step = String(patch.step ?? order.checkout_step ?? "resumo") as Step;
    if (!STEPS.includes(step)) return jsonResponse(req, 400, { error: "step inválido" });

    const update: Record<string, unknown> = {};

    if (step === "resumo") {
      const intent = (patch.payment_intent ?? order.payment_intent ?? "cartao") as PaymentIntent;
      if (!["pix", "cartao", "entrada"].includes(intent)) {
        return jsonResponse(req, 400, { error: "payment_intent inválido" });
      }
      const { data: product } = await loadProduct(supabase, order.product_id);
      if (!product) return jsonResponse(req, 404, { error: "Produto não encontrado" });

      const pax = Number(patch.pax ?? order.pax ?? 1);
      let calc;
      try {
        calc = computeOrderAmount(product as any, { intent, pax });
      } catch (e) {
        return jsonResponse(req, 400, { error: (e as Error).message });
      }
      update.payment_intent = intent;
      update.pax = calc.paxApplied;
      update.amount_cents = calc.amountCents;
      update.unit_price_cents = calc.unitPriceCents;
      update.is_entry_only = calc.isEntryOnly;
      update.balance_cents = calc.balanceCents;
      update.commission_cents = calc.commissionCents;
      update.checkout_step = "contato";
    } else if (step === "contato") {
      if (patch.buyer_name !== undefined) update.buyer_name = String(patch.buyer_name).trim() || null;
      if (patch.buyer_email !== undefined) update.buyer_email = String(patch.buyer_email).trim().toLowerCase() || null;
      if (patch.buyer_phone !== undefined) update.buyer_phone = String(patch.buyer_phone).trim() || null;
      if (patch.buyer_address !== undefined) update.buyer_address = patch.buyer_address;
      update.checkout_step = "passageiros";
    } else if (step === "passageiros") {
      if (!Array.isArray(patch.passengers)) {
        return jsonResponse(req, 400, { error: "passengers deve ser array" });
      }
      update.passengers = patch.passengers;
      update.checkout_step = "termos";
    } else if (step === "termos") {
      update.terms_version = String(patch.terms_version ?? "v1");
      update.terms_accepted_at = new Date().toISOString();
      update.terms_accepted_ip = ip;
      update.checkout_step = "pagamento";
    }

    const { data: updated, error: updErr } = await supabase
      .from("prateleira_orders")
      .update(update)
      .eq("id", orderId)
      .eq("status", "draft")
      .select("*")
      .single();

    if (updErr || !updated) {
      log.error("update draft failed", { orderId, err: updErr?.message });
      return jsonResponse(req, 500, { error: "Falha ao atualizar rascunho" });
    }

    let product: any = null;
    if (updated.product_id) {
      const { data: p } = await loadProduct(supabase, updated.product_id);
      product = p;
    }

    log.info("draft updated", { orderId, step, next: update.checkout_step });
    return jsonResponse(req, 200, { draft: summarizeOrder(updated, product) });
  }

  return jsonResponse(req, 400, { error: "action inválido" });
});
