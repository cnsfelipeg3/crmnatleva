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

function getModelConfig(type: CallType, provider: string): { model: string; stream: boolean; maxTokens: number } {
  if (type === "price_image") {
    return { model: "google/gemini-3.1-flash-image-preview", stream: false, maxTokens: 1024 };
  }

  if (provider === "anthropic") {
    switch (type) {
      // Heavy reasoning → Claude Opus (máxima qualidade de análise)
      case "evaluate":
      case "debrief":
      case "deep":
        return { model: "claude-opus-4-20250514", stream: false, maxTokens: 4000 };
      // Fast conversational → Sonnet (custo-eficiente, excelente para diálogo)
      case "lead":
      case "objection":
      case "loss":
        return { model: "claude-sonnet-4-20250514", stream: true, maxTokens: 800 };
      case "agent":
      default:
        return { model: "claude-sonnet-4-20250514", stream: true, maxTokens: 1200 };
    }
  }

  // Default Lovable AI Gateway models
  switch (type) {
    case "evaluate":
    case "debrief":
    case "deep":
      return { model: "openai/gpt-5", stream: false, maxTokens: 3000 };
    default:
      return { model: "openai/gpt-5-mini", stream: true, maxTokens: 1200 };
  }
}

async function callAnthropic(
  apiKey: string,
  messages: Array<{ role: string; content: string }>,
  model: string,
  stream: boolean,
  maxTokens: number = 1200,
  retryCount: number = 0,
): Promise<Response> {
  const systemMsg = messages.find(m => m.role === "system");
  const nonSystemMessages = messages.filter(m => m.role !== "system");

  // Sanitize: ensure alternating roles (Anthropic rejects consecutive same-role)
  const sanitized: Array<{ role: "user" | "assistant"; content: string }> = [];
  for (const m of nonSystemMessages) {
    const role: "user" | "assistant" = (m.role === "assistant") ? "assistant" : "user";
    const content = typeof m.content === "string"
      ? (m.content.length > 1200 ? `${m.content.slice(0, 1200)}...` : m.content)
      : String(m.content);

    if (!content || content.trim() === "") continue;

    // Merge consecutive same-role messages
    if (sanitized.length > 0 && sanitized[sanitized.length - 1].role === role) {
      sanitized[sanitized.length - 1].content += "\n\n" + content;
    } else {
      sanitized.push({ role, content });
    }
  }

  // Anthropic requires first message to be "user"
  if (sanitized.length > 0 && sanitized[0].role !== "user") {
    sanitized.unshift({ role: "user", content: "Início da conversa." });
  }

  // Ensure non-empty
  if (sanitized.length === 0) {
    sanitized.push({ role: "user", content: "Olá" });
  }

  const compactMessages = sanitized;

  const compactSystem = systemMsg?.content
    ? (systemMsg.content.length > 6000 ? `${systemMsg.content.slice(0, 6000)}...` : systemMsg.content)
    : "";

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system: compactSystem,
      messages: compactMessages,
      stream,
    }),
  });

  if (!response.ok) {
    const status = response.status;
    const t = await response.text();
    console.error("Anthropic API error:", status, t);

    if (status === 429 && retryCount < 5) {
      const delayMs = Math.min(20000, 2500 * Math.pow(2, retryCount)) + Math.floor(Math.random() * 1200);
      await new Promise(resolve => setTimeout(resolve, delayMs));
      return callAnthropic(apiKey, messages, model, stream, Math.max(250, Math.floor(maxTokens * 0.6)), retryCount + 1);
    }

    if (status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit Anthropic excedido. Aguarde alguns segundos e tente novamente." }), {
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

// ─── BEHAVIORAL DIRECTIVES (injected into ALL agent prompts) ───
const NATLEVA_BEHAVIOR_CORE = `
DIRETIVAS COMPORTAMENTAIS NATLEVA (PRIORIDADE MÁXIMA):

1. RAPPORT ANTES DE TUDO: Sempre reaja ao que o lead disse ANTES de fazer qualquer pergunta. Comente, valide, demonstre interesse genuíno.

2. PROIBIDO COMPORTAMENTO MECÂNICO: NUNCA faça perguntas em sequência como formulário. Cada pergunta deve nascer naturalmente do contexto da conversa.

3. VENDA INVISÍVEL: Gere desejo ANTES de falar em preço. Faça o cliente se imaginar na viagem. A venda acontece como consequência natural da conversa.

4. ADAPTAÇÃO DINÂMICA: Ajuste linguagem e ritmo conforme o perfil do lead:
   · Animado → acompanhe a energia
   · Inseguro → aprofunde com segurança  
   · Racional → seja mais direto e lógico
   · Emocional → explore o sonho e a experiência

5. STORYTELLING: Descreva cenários, sensações e momentos. NUNCA liste informações friamente.

6. FORMATO: Máximo 1 emoji por mensagem. NUNCA use travessão. NUNCA use tabelas. Tom premium e acessível.

7. CONTINUIDADE: Mantenha contexto total. NUNCA repita perguntas já respondidas. Em handoffs, demonstre conhecimento do que foi conversado.

8. RITMO HUMANO: Construção progressiva. Não responda tudo de uma vez. Fluidez natural.
`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { type = "agent", systemPrompt, userPrompt, history, provider = "anthropic", agentBehaviorPrompt } = body as {
      type?: CallType;
      systemPrompt?: string;
      userPrompt?: string;
      history?: Array<{ role: string; content: string }>;
      provider?: string;
      agentBehaviorPrompt?: string;
    };

    const config = getModelConfig(type as CallType, provider);

    // Build enriched system prompt with behavioral directives for agent types
    let enrichedSystemPrompt = systemPrompt || "";
    if (type === "agent" && enrichedSystemPrompt) {
      enrichedSystemPrompt = `${NATLEVA_BEHAVIOR_CORE}\n\n${agentBehaviorPrompt ? `DIRETIVAS ESPECÍFICAS DO AGENTE:\n${agentBehaviorPrompt}\n\n` : ""}${enrichedSystemPrompt}`;
    }

    // Build messages array
    const messages: Array<{ role: string; content: string }> = [];
    if (enrichedSystemPrompt) messages.push({ role: "system", content: enrichedSystemPrompt });
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
      return await callAnthropic(ANTHROPIC_API_KEY, messages, config.model, config.stream, config.maxTokens);
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
