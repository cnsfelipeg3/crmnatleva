import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("[Z-API Webhook] Evento recebido:", JSON.stringify(body).substring(0, 500));

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    const rawPhone = body.phone || "";
    const fromMe = body.fromMe || false;
    const textContent = body.text?.message || (typeof body.text === "string" ? body.text : "") || body.caption || "";
    const msgType = body.image ? "image" : body.audio ? "audio" : body.video ? "video" : body.document ? "document" : "text";
    const contactName = body.senderName || body.chatName || rawPhone || "Desconhecido";

    const momentRaw = Number(body.momment);
    const eventTsMs = Number.isFinite(momentRaw)
      ? (momentRaw > 1_000_000_000_000 ? momentRaw : momentRaw * 1000)
      : Date.now();
    const timestampIso = new Date(eventTsMs).toISOString();
    const timestampEpoch = Math.floor(eventTsMs / 1000);

    const messageId = body.messageId || null;
    const msgStatus = body.status || (fromMe ? "SENT" : "RECEIVED");

    // Resolve phone: handle LID-format phones
    const isLidPhone = rawPhone.includes("@lid");
    const chatLid = body.chatLid || null;
    let phone: string | null = isLidPhone ? null : rawPhone;

    if (isLidPhone && fromMe) {
      const lid = rawPhone.replace("@lid", "");
      const { data: contact } = await supabase
        .from("zapi_contacts")
        .select("phone")
        .eq("lid", lid)
        .maybeSingle();
      if (contact?.phone) {
        phone = contact.phone;
        console.log(`[Z-API Webhook] LID ${lid} resolved to phone ${phone}`);
      } else {
        // Try to resolve LID via Z-API get-chats
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
              const resolvedPhone = String(match.phone).replace(/\D/g, "");
              phone = resolvedPhone;
              // Save the mapping for future use
              await supabase.from("zapi_contacts").upsert({
                phone: resolvedPhone,
                lid,
                name: body.chatName || match.name || null,
                profile_pic: body.senderPhoto || null,
                updated_at: new Date().toISOString(),
              }, { onConflict: "phone" });
              console.log(`[Z-API Webhook] LID ${lid} resolved via get-chats to phone ${resolvedPhone}`);
            } else {
              console.log(`[Z-API Webhook] LID ${lid} not found in get-chats either, skipping fromMe message`);
            }
          }
        } catch (resolveErr: any) {
          console.error(`[Z-API Webhook] Error resolving LID ${lid}:`, resolveErr.message);
        }
      }
    }

    // Store LID↔phone mapping for inbound messages
    if (!fromMe && phone && chatLid) {
      const lid = chatLid.replace("@lid", "");
      await supabase.from("zapi_contacts").upsert({
        phone: phone.replace(/\D/g, ""),
        lid,
        name: body.senderName || body.chatName || null,
        profile_pic: body.senderPhoto || body.photo || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "phone" });
    }

    // Handle status update events (delivery receipts)
    const statusIds: string[] = body.ids || (messageId ? [messageId] : []);
    const isStatusCallback = body.type === "MessageStatusCallback" || 
      (body.status && statusIds.length > 0 && !textContent && !body.image && !body.audio && !body.video && !body.document);
    
    if (isStatusCallback && statusIds.length > 0) {
      const statusMap: Record<string, string> = {
        'SENT': 'SENT', 'RECEIVED': 'RECEIVED', 'DELIVERY_ACK': 'DELIVERED',
        'READ': 'READ', 'PLAYED': 'READ', 'READ_BY_ME': 'READ_BY_ME',
      };
      const newStatus = statusMap[body.status] || body.status;
      if (newStatus !== 'READ_BY_ME') {
        for (const sid of statusIds) {
          await supabase.from("zapi_messages").update({ status: newStatus }).eq("message_id", sid);
        }
      }
      return new Response(JSON.stringify({ success: true, type: "status_update" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── FILTER: Skip WhatsApp Status/Story events ──
    const isStatusBroadcast = rawPhone === "status@broadcast" || rawPhone.includes("status@broadcast");
    const isStatusReply = body.isStatusReply === true;
    if (isStatusBroadcast || isStatusReply) {
      console.log(`[Z-API Webhook] Ignorando evento de Status/Story: isStatusReply=${isStatusReply}, phone=${rawPhone}`);
      return new Response(JSON.stringify({ success: true, type: "status_ignored" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only process if there's a resolved phone and some content
    if (phone && (textContent || body.image || body.audio || body.video || body.document)) {
      const cleanPhone = phone.replace(/\D/g, "");
      const convExternalId = `wa_${cleanPhone}`;

      // ── 1. FIRST CHECK: Flow Router (keywords + exclude) ──
      // This runs BEFORE saving the message, so excluded contacts are cleaned before anything else
      // EXCLUDE check runs for ALL messages (fromMe or not) so operators can send #excluir
      // FLOW ROUTER only runs for inbound (!fromMe) messages
      if (textContent) {
        // Check exclude keywords
        const { data: allRules } = await supabase
          .from("flow_router_rules")
          .select("id, flow_id, keywords, priority, exclude_keyword, exclude_message, is_active")
          .eq("is_active", true)
          .order("priority", { ascending: true });

        const rules = allRules || [];

        // ── EXCLUDE CHECK ──
        const matchedExclude = rules.find(
          (r: any) => r.exclude_keyword && textContent.trim().toLowerCase() === r.exclude_keyword.trim().toLowerCase()
        );

        // ── SKIP farewell message echoes (fromMe messages matching an exclude_message) ──
        if (fromMe) {
          const isFarewellEcho = rules.some(
            (r: any) => r.exclude_message && textContent.trim().toLowerCase() === r.exclude_message.trim().toLowerCase()
          );
          if (isFarewellEcho) {
            console.log(`[Z-API Webhook] Skipping farewell echo message: "${textContent}" for ${cleanPhone}`);
            return new Response(JSON.stringify({ success: true, type: "farewell_echo_skipped" }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }

        if (matchedExclude) {
          console.log(`[Z-API Webhook] Exclude keyword "${textContent}" matched — removing contact ${cleanPhone}`);

          // Send farewell message before deleting
          const excludeMsg = (matchedExclude as any).exclude_message;
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
              console.log(`[Z-API Webhook] Sent exclude message to ${cleanPhone}`);
            } catch (sendErr: any) {
              console.error("[Z-API Webhook] Failed to send exclude message:", sendErr.message);
            }
          }

          // Find conversation
          const { data: conv } = await supabase
            .from("conversations")
            .select("id")
            .or(`phone.eq.${cleanPhone},external_conversation_id.eq.${convExternalId}`)
            .maybeSingle();

          if (conv?.id) {
            // Signal frontend BEFORE deleting: update with a marker so Realtime UPDATE fires
            await supabase.from("conversations").update({
              last_message_preview: "__CONTACT_EXCLUDED__",
              unread_count: -1,
            }).eq("id", conv.id);

            // Small delay to let Realtime propagate the UPDATE
            await new Promise(r => setTimeout(r, 300));

            // Now delete everything
            await supabase.from("messages").delete().eq("conversation_id", conv.id);
            await supabase.from("conversations").delete().eq("id", conv.id);
            console.log(`[Z-API Webhook] Deleted conversation ${conv.id}`);
          }

          await supabase.from("zapi_messages").delete().eq("phone", cleanPhone);
          await supabase.from("zapi_contacts").delete().eq("phone", cleanPhone);

          return new Response(JSON.stringify({ success: true, type: "contact_excluded" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // ── FLOW ROUTER CHECK (only for inbound messages) ──
        if (!fromMe) {
          const matchedRule = rules.find((rule: any) =>
            (rule.keywords || []).some((kw: string) => textContent.toLowerCase().includes(kw.toLowerCase()))
          );

          if (matchedRule) {
            console.log(`[Z-API Webhook] Router matched rule → flow ${matchedRule.flow_id}`);
          }

          // Store the matched flow ID so we can execute it after saving the message
          (body as any).__matched_flow_id = matchedRule?.flow_id || null;
        }
      }

      // ── 2. Save to zapi_messages (raw backup) ──
      await supabase.from("zapi_messages").insert({
        phone,
        message_id: messageId,
        from_me: fromMe,
        text: textContent || null,
        type: msgType,
        sender_name: contactName,
        sender_photo: body.senderPhoto || null,
        status: msgStatus,
        timestamp: timestampEpoch,
        raw_data: body,
      });

      // ── 3. Upsert conversation ──
      const preview = textContent || (msgType !== "text" ? `📎 ${msgType}` : "");

      const { data: existingConv } = await supabase
        .from("conversations")
        .select("id, unread_count, contact_name")
        .or(`phone.eq.${cleanPhone},external_conversation_id.eq.${convExternalId}`)
        .limit(1)
        .maybeSingle();

      let conversationId: string;

      if (existingConv) {
        conversationId = existingConv.id;
        const updateData: Record<string, unknown> = {
          last_message_at: timestampIso,
          last_message_preview: preview,
          updated_at: timestampIso,
        };
        if (!fromMe && existingConv.contact_name) {
          const existing = existingConv.contact_name.trim();
          const looksLikePhone = /^\+?\d[\d\s\-()]{6,}$/.test(existing);
          const isGeneric = existing === "Novo Contato" || existing === "Desconhecido" || existing === "";
          if (looksLikePhone || isGeneric) {
            updateData.contact_name = contactName;
          }
        } else if (!fromMe && !existingConv.contact_name) {
          updateData.contact_name = contactName;
        }
        if (!fromMe) {
          updateData.unread_count = (existingConv.unread_count || 0) + 1;
        }
        await supabase.from("conversations").update(updateData).eq("id", conversationId);
      } else {
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
          console.error("[Z-API Webhook] Error creating conversation:", convError.message);
          const { data: fallback } = await supabase
            .from("conversations")
            .select("id")
            .eq("external_conversation_id", convExternalId)
            .maybeSingle();
          if (fallback?.id) {
            conversationId = fallback.id;
          } else {
            return new Response(JSON.stringify({ success: true, warning: "no_conversation" }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        } else {
          conversationId = newConv.id;
          console.log("[Z-API Webhook] Created new conversation:", conversationId);
        }
      }

      // ── 4. Insert into messages table ──
      const mediaUrl = body.image?.imageUrl || body.image?.thumbnailUrl ||
                       body.audio?.audioUrl ||
                       body.video?.videoUrl ||
                       body.document?.documentUrl || null;

      const { error: msgError } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_type: fromMe ? "atendente" : "cliente",
        message_type: msgType,
        text: textContent || null,
        media_url: mediaUrl,
        status: fromMe ? "sent" : "delivered",
        external_message_id: messageId,
        created_at: timestampIso,
      });

      if (msgError) {
        console.error("[Z-API Webhook] Error inserting message:", msgError.message);
      }

      // ── 5. Execute matched flow OR continue active flow session (fire-and-forget) ──
      let flowToExecute = (body as any).__matched_flow_id || null;

      // If no keyword matched, check if this conversation has an active flow session
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
          console.log(`[Z-API Webhook] Continuing active flow session ${flowToExecute} for ${conversationId}`);
        }
      }

      if (flowToExecute && !fromMe) {
        console.log(`[Z-API Webhook] Executing flow ${flowToExecute} for conversation ${conversationId}`);
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
          try {
            const data = await res.json();
            console.log("[Z-API Webhook] Flow execution result:", JSON.stringify(data).substring(0, 300));
          } catch {
            console.log("[Z-API Webhook] Flow execution response status:", res.status);
          }
        }).catch((err: any) => {
          console.error("[Z-API Webhook] Flow execution fetch error:", err.message);
        });
      }
    }

    // Save/update contact
    if (phone && (body.senderName || body.chatName)) {
      const contactPhone = phone.replace(/\D/g, "");
      const upsertData: Record<string, unknown> = {
        phone: contactPhone,
        name: body.senderName || body.chatName || null,
        profile_pic: body.senderPhoto || body.photo || null,
        updated_at: new Date().toISOString(),
      };
      if (chatLid) {
        upsertData.lid = chatLid.replace("@lid", "");
      }
      await supabase.from("zapi_contacts").upsert(upsertData, { onConflict: "phone" });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[Z-API Webhook] Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
