// Edge function: extract-booking-data
// Extrai dados de voos / hotéis / experiências a partir de imagem ou PDF
// usando Lovable AI Gateway (Gemini Flash com visão).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type ItemType = "flight" | "hotel" | "experience";

const SCHEMAS: Record<ItemType, any> = {
  flight: {
    name: "extract_flight",
    description:
      "Extrai dados de uma reserva ou cotação de VOO AÉREO a partir de uma imagem/PDF.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Resumo do voo, ex: 'GRU → FCO - LATAM'" },
        description: { type: "string", description: "Detalhes adicionais (classe, conexões, observações)" },
        data: {
          type: "object",
          properties: {
            origin: { type: "string", description: "Código IATA do aeroporto de origem (ex: GRU)" },
            destination: { type: "string", description: "Código IATA do aeroporto de destino final" },
            airline: { type: "string" },
            flight_number: { type: "string" },
            departure: { type: "string", description: "Data e hora de partida em formato ISO YYYY-MM-DDTHH:mm" },
            arrival: { type: "string", description: "Data e hora de chegada em formato ISO YYYY-MM-DDTHH:mm" },
            baggage: { type: "string" },
            class: { type: "string", description: "Econômica, Executiva, Primeira" },
            duration: { type: "string" },
            stops: { type: "number" },
            price: { type: "number" },
            currency: { type: "string" },
            locator: { type: "string" },
            flight_segments: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  origin: { type: "string" },
                  destination: { type: "string" },
                  departure: { type: "string" },
                  arrival: { type: "string" },
                  flight_number: { type: "string" },
                  airline: { type: "string" },
                  duration: { type: "string" },
                },
              },
            },
          },
        },
      },
      required: ["title", "data"],
    },
  },
  hotel: {
    name: "extract_hotel",
    description: "Extrai dados de uma reserva ou cotação de HOTEL.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Nome do hotel" },
        description: { type: "string", description: "Descrição curta (localização, categoria)" },
        data: {
          type: "object",
          properties: {
            location: { type: "string" },
            stars: { type: "number" },
            room_type: { type: "string" },
            meal_plan: { type: "string" },
            phone: { type: "string" },
            website: { type: "string" },
            rating: { type: "number" },
            checkin_date: { type: "string", description: "YYYY-MM-DD" },
            checkout_date: { type: "string", description: "YYYY-MM-DD" },
            nights: { type: "number" },
            price_per_night: { type: "number" },
            total_price: { type: "number" },
            currency: { type: "string" },
          },
        },
      },
      required: ["title", "data"],
    },
  },
  experience: {
    name: "extract_experience",
    description: "Extrai dados de uma EXPERIÊNCIA / passeio / ingresso.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        data: {
          type: "object",
          properties: {
            location: { type: "string" },
            duration: { type: "string" },
            date: { type: "string", description: "YYYY-MM-DD se houver" },
            includes: { type: "string" },
            provider: { type: "string" },
            price: { type: "number" },
            currency: { type: "string" },
          },
        },
      },
      required: ["title", "data"],
    },
  },
};

const SYSTEM_PROMPTS: Record<ItemType, string> = {
  flight:
    "Você extrai dados estruturados de imagens/PDFs de cotações ou reservas aéreas. Use null/omita quando não houver evidência. Preserve códigos IATA exatos. Use horários no fuso da imagem se visível.",
  hotel:
    "Você extrai dados estruturados de imagens/PDFs de hotéis (Booking, Decolar, sites de hotéis, e-mails de confirmação). Use null/omita quando não houver evidência clara.",
  experience:
    "Você extrai dados estruturados de imagens/PDFs de experiências, passeios e ingressos turísticos. Use null/omita quando não houver evidência.",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const image_base64: string | undefined = body?.image_base64;
    const file_type: string = (body?.file_type || "png").toLowerCase();
    const item_type: ItemType = (body?.item_type as ItemType) || "flight";

    if (!image_base64 || typeof image_base64 !== "string") {
      return json({ error: "image_base64 é obrigatório." }, 400);
    }
    if (!SCHEMAS[item_type]) {
      return json({ error: `item_type inválido: ${item_type}` }, 400);
    }

    // Tamanho aproximado do payload base64 — bloqueia >15MB
    if (image_base64.length > 15 * 1024 * 1024 * 1.4) {
      return json({ error: "Arquivo muito grande (máx ~15MB)." }, 413);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return json({ error: "LOVABLE_API_KEY não configurada." }, 500);
    }

    let mime = "image/png";
    if (file_type === "jpeg" || file_type === "jpg") mime = "image/jpeg";
    else if (file_type === "webp") mime = "image/webp";
    else if (file_type === "pdf") mime = "application/pdf";

    const dataUrl = `data:${mime};base64,${image_base64}`;
    const schema = SCHEMAS[item_type];

    const aiResp = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: SYSTEM_PROMPTS[item_type] },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text:
                    "Extraia os dados desta reserva/cotação no formato estruturado da função. Se um campo não estiver claramente presente, omita-o.",
                },
                { type: "image_url", image_url: { url: dataUrl } },
              ],
            },
          ],
          tools: [{ type: "function", function: schema }],
          tool_choice: { type: "function", function: { name: schema.name } },
        }),
      },
    );

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("AI gateway error", aiResp.status, errText);
      if (aiResp.status === 429) {
        return json({ error: "Muitas requisições. Tente novamente em alguns segundos." }, 429);
      }
      if (aiResp.status === 402) {
        return json({ error: "Créditos do Lovable AI esgotados. Adicione créditos na Workspace." }, 402);
      }
      return json({ error: "Falha ao consultar a IA." }, 500);
    }

    const result = await aiResp.json();
    const toolCall = result?.choices?.[0]?.message?.tool_calls?.[0];
    const argsRaw = toolCall?.function?.arguments;

    if (!argsRaw) {
      console.error("No tool call in response", JSON.stringify(result).slice(0, 500));
      return json({
        error: "A IA não conseguiu extrair dados desta imagem. Tente uma imagem mais nítida.",
      }, 422);
    }

    let extracted: any;
    try {
      extracted = typeof argsRaw === "string" ? JSON.parse(argsRaw) : argsRaw;
    } catch (e) {
      console.error("JSON parse fail", e, argsRaw);
      return json({ error: "Resposta da IA inválida." }, 422);
    }

    return json({ success: true, extracted });
  } catch (err) {
    console.error("extract-booking-data fatal", err);
    return json({ error: (err as Error).message ?? "Erro inesperado." }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
