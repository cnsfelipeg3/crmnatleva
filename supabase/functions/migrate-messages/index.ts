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

  const stats = {
    chat_messages_migrated: 0,
    legacy_messages_migrated: 0,
    zapi_messages_migrated: 0,
    duplicates_skipped: 0,
    conversations_reindexed: 0,
    duplicate_conversations_merged: 0,
    errors: [] as string[],
  };

  try {
    // ── STEP 1: Migrate from chat_messages ──
    console.log("Step 1: Migrating chat_messages...");
    let offset = 0;
    const PAGE = 500;
    while (true) {
      const { data: rows, error } = await supabase
        .from("chat_messages")
        .select("*")
        .order("created_at", { ascending: true })
        .range(offset, offset + PAGE - 1);

      if (error) { stats.errors.push(`chat_messages fetch: ${error.message}`); break; }
      if (!rows || rows.length === 0) break;

      const toInsert = rows.map((m: any) => ({
        conversation_id: m.conversation_id,
        external_message_id: m.external_message_id || null,
        direction: m.sender_type === "atendente" ? "outgoing" : m.sender_type === "sistema" ? "system" : "incoming",
        sender_type: m.sender_type || "cliente",
        content: m.content || "",
        message_type: m.message_type || "text",
        media_url: m.media_url || null,
        status: m.read_status === "read" ? "read" : m.read_status === "delivered" ? "delivered" : "sent",
        metadata: m.metadata || null,
        timestamp: m.created_at ? new Date(m.created_at) : null,
        created_at: m.created_at,
      }));

      const { error: insertErr } = await supabase
        .from("conversation_messages")
        .upsert(toInsert.filter((r: any) => r.external_message_id), {
          onConflict: "conversation_id,external_message_id",
          ignoreDuplicates: true,
        });

      // Insert rows without external_message_id separately
      const noExtId = toInsert.filter((r: any) => !r.external_message_id);
      if (noExtId.length > 0) {
        await supabase.from("conversation_messages").insert(noExtId);
      }

      if (insertErr) stats.errors.push(`chat_messages insert: ${insertErr.message}`);
      else stats.chat_messages_migrated += rows.length;

      if (rows.length < PAGE) break;
      offset += PAGE;
    }

    // ── STEP 2: Migrate from legacy messages table ──
    console.log("Step 2: Migrating legacy messages...");
    offset = 0;
    while (true) {
      const { data: rows, error } = await supabase
        .from("messages")
        .select("*")
        .order("created_at", { ascending: true })
        .range(offset, offset + PAGE - 1);

      if (error) { stats.errors.push(`messages fetch: ${error.message}`); break; }
      if (!rows || rows.length === 0) break;

      const toInsert = rows.map((m: any) => ({
        conversation_id: m.conversation_id,
        external_message_id: m.external_message_id || null,
        direction: m.sender_type === "atendente" ? "outgoing" : m.sender_type === "sistema" ? "system" : "incoming",
        sender_type: m.sender_type || "cliente",
        content: m.text || "",
        message_type: m.message_type === "ptt" ? "audio" : (m.message_type || "text"),
        media_url: m.media_url || null,
        status: (() => {
          const s = (m.status || "sent").toLowerCase();
          if (["read", "lido", "seen", "played"].includes(s)) return "read";
          if (["delivered", "entregue", "received", "delivery_ack"].includes(s)) return "delivered";
          return "sent";
        })(),
        timestamp: m.created_at ? new Date(m.created_at) : null,
        created_at: m.created_at,
      }));

      const withExtId = toInsert.filter((r: any) => r.external_message_id);
      if (withExtId.length > 0) {
        const { error: insertErr } = await supabase
          .from("conversation_messages")
          .upsert(withExtId, { onConflict: "conversation_id,external_message_id", ignoreDuplicates: true });
        if (insertErr) stats.errors.push(`messages upsert: ${insertErr.message}`);
      }

      const noExtId = toInsert.filter((r: any) => !r.external_message_id);
      if (noExtId.length > 0) {
        await supabase.from("conversation_messages").insert(noExtId);
      }

      stats.legacy_messages_migrated += rows.length;
      if (rows.length < PAGE) break;
      offset += PAGE;
    }

    // ── STEP 3: Migrate from zapi_messages ──
    console.log("Step 3: Migrating zapi_messages...");
    offset = 0;
    while (true) {
      const { data: rows, error } = await supabase
        .from("zapi_messages" as any)
        .select("*")
        .order("timestamp", { ascending: true })
        .range(offset, offset + PAGE - 1);

      if (error) { stats.errors.push(`zapi_messages fetch: ${error.message}`); break; }
      if (!rows || rows.length === 0) break;

      for (const m of rows as any[]) {
        const phone = String(m.phone || "").replace(/\D/g, "").replace(/@.*$/, "");
        if (!phone) continue;

        // Find conversation by phone
        const { data: conv } = await supabase
          .from("conversations")
          .select("id")
          .or(`phone.eq.${phone},phone.eq.+${phone}`)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!conv?.id) continue;

        const msgType = (m.type || "text").toLowerCase();
        const normalizedType = msgType === "ptt" ? "audio" : msgType;
        const direction = m.from_me ? "outgoing" : "incoming";
        const extId = m.message_id || null;

        // Parse timestamp
        let ts: Date;
        const numTs = Number(m.timestamp);
        if (Number.isFinite(numTs) && numTs > 1_000_000_000) {
          ts = new Date(numTs > 1_000_000_000_000 ? numTs : numTs * 1000);
        } else {
          ts = new Date(String(m.timestamp || m.created_at));
        }
        if (isNaN(ts.getTime())) ts = new Date();

        // Extract text from raw_data if needed
        let text = m.text || "";
        let mediaUrl: string | null = null;
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
          external_message_id: extId,
          direction,
          sender_type: m.from_me ? "atendente" : "cliente",
          content: text,
          message_type: normalizedType,
          media_url: mediaUrl,
          status: (() => {
            const s = (m.status || "").toUpperCase();
            if (["READ", "PLAYED"].includes(s)) return "read";
            if (["RECEIVED", "DELIVERED", "DELIVERY_ACK"].includes(s)) return "delivered";
            return m.from_me ? "sent" : "received";
          })(),
          timestamp: ts.toISOString(),
          created_at: ts.toISOString(),
        };

        if (extId) {
          await supabase.from("conversation_messages").upsert(row, {
            onConflict: "conversation_id,external_message_id",
            ignoreDuplicates: true,
          });
        } else {
          await supabase.from("conversation_messages").insert(row);
        }
        stats.zapi_messages_migrated++;
      }

      if ((rows as any[]).length < PAGE) break;
      offset += PAGE;
    }

    // ── STEP 4: Deduplicate conversations ──
    console.log("Step 4: Deduplicating conversations...");
    const { data: dupes } = await supabase.rpc("find_duplicate_conversations" as any).catch(() => ({ data: null }));
    // Manual dedup by phone
    const { data: allConvs } = await supabase
      .from("conversations")
      .select("id, phone, external_conversation_id, updated_at")
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

      for (const [phone, convs] of phoneMap) {
        if (convs.length <= 1) continue;
        const master = convs[0]; // most recently updated
        for (let i = 1; i < convs.length; i++) {
          const dup = convs[i];
          // Move messages to master
          await supabase
            .from("conversation_messages")
            .update({ conversation_id: master.id })
            .eq("conversation_id", dup.id);
          // Move chat_messages
          await supabase.from("chat_messages").update({ conversation_id: master.id }).eq("conversation_id", dup.id);
          // Move messages
          await supabase.from("messages").update({ conversation_id: master.id }).eq("conversation_id", dup.id);
          // Delete duplicate conversation
          await supabase.from("conversations").delete().eq("id", dup.id);
          stats.duplicate_conversations_merged++;
        }
      }
    }

    // ── STEP 5: Reindex all conversations ──
    console.log("Step 5: Reindexing conversations...");
    const { data: convIds } = await supabase
      .from("conversations")
      .select("id");

    if (convIds) {
      for (const c of convIds) {
        await supabase.rpc("reindex_conversation", { conv_id: c.id });
        stats.conversations_reindexed++;
      }
    }

    console.log("Migration complete:", stats);
    return new Response(JSON.stringify({ success: true, stats }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Migration error:", err);
    return new Response(JSON.stringify({ error: err.message, stats }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
