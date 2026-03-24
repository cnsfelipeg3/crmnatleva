import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, clientContext, provider: reqProvider } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!LOVABLE_API_KEY && !ANTHROPIC_API_KEY) throw new Error("No AI API key configured");

    // Fetch knowledge base and rules from DB
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey);

    // Fetch active knowledge base entries
    const { data: kbEntries } = await sb
      .from("ai_knowledge_base")
      .select("title, category, content_text, file_url, file_type")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(50);

    // Fetch AI config/rules
    const { data: configData } = await sb
      .from("ai_config")
      .select("config_key, config_value");

    const config: Record<string, string> = {};
    (configData || []).forEach((c: any) => { config[c.config_key] = c.config_value; });

    // Build knowledge base context
    let knowledgeBlock = "";
    if (kbEntries && kbEntries.length > 0) {
      const kbTexts = kbEntries
        .filter((e: any) => e.content_text)
        .map((e: any) => `### ${e.title} [${e.category}]\n${e.content_text}`)
        .join("\n\n");
      if (kbTexts) {
        knowledgeBlock = `\n## BASE DE CONHECIMENTO (USE COMO REFERÊNCIA PRIORITÁRIA)\n${kbTexts}\n`;
      }
    }

    // Build rules block
    let rulesBlock = "";
    const tone = config["ai_tone"] || "premium";
    const formality = config["ai_formality"] || "formal";
    const guidelines = config["ai_guidelines"] || "";
    const forbidden = config["ai_forbidden"] || "";
    const greetingTemplate = config["ai_greeting_template"] || "";
    const closingTemplate = config["ai_closing_template"] || "";

    rulesBlock = `
## REGRAS DE COMPORTAMENTO
- Tom de voz: ${tone}
- Formalidade: ${formality}
${guidelines ? `- Diretrizes: ${guidelines}` : ""}
${forbidden ? `- NUNCA FAZER: ${forbidden}` : ""}
${greetingTemplate ? `- Template de saudação: ${greetingTemplate}` : ""}
${closingTemplate ? `- Template de encerramento: ${closingTemplate}` : ""}
`;

    const contextBlock = clientContext ? `
## CONTEXTO DO CLIENTE
- Nome: ${clientContext.name || "Desconhecido"}
- Score: ${clientContext.score ?? "N/A"}/100
- Cluster: ${clientContext.cluster || "N/A"}
- Nível: ${clientContext.level || "N/A"}
- Total gasto: R$ ${clientContext.totalSpent?.toLocaleString("pt-BR") || "0"}
- Viagens: ${clientContext.tripCount || 0}
- Ticket médio: R$ ${clientContext.avgTicket?.toLocaleString("pt-BR") || "0"}
- Margem média: ${clientContext.avgMargin || "0"}%
- Última compra: ${clientContext.lastPurchase || "N/A"}
- Destino favorito: ${clientContext.favoriteDestination || "N/A"}
- Perfil: ${clientContext.profile || "N/A"}
- Pendências: ${clientContext.pendencies || "Nenhuma"}
` : "";

    const systemPrompt = `Você é o assistente de vendas da NatLeva Turismo, uma agência premium de viagens.

Seu papel é analisar mensagens de clientes e gerar respostas profissionais para os vendedores enviarem.

${rulesBlock}

${knowledgeBlock}

## REGRAS GERAIS
1. NUNCA envie respostas diretamente ao cliente. Você gera SUGESTÕES para o vendedor.
2. Adapte o tom conforme o perfil do cliente (VIP = premium e exclusivo, Econômico = objetivo e claro).
3. Seja caloroso, profissional e consultivo.
4. Use emojis com moderação (1-2 por mensagem).
5. Sempre tente avançar o funil de vendas naturalmente.
6. Se o cliente mencionar destino, período ou número de pessoas, destaque isso.
7. PRIORIZE o conteúdo da Base de Conhecimento ao responder.

## FORMATO DE RESPOSTA (JSON)
Responda SEMPRE em JSON válido com esta estrutura:
{
  "suggestion": "texto da resposta sugerida para o vendedor enviar",
  "intent": "classificação da intenção (consulta_destino, preco, pagamento, documento, reclamacao, pos_venda, saudacao, urgencia, outro)",
  "destination": "destino identificado ou null",
  "urgency": "normal | media | alta | critica",
  "tags": ["array de tags sugeridas"],
  "funnel_stage": "novo_lead | qualificacao | orcamento_enviado | negociacao | fechado | pos_venda",
  "reasoning": "breve explicação da análise para o vendedor"
}

${contextBlock}`;

    // Determine provider: prefer Anthropic if key exists, else Lovable
    const useAnthropic = (reqProvider === "anthropic" || (!reqProvider && ANTHROPIC_API_KEY));

    let data;
    if (useAnthropic && ANTHROPIC_API_KEY) {
      const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-opus-4-5",
          max_tokens: 4096,
          system: systemPrompt,
          messages: messages.map((m: any) => ({ role: m.role === "system" ? "user" : m.role, content: m.content })),
        }),
      });

      if (!anthropicResponse.ok) {
        const status = anthropicResponse.status;
        const t = await anthropicResponse.text();
        console.error("Anthropic error:", status, t);
        if (status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit Anthropic excedido." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ error: "Erro na Anthropic" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const anthropicData = await anthropicResponse.json();
      data = { choices: [{ message: { content: anthropicData.content?.[0]?.text || "" } }] };
    } else {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/gpt-5",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
          ],
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const t = await response.text();
        console.error("AI gateway error:", response.status, t);
        return new Response(JSON.stringify({ error: "Erro na IA" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      data = await response.json();
    }
    const content = data.choices?.[0]?.message?.content || "";

    // Try to parse JSON from the response
    let parsed;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { suggestion: content, intent: "outro", urgency: "normal", tags: [], funnel_stage: "novo_lead", reasoning: "" };
    } catch {
      parsed = { suggestion: content, intent: "outro", urgency: "normal", tags: [], funnel_stage: "novo_lead", reasoning: "" };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("livechat-ai error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
