const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function fetchImageAsBase64(url: string): Promise<{ dataUrl: string; ok: boolean }> {
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "image/*,*/*;q=0.8",
      },
    });
    if (!res.ok) {
      console.warn(`Failed to fetch image (${res.status}): ${url.substring(0, 80)}...`);
      return { dataUrl: "", ok: false };
    }
    const contentType = res.headers.get("content-type") || "image/jpeg";
    const buf = await res.arrayBuffer();
    if (buf.byteLength < 500) return { dataUrl: "", ok: false };
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { photo_urls, hotel_name, room_names } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const knownRoomNames: string[] = Array.isArray(room_names) ? room_names : [];

    if (!photo_urls || !Array.isArray(photo_urls) || photo_urls.length === 0) {
      return new Response(JSON.stringify({ error: "Nenhuma foto fornecida" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Process in batches of 8 to avoid token limits
    const batchSize = 8;
    const allClassified: any[] = [];

    for (let batchStart = 0; batchStart < photo_urls.length; batchStart += batchSize) {
      const batchUrls = photo_urls.slice(batchStart, batchStart + batchSize);

      console.log(`Converting batch ${batchStart / batchSize + 1} (${batchUrls.length} images)...`);
      const imageResults = await Promise.all(batchUrls.map((url: string) => fetchImageAsBase64(url)));

      const validImages: { originalIndex: number; dataUrl: string }[] = [];
      for (let i = 0; i < imageResults.length; i++) {
        if (imageResults[i].ok) {
          validImages.push({ originalIndex: batchStart + i, dataUrl: imageResults[i].dataUrl });
        }
      }

      if (validImages.length === 0) continue;

      console.log(`Batch has ${validImages.length} valid images, classifying...`);

      const roomNamesSection = knownRoomNames.length > 0
        ? `\n\nNOMES REAIS DOS QUARTOS/SUÍTES DESTE HOTEL (extraídos do site oficial):
${knownRoomNames.map((n, i) => `  ${i + 1}. ${n}`).join("\n")}

REGRA OBRIGATÓRIA: Use EXATAMENTE estes nomes acima para classificar fotos de quartos e suítes. 
NÃO invente nomes. Se a foto é de um quarto mas você não consegue determinar qual dos nomes acima corresponde, use o nome mais provável da lista.
Para ambientes que NÃO são quartos (lobby, piscina, restaurante etc.), use o nome real se reconhecer, senão descreva brevemente.\n`
        : "";

      const systemPrompt = `Você é um curador visual especialista em hotéis de luxo.

Analise CADA foto e classifique usando os NOMES REAIS dos ambientes do hotel "${hotel_name || "não informado"}".
${roomNamesSection}
Para cada foto retorne:

1. "environment_name": O nome REAL do ambiente. 
   ${knownRoomNames.length > 0 ? "Para quartos/suítes, USE OBRIGATORIAMENTE um dos nomes da lista acima." : "Use os nomes que aparecem no site do hotel."}
   Para outros ambientes: "Lobby & Recepção", "Restaurante [Nome]", "Piscina", "Spa", "Fachada", etc.
   Para banheiros, associe ao quarto: "Banheiro - [Nome do Quarto]"

2. "category": Uma das: fachada, lobby, quarto, suite, banheiro, piscina, restaurante, bar, spa, academia, area_comum, vista, jardim, praia, eventos, outro

3. "room_type": Se for quarto/suíte, o tipo exato da lista. null se não for quarto.

4. "bed_type": Se for quarto: "King", "Queen", "Twin", "Casal", "Solteiro". null se não for quarto.

5. "description": 1 frase descrevendo o que se vê na foto.

6. "confidence": 0.0 a 1.0

REGRAS:
- Agrupe fotos do MESMO ambiente sob o MESMO environment_name (escrito de forma idêntica).
- Diferencie quartos diferentes com nomes diferentes.
${knownRoomNames.length > 0 ? "- NUNCA invente nomes de quartos. Use SOMENTE os nomes da lista fornecida." : ""}

Retorne APENAS JSON válido:
{
  "photos": [
    {
      "index": 0,
      "environment_name": "nome real do ambiente",
      "category": "categoria",
      "room_type": "tipo ou null",
      "bed_type": "tipo cama ou null",
      "description": "descrição curta",
      "confidence": 0.95
    }
  ]
}`;

      const content: any[] = [{ type: "text", text: systemPrompt }];
      for (const img of validImages) {
        content.push({ type: "text", text: `\nFoto ${img.originalIndex + 1}:` });
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
        const t = await response.text();
        console.error("AI gateway error:", response.status, t);
        if (response.status === 429) {
          // Wait and continue with remaining batches
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }
        continue;
      }

      const data = await response.json();
      const aiResponse = data.choices?.[0]?.message?.content || "";

      try {
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.photos && Array.isArray(parsed.photos)) {
            // Re-map indices
            for (const photo of parsed.photos) {
              const validImg = validImages[photo.index];
              if (validImg) {
                photo.index = validImg.originalIndex;
              }
            }
            allClassified.push(...parsed.photos);
          }
        }
      } catch {
        console.warn("Failed to parse AI response for batch");
      }
    }

    console.log(`Classified ${allClassified.length}/${photo_urls.length} photos total`);

    return new Response(JSON.stringify({ photos: allClassified }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("classify-hotel-photos error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
