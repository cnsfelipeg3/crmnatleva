// Edge function: infinitepay-webhook
// Recebe a confirmação de pagamento da InfinitePay e dá baixa na ordem.
// Resposta esperada: 200 { success:true, message:null } em < 1s.
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
    // Responder 400 faz a InfinitePay reenviar
    return jsonResponse(req, 400, { success: false, message: "db error" });
  }

  log.info("order paid", { orderId, status: newStatus, amount, paidAmount });

  // TODO: gancho pós-venda (criar sale/proposal-to-sale, notificar equipe)
  // Plugar quando o fluxo interno estiver definido.

  return jsonResponse(req, 200, { success: true, message: null });
});
