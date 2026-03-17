import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const INSTANCE_ID = Deno.env.get("ZAPI_INSTANCE_ID") || "";
const TOKEN = Deno.env.get("ZAPI_TOKEN") || "";
const CLIENT_TOKEN = Deno.env.get("ZAPI_CLIENT_TOKEN") || "";
const BASE_URL = `https://api.z-api.io/instances/${INSTANCE_ID}/token/${TOKEN}`;

function normalizePhone(raw: string): string {
  return String(raw || "").replace(/@c\.us|@s\.whatsapp\.net|@g\.us|-group/gi, "").replace(/\D/g, "").trim();
}

function parseTimestampSeconds(msg: any): number {
  const raw = msg?.momment ?? msg?.moment ?? msg?.timestamp ?? msg?.messageTimestamp ?? msg?.time;
  const num = Number(raw);
  if (Number.isFinite(num) && num > 0) return num > 1_000_000_000_000 ? Math.floor(num / 1000) : Math.floor(num);
  if (typeof raw === "string") { const d = new Date(raw); if (!isNaN(d.getTime())) return Math.floor(d.getTime() / 1000); }
  return Math.floor(Date.now() / 1000);
}

function detectMessageType(msg: any): string {
  if (msg?.image) return "image";
  if (msg?.audio) return "audio";
  if (msg?.video) return "video";
  if (msg?.document) return "document";
  if (msg?.sticker) return "sticker";
  const explicit = String(msg?.type || "").toLowerCase();
  if (["image","audio","video","document","sticker","text"].includes(explicit)) return explicit;
  return "text";
}

function extractTextContent(msg: any, msgType: string): string {
  return String(
    msg?.text?.message || (typeof msg?.text === "string" ? msg.text : "") ||
    msg?.body || msg?.caption || msg?.image?.caption || msg?.video?.caption ||
    (msgType === "document" ? msg?.document?.fileName : "") || ""
  ).trim();
}

function extractMediaUrl(msg: any): string | null {
  return msg?.image?.imageUrl || msg?.audio?.audioUrl || msg?.video?.videoUrl || msg?.document?.documentUrl || null;
}

function parseChatMessagesPayload(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.messages)) return data.messages;
  if (Array.isArray(data?.chatMessages)) return data.chatMessages;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

