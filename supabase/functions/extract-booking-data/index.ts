// Edge function: extract-booking-data
// Extrai dados estruturados de voos / hotéis / experiências a partir de
// imagem ou PDF usando Lovable AI Gateway (Gemini 2.5 Flash com visão).
//
// IMPORTANTE: o schema de voo segue EXATAMENTE o shape esperado pelo
// componente ProposalFlightSearch (FlightSegmentData) para que o
// preenchimento no frontend seja 1-para-1, sem necessidade de
// transformações pesadas no cliente.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type ItemType = "flight" | "hotel" | "experience";

const FLIGHT_SCHEMA = {
  name: "extract_flight",
  description:
    "Extrai TODOS os trechos de uma reserva ou cotação de VOO AÉREO. Cada conexão é um segmento separado em flight_segments.",
  parameters: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description:
          "Título descritivo curto. Ex.: 'GRU → FCO via LIS · LATAM/TAP' ou 'Ida GRU → CDG · Air France direto'. Se for ida e volta, indique 'Ida e Volta'. Não use só códigos isolados.",
      },
      description: {
        type: "string",
        description:
          "Frase opcional com observações úteis: classe tarifária, programa, política de bagagem ou tipo de tarifa.",
      },
      data: {
        type: "object",
        properties: {
          cabin_class: {
            type: "string",
            description: "Econômica, Premium Economy, Executiva, Primeira",
          },
          fare_type: {
            type: "string",
            description: "Tipo da tarifa (ex.: Light, Plus, Top, Flex, Saver)",
          },
          locator: { type: "string", description: "Código localizador / PNR" },
          price: { type: "number", description: "Preço total se visível" },
          currency: { type: "string", description: "Moeda (BRL, USD, EUR...)" },
          itinerary_type: {
            type: "string",
            enum: ["ROUND_TRIP", "ONE_WAY", "OPEN_JAW", "MULTI_CITY"],
            description:
              "Classificação do itinerário: ROUND_TRIP (ida e volta no mesmo par origem-destino), ONE_WAY (somente ida, sem retorno), OPEN_JAW (volta parte ou chega em cidade diferente), MULTI_CITY (3+ trechos em cidades distintas).",
          },
          trip_direction_summary: {
            type: "string",
            description:
              "Resumo curto e humano do tipo de itinerário detectado. Ex.: 'Ida e Volta', 'Somente Ida', 'Open-Jaw GRU→FCO / VCE→GRU', 'Multi-trecho 4 cidades'.",
          },
          flight_segments: {
            type: "array",
            description:
              "Lista ORDENADA de TODOS os trechos. Conexões viram segmentos separados. NUNCA agrupe trechos em um só. Inclua TANTO os trechos de IDA quanto os de VOLTA quando houver retorno.",
            items: {
              type: "object",
              properties: {
                airline: {
                  type: "string",
                  description: "Código IATA da companhia (ex.: LA, AF, TP, AD)",
                },
                airline_name: {
                  type: "string",
                  description: "Nome completo da companhia (ex.: 'LATAM Airlines')",
                },
                flight_number: {
                  type: "string",
                  description: "Número do voo SEM o código IATA (ex.: '8084')",
                },
                origin_iata: {
                  type: "string",
                  description: "Código IATA do aeroporto de origem (3 letras)",
                },
                destination_iata: {
                  type: "string",
                  description: "Código IATA do aeroporto de destino (3 letras)",
                },
                departure_date: {
                  type: "string",
                  description: "Data de partida em YYYY-MM-DD",
                },
                departure_time: {
                  type: "string",
                  description: "Hora de partida em HH:MM (24h, fuso local da origem)",
                },
                arrival_time: {
                  type: "string",
                  description: "Hora de chegada em HH:MM (24h, fuso local do destino)",
                },
                arrival_date: {
                  type: "string",
                  description: "Data de chegada YYYY-MM-DD (preencher se diferente da partida)",
                },
                duration_minutes: {
                  type: "number",
                  description: "Duração total do trecho em minutos. Se ver '12h 01m', informe 721.",
                },
                terminal: { type: "string", description: "Terminal de embarque" },
                arrival_terminal: { type: "string", description: "Terminal de desembarque" },
                aircraft_type: { type: "string", description: "Modelo da aeronave" },
                is_connection: {
                  type: "boolean",
                  description:
                    "true para TODOS os trechos depois do primeiro de cada itinerário (ida ou volta). Primeiro trecho de cada perna é false.",
                },
                direction: {
                  type: "string",
                  enum: ["ida", "volta", "trecho"],
                  description:
                    "Marque 'ida' para trechos do itinerário de ida, 'volta' para os de retorno, 'trecho' para multi-city sem ida/volta clara.",
                },
                carry_on_included: { type: "boolean" },
                carry_on_weight_kg: { type: "number" },
                checked_bags_included: {
                  type: "number",
                  description: "Quantidade de malas despachadas inclusas (0 se não incluso)",
                },
                checked_bag_weight_kg: {
                  type: "number",
                  description: "Peso por mala despachada (geralmente 23 ou 32)",
                },
                baggage_notes: { type: "string", description: "Notas livres sobre bagagem" },
                notes: { type: "string", description: "Outras notas relevantes" },
              },
              required: ["origin_iata", "destination_iata"],
            },
          },
        },
        required: ["flight_segments"],
      },
    },
    required: ["title", "data"],
  },
};

