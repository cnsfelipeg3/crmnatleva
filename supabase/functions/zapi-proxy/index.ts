import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const INSTANCE_ID = Deno.env.get("ZAPI_INSTANCE_ID") || "";
const TOKEN = Deno.env.get("ZAPI_TOKEN") || "";
const CLIENT_TOKEN = Deno.env.get("ZAPI_CLIENT_TOKEN") || "";
const BASE_URL = `https://api.z-api.io/instances/${INSTANCE_ID}/token/${TOKEN}`;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

function parseJsonSafely(text: string) {
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizePhone(raw: string): string {
  return String(raw || "")
    .replace(/@c\.us|@s\.whatsapp\.net|@g\.us|-group/gi, "")
    .replace(/\D/g, "")
    .trim();
}

function parseTimestampSeconds(msg: any): number {
  const raw = msg?.momment ?? msg?.moment ?? msg?.timestamp ?? msg?.messageTimestamp ?? msg?.time;
  const num = Number(raw);
  if (Number.isFinite(num) && num > 0) {
    return num > 1_000_000_000_000 ? Math.floor(num / 1000) : Math.floor(num);
  }

  if (typeof raw === "string") {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) return Math.floor(d.getTime() / 1000);
  }

  return Math.floor(Date.now() / 1000);
}

function detectMessageType(msg: any): string {
  if (msg?.image) return "image";
  if (msg?.audio) return "audio";
  if (msg?.video) return "video";
  if (msg?.document) return "document";
  if (msg?.sticker) return "sticker";

  const explicit = String(msg?.type || "").toLowerCase();
  if (["image", "audio", "video", "document", "sticker", "text"].includes(explicit)) {
    return explicit;
  }

  return "text";
}

function extractTextContent(msg: any, msgType: string): string {
  const text =
    msg?.text?.message ||
    (typeof msg?.text === "string" ? msg.text : "") ||
    msg?.body ||
    msg?.caption ||
    msg?.image?.caption ||
    msg?.video?.caption ||
    (msgType === "document" ? msg?.document?.fileName : "") ||
    "";

  return String(text || "").trim();
}

function parseChatsPayload(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.chats)) return data.chats;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function parseChatMessagesPayload(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.messages)) return data.messages;
  if (Array.isArray(data?.chatMessages)) return data.chatMessages;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

async function callZapi(path: string, method = "GET", payload?: unknown) {
  const url = `${BASE_URL}${path}`;
  console.log(`[Z-API] ${method} ${url}`);

  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "Client-Token": CLIENT_TOKEN,
    },
    body: payload && (method === "POST" || method === "PUT") ? JSON.stringify(payload) : undefined,
  });

  const responseText = await response.text();
  const data = parseJsonSafely(responseText);

  if (!response.ok) {
    throw new Error(`Z-API ${path} failed (${response.status}): ${JSON.stringify(data).slice(0, 300)}`);
  }

  return data;
}

