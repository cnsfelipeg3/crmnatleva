import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { conversationId, forceRebuild = false } = await req.json();
    if (!conversationId) throw new Error("conversationId is required");

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ─── Conversation metadata + scope resolution ───
    // Detect if conversationId is a valid UUID or a WhatsApp-style external ID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isUuid = uuidRegex.test(conversationId);

    let conv: any = null;
    if (isUuid) {
      const { data } = await sb
        .from("conversations")
        .select("id, contact_name, display_name, phone, client_id")
        .eq("id", conversationId)
        .single();
      conv = data;
    } else {
      // Try external_id or external_conversation_id lookup
      const { data: byExternal } = await sb
        .from("conversations")
        .select("id, contact_name, display_name, phone, client_id")
        .or(`external_id.eq.${conversationId},external_conversation_id.eq.${conversationId}`)
        .order("updated_at", { ascending: false })
        .limit(1);
      conv = byExternal?.[0] || null;
    }

    if (!conv) {
      return new Response(JSON.stringify({ briefing: { confidence: "none" }, error: "Conversation not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalizePhone = (v?: string | null) => (v || "").replace(/\D/g, "");
    const convPhone = normalizePhone(conv?.phone);
    const phoneCandidates = convPhone
      ? Array.from(new Set([
          convPhone,
          `+${convPhone}`,
          `${convPhone}@c.us`,
          `${convPhone}@s.whatsapp.net`,
          `${convPhone}@g.us`,
          `${convPhone}-group`,
        ]))
      : [];

    let clientName = conv?.display_name || conv?.contact_name || "";

    // Resolve client from sister conversations when current conversation is not linked
    let clientId = conv?.client_id || null;
    if (!clientId && phoneCandidates.length > 0) {
      const { data: linkedByPhone } = await sb
        .from("conversations")
        .select("client_id, updated_at")
        .in("phone", phoneCandidates)
        .not("client_id", "is", null)
        .order("updated_at", { ascending: false })
        .limit(1);
      clientId = linkedByPhone?.[0]?.client_id || null;
    }

    // Gather full conversation scope (same WhatsApp number), including current conversation
    let scopedConversationIds = [conversationId];
    if (phoneCandidates.length > 0) {
      const { data: relatedConversations } = await sb
        .from("conversations")
        .select("id")
        .in("phone", phoneCandidates)
        .order("updated_at", { ascending: false });

      scopedConversationIds = Array.from(new Set([
        conversationId,
        ...(relatedConversations || []).map((c) => c.id),
      ]));
    }

    // Optional forensic reset/rebuild for this client scope
    if (forceRebuild) {
      if (clientId) {
        await sb.from("client_trip_memory").delete().eq("client_id", clientId);
      } else {
        await sb.from("client_trip_memory").delete().in("conversation_id", scopedConversationIds);
      }
    }

    // ─── LAYER 1: ALL conversation messages in scope (no limit) ───
    let allMessages: any[] = [];
    let page = 0;
    const PAGE_SIZE = 1000;
    while (true) {
      const { data: batch, error: batchErr } = await sb
        .from("conversation_messages")
        .select("content, sender_type, created_at, message_type, direction, conversation_id")
        .in("conversation_id", scopedConversationIds)
        .order("created_at", { ascending: true })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      if (batchErr) throw batchErr;
      if (!batch?.length) break;
      allMessages = allMessages.concat(batch);
      if (batch.length < PAGE_SIZE) break;
      page++;
    }

    if (!allMessages.length) {
      return new Response(JSON.stringify({ briefing: null, reason: "no_messages" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── LAYER 2: Client commercial history ───
    let clientContext = "";
    let tripMemoryContext = "";

    if (clientId) {
      // Client details
      const { data: client } = await sb
        .from("clients")
        .select("display_name, city, state, email, tags, observations")
        .eq("id", clientId)
        .single();
      if (client) {
        clientName = client.display_name || clientName;
        const parts: string[] = [];
        if (client.city || client.state) parts.push(`Localização: ${[client.city, client.state].filter(Boolean).join(", ")}`);
        if (client.tags?.length) parts.push(`Tags: ${client.tags.join(", ")}`);
        if (client.observations) parts.push(`Observações: ${client.observations.slice(0, 300)}`);
        if (parts.length) clientContext += `\nDADOS DO CLIENTE:\n${parts.join("\n")}\n`;
      }

      // Travel preferences
      const { data: prefs } = await sb
        .from("client_travel_preferences")
        .select("*")
        .eq("client_id", clientId)
        .maybeSingle();
      if (prefs) {
        const prefParts: string[] = [];
        if (prefs.cabin_class) prefParts.push(`Classe: ${prefs.cabin_class}`);
        if (prefs.hotel_category) prefParts.push(`Hotel: ${prefs.hotel_category}`);
        if (prefs.trip_style) prefParts.push(`Estilo: ${prefs.trip_style}`);
        if (prefs.preferred_airlines?.length) prefParts.push(`Cias aéreas: ${prefs.preferred_airlines.join(", ")}`);
        if (prefs.special_needs) prefParts.push(`Necessidades: ${prefs.special_needs}`);
        if (prefs.notes) prefParts.push(`Notas: ${prefs.notes.slice(0, 200)}`);
        if (prefParts.length) clientContext += `\nPREFERÊNCIAS REGISTRADAS:\n${prefParts.join("\n")}\n`;
      }

      // Past sales
      const { data: sales } = await sb
        .from("sales")
        .select("name, destination_iata, origin_iata, close_date, status, received_value, airline, travel_date, return_date")
        .eq("client_id", clientId)
        .order("close_date", { ascending: false })
        .limit(15);
      if (sales?.length) {
        clientContext += `\nHISTÓRICO DE VENDAS/VIAGENS (${sales.length} registros):\n`;
        for (const s of sales) {
          const parts = [
            s.name,
            s.destination_iata ? `Destino: ${s.destination_iata}` : null,
            s.origin_iata ? `Origem: ${s.origin_iata}` : null,
            s.status ? `Status: ${s.status}` : null,
            s.close_date ? `Data: ${s.close_date}` : null,
            s.received_value ? `Valor: R$ ${s.received_value}` : null,
            s.airline ? `Cia: ${s.airline}` : null,
          ].filter(Boolean);
          clientContext += `- ${parts.join(" | ")}\n`;
        }
      }

      // Client notes
      const { data: notes } = await sb
        .from("client_notes")
        .select("content, created_at")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })
        .limit(5);
      if (notes?.length) {
        clientContext += `\nANOTAÇÕES SOBRE O CLIENTE:\n`;
        for (const n of notes) {
          clientContext += `- [${n.created_at?.slice(0, 10)}] ${n.content.slice(0, 200)}\n`;
        }
      }

      // ─── LAYER 2b: Existing trip memory ───
      const { data: memories } = await sb
        .from("client_trip_memory")
        .select("*")
        .eq("client_id", clientId)
        .order("detected_at", { ascending: false })
        .limit(20);
      if (memories?.length) {
        tripMemoryContext = `\nMEMÓRIA DE VIAGENS DO CLIENTE (${memories.length} ciclos registrados):\n`;
        for (const m of memories) {
          const parts = [
            m.trip_destination,
            m.trip_subdestinations?.length ? `(${m.trip_subdestinations.join(", ")})` : null,
            m.trip_dates ? `Datas: ${m.trip_dates}` : null,
            m.passengers ? `${m.passengers} pax` : null,
            `Status: ${m.trip_status}`,
            m.confidence_score ? `Confiança: ${m.confidence_score}` : null,
            m.conversation_period ? `Período: ${m.conversation_period}` : null,
          ].filter(Boolean);
          tripMemoryContext += `- ${parts.join(" | ")}\n`;
        }
      }
    }

    // ─── LAYER 3: Build smart transcript with STRONG recency bias ───
    const totalMsgs = allMessages.length;
    // Keep last 150 messages in FULL detail (this is the primary analysis window)
    const RECENT_FULL = 150;
    // Keep last 50 messages with MAXIMUM detail (longer content)
    const RECENT_MAX = 50;
    let transcript = "";

    if (totalMsgs > RECENT_FULL) {
      // === OLDER BLOCK: grouped by month, summarized ===
      const olderMessages = allMessages.slice(0, totalMsgs - RECENT_FULL);
      const monthGroups: Record<string, { count: number; topics: string[] }> = {};
      
      for (const m of olderMessages) {
        if (!m.content || m.message_type !== "text") continue;
        const month = (m.created_at || "").slice(0, 7);
        if (!monthGroups[month]) monthGroups[month] = { count: 0, topics: [] };
        monthGroups[month].count++;
        // Extract travel-relevant keywords from older messages
        const content = (m.content || "").toLowerCase();
        const travelKeywords = ["viagem", "hotel", "voo", "passagem", "destino", "roteiro", "orçamento",
          "cotação", "proposta", "reserva", "aeroporto", "bagagem", "transfer"];
        if (travelKeywords.some(k => content.includes(k)) && monthGroups[month].topics.length < 8) {
          const sender = m.direction === "incoming" ? "CLI" : "CONS";
          monthGroups[month].topics.push(`${sender}: ${(m.content || "").slice(0, 200)}`);
        }
      }
      
      const monthEntries = Object.entries(monthGroups).sort((a, b) => a[0].localeCompare(b[0]));
      transcript += "=== HISTÓRICO ANTIGO (resumo por mês — use APENAS como contexto de fundo) ===\n";
      for (const [month, data] of monthEntries) {
        transcript += `\n[${month}] (${data.count} mensagens de texto):\n`;
        if (data.topics.length > 0) {
          transcript += data.topics.join("\n") + "\n";
        } else {
          transcript += "(sem mensagens relevantes sobre viagem)\n";
        }
      }
      transcript += "\n";

      // === RECENT BLOCK: full detail ===
      const recentAll = allMessages.slice(totalMsgs - RECENT_FULL);
      const olderRecent = recentAll.slice(0, RECENT_FULL - RECENT_MAX);
      const newestRecent = recentAll.slice(RECENT_FULL - RECENT_MAX);

      transcript += "=== MENSAGENS RECENTES (contexto recente) ===\n";
      transcript += olderRecent.map(m => {
        const sender = m.direction === "incoming" ? "CLIENTE" : "CONSULTOR";
        return `[${sender} ${(m.created_at || "").slice(0, 16)}]: ${(m.content || "").slice(0, 400)}`;
      }).join("\n");

      transcript += "\n\n=== MENSAGENS MAIS RECENTES (PRIORIDADE MÁXIMA — BASE PRINCIPAL DA PROPOSTA) ===\n";
      transcript += newestRecent.map(m => {
        const sender = m.direction === "incoming" ? "CLIENTE" : "CONSULTOR";
        // Full content for newest messages
        return `[${sender} ${(m.created_at || "").slice(0, 16)}]: ${(m.content || "").slice(0, 800)}`;
      }).join("\n");
    } else {
      // Small conversation: include everything
      transcript = "=== CONVERSA COMPLETA ===\n";
      transcript += allMessages.map(m => {
        const sender = m.direction === "incoming" ? "CLIENTE" : "CONSULTOR";
        return `[${sender} ${(m.created_at || "").slice(0, 16)}]: ${(m.content || "").slice(0, 600)}`;
      }).join("\n");
    }

    // ─── LAYER 2c: Strategy Knowledge Base ───
    let strategyContext = "";
    try {
      const { data: rules } = await sb
        .from("ai_strategy_knowledge")
        .select("category, title, rule, example, priority")
        .eq("is_active", true)
        .order("priority", { ascending: false })
        .limit(30);
      if (rules?.length) {
        const grouped: Record<string, typeof rules> = {};
        for (const r of rules) {
          if (!grouped[r.category]) grouped[r.category] = [];
          grouped[r.category].push(r);
        }
        strategyContext = "\n\n## BASE DE CONHECIMENTO ESTRATÉGICA DA NATLEVA\n\nUse estas regras como guia obrigatório para interpretar a conversa e gerar a proposta:\n";
        for (const [cat, items] of Object.entries(grouped)) {
          strategyContext += `\n### ${cat.toUpperCase().replace(/_/g, " ")}\n`;
          for (const item of items) {
            strategyContext += `- **${item.title}**: ${item.rule}`;
            if (item.example) strategyContext += ` (Ex: ${item.example})`;
            strategyContext += "\n";
          }
        }
      }
    } catch (err) {
      console.error("Error loading strategy knowledge:", err);
    }

    // ─── AI CALL with enhanced prompt ───
    const systemPrompt = `Você é um analista sênior da agência de turismo NatLeva. 

SUA TAREFA PRINCIPAL: identificar qual viagem o cliente está discutindo AGORA e gerar um briefing APENAS dessa viagem.

## REGRAS DE PRIORIDADE TEMPORAL (CRÍTICAS)

1. **MENSAGENS RECENTES TÊM PESO ABSOLUTO.** Se o cliente enviou um briefing detalhado recentemente (com destinos, datas, hotéis, voos, valores), essa É a demanda atual. Ponto final.

2. **NUNCA use um assunto antigo como demanda atual.** Se o cliente falou de San Andrés em dezembro de 2025 e agora fala de Japão, a proposta DEVE ser de Japão.

3. **Um briefing detalhado recente (com roteiro, hotéis, valores) AUTOMATICAMENTE invalida qualquer destino discutido no passado.**

4. **Separação temporal obrigatória:** Identifique TODOS os ciclos de intenção na conversa e classifique cada um:
   - cotacao_solicitada (pediu orçamento)
   - proposta_enviada (consultor mandou proposta)
   - viagem_realizada (viajou)
   - cotacao_abandonada (parou de falar no assunto)
   - demanda_ativa (está falando AGORA)

5. **Critério para "demanda ativa":** A demanda ativa é o assunto de viagem dominante nas ÚLTIMAS mensagens da conversa. Sinais fortes: menção de destinos, datas, hotéis, voos, roteiro, valores, passageiros.

6. **NUNCA misture viagens.** Cada ciclo é independente.

7. **Use o histórico apenas para enriquecer** (perfil, preferências), NUNCA para definir o destino da proposta.

## DETECÇÃO DE CICLOS

Analise a conversa inteira e identifique cada ciclo de viagem separadamente. Para cada ciclo, registre em "detected_trip_cycles".

## SOBRE A MEMÓRIA DE VIAGENS

Se houver memória de viagens existente, use-a para entender rapidamente o histórico sem depender só da conversa.

Responda usando a ferramenta generate_briefing.${strategyContext}`;

    const userContent = `NOME DO CLIENTE: ${clientName}
${clientContext ? "\n" + clientContext : ""}
${tripMemoryContext ? "\n" + tripMemoryContext : ""}

TRANSCRIÇÃO DA CONVERSA (total: ${totalMsgs} mensagens):

${transcript}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_briefing",
              description: "Generate a journey-aware travel briefing separating past context from current demand.",
              parameters: {
                type: "object",
                properties: {
                  // ─── Trip Cycles Detection ───
                  detected_trip_cycles: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        destination: { type: "string", description: "Main destination of this cycle" },
                        subdestinations: { type: "array", items: { type: "string" } },
                        period: { type: "string", description: "When discussed (e.g. 'dezembro 2025')" },
                        dates: { type: "string", description: "Travel dates if mentioned" },
                        passengers: { type: "number" },
                        status: { 
                          type: "string", 
                          enum: ["cotacao_solicitada", "proposta_enviada", "viagem_realizada", "cotacao_abandonada", "demanda_ativa"],
                          description: "Commercial status of this trip cycle" 
                        },
                        is_current_demand: { type: "boolean", description: "TRUE only for the active current demand" },
                        evidence: { type: "string", description: "Key evidence from messages" }
                      },
                      required: ["destination", "status", "is_current_demand"]
                    },
                    description: "ALL trip cycles detected in the conversation, both past and present."
                  },

                  // ─── Client Journey Context ───
                  client_history_summary: {
                    type: "string",
                    description: "Brief summary of the client's PAST journey. 2-4 sentences in Portuguese."
                  },
                  discarded_topics: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        topic: { type: "string" },
                        period: { type: "string" },
                        reason: { type: "string", enum: ["assunto_encerrado", "viagem_realizada", "proposta_nao_fechada", "cotacao_antiga", "conversa_de_suporte"] }
                      },
                      required: ["topic"]
                    },
                    description: "Past topics that are NOT the current demand."
                  },
                  current_demand_confidence: {
                    type: "string",
                    enum: ["alta", "media", "baixa"],
                    description: "Confidence in correctly identifying the CURRENT trip. 'alta' = clear briefing in recent messages."
                  },
                  ambiguous_demands: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        destination: { type: "string" },
                        period: { type: "string" },
                        evidence: { type: "string" }
                      },
                      required: ["destination"]
                    },
                    description: "ONLY if 2+ competing CURRENT demands exist. Empty if clear."
                  },
                  client_profile_insights: {
                    type: "string",
                    description: "Insights from past behavior: spending tier, preferences, patterns."
                  },

                  // ─── Trip data (CURRENT demand only) ───
                  origin: { type: "string" },
                  destination: { type: "string", description: "Main destination of the CURRENT trip only." },
                  sub_destinations: { type: "array", items: { type: "string" } },
                  departure_date: { type: "string" },
                  return_date: { type: "string" },
                  duration_days: { type: "number" },
                  adults: { type: "number" },
                  children: { type: "number" },
                  babies: { type: "number" },
                  trip_type: { type: "string" },
                  trip_style: { type: "string", enum: ["essencial", "conforto", "premium", "ultra_luxo"] },
                  hotel_preference: { type: "string" },
                  flight_preference: { type: "string" },
                  other_preferences: { type: "string" },
                  restrictions: { type: "array", items: { type: "string" } },
                  budget: { type: "string" },
                  urgency_level: { type: "string", enum: ["alta", "media", "baixa"] },
                  closing_probability: { type: "string", enum: ["alta", "media", "baixa"] },
                  client_profile: { type: "string", enum: ["premium", "padrao", "economico", "indeterminado"] },
                  briefing_summary: { type: "string", description: "Summary of CURRENT demand only." },
                  proposal_title: { type: "string" },
                  intro_text: { type: "string" },
                  itinerary_suggestion: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        city: { type: "string" },
                        nights: { type: "number" },
                        highlights: { type: "string" }
                      },
                      required: ["city", "nights"]
                    },
                  },
                  next_steps: { type: "array", items: { type: "string" } },
                  internal_notes: { type: "string" },
                  confidence: { type: "string", enum: ["high", "medium", "low", "none"] },
                },
                required: ["confidence", "briefing_summary", "current_demand_confidence", "detected_trip_cycles"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_briefing" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit. Tente novamente em alguns segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    let briefing = null;
    if (toolCall?.function?.arguments) {
      try {
        briefing = JSON.parse(toolCall.function.arguments);
        briefing.client_name = clientName;
        briefing.client_id = clientId;
        briefing.total_messages_analyzed = totalMsgs;
      } catch {
        briefing = null;
      }
    }

    // ─── LAYER 4: Save detected trip cycles to memory ───
    if (briefing?.detected_trip_cycles?.length && clientId) {
      try {
        for (const cycle of briefing.detected_trip_cycles) {
          // Check if this cycle already exists in memory
          const { data: existing } = await sb
            .from("client_trip_memory")
            .select("id, trip_status")
            .eq("client_id", clientId)
            .ilike("trip_destination", cycle.destination)
            .limit(1);

          if (existing?.length) {
            // Update status if changed
            if (existing[0].trip_status !== cycle.status) {
              await sb.from("client_trip_memory")
                .update({ 
                  trip_status: cycle.status,
                  trip_subdestinations: cycle.subdestinations || [],
                  trip_dates: cycle.dates || null,
                  passengers: cycle.passengers || null,
                  conversation_period: cycle.period || null,
                  confidence_score: cycle.is_current_demand ? "alta" : "media",
                  updated_at: new Date().toISOString(),
                })
                .eq("id", existing[0].id);
            }
          } else {
            // Insert new cycle
            await sb.from("client_trip_memory").insert({
              client_id: clientId,
              conversation_id: conversationId,
              trip_destination: cycle.destination,
              trip_subdestinations: cycle.subdestinations || [],
              trip_dates: cycle.dates || null,
              passengers: cycle.passengers || null,
              conversation_period: cycle.period || null,
              trip_status: cycle.status,
              confidence_score: cycle.is_current_demand ? "alta" : "media",
              source_summary: cycle.evidence || null,
            });
          }
        }
      } catch (memErr) {
        console.error("Error saving trip memory:", memErr);
        // Non-blocking: don't fail the response
      }
    }

    return new Response(JSON.stringify({ briefing }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-proposal-briefing error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
