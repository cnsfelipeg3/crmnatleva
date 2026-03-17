import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function extractMediaFromPayload(payload: any): string | null {
  if (!payload) return null;
  return payload.image?.imageUrl || payload.image?.thumbnailUrl ||
    payload.audio?.audioUrl ||
    payload.video?.videoUrl ||
    payload.document?.documentUrl ||
    payload.sticker?.stickerUrl || null;
}

function extractMediaFromRawData(rawData: any, type: string): string | null {
  if (!rawData) return null;
  const rd = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
  if (type === "audio" || type === "ptt") return rd.audio?.audioUrl || rd.audioUrl || rd.mediaUrl || null;
  if (type === "image") return rd.image?.imageUrl || rd.image?.thumbnailUrl || rd.imageUrl || rd.mediaUrl || null;
  if (type === "video") return rd.video?.videoUrl || rd.videoUrl || rd.mediaUrl || null;
  if (type === "document") return rd.document?.documentUrl || rd.documentUrl || rd.mediaUrl || null;
  if (type === "sticker") return rd.sticker?.stickerUrl || rd.stickerUrl || rd.mediaUrl || null;
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  let body: any = {};
  try { body = await req.json(); } catch {}

  const batchSize = Math.min(body.batch_size || 500, 2000);
  const offset = body.offset || 0;
  const dryRun = body.dry_run === true;

  const stats = { offset, batch_size: batchSize, updated: 0, skipped: 0, no_source: 0, type_normalized: 0, errors: 0 };

  try {
    // 1. Get messages with missing media_url
    const { data: msgs, error } = await supabase
      .from("conversation_messages")
      .select("id, external_message_id, message_type")
      .in("message_type", ["image", "audio", "video", "document", "sticker", "ptt", "ciphertext", "call_log"])
      .is("media_url", null)
      .order("created_at", { ascending: false })
      .range(offset, offset + batchSize - 1);

    if (error) throw error;
    if (!msgs?.length) {
      return new Response(JSON.stringify({ success: true, message: "No more messages to process", ...stats }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    for (const msg of msgs) {
      let mediaUrl: string | null = null;

      // Try whatsapp_events_raw first
      if (msg.external_message_id) {
        const { data: rawEvt } = await supabase
          .from("whatsapp_events_raw")
          .select("payload")
          .eq("external_message_id", msg.external_message_id)
          .maybeSingle();

        if (rawEvt?.payload) {
          mediaUrl = extractMediaFromPayload(rawEvt.payload);
        }

        // Try zapi_messages
        if (!mediaUrl) {
          const { data: zapiMsg } = await supabase
            .from("zapi_messages")
            .select("raw_data, type")
            .eq("message_id", msg.external_message_id)
            .maybeSingle();

          if (zapiMsg?.raw_data) {
            mediaUrl = extractMediaFromRawData(zapiMsg.raw_data, zapiMsg.type || msg.message_type);
          }
        }
      }

      // Normalize message type
      const typeMap: Record<string, string> = { ptt: "audio", ciphertext: "text", call_log: "text" };
      const normalizedType = typeMap[msg.message_type] || msg.message_type;
      const needsTypeUpdate = normalizedType !== msg.message_type;

      if (!mediaUrl && !needsTypeUpdate) {
        stats.no_source++;
        continue;
      }

      if (!dryRun) {
        const updateData: any = {};
        if (mediaUrl) updateData.media_url = mediaUrl;
        if (needsTypeUpdate) updateData.message_type = normalizedType;
        if (needsTypeUpdate && !mediaUrl) {
          // For ciphertext/call_log with no media, update content too
          if (msg.message_type === "ciphertext") updateData.content = "[Mensagem criptografada]";
          if (msg.message_type === "call_log") updateData.content = "📞 Chamada";
        }

        const { error: updateErr } = await supabase
          .from("conversation_messages")
          .update(updateData)
          .eq("id", msg.id);

        if (updateErr) { stats.errors++; continue; }
      }

      if (mediaUrl) stats.updated++;
      if (needsTypeUpdate) stats.type_normalized++;
      if (!mediaUrl) stats.skipped++;
    }

    return new Response(JSON.stringify({
      success: true,
      has_more: msgs.length === batchSize,
      processed: msgs.length,
      ...stats,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message, ...stats }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
