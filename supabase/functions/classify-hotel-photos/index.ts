import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { photo_urls, hotel_name } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (!photo_urls || !Array.isArray(photo_urls) || photo_urls.length === 0) {
      return new Response(JSON.stringify({ error: "Nenhuma foto fornecida" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `Você é um especialista em hotelaria e classificação de fotos de hotéis.

Analise CADA foto fornecida e classifique com precisão. Para cada foto retorne:

1. "label": Nome descritivo curto da foto (ex: "Quarto Deluxe King", "Piscina Infinity", "Lobby Principal", "Restaurante Buffet", "Suite Master com Varanda")
2. "category": Uma das categorias: fachada, lobby, quarto, suite, banheiro, piscina, restaurante, bar, spa, academia, area_comum, vista, jardim, praia, estacionamento, sala_reuniao, outro
3. "room_type": Se for quarto/suíte, identifique o tipo (ex: "Standard Twin", "Deluxe Double", "Suite Junior", "Suite Master", "Quarto King", "Quarto Casal"). null se não for quarto.
4. "description": Descrição curta (1-2 frases) do que aparece na foto incluindo detalhes visíveis como decoração, tamanho aparente, amenidades visíveis, vista, etc.
5. "confidence": 0.0 a 1.0

REGRAS:
- Analise o conteúdo REAL de cada imagem. NÃO assuma baseado na ordem.
- Se for quarto, tente identificar: tipo de cama (king, queen, twin, casal, solteiro), decoração, amenidades visíveis (TV, ar-condicionado, frigobar, cofre, varanda).
- Se for área de alimentação, diferencie: restaurante principal, restaurante temático, bar, café, área de café da manhã.
- Se for área externa: piscina (adulto/infantil/infinity), jardim, praia, deck.
- Se não conseguir identificar com certeza, use a melhor estimativa com confidence menor.

Hotel: ${hotel_name || "não informado"}

Retorne APENAS um JSON válido:
{
  "photos": [
    {
      "index": 0,
      "label": "nome descritivo",
      "category": "categoria",
      "room_type": "tipo do quarto ou null",
      "description": "descrição detalhada",
      "confidence": 0.95
    }
  ]
}`;

    const content: any[] = [{ type: "text", text: systemPrompt }];

    for (let i = 0; i < photo_urls.length; i++) {
      content.push({ type: "text", text: `\nFoto ${i + 1}:` });
      content.push({ type: "image_url", image_url: { url: photo_urls[i] } });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content }],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit. Tente novamente em alguns segundos." }), {
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
      return new Response(JSON.stringify({ error: "Erro na classificação" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || "";

    let parsed;
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        parsed = { photos: [] };
      }
    } catch {
      parsed = { photos: [] };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("classify-hotel-photos error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
