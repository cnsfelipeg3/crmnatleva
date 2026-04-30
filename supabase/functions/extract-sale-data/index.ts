import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_IMAGES = 10;
const MAX_TEXT_LENGTH = 50000;
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB per image
const MAX_REQUESTS_PER_HOUR = 30;
const ALLOWED_IMAGE_PREFIXES = ["data:image/jpeg", "data:image/png", "data:image/webp", "data:application/pdf"];

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /ignore\s+(all\s+)?above/i,
  /system\s*:/i,
  /you\s+are\s+now\s+/i,
  /do\s+not\s+follow/i,
  /override\s+(the\s+)?(system|prompt)/i,
  /act\s+as\s+(a\s+)?different/i,
  /ignore\s+tudo\s+(acima|anterior)/i,
  /ignore\s+instru[çc][õo]es\s+anteriores/i,
  /voc[eê]\s+agora\s+[eé]\s+/i,
  /desconsidere\s+(o\s+)?(prompt|sistema)/i,
  /\[SYSTEM\]/i,
  /\<\|im_start\|/i,
  /\<\|endoftext\|/i,
];

function detectInjection(text: string): string | null {
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(text)) return pattern.source;
  }
  return null;
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, "").replace(/&[a-z]+;/gi, " ");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // --- AUTH ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- RATE LIMIT ---
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { count } = await serviceClient
      .from("ai_extraction_rate_limit")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("request_at", oneHourAgo);

    if ((count ?? 0) >= MAX_REQUESTS_PER_HOUR) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded. Max 30 requests/hour." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Record this request
    await serviceClient.from("ai_extraction_rate_limit").insert({ user_id: user.id });

    // --- PARSE & VALIDATE INPUT ---
    const body = await req.json();
    const { images, text_input } = body;

    // Validate images
    if (images !== undefined && images !== null) {
      if (!Array.isArray(images)) {
        return new Response(JSON.stringify({ error: "images must be an array" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (images.length > MAX_IMAGES) {
        return new Response(JSON.stringify({ error: `Maximum ${MAX_IMAGES} images allowed` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      for (const img of images) {
        if (typeof img !== "string") {
          return new Response(JSON.stringify({ error: "Each image must be a string" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        // Validate format
        const validPrefix = ALLOWED_IMAGE_PREFIXES.some((p) => img.startsWith(p));
        if (!validPrefix) {
          return new Response(JSON.stringify({ error: "Invalid image format. Allowed: JPEG, PNG, WebP, PDF" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        // Validate size (base64 is ~4/3 of original)
        const base64Size = (img.length * 3) / 4;
        if (base64Size > MAX_IMAGE_SIZE_BYTES) {
          return new Response(JSON.stringify({ error: "Image exceeds 5MB limit" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    // Validate text_input
    if (text_input !== undefined && text_input !== null) {
      if (typeof text_input !== "string") {
        return new Response(JSON.stringify({ error: "text_input must be a string" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (text_input.length > MAX_TEXT_LENGTH) {
        return new Response(JSON.stringify({ error: `Text exceeds ${MAX_TEXT_LENGTH} character limit` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (!images?.length && !text_input) {
      return new Response(
        JSON.stringify({ error: "Forneça pelo menos uma imagem ou texto" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- PROMPT INJECTION DETECTION ---
    const sanitizedText = text_input ? stripHtml(text_input) : "";
    if (sanitizedText) {
      const injectionMatch = detectInjection(sanitizedText);
      if (injectionMatch) {
        // Log suspicious attempt
        await serviceClient.from("ai_security_log").insert({
          user_id: user.id,
          reason: `prompt_injection_detected: ${injectionMatch}`,
          raw_input_preview: sanitizedText.slice(0, 500),
        });
        return new Response(JSON.stringify({ error: "Input contains prohibited patterns" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // --- BUILD AI REQUEST ---
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `Você é um assistente de extração de dados para uma agência de viagens chamada NatLeva.
Analise MINUCIOSAMENTE as imagens e/ou texto fornecidos e extraia TODAS as informações possíveis de venda de viagem.

IMPORTANTE: Extraia ABSOLUTAMENTE TUDO que puder identificar. Não omita nenhuma informação que possa preencher algum campo do formulário de vendas. Analise cada detalhe: nomes, datas, valores, códigos, endereços, documentos, formas de pagamento, detalhes de hotel, segmentos de voo, conexões, etc.

REGRA CRÍTICA SOBRE ITINERÁRIOS AÉREOS:
- NÃO assuma automaticamente que é ida/volta simples.
- Sempre ordene os trechos por DATA de partida (cronológico).
- Se houver 3+ trechos com destinos intermediários diferentes, classifique como MULTI-CITY.
- Somente classifique como ida/volta se: exatamente 2 trechos e o segundo retorna ao aeroporto de origem do primeiro.
- Para cada segmento, NÃO preencha "direction" como "ida" ou "volta" — deixe em branco ou use "leg1", "leg2", "leg3", etc. O frontend classificará automaticamente.
- origin_iata global = aeroporto de partida do PRIMEIRO trecho cronológico.
- destination_iata global = aeroporto de chegada do ÚLTIMO trecho cronológico.

Retorne APENAS um JSON válido com a seguinte estrutura (preencha TODOS os campos que você conseguir identificar):
{
  "confidence": 0.0 a 1.0,
  "fields": {
    "sale_name": {"value": "sugestão de nome para a venda (ex: Viagem João - MIA Jan/26)", "confidence": 0.0-1.0},
    "passenger_names": [{"value": "nome completo", "confidence": 0.0-1.0}],
    "origin_iata": {"value": "XXX (aeroporto de partida do PRIMEIRO trecho)", "confidence": 0.0-1.0},
    "destination_iata": {"value": "XXX (aeroporto de chegada do ÚLTIMO trecho)", "confidence": 0.0-1.0},
    "departure_date": {"value": "YYYY-MM-DD (data do primeiro trecho)", "confidence": 0.0-1.0},
    "return_date": {"value": "YYYY-MM-DD (data do último trecho, se diferente)", "confidence": 0.0-1.0},
    "airline": {"value": "nome ou código IATA", "confidence": 0.0-1.0},
    "locators": [{"value": "XXX", "confidence": 0.0-1.0}],
    "flight_class": {"value": "econômica/executiva/primeira", "confidence": 0.0-1.0},
    "miles_program": {"value": "programa de milhas", "confidence": 0.0-1.0},
    "miles_quantity": {"value": 0, "confidence": 0.0-1.0},
    "taxes": {"value": 0.0, "confidence": 0.0-1.0},
    "cash_value": {"value": 0.0, "confidence": 0.0-1.0},
    "payment_method": {"value": "PIX/cartão/transferência/boleto", "confidence": 0.0-1.0},
    "adults": {"value": 0, "confidence": 0.0-1.0},
    "children": {"value": 0, "confidence": 0.0-1.0},
    "children_ages": {"value": [0], "confidence": 0.0-1.0},
    "cpf": [{"value": "XXX.XXX.XXX-XX", "confidence": 0.0-1.0}],
    "phone": [{"value": "+55 XX XXXXX-XXXX", "confidence": 0.0-1.0}],
    "passport": [{"value": "XXXXXXX", "confidence": 0.0-1.0}],
    "connections": [{"value": "XXX", "confidence": 0.0-1.0}],
    "hotel_name": {"value": "nome do hotel", "confidence": 0.0-1.0},
    "hotel_code": {"value": "código da reserva", "confidence": 0.0-1.0},
    "hotel_room": {"value": "tipo de quarto (standard/superior/suíte/etc)", "confidence": 0.0-1.0},
    "hotel_meal_plan": {"value": "regime alimentação (café/meia pensão/all inclusive/etc)", "confidence": 0.0-1.0},
    "received_value": {"value": 0.0, "confidence": 0.0-1.0},
    "air_cash": {"value": 0.0, "confidence": 0.0-1.0},
    "air_miles_qty": {"value": 0, "confidence": 0.0-1.0},
    "air_miles_price": {"value": 0.0, "confidence": 0.0-1.0},
    "air_taxes": {"value": 0.0, "confidence": 0.0-1.0},
    "hotel_cash": {"value": 0.0, "confidence": 0.0-1.0},
    "hotel_miles_qty": {"value": 0, "confidence": 0.0-1.0},
    "hotel_miles_price": {"value": 0.0, "confidence": 0.0-1.0},
    "hotel_taxes": {"value": 0.0, "confidence": 0.0-1.0},
    "emission_source": {"value": "site/app usado para emitir (ex: Smiles, Livelo, 123milhas, MaxMilhas, Decolar)", "confidence": 0.0-1.0},
    "observations": {"value": "notas relevantes detectadas", "confidence": 0.0-1.0},
    "flight_segments": [{
      "direction": "",
      "airline": "XX",
      "flight_number": "XX000",
      "origin_iata": "XXX",
      "destination_iata": "XXX",
      "departure_date": "YYYY-MM-DD",
      "departure_time": "HH:MM",
      "arrival_time": "HH:MM",
      "class": "classe",
      "confidence": 0.0-1.0
    }],
    "passenger_details": [{
      "full_name": "nome completo",
      "cpf": "XXX.XXX.XXX-XX",
      "phone": "+55 XX XXXXX-XXXX",
      "passport_number": "XXXXXXX",
      "birth_date": "YYYY-MM-DD",
      "address_city": "cidade",
      "address_state": "UF",
      "address_cep": "XXXXX-XXX",
      "address_street": "rua",
      "address_number": "número",
      "address_neighborhood": "bairro",
      "confidence": 0.0-1.0
    }]
  },
  "raw_text": "texto detectado nas imagens",
  "conflicts": []
}

REGRAS:
1. Identifique automaticamente: códigos IATA, localizadores, programas de milhas, companhias aéreas, datas, nomes, CPFs, passaportes, valores monetários, segmentos de voo com conexão, endereços, telefones, formas de pagamento.
2. Se encontrar valores como "R$ 5.400" ou "5400 reais" ou "valor total: 5.4k", interprete como valor monetário.
3. Se encontrar informações de hotel (nome, check-in, check-out, tipo de quarto, regime alimentação), extraia tudo.
4. Se encontrar detalhes de passageiros (nome, CPF, telefone, endereço, passaporte, data nascimento), extraia em passenger_details.
5. Se houver informações conflitantes, liste em "conflicts".
6. Sugira um nome para a venda em "sale_name" baseado no destino e nome do passageiro principal.
7. "received_value" = valor cobrado do cliente final. "cash_value"/"air_cash" = valor pago pela agência.
8. Omita campos que não conseguir identificar - não invente dados.
9. CRÍTICO: flight_segments devem ser ordenados por departure_date cronologicamente. NÃO assuma ida/volta — o sistema classifica automaticamente.`;

    const content: any[] = [
      { type: "text", text: systemPrompt },
    ];

    if (sanitizedText) {
      content.push({ type: "text", text: `\n\nTexto adicional fornecido pelo usuário:\n${sanitizedText}` });
    }

    if (images && images.length > 0) {
      for (const img of images) {
        content.push({
          type: "image_url",
          image_url: { url: img },
        });
      }
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
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro na extração IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || "";

    let extracted;
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extracted = JSON.parse(jsonMatch[0]);
      } else {
        extracted = { raw_text: aiResponse, confidence: 0, fields: {} };
      }
    } catch {
      extracted = { raw_text: aiResponse, confidence: 0, fields: {} };
    }

    return new Response(JSON.stringify(extracted), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract-sale-data error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
