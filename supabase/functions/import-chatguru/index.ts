import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function normalizePhone(raw: string): string | null {
  if (!raw) return null;
  let p = raw.replace(/[^\d+]/g, "");
  if (!p || p === "0" || p.length < 8) return null;
  return p;
}

function hashMessage(chatId: string, created: string, texto: string, type: string, fromDevice: number): string {
  const raw = `${chatId}|${created}|${(texto || "").substring(0, 200)}|${type}|${fromDevice}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const chr = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return `cg_${Math.abs(hash).toString(36)}_${created.replace(/\D/g, "").substring(0, 14)}`;
}

interface ImportJob {
  id: string;
  status: string;
  total_rows: number;
  processed_rows: number;
  progress: number;
  conversations_created: number;
  conversations_updated: number;
  messages_created: number;
  messages_deduplicated: number;
  contacts_created: number;
  errors: number;
  error_message: string | null;
  create_contacts: boolean;
  storage_path: string;
  checkpoint_data: any;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const body = await req.json();
    const action = body.action || "legacy";

    // ─── STATUS ───
    if (action === "status") {
      const { data } = await supabase.from("import_jobs").select("*").eq("id", body.job_id).single();
      return new Response(JSON.stringify(data || { error: "Job not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── RESET ───
    if (action === "reset") {
      // Delete all chatguru-imported messages and conversations
      const { data: convs } = await supabase
        .from("conversations")
        .select("id")
        .eq("source", "chatguru");

      const convIds = (convs || []).map((c: any) => c.id);
      let msgsDeleted = 0;
      let convsDeleted = 0;

      if (convIds.length > 0) {
        // Delete messages in batches
        for (let i = 0; i < convIds.length; i += 50) {
          const batch = convIds.slice(i, i + 50);
          const { count } = await supabase
            .from("chat_messages")
            .delete({ count: "exact" })
            .in("conversation_id", batch);
          msgsDeleted += count || 0;
        }
        // Delete conversations
        const { count } = await supabase
          .from("conversations")
          .delete({ count: "exact" })
          .eq("source", "chatguru");
        convsDeleted = count || 0;
      }

      // Reset import jobs
      await supabase.from("import_jobs").delete().neq("id", "00000000-0000-0000-0000-000000000000");

      return new Response(JSON.stringify({ 
        success: true, 
        conversations_deleted: convsDeleted, 
        messages_deleted: msgsDeleted 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── CREATE JOB ───
    if (action === "create_job") {
      const { storage_path, total_rows, create_contacts, file_names } = body;
      const { data: job, error: jobErr } = await supabase
        .from("import_jobs")
        .insert({
          status: "queued",
          total_rows,
          create_contacts: create_contacts || false,
          storage_path,
          file_names: file_names || [],
        })
        .select("id")
        .single();

      if (jobErr) throw jobErr;
      return new Response(JSON.stringify({ job_id: job.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── PROCESS CHUNK ───
    if (action === "process") {
      const { job_id } = body;
      
      // Get job
      const { data: job, error: jobErr } = await supabase
        .from("import_jobs")
        .select("*")
        .eq("id", job_id)
        .single();
      
      if (jobErr || !job) {
        return new Response(JSON.stringify({ error: "Job not found" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404,
        });
      }

      if (job.status === "completed" || job.status === "cancelled") {
        return new Response(JSON.stringify({ status: job.status, done: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (job.status === "paused") {
        return new Response(JSON.stringify({ status: "paused", done: false }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Mark as running
      await supabase.from("import_jobs").update({ 
        status: "running", 
        started_at: job.started_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", job_id);

      // Download data from storage
      const { data: fileData, error: dlErr } = await supabase.storage
        .from("chatguru-imports")
        .download(job.storage_path);

      if (dlErr || !fileData) {
        await supabase.from("import_jobs").update({ 
          status: "failed", 
          error_message: "Failed to download data: " + (dlErr?.message || "unknown"),
          updated_at: new Date().toISOString(),
        }).eq("id", job_id);
        throw dlErr || new Error("Download failed");
      }

      const text = await fileData.text();
      const allMessages = JSON.parse(text);
      
      const checkpoint = job.checkpoint_data || {};
      const startIdx = checkpoint.last_processed_idx || 0;
      const CHUNK_SIZE = 2000; // Process 2000 messages per invocation
      const endIdx = Math.min(startIdx + CHUNK_SIZE, allMessages.length);
      const chunk = allMessages.slice(startIdx, endIdx);

      // Check if paused before processing
      const { data: freshJob } = await supabase.from("import_jobs").select("status").eq("id", job_id).single();
      if (freshJob?.status === "paused" || freshJob?.status === "cancelled") {
        return new Response(JSON.stringify({ status: freshJob.status, done: freshJob.status === "cancelled" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Group chunk messages by chat_id
      const chatGroups = new Map<string, any[]>();
      for (const msg of chunk) {
        if (!msg.chat_id) continue;
        if (!chatGroups.has(msg.chat_id)) chatGroups.set(msg.chat_id, []);
        chatGroups.get(msg.chat_id)!.push(msg);
      }

      let convsCreated = 0, convsUpdated = 0, msgsCreated = 0, msgsDeduped = 0, contactsCreated = 0, errs = 0;

      for (const [chatId, chatMessages] of chatGroups) {
        try {
          chatMessages.sort((a: any, b: any) => new Date(a.created).getTime() - new Date(b.created).getTime());
          const firstMsg = chatMessages[0];
          const lastMsg = chatMessages[chatMessages.length - 1];
          const phone = normalizePhone(firstMsg.phone);
          const displayName = firstMsg.chat_name || phone || "Desconhecido";

          // Find or create conversation
          const { data: existingConv } = await supabase
            .from("conversations")
            .select("id")
            .eq("external_id", chatId)
            .maybeSingle();

          let conversationId: string;
          const lastText = lastMsg.texto_mensagem || `[MÍDIA: ${lastMsg.type}]`;

          if (existingConv) {
            conversationId = existingConv.id;
            await supabase.from("conversations").update({
              last_message_at: lastMsg.created,
              last_message_preview: lastText.substring(0, 200),
              display_name: displayName,
              phone: phone,
            }).eq("id", conversationId);
            convsUpdated++;
          } else {
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
              } else if (job.create_contacts) {
                const { data: newClient } = await supabase
                  .from("clients")
                  .insert({ display_name: displayName, phone, tags: ["chatguru", "importado"] })
                  .select("id")
                  .single();
                if (newClient) { clientId = newClient.id; contactsCreated++; }
              }
            }

            const { data: newConv, error: convErr } = await supabase
              .from("conversations")
              .insert({
                external_id: chatId,
                phone, display_name: displayName, source: "chatguru",
                status: "fechado", tags: ["chatguru", "importado"],
                last_message_at: lastMsg.created,
                last_message_preview: lastText.substring(0, 200),
                client_id: clientId,
              })
              .select("id")
              .single();

            if (convErr) {
              const { data: retryConv } = await supabase
                .from("conversations").select("id").eq("external_id", chatId).single();
              if (retryConv) { conversationId = retryConv.id; convsUpdated++; }
              else { errs++; continue; }
            } else {
              conversationId = newConv.id;
              convsCreated++;
            }
          }

          // Get existing hashes
          const { data: existingMsgs } = await supabase
            .from("chat_messages")
            .select("external_message_id")
            .eq("conversation_id", conversationId)
            .not("external_message_id", "is", null);

          const existingHashes = new Set((existingMsgs || []).map((m: any) => m.external_message_id));

          // Build messages
          const toInsert: any[] = [];
          for (const msg of chatMessages) {
            if (msg.deleted === 1) { msgsDeduped++; continue; }
            
            const hash = hashMessage(msg.chat_id, msg.created, msg.texto_mensagem, msg.type, msg.from_device);
            if (existingHashes.has(hash)) { msgsDeduped++; continue; }
            existingHashes.add(hash);

            const isAgent = msg.from_device === 1 || (msg.responsavel && msg.responsavel.trim().length > 0);
            let content = msg.texto_mensagem || null;
            if (!content && msg.type !== "chat") content = `[MÍDIA: ${msg.type}]`;

            toInsert.push({
              conversation_id: conversationId,
              external_message_id: hash,
              content,
              sender_type: isAgent ? "atendente" : "cliente",
              message_type: msg.type === "chat" ? "text" : msg.type,
              read_status: msg.message_status || "processed",
              created_at: msg.created,
              metadata: {
                responsavel: msg.responsavel || null,
                sender_name: msg.sender_name || null,
                deleted: msg.deleted, edits: msg.edits,
                is_template: msg.is_template,
                source: "chatguru",
              },
            });
          }

          // Batch insert
          const SUB_BATCH = 500;
          for (let i = 0; i < toInsert.length; i += SUB_BATCH) {
            const batch = toInsert.slice(i, i + SUB_BATCH);
            const { error: insertErr } = await supabase.from("chat_messages").insert(batch);
            if (insertErr) { console.error("Insert error:", insertErr.message); errs++; }
            else { msgsCreated += batch.length; }
          }
        } catch (chatErr) {
          console.error(`Error processing chat ${chatId}:`, chatErr);
          errs++;
        }
      }

      // Update job with cumulative stats
      const newProcessedRows = endIdx;
      const newProgress = Math.min(Math.round((newProcessedRows / allMessages.length) * 100), 100);
      const isDone = endIdx >= allMessages.length;

      await supabase.from("import_jobs").update({
        status: isDone ? "completed" : "running",
        processed_rows: newProcessedRows,
        progress: newProgress,
        conversations_created: (job.conversations_created || 0) + convsCreated,
        conversations_updated: (job.conversations_updated || 0) + convsUpdated,
        messages_created: (job.messages_created || 0) + msgsCreated,
        messages_deduplicated: (job.messages_deduplicated || 0) + msgsDeduped,
        contacts_created: (job.contacts_created || 0) + contactsCreated,
        errors: (job.errors || 0) + errs,
        checkpoint_data: { last_processed_idx: endIdx },
        finished_at: isDone ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      }).eq("id", job_id);

      return new Response(JSON.stringify({
        status: isDone ? "completed" : "running",
        done: isDone,
        processed: newProcessedRows,
        total: allMessages.length,
        progress: newProgress,
        chunk_stats: { convsCreated, convsUpdated, msgsCreated, msgsDeduped, contactsCreated, errors: errs },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── PAUSE / CANCEL ───
    if (action === "pause" || action === "cancel") {
      const newStatus = action === "pause" ? "paused" : "cancelled";
      await supabase.from("import_jobs").update({ 
        status: newStatus, 
        updated_at: new Date().toISOString(),
        ...(action === "cancel" ? { finished_at: new Date().toISOString() } : {}),
      }).eq("id", body.job_id);
      return new Response(JSON.stringify({ status: newStatus }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── RESUME ───
    if (action === "resume") {
      await supabase.from("import_jobs").update({ 
        status: "queued", 
        updated_at: new Date().toISOString() 
      }).eq("id", body.job_id);
      return new Response(JSON.stringify({ status: "queued" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
    });

  } catch (err) {
    console.error("Fatal error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