const HOTEL_SCHEMA = {
  name: "extract_hotel",
  description: "Extrai dados de uma reserva ou cotação de HOTEL com inteligência de regime, política e categoria.",
  parameters: {
    type: "object",
    properties: {
      title: { type: "string", description: "Nome oficial do hotel (ex.: 'Belmond Hotel Splendido')." },
      description: {
        type: "string",
        description:
          "Descrição curta humana com cidade, categoria e regime. Ex.: 'Hotel 5★ em Roma · Café da manhã · Quarto Deluxe Vista Cidade'.",
      },
      data: {
        type: "object",
        properties: {
          location: { type: "string", description: "Cidade, país ou endereço completo" },
          address: { type: "string", description: "Endereço completo se visível" },
          city: { type: "string" },
          country: { type: "string" },
          stars: { type: "number", description: "Categoria oficial em estrelas (1-5)" },
          rating: { type: "number", description: "Nota de avaliação dos hóspedes (0-10)" },
          rating_source: { type: "string", description: "Fonte da nota (Booking, Google, TripAdvisor, etc.)" },
          reviews_count: { type: "number" },
          room_type: { type: "string", description: "Tipo de quarto (ex.: Deluxe Double, Suite Vista Mar)" },
          bed_configuration: { type: "string", description: "Configuração de camas (1 King, 2 Twin, etc.)" },
          view: { type: "string", description: "Vista do quarto (mar, cidade, jardim, etc.)" },
          meal_plan: {
            type: "string",
            description:
              "Regime de refeição NORMALIZADO: 'Sem refeição', 'Café da manhã', 'Meia pensão', 'Pensão completa', 'All inclusive'.",
          },
          meal_plan_code: {
            type: "string",
            enum: ["RO", "BB", "HB", "FB", "AI"],
            description: "Código do regime: RO=Room Only, BB=Bed&Breakfast, HB=Half Board, FB=Full Board, AI=All Inclusive.",
          },
          phone: { type: "string" },
          email: { type: "string" },
          website: { type: "string" },
          checkin_date: { type: "string", description: "YYYY-MM-DD" },
          checkout_date: { type: "string", description: "YYYY-MM-DD" },
          checkin_time: { type: "string", description: "HH:MM" },
          checkout_time: { type: "string", description: "HH:MM" },
          nights: { type: "number", description: "Calcule a partir das datas se não vier explícito" },
          guests: { type: "number", description: "Total de hóspedes" },
          adults: { type: "number" },
          children: { type: "number" },
          rooms: { type: "number", description: "Quantidade de quartos reservados" },
          price_per_night: { type: "number" },
          total_price: { type: "number" },
          taxes_included: { type: "boolean" },
          currency: { type: "string" },
          cancellation_policy: { type: "string", description: "Política completa de cancelamento" },
          is_refundable: { type: "boolean", description: "true se a tarifa for reembolsável" },
          free_cancellation_until: { type: "string", description: "YYYY-MM-DD até quando o cancelamento é gratuito" },
          payment_policy: { type: "string", description: "Pagar agora, pagar no hotel, etc." },
          locator: { type: "string", description: "Localizador / código de reserva" },
          provider: { type: "string", description: "Booking, Decolar, Expedia, hotel direto, etc." },
          amenities: {
            type: "array",
            items: { type: "string" },
            description: "Lista de comodidades visíveis (Wi-Fi, piscina, spa, academia, etc.)",
          },
        },
      },
    },
    required: ["title", "data"],
  },
};

