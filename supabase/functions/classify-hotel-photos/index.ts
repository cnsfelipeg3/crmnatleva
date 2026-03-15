import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function fetchImageAsBase64(url: string): Promise<{ dataUrl: string; ok: boolean }> {
  try {
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) {
      console.warn(`Failed to fetch image (${res.status}): ${url.substring(0, 80)}...`);
      return { dataUrl: "", ok: false };
    }
    const contentType = res.headers.get("content-type") || "image/jpeg";
    const buf = await res.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const b64 = btoa(binary);
    return { dataUrl: `data:${contentType};base64,${b64}`, ok: true };
  } catch (e) {
    console.warn(`Error fetching image: ${e}`);
    return { dataUrl: "", ok: false };
  }
}

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

    // Pre-fetch all images and convert to base64 data URLs
    // This is needed because the AI gateway cannot access Google Places URLs directly
    console.log(`Converting ${photo_urls.length} images to base64...`);
    const imageResults = await Promise.all(photo_urls.map((url: string) => fetchImageAsBase64(url)));
    
    const validImages: { index: number; dataUrl: string }[] = [];
    for (let i = 0; i < imageResults.length; i++) {
      if (imageResults[i].ok) {
        validImages.push({ index: i, dataUrl: imageResults[i].dataUrl });
      }
    }

    if (validImages.length === 0) {
      return new Response(JSON.stringify({ error: "Nenhuma foto pôde ser carregada" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Successfully converted ${validImages.length}/${photo_urls.length} images`);

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

    for (const img of validImages) {
      content.push({ type: "text", text: `\nFoto ${img.index + 1}:` });
      content.push({ type: "image_url", image_url: { url: img.dataUrl } });
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

    // Re-map indices back to original photo_urls indices
    if (parsed.photos && Array.isArray(parsed.photos)) {
      for (const photo of parsed.photos) {
        const validImg = validImages[photo.index];
        if (validImg) {
          photo.index = validImg.index;
        }
      }
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