async function rebuildHistory(payload: any) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing backend service credentials for history rebuild");
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const specificPhone = payload?.phone ? normalizePhone(payload.phone) : null;
  const rawChats = specificPhone
    ? [{ phone: specificPhone, name: payload?.name || specificPhone }]
    : parseChatsPayload(await callZapi("/chats", "GET"));

  const chats = rawChats.filter((chat: any) => {
    const phone = String(chat?.phone || chat?.id || "");
    return !!phone && !phone.includes("@g.us") && phone !== "status@broadcast";
  });

  const stats = {
    chatsFound: chats.length,
    chatsProcessed: 0,
    messagesFound: 0,
    messagesInserted: 0,
    duplicatesSkipped: 0,
    errors: [] as Array<{ phone: string; error: string }>,
  };

  for (const chat of chats) {
    const chatPhoneRaw = String(chat?.phone || chat?.id || specificPhone || "");
    const cleanPhone = normalizePhone(chatPhoneRaw);
    if (!cleanPhone) continue;

    stats.chatsProcessed += 1;

    try {
      let chatMessagesData: any;
      try {
        chatMessagesData = await callZapi(`/chat-messages/${encodeURIComponent(chatPhoneRaw)}`, "GET");
      } catch {
        chatMessagesData = await callZapi(`/chat-messages/${encodeURIComponent(cleanPhone)}`, "GET");
      }

      const sourceMessages = parseChatMessagesPayload(chatMessagesData);
      stats.messagesFound += sourceMessages.length;

      if (sourceMessages.length === 0) {
        continue;
      }

      const phoneCandidates = Array.from(new Set([
        cleanPhone,
        `+${cleanPhone}`,
        `${cleanPhone}@c.us`,
        `${cleanPhone}@s.whatsapp.net`,
      ]));

      const { data: existingRows, error: existingError } = await supabase
        .from("zapi_messages")
        .select("message_id, timestamp, from_me, type, text")
        .in("phone", phoneCandidates);

      if (existingError) throw existingError;

      const existingMessageIds = new Set<string>();
      const existingSignatures = new Set<string>();

      for (const row of existingRows || []) {
        const messageId = row.message_id ? String(row.message_id) : "";
        if (messageId) existingMessageIds.add(messageId);

        const text = String(row.text || "").trim().slice(0, 180);
        const signature = `${Number(row.timestamp || 0)}|${row.from_me ? "1" : "0"}|${String(row.type || "text")}|${text}`;
        existingSignatures.add(signature);
      }

      const rowsToInsert: any[] = [];
      let latestTs = 0;
      let latestPreview = "";

      for (const msg of sourceMessages) {
        const messageId = msg?.messageId ? String(msg.messageId) : (msg?.id ? String(msg.id) : null);
        const fromMe = Boolean(msg?.fromMe ?? msg?.from_me);
        const msgType = detectMessageType(msg);
        const textContent = extractTextContent(msg, msgType);
        const timestamp = parseTimestampSeconds(msg);

        if (timestamp > latestTs) {
          latestTs = timestamp;
          latestPreview = textContent || `📎 ${msgType}`;
        }

        const signature = `${timestamp}|${fromMe ? "1" : "0"}|${msgType}|${textContent.slice(0, 180)}`;

        if ((messageId && existingMessageIds.has(messageId)) || existingSignatures.has(signature)) {
          stats.duplicatesSkipped += 1;
          continue;
        }

        if (messageId) existingMessageIds.add(messageId);
        existingSignatures.add(signature);

        rowsToInsert.push({
          phone: cleanPhone,
          message_id: messageId,
          from_me: fromMe,
          text: textContent || null,
          type: msgType,
          sender_name: msg?.senderName || chat?.name || chat?.chatName || cleanPhone,
          sender_photo: msg?.senderPhoto || chat?.imgUrl || chat?.image || chat?.photo || null,
          status: msg?.status || (fromMe ? "SENT" : "RECEIVED"),
          timestamp,
          raw_data: msg,
        });
      }

      if (rowsToInsert.length > 0) {
        const chunkSize = 500;
        for (let i = 0; i < rowsToInsert.length; i += chunkSize) {
          const chunk = rowsToInsert.slice(i, i + chunkSize);
          const { error: insertError } = await supabase.from("zapi_messages").insert(chunk);
          if (insertError) {
            console.error(`[Z-API] zapi_messages insert error for ${cleanPhone}:`, insertError.message);
          }
        }
      }

      // --- DUAL-WRITE: Also populate unified conversation_messages table ---
      // First resolve the conversation_id for this phone
      const convExternalIdForUnified = `wa_${cleanPhone}`;
      const phoneCandidatesForConv = Array.from(new Set([
        cleanPhone, `+${cleanPhone}`, `${cleanPhone}@c.us`, `${cleanPhone}@s.whatsapp.net`,
      ]));

      const { data: convRow } = await supabase
        .from("conversations")
        .select("id")
        .or(`phone.eq.${cleanPhone},external_conversation_id.eq.${convExternalIdForUnified}`)
        .limit(1)
        .maybeSingle();

      // We may need to create the conversation first (done later in the flow),
      // so we'll store convId and do unified insert after conversation upsert
      let resolvedConvId = convRow?.id || null;

      // We'll defer unified insert to after conversation upsert below

      stats.messagesInserted += rowsToInsert.length;

      const lastMessageAt = latestTs > 0 ? new Date(latestTs * 1000).toISOString() : null;
      const convExternalId = `wa_${cleanPhone}`;

      const { data: existingConv } = await supabase
        .from("conversations")
        .select("id, contact_name, last_message_at")
        .or(`phone.eq.${cleanPhone},external_conversation_id.eq.${convExternalId}`)
        .limit(1)
        .maybeSingle();

      const contactName = chat?.name || chat?.chatName || cleanPhone;

      if (existingConv?.id) {
        const currentMs = existingConv.last_message_at ? new Date(existingConv.last_message_at).getTime() : 0;
        const incomingMs = lastMessageAt ? new Date(lastMessageAt).getTime() : 0;

        const shouldReplaceName = !existingConv.contact_name ||
          existingConv.contact_name === "Novo Contato" ||
          existingConv.contact_name === "Desconhecido" ||
          /^\+?\d[\d\s\-()]{6,}$/.test(existingConv.contact_name);

        const updatePayload: Record<string, unknown> = {
          phone: cleanPhone,
          external_conversation_id: convExternalId,
          updated_at: new Date().toISOString(),
        };

        if (shouldReplaceName) {
          updatePayload.contact_name = contactName;
        }

        if (incomingMs >= currentMs && lastMessageAt) {
          updatePayload.last_message_at = lastMessageAt;
          updatePayload.last_message_preview = latestPreview || null;
        }

        await supabase.from("conversations").update(updatePayload).eq("id", existingConv.id);
        resolvedConvId = existingConv.id;
      } else {
        const { data: newConv } = await supabase.from("conversations").insert({
          phone: cleanPhone,
          contact_name: contactName,
          source: "whatsapp_api",
          stage: "novo_lead",
          tags: [],
          last_message_at: lastMessageAt || new Date().toISOString(),
          last_message_preview: latestPreview || null,
          unread_count: 0,
          is_vip: false,
          external_conversation_id: convExternalId,
        }).select("id").maybeSingle();
        resolvedConvId = newConv?.id || null;
      }

      // --- Insert into conversation_messages (unified table) ---
      if (resolvedConvId && rowsToInsert.length > 0) {
        // First get existing external_message_ids to avoid duplicates
        const { data: existingUnified } = await supabase
          .from("conversation_messages")
          .select("external_message_id")
          .eq("conversation_id", resolvedConvId)
          .not("external_message_id", "is", null);

        const existingUnifiedIds = new Set((existingUnified || []).map((r: any) => r.external_message_id));

        const unifiedRows = rowsToInsert
          .filter(r => {
            if (!r.message_id) return true; // no dedup key, insert anyway
            return !existingUnifiedIds.has(r.message_id);
          })
          .map(r => ({
            conversation_id: resolvedConvId,
            external_message_id: r.message_id || null,
            direction: r.from_me ? "outgoing" : "incoming",
            sender_type: r.from_me ? "agent" : "customer",
            content: r.text || "",
            message_type: r.type || "text",
            media_url: r.raw_data?.image?.imageUrl || r.raw_data?.audio?.audioUrl || r.raw_data?.video?.videoUrl || r.raw_data?.document?.documentUrl || null,
            timestamp: r.timestamp ? new Date(r.timestamp * 1000).toISOString() : new Date().toISOString(),
            created_at: r.timestamp ? new Date(r.timestamp * 1000).toISOString() : new Date().toISOString(),
            status: r.from_me ? "sent" : "received",
            metadata: { source: "zapi_rebuild", phone: cleanPhone },
          }));

        if (unifiedRows.length > 0) {
          const chunkSize = 500;
          for (let i = 0; i < unifiedRows.length; i += chunkSize) {
            const chunk = unifiedRows.slice(i, i + chunkSize);
            const { error: unifiedErr } = await supabase.from("conversation_messages").insert(chunk);
            if (unifiedErr) {
              console.error(`[Z-API] conversation_messages insert error for ${cleanPhone}:`, unifiedErr.message);
            }
          }
          console.log(`[Z-API] Inserted ${unifiedRows.length} messages into conversation_messages for ${cleanPhone}`);
        }
      }

      await supabase.from("zapi_contacts").upsert({
        phone: cleanPhone,
        name: contactName,
        profile_pic: chat?.imgUrl || chat?.image || chat?.photo || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "phone" });
    } catch (error: any) {
      console.error(`[Z-API] rebuild-history failed for ${cleanPhone}:`, error?.message || String(error));
      stats.errors.push({
        phone: cleanPhone,
        error: error?.message || String(error),
      });
    }
  }

  return stats;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // === AUTH GUARD ===
  // Garante que somente usuários autenticados (e employees ativos, quando aplicável)
  // possam chamar esta função. Sem isso, qualquer um com a URL pública conseguiria
  // disparar mensagens via Z-API.
  try {
    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
    if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
      return new Response(
        JSON.stringify({ error: "unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const jwt = authHeader.slice(7).trim();

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ error: "server_misconfigured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: userData, error: userErr } = await adminClient.auth.getUser(jwt);
    const userId = userData?.user?.id;

    if (userErr || !userId) {
      return new Response(
        JSON.stringify({ error: "unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Se houver registro em employees e estiver inativo, bloqueia.
    // Admins do CRM podem não ter employee — nesse caso seguimos.
    const { data: employee } = await adminClient
      .from("employees")
      .select("id, is_active")
      .eq("user_id", userId)
      .maybeSingle();

    if (employee && employee.is_active === false) {
      return new Response(
        JSON.stringify({ error: "forbidden", reason: "employee_inactive" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (authError: any) {
    console.error("[Z-API] auth guard error:", authError?.message || authError);
    return new Response(
      JSON.stringify({ error: "unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    if (!INSTANCE_ID || !TOKEN) {
      return new Response(
        JSON.stringify({ error: "Z-API not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const reqBody = await req.json().catch(() => ({}));
    const action = reqBody?.action;
    const payload = reqBody?.payload ?? {};

    if (action === "rebuild-history") {
      const result = await rebuildHistory(payload);
      return new Response(JSON.stringify({ success: true, ...result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let url = "";
    let method = "GET";
    let body: string | undefined;

    switch (action) {
      // === INSTÂNCIA ===
      case "get-qrcode":
        url = `${BASE_URL}/qr-code/image`;
        method = "GET";
        break;

      case "check-status":
        url = `${BASE_URL}/status`;
        method = "GET";
        break;

      case "disconnect":
        url = `${BASE_URL}/disconnect`;
        method = "GET";
        break;

      case "restart":
        url = `${BASE_URL}/restart`;
        method = "GET";
        break;

      case "phone-info":
        url = `${BASE_URL}/phone`;
        method = "GET";
        break;

      // === MENSAGENS - ENVIO ===
      case "send-text":
        url = `${BASE_URL}/send-text`;
        method = "POST";
        const textBody: any = {
          phone: payload.phone,
          message: payload.message,
        };
        if (payload.messageId) textBody.messageId = payload.messageId;
        body = JSON.stringify(textBody);
        break;

      case "send-image":
        url = `${BASE_URL}/send-image`;
        method = "POST";
        body = JSON.stringify({
          phone: payload.phone,
          image: payload.image,
          caption: payload.caption || "",
        });
        break;

      case "send-audio":
        url = `${BASE_URL}/send-audio`;
        method = "POST";
        body = JSON.stringify({
          phone: payload.phone,
          audio: payload.audio,
          encoding: true,
          waveform: true,
        });
        break;

      case "send-video":
        url = `${BASE_URL}/send-video`;
        method = "POST";
        body = JSON.stringify({
          phone: payload.phone,
          video: payload.video,
          caption: payload.caption || "",
        });
        break;

      case "send-document":
        url = `${BASE_URL}/send-document/${payload.extension || "pdf"}`;
        method = "POST";
        body = JSON.stringify({
          phone: payload.phone,
          document: payload.document,
          fileName: payload.fileName || "document",
        });
        break;

      case "send-sticker":
        url = `${BASE_URL}/send-sticker`;
        method = "POST";
        body = JSON.stringify({
          phone: payload.phone,
          sticker: payload.sticker,
        });
        break;

      case "send-reaction":
        url = `${BASE_URL}/send-reaction`;
        method = "POST";
        body = JSON.stringify({
          phone: payload.phone,
          messageId: payload.messageId,
          reaction: payload.reaction,
        });
        break;

      case "edit-message":
        url = `${BASE_URL}/send-text`;
        method = "POST";
        body = JSON.stringify({
          phone: payload.phone,
          message: payload.text,
          editMessageId: payload.messageId,
        });
        break;

      // === MENSAGENS - LEITURA ===
      case "get-chats":
        url = `${BASE_URL}/chats`;
        method = "GET";
        break;

      case "get-chat-messages":
        url = `${BASE_URL}/chat-messages/${payload.phone}`;
        method = "GET";
        break;

      case "get-messages":
        url = `${BASE_URL}/queue`;
        method = "GET";
        break;

      // === CONTATOS ===
      case "get-contacts":
        url = `${BASE_URL}/contacts`;
        method = "GET";
        break;

      case "get-contact":
        url = `${BASE_URL}/contacts/${payload.phone}`;
        method = "GET";
        break;

      case "get-profile-picture":
        url = `${BASE_URL}/profile-picture?phone=${encodeURIComponent(payload.phone)}`;
        method = "GET";
        break;

      case "check-number":
        url = `${BASE_URL}/phone-exists/${payload.phone}`;
        method = "GET";
        break;

      // === WEBHOOK ===
      case "set-webhook":
        url = `${BASE_URL}/update-webhook-received`;
        method = "PUT";
        body = JSON.stringify({
          value: payload.webhookUrl,
          enabled: true,
        });
        break;

      case "set-webhook-sent":
        url = `${BASE_URL}/update-every-webhooks`;
        method = "PUT";
        body = JSON.stringify({
          value: payload.webhookUrl,
          notifySentByMe: true,
        });
        break;

      case "set-notify-sent-by-me":
        url = `${BASE_URL}/update-notify-sent-by-me`;
        method = "PUT";
        body = JSON.stringify({
          notifySentByMe: true,
        });
        break;

      // ═══════════════════════════════════════════════════════════
      // === SPRINT 1 QUICK WINS ===
      // ═══════════════════════════════════════════════════════════

      // Reagir mensagem (atalho on-hover · 6 emojis)
      case "send-message-reaction":
        url = `${BASE_URL}/send-reaction`;
        method = "POST";
        body = JSON.stringify({
          phone: payload.phone,
          messageId: payload.messageId,
          reaction: payload.value || payload.reaction,
        });
        break;

      // Remover reação previamente enviada
      case "send-remove-reaction":
        url = `${BASE_URL}/send-remove-reaction`;
        method = "POST";
        body = JSON.stringify({
          phone: payload.phone,
          messageId: payload.messageId,
        });
        break;

      // Fixar / desafixar mensagem (pinDuration: "24H" | "7D" | "30D")
      case "send-pin-message":
        url = `${BASE_URL}/pin-message`;
        method = "POST";
        body = JSON.stringify({
          phone: payload.phone,
          messageId: payload.messageId,
          messageAction: payload.pin === false ? "unpin" : "pin",
          pinMessageDuration: payload.pinDuration || "30D",
        });
        break;

      // Enviar localização (lat/lng + título + endereço)
      case "send-message-location":
        url = `${BASE_URL}/send-location`;
        method = "POST";
        body = JSON.stringify({
          phone: payload.phone,
          title: payload.title || "Localização",
          address: payload.address || "",
          latitude: payload.latitude,
          longitude: payload.longitude,
        });
        break;

      // Link com preview rico (foto + título do site)
      case "send-link":
        url = `${BASE_URL}/send-link`;
        method = "POST";
        body = JSON.stringify({
          phone: payload.phone,
          message: payload.message,
          image: payload.image || "",
          linkUrl: payload.linkUrl || payload.url,
          title: payload.title || "",
          linkDescription: payload.linkDescription || payload.description || "",
        });
        break;

      // Botões interativos clicáveis (lista)
      case "send-button-list":
        url = `${BASE_URL}/send-button-list`;
        method = "POST";
        body = JSON.stringify(payload);
        break;

      // Marca mensagem como lida via API (não só localmente)
      case "read-message":
        url = `${BASE_URL}/read-message`;
        method = "POST";
        body = JSON.stringify({
          phone: payload.phone,
          messageId: payload.messageId,
        });
        break;

      // Verifica em lote se números têm WhatsApp ativo
      case "is-whatsapp-batch":
        url = `${BASE_URL}/phone-exists-batch`;
        method = "POST";
        body = JSON.stringify({ phones: payload.phones || [] });
        break;

      // Verifica um único número
      case "is-whatsapp-single":
        if (!payload?.phone) {
          return new Response(
            JSON.stringify({ error: "phone obrigatório" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        url = `${BASE_URL}/phone-exists/${payload.phone}`;
        method = "GET";
        break;

      // Auto-rejeitar ligações (toggle on/off)
      case "update-call-reject-auto":
        url = `${BASE_URL}/update-call-reject-auto`;
        method = "PUT";
        body = JSON.stringify({ value: payload.enabled === true });
        break;

      // Mensagem custom enviada quando rejeita ligação automaticamente
      case "update-call-reject-message":
        url = `${BASE_URL}/update-call-reject-message`;
        method = "PUT";
        body = JSON.stringify({ value: payload.message || "" });
        break;

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    const fetchOpts: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        "Client-Token": CLIENT_TOKEN,
      },
    };

    if (body && (method === "POST" || method === "PUT")) {
      fetchOpts.body = body;
    }

    console.log(`[Z-API] ${action} → ${method} ${url}`);

    const response = await fetch(url, fetchOpts);
    let data = parseJsonSafely(await response.text());

    if (action === "disconnect") {
      const statusResponse = await fetch(`${BASE_URL}/status`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Client-Token": CLIENT_TOKEN,
        },
      });
      const statusData = parseJsonSafely(await statusResponse.text());
      const stillConnected = statusData?.connected === true || statusData?.smartphoneConnected === true;

      if (response.ok || !stillConnected) {
        return new Response(JSON.stringify({ success: true, disconnected: true, data, status: statusData }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (response.status === 405) {
        console.warn("[Z-API] disconnect returned 405 and status still connected; trying restart fallback");
        const restartResponse = await fetch(`${BASE_URL}/restart`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Client-Token": CLIENT_TOKEN,
          },
        });
        const restartData = parseJsonSafely(await restartResponse.text());
        await wait(1200);
        const qrResponse = await fetch(`${BASE_URL}/qr-code/image`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Client-Token": CLIENT_TOKEN,
          },
        });
        const qrData = parseJsonSafely(await qrResponse.text());
        if (restartResponse.ok || qrResponse.ok) {
          return new Response(JSON.stringify({ success: true, disconnected: false, requiresQr: true, data, restart: restartData, qr: qrData }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    return new Response(JSON.stringify(data), {
      status: response.ok ? 200 : response.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[Z-API] Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});