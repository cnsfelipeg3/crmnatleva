// Webhook Z-API · Validação via X-NatLeva-Token (constant-time compare)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Helper: detecta nomes "ruins" (agência, genéricos, telefone) ───
function isAgencyOrGenericName(name: string | null | undefined): boolean {
  if (!name) return true;
  const t = name.trim().toLowerCase();
  if (!t) return true;
  const agencyName = (Deno.env.get("AGENCY_NAME") || "natleva viagens").toLowerCase();
  if (t === agencyName) return true;
  if (t === "natleva" || t === "natleva viagens" || t === "natleva wings") return true;
  if (t === "atendente" || t === "operador" || t === "agencia" || t === "agência") return true;
  if (t === "novo contato" || t === "desconhecido" || t === "contato sem nome") return true;
  if (/^\+?\d[\d\s\-()]{6,}$/.test(t)) return true;
  // LID puro (15+ dígitos com ou sem @lid) não é nome
  if (/^\d{15,}(@lid)?$/.test(t)) return true;
  return false;
}

// ─── Helper: format BR phone for display ───
function formatPhoneDisplay(rawPhone: string): string {
  const digits = String(rawPhone || "").replace(/\D/g, "");
  if (/^55\d{10,11}$/.test(digits)) {
    const ddd = digits.slice(2, 4);
    const rest = digits.slice(4);
    if (rest.length === 9) return `+55 ${ddd} ${rest.slice(0, 5)}-${rest.slice(5)}`;
    if (rest.length === 8) return `+55 ${ddd} ${rest.slice(0, 4)}-${rest.slice(4)}`;
  }
  return digits ? `+${digits}` : rawPhone;
}

/**
 * Sanitiza um nome vindo do Z-API: se for LID puro (ex: "276136550478042@lid"
 * ou só dígitos longos), devolve o telefone formatado em vez do LID.
 * Evita gravar lixo tipo "276136550478042@lid" no contact_name.
 */
function sanitizeContactName(rawName: string | null | undefined, phone: string | null): string | null {
  const name = (rawName || "").trim();
  if (!name) return phone ? formatPhoneDisplay(phone) : null;
  if (/^\d{15,}(@lid)?$/.test(name) || name.endsWith("@lid")) {
    return phone ? formatPhoneDisplay(phone) : null;
  }
  return name;
}

// ─── Helper: normalize phone to digits only ───
function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, "");
}

// ─── Helper: classify event type ───
function classifyEvent(body: any): string {
  if (body.type === "MessageStatusCallback") return "status";
  if (body.isStatusReply === true) return "status_story";
  if ((body.phone || "").includes("status@broadcast")) return "status_broadcast";
  if (body.status && body.ids?.length > 0 && !body.text && !body.image && !body.audio && !body.video && !body.document) return "status";
  if (body.fromMe) return "sent";
  return "received";
}

// ─── Helper: extract media URL ───
function extractMediaUrl(body: any): string | null {
  return body.image?.imageUrl || body.image?.thumbnailUrl ||
    body.sticker?.stickerUrl ||
    body.audio?.audioUrl ||
    body.video?.videoUrl ||
    body.document?.documentUrl || null;
}

// ─── Helper: extract message type ───
function extractMsgType(body: any): string {
  if (body.image) return "image";
  if (body.sticker) return "image"; // sticker → image
  if (body.audio) return "audio"; // includes ptt
  if (body.video) return "video";
  if (body.document) return "document";
  return "text";
}

// ─── Helper: extract media URL (including sticker) ───

// ─── Helper: extract text content ───
function extractTextContent(body: any): string {
  return body.text?.message || (typeof body.text === "string" ? body.text : "") || body.caption || "";
}

// ─── Helper: resolve LID phone ───
async function resolveLidPhone(
  supabase: any, rawPhone: string, body: any
): Promise<string | null> {
  const lid = rawPhone.replace("@lid", "");

  // Strategy 1: Direct lookup in zapi_contacts by LID
  const { data: contact } = await supabase
    .from("zapi_contacts")
    .select("phone")
    .eq("lid", lid)
    .maybeSingle();

  if (contact?.phone) {
    console.log(`[Webhook] LID ${lid} → cached phone ${contact.phone}`);
    return contact.phone;
  }

  // Strategy 2: Check if we have a recent INBOUND message from this LID's chat
  // The Z-API often sends inbound messages with the real phone, and outbound with LID.
  // We can correlate by matching the messageId prefix or by checking recent conversations.
  const messageId = body.messageId || "";
  if (messageId) {
    // Check if a recent inbound message from same chat was processed (they share chatLid patterns)
    const { data: recentRaw } = await supabase
      .from("whatsapp_events_raw")
      .select("phone, conversation_id")
      .eq("from_me", false)
      .not("phone", "like", "%@lid%")
      .not("conversation_id", "is", null)
      .order("received_at", { ascending: false })
      .limit(200);

    if (recentRaw?.length) {
      // Check if any of these phones have a matching LID in zapi_contacts
      for (const raw of recentRaw) {
        const cleanPhone = normalizePhone(raw.phone);
        if (!cleanPhone) continue;
        const { data: contactMatch } = await supabase
          .from("zapi_contacts")
          .select("lid")
          .eq("phone", cleanPhone)
          .maybeSingle();
        // Skip - no lid stored for this contact
        if (!contactMatch?.lid) continue;
      }
    }
  }

  // Strategy 3: Try Z-API get-chats to find LID mapping
  try {
    const zapiInstanceId = Deno.env.get("ZAPI_INSTANCE_ID") || "";
    const zapiToken = Deno.env.get("ZAPI_TOKEN") || "";
    const zapiClientToken = Deno.env.get("ZAPI_CLIENT_TOKEN") || "";
    const chatsUrl = `https://api.z-api.io/instances/${zapiInstanceId}/token/${zapiToken}/chats`;
    const chatsRes = await fetch(chatsUrl, {
      headers: { "Client-Token": zapiClientToken },
    });
    if (chatsRes.ok) {
      const chats = await chatsRes.json();
      const match = (chats || []).find((c: any) => {
        const chatLidClean = (c.lid || "").replace("@lid", "");
        return chatLidClean === lid;
      });
      if (match?.phone) {
        const resolved = normalizePhone(String(match.phone));
        // Only cache senderPhoto for inbound msgs (fromMe=true would store agency photo)
        const photo = !body.fromMe ? (body.senderPhoto || match.profilePictureUrl || match.imageUrl || null) : (match.profilePictureUrl || match.imageUrl || null);
        await supabase.from("zapi_contacts").upsert({
          phone: resolved, lid,
          name: body.chatName || match.name || null,
          profile_picture_url: photo,
          updated_at: new Date().toISOString(),
        }, { onConflict: "phone" });
        console.log(`[Webhook] LID ${lid} → resolved via API to ${resolved}`);
        return resolved;
      }
    } else {
      await chatsRes.text(); // consume body
    }
  } catch (err: any) {
    console.error(`[Webhook] LID resolve error: ${err.message}`);
  }

  // Strategy 4: Try Z-API contact endpoint directly by LID
  try {
    const zapiInstanceId = Deno.env.get("ZAPI_INSTANCE_ID") || "";
    const zapiToken = Deno.env.get("ZAPI_TOKEN") || "";
    const zapiClientToken = Deno.env.get("ZAPI_CLIENT_TOKEN") || "";
    const contactUrl = `https://api.z-api.io/instances/${zapiInstanceId}/token/${zapiToken}/contacts/${lid}`;
    const contactRes = await fetch(contactUrl, {
      headers: { "Client-Token": zapiClientToken },
    });
    if (contactRes.ok) {
      const contactData = await contactRes.json();
      if (contactData?.phone) {
        const resolved = normalizePhone(String(contactData.phone));
        await supabase.from("zapi_contacts").upsert({
          phone: resolved, lid,
          name: contactData.name || body.chatName || null,
          updated_at: new Date().toISOString(),
        }, { onConflict: "phone" });
        console.log(`[Webhook] LID ${lid} → resolved via contacts API to ${resolved}`);
        return resolved;
      }
    } else {
      await contactRes.text();
    }
  } catch (err: any) {
    console.error(`[Webhook] LID contacts API error: ${err.message}`);
  }

  return null;
}

// ─── Helper: process status update ───
async function processStatusUpdate(supabase: any, body: any) {
  const statusIds: string[] = body.ids || (body.messageId ? [body.messageId] : []);
  const statusMap: Record<string, string> = {
    'SENT': 'SENT', 'RECEIVED': 'RECEIVED', 'DELIVERY_ACK': 'DELIVERED',
    'READ': 'READ', 'PLAYED': 'READ', 'READ_BY_ME': 'READ_BY_ME',
  };
  const newStatus = statusMap[body.status] || body.status;
  if (newStatus === 'READ_BY_ME') return;

  for (const sid of statusIds) {
    await supabase.from("zapi_messages").update({ status: newStatus }).eq("message_id", sid);
    // Also update conversation_messages
    await supabase.from("conversation_messages").update({ status: newStatus.toLowerCase() }).eq("external_message_id", sid);
  }
}

// ─── Helper: upsert conversation ───
async function upsertConversation(
  supabase: any, cleanPhone: string, contactName: string,
  preview: string, timestampIso: string, fromMe: boolean
): Promise<string | null> {
  const convExternalId = `wa_${cleanPhone}`;

  const { data: existingConv } = await supabase
    .from("conversations")
    .select("id, unread_count, contact_name, excluded_at")
    .or(`phone.eq.${cleanPhone},external_conversation_id.eq.${convExternalId}`)
    .limit(1)
    .maybeSingle();

  if (existingConv) {
    // Soft-delete handling:
    // - If conversation is excluded and the message is from the agency (fromMe),
    //   ignore silently to avoid resurrecting closed contacts on outbound noise.
    // - If excluded and the contact sends a new message (!fromMe), auto-reopen
    //   by clearing excluded_at/excluded_reason BEFORE the upsert.
    if (existingConv.excluded_at) {
      if (fromMe) {
        console.log("[Webhook] Skipping fromMe upsert for excluded conversation:", existingConv.id);
        return existingConv.id;
      }
      console.log("[Webhook] Auto-reopening excluded conversation:", existingConv.id);
      await supabase.from("conversations").update({
        excluded_at: null,
        excluded_reason: null,
      }).eq("id", existingConv.id);
    }

    const updateData: Record<string, unknown> = {
      last_message_at: timestampIso,
      last_message_preview: preview,
      updated_at: timestampIso,
    };
    if (!fromMe) {
      // Update contact name if it looks like a phone number or generic
      const existing = (existingConv.contact_name || "").trim();
      const looksLikePhone = /^\+?\d[\d\s\-()]{6,}$/.test(existing);
      const isGeneric = isAgencyOrGenericName(existing);
      if (looksLikePhone || isGeneric) {
        updateData.contact_name = contactName;
      }
      updateData.unread_count = (existingConv.unread_count || 0) + 1;
    }
    await supabase.from("conversations").update(updateData).eq("id", existingConv.id);
    return existingConv.id;
  }

  // Create new conversation
  const { data: newConv, error: convError } = await supabase
    .from("conversations")
    .insert({
      phone: cleanPhone,
      contact_name: contactName,
      source: "whatsapp_api",
      stage: "novo_lead",
      tags: [],
      last_message_at: timestampIso,
      last_message_preview: preview,
      unread_count: fromMe ? 0 : 1,
      is_vip: false,
      external_conversation_id: convExternalId,
    })
    .select("id")
    .single();

  if (convError) {
    console.error("[Webhook] Conv create error:", convError.message);
    // Race condition fallback
    const { data: fallback } = await supabase
      .from("conversations")
      .select("id")
      .eq("external_conversation_id", convExternalId)
      .maybeSingle();
    return fallback?.id || null;
  }
  console.log("[Webhook] New conversation:", newConv.id);
  return newConv.id;
}

