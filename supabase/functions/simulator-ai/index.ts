import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * simulator-ai — Edge function dedicada ao Simulador do AI Team.
 * 
 * Roteia automaticamente entre modelos conforme o tipo de chamada:
 *   - "lead"        → GPT-5 Mini (rápido, simula cliente fictício)
 *   - "agent"       → GPT-5 Mini (resposta do agente atendente)
 *   - "evaluate"    → GPT-5 (avaliação profunda 3 dimensões)
 *   - "debrief"     → GPT-5 (análise final completa)
 *   - "objection"   → GPT-5 Mini (gera objeção contextual)
 *   - "loss"        → GPT-5 Mini (mensagem de perda motivada)
 *   - "deep"        → GPT-5 (análise profunda de melhoria)
 *   - "price_image" → Gemini Flash Image (gera print de orçamento)
 */

type CallType = "lead" | "agent" | "evaluate" | "debrief" | "objection" | "loss" | "deep" | "price_image";

function getModelConfig(type: CallType): { model: string; stream: boolean } {
  switch (type) {
    case "evaluate":
    case "debrief":
    case "deep":
      return { model: "openai/gpt-5", stream: false };
    case "price_image":
      return { model: "google/gemini-3.1-flash-image-preview", stream: false };
    case "lead":
    case "agent":
    case "objection":
    case "loss":
    default:
      return { model: "openai/gpt-5-mini", stream: true };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { type = "agent", systemPrompt, userPrompt, history } = body as {
      type?: CallType;
      systemPrompt?: string;
      userPrompt?: string;
      history?: Array<{ role: string; content: string }>;
    };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const config = getModelConfig(type as CallType);

    // Build messages array
    const messages: Array<{ role: string; content: string }> = [];
    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }
    if (history && history.length > 0) {
      messages.push(...history);
    }
    if (userPrompt) {
      messages.push({ role: "user", content: userPrompt });
    }

    // Fallback if no messages
    if (messages.length === 0) {
      return new Response(JSON.stringify({ error: "No messages provided" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Price image generation uses image modality
    if (type === "price_image") {
      const requestBody = {
        model: config.model,
        messages,
        modalities: ["image", "text"],
      };

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const t = await response.text();
        console.error("AI gateway image error:", response.status, t);
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit atingido para geração de imagem. Aguarde alguns segundos e tente novamente." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ error: "Erro ao gerar imagem" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";
      const images = data.choices?.[0]?.message?.images || [];
      const imageUrl = images[0]?.image_url?.url || null;

      return new Response(JSON.stringify({ content, imageUrl, model: config.model, type }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Standard text completion
    const requestBody: any = {
      model: config.model,
      messages,
      stream: config.stream,
    };

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit excedido. Tente novamente." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", status, t);
      return new Response(JSON.stringify({ error: "Erro na IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For streaming responses, pass through
    if (config.stream) {
      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // For non-streaming (evaluate, debrief, deep), return JSON
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ content, model: config.model, type }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("simulator-ai error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
