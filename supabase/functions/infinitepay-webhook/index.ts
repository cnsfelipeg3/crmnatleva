// Edge function: infinitepay-webhook
// Recebe a confirmação de pagamento da InfinitePay e dá baixa na ordem.
// Resposta esperada: 200 { success:true, message:null } em < 1s.
// Pós-venda roda em background via EdgeRuntime.waitUntil — best-effort.
import { createClient } from "npm:@supabase/supabase-js@2";
import { buildCorsHeaders, handlePreflight } from "../_shared/cors.ts";
import { createLogger } from "../_shared/logger.ts";

const log = createLogger("infinitepay-webhook");

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function jsonResponse(req: Request, status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" },
  });
}

// deno-lint-ignore no-explicit-any
async function postSale(orderId: string, _payload: Record<string, unknown>) {
  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: order, error } = await supabase
      .from("prateleira_orders")
      .select("*")
      .eq("id", orderId)
      .maybeSingle();

    if (error || !order) {
      log.warn("postSale: order not found", { orderId, err: error?.message });
      return;
    }

    if (order.sale_id) {
      log.info("postSale: sale already exists, skipping", { orderId, saleId: order.sale_id });
      return;
    }
    if (order.status !== "paid" && order.status !== "partial") {
      log.info("postSale: order not paid, skipping", { orderId, status: order.status });
      return;
    }

    // Carregar dados do produto pra enriquecer a venda
    let product: Record<string, unknown> | null = null;
    if (order.product_id) {
      const { data: prod } = await supabase
        .from("experience_products")
        .select("id, title, slug, departure_date, destination_city, destination_iata")
        .eq("id", order.product_id)
        .maybeSingle();
      product = prod ?? null;
    }

    const paidReais = Number(order.paid_amount_cents ?? order.amount_cents ?? 0) / 100;
    const paymentMethod =
      order.capture_method === "credit_card"
        ? "Cartão de crédito"
        : order.capture_method === "pix"
        ? "Pix"
        : order.capture_method ?? null;

    const saleInsert: Record<string, unknown> = {
      name: order.buyer_name || order.product_title || "Cliente checkout",
      status: "Rascunho",
      products: order.product_title ? [order.product_title] : [],
      received_value: paidReais,
      payment_method: paymentMethod,
      adults: Number(order.pax) || 1,
      observations: [
        "Gerado automaticamente pelo checkout InfinitePay",
        `Pedido ${order.id}`,
        order.transaction_nsu ? `Transação ${order.transaction_nsu}` : null,
        order.buyer_email ? `E-mail: ${order.buyer_email}` : null,
        order.buyer_phone ? `Telefone: ${order.buyer_phone}` : null,
        order.is_entry_only ? `Entrada paga. Saldo: R$ ${((Number(order.balance_cents) || 0) / 100).toFixed(2)}` : null,
      ]
        .filter(Boolean)
        .join(" · "),
    };

    if (product) {
      if (product.departure_date) saleInsert.departure_date = product.departure_date;
      if (product.destination_city) saleInsert.destination_city = product.destination_city;
      if (product.destination_iata) saleInsert.destination_iata = product.destination_iata;
    }

    const { data: sale, error: saleErr } = await supabase
      .from("sales")
      .insert(saleInsert)
      .select("id, display_id")
      .single();

    if (saleErr || !sale) {
      log.error("postSale: failed to create sale", { orderId, err: saleErr?.message });
      return;
    }

    await supabase
      .from("prateleira_orders")
      .update({ sale_id: sale.id })
      .eq("id", orderId);

    log.info("postSale: sale draft created", {
      orderId,
      saleId: sale.id,
      displayId: sale.display_id,
      paidReais,
    });

    // Confirmação opcional ao cliente (best-effort)
    if (order.buyer_email) {
      try {
        await supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "payment-confirmed",
            recipientEmail: order.buyer_email,
            idempotencyKey: `prateleira-paid-${orderId}`,
            templateData: {
              name: order.buyer_name ?? null,
              productTitle: order.product_title ?? "Sua reserva",
              amount: paidReais,
              receiptUrl: order.receipt_url ?? null,
            },
          },
        });
      } catch (e) {
        log.warn("postSale: email confirm failed", { orderId, err: (e as Error).message });
      }
    }
  } catch (e) {
    log.error("postSale: unexpected error", { orderId, err: (e as Error).message });
  }
}

Deno.serve(async (req) => {
  const pre = handlePreflight(req);
  if (pre) return pre;

  if (req.method !== "POST") {
    return jsonResponse(req, 405, { success: false, message: "Method not allowed" });
  }

  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";
  const orderId = url.searchParams.get("order") ?? "";

  if (!token || !orderId) {
    return jsonResponse(req, 400, { success: false, message: "missing token or order" });
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = await req.json();
  } catch {
    return jsonResponse(req, 400, { success: false, message: "invalid json" });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  const { data: order, error: ordErr } = await supabase
    .from("prateleira_orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  if (ordErr || !order) {
    log.warn("order not found", { orderId, err: ordErr?.message });
    return jsonResponse(req, 400, { success: false, message: "order not found" });
  }

  if (order.webhook_token !== token) {
    log.warn("invalid token", { orderId });
    return jsonResponse(req, 400, { success: false, message: "invalid token" });
  }

  // Idempotência
  if (order.status === "paid" || order.status === "partial") {
    return jsonResponse(req, 200, { success: true, message: null });
  }

  const amount = Number(payload.amount) || 0;
  const paidAmount = Number(payload.paid_amount) || amount;
  const expected = Number(order.amount_cents) || 0;

  // Segurança: não marca pago se o valor recebido for menor que o esperado
  if (amount > 0 && amount < expected) {
    log.warn("amount mismatch (lower)", { orderId, expected, amount });
    return jsonResponse(req, 200, { success: true, message: null });
  }

  const newStatus = order.is_entry_only ? "partial" : "paid";

  const { error: updErr } = await supabase
    .from("prateleira_orders")
    .update({
      status: newStatus,
      paid_amount_cents: paidAmount || expected,
      installments: payload.installments ?? null,
      capture_method: (payload.capture_method as string) ?? null,
      invoice_slug: (payload.invoice_slug as string) ?? null,
      transaction_nsu: (payload.transaction_nsu as string) ?? null,
      receipt_url: (payload.receipt_url as string) ?? null,
      paid_at: new Date().toISOString(),
      raw_webhook: payload,
    })
    .eq("id", orderId);

  if (updErr) {
    log.error("failed to update order", { orderId, err: updErr.message });
    return jsonResponse(req, 400, { success: false, message: "db error" });
  }

  log.info("order paid", { orderId, status: newStatus, amount, paidAmount });

  // Pós-venda em background — não bloqueia a resposta
  try {
    // @ts-ignore EdgeRuntime is provided by Supabase
    EdgeRuntime.waitUntil(postSale(orderId, payload));
  } catch {
    // Fallback: dispara sem aguardar
    postSale(orderId, payload).catch(() => {});
  }

  return jsonResponse(req, 200, { success: true, message: null });
});
