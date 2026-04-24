import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const VERIFY_TOKEN = "febeal_motors_webhook_verify_2024";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Webhook verification (GET)
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      return new Response(challenge, { status: 200 });
    }
    return new Response("Forbidden", { status: 403 });
  }

  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Webhook messages (POST)
  try {
    const body = await req.json();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const entries = body.entry || [];
    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        if (change.field !== "messages") continue;
        const value = change.value;
        const phoneNumberId = value.metadata?.phone_number_id;

        // Find connection by phone_number_id
        const { data: conn } = await supabase
          .from("whatsapp_connections")
          .select("id")
          .eq("phone_number_id", phoneNumberId)
          .eq("status", "active")
          .maybeSingle();

        if (!conn) continue;

        // Process incoming messages
        const messages = value.messages || [];
        for (const msg of messages) {
          const content: any = {};
          if (msg.type === "text") content.body = msg.text?.body;
          else if (msg.type === "image") content.image = msg.image;
          else if (msg.type === "document") content.document = msg.document;
          else if (msg.type === "audio") content.audio = msg.audio;
          else if (msg.type === "video") content.video = msg.video;
          else content.raw = msg;

          await supabase.from("whatsapp_official_messages").insert({
            connection_id: conn.id,
            message_id: msg.id,
            from_number: msg.from,
            to_number: phoneNumberId,
            direction: "inbound",
            type: msg.type || "text",
            content,
            status: "received",
            timestamp: msg.timestamp ? new Date(parseInt(msg.timestamp) * 1000).toISOString() : new Date().toISOString(),
          });

          // Also create/update conversation in main conversations table for Inbox integration
          const contactName = value.contacts?.[0]?.profile?.name || msg.from;
          const { data: existingConv } = await supabase
            .from("conversations")
            .select("id")
            .eq("phone", msg.from)
            .maybeSingle();

          if (existingConv) {
            await supabase.from("conversations").update({
              last_message_at: new Date().toISOString(),
              last_message_preview: content.body || `[${msg.type}]`,
              unread_count: 1, // increment handled below
              updated_at: new Date().toISOString(),
            }).eq("id", existingConv.id);

            // Increment unread
            try {
              await supabase.rpc("increment_unread" as any, { conv_id: existingConv.id });
            } catch {
              // If RPC doesn't exist, the update above set it to 1
            }

            // Insert into messages table for Inbox
            await supabase.from("messages").insert({
              conversation_id: existingConv.id,
              sender_type: "cliente",
              message_type: msg.type === "text" ? "text" : msg.type as any,
              text: content.body || `[${msg.type}]`,
              media_url: content.image?.link || content.document?.link || null,
              status: "delivered",
            });
          } else {
            // Create new conversation
            const { data: newConv } = await supabase.from("conversations").insert({
              phone: msg.from,
              contact_name: contactName,
              source: "whatsapp_api",
              stage: "novo_lead",
              tags: ["API Oficial"],
              last_message_at: new Date().toISOString(),
              last_message_preview: content.body || `[${msg.type}]`,
              unread_count: 1,
            }).select("id").single();

            if (newConv) {
              await supabase.from("messages").insert({
                conversation_id: newConv.id,
                sender_type: "cliente",
                message_type: msg.type === "text" ? "text" : msg.type as any,
                text: content.body || `[${msg.type}]`,
                media_url: content.image?.link || content.document?.link || null,
                status: "delivered",
              });
            }
          }
        }

        // Process status updates
        const statuses = value.statuses || [];
        for (const statusUpdate of statuses) {
          await supabase
            .from("whatsapp_official_messages")
            .update({ status: statusUpdate.status })
            .eq("message_id", statusUpdate.id);
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Webhook error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
