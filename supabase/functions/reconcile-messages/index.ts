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

// Try multiple Z-API endpoints for fetching chat messages (multi-device compatible)
async function fetchZapiMessages(phone: string): Promise<any[]> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Client-Token": CLIENT_TOKEN,
  };

  const allMessages: any[] = [];

  // Strategy 1: GET /chat-messages/{phone} (legacy - may fail on multi-device)
  // Strategy 2: POST /get-messages-chat/{phone} with amount (multi-device)
  // Strategy 3: GET /chat-messages/{phone}?amount=100 (query param variant)

  const strategies = [
    { 
      label: "POST /get-messages-chat with amount",
      url: `${BASE_URL}/get-messages-chat/${encodeURIComponent(phone)}`,
      method: "POST",
      body: JSON.stringify({ amount: 10 }),
    },
    {
      label: "GET /chat-messages with query params",
      url: `${BASE_URL}/chat-messages/${encodeURIComponent(phone)}?amount=200`,
      method: "GET",
    },
    {
      label: "GET /chat-messages basic",
      url: `${BASE_URL}/chat-messages/${encodeURIComponent(phone)}`,
      method: "GET",
    },
  ];

  for (const strategy of strategies) {
    try {
      console.log(`[Reconcile] Trying: ${strategy.label} for ${phone}`);
      const opts: RequestInit = { method: strategy.method, headers, signal: AbortSignal.timeout(25000) };
      if (strategy.body) opts.body = strategy.body;
      
      const resp = await fetch(strategy.url, opts);
      const text = await resp.text();
      
      if (!resp.ok) {
        console.log(`[Reconcile] ${strategy.label} failed (${resp.status}): ${text.slice(0, 200)}`);
        continue;
      }

      let data: any;
      try { data = JSON.parse(text); } catch { continue; }
      
      const msgs = parseChatMessagesPayload(data);
      if (msgs.length > 0) {
        console.log(`[Reconcile] ${strategy.label} returned ${msgs.length} messages`);
        
        // If strategy supports pagination, paginate to get all
        if (strategy.label.includes("POST") && msgs.length >= 190) {
          allMessages.push(...msgs);
          // Paginate: get older messages using lastMessageId
          let lastMsgId = msgs[msgs.length - 1]?.messageId || msgs[msgs.length - 1]?.id;
          let pageCount = 1;
          const MAX_PAGES = 50; // safety limit (50 * 200 = 10k messages max)
          
          while (lastMsgId && pageCount < MAX_PAGES) {
            try {
              const pageResp = await fetch(strategy.url, {
                method: "POST",
                headers,
                body: JSON.stringify({ amount: 200, lastMessageId: lastMsgId }),
              });
              if (!pageResp.ok) break;
              const pageData = await pageResp.json();
              const pageMsgs = parseChatMessagesPayload(pageData);
              if (pageMsgs.length === 0) break;
              
              allMessages.push(...pageMsgs);
              lastMsgId = pageMsgs[pageMsgs.length - 1]?.messageId || pageMsgs[pageMsgs.length - 1]?.id;
              pageCount++;
              
              if (pageMsgs.length < 190) break; // last page
            } catch { break; }
          }
          
          console.log(`[Reconcile] Total fetched with pagination: ${allMessages.length} msgs in ${pageCount + 1} pages`);
          return allMessages;
        }
        
        return msgs;
      }
    } catch (err: any) {
      console.log(`[Reconcile] ${strategy.label} error: ${err.message}`);
    }
  }

  return allMessages;
}

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  let body: any = {};
  try { body = await req.json(); } catch {}

  // Special mode: just test Z-API connectivity
  if (body.test_zapi) {
    const phone = normalizePhone(body.phone || "5521994352690");
    try {
      const msgs = await fetchZapiMessages(phone);
      return new Response(JSON.stringify({
        success: true,
        phone,
        messages_found: msgs.length,
        sample: msgs.slice(0, 3),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

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

        // 2. Fetch from Z-API (multi-device compatible)
        const zapiMessages = await fetchZapiMessages(cleanPhone);

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
          await delay(300);
          continue;
        }

        // 3. Get existing external_message_ids for dedup
        const { data: existingMsgs } = await supabase
          .from("conversation_messages")
          .select("external_message_id")
          .eq("conversation_id", conv.id)
          .not("external_message_id", "is", null);

        const existingIds = new Set<string>(
          (existingMsgs || []).map((em: any) => em.external_message_id).filter(Boolean)
        );

        // 4. Build insert rows
        const rowsToInsert: any[] = [];
        for (const msg of zapiMessages) {
          const messageId = msg?.messageId ? String(msg.messageId) : (msg?.id ? String(msg.id) : null);
          if (!messageId) continue; // skip messages without ID - can't dedup safely
          
          if (existingIds.has(messageId)) {
            stats.total_already_existed++;
            continue;
          }
          existingIds.add(messageId); // prevent within-batch dupes

          const fromMe = Boolean(msg?.fromMe ?? msg?.from_me);
          const msgType = detectMessageType(msg);
          const textContent = extractTextContent(msg, msgType);
          const timestamp = parseTimestampSeconds(msg);
          const mediaUrl = extractMediaUrl(msg);

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
            metadata: { source: "reconciliation" },
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
              if (insertErr.code === "23505" || insertErr.message?.includes("duplicate")) {
                let singleInserted = 0;
                for (const row of chunk) {
                  const { error: singleErr } = await supabase.from("conversation_messages").insert(row);
                  if (!singleErr) singleInserted++;
                }
                console.log(`[Reconcile] ${cleanPhone}: dupes in chunk, inserted ${singleInserted}/${chunk.length}`);
              } else {
                console.error(`[Reconcile] ${cleanPhone}: ${insertErr.message}`);
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

          await supabase.from("conversations").update({ reconciled_at: new Date().toISOString() }).eq("id", conv.id);

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
      await delay(500);
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
