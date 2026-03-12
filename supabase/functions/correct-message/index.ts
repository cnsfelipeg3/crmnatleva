import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é um corretor de mensagens profissional para a FEBEAL Motors, uma concessionária de veículos premium.

Sua ÚNICA tarefa é receber uma mensagem de um atendente e devolver a versão corrigida.

## Regras:
1. Corrija erros ortográficos, de acentuação e pontuação
2. Corrija erros gramaticais (concordância verbal e nominal)
3. Adapte o tom para profissional, claro e objetivo
4. Remova gírias, expressões informais ou linguagem fora do padrão corporativo
5. Mantenha o significado original da mensagem intacto
6. NÃO adicione informações que não existiam na mensagem original
7. NÃO mude o assunto ou conteúdo da mensagem
8. Se a mensagem já estiver correta e profissional, retorne-a sem alterações
9. Retorne APENAS o texto corrigido, sem explicações, sem aspas, sem prefixos

Exemplos:
- "oi td bem? o carro ta pronto" → "Olá, tudo bem? O carro está pronto."
- "fala mano, bora fechar esse negocio" → "Olá! Vamos fechar esse negócio?"
- "ja mandei o doc la" → "Já enviei o documento."`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { text } = await req.json();
    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return new Response(JSON.stringify({ corrected: text || "" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Skip very short messages (emojis, "ok", etc.)
    if (text.trim().length <= 3) {
      return new Response(JSON.stringify({ corrected: text.trim() }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(JSON.stringify({ corrected: text }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: text },
        ],
      }),
    });

    if (!response.ok) {
      console.error("AI gateway error:", response.status);
      return new Response(JSON.stringify({ corrected: text }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const corrected = data.choices?.[0]?.message?.content?.trim() || text;

    return new Response(JSON.stringify({ corrected }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("correct-message error:", e);
    return new Response(JSON.stringify({ corrected: "" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
