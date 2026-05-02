import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Heartbeat · checa /instance/status da Z-API a cada 5 min via pg_cron.
 * Se status != "connected", insere evento heartbeat_fail.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const instanceId = Deno.env.get("ZAPI_INSTANCE_ID");
  const token = Deno.env.get("ZAPI_TOKEN");
  const clientToken = Deno.env.get("ZAPI_CLIENT_TOKEN");

  if (!instanceId || !token) {
    return new Response(JSON.stringify({ error: "Z-API not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const r = await fetch(`https://api.z-api.io/instances/${instanceId}/token/${token}/status`, {
      headers: clientToken ? { "Client-Token": clientToken } : {},
      signal: AbortSignal.timeout(8000),
    });
    const data = await r.json().catch(() => ({}));
    const isConnected = !!data?.connected || data?.status === "connected";

    await supabase.from("whatsapp_connection_events").insert({
      event_type: isConnected ? "heartbeat_ok" : "heartbeat_fail",
      instance_id: instanceId,
      status: isConnected ? "connected" : "disconnected",
      error_message: isConnected ? null : (data?.error || data?.message || "status check failed"),
      raw_payload: data,
    });

    return new Response(JSON.stringify({ success: true, isConnected, data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    await supabase.from("whatsapp_connection_events").insert({
      event_type: "heartbeat_fail",
      instance_id: instanceId,
      status: "unreachable",
      error_message: e?.message || "fetch failed",
    });
    return new Response(JSON.stringify({ error: "heartbeat failed", message: e?.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
