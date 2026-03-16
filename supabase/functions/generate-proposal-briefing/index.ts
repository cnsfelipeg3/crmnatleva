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

    const { conversationId } = await req.json();
    if (!conversationId) throw new Error("conversationId is required");

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ─── LAYER 1: Full conversation messages ───
    const { data: allMessages, error: msgErr } = await sb
      .from("conversation_messages")
      .select("content, sender_type, created_at, message_type, direction")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(500);

    if (msgErr) throw msgErr;
    if (!allMessages?.length) {
      return new Response(JSON.stringify({ briefing: null, reason: "no_messages" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Conversation metadata ───
    const { data: conv } = await sb
      .from("conversations")
      .select("contact_name, display_name, phone, client_id")
      .eq("id", conversationId)
      .single();

    let clientName = conv?.display_name || conv?.contact_name || "";
    const clientId = conv?.client_id || null;

    // ─── LAYER 2: Client commercial history ───
    let clientContext = "";
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

      // Past sales (up to 10 most recent)
      const { data: sales } = await sb
        .from("sales")
        .select("name, destination_iata, origin_iata, close_date, status, received_value, airline, travel_date, return_date")
        .eq("client_id", clientId)
        .order("close_date", { ascending: false })
        .limit(10);
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
    }

    // ─── LAYER 3: Build smart transcript ───
    // Strategy: summarize older messages, keep recent ones in detail
    const totalMsgs = allMessages.length;
    const RECENT_WINDOW = 100;
    let transcript = "";

    if (totalMsgs > RECENT_WINDOW) {
      // Summarize older block
      const olderMessages = allMessages.slice(0, totalMsgs - RECENT_WINDOW);
      const olderChunks: string[] = [];
      // Group by ~month for context
      let currentMonth = "";
      let monthMsgs: string[] = [];
      for (const m of olderMessages) {
        const month = (m.created_at || "").slice(0, 7); // YYYY-MM
        if (month !== currentMonth && monthMsgs.length > 0) {
          olderChunks.push(`[${currentMonth}] (${monthMsgs.length} msgs): ${monthMsgs.slice(0, 5).map(t => t.slice(0, 120)).join(" | ")} ...`);
          monthMsgs = [];
        }
        currentMonth = month;
        const sender = m.direction === "incoming" ? "CLI" : "CONS";
        if (m.content && m.message_type === "text") {
          monthMsgs.push(`${sender}: ${(m.content || "").slice(0, 150)}`);
        }
      }
      if (monthMsgs.length > 0) {
        olderChunks.push(`[${currentMonth}] (${monthMsgs.length} msgs): ${monthMsgs.slice(0, 5).map(t => t.slice(0, 120)).join(" | ")} ...`);
      }
      transcript += "=== HISTÓRICO ANTIGO (resumo) ===\n" + olderChunks.join("\n") + "\n\n";

      // Recent messages in full
      const recentMessages = allMessages.slice(totalMsgs - RECENT_WINDOW);
      transcript += "=== MENSAGENS RECENTES (detalhadas) ===\n";
      transcript += recentMessages.map(m => {
        const sender = m.direction === "incoming" ? "CLIENTE" : "CONSULTOR";
        return `[${sender} ${(m.created_at || "").slice(0, 16)}]: ${(m.content || "").slice(0, 500)}`;
      }).join("\n");
    } else {
      transcript = allMessages.map(m => {
        const sender = m.direction === "incoming" ? "CLIENTE" : "CONSULTOR";
        return `[${sender} ${(m.created_at || "").slice(0, 16)}]: ${(m.content || "").slice(0, 500)}`;
      }).join("\n");
    }

    // ─── AI CALL with enhanced prompt ───
    const systemPrompt = `Você é um analista sênior de uma agência de turismo premium (NatLeva Turismo).

Sua tarefa é analisar a JORNADA COMPLETA do cliente e extrair um briefing para a viagem que está sendo discutida AGORA.

REGRAS CRÍTICAS:
1. A conversa pode conter MÚLTIPLOS assuntos e viagens ao longo do tempo. Você DEVE separar o que é passado do que é presente.
2. Identifique "ciclos de intenção": cotações antigas, viagens já realizadas, assuntos encerrados vs. a demanda ATUAL.
3. Se o cliente falou de San Andrés em dezembro e agora fala de Japão, a proposta DEVE ser sobre Japão.
4. NUNCA misture dados de viagens diferentes na mesma proposta.
5. Use o histórico passado APENAS para enriquecer a personalização (ex: "cliente prefere premium", "já viajou para X").
6. Se houver ambiguidade entre 2+ demandas ativas, sinalize em "ambiguous_demands".

PRIORIDADE: Mensagens mais recentes > mensagens antigas. Contexto comercial recente > histórico distante.

Responda usando a ferramenta generate_briefing.`;

    const userContent = `NOME DO CLIENTE: ${clientName}
${clientContext ? "\n" + clientContext : ""}

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
                  // ─── NEW: Client Journey Context ───
                  client_history_summary: {
                    type: "string",
                    description: "Brief summary of the client's PAST journey with the agency: previous trips, old quotes, patterns. 2-4 sentences in Portuguese."
                  },
                  discarded_topics: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        topic: { type: "string", description: "The old/discarded topic (e.g. 'San Andrés')" },
                        period: { type: "string", description: "When it was discussed (e.g. 'dezembro 2024')" },
                        reason: { type: "string", description: "Why it was discarded (e.g. 'assunto encerrado', 'viagem já realizada', 'proposta não fechada')" }
                      },
                      required: ["topic"]
                    },
                    description: "List of past conversation topics that are NOT the current demand."
                  },
                  current_demand_confidence: {
                    type: "string",
                    enum: ["alta", "media", "baixa"],
                    description: "How confident the AI is that it correctly identified the CURRENT trip being discussed."
                  },
                  ambiguous_demands: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        destination: { type: "string" },
                        period: { type: "string" },
                        evidence: { type: "string", description: "Brief evidence from conversation" }
                      },
                      required: ["destination"]
                    },
                    description: "If there are 2+ competing current demands and AI is unsure, list them here so consultant can choose. Empty if clear."
                  },
                  client_profile_insights: {
                    type: "string",
                    description: "Insights about the client from past behavior: spending tier, preferences patterns, response style. Helps personalize the proposal."
                  },

                  // ─── Trip data (current demand only) ───
                  origin: { type: "string", description: "City/airport of origin for CURRENT trip." },
                  destination: { type: "string", description: "Main destination for CURRENT trip." },
                  sub_destinations: {
                    type: "array",
                    items: { type: "string" },
                    description: "Additional cities/regions for CURRENT trip."
                  },
                  departure_date: { type: "string" },
                  return_date: { type: "string" },
                  duration_days: { type: "number" },
                  adults: { type: "number" },
                  children: { type: "number" },
                  babies: { type: "number" },
                  trip_type: { type: "string" },
                  trip_style: {
                    type: "string",
                    enum: ["essencial", "conforto", "premium", "ultra_luxo"],
                  },
                  hotel_preference: { type: "string" },
                  flight_preference: { type: "string" },
                  other_preferences: { type: "string" },
                  restrictions: { type: "array", items: { type: "string" } },
                  budget: { type: "string" },
                  urgency_level: { type: "string", enum: ["alta", "media", "baixa"] },
                  closing_probability: { type: "string", enum: ["alta", "media", "baixa"] },
                  client_profile: { type: "string", enum: ["premium", "padrao", "economico", "indeterminado"] },
                  briefing_summary: { type: "string", description: "Summary of the CURRENT demand only." },
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
                required: ["confidence", "briefing_summary", "current_demand_confidence"],
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
