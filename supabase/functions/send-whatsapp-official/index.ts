import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { to, message, connection_id, type = "text" } = await req.json();
    if (!to || !message || !connection_id) throw new Error("Missing required fields: to, message, connection_id");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: conn, error: fetchErr } = await supabase
      .from("whatsapp_connections")
      .select("*")
      .eq("id", connection_id)
      .eq("status", "active")
      .single();

    if (fetchErr || !conn) throw new Error("Active connection not found");

    // Send message via WhatsApp API
    const sendUrl = `https://graph.facebook.com/v21.0/${conn.phone_number_id}/messages`;
    const sendBody: any = {
      messaging_product: "whatsapp",
      to,
      type,
    };

    if (type === "text") {
      sendBody.text = { body: message };
    } else if (type === "image") {
      sendBody.image = { link: message };
    } else if (type === "document") {
      sendBody.document = { link: message };
    }

    const sendRes = await fetch(sendUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${conn.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(sendBody),
    });

    const sendData = await sendRes.json();

    if (sendData.error) throw new Error(sendData.error.message);

    const waMessageId = sendData.messages?.[0]?.id;

    // Save to official messages
    await supabase.from("whatsapp_official_messages").insert({
      connection_id,
      message_id: waMessageId,
      from_number: conn.phone_number,
      to_number: to,
      direction: "outbound",
      type,
      content: { body: message },
      status: "sent",
    });

    return new Response(JSON.stringify({
      success: true,
      message_id: waMessageId,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
