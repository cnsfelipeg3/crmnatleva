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

    // Fetch last 80 messages
    const { data: messages, error: msgErr } = await sb
      .from("conversation_messages")
      .select("content, sender_type, created_at, message_type, direction")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(80);

    if (msgErr) throw msgErr;
    if (!messages?.length) {
      return new Response(JSON.stringify({ briefing: null, reason: "no_messages" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Also fetch conversation metadata
    const { data: conv } = await sb
      .from("conversations")
      .select("contact_name, display_name, phone, client_id")
      .eq("id", conversationId)
      .single();

    let clientName = conv?.display_name || conv?.contact_name || "";

    // If client_id exists, get client details
    if (conv?.client_id) {
      const { data: client } = await sb
        .from("clients")
        .select("display_name, city, state, email")
        .eq("id", conv.client_id)
        .single();
      if (client) {
        clientName = client.display_name || clientName;
      }
    }

    const transcript = messages.reverse().map(m => {
      const sender = m.direction === "incoming" ? "CLIENTE" : "CONSULTOR";
      return `[${sender}]: ${(m.content || "").slice(0, 400)}`;
    }).join("\n");

    const systemPrompt = `Você é um especialista em análise de conversas de uma agência de turismo premium (NatLeva Turismo).

Sua tarefa é analisar a transcrição da conversa e extrair um BRIEFING COMPLETO da viagem que está sendo negociada, para gerar uma pré-proposta comercial.

PRIORIZE sempre as informações mais recentes da conversa. Se o cliente mudou de ideia, considere a última intenção.

Analise profundamente e extraia o máximo de informações possível. Seja criativo nas sugestões de itinerário baseando-se nos destinos mencionados.

Responda usando a ferramenta generate_briefing.`;

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
          { role: "user", content: `NOME DO CLIENTE: ${clientName}\n\nTRANSCRIÇÃO DA CONVERSA:\n\n${transcript}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_briefing",
              description: "Generate a comprehensive travel briefing from conversation analysis.",
              parameters: {
                type: "object",
                properties: {
                  // Basic trip data
                  origin: { type: "string", description: "City/airport of origin. Null if not mentioned." },
                  destination: { type: "string", description: "Main destination city/country." },
                  sub_destinations: {
                    type: "array",
                    items: { type: "string" },
                    description: "Additional cities/regions within the destination. E.g. ['Roma', 'Toscana', 'Florença']"
                  },
                  departure_date: { type: "string", description: "Departure date or approximate period like 'junho 2026'." },
                  return_date: { type: "string", description: "Return date or duration like '10 dias'." },
                  duration_days: { type: "number", description: "Estimated trip duration in days." },
                  adults: { type: "number", description: "Number of adult passengers." },
                  children: { type: "number", description: "Number of children." },
                  babies: { type: "number", description: "Number of babies." },

                  // Trip profile
                  trip_type: {
                    type: "string",
                    description: "Type: lazer, lua de mel, família, corporativa, religioso, luxo, econômico, grupo, intercâmbio, cruzeiro, apenas aéreo, pacote completo, Disney"
                  },
                  trip_style: {
                    type: "string",
                    enum: ["essencial", "conforto", "premium", "ultra_luxo"],
                    description: "Inferred investment tier based on preferences and budget signals."
                  },

                  // Preferences
                  hotel_preference: { type: "string", description: "Hotel preferences: category, type (resort, boutique, all-inclusive), specific chains." },
                  flight_preference: { type: "string", description: "Flight preferences: direct, business class, specific airline, baggage needs." },
                  other_preferences: { type: "string", description: "Other preferences: car rental, transfers, tours, experiences, special needs." },

                  // Restrictions
                  restrictions: {
                    type: "array",
                    items: { type: "string" },
                    description: "Restrictions mentioned: long connections, budget limit, limited walking, small children, fixed dates, etc."
                  },

                  // Budget
                  budget: { type: "string", description: "Budget range if mentioned, e.g. 'até R$ 30.000'." },

                  // Commercial signals
                  urgency_level: {
                    type: "string",
                    enum: ["alta", "media", "baixa"],
                    description: "How urgent the client seems."
                  },
                  closing_probability: {
                    type: "string",
                    enum: ["alta", "media", "baixa"],
                    description: "Likelihood of closing the deal."
                  },
                  client_profile: {
                    type: "string",
                    enum: ["premium", "padrao", "economico", "indeterminado"],
                    description: "Client spending profile inferred from conversation."
                  },

                  // AI-generated content
                  briefing_summary: {
                    type: "string",
                    description: "One paragraph summary of the client's travel demand in Portuguese. Clear, professional, concise."
                  },
                  proposal_title: {
                    type: "string",
                    description: "Suggested title for the proposal. E.g. 'Itália Romântica · 10 dias'"
                  },
                  intro_text: {
                    type: "string",
                    description: "Suggested introduction text for the proposal in Portuguese. 2-3 sentences, premium tone."
                  },
                  itinerary_suggestion: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        city: { type: "string" },
                        nights: { type: "number" },
                        highlights: { type: "string", description: "Brief highlights for this stop." }
                      },
                      required: ["city", "nights"]
                    },
                    description: "Suggested itinerary structure with nights per city."
                  },
                  next_steps: {
                    type: "array",
                    items: { type: "string" },
                    description: "Recommended next actions for the consultant. E.g. ['Cotar voo GRU-FCO', 'Selecionar hotéis 4★ em Roma']"
                  },
                  internal_notes: {
                    type: "string",
                    description: "Internal notes/observations for the consultant that shouldn't go to the client."
                  },

                  confidence: {
                    type: "string",
                    enum: ["high", "medium", "low", "none"],
                    description: "Overall confidence level of the extraction."
                  },
                },
                required: ["confidence", "briefing_summary"],
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
        // Attach client metadata
        briefing.client_name = clientName;
        briefing.client_id = conv?.client_id || null;
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