// ─── Helper: check flow router ───
async function checkFlowRouter(
  supabase: any, textContent: string, cleanPhone: string, fromMe: boolean
): Promise<{ excluded: boolean; farewellEcho: boolean; matchedFlowId: string | null; excludeMsg: string | null }> {
  const { data: allRules } = await supabase
    .from("flow_router_rules")
    .select("id, flow_id, keywords, priority, exclude_keyword, exclude_message, is_active")
    .eq("is_active", true)
    .order("priority", { ascending: true });

  const rules = allRules || [];

  // Farewell echo check
  if (fromMe) {
    const isFarewellEcho = rules.some(
      (r: any) => r.exclude_message && textContent.trim().toLowerCase() === r.exclude_message.trim().toLowerCase()
    );
    if (isFarewellEcho) return { excluded: false, farewellEcho: true, matchedFlowId: null, excludeMsg: null };
  }

  // Exclude check
  const matchedExclude = rules.find(
    (r: any) => r.exclude_keyword && textContent.trim().toLowerCase() === r.exclude_keyword.trim().toLowerCase()
  );
  if (matchedExclude) {
    return { excluded: true, farewellEcho: false, matchedFlowId: null, excludeMsg: (matchedExclude as any).exclude_message || null };
  }

  // Flow match (inbound only)
  if (!fromMe) {
    const matchedRule = rules.find((rule: any) =>
      (rule.keywords || []).some((kw: string) => textContent.toLowerCase().includes(kw.toLowerCase()))
    );
    if (matchedRule) {
      console.log(`[Webhook] Router matched → flow ${matchedRule.flow_id}`);
      return { excluded: false, farewellEcho: false, matchedFlowId: matchedRule.flow_id, excludeMsg: null };
    }
  }

  return { excluded: false, farewellEcho: false, matchedFlowId: null, excludeMsg: null };
}

// ─── Helper: handle exclude ───
async function handleExclude(supabase: any, cleanPhone: string, excludeMsg: string | null) {
  const convExternalId = `wa_${cleanPhone}`;

  // Send farewell message
  if (excludeMsg) {
    try {
      const zapiInstanceId = Deno.env.get("ZAPI_INSTANCE_ID") || "";
      const zapiToken = Deno.env.get("ZAPI_TOKEN") || "";
      const zapiClientToken = Deno.env.get("ZAPI_CLIENT_TOKEN") || "";
      const sendUrl = `https://api.z-api.io/instances/${zapiInstanceId}/token/${zapiToken}/send-text`;
      await fetch(sendUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Client-Token": zapiClientToken },
        body: JSON.stringify({ phone: cleanPhone, message: excludeMsg }),
      });
    } catch (e: any) {
      console.error("[Webhook] Exclude msg send failed:", e.message);
    }
  }

  const { data: conv } = await supabase
    .from("conversations")
    .select("id")
    .or(`phone.eq.${cleanPhone},external_conversation_id.eq.${convExternalId}`)
    .maybeSingle();

  if (conv?.id) {
    // Soft-delete: mark as excluded instead of removing rows.
    // History is preserved so it can be reactivated later from the admin panel.
    await supabase.from("conversations").update({
      excluded_at: new Date().toISOString(),
      excluded_reason: excludeMsg || "excluded_by_router",
      last_message_preview: "__CONTACT_EXCLUDED__",
      unread_count: 0,
    }).eq("id", conv.id);
  }
  // NOTE: zapi_messages / zapi_contacts / messages / conversation_messages are
  // intentionally preserved so the conversation can be fully restored.
}

// ═══════════════════════════════════════════════════════════════
// ═══ MAIN HANDLER ═════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════

