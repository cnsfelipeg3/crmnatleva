import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * simulator-ai — Edge function dedicada ao Simulador do AI Team.
 * 
 * Supports both Lovable AI Gateway and direct Anthropic API.
 * Pass `provider: "anthropic"` in the request body to use Anthropic.
 * 
 * Roteia automaticamente entre modelos conforme o tipo de chamada:
 *   - "lead"        → fast model (simula cliente fictício)
 *   - "agent"       → fast model (resposta do agente atendente)
 *   - "evaluate"    → powerful model (avaliação profunda)
 *   - "debrief"     → powerful model (análise final completa)
 *   - "objection"   → fast model (gera objeção contextual)
 *   - "loss"        → fast model (mensagem de perda motivada)
 *   - "deep"        → powerful model (análise profunda de melhoria)
 *   - "price_image" → Gemini Flash Image (gera print de orçamento)
 */

type CallType = "lead" | "agent" | "evaluate" | "debrief" | "objection" | "loss" | "deep" | "price_image";

function getModelConfig(type: CallType, provider: string): { model: string; stream: boolean } {
  if (type === "price_image") {
    return { model: "google/gemini-3.1-flash-image-preview", stream: false };
  }

  if (provider === "anthropic") {
    switch (type) {
      case "evaluate":
      case "debrief":
      case "deep":
        return { model: "claude-opus-4-5", stream: false };
      default:
        return { model: "claude-opus-4-5", stream: true };
    }
  }

  // Default Lovable AI Gateway models
  switch (type) {
    case "evaluate":
    case "debrief":
    case "deep":
      return { model: "openai/gpt-5", stream: false };
    default:
      return { model: "openai/gpt-5-mini", stream: true };
  }
}

async function callAnthropic(
  apiKey: string,
  messages: Array<{ role: string; content: string }>,
  model: string,
  stream: boolean,
): Promise<Response> {
  const systemMsg = messages.find(m => m.role === "system");
  const userMessages = messages.filter(m => m.role !== "system").map(m => ({
    role: m.role === "system" ? "user" as const : m.role as "user" | "assistant",
    content: m.content,
  }));

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system: systemMsg?.content || "",
      messages: userMessages,
      stream,
    }),
  });

  if (!response.ok) {
    const status = response.status;
    const t = await response.text();
    console.error("Anthropic API error:", status, t);
    if (status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit Anthropic excedido." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ error: `Erro Anthropic: ${status}` }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!stream) {
    const data = await response.json();
    const content = data.content?.[0]?.text || "";
    return new Response(JSON.stringify({ content, model, type: "anthropic" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Transform Anthropic SSE to OpenAI-compatible SSE
  const reader = response.body!.getReader();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const transformedStream = new ReadableStream({
    async start(controller) {
      let buffer = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let newlineIdx;
          while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
            const line = buffer.slice(0, newlineIdx).trim();
            buffer = buffer.slice(newlineIdx + 1);

            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6);
            if (jsonStr === "[DONE]") {
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              continue;
            }

            try {
              const evt = JSON.parse(jsonStr);
              if (evt.type === "content_block_delta" && evt.delta?.text) {
                const chunk = {
                  choices: [{ delta: { content: evt.delta.text }, index: 0 }],
                };
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
              } else if (evt.type === "message_stop") {
                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              }
            } catch { /* ignore */ }
          }
        }
      } catch (e) {
        console.error("Anthropic stream error:", e);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(transformedStream, {
    headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { type = "agent", systemPrompt, userPrompt, history, provider = "anthropic" } = body as {
      type?: CallType;
      systemPrompt?: string;
      userPrompt?: string;
      history?: Array<{ role: string; content: string }>;
      provider?: string;
    };

    const config = getModelConfig(type as CallType, provider);

    // Build messages array
    const messages: Array<{ role: string; content: string }> = [];
    if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
    if (history && history.length > 0) messages.push(...history);
    if (userPrompt) messages.push({ role: "user", content: userPrompt });

    if (messages.length === 0) {
      return new Response(JSON.stringify({ error: "No messages provided" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Price image always goes through Lovable AI Gateway (Gemini)
    if (type === "price_image") {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: config.model,
          messages,
          modalities: ["image", "text"],
        }),
      });

      if (!response.ok) {
        const t = await response.text();
        console.error("AI gateway image error:", response.status, t);
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit atingido para geração de imagem." }), {
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

    // Route to Anthropic
    if (provider === "anthropic") {
      const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
      if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not configured");
      return await callAnthropic(ANTHROPIC_API_KEY, messages, config.model, config.stream);
    }

    // Default: Lovable AI Gateway
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

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
        return new Response(JSON.stringify({ error: "Rate limit excedido." }), {
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

    if (config.stream) {
      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

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
