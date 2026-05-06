// Edge function chamada pelo pg_cron a cada 1min para disparar mensagens agendadas.
// Protegida por header X-Scheduled-Token (SCHEDULED_SHARED_SECRET).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-scheduled-token",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SHARED_SECRET = Deno.env.get("SCHEDULED_SHARED_SECRET") || "";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const token = req.headers.get("x-scheduled-token") || "";
  if (!SHARED_SECRET || token !== SHARED_SECRET) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

  // Trava e captura mensagens prontas (status=sending após RPC)
  const { data: claimed, error: claimErr } = await sb.rpc("claim_scheduled_messages", { p_limit: 50 });
  if (claimErr) {
    console.error("[scheduled] claim error", claimErr);
    return new Response(JSON.stringify({ error: claimErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const items = (claimed || []) as any[];
  const results = { processed: 0, sent: 0, failed: 0 };

  for (const item of items) {
    results.processed++;
    try {
      const payload = item.original_payload || {};
      const action = payload.action || "send-text";
      const body = payload.payload || {};

      // Chama zapi-proxy reusando payload salvo
      const proxyRes = await fetch(`${SUPABASE_URL}/functions/v1/zapi-proxy`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SERVICE_ROLE}`,
          "apikey": SERVICE_ROLE,
        },
        body: JSON.stringify({ action, payload: body }),
      });
      const proxyData = await proxyRes.json().catch(() => ({}));
      const ok = proxyRes.ok && proxyData?.success !== false;
      const realId = proxyData?.messageId || proxyData?.id || null;

      if (ok) {
        // Marca scheduled como sent
        await sb.from("scheduled_messages").update({
          status: "sent",
          sent_at: new Date().toISOString(),
          message_id_after_sent: realId,
        }).eq("id", item.id);

        // Insere no histórico de conversation_messages para aparecer no chat
        if (item.conversation_id) {
          await sb.from("conversation_messages").insert({
            conversation_id: item.conversation_id,
            sender_type: "atendente",
            message_type: action === "send-text" ? "text" : (action.replace("send-", "") || "text"),
            content: item.content || item.caption || "",
            media_url: item.media_url || null,
            external_message_id: realId,
            status: "sent",
            original_payload: payload,
          });
        }
        results.sent++;
      } else {
        const detail = String(proxyData?.error || proxyData?.message || `http_${proxyRes.status}`).slice(0, 500);
        await sb.from("scheduled_messages").update({
          status: "failed",
          failure_reason: proxyRes.status >= 500 ? "temporary" : "send_failed",
          failure_detail: detail,
        }).eq("id", item.id);
        results.failed++;
      }
    } catch (err: any) {
      console.error("[scheduled] error processing", item.id, err);
      await sb.from("scheduled_messages").update({
        status: "failed",
        failure_reason: "exception",
        failure_detail: String(err?.message || err).slice(0, 500),
      }).eq("id", item.id);
      results.failed++;
    }
  }

  return new Response(JSON.stringify({ ok: true, ...results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
