import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  let body: any = {};
  try { body = await req.json(); } catch {}
  const step = body.step || "chat_messages";
  const batchOffset = body.offset || 0;
  const PAGE = body.page_size || 500;
  const MAX_BATCHES = body.max_batches || 20;

  const stats = {
    step,
    migrated: 0,
    skipped: 0,
    errors: [] as string[],
    next_offset: 0,
    has_more: false,
    conversations_reindexed: 0,
    duplicate_conversations_merged: 0,
  };

  try {
    if (step === "chat_messages") {
      let offset = batchOffset;
      let batchCount = 0;

      while (batchCount < MAX_BATCHES) {
        const { data: rows, error } = await supabase
          .from("chat_messages")
          .select("*")
          .order("created_at", { ascending: true })
          .range(offset, offset + PAGE - 1);

        if (error) { stats.errors.push(`fetch: ${error.message}`); break; }
        if (!rows || rows.length === 0) break;

        // Insert one by one to handle duplicates gracefully
        for (const m of rows as any[]) {
          const row = {
            conversation_id: m.conversation_id,
            external_message_id: m.external_message_id || null,
            direction: m.sender_type === "atendente" ? "outgoing" : m.sender_type === "sistema" ? "system" : "incoming",
            sender_type: m.sender_type || "cliente",
            content: m.content || "",
            message_type: m.message_type || "text",
            media_url: m.media_url || null,
            status: m.read_status === "read" ? "read" : m.read_status === "delivered" ? "delivered" : "sent",
            metadata: m.metadata || null,
            timestamp: m.created_at || null,
            created_at: m.created_at || new Date().toISOString(),
          };

          const { error: insertErr } = await supabase
            .from("conversation_messages")
            .insert(row);

          if (insertErr) {
            if (insertErr.message.includes("duplicate") || insertErr.code === "23505") {
              stats.skipped++;
            } else {
              stats.errors.push(`insert: ${insertErr.message}`);
              if (stats.errors.length > 10) break;
            }
          } else {
            stats.migrated++;
          }
        }

        offset += PAGE;
        batchCount++;
        if (rows.length < PAGE || stats.errors.length > 10) break;
      }

      stats.next_offset = offset;
      stats.has_more = batchCount >= MAX_BATCHES;
    }

    if (step === "legacy_messages") {
      let offset = batchOffset;
      let batchCount = 0;

      while (batchCount < MAX_BATCHES) {
        const { data: rows, error } = await supabase
          .from("messages")
          .select("*")
          .order("created_at", { ascending: true })
          .range(offset, offset + PAGE - 1);

        if (error) { stats.errors.push(`fetch: ${error.message}`); break; }
        if (!rows || rows.length === 0) break;

        for (const m of rows as any[]) {
          const row = {
            conversation_id: m.conversation_id,
            external_message_id: m.external_message_id || null,
            direction: m.sender_type === "atendente" ? "outgoing" : m.sender_type === "sistema" ? "system" : "incoming",
            sender_type: m.sender_type || "cliente",
            content: m.text || "",
            message_type: (m.message_type === "ptt" ? "audio" : m.message_type) || "text",
            media_url: m.media_url || null,
            status: (() => {
              const s = (m.status || "sent").toLowerCase();
              if (["read", "lido", "seen", "played"].includes(s)) return "read";
              if (["delivered", "entregue", "received", "delivery_ack"].includes(s)) return "delivered";
              return "sent";
            })(),
            timestamp: m.created_at || null,
            created_at: m.created_at || new Date().toISOString(),
          };

          const { error: insertErr } = await supabase.from("conversation_messages").insert(row);
          if (insertErr) {
            if (insertErr.message.includes("duplicate") || insertErr.code === "23505") stats.skipped++;
            else stats.errors.push(`insert: ${insertErr.message}`);
          } else {
            stats.migrated++;
          }
        }

        offset += PAGE;
        batchCount++;
        if (rows.length < PAGE) break;
      }

      stats.next_offset = offset;
      stats.has_more = batchCount >= MAX_BATCHES;
    }

    if (step === "zapi_messages") {
      let offset = batchOffset;
      let batchCount = 0;

      while (batchCount < MAX_BATCHES) {
        const { data: rows, error } = await supabase
          .from("zapi_messages" as any)
          .select("*")
          .order("timestamp", { ascending: true })
          .range(offset, offset + PAGE - 1);

        if (error) { stats.errors.push(`fetch: ${error.message}`); break; }
        if (!rows || rows.length === 0) break;

        for (const m of rows as any[]) {
          const phone = String(m.phone || "").replace(/\D/g, "").replace(/@.*$/, "");
          if (!phone) { stats.skipped++; continue; }

          const { data: conv } = await supabase
            .from("conversations")
            .select("id")
            .or(`phone.eq.${phone},phone.eq.+${phone}`)
            .order("updated_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (!conv?.id) { stats.skipped++; continue; }

          let ts: Date;
          const numTs = Number(m.timestamp);
          if (Number.isFinite(numTs) && numTs > 1_000_000_000) {
            ts = new Date(numTs > 1_000_000_000_000 ? numTs : numTs * 1000);
          } else {
            ts = new Date(String(m.timestamp || m.created_at));
          }
          if (isNaN(ts.getTime())) ts = new Date();

          let text = m.text || "";
          let mediaUrl: string | null = null;
          const msgType = (m.type || "text").toLowerCase();
          try {
            const rd = typeof m.raw_data === "string" ? JSON.parse(m.raw_data) : m.raw_data;
            if (rd) {
              if (msgType === "image") mediaUrl = rd.image?.imageUrl || rd.imageUrl || null;
              if (msgType === "audio" || msgType === "ptt") mediaUrl = rd.audio?.audioUrl || rd.audioUrl || null;
              if (msgType === "video") mediaUrl = rd.video?.videoUrl || rd.videoUrl || null;
              if (msgType === "document") mediaUrl = rd.document?.documentUrl || rd.documentUrl || null;
            }
          } catch {}

          const row = {
            conversation_id: conv.id,
            external_message_id: m.message_id || null,
            direction: m.from_me ? "outgoing" : "incoming",
            sender_type: m.from_me ? "atendente" : "cliente",
            content: text,
            message_type: msgType === "ptt" ? "audio" : msgType,
            media_url: mediaUrl,
            status: (() => {
              const s = (m.status || "").toUpperCase();
              if (["READ", "PLAYED"].includes(s)) return "read";
              if (["RECEIVED", "DELIVERED", "DELIVERY_ACK"].includes(s)) return "delivered";
              return m.from_me ? "sent" : "delivered";
            })(),
            timestamp: ts.toISOString(),
            created_at: ts.toISOString(),
          };

          const { error: insertErr } = await supabase.from("conversation_messages").insert(row);
          if (insertErr) {
            if (insertErr.message.includes("duplicate") || insertErr.code === "23505") stats.skipped++;
            else stats.errors.push(`insert: ${insertErr.message}`);
          } else {
            stats.migrated++;
          }
        }

        offset += PAGE;
        batchCount++;
        if ((rows as any[]).length < PAGE) break;
      }

      stats.next_offset = offset;
      stats.has_more = batchCount >= MAX_BATCHES;
    }

    if (step === "dedup") {
      const { data: allConvs } = await supabase
        .from("conversations")
        .select("id, phone, updated_at")
        .not("phone", "is", null)
        .order("updated_at", { ascending: false });

      if (allConvs) {
        const phoneMap = new Map<string, any[]>();
        for (const c of allConvs) {
          const cleanPhone = (c.phone || "").replace(/\D/g, "");
          if (!cleanPhone) continue;
          if (!phoneMap.has(cleanPhone)) phoneMap.set(cleanPhone, []);
          phoneMap.get(cleanPhone)!.push(c);
        }

        for (const [, convs] of phoneMap) {
          if (convs.length <= 1) continue;
          const master = convs[0];
          for (let i = 1; i < convs.length; i++) {
            const dup = convs[i];
            await supabase.from("conversation_messages").update({ conversation_id: master.id }).eq("conversation_id", dup.id);
            await supabase.from("chat_messages").update({ conversation_id: master.id }).eq("conversation_id", dup.id);
            await supabase.from("messages").update({ conversation_id: master.id }).eq("conversation_id", dup.id);
            await supabase.from("conversations").delete().eq("id", dup.id);
            stats.duplicate_conversations_merged++;
          }
        }
      }
    }

    if (step === "reindex") {
      const { data: convIds } = await supabase.from("conversations").select("id");
      if (convIds) {
        for (const c of convIds) {
          await supabase.rpc("reindex_conversation", { conv_id: c.id });
          stats.conversations_reindexed++;
        }
      }
    }

    return new Response(JSON.stringify({ success: true, ...stats }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message, ...stats }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
