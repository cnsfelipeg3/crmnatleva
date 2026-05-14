import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MODEL_PRO = "google/gemini-3-pro-image-preview";
const MODEL_FLASH = "google/gemini-3.1-flash-image-preview";
const MODEL_FALLBACK = "google/gemini-2.5-flash-image";

interface Body {
  product_id: string;
  format: string; // FormatId
  aspect: string; // ex "1:1"
  system_prompt: string;
  user_prompt: string;
  reference_image_url?: string;
  refine_from_url?: string;
  refine_prompt?: string;
  briefing: any;
  use_pro?: boolean;
}

async function callGateway(model: string, system: string, userContent: any, apiKey: string) {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userContent },
      ],
      modalities: ["image", "text"],
    }),
  });
  return res;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as Body;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY ausente");

    if (!body.product_id || !body.format || !body.user_prompt) {
      return new Response(JSON.stringify({ error: "Parâmetros obrigatórios ausentes" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build user content (refine = image + new prompt; new = optional reference image + prompt)
    const refImg = body.refine_from_url || body.reference_image_url;
    const promptText = body.refine_prompt
      ? `${body.user_prompt}\n\nREFINE INSTRUCTION (apply on top of the previous artwork while preserving the NatLeva brand identity): ${body.refine_prompt}`
      : body.user_prompt;

    const LOGO_URL =
      "https://mexlhkqcmiaktjxsyvod.supabase.co/storage/v1/object/public/marketing-assets/_brand%2Flogo-natleva-champagne.png";

    const userContent: any[] = [{ type: "text", text: promptText }];
    if (refImg) {
      userContent.push({ type: "image_url", image_url: { url: refImg } });
    }
    // Sempre anexa o logotipo oficial NatLeva como segunda imagem de referência
    userContent.push({ type: "image_url", image_url: { url: LOGO_URL } });

    // Try preferred model -> flash -> fallback
    const order = body.use_pro
      ? [MODEL_PRO, MODEL_FLASH, MODEL_FALLBACK]
      : [MODEL_FLASH, MODEL_FALLBACK];

    let lastErr = "";
    let usedModel = "";
    let imageDataUrl = "";
    let assistantText = "";

    for (const model of order) {
      const res = await callGateway(model, body.system_prompt, userContent, LOVABLE_API_KEY);
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
        console.error("model failed", lastErr);
        continue;
      }
      const data = await res.json();
      const img = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (img) {
        imageDataUrl = img;
        usedModel = model;
        assistantText = data?.choices?.[0]?.message?.content || "";
        break;
      }
      lastErr = `${model}: sem imagem na resposta`;
    }

    if (!imageDataUrl) {
      return new Response(JSON.stringify({ error: "Falha ao gerar imagem", detail: lastErr }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // base64 -> bytes
    const m = imageDataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!m) throw new Error("Formato de imagem inesperado");
    const mime = m[1];
    const ext = mime.split("/")[1] || "png";
    const bytes = Uint8Array.from(atob(m[2]), (ch) => ch.charCodeAt(0));

    // upload
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
    const path = `${body.product_id}/${Date.now()}-${body.format}.${ext}`;
    const up = await supabase.storage.from("marketing-assets").upload(path, bytes, {
      contentType: mime, upsert: true,
    });
    if (up.error) throw up.error;

    const { data: pub } = supabase.storage.from("marketing-assets").getPublicUrl(path);
    const publicUrl = pub.publicUrl;

    // persist
    const ins = await supabase.from("product_marketing_assets").insert({
      product_id: body.product_id,
      format: body.format,
      url: publicUrl,
      prompt: { briefing: body.briefing, refine_prompt: body.refine_prompt || null },
      model: usedModel,
    }).select("*").single();

    return new Response(JSON.stringify({
      url: publicUrl,
      model: usedModel,
      asset: ins.data,
      assistant_text: assistantText,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("marketing-image-gen", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
