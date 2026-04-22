const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { photo_urls, hotel_name, room_names, photo_contexts } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const knownRoomNames: string[] = Array.isArray(room_names) ? room_names : [];
    const contexts: string[] = Array.isArray(photo_contexts) ? photo_contexts : [];

    if (!photo_urls || !Array.isArray(photo_urls) || photo_urls.length === 0) {
      return new Response(JSON.stringify({ error: "Nenhuma foto fornecida" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const batchSize = 6;
    const allClassified: any[] = [];

    for (let batchStart = 0; batchStart < photo_urls.length; batchStart += batchSize) {
      const batchUrls = photo_urls.slice(batchStart, batchStart + batchSize);
      const batchContexts = contexts.slice(batchStart, batchStart + batchSize);

      console.log(`Processing batch ${batchStart / batchSize + 1} (${batchUrls.length} images by URL)...`);

      // Skip base64 conversion entirely — pass URLs directly to the AI gateway.
      // This eliminates the CPU/memory bottleneck that was causing WORKER_RESOURCE_LIMIT.
      const validImages: { originalIndex: number; dataUrl: string; context: string }[] = batchUrls
        .map((url: string, i: number) => ({
          originalIndex: batchStart + i,
          dataUrl: url,
          context: batchContexts[i] || "",
        }))
        .filter((img) => typeof img.dataUrl === "string" && img.dataUrl.startsWith("http"));

      if (validImages.length === 0) continue;

      const roomNamesSection = knownRoomNames.length > 0
        ? `\n\nNOMES REAIS DOS QUARTOS/AMBIENTES DESTE HOTEL (validados via site oficial e Booking.com):
${knownRoomNames.map((n, i) => `  ${i + 1}. ${n}`).join("\n")}

REGRA OBRIGATÓRIA: Use EXATAMENTE estes nomes acima para classificar fotos de quartos e suítes.
NÃO invente nomes. Se a foto é de um quarto mas você não consegue determinar qual, use o mais provável da lista.
Para ambientes que NÃO são quartos (lobby, piscina, restaurante etc.), use o nome real se reconhecer.\n`
        : "";

      // Build context info for each photo
      const contextInstructions = validImages.some(img => img.context)
        ? `\n\nCONTEXTO HTML DE CADA FOTO (extraído do site oficial — use para classificação mais precisa):
${validImages.map((img, i) => img.context ? `  Foto ${img.originalIndex + 1}: ${img.context}` : "").filter(Boolean).join("\n")}

IMPORTANTE: O contexto HTML é a informação MAIS CONFIÁVEL para classificar cada foto.
Use-o como fonte primária. A análise visual da imagem serve como confirmação.\n`
        : "";

      const systemPrompt = `Você é um curador visual especialista em hotéis de luxo.

Analise CADA foto INDIVIDUALMENTE e classifique usando NOMES ESPECÍFICOS E DISTINTOS para cada ambiente do hotel "${hotel_name || "não informado"}".
${roomNamesSection}${contextInstructions}

REGRA CRÍTICA: Você DEVE criar MÚLTIPLOS grupos distintos. NÃO coloque todas as fotos no mesmo environment_name.

Para cada foto retorne:

1. "environment_name": O nome REAL e ESPECÍFICO do ambiente.
   ${knownRoomNames.length > 0 ? "Para quartos/suítes, USE OBRIGATORIAMENTE um dos nomes da lista fornecida." : "Crie nomes descritivos baseados no contexto HTML e visual."}
   Para outros ambientes, use nomes específicos como:
   - "Lobby & Recepção", "Restaurante Principal", "Piscina Infinita", "Spa & Wellness Center"
   - "Fachada Principal", "Bar do Lobby", "Terraço Panorâmico", "Banheiro - [Nome do Quarto]"
   NUNCA use o nome do hotel como environment_name.

2. "category": Uma das: fachada, lobby, quarto, suite, banheiro, piscina, restaurante, bar, spa, academia, area_comum, vista, jardim, praia, eventos, outro

3. "room_type": Tipo exato se for quarto/suíte. null se não for.

4. "bed_type": Se for quarto: "King", "Queen", "Twin", "Casal", "Solteiro". null se não.

5. "description": 1 frase descrevendo o que se vê na foto (em português). Se houver contexto HTML, incorpore essa informação.

6. "confidence": 0.0 a 1.0 — MAIOR se o contexto HTML confirma a análise visual.

7. "context_match": true/false — se a classificação é consistente com o contexto HTML fornecido.

REGRAS:
- Agrupe fotos do MESMO ambiente sob o MESMO environment_name (escrito identicamente).
- Diferencie ambientes diferentes com nomes diferentes.
- Mínimo 3-5 environment_names DISTINTOS.
${knownRoomNames.length > 0 ? "- NUNCA invente nomes de quartos. Use SOMENTE os nomes da lista." : ""}
- NUNCA use o nome do hotel (ex: "${hotel_name}") como environment_name.
- Se o contexto HTML menciona um nome de quarto/ambiente, USE ESSE NOME.

Retorne APENAS JSON válido:
{
  "photos": [
    {
      "index": 0,
      "environment_name": "nome específico do ambiente",
      "category": "categoria",
      "room_type": "tipo ou null",
      "bed_type": "tipo cama ou null",
      "description": "descrição curta em português",
      "confidence": 0.95,
      "context_match": true
    }
  ]
}`;

      const content: any[] = [{ type: "text", text: systemPrompt }];
      for (const img of validImages) {
        const contextNote = img.context ? ` [Contexto: ${img.context}]` : "";
        content.push({ type: "text", text: `\nFoto ${img.originalIndex + 1}:${contextNote}` });
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
            for (const photo of parsed.photos) {
              if (typeof photo.index === 'number' && photo.index < validImages.length) {
                const validImg = validImages[photo.index];
                if (validImg) photo.index = validImg.originalIndex;
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
