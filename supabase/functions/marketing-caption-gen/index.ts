import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Body {
  asset_id?: string;
  product_id?: string;
  format?: string;
  briefing?: any;
  regenerate?: boolean;
}

const SYSTEM_PROMPT = `Você é a Nath, social media da NatLeva Viagens · agência boutique brasileira de viagens.
Escreva uma legenda PRONTA para Instagram/Facebook que venda o pacote.

Regras de tom (obrigatórias):
- Português do Brasil, voz humana, leve, elegante e próxima · "a gente" no lugar de "nós".
- ZERO firula poética. Direto, vendedor, com gatilhos reais (escassez, datas, valor por pessoa).
- NUNCA use travessão "—" nem hífen "-" como separador. Use ponto médio "·" quando precisar.
- NUNCA mencione concorrentes (Booking, Airbnb, Decolar, CVC etc).
- NUNCA peça número de WhatsApp · sempre direcione para o link na bio ou comentário "EU QUERO".

Estrutura obrigatória da legenda (nessa ordem, com quebras de linha entre blocos):
1. HOOK forte na 1ª linha (1 frase curta com o destino + emoção/benefício principal). Pode usar 1 emoji discreto no início.
2. Mini-storytelling do destino em 2 a 3 linhas · o que torna esse lugar especial, o que a pessoa vai viver.
3. Bloco "O que está incluso:" com 3 a 5 bullets curtos usando ✈️ 🏨 🍽️ ✅ (um por linha).
4. Bloco de valor: data da viagem + "A partir de R$ X por pessoa" + condição de parcelamento (entrada + Nx). NUNCA invente número · use exatamente o que vier no briefing.
5. Gatilho de urgência (vagas limitadas / últimas unidades / data específica).
6. CTA claro: "Comenta EU QUERO que a gente te chama" OU "Link na bio para garantir a sua vaga".
7. Linha final só com 8 a 12 hashtags relevantes (destino + nicho de viagem + marca). Sempre incluir #NatLeva #NatLevaViagens.

Tamanho ideal: 900 a 1500 caracteres. Use emojis com parcimônia (máx 1 por bloco, fora dos bullets).
Retorne APENAS o texto final da legenda, sem comentários, sem aspas, sem markdown.`;

function buildUserPrompt(briefing: any, format?: string): string {
  const b = briefing || {};
  const lines: string[] = [];
  lines.push(`Formato da arte: ${format || "feed"}`);
  if (b.destination) lines.push(`Destino: ${b.destination}`);
  if (b.originCity) lines.push(`Saindo de: ${b.originCity}`);
  if (b.hotelName) lines.push(`Hotel: ${b.hotelName}${b.hotelStars ? ` ${b.hotelStars}★` : ""}`);
  if (b.nights) lines.push(`Noites: ${b.nights}`);
  if (b.departureDate) lines.push(`Embarque: ${b.departureDate}`);
  if (b.returnDate) lines.push(`Retorno: ${b.returnDate}`);
  if (Array.isArray(b.includes) && b.includes.length) lines.push(`Inclui: ${b.includes.join(" · ")}`);
  if (b.payment) {
    if (b.payment.fromLabel) lines.push(`Valor: ${b.payment.fromLabel}`);
    if (b.payment.entryLabel) lines.push(`Entrada: ${b.payment.entryLabel}`);
    if (b.payment.installmentsLabel) lines.push(`Parcelas: ${b.payment.installmentsLabel}`);
    if (b.payment.pixLabel) lines.push(`PIX: ${b.payment.pixLabel}`);
  }
  if (b.scarcity) lines.push(`Escassez: ${b.scarcity}`);
  if (b.headline) lines.push(`Headline da arte: ${b.headline}`);
  if (b.subheadline) lines.push(`Subheadline da arte: ${b.subheadline}`);
  lines.push("");
  lines.push("Gere a legenda pronta para postar agora, seguindo TODAS as regras do system prompt.");
  return lines.join("\n");
}

async function callGateway(model: string, system: string, user: string, apiKey: string, timeoutMs = 35000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
      signal: ctrl.signal,
    });
  } finally {
    clearTimeout(t);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as Body;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY ausente");

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    let briefing = body.briefing;
    let productId = body.product_id;
    let format = body.format;

    // Se vier asset_id, carrega briefing e dados do produto
    if (body.asset_id) {
      const { data: asset, error } = await supabase
        .from("product_marketing_assets")
        .select("id, product_id, format, prompt, caption")
        .eq("id", body.asset_id)
        .maybeSingle();
      if (error) throw error;
      if (!asset) throw new Error("Arte não encontrada");

      // Se já tem caption e não foi pedido regenerate, devolve a existente
      if (asset.caption && !body.regenerate) {
        return new Response(JSON.stringify({ caption: asset.caption, cached: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      productId = asset.product_id;
      format = asset.format;
      if (!briefing) briefing = (asset.prompt as any)?.briefing || {};
    }

    // Enriquecer com dados do produto se faltar
    if (productId && (!briefing?.destination || !briefing?.payment)) {
      const { data: prod } = await supabase
        .from("experience_products")
        .select("title, destination, origin_city, hotel_name, hotel_stars, nights, departure_date, return_date, includes, price_from, price_promo")
        .eq("id", productId)
        .maybeSingle();
      if (prod) {
        briefing = {
          destination: briefing?.destination || prod.destination || prod.title,
          originCity: briefing?.originCity || prod.origin_city,
          hotelName: briefing?.hotelName || prod.hotel_name,
          hotelStars: briefing?.hotelStars || prod.hotel_stars,
          nights: briefing?.nights || prod.nights,
          departureDate: briefing?.departureDate || prod.departure_date,
          returnDate: briefing?.returnDate || prod.return_date,
          includes: briefing?.includes || prod.includes,
          ...briefing,
        };
      }
    }

    const userPrompt = buildUserPrompt(briefing, format);

    const order = ["google/gemini-2.5-flash", "google/gemini-3-flash-preview", "google/gemini-2.5-flash-lite"];
    let caption = "";
    let lastErr = "";
    for (const model of order) {
      const res = await callGateway(model, SYSTEM_PROMPT, userPrompt, LOVABLE_API_KEY);
      if (res.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em alguns segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (res.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Adicione em Settings > Workspace > Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!res.ok) {
        lastErr = `${model} ${res.status}: ${await res.text().catch(() => "")}`;
        console.error("caption model failed", lastErr);
        continue;
      }
      const data = await res.json();
      const txt = (data?.choices?.[0]?.message?.content || "").toString().trim();
      if (txt) { caption = txt; break; }
      lastErr = `${model}: resposta vazia`;
    }

    if (!caption) {
      return new Response(JSON.stringify({ error: "Falha ao gerar legenda", detail: lastErr }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Sanitização final · troca travessão/hífen separador por ponto médio
    caption = caption
      .replace(/\s—\s/g, " · ")
      .replace(/\s-\s/g, " · ")
      .trim();

    if (body.asset_id) {
      await supabase
        .from("product_marketing_assets")
        .update({ caption })
        .eq("id", body.asset_id);
    }

    return new Response(JSON.stringify({ caption, cached: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("marketing-caption-gen", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
