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

    // Fetch last 60 messages from conversation
    const { data: messages, error: msgErr } = await sb
      .from("chat_messages")
      .select("content, sender_type, created_at, message_type")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(60);

    if (msgErr) throw msgErr;
    if (!messages?.length) {
      return new Response(JSON.stringify({ quote: null, confidence: "low", reason: "no_messages" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build transcript (reversed to chronological)
    const transcript = messages.reverse().map(m => {
      const sender = (m.sender_type === "cliente" || m.sender_type === "contact") ? "CLIENTE" : "CONSULTOR";
      return `[${sender}]: ${(m.content || "").slice(0, 300)}`;
    }).join("\n");

    const systemPrompt = `Você é um assistente de análise de conversas de uma agência de turismo premium (NatLeva Turismo).

Analise a transcrição abaixo e extraia as informações da viagem que está sendo cotada/negociada NO MOMENTO MAIS RECENTE da conversa.

PRIORIZE sempre as informações mais recentes. Se o cliente mudou de ideia, considere a última intenção.

Responda usando a ferramenta extract_quote_data.

Se não houver nenhuma viagem sendo discutida, retorne todos os campos como null e confidence como "none".`;

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
          { role: "user", content: `TRANSCRIÇÃO DA CONVERSA:\n\n${transcript}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_quote_data",
              description: "Extract travel quote details from conversation.",
              parameters: {
                type: "object",
                properties: {
                  origin: { type: "string", description: "City or airport of origin. Null if not mentioned." },
                  destination: { type: "string", description: "Destination city or country. Null if not mentioned." },
                  departure_date: { type: "string", description: "Departure date in DD/MM/YYYY or approximate period like 'outubro 2026'. Null if not mentioned." },
                  return_date: { type: "string", description: "Return date or duration like '10 dias'. Null if not mentioned." },
                  adults: { type: "number", description: "Number of adult passengers. Null if not mentioned." },
                  children: { type: "number", description: "Number of children. Null if not mentioned." },
                  babies: { type: "number", description: "Number of babies. Null if not mentioned." },
                  trip_type: { type: "string", description: "Type: lazer, lua de mel, família, corporativa, religioso, luxo, econômico, grupo, intercâmbio, cruzeiro, apenas aéreo, pacote completo. Null if unclear." },
                  hotel_preference: { type: "string", description: "Hotel preferences mentioned (category, chain, type). Null if not mentioned." },
                  flight_preference: { type: "string", description: "Flight preferences (direct, business class, airline). Null if not mentioned." },
                  other_preferences: { type: "string", description: "Other preferences or requirements. Null if none." },
                  budget: { type: "string", description: "Budget range mentioned, e.g. 'até R$ 30.000'. Null if not mentioned." },
                  quote_status: {
                    type: "string",
                    enum: ["sondagem_inicial", "levantando_informacoes", "cotacao_em_andamento", "proposta_enviada", "aguardando_resposta", "ajustando_opcoes", "quase_fechando"],
                    description: "Current negotiation stage inferred from conversation."
                  },
                  confidence: {
                    type: "string",
                    enum: ["high", "medium", "low", "none"],
                    description: "Confidence level of the extraction."
                  },
                  summary: { type: "string", description: "One-line summary of what the client wants, in Portuguese." },
                },
                required: ["confidence"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_quote_data" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit. Tente novamente." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    let quote = null;
    if (toolCall?.function?.arguments) {
      try {
        quote = JSON.parse(toolCall.function.arguments);
      } catch {
        quote = null;
      }
    }

    return new Response(JSON.stringify({ quote }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract-quote-context error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
