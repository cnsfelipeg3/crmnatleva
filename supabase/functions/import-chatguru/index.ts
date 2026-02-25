import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface IncomingMessage {
  created: string;
  chat_id: string;
  chat_name: string;
  phone: string;
  numero_lead: string;
  responsavel: string;
  sender_name: string;
  texto_mensagem: string;
  from_device: number;
  type: string;
  message_status: string;
  deleted: number;
  edits: number;
  is_template: number;
}

interface IncomingBatch {
  messages: IncomingMessage[];
  createContacts: boolean;
}

function normalizePhone(raw: string): string | null {
  if (!raw) return null;
  // Remove everything except digits and +
  let p = raw.replace(/[^\d+]/g, "");
  if (!p || p === "0" || p.length < 8) return null;
  return p;
}

function hashMessage(m: IncomingMessage): string {
  // Create a deterministic hash from key fields
  const raw = `${m.chat_id}|${m.created}|${(m.texto_mensagem || "").substring(0, 200)}|${m.type}|${m.from_device}`;
  // Simple string hash
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const chr = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return `cg_${Math.abs(hash).toString(36)}_${m.created.replace(/\D/g, "").substring(0, 14)}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { messages, createContacts = false }: IncomingBatch = await req.json();

    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ error: "No messages provided" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Group messages by chat_id
    const chatGroups = new Map<string, IncomingMessage[]>();
    for (const msg of messages) {
      if (!msg.chat_id) continue;
      if (!chatGroups.has(msg.chat_id)) chatGroups.set(msg.chat_id, []);
      chatGroups.get(msg.chat_id)!.push(msg);
    }

    let conversationsCreated = 0;
    let conversationsUpdated = 0;
    let messagesImported = 0;
    let messagesDeduplicated = 0;
    let contactsCreated = 0;
    let errors = 0;

    for (const [chatId, chatMessages] of chatGroups) {
      try {
        // Sort messages chronologically
        chatMessages.sort((a, b) => new Date(a.created).getTime() - new Date(b.created).getTime());

        const firstMsg = chatMessages[0];
        const lastMsg = chatMessages[chatMessages.length - 1];
        const phone = normalizePhone(firstMsg.phone);
        const displayName = firstMsg.chat_name || phone || "Desconhecido";

        // Find or create conversation by external_id (chat_id)
        const { data: existingConv } = await supabase
          .from("conversations")
          .select("id")
          .eq("external_id", chatId)
          .maybeSingle();

        let conversationId: string;

        if (existingConv) {
          conversationId = existingConv.id;
          // Update last message info
          const lastText = lastMsg.texto_mensagem || `[MÍDIA: ${lastMsg.type}]`;
          await supabase
            .from("conversations")
            .update({
              last_message_at: lastMsg.created,
              last_message_preview: lastText.substring(0, 200),
              display_name: displayName,
              phone: phone,
            })
            .eq("id", conversationId);
          conversationsUpdated++;
        } else {
          const lastText = lastMsg.texto_mensagem || `[MÍDIA: ${lastMsg.type}]`;

          // Try to find existing client by phone
          let clientId: string | null = null;
          if (phone) {
            const { data: existingClient } = await supabase
              .from("clients")
              .select("id")
              .ilike("phone", `%${phone.slice(-8)}%`)
              .limit(1)
              .maybeSingle();

            if (existingClient) {
              clientId = existingClient.id;
            } else if (createContacts) {
              // Create client
              const { data: newClient } = await supabase
                .from("clients")
                .insert({
                  display_name: displayName,
                  phone: phone,
                  tags: ["chatguru", "importado"],
                })
                .select("id")
                .single();
              if (newClient) {
                clientId = newClient.id;
                contactsCreated++;
              }
            }
          }

          const { data: newConv, error: convErr } = await supabase
            .from("conversations")
            .insert({
              external_id: chatId,
              phone: phone,
              display_name: displayName,
              source: "chatguru",
              status: "fechado",
              tags: ["chatguru", "importado"],
              last_message_at: lastMsg.created,
              last_message_preview: lastText.substring(0, 200),
              client_id: clientId,
            })
            .select("id")
            .single();

          if (convErr) {
            // Might be unique constraint violation (parallel import)
            const { data: retryConv } = await supabase
              .from("conversations")
              .select("id")
              .eq("external_id", chatId)
              .single();
            if (retryConv) {
              conversationId = retryConv.id;
              conversationsUpdated++;
            } else {
              errors++;
              continue;
            }
          } else {
            conversationId = newConv.id;
            conversationsCreated++;
          }
        }

        // Get existing message hashes for this conversation
        const { data: existingMsgs } = await supabase
          .from("chat_messages")
          .select("external_message_id")
          .eq("conversation_id", conversationId)
          .not("external_message_id", "is", null);

        const existingHashes = new Set(
          (existingMsgs || []).map((m) => m.external_message_id)
        );

        // Build messages to insert (deduped)
        const toInsert: any[] = [];
        for (const msg of chatMessages) {
          const hash = hashMessage(msg);
          if (existingHashes.has(hash)) {
            messagesDeduplicated++;
            continue;
          }
          existingHashes.add(hash); // prevent dupes within same batch

          const isAgent =
            msg.from_device === 1 ||
            (msg.responsavel && msg.responsavel.trim().length > 0);

          let content = msg.texto_mensagem || null;
          if (!content && msg.type !== "chat") {
            content = `[MÍDIA: ${msg.type}]`;
          }

          toInsert.push({
            conversation_id: conversationId,
            external_message_id: hash,
            content: content,
            sender_type: isAgent ? "atendente" : "cliente",
            message_type: msg.type === "chat" ? "text" : msg.type,
            read_status: msg.message_status || "processed",
            created_at: msg.created,
            metadata: {
              responsavel: msg.responsavel || null,
              sender_name: msg.sender_name || null,
              deleted: msg.deleted,
              edits: msg.edits,
              is_template: msg.is_template,
              original_status: msg.message_status,
              source: "chatguru",
            },
          });
        }

        // Insert in sub-batches of 200
        const SUB_BATCH = 200;
        for (let i = 0; i < toInsert.length; i += SUB_BATCH) {
          const batch = toInsert.slice(i, i + SUB_BATCH);
          const { error: insertErr } = await supabase
            .from("chat_messages")
            .insert(batch);

          if (insertErr) {
            console.error("Insert error:", insertErr.message);
            errors++;
          } else {
            messagesImported += batch.length;
          }
        }
      } catch (chatErr) {
        console.error(`Error processing chat ${chatId}:`, chatErr);
        errors++;
      }
    }

    return new Response(
      JSON.stringify({
        conversationsCreated,
        conversationsUpdated,
        messagesImported,
        messagesDeduplicated,
        contactsCreated,
        errors,
        chatsProcessed: chatGroups.size,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Fatal error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
