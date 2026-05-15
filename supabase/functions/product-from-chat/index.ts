// product-from-chat: conversa multi-turno (texto/áudio já transcrito)
// + extração estruturada de TODOS os campos do produto da prateleira.
// Também sugere uma URL de capa real via cover-image-search quando o produto está pronto.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é a Nath, assistente de cadastro de produtos da prateleira NatLeva. O usuário descreve um pacote/passeio em texto ou áudio (já transcrito), em conversa natural. Sua missão:

1. Conversar de forma curta, humana e objetiva (pt-BR, tom NatLeva, sem firula, sem emojis).
2. INFERIR e EXTRAIR o máximo possível de informação a cada turno usando a função set_product. Pode preencher parcialmente — campos vão se completando ao longo da conversa.
3. Interpretar datas em qualquer formato natural ("dia 12 de outubro", "12/10/26", "outubro de 2026") e sempre devolver em ISO YYYY-MM-DD assumindo o ano corrente ou próximo se não dito. Hoje é ${new Date().toISOString().slice(0, 10)}.
4. Interpretar moeda BR ("dois mil e quinhentos", "R$ 4.890", "4890") como número puro em BRL.
5. Interpretar parcelamento ("entrada de 30%, saldo em 10x no boleto") nos campos payment_*.
6. Quando faltar algo essencial (título, destino, datas, preço), pergunte UMA coisa por vez de forma natural. Quando estiver completo, confirme em uma frase curta.
7. Sempre chame a função set_product, mesmo que parcialmente. A mensagem assistant é a fala curta para o usuário.
8. Para hotel real (ex: "Iberostar Selection"), preencha hotel_name e tente inferir destino/país.
9. NUNCA mencione concorrentes ou preços de terceiros. NUNCA invente o que não foi dito (deixe vazio).`;

const SET_PRODUCT_TOOL = {
  type: "function",
  function: {
    name: "set_product",
    description: "Atualiza o rascunho do produto com tudo que foi entendido até agora. Campos não conhecidos devem ser omitidos.",
    parameters: {
      type: "object",
      properties: {
        // basic
        title: { type: "string" },
        product_kind: { type: "string", enum: ["pacote", "aereo", "hospedagem", "passeio", "cruzeiro", "outros"] },
        destination: { type: "string" },
        destination_country: { type: "string" },
        category: { type: "string" },
        // dates ISO
        departure_date: { type: "string", description: "YYYY-MM-DD" },
        return_date: { type: "string", description: "YYYY-MM-DD" },
        flexible_dates: { type: "boolean" },
        nights: { type: "number" },
        duration: { type: "string" },
        // copy
        short_description: { type: "string", description: "1 frase, máx 160 chars" },
        description: { type: "string", description: "2-4 parágrafos" },
        highlights: { type: "array", items: { type: "string" } },
        includes: { type: "array", items: { type: "string" } },
        excludes: { type: "array", items: { type: "string" } },
        how_it_works: { type: "string" },
        recommendations: { type: "string" },
        // pricing
        price_from: { type: "number", description: "Valor a partir de, em BRL" },
        price_promo: { type: "number" },
        price_label: { type: "string", description: "Ex: 'por pessoa'" },
        currency: { type: "string", enum: ["BRL", "USD", "EUR"] },
        is_promo: { type: "boolean" },
        promo_badge: { type: "string" },
        // payment
        payment_entry_percent: { type: "number", description: "0-100" },
        payment_entry_percent_min: { type: "number" },
        payment_entry_percent_max: { type: "number" },
        payment_entry_methods: {
          type: "object",
          properties: {
            pix: { type: "boolean" },
            cartao: { type: "boolean" },
            link: { type: "boolean" },
          },
        },
        payment_entry_card_installments_max: { type: "number" },
        payment_balance_method: { type: "string", enum: ["boleto", "cartao", "ambos"] },
        payment_balance_installments_max: { type: "number" },
        payment_balance_min_installment: { type: "number" },
        payment_balance_interest_percent: { type: "number" },
        payment_pix_discount_percent: { type: "number" },
        payment_days_before: { type: "number", description: "Dias antes do embarque para quitar" },
        payment_notes: { type: "string" },
        // logistics
        origin_city: { type: "string" },
        origin_iata: { type: "string" },
        destination_iata: { type: "string" },
        airline: { type: "string" },
        hotel_name: { type: "string" },
        hotel_stars: { type: "number" },
        pax_min: { type: "number" },
        pax_max: { type: "number" },
        seats_total: { type: "number" },
        seats_left: { type: "number" },
        // status
        status: { type: "string", enum: ["active", "draft"] },
        // meta
        is_complete: { type: "boolean", description: "true quando título+destino+datas+preço estão preenchidos" },
        image_query: { type: "string", description: "Termo curto em inglês para buscar foto real (ex: 'Cancun beach resort'). Preencher quando souber o destino." },
      },
      additionalProperties: false,
    },
  },
};

type RawMsg = { role: string; content: string; images?: string[] };

function toMultimodal(messages: RawMsg[]) {
  return messages.map((m) => {
    if (m.role === "user" && Array.isArray(m.images) && m.images.length > 0) {
      const parts: any[] = [];
      if (m.content && m.content.trim()) parts.push({ type: "text", text: m.content });
      for (const url of m.images) {
        if (typeof url === "string" && url.length > 0) parts.push({ type: "image_url", image_url: { url } });
      }
      return { role: m.role, content: parts };
    }
    return { role: m.role, content: m.content };
  });
}

async function callProductAI(model: string, apiKey: string, messages: RawMsg[], draftSummary: string) {
  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT + draftSummary },
          ...toMultimodal(messages),
        ],
        tools: [SET_PRODUCT_TOOL],
        tool_choice: { type: "function", function: { name: "set_product" } },
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error(`[product-from-chat] AI gateway error model=${model} status=${response.status}`, detail.slice(0, 500));
      return { ok: false as const, status: response.status, detail };
    }

    return { ok: true as const, data: await response.json() };
  } catch (error) {
    console.error(`[product-from-chat] AI gateway fetch failed model=${model}`, error);
    return { ok: false as const, status: 0, detail: error instanceof Error ? error.message : "fetch_failed" };
  }
}

function serviceFallback(message = "A IA ficou indisponível por alguns instantes. Tenta enviar de novo em seguida.") {
  return new Response(JSON.stringify({
    assistant: message,
    product: {},
    cover_suggestions: [],
    fallback: true,
    error: "AI_SERVICE_UNAVAILABLE",
  }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages = [], current = {} } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY não configurada" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const draftSummary = Object.keys(current || {}).length
      ? `\n\nRASCUNHO ATUAL DO PRODUTO (já preenchido):\n${JSON.stringify(current, null, 2)}\n\nMantenha esses valores e some o que for novo.`
      : "";

    console.log(`[product-from-chat] msgs=${messages.length} draftKeys=${Object.keys(current||{}).length}`);
    const primary = await callProductAI("openai/gpt-5-mini", LOVABLE_API_KEY, messages, draftSummary);
    if (!primary.ok) {
      const retry = await callProductAI("google/gemini-2.5-pro", LOVABLE_API_KEY, messages, draftSummary);
      if (!retry.ok) {
        if (primary.status === 429 || retry.status === 429) return serviceFallback("A IA atingiu um limite momentâneo. Aguarde alguns instantes e tente de novo.");
        if (primary.status === 402 || retry.status === 402) return serviceFallback("Os créditos de IA estão indisponíveis no momento.");
        return serviceFallback();
      }
      console.log("[product-from-chat] primary failed, gateway retry succeeded");
      var aiData = retry.data;
    } else {
      var aiData = primary.data;
    }
    const msg = aiData?.choices?.[0]?.message;
    let toolCall = msg?.tool_calls?.[0];
    let product: any = {};
    if (toolCall?.function?.arguments) {
      try { product = JSON.parse(toolCall.function.arguments); } catch (_) { product = {}; }
    }
    console.log(`[product-from-chat] toolCall=${!!toolCall} keys=${Object.keys(product).length} contentLen=${(msg?.content||"").length}`);

    // Fallback: se não veio tool_call (Gemini às vezes ignora forced tool_choice), tenta openai/gpt-5-mini
    if (!toolCall || Object.keys(product).length === 0) {
      console.log("[product-from-chat] retry with google/gemini-2.5-pro");
      const retry = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages: [
            { role: "system", content: SYSTEM_PROMPT + draftSummary },
            ...messages,
          ],
          tools: [SET_PRODUCT_TOOL],
          tool_choice: { type: "function", function: { name: "set_product" } },
        }),
      });
      if (retry.ok) {
        const rData = await retry.json();
        const rMsg = rData?.choices?.[0]?.message;
        const rTool = rMsg?.tool_calls?.[0];
        if (rTool?.function?.arguments) {
          try {
            product = JSON.parse(rTool.function.arguments);
            toolCall = rTool;
            if (rMsg?.content && !msg?.content) (msg as any).content = rMsg.content;
            console.log(`[product-from-chat] retry succeeded, keys=${Object.keys(product).length}`);
          } catch (_) {}
        } else {
          console.error("[product-from-chat] retry sem tool_call", JSON.stringify(rMsg).slice(0, 300));
        }
      } else {
        console.error("[product-from-chat] retry failed", retry.status, (await retry.text()).slice(0, 200));
      }
    }

    const assistantText: string = msg?.content || (Object.keys(product).length
      ? "Atualizei o rascunho com o que entendi. Quer adicionar mais algo?"
      : "Não consegui extrair os dados desta vez. Pode reescrever com mais detalhes?");

    // Buscar capa real quando temos image_query e ainda não havia capa
    let cover_suggestions: string[] = [];
    if (product?.image_query && !current?.cover_image_url) {
      try {
        const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
        const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
        const { data: imgData } = await admin.functions.invoke("cover-image-search", {
          body: { query: product.image_query, limit: 4 },
        });
        const imgs = imgData?.images || imgData?.results || [];
        cover_suggestions = imgs.filter((i: any) => i?.source === "wikimedia").map((i: any) => i.url).slice(0, 4);
      } catch (e) {
        console.error("cover-image-search failed:", e);
      }
    }

    return new Response(JSON.stringify({
      assistant: assistantText,
      product,
      cover_suggestions,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("product-from-chat error:", e);
    return serviceFallback("Não consegui processar agora. Tenta enviar de novo em seguida.");
  }
});
