import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { images, text_input } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `Você é um assistente de extração de dados para uma agência de viagens chamada NatLeva.
Analise as imagens e/ou texto fornecidos e extraia informações de venda de viagem.

Retorne APENAS um JSON válido com a seguinte estrutura (preencha apenas campos que você conseguir identificar):
{
  "confidence": 0.0 a 1.0,
  "fields": {
    "passenger_names": [{"value": "nome", "confidence": 0.0-1.0}],
    "origin_iata": {"value": "XXX", "confidence": 0.0-1.0},
    "destination_iata": {"value": "XXX", "confidence": 0.0-1.0},
    "departure_date": {"value": "YYYY-MM-DD", "confidence": 0.0-1.0},
    "return_date": {"value": "YYYY-MM-DD", "confidence": 0.0-1.0},
    "airline": {"value": "nome", "confidence": 0.0-1.0},
    "locators": [{"value": "XXX", "confidence": 0.0-1.0}],
    "flight_class": {"value": "classe", "confidence": 0.0-1.0},
    "miles_program": {"value": "programa", "confidence": 0.0-1.0},
    "miles_quantity": {"value": 0, "confidence": 0.0-1.0},
    "taxes": {"value": 0.0, "confidence": 0.0-1.0},
    "cash_value": {"value": 0.0, "confidence": 0.0-1.0},
    "hotel_name": {"value": "nome", "confidence": 0.0-1.0},
    "hotel_code": {"value": "código", "confidence": 0.0-1.0},
    "payment_method": {"value": "método", "confidence": 0.0-1.0},
    "adults": {"value": 0, "confidence": 0.0-1.0},
    "children": {"value": 0, "confidence": 0.0-1.0},
    "cpf": [{"value": "XXX.XXX.XXX-XX", "confidence": 0.0-1.0}],
    "phone": [{"value": "+55 XX XXXXX-XXXX", "confidence": 0.0-1.0}],
    "passport": [{"value": "XXXXXXX", "confidence": 0.0-1.0}],
    "connections": [{"value": "XXX", "confidence": 0.0-1.0}],
    "flight_segments": [{
      "direction": "ida|volta",
      "airline": "XX",
      "flight_number": "XX000",
      "origin_iata": "XXX",
      "destination_iata": "XXX",
      "departure_date": "YYYY-MM-DD",
      "departure_time": "HH:MM",
      "arrival_time": "HH:MM",
      "class": "classe",
      "confidence": 0.0-1.0
    }]
  },
  "raw_text": "texto detectado nas imagens",
  "conflicts": []
}

Identifique automaticamente: códigos IATA, localizadores, programas de milhas, companhias aéreas, datas, nomes, CPFs, passaportes, valores monetários, segmentos de voo com conexão.
Se houver informações conflitantes, liste em "conflicts".
Omita campos que não conseguir identificar - não invente dados.`;

    const content: any[] = [
      { type: "text", text: systemPrompt },
    ];

    if (text_input) {
      content.push({ type: "text", text: `\n\nTexto adicional fornecido pelo usuário:\n${text_input}` });
    }

    if (images && images.length > 0) {
      for (const img of images) {
        content.push({
          type: "image_url",
          image_url: { url: img },
        });
      }
    }

    if (!images?.length && !text_input) {
      return new Response(
        JSON.stringify({ error: "Forneça pelo menos uma imagem ou texto" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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

    // Try to parse JSON from the response
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