// ─── Constant-time string comparison ───
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still iterate to avoid length-based timing leak
    let dummy = 0;
    for (let i = 0; i < a.length; i++) dummy |= a.charCodeAt(i);
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const supabase = createClient(supabaseUrl, supabaseKey);

  // ═══════════════════════════════════════════════════════════
  // AUTH: Validate token via query string (?token=...)
  // ═══════════════════════════════════════════════════════════
  const sharedSecret = Deno.env.get("WEBHOOK_SHARED_SECRET") || "";
  const url = new URL(req.url);
  const queryToken = url.searchParams.get("token") || "";
  const allowUnauth = Deno.env.get("WEBHOOK_ALLOW_UNAUTH") === "true";

  if (sharedSecret && !allowUnauth) {
    const isValid = queryToken.length > 0 && timingSafeEqual(queryToken, sharedSecret);
    if (!isValid) {
      // Log failed attempt
      try {
        const sourceIp = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";
        await supabase.from("webhook_audit_log").insert({
          source_ip: sourceIp,
          header_present: queryToken.length > 0,
          success: false,
        });
      } catch { /* best effort */ }
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  let rawEventId: string | null = null;

  try {
    const body = await req.json();
    const rawPhone = body.phone || "";
    const messageId = body.messageId || null;
    const eventType = classifyEvent(body);

    // ═══════════════════════════════════════════════════════════
    // FAST-PATH: PresenceChatCallback (cliente digitando/gravando)
    // Alta frequência · não salvamos em whatsapp_events_raw pra
    // não inflar a tabela. Só upsert em chat_presence + retorna.
    // ═══════════════════════════════════════════════════════════
    if (body?.type === "PresenceChatCallback" && body?.phone) {
      const cleanPhone = String(body.phone).replace(/\D/g, "");
      const status = String(body.status || "available");
      try {
        await supabase.from("chat_presence").upsert({
          phone: cleanPhone,
          status,
          updated_at: new Date().toISOString(),
        }, { onConflict: "phone" });
      } catch (e: any) {
        console.warn("[Webhook] presence upsert failed:", e?.message);
      }
      return new Response(JSON.stringify({ success: true, type: "presence" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 0: SAVE RAW EVENT IMMEDIATELY — ZERO loss guarantee
    // ═══════════════════════════════════════════════════════════
    const { data: rawEvent, error: rawErr } = await supabase
      .from("whatsapp_events_raw")
      .insert({
        event_type: eventType,
        external_message_id: messageId,
        phone: rawPhone,
        from_me: body.fromMe || false,
        payload: body,
        processed: false,
      })
      .select("id")
      .single();

    if (rawErr) {
      console.error("[Webhook] RAW save failed:", rawErr.message);
      // Even if raw save fails, continue processing — better to try than lose everything
    } else {
      rawEventId = rawEvent.id;
    }

    console.log(`[Webhook] ${eventType} | phone=${rawPhone} | msgId=${messageId} | rawId=${rawEventId}`);

    // ═══════════════════════════════════════════════════════════
    // STEP 1: Quick exits for non-message events
    // ═══════════════════════════════════════════════════════════

    // Skip Status/Story events
    if (eventType === "status_story" || eventType === "status_broadcast") {
      if (rawEventId) await supabase.from("whatsapp_events_raw").update({ processed: true, processed_at: new Date().toISOString() }).eq("id", rawEventId);
      return new Response(JSON.stringify({ success: true, type: "status_ignored" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle status updates (delivery receipts)
    if (eventType === "status") {
      await processStatusUpdate(supabase, body);
      if (rawEventId) await supabase.from("whatsapp_events_raw").update({ processed: true, processed_at: new Date().toISOString() }).eq("id", rawEventId);
      return new Response(JSON.stringify({ success: true, type: "status_update" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 2: Extract message data
    // ═══════════════════════════════════════════════════════════
    const fromMe = body.fromMe || false;
    const textContent = extractTextContent(body);
    const msgType = extractMsgType(body);
    // chatName é SEMPRE o nome do contato/cliente. senderName depende de fromMe
    // (quando a agência envia, senderName = nome da agência). Pegamos chatName
    // primeiro pra não contaminar contatos com "NatLeva Viagens".
    const contactName = fromMe
      ? (body.chatName || rawPhone || "Desconhecido")
      : (body.chatName || body.senderName || rawPhone || "Desconhecido");

    const momentRaw = Number(body.momment);
    const eventTsMs = Number.isFinite(momentRaw)
      ? (momentRaw > 1_000_000_000_000 ? momentRaw : momentRaw * 1000)
      : Date.now();
    const timestampIso = new Date(eventTsMs).toISOString();
    const timestampEpoch = Math.floor(eventTsMs / 1000);

    // ═══════════════════════════════════════════════════════════
    // STEP 3: Resolve phone (handle LID format)
    // ═══════════════════════════════════════════════════════════
    const isLidPhone = rawPhone.includes("@lid");
    const chatLid = body.chatLid || null;
    let phone: string | null = isLidPhone ? null : rawPhone;

    if (isLidPhone && fromMe) {
      phone = await resolveLidPhone(supabase, rawPhone, body);
      if (!phone) {
        console.log(`[Webhook] LID unresolved for fromMe, skipping`);
        if (rawEventId) await supabase.from("whatsapp_events_raw").update({ processed: true, processed_at: new Date().toISOString(), error: "LID unresolved" }).eq("id", rawEventId);
        return new Response(JSON.stringify({ success: true, type: "lid_unresolved" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Sanitiza contactName depois que o phone real foi resolvido
    // (impede que LID puro vire o nome de exibição da conversa)
    const safeContactName = sanitizeContactName(contactName, phone) || contactName;

    // Store LID↔phone mapping for inbound messages
    if (!fromMe && phone && chatLid) {
      const lid = chatLid.replace("@lid", "");
      await supabase.from("zapi_contacts").upsert({
        phone: normalizePhone(phone),
        lid,
        name: sanitizeContactName(body.chatName || body.senderName, phone),
        profile_picture_url: body.senderPhoto || body.photo || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "phone" });
    }

    // Skip if no phone or no content
    if (!phone || (!textContent && !body.image && !body.audio && !body.video && !body.document)) {
      if (rawEventId) await supabase.from("whatsapp_events_raw").update({ processed: true, processed_at: new Date().toISOString(), error: "no_phone_or_content" }).eq("id", rawEventId);
      // Still save contact info
      if (phone && (body.senderName || body.chatName)) {
        await saveContact(supabase, phone, body, chatLid);
      }
      return new Response(JSON.stringify({ success: true, type: "no_content" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleanPhone = normalizePhone(phone);

    // ═══════════════════════════════════════════════════════════
    // STEP 4: Flow router (keywords + exclude)
    // ═══════════════════════════════════════════════════════════
    let matchedFlowId: string | null = null;

    if (textContent) {
      const routerResult = await checkFlowRouter(supabase, textContent, cleanPhone, fromMe);

      if (routerResult.farewellEcho) {
        if (rawEventId) await supabase.from("whatsapp_events_raw").update({ processed: true, processed_at: new Date().toISOString() }).eq("id", rawEventId);
        return new Response(JSON.stringify({ success: true, type: "farewell_echo_skipped" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (routerResult.excluded) {
        await handleExclude(supabase, cleanPhone, routerResult.excludeMsg);
        if (rawEventId) await supabase.from("whatsapp_events_raw").update({ processed: true, processed_at: new Date().toISOString() }).eq("id", rawEventId);
        return new Response(JSON.stringify({ success: true, type: "contact_excluded" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      matchedFlowId = routerResult.matchedFlowId;
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 5: Save raw backup to zapi_messages
    // ═══════════════════════════════════════════════════════════
    const rawMsgStatus = body.status || (fromMe ? "SENT" : "RECEIVED");
    await supabase.from("zapi_messages").insert({
      phone,
      message_id: messageId,
      from_me: fromMe,
      text: textContent || null,
      type: msgType,
      sender_name: fromMe ? (body.senderName || "Atendente") : safeContactName,
      sender_photo: body.senderPhoto || null,
      status: rawMsgStatus,
      timestamp: timestampEpoch,
      raw_data: body,
    });

    // ═══════════════════════════════════════════════════════════
    // STEP 6: Upsert conversation
    // ═══════════════════════════════════════════════════════════
    const preview = textContent || (msgType !== "text" ? `📎 ${msgType}` : "");
    const conversationId = await upsertConversation(supabase, cleanPhone, safeContactName, preview, timestampIso, fromMe);

    if (!conversationId) {
      if (rawEventId) await supabase.from("whatsapp_events_raw").update({ processed: true, processed_at: new Date().toISOString(), error: "no_conversation" }).eq("id", rawEventId);
      return new Response(JSON.stringify({ success: true, warning: "no_conversation" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 7: Insert message with IDEMPOTENCY
    // ═══════════════════════════════════════════════════════════
    const mediaUrl = extractMediaUrl(body);
    const direction = fromMe ? "outgoing" : "incoming";
    const senderType = fromMe ? "atendente" : "cliente";
    const msgStatusFinal = fromMe ? "sent" : "delivered";

    // PRIMARY: conversation_messages (with idempotency via unique external_message_id)
    const audioMeta: Record<string, any> = {};
    if (body.audio) {
      audioMeta.audio_duration_sec = body.audio.seconds || null;
      audioMeta.is_voice_note = body.audio.ptt ?? null;
      audioMeta.media_mimetype = body.audio.mimeType || null;
    } else if (body.image) {
      audioMeta.media_mimetype = body.image.mimeType || null;
    } else if (body.video) {
      audioMeta.media_mimetype = body.video.mimeType || null;
    } else if (body.document) {
      audioMeta.media_mimetype = body.document.mimeType || null;
    }

    const { error: unifiedErr } = await supabase.from("conversation_messages").insert({
      conversation_id: conversationId,
      external_message_id: messageId,
      direction,
      sender_type: senderType,
      content: textContent || "",
      message_type: msgType,
      media_url: mediaUrl,
      media_original_url: mediaUrl,
      media_status: mediaUrl ? "pending" : null,
      status: msgStatusFinal,
      timestamp: timestampIso,
      created_at: timestampIso,
      ...audioMeta,
    });

    if (unifiedErr) {
      if (unifiedErr.message?.includes("duplicate") || unifiedErr.code === "23505") {
        console.log(`[Webhook] ⚡ Duplicate ignored: ${messageId}`);
      } else {
        console.warn("[Webhook] conversation_messages insert failed:", unifiedErr.message);
      }
    } else {
      console.log("[Webhook] ✓ Message saved to conversation_messages");

      // Async: trigger media download if there's a media URL
      if (mediaUrl && messageId) {
        try {
          const fnUrl = `${supabaseUrl}/functions/v1/media-downloader`;
          fetch(fnUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({
              messageId,
              sourceUrl: mediaUrl,
              mediaType: msgType,
              mimeType: audioMeta.media_mimetype || null,
            }),
          }).catch(e => console.warn("[Webhook] media-downloader fire-and-forget failed:", e?.message));
        } catch { /* non-blocking */ }
      }
    }

    // FALLBACK: legacy messages table
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_type: senderType,
      message_type: msgType,
      text: textContent || null,
      media_url: mediaUrl,
      status: msgStatusFinal,
      external_message_id: messageId,
      created_at: timestampIso,
    });

    // ═══════════════════════════════════════════════════════════
    // STEP 8: Mark raw event as processed
    // ═══════════════════════════════════════════════════════════
    if (rawEventId) {
      await supabase.from("whatsapp_events_raw").update({
        processed: true,
        processed_at: new Date().toISOString(),
        conversation_id: conversationId,
      }).eq("id", rawEventId);
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 9: Execute matched flow (fire-and-forget)
    // ═══════════════════════════════════════════════════════════
    let flowToExecute = matchedFlowId;

    if (!flowToExecute && !fromMe) {
      const { data: activeSession } = await supabase
        .from("flow_execution_logs")
        .select("flow_id")
        .eq("conversation_id", conversationId)
        .in("status", ["running", "completed"])
        .order("started_at", { ascending: false })
        .limit(1);
      if (activeSession && activeSession.length > 0) {
        flowToExecute = activeSession[0].flow_id;
      }
    }

    if (flowToExecute && !fromMe) {
      fetch(`${supabaseUrl}/functions/v1/execute-flow`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          conversation_id: conversationId,
          flow_id: flowToExecute,
          trigger_type: "new_message",
          trigger_data: { message_text: textContent, message_type: msgType },
        }),
      }).then(async (res) => {
        try { await res.json(); } catch { await res.text(); }
      }).catch(() => {});
    }

    // Save/update contact
    await saveContact(supabase, phone, body, chatLid);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[Webhook] CRITICAL ERROR:", error.message);
    // Try to mark raw event with error
    if (rawEventId) {
      try {
        await supabase.from("whatsapp_events_raw").update({
          processed: true,
          processed_at: new Date().toISOString(),
          error: error.message,
        }).eq("id", rawEventId);
      } catch { /* ignore */ }
    }
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ─── Helper: save contact info ───
async function saveContact(supabase: any, phone: string, body: any, chatLid: string | null) {
  if (!phone || !body.chatName) return;
  const contactPhone = normalizePhone(phone);
  // Only persist senderPhoto when inbound (fromMe = our agency, photo would be ours)
  const incomingPhoto = !body.fromMe ? (body.senderPhoto || body.photo || null) : null;
  const upsertData: Record<string, unknown> = {
    phone: contactPhone,
    name: body.chatName || null,
    updated_at: new Date().toISOString(),
  };
  if (incomingPhoto) upsertData.profile_picture_url = incomingPhoto;
  if (chatLid) {
    upsertData.lid = chatLid.replace("@lid", "");
  }
  await supabase.from("zapi_contacts").upsert(upsertData, { onConflict: "phone" });

  // Also cache on conversation row for instant frontend display
  if (incomingPhoto) {
    await supabase.from("conversations").update({
      profile_picture_url: incomingPhoto,
      profile_picture_fetched_at: new Date().toISOString(),
    }).eq("phone", contactPhone).is("profile_picture_url", null);
  }
}
