import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é um assistente inteligente para a NatLeva, uma agência de viagens premium no Brasil.

Seu papel é ajudar o atendente a responder clientes no WhatsApp de forma profissional, persuasiva e humana.

## Regras:
- Responda em português brasileiro, tom profissional mas acolhedor (padrão NatLeva Encantamento)
- Seja direto e objetivo — o atendente vai copiar sua resposta
- Não use formatação markdown complexa — mantenha texto simples para WhatsApp
- Adapte o tom ao contexto (novo lead = acolhedor, negociação = assertivo, pós-venda = cuidadoso)
- Nunca invente informações sobre destinos, pacotes ou preços — se não souber, sugira que o atendente confirme
- Gere 2-3 opções de resposta quando possível, com tons diferentes (formal, casual, assertivo)
- Separe cada opção com "---"
- Se o atendente fizer uma pergunta sobre como atender, responda como um coach de vendas de turismo experiente`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { mode, conversationHistory, customQuestion, contactName, stage } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const messages: Array<{ role: string; content: string }> = [
      { role: "system", content: SYSTEM_PROMPT },
    ];

    // Add conversation context
    if (conversationHistory && conversationHistory.length > 0) {
      const historyText = conversationHistory
        .slice(-15)
        .map((m: any) => `${m.sender_type === "cliente" ? contactName || "Cliente" : "Atendente"}: ${m.text}`)
        .join("\n");
      
      messages.push({
        role: "user",
        content: `[CONTEXTO DA CONVERSA]\nCliente: ${contactName || "Desconhecido"}\nEtapa: ${stage || "novo_lead"}\n\nÚltimas mensagens:\n${historyText}\n[FIM DO CONTEXTO]`,
      });
      messages.push({
        role: "assistant",
        content: "Entendi o contexto da conversa. Como posso ajudar?",
      });
    }

    if (mode === "reply") {
      messages.push({
        role: "user",
        content: "Gere 2-3 opções de resposta para a última mensagem do cliente. IMPORTANTE: Escreva APENAS o texto da mensagem que será enviada ao cliente, sem títulos, sem cabeçalhos como 'Opção 1:', sem descrições do tom. Separe cada opção APENAS com '---' em uma linha separada. Exemplo do formato:\n\nOlá, texto da primeira opção aqui...\n\n---\n\nTexto da segunda opção aqui...\n\n---\n\nTexto da terceira opção aqui...",
      });
    } else if (mode === "question") {
      messages.push({
        role: "user",
        content: customQuestion || "Como devo responder?",
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5-mini",
        messages,
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("livechat-ai-suggest error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
