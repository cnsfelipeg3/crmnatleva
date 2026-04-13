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

  // 60k limit: Maya's system prompt includes the full knowledge base (KB) which can be 20-40k chars.
  // Truncating at 10k was cutting off the KB entirely, causing hallucinations.
  const compactSystem = systemMsg?.content
    ? (systemMsg.content.length > 60000 ? `${systemMsg.content.slice(0, 60000)}...` : systemMsg.content)
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

    // Retry on 429 (rate limit) and 529 (overloaded)
    if ((status === 429 || status === 529 || status === 503) && retryCount < 5) {
      const delayMs = Math.min(20000, 2500 * Math.pow(2, retryCount)) + Math.floor(Math.random() * 1200);
      console.log(`Anthropic ${status}, retrying in ${delayMs}ms (attempt ${retryCount + 1}/5)`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
      return callAnthropic(apiKey, messages, model, stream, Math.max(250, Math.floor(maxTokens * 0.6)), retryCount + 1);
    }

    if (status === 429 || status === 529 || status === 503) {
      return new Response(JSON.stringify({ error: "Anthropic sobrecarregada. Aguarde alguns segundos e tente novamente." }), {
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
  // First, peek at the stream to detect errors (Anthropic sends 200 with error in body)
  const peekReader = response.body!.getReader();
  const peekDecoder = new TextDecoder();
  const { done: peekDone, value: peekValue } = await peekReader.read();
  
  if (peekDone || !peekValue) {
    throw new Error("Anthropic returned empty stream");
  }
  
  const firstChunk = peekDecoder.decode(peekValue, { stream: true });
  
  // Detect error events in the stream (e.g. overloaded_error)
  if (firstChunk.includes('"type":"error"') || firstChunk.includes("overloaded_error")) {
    console.error("Anthropic stream error detected in first chunk:", firstChunk.slice(0, 300));
    peekReader.releaseLock();
    throw new Error("Anthropic overloaded");
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const transformedStream = new ReadableStream({
    async start(controller) {
      let buffer = firstChunk; // Start with the peeked chunk
      let chunksEmitted = 0;
      
      const processBuffer = () => {
        let newlineIdx;
        while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, newlineIdx).trim();
          buffer = buffer.slice(newlineIdx + 1);

          if (!line || line.startsWith("event:")) continue;
          if (!line.startsWith("data: ") && !line.startsWith("data:")) continue;
          const jsonStr = line.startsWith("data: ") ? line.slice(6) : line.slice(5);
          const trimmedJson = jsonStr.trim();
          if (trimmedJson === "[DONE]") {
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            continue;
          }

          try {
            const evt = JSON.parse(trimmedJson);
            if (evt.type === "content_block_delta" && evt.delta?.text) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: evt.delta.text }, index: 0 }] })}\n\n`));
              chunksEmitted++;
            } else if (evt.type === "message_stop") {
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            }
          } catch { /* ignore */ }
        }
      };

      try {
        processBuffer(); // Process the first chunk
        while (true) {
          const { done, value } = await peekReader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          processBuffer();
        }
        console.log(`Anthropic stream complete: ${chunksEmitted} chunks`);
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

1. RAPPORT NATURAL: Reconheça brevemente o que o lead disse, mas SEM frases de validação artificiais. NÃO comece com "Que linda ideia", "Adorei saber disso", "Que incrível". Apenas demonstre que leu e entendeu, e siga a conversa com naturalidade. Se não há nada genuíno para comentar, vá direto ao ponto.

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

9. PROIBIDO FRASES DE VALIDAÇÃO FORÇADA:
   · NUNCA abra mensagem com: "Que linda ideia", "Adorei isso", "Que demais saber que", "Que incrível", "Adorei essa cena", "Adorei saber disso"
   · Se quiser reagir, use frases curtas e naturais como: "Boa!", "Faz total sentido", "Entendi", "Show, então..."
   · Na dúvida, NÃO reaja. Vá direto ao assunto.

10. PROIBIDO RECAP DE DADOS:
   · NUNCA resuma de volta para o cliente dados que ele acabou de fornecer. Ele já sabe o que disse.
   · Exemplo PROIBIDO: "Entendi, viagem corporativa pra Roma em nov/26 com 3 a 5 executivos."
   · Exemplo CORRETO: "Show, Ju. É a primeira vez de vocês em Roma?"
   · Avance a conversa em vez de repetir o que já foi dito.

11. EXPLORAR ANTES DE PROMETER:
   · NUNCA diga "vou montar as melhores opções" ou "vou preparar uma proposta" antes de ter todos os dados essenciais (orçamento, preferências, datas confirmadas).
   · Quando o lead compartilhar experiência relevante (ex: "já viajei pela Europa"), EXPLORE: "Quais cidades você mais curtiu?" para calibrar o nível da proposta.
   · Perguntas de aprofundamento > promessas prematuras.
`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { type = "agent", systemPrompt, userPrompt, history, provider = "lovable", agentBehaviorPrompt } = body as {
      type?: CallType;
      systemPrompt?: string;
      userPrompt?: string;
      history?: Array<{ role: string; content: string }>;
      provider?: string;
      agentBehaviorPrompt?: string;
    };

    const config = getModelConfig(type as CallType, provider);

    // Inject NATLEVA_BEHAVIOR_CORE into system prompt for agent-type calls
    let enrichedSystemPrompt = systemPrompt || "";
    if (type !== "price_image" && enrichedSystemPrompt) {
      enrichedSystemPrompt = NATLEVA_BEHAVIOR_CORE + "\n\n" + enrichedSystemPrompt;
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

    // Helper: call Lovable AI Gateway (used as primary or fallback)
    const callLovableGateway = async (msgs: typeof messages, callType: CallType, shouldStream: boolean) => {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
      const fallbackConfig = getModelConfig(callType, "lovable");
      const requestBody: any = {
        model: fallbackConfig.model,
        messages: msgs,
        stream: shouldStream,
      };
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });
      return { response, config: fallbackConfig };
    };

    // Route to Anthropic (with auto-fallback to Lovable Gateway)
    if (provider === "anthropic") {
      const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
      if (ANTHROPIC_API_KEY) {
        try {
          const result = await callAnthropic(ANTHROPIC_API_KEY, messages, config.model, config.stream, config.maxTokens);
          // Check if the response is an error (non-stream responses with error status)
          if (result.status >= 400) {
            console.log(`Anthropic returned ${result.status}, falling back to Lovable AI Gateway`);
          } else {
            return result;
          }
        } catch (e) {
          console.error("Anthropic exception, falling back to Lovable:", e);
        }
      }
      // Fallback to Lovable AI Gateway
      console.log("Using Lovable AI Gateway as fallback");
    }

    // Default / Fallback: Lovable AI Gateway
    const { response, config: gwConfig } = await callLovableGateway(messages, type as CallType, true);

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

    if (gwConfig.stream) {
      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ content, model: gwConfig.model, type }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("simulator-ai error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
