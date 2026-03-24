import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const { description } = await req.json();
    if (!description || typeof description !== "string") {
      return new Response(JSON.stringify({ error: "description is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `Você é um assistente que interpreta descrições em linguagem natural para criar agentes de IA em um sistema de gestão de agência de viagens.

Dado um texto livre do usuário, extraia os campos estruturados do agente.

Setores válidos: Vendas, Operações, Financeiro, Marketing, Produto, Gestão.
Níveis válidos: basic, intermediate, advanced.
Escopos válidos: Propostas, Biblioteca de mídia, CRM, Financeiro, Vendas, Sistema geral.
Restrições comuns: Não executar automaticamente, Apenas sugerir, Não alterar dados sensíveis, Requer aprovação.

Retorne EXATAMENTE o JSON via tool call.`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/gpt-5-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: description },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "create_agent_profile",
                description:
                  "Structured agent profile extracted from user description.",
                parameters: {
                  type: "object",
                  properties: {
                    name: { type: "string", description: "Agent name, short" },
                    role: {
                      type: "string",
                      description: "Agent role/function description",
                    },
                    sector: { type: "string" },
                    level: {
                      type: "string",
                      enum: ["basic", "intermediate", "advanced"],
                    },
                    skills: {
                      type: "array",
                      items: { type: "string" },
                      description: "3-6 relevant skills",
                    },
                    scope: {
                      type: "array",
                      items: { type: "string" },
                      description: "Areas of operation",
                    },
                    restrictions: {
                      type: "array",
                      items: { type: "string" },
                      description: "Operational restrictions",
                    },
                    behaviorPrompt: {
                      type: "string",
                      description:
                        "Behavioral directive for the agent, 1-2 sentences",
                    },
                  },
                  required: [
                    "name",
                    "role",
                    "sector",
                    "level",
                    "skills",
                    "scope",
                    "restrictions",
                    "behaviorPrompt",
                  ],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "create_agent_profile" },
          },
        }),
      }
    );

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes para IA." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      throw new Error("No tool call in AI response");
    }

    const parsed = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-agent-description error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
