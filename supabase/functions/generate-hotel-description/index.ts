// Edge function: gera descrição curta, realista e encantadora de um hotel via Lovable AI
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const {
      hotel_name,
      city,
      country,
      stars,
      rating,
      amenities,
      room_type,
      meal_plan,
      address,
    } = await req.json();

    if (!hotel_name) {
      return new Response(JSON.stringify({ error: "hotel_name é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY não configurada" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const dataLines = [
      `Hotel: ${hotel_name}`,
      city && `Cidade: ${city}`,
      country && `País: ${country}`,
      address && `Endereço: ${address}`,
      stars && `Categoria: ${stars} estrelas`,
      rating && `Nota dos hóspedes: ${rating}`,
      room_type && `Quarto: ${room_type}`,
      meal_plan && `Regime: ${meal_plan}`,
      Array.isArray(amenities) && amenities.length > 0 && `Comodidades: ${amenities.slice(0, 8).join(", ")}`,
    ].filter(Boolean).join("\n");

    const systemPrompt = `Você é um copywriter de viagens da NatLeva, agência boutique. Escreva descrições de hotel CURTAS (máx. 2 frases, ~280 caracteres), em português do Brasil, realistas, sensoriais e encantadoras — nunca clichês ou exageradas.

REGRAS RÍGIDAS:
- Nunca invente fatos não fornecidos (não cite vista, piscina, spa se não estiver na lista).
- Nada de "experiência inesquecível", "sonho", "paraíso", "luxo absoluto" — cliché proibido.
- Evite adjetivos vazios. Prefira detalhes concretos do que foi informado.
- Se houver poucos dados, faça uma frase curta e elegante sobre localização/categoria.
- Tom: sofisticado, calmo, confiante. Sem emojis. Sem aspas. Sem hashtags.
- Comece com uma palavra forte (substantivo ou adjetivo concreto), não com "Um hotel..." ou "Localizado...".`;

    const userPrompt = `Escreva a descrição (1-2 frases, máx. 280 caracteres):\n\n${dataLines}`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, errText);
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em instantes." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos do Lovable AI esgotados." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Falha ao gerar descrição" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResp.json();
    let description: string = aiData?.choices?.[0]?.message?.content?.trim() || "";
    // Remove aspas envoltórias caso o modelo coloque
    description = description.replace(/^["']|["']$/g, "").trim();

    return new Response(JSON.stringify({ description }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("generate-hotel-description error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
