import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * agent-chat — Supports both Lovable AI Gateway and direct Anthropic API.
 * Provider selection: pass `provider` in the request body.
 *   - "anthropic" → uses ANTHROPIC_API_KEY with Anthropic Messages API
 *   - default     → uses LOVABLE_API_KEY with Lovable AI Gateway
 */

async function callAnthropic(
  apiKey: string,
  systemPrompt: string,
  messages: Array<{ role: string; content: string }>,
  model: string,
  retryCount: number = 0,
): Promise<Response> {
  // Anthropic Messages API format
  const anthropicMessages = messages.map(m => ({
    role: m.role === "system" ? "user" : m.role,
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
      max_tokens: 2048,
      system: systemPrompt,
      messages: anthropicMessages,
      stream: true,
    }),
  });

  if (!response.ok) {
    const status = response.status;
    const t = await response.text();
    console.error("Anthropic API error:", status, t);

    // Retry on 429/529/503 with exponential backoff
    if ((status === 429 || status === 529 || status === 503) && retryCount < 5) {
      const delayMs = Math.min(20000, 2500 * Math.pow(2, retryCount)) + Math.floor(Math.random() * 1200);
      console.log(`Anthropic ${status}, retrying in ${delayMs}ms (attempt ${retryCount + 1}/5)`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
      return callAnthropic(apiKey, systemPrompt, messages, model, retryCount + 1);
    }

    if (status === 429 || status === 529 || status === 503) {
      return new Response(JSON.stringify({ error: "Anthropic sobrecarregada. Aguarde alguns segundos e tente novamente." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ error: "Erro na API Anthropic" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Transform Anthropic SSE to OpenAI-compatible SSE
  const reader = response.body!.getReader();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const stream = new ReadableStream({
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
                // Convert to OpenAI format
                const openAiChunk = {
                  choices: [{ delta: { content: evt.delta.text }, index: 0 }],
                };
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(openAiChunk)}\n\n`));
              } else if (evt.type === "message_stop") {
                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              }
            } catch { /* ignore parse errors */ }
          }
        }
      } catch (e) {
        console.error("Stream transform error:", e);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const {
      question,
      agentName,
      agentRole,
      provider = "anthropic",
      model = "claude-sonnet-4-20250514",
      history,
      agentBehaviorPrompt,
      agentId,
      teamContext,
      rawMode,
      rawSystemPrompt,
    } = await req.json();

    let systemPrompt: string;

    if (rawMode && rawSystemPrompt) {
      systemPrompt = rawSystemPrompt;
    } else {
      // ─── Fetch approved improvements from DB ───
      let improvementsBlock = "";
      try {
        const sbUrl = Deno.env.get("SUPABASE_URL");
        const sbKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY");
        if (sbUrl && sbKey) {
          const impResp = await fetch(`${sbUrl}/rest/v1/ai_team_improvements?status=eq.approved&order=created_at.desc&limit=20`, {
            headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` },
          });
          if (impResp.ok) {
            const improvements = await impResp.json();
            const relevant = (improvements || []).filter((imp: any) => !imp.agent_id || imp.agent_id === agentId);
            if (relevant.length > 0) {
              const lines = relevant.map((imp: any) => {
                const prefix = imp.category === "global_rule" || imp.category === "regra_global" ? "[REGRA]" : "[MELHORIA]";
                return `${prefix} ${imp.title}: ${imp.description}`;
              });
              improvementsBlock = `\n\nMELHORIAS APRENDIDAS (aplique sempre):\n${lines.join("\n")}\n`;
            }
          }
        }
      } catch (e) {
        console.warn("Failed to fetch improvements:", e);
      }

      // ─── Time-aware greeting (Brasília UTC-3) ───
      const nowUtc = new Date();
      const brasilFormatter = new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: "America/Sao_Paulo" });
      const brasilHour = parseInt(brasilFormatter.format(nowUtc), 10);
      const saudacao = brasilHour < 12 ? "bom dia" : brasilHour < 18 ? "boa tarde" : "boa noite";

      const behaviorCore = `## TOM DE COMUNICACAO (PRIORIDADE ABSOLUTA)
Voce e uma consultora REAL de viagens no WhatsApp. Fale como uma pessoa normal, NAO como chatbot.

REGRAS OBRIGATORIAS:
1. Direta e natural. Sem floreios.
2. PROIBIDO frases poeticas/sensoriais sobre destinos ("ruelas encantadoras", "cores vibrantes", "pulsa cultura", "aromas de especiarias", "aguas cristalinas", "paraiso", "ja consigo imaginar...").
3. PROIBIDO exageros emocionais ("que incrivel!", "que maravilhoso!", "fico tao feliz!", "viagem dos sonhos", "experiencia inesquecivel").
4. Casual de WhatsApp — frases curtas, sem formalidade exagerada.
5. Util > bajuladora.
6. Reacao PROPORCIONAL: "quero ir pra Barcelona" → "Legal! Quando pretende ir?" — NUNCA "Que escolha maravilhosa!".
7. Emoji RARO: maioria das mensagens SEM emoji. Maximo 1 a cada 3-4 mensagens (😊 🙂 ✈️). NUNCA em mensagens consecutivas. NUNCA 🌟✨🎉.
8. Maximo 3-4 frases por resposta.
9. Perguntas PRATICAS (datas, orcamento, pax) > elogios ao destino.
10. NUNCA travessao (— ou –).

EXEMPLOS (note: maioria SEM emoji):
Cliente: "Quero ir pra Barcelona"
✅ "Barcelona e otima! Ja tem datas em mente?"
❌ "Que destino incrivel! Ja consigo imaginar as ruelas e cores..."

Cliente: "Boa tarde, tudo bem?"
✅ "Boa tarde! Tudo sim, e voce? Em que posso ajudar?"
❌ "Oii, boa tarde!! Fico super feliz em falar com voce! 😄✨"

REGRA DE OURO: se sua mensagem anterior teve emoji, esta NAO deve ter.

REGRA DE SAUDACAO — HORARIO: Agora sao ${String(brasilHour).padStart(2, "0")}h em Brasilia. Saudacao correta: "${saudacao}".
- Se o cliente cumprimentar, responda com "${saudacao}". Se nao usar, voce tambem nao precisa.

ANTI-REPETICAO:
- NUNCA repita uma pergunta ja feita, mesmo reformulada.
- Se o lead ja deu uma info, USE-A — nao pergunte de novo.
- Releia TODA a conversa antes de responder.
- Siga o ritmo do cliente.

NUNCA FACA:
- "ja consigo imaginar...", "encantador(a)", "viagem dos sonhos", "experiencia inesquecivel"
- Descricoes poeticas (ruelas, cores, aromas, brisa, dunas)
- "que incrivel!", "que maravilhoso!", "fico super animada"
- Mensagens longas — maximo 3-4 frases.`;

      const agentDirectives = agentBehaviorPrompt ? `\n\nDIRETIVAS ESPECÍFICAS:\n${agentBehaviorPrompt}` : "";
      const teamBlock = teamContext ? `\n\n${teamContext}` : "";

      systemPrompt = `${behaviorCore}${agentDirectives}${teamBlock}${improvementsBlock}

Você é o ${agentName}, um agente de IA da agência de viagens NatLeva, responsável por: ${agentRole}.
Responda com humanidade, conexão emocional e inteligência consultiva.
Responda sempre em português brasileiro.`;
    }

    const userMessages: Array<{ role: string; content: string }> = [];
    if (history && history.length > 0) {
      userMessages.push(...history);
    }
    if (question) {
      userMessages.push({ role: "user", content: question });
    }

    // Route to Anthropic
    if (provider === "anthropic") {
      const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
      if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not configured");
      return await callAnthropic(ANTHROPIC_API_KEY, systemPrompt, userMessages, model);
    }

    // Fallback to Lovable AI Gateway
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const messages = [
      { role: "system", content: systemPrompt },
      ...userMessages,
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model || "openai/gpt-5-mini",
        messages,
        stream: true,
      }),
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

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("agent-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