async function callZapi(path: string, method = "GET") {
  const url = `${BASE_URL}${path}`;
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json", "Client-Token": CLIENT_TOKEN },
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Z-API ${path} (${response.status}): ${text.slice(0, 300)}`);
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

// Delay helper
const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  let body: any = {};
  try { body = await req.json(); } catch {}

  const batchSize = Math.min(body.batch_size || 20, 100);
  const offset = body.offset || 0;
  const dryRun = body.dry_run === true;
  const specificPhone = body.phone ? normalizePhone(body.phone) : null;

  const stats = {
    batch_offset: offset,
    batch_size: batchSize,
    dry_run: dryRun,
    conversations_processed: 0,
    conversations_skipped: 0,
    conversations_errored: 0,
    total_messages_inserted: 0,
    total_zapi_messages_found: 0,
    total_already_existed: 0,
    details: [] as any[],
    has_more: false,
  };

  try {
    // Fetch batch of conversations
    let query = supabase
      .from("conversations")
      .select("id, phone, contact_name, external_conversation_id, reconciled_at")
      .not("phone", "is", null)
      .order("updated_at", { ascending: false });

    if (specificPhone) {
      query = query.or(`phone.eq.${specificPhone},phone.eq.+${specificPhone}`);
    } else {
      query = query.range(offset, offset + batchSize - 1);
    }

    const { data: conversations, error: convError } = await query;
    if (convError) throw convError;
    if (!conversations || conversations.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No conversations to process", ...stats }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    stats.has_more = !specificPhone && conversations.length === batchSize;

    for (const conv of conversations) {
      const cleanPhone = normalizePhone(conv.phone || "");
      if (!cleanPhone || cleanPhone.length < 8) {
        stats.conversations_skipped++;
        continue;
      }

      const detail: any = {
        conversation_id: conv.id,
        phone: cleanPhone,
        contact_name: conv.contact_name,
        status: "pending",
        messages_before: 0,
        messages_after: 0,
        messages_inserted: 0,
        zapi_found: 0,
        error: null,
      };

      try {
        // 1. Count existing messages
        const { count: beforeCount } = await supabase
          .from("conversation_messages")
          .select("id", { count: "exact", head: true })
          .eq("conversation_id", conv.id);
        detail.messages_before = beforeCount || 0;

        // 2. Fetch from Z-API
        let zapiMessages: any[] = [];
        try {
          const data = await callZapi(`/chat-messages/${encodeURIComponent(cleanPhone)}`, "GET");
          zapiMessages = parseChatMessagesPayload(data);
        } catch (zapiErr: any) {
          // Try with @c.us suffix
          try {
            const data = await callZapi(`/chat-messages/${encodeURIComponent(cleanPhone + "@c.us")}`, "GET");
            zapiMessages = parseChatMessagesPayload(data);
          } catch {
            throw new Error(`Z-API fetch failed: ${zapiErr.message}`);
          }
        }

        detail.zapi_found = zapiMessages.length;
        stats.total_zapi_messages_found += zapiMessages.length;

        if (zapiMessages.length === 0) {
          detail.status = "skipped_no_zapi_msgs";
          stats.conversations_skipped++;

          if (!dryRun) {
            await supabase.from("conversation_reconciliation_log").insert({
              conversation_id: conv.id,
              phone: cleanPhone,
              status: "skipped",
              messages_before: detail.messages_before,
              zapi_messages_found: 0,
              messages_inserted: 0,
              messages_after: detail.messages_before,
            });
          }

          stats.details.push(detail);
          await delay(200); // rate limit
          continue;
        }

        // 3. Get existing external_message_ids for dedup
        const { data: existingMsgs } = await supabase
          .from("conversation_messages")
          .select("external_message_id, timestamp")
          .eq("conversation_id", conv.id);

        const existingIds = new Set<string>();
        const existingSignatures = new Set<string>();
        for (const em of (existingMsgs || [])) {
          if (em.external_message_id) existingIds.add(em.external_message_id);
          // Signature-based dedup for messages without external_message_id
          const ts = em.timestamp ? new Date(em.timestamp).getTime() : 0;
          existingSignatures.add(`${Math.floor(ts / 1000)}`);
        }

        // 4. Build insert rows
        const rowsToInsert: any[] = [];
        for (const msg of zapiMessages) {
          const messageId = msg?.messageId ? String(msg.messageId) : (msg?.id ? String(msg.id) : null);
          const fromMe = Boolean(msg?.fromMe ?? msg?.from_me);
          const msgType = detectMessageType(msg);
          const textContent = extractTextContent(msg, msgType);
          const timestamp = parseTimestampSeconds(msg);
          const mediaUrl = extractMediaUrl(msg);

          // Dedup: skip if messageId already exists
          if (messageId && existingIds.has(messageId)) {
            stats.total_already_existed++;
            continue;
          }

          // Signature dedup for messages without ID
          if (!messageId) {
            const sig = `${timestamp}`;
            if (existingSignatures.has(sig)) {
              stats.total_already_existed++;
              continue;
            }
            existingSignatures.add(sig);
          } else {
            existingIds.add(messageId);
          }

          rowsToInsert.push({
            conversation_id: conv.id,
            external_message_id: messageId,
            direction: fromMe ? "outgoing" : "incoming",
            sender_type: fromMe ? "agent" : "customer",
            content: textContent || "",
            message_type: msgType,
            media_url: mediaUrl,
            timestamp: new Date(timestamp * 1000).toISOString(),
            created_at: new Date(timestamp * 1000).toISOString(),
            status: fromMe ? "sent" : "delivered",
            metadata: { source: "reconciliation", original_msg_id: messageId },
          });
        }

        detail.messages_inserted = rowsToInsert.length;
        stats.total_messages_inserted += rowsToInsert.length;

        // 5. Insert missing messages
        if (!dryRun && rowsToInsert.length > 0) {
          const chunkSize = 200;
          for (let i = 0; i < rowsToInsert.length; i += chunkSize) {
            const chunk = rowsToInsert.slice(i, i + chunkSize);
            const { error: insertErr } = await supabase
              .from("conversation_messages")
              .insert(chunk);

            if (insertErr) {
              // If unique constraint violation, try one-by-one
              if (insertErr.code === "23505" || insertErr.message?.includes("duplicate")) {
                let singleInserted = 0;
                for (const row of chunk) {
                  const { error: singleErr } = await supabase
                    .from("conversation_messages")
                    .insert(row);
                  if (!singleErr) singleInserted++;
                }
                console.log(`[Reconcile] ${cleanPhone}: chunk had dupes, inserted ${singleInserted}/${chunk.length} individually`);
              } else {
                console.error(`[Reconcile] ${cleanPhone}: insert error: ${insertErr.message}`);
                detail.error = insertErr.message;
              }
            }
          }
        }

        // 6. Reindex conversation
        if (!dryRun && rowsToInsert.length > 0) {
          await supabase.rpc("reindex_conversation", { conv_id: conv.id });
        }

        // 7. Count after
        if (!dryRun) {
          const { count: afterCount } = await supabase
            .from("conversation_messages")
            .select("id", { count: "exact", head: true })
            .eq("conversation_id", conv.id);
          detail.messages_after = afterCount || 0;

          // Mark as reconciled
          await supabase.from("conversations").update({ reconciled_at: new Date().toISOString() }).eq("id", conv.id);

          // Log
          await supabase.from("conversation_reconciliation_log").insert({
            conversation_id: conv.id,
            phone: cleanPhone,
            status: detail.error ? "error" : "success",
            messages_before: detail.messages_before,
            messages_after: detail.messages_after,
            messages_inserted: rowsToInsert.length,
            zapi_messages_found: zapiMessages.length,
            error: detail.error,
          });
        } else {
          detail.messages_after = detail.messages_before + rowsToInsert.length;
        }

        detail.status = detail.error ? "error" : "success";
        stats.conversations_processed++;
      } catch (err: any) {
        detail.status = "error";
        detail.error = err.message;
        stats.conversations_errored++;
        console.error(`[Reconcile] Error ${cleanPhone}: ${err.message}`);

        if (!dryRun) {
          await supabase.from("conversation_reconciliation_log").insert({
            conversation_id: conv.id,
            phone: cleanPhone,
            status: "error",
            messages_before: detail.messages_before,
            error: err.message,
          });
        }
      }

      stats.details.push(detail);
      // Rate limit: 300ms between conversations to avoid Z-API throttle
      await delay(300);
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
