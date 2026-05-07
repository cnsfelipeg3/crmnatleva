import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é um especialista em criar fichas comerciais de passeios e experiências turísticas para a NatLeva, uma agência de viagens premium.

Você vai receber a transcrição (e/ou conhecimento já estruturado) de um vídeo do YouTube sobre um passeio/experiência turística. Sua missão é EXTRAIR e ESTRUTURAR todas as informações relevantes em um produto de catálogo.

REGRAS CRÍTICAS:
1. Use APENAS informações realmente mencionadas no vídeo. Não invente dados.
2. Se uma informação não estiver no vídeo, deixe o campo vazio ou null.
3. NUNCA inclua preços de terceiros (Booking, GetYourGuide, Viator, etc) nos campos públicos. Se houver menção de preços, ignore (a NatLeva tem precificação própria).
4. Tom: claro, elegante, profissional. Sem emojis. Sem firula poética.
5. Língua: pt-BR.
6. Listas devem ser itens curtos e objetivos (uma frase por item).
7. Title: nome curto e direto do passeio (ex: "Isla Saona · Dia Completo").
8. short_description: 1 frase de impacto, máximo 160 caracteres.
9. description: 2-4 parágrafos contando a experiência.
10. how_it_works: passo a passo cronológico do dia/passeio.`;

const PRODUCT_TOOL = {
  type: "function",
  function: {
    name: "create_experience_product",
    description: "Cria a estrutura de um produto/experiência turística a partir do conteúdo do vídeo.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Nome curto do passeio" },
        destination: { type: "string", description: "Cidade/região destino (ex: Punta Cana)" },
        destination_country: { type: "string", description: "País" },
        category: { type: "string", description: "passeio, excursao, transfer, ingresso, gastronomia, etc" },
        short_description: { type: "string", description: "Frase de impacto, max 160 chars" },
        description: { type: "string", description: "Descrição completa em 2-4 parágrafos" },
        duration: { type: "string", description: "Ex: 'Dia inteiro · ~9h'" },
        how_it_works: { type: "string", description: "Passo a passo do passeio" },
        pickup_info: { type: "string", description: "Como funciona o encontro/transporte" },
        recommendations: { type: "string", description: "O que levar, dicas práticas" },
        highlights: { type: "array", items: { type: "string" }, description: "Destaques principais" },
        includes: { type: "array", items: { type: "string" }, description: "O que está incluso" },
        excludes: { type: "array", items: { type: "string" }, description: "O que não está incluso" },
      },
      required: ["title", "destination", "short_description", "description"],
      additionalProperties: false,
    },
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { url } = await req.json();
    if (!url) {
      return new Response(JSON.stringify({ error: "URL não fornecida" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY não configurada" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    console.log(`[product-from-youtube] invoking youtube-transcribe for ${url}`);
    const { data: ytData, error: ytErr } = await admin.functions.invoke("youtube-transcribe", {
      body: { url },
    });
    if (ytErr) {
      console.error("youtube-transcribe error:", ytErr);
      return new Response(JSON.stringify({ error: "Falha ao extrair vídeo: " + ytErr.message }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (ytData?.error) {
      return new Response(JSON.stringify({
        error: ytData.error,
        message: ytData.message || "Não foi possível obter o conteúdo do vídeo",
      }), { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const videoTitle: string = ytData?.title || "Vídeo YouTube";
    const transcript: string = ytData?.transcript || "";
    const structured: string = ytData?.structured_knowledge || "";

    if (!transcript && !structured) {
      return new Response(JSON.stringify({ error: "Vídeo sem conteúdo extraível" }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const MAX = 80000;
    const userMsg = `TÍTULO DO VÍDEO: ${videoTitle}

CONHECIMENTO ESTRUTURADO EXTRAÍDO:
${structured.slice(0, 30000)}

TRANSCRIÇÃO COMPLETA:
${transcript.slice(0, MAX)}

Crie a ficha comercial completa do passeio/experiência usando a função create_experience_product.`;

    console.log(`[product-from-youtube] calling AI gateway, msg length=${userMsg.length}`);
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMsg },
        ],
        tools: [PRODUCT_TOOL],
        tool_choice: { type: "function", function: { name: "create_experience_product" } },
      }),
    });

    if (!aiRes.ok) {
      const status = aiRes.status;
      const txt = await aiRes.text();
      console.error("AI gateway error:", status, txt);
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Limite de uso atingido. Tente novamente em alguns instantes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Erro no gateway de IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiRes.json();
    const toolCall = aiData?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error("No tool call returned:", JSON.stringify(aiData).slice(0, 500));
      return new Response(JSON.stringify({ error: "IA não retornou estrutura do produto" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let product: any;
    try {
      product = JSON.parse(toolCall.function.arguments);
    } catch (e) {
      return new Response(JSON.stringify({ error: "Resposta da IA inválida" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      product,
      source_video: { url, title: videoTitle, videoId: ytData?.videoId },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("product-from-youtube error:", e);
    return new Response(JSON.stringify({
      error: e instanceof Error ? e.message : "Erro desconhecido",
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