const EXPERIENCE_SCHEMA = {
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
          start_time: { type: "string", description: "HH:MM" },
          includes: { type: "string" },
          provider: { type: "string" },
          price: { type: "number" },
          currency: { type: "string" },
          guests: { type: "number" },
          locator: { type: "string" },
        },
      },
    },
    required: ["title", "data"],
  },
};

const SCHEMAS: Record<ItemType, any> = {
  flight: FLIGHT_SCHEMA,
  hotel: HOTEL_SCHEMA,
  experience: EXPERIENCE_SCHEMA,
};

const SYSTEM_PROMPTS: Record<ItemType, string> = {
  flight:
    "Você é um extrator preciso de dados de voos para um sistema de propostas de viagem. Sua MISSÃO é destrinchar a imagem/PDF e listar TODOS os trechos (ida + volta + conexões) como segmentos separados em flight_segments, na ordem cronológica. Regras: (1) Cada conexão é um segmento próprio; nunca agrupe origem-destino final ignorando paradas. (2) Sempre normalize horários para HH:MM 24h e datas para YYYY-MM-DD no fuso LOCAL de cada aeroporto exibido. (3) Para cada trecho posterior ao primeiro de cada perna marque is_connection=true. (4) Converta durações como '12h 01m' para minutos (721). (5) Códigos IATA SEMPRE em 3 letras maiúsculas. (6) flight_number sem o prefixo IATA (ex.: para 'LA8084' devolva '8084' e airline='LA'). (7) Se houver bagagem despachada, preencha checked_bags_included e checked_bag_weight_kg; se não, 0. (8) CLASSIFIQUE o itinerary_type: ROUND_TRIP se há ida E volta entre o mesmo par de cidades; ONE_WAY se só ida sem retorno; OPEN_JAW se a volta sai/chega em cidade diferente; MULTI_CITY se forem 3+ cidades distintas em sequência. (9) Marque cada segmento com direction='ida' ou 'volta' (ou 'trecho' em multi-city). (10) Construa title humano (ex.: 'GRU → FCO · LATAM · Ida e Volta' ou 'GRU → CDG · Air France · Somente Ida'). Omita campos sem evidência clara em vez de inventar.",
  hotel:
    "Você é um extrator preciso de reservas e cotações de HOTEL (Booking, Decolar, Expedia, sites de hotéis, e-mails de confirmação). MISSÃO: extrair TODOS os dados visíveis com normalização rigorosa. Regras: (1) Datas SEMPRE em YYYY-MM-DD; horários em HH:MM 24h. (2) Calcule nights a partir de checkin/checkout se não vier explícito. (3) NORMALIZE meal_plan para um destes valores: 'Sem refeição', 'Café da manhã', 'Meia pensão', 'Pensão completa', 'All inclusive'. Preencha também meal_plan_code (RO/BB/HB/FB/AI). (4) Detecte stars (categoria 1-5) e rating separadamente (nota dos hóspedes 0-10). (5) Identifique se a tarifa é reembolsável (is_refundable) e até quando o cancelamento é gratuito (free_cancellation_until em YYYY-MM-DD). (6) Liste amenities visíveis como array. (7) Construa um description curto e útil: 'Hotel 5★ em Roma · Café da manhã · Quarto Deluxe Vista Cidade'. (8) Identifique adults/children/rooms separadamente quando possível. Omita campos sem evidência em vez de inventar.",
  experience:
    "Você extrai dados estruturados de imagens/PDFs de experiências, passeios e ingressos turísticos. Normalize datas/horas (YYYY-MM-DD, HH:MM). Use null/omita quando não houver evidência clara.",
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

    const userText =
      item_type === "flight"
        ? "Extraia TODOS os trechos do voo desta imagem/PDF como segmentos separados em flight_segments. Inclua conexões. Use a função fornecida e respeite o schema (IATA 3 letras, HH:MM 24h, YYYY-MM-DD, duration_minutes em minutos, is_connection true para trechos após o primeiro de cada itinerário)."
        : "Extraia os dados desta reserva/cotação no formato estruturado da função. Se um campo não estiver claramente presente, omita-o.";

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
                { type: "text", text: userText },
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
      return json(
        { error: "A IA não conseguiu extrair dados desta imagem. Tente uma imagem mais nítida." },
        422,
      );
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
