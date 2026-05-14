import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Image } from "https://deno.land/x/imagescript@1.2.17/mod.ts";

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

function forceNoLogoGeneration(systemPrompt: string, promptText: string): { system: string; prompt: string } {
  const noLogoSystem = [
    systemPrompt,
    "",
    "SERVER-SIDE OVERRIDE · FINAL LOGO POLICY",
    "The image model must generate the ad WITHOUT any logo or NatLeva wordmark. Ignore any instruction that asks for a logo.",
    "Do not render the words NatLeva, natleva or Viagens anywhere in the generated image.",
    "Reserve the top-left area as clean destination photo only. No text, shape, plaque, card, rectangle, badge, watermark or logo-like lettering there.",
    "The official transparent logo will be added after generation by deterministic image compositing with a soft green fade behind it.",
  ].join("\n");

  const noLogoPrompt = [
    promptText,
    "",
    "FINAL IMPORTANT INSTRUCTION: generate the artwork without any logo. The top-left logo area must remain clean photographic background only because the real transparent logo will be applied by code after generation.",
  ].join("\n");

  return { system: noLogoSystem, prompt: noLogoPrompt };
}

async function fetchImageAsDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Falha ao carregar imagem de referência (${res.status})`);
  const contentType = res.headers.get("content-type") || "image/png";
  const bytes = new Uint8Array(await res.arrayBuffer());
  return bytesToDataUrl(contentType, bytes);
}

function bytesToDataUrl(contentType: string, bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return `data:${contentType};base64,${btoa(binary)}`;
}

async function stampOfficialLogoOrThrow(baseBytes: Uint8Array, logoUrl: string): Promise<Uint8Array> {
  const logoRes = await fetch(logoUrl);
  if (!logoRes.ok) throw new Error(`Falha ao carregar logotipo oficial (${logoRes.status})`);

  const logoBytes = new Uint8Array(await logoRes.arrayBuffer());
  const base = await Image.decode(baseBytes);
  const logo = await Image.decode(logoBytes);
  const targetLogoW = Math.round(base.width * 0.21);
  const scale = targetLogoW / logo.width;
  const targetLogoH = Math.round(logo.height * scale);
  // Qualidade máxima do logo · usa o resize default do ImageScript (suavizado).
  // RESIZE_AUTO não existe em 1.2.17 · passar modo customizado dispara
  // "Invalid resize mode". Sem upscale: se destino >= original, mantém o PNG fonte.
  const resizedLogo =
    targetLogoW >= logo.width
      ? logo.clone()
      : logo.resize(targetLogoW, targetLogoH);
  const marginX = Math.round(base.width * 0.065);
  const marginY = Math.round(base.height * 0.045);

  // ─────────────────────────────────────────────────────────────
  // Vinheta verde de canto (top-left) · forte na borda, fade pra dentro.
  // Sem núcleo radial centrado no logo · evita aparência de "foco"/blob.
  // O verde nasce no canto (0,0) e enfraquece conforme avança para
  // o interior da imagem, igual à referência aprovada.
  // ─────────────────────────────────────────────────────────────
  const reachX = base.width * 0.55;   // alcance horizontal do fade
  const reachY = base.height * 0.45;  // alcance vertical do fade
  const maxAlpha = 165;               // intensidade máxima no canto
  const greenR = 20, greenG = 69, greenB = 47; // #14452F · Rolex Green NatLeva

  const xMax = Math.min(base.width - 1, Math.ceil(reachX));
  const yMax = Math.min(base.height - 1, Math.ceil(reachY));

  for (let y = 0; y <= yMax; y++) {
    for (let x = 0; x <= xMax; x++) {
      // Distância normalizada a partir do canto (0,0)
      const nx = x / reachX;
      const ny = y / reachY;
      const d = Math.sqrt(nx * nx + ny * ny);
      if (d >= 1) continue;
      // Easing suave (smoothstep invertido) · forte na borda, suave no fim
      const t = 1 - d;
      const fade = t * t * t * (t * (t * 6 - 15) + 10); // smootherstep
      const a = Math.round(maxAlpha * fade);
      if (a <= 0) continue;

      const px = base.getPixelAt(x + 1, y + 1); // ImageScript é 1-indexed
      const br = (px >> 24) & 0xff;
      const bg = (px >> 16) & 0xff;
      const bb = (px >> 8) & 0xff;
      const ba = px & 0xff;
      const af = a / 255;
      const nr = Math.round(greenR * af + br * (1 - af));
      const ng = Math.round(greenG * af + bg * (1 - af));
      const nb = Math.round(greenB * af + bb * (1 - af));
      const newPx = ((nr & 0xff) << 24) | ((ng & 0xff) << 16) | ((nb & 0xff) << 8) | (ba & 0xff);
      base.setPixelAt(x + 1, y + 1, newPx);
    }
  }

  // Stamp do logo oficial NatLeva (PNG transparente · sem fundo) por cima
  // do halo verde. Único logo presente na arte final.
  base.composite(resizedLogo, marginX, marginY);
  return new Uint8Array(await base.encode());
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
    const rawPromptText = body.refine_prompt
      ? `${body.user_prompt}\n\nREFINE INSTRUCTION (apply on top of the previous artwork while preserving the NatLeva brand identity): ${body.refine_prompt}`
      : body.user_prompt;
    const { system, prompt } = forceNoLogoGeneration(body.system_prompt || "", rawPromptText);

    const LOGO_URL =
      "https://mexlhkqcmiaktjxsyvod.supabase.co/storage/v1/object/public/marketing-assets/_brand%2Flogo-natleva-champagne.png";

    const userContent: any[] = [{ type: "text", text: prompt }];
    if (body.reference_image_url) {
      userContent.push({ type: "image_url", image_url: { url: await fetchImageAsDataUrl(body.reference_image_url) } });
    }
    // Não enviamos a arte anterior no refino porque ela já contém o logo oficial
    // stampado. Se o modelo vê esse logo, ele tenta preservá-lo e cria duplicação.
    // O refino usa a foto original + briefing + instrução textual, e o único logo
    // entra depois, via post-processing transparente.
    // Try preferred model -> flash -> fallback
    const order = body.use_pro
      ? [MODEL_PRO, MODEL_FLASH, MODEL_FALLBACK]
      : [MODEL_FLASH, MODEL_FALLBACK];

    let lastErr = "";
    let usedModel = "";
    let imageDataUrl = "";
    let assistantText = "";

    for (const model of order) {
      const res = await callGateway(model, system, userContent, LOVABLE_API_KEY);
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
    const generatedBytes = Uint8Array.from(atob(m[2]), (ch) => ch.charCodeAt(0));
    let finalMime = mime;
    let finalExt = mime.split("/")[1] || "png";

    // ============================================================
    // Post-processing obrigatório · STAMP da logo oficial NatLeva
    // Se a logo não puder ser aplicada, a arte não é salva.
    // ============================================================
    const bytes = await stampOfficialLogoOrThrow(generatedBytes, LOGO_URL);
    finalMime = "image/png";
    finalExt = "png";

    // upload
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
    const path = `${body.product_id}/${Date.now()}-${body.format}.${finalExt}`;
    const up = await supabase.storage.from("marketing-assets").upload(path, bytes, {
      contentType: finalMime, upsert: true,
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
