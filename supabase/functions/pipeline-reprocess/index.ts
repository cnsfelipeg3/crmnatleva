import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BATCH_SIZE = 20;

const STAGE_MAP: Record<string, string> = {
  "novo_lead": "novo_lead",
  "contato_inicial": "contato_inicial",
  "qualificacao": "qualificacao",
  "diagnostico": "diagnostico",
  "estruturacao": "proposta_preparacao",
  "proposta_preparacao": "proposta_preparacao",
  "proposta_enviada": "proposta_enviada",
  "proposta_visualizada": "proposta_visualizada",
  "ajustes": "ajustes",
  "negociacao": "negociacao",
  "fechamento_andamento": "fechamento_andamento",
  "fechado": "fechado",
  "pos_venda": "pos_venda",
  "perdido": "perdido",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(supabaseUrl, supabaseKey);

  try {
    const { batch_number = 1, offset = 0 } = await req.json().catch(() => ({}));

    // Fetch batch of conversations ordered by most recent
    const { data: conversations, error: convErr } = await sb
      .from("conversations")
      .select("id, phone, contact_name, display_name, stage, tags, status, client_id, created_at, last_message_at, stage_entered_at, close_score, proposal_value, auto_tags, engagement_level, interaction_count")
      .order("last_message_at", { ascending: false })
      .range(offset, offset + BATCH_SIZE - 1);

    if (convErr) throw convErr;
    if (!conversations || conversations.length === 0) {
      return new Response(JSON.stringify({ done: true, message: "No more conversations to process", batch_number }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const batchStarted = new Date().toISOString();
    const details: any[] = [];
    let totalUpdated = 0;
    let totalErrors = 0;

    for (const conv of conversations) {
      try {
        // Fetch messages for this conversation (last 100 to keep context manageable)
        const { data: messages } = await sb
          .from("conversation_messages")
          .select("content, direction, message_type, created_at")
          .eq("conversation_id", conv.id)
          .order("created_at", { ascending: true })
          .limit(100);

        if (!messages || messages.length === 0) {
          details.push({ conversation_id: conv.id, name: conv.contact_name || conv.display_name, status: "skipped", reason: "no_messages" });
          continue;
        }

        // Check for linked proposals
        let proposalInfo = "";
        if (conv.client_id) {
          const { data: proposals } = await sb
            .from("proposals")
            .select("id, title, total_price, proposal_strategy, created_at")
            .eq("client_id", conv.client_id)
            .order("created_at", { ascending: false })
            .limit(3);
          if (proposals && proposals.length > 0) {
            proposalInfo = `\nPROPOSTAS VINCULADAS:\n${proposals.map(p => `- ${p.title || "Sem título"} | R$ ${p.total_price || 0} | Estratégia: ${p.proposal_strategy || "N/A"} | Criada: ${p.created_at}`).join("\n")}`;
          }
        }

        // Build transcript (sample: first 30 + last 30 msgs)
        const sampled = messages.length > 60
          ? [...messages.slice(0, 30), ...messages.slice(-30)]
          : messages;

        const transcript = sampled.map(m => {
          const sender = m.direction === "outgoing" ? "ATENDENTE" : "CLIENTE";
          const content = m.message_type === "text"
            ? (m.content || "").slice(0, 150)
            : `[${m.message_type}]`;
          return `[${sender}]: ${content}`;
        }).join("\n");

        const totalMsgs = messages.length;
        const clientMsgs = messages.filter(m => m.direction === "incoming").length;
        const agentMsgs = messages.filter(m => m.direction === "outgoing").length;
        const firstMsg = messages[0]?.created_at;
        const lastMsg = messages[messages.length - 1]?.created_at;

        // AI analysis
        const systemPrompt = `Você é um analista comercial sênior de agência de turismo premium. Analise a conversa e retorne APENAS um JSON válido (sem markdown, sem comentários) com esta estrutura exata:
{
  "stage": "novo_lead|contato_inicial|qualificacao|diagnostico|proposta_preparacao|proposta_enviada|proposta_visualizada|ajustes|negociacao|fechamento_andamento|fechado|pos_venda|perdido",
  "engagement_level": "baixo|medio|alto",
  "close_score": 0-100,
  "auto_tags": ["tag1", "tag2"],
  "proposal_value": 0,
  "status_label": "ativo|aguardando_resposta|esfriando|parado|em_negociacao|fechado|perdido",
  "reasoning": "Explicação breve de 1 frase"
}

REGRAS:
- stage deve refletir o momento REAL do cliente baseado no conteúdo
- close_score: 0-20 para leads frios, 20-50 para qualificados, 50-70 para em negociação, 70-90 para quase fechando, 90-100 para fechados
- auto_tags: escolha entre: Lead quente, Lead frio, Alta interação, Sensível a preço, Pediu desconto, Pediu proposta, Proposta enviada, Sem resposta >48h, Follow-up pendente, Quase fechando, Familiar, Luxo, Econômico, Urgente, Cliente indeciso, Comparando opções, Retomada de interesse
- proposal_value: valor em reais mencionado na conversa (0 se não mencionado)
- Se a conversa é apenas spam, status ou broadcast, use stage "perdido" com close_score 0`;

        const userContent = `CONVERSA: ${conv.contact_name || conv.display_name || conv.phone || "Anônimo"}
Etapa atual: ${conv.stage || "novo_lead"}
Total msgs: ${totalMsgs} (cliente: ${clientMsgs}, atendente: ${agentMsgs})
Primeira msg: ${firstMsg} | Última msg: ${lastMsg}
${proposalInfo}

TRANSCRIÇÃO:
${transcript}`;

        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userContent },
            ],
          }),
        });

        if (!aiResponse.ok) {
          const errText = await aiResponse.text();
          console.error(`AI error for ${conv.id}:`, aiResponse.status, errText);
          if (aiResponse.status === 429) {
            // Rate limited - wait and skip rest
            details.push({ conversation_id: conv.id, status: "rate_limited" });
            totalErrors++;
            break;
          }
          details.push({ conversation_id: conv.id, status: "ai_error", error: `${aiResponse.status}` });
          totalErrors++;
          continue;
        }

        const aiData = await aiResponse.json();
        const raw = aiData.choices?.[0]?.message?.content || "";

        // Parse JSON from AI response
        let analysis: any;
        try {
          // Try to extract JSON from response (handles markdown wrapping)
          const jsonMatch = raw.match(/\{[\s\S]*\}/);
          if (!jsonMatch) throw new Error("No JSON found");
          analysis = JSON.parse(jsonMatch[0]);
        } catch {
          console.error(`Parse error for ${conv.id}:`, raw.slice(0, 200));
          details.push({ conversation_id: conv.id, status: "parse_error", raw: raw.slice(0, 100) });
          totalErrors++;
          continue;
        }

        // Validate and normalize stage
        const newStage = STAGE_MAP[analysis.stage] || "novo_lead";
        const oldStage = conv.stage || "novo_lead";
        const stageChanged = newStage !== oldStage;

        // Build update
        const update: Record<string, any> = {
          stage: newStage,
          engagement_level: analysis.engagement_level || "medio",
          close_score: Math.min(100, Math.max(0, parseInt(analysis.close_score) || 0)),
          auto_tags: Array.isArray(analysis.auto_tags) ? analysis.auto_tags.slice(0, 8) : [],
          interaction_count: totalMsgs,
        };

        if (analysis.proposal_value > 0) {
          update.proposal_value = parseFloat(analysis.proposal_value) || 0;
        }

        if (stageChanged) {
          update.stage_entered_at = new Date().toISOString();
        }

        // Update conversation
        const { error: updateErr } = await sb
          .from("conversations")
          .update(update)
          .eq("id", conv.id);

        if (updateErr) {
          console.error(`Update error for ${conv.id}:`, updateErr);
          details.push({ conversation_id: conv.id, status: "update_error", error: updateErr.message });
          totalErrors++;
          continue;
        }

        totalUpdated++;
        details.push({
          conversation_id: conv.id,
          name: conv.contact_name || conv.display_name || conv.phone,
          status: "updated",
          old_stage: oldStage,
          new_stage: newStage,
          stage_changed: stageChanged,
          close_score: update.close_score,
          auto_tags: update.auto_tags,
          proposal_value: update.proposal_value || 0,
          reasoning: analysis.reasoning,
        });

        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 300));

      } catch (err) {
        console.error(`Error processing ${conv.id}:`, err);
        details.push({ conversation_id: conv.id, status: "error", error: String(err) });
        totalErrors++;
      }
    }

    // Log batch
    await sb.from("pipeline_rebuild_log").insert({
      batch_number,
      started_at: batchStarted,
      finished_at: new Date().toISOString(),
      total_processed: conversations.length,
      total_updated: totalUpdated,
      total_errors: totalErrors,
      detail: details,
      notes: `Offset ${offset}-${offset + conversations.length - 1}`,
    });

    const stageChanges = details.filter(d => d.stage_changed).length;
    const hasMore = conversations.length === BATCH_SIZE;

    return new Response(JSON.stringify({
      batch_number,
      processed: conversations.length,
      updated: totalUpdated,
      errors: totalErrors,
      stage_changes: stageChanges,
      has_more: hasMore,
      next_offset: offset + BATCH_SIZE,
      next_batch: batch_number + 1,
      details: details.map(d => ({
        name: d.name,
        status: d.status,
        old_stage: d.old_stage,
        new_stage: d.new_stage,
        stage_changed: d.stage_changed,
        close_score: d.close_score,
        tags: d.auto_tags,
        value: d.proposal_value,
        reasoning: d.reasoning,
      })),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("pipeline-reprocess error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
