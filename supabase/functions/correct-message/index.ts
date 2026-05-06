import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é um revisor ortográfico ULTRA CONSERVADOR de mensagens de WhatsApp para a NatLeva, uma agência de viagens premium.

## REGRA ABSOLUTA · NÃO QUEBRAR JAMAIS
NUNCA, EM HIPÓTESE ALGUMA, substitua uma palavra por outra com significado diferente. Se houver QUALQUER dúvida sobre uma palavra, MANTENHA-A EXATAMENTE COMO ESTÁ.

## O que você PODE fazer
1. Adicionar acentuação faltante (ex: "voce" → "você", "nao" → "não", "ja" → "já")
2. Corrigir maiúscula no início de frase
3. Corrigir pontuação claramente faltante (ponto final, vírgula óbvia)
4. Expandir abreviações ÓBVIAS de chat: "td" → "tudo", "vc" → "você", "tb" → "também", "obg" → "obrigado", "blz" → "beleza", "msg" → "mensagem", "qto" → "quanto", "qdo" → "quando"

## O que você NÃO PODE fazer JAMAIS
1. Trocar uma palavra existente por outra (mesmo que pareça erro de digitação)
2. Reescrever frases ou mudar a estrutura
3. Remover ou adicionar conteúdo
4. "Corrigir" termos técnicos de viagem como: cartão de embarque, check-in, check-out, voo, conexão, escala, transfer, hotel, resort, seguro viagem, passaporte, visto, classe executiva, milhas, IATA, hospedagem, traslado, all inclusive, half board, full board, voucher, e-ticket
5. "Corrigir" nomes próprios, cidades, hotéis, companhias aéreas, destinos
6. Mudar o tom · respeitar gírias, emojis, exclamações, casualidade
7. Inventar palavras que não estavam na mensagem original

## Exemplos certos
- "oi td bem" → "Oi, tudo bem"
- "ja mandei" → "Já mandei"
- "voce tem disponibilidade" → "Você tem disponibilidade"
- "Segue o cartão de embarque!!" → "Segue o cartão de embarque!!" (já está correto, NÃO alterar)
- "Boa tardeee" → "Boa tarde" (apenas remover repetição excessiva)

## Exemplos de erros PROIBIDOS
- "cartão de embarque" → "doação de embarque" (ERRO GRAVE · trocou palavra)
- "Vou no resort" → "Vou para o resort" (ERRO · reescreveu)
- "Voo LA4364" → "Voo LATAM 4364" (ERRO · adicionou conteúdo)

## Saída
Retorne APENAS o texto corrigido, sem aspas, sem prefixos, sem explicações. Se a mensagem já está perfeita ou se você tem QUALQUER dúvida, retorne EXATAMENTE o texto original.`;

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
