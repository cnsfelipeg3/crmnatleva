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

type PaxJson = {
  full_name?: string;
  name?: string;
  cpf?: string;
  birth_date?: string;
  email?: string;
  phone?: string;
  passport_number?: string;
  passport_expiry?: string;
};

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

    if (order.status !== "paid" && order.status !== "partial") {
      log.info("postSale: order not paid, skipping", { orderId, status: order.status });
      return;
    }

    // Carrega produto
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
    const balanceReais = Number(order.balance_cents ?? 0) / 100;
    const paymentMethod =
      order.capture_method === "credit_card"
        ? "Cartão de crédito"
        : order.capture_method === "pix"
        ? "Pix"
        : order.capture_method ?? null;

    const buyerAddr = (order.buyer_address ?? {}) as Record<string, string | undefined>;
    const paxList: PaxJson[] = Array.isArray(order.passengers) ? (order.passengers as PaxJson[]) : [];

    // ===== Cliente (best-effort): localiza por telefone/email ou cria =====
    let clientId: string | null = null;
    try {
      if (order.buyer_phone || order.buyer_email) {
        const orQuery: string[] = [];
        if (order.buyer_phone) orQuery.push(`phone.eq.${order.buyer_phone}`);
        if (order.buyer_email) orQuery.push(`email.eq.${order.buyer_email}`);
        const { data: existing } = await supabase
          .from("clients")
          .select("id")
          .or(orQuery.join(","))
          .limit(1)
          .maybeSingle();
        if (existing?.id) clientId = existing.id;
      }
      if (!clientId && order.buyer_name) {
        const { data: created } = await supabase
          .from("clients")
          .insert({
            display_name: order.buyer_name,
            phone: order.buyer_phone ?? null,
            email: order.buyer_email ?? null,
            city: buyerAddr.cidade ?? null,
            state: buyerAddr.uf ?? null,
            customer_since: new Date().toISOString(),
            customer_since_source: "prateleira_checkout",
          })
          .select("id")
          .single();
        if (created?.id) clientId = created.id;
      }
    } catch (e) {
      log.warn("postSale: client upsert failed", { orderId, err: (e as Error).message });
    }

    // ===== Venda (idempotente) =====
    let saleId: string | null = order.sale_id ?? null;
    if (!saleId) {
      const saleInsert: Record<string, unknown> = {
        name: order.buyer_name || order.product_title || "Cliente checkout",
        status: "Rascunho",
        products: order.product_title ? [order.product_title] : [],
        received_value: paidReais,
        payment_method: paymentMethod,
        adults: Number(order.pax) || 1,
        client_id: clientId,
        observations: [
          "Gerado automaticamente pelo checkout InfinitePay",
          `Pedido ${order.id}`,
          order.transaction_nsu ? `Transação ${order.transaction_nsu}` : null,
          order.buyer_email ? `E-mail: ${order.buyer_email}` : null,
          order.buyer_phone ? `Telefone: ${order.buyer_phone}` : null,
          order.is_entry_only ? `Entrada paga. Saldo: R$ ${balanceReais.toFixed(2)}` : null,
        ]
          .filter(Boolean)
          .join(" · "),
      };
      if (product) {
        if ((product as any).departure_date) saleInsert.departure_date = (product as any).departure_date;
        if ((product as any).destination_city) saleInsert.destination_city = (product as any).destination_city;
        if ((product as any).destination_iata) saleInsert.destination_iata = (product as any).destination_iata;
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
      saleId = sale.id;
      await supabase.from("prateleira_orders").update({ sale_id: saleId }).eq("id", orderId);
      log.info("postSale: sale draft created", { orderId, saleId, displayId: sale.display_id });
    }

    // ===== Passageiros (idempotente: só materializa se a venda ainda não tem nenhum) =====
    try {
      const { count: existingPax } = await supabase
        .from("sale_passengers")
        .select("id", { count: "exact", head: true })
        .eq("sale_id", saleId);

      if ((existingPax ?? 0) === 0 && paxList.length > 0) {
        let firstPassengerId: string | null = null;
        for (let i = 0; i < paxList.length; i++) {
          const p = paxList[i];
          const fullName = (p.full_name || p.name || "").trim();
          if (!fullName) continue;
          const passengerPayload: Record<string, unknown> = {
            full_name: fullName,
            cpf: p.cpf ?? null,
            birth_date: p.birth_date || null,
            email: p.email ?? (i === 0 ? order.buyer_email ?? null : null),
            phone: p.phone ?? (i === 0 ? order.buyer_phone ?? null : null),
            passport_number: p.passport_number ?? null,
            passport_expiry: p.passport_expiry || null,
            address_cep: buyerAddr.cep ?? null,
            address_street: buyerAddr.rua ?? null,
            address_number: buyerAddr.numero ?? null,
            address_complement: buyerAddr.complemento ?? null,
            address_neighborhood: buyerAddr.bairro ?? null,
            address_city: buyerAddr.cidade ?? null,
            address_state: buyerAddr.uf ?? null,
            created_via: "prateleira_checkout",
          };
          const { data: pax, error: paxErr } = await supabase
            .from("passengers")
            .insert(passengerPayload)
            .select("id")
            .single();
          if (paxErr || !pax) {
            log.warn("postSale: passenger insert failed", { orderId, err: paxErr?.message });
            continue;
          }
          if (i === 0) firstPassengerId = pax.id;
          await supabase.from("sale_passengers").insert({
            sale_id: saleId,
            passenger_id: pax.id,
            role: i === 0 ? "titular" : "acompanhante",
          });
        }
        if (firstPassengerId) {
          await supabase
            .from("sales")
            .update({ payer_passenger_id: firstPassengerId })
            .eq("id", saleId)
            .is("payer_passenger_id", null);
        }
      }
    } catch (e) {
      log.warn("postSale: passengers materialization failed", { orderId, err: (e as Error).message });
    }

    // ===== E-mail de confirmação =====
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
              isEntryOnly: !!order.is_entry_only,
              balance: balanceReais,
            },
          },
        });
      } catch (e) {
        log.warn("postSale: email confirm failed", { orderId, err: (e as Error).message });
      }
    }

    // ===== Notificação interna (best-effort) =====
    try {
      const notifBody = `💰 Venda online confirmada: ${order.product_title ?? "pacote"} · R$ ${paidReais.toFixed(2)} via ${paymentMethod ?? "pagamento"} · ${order.buyer_name ?? order.buyer_email ?? "comprador"}`;
      const { error: notifErr } = await supabase.functions.invoke("create-notification", {
        body: {
          type: "sale_online_confirmed",
          title: "Venda online confirmada",
          message: notifBody,
          link: saleId ? `/vendas?sale=${saleId}` : null,
          metadata: { order_id: orderId, sale_id: saleId },
        },
      });
      if (notifErr) {
        log.info("postSale: notification function unavailable", { orderId, err: notifErr.message });
      }
    } catch (e) {
      log.info("postSale: notification skipped", { orderId, err: (e as Error).message });
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
