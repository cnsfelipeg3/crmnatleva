import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { storageKey, mimeType, title } = await req.json();
    if (!storageKey || !mimeType) {
      return new Response(JSON.stringify({ error: "storageKey and mimeType required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    let content = "";

    // ─── Text files: download directly ───
    if (mimeType.startsWith("text/") || mimeType === "application/json") {
      const { data: fileData, error: dlErr } = await supabase.storage
        .from("ai-knowledge-base").download(storageKey);
      if (dlErr) throw dlErr;
      content = await fileData.text();
    }
    // ─── Binary files: use AI for extraction ───
    else {
      const instruction = getInstruction(mimeType);
      const prompt = `Título: "${title}"\n\n${instruction}`;

      const isMediaFile = mimeType.startsWith("video/") || mimeType.startsWith("audio/");

      if (isMediaFile) {
        // Video/audio: gateway doesn't support URLs for non-image types
        // Download and send as base64 data URL
        const { data: fileData, error: dlErr } = await supabase.storage
          .from("ai-knowledge-base").download(storageKey);
        if (dlErr) throw dlErr;

        const arrayBuffer = await fileData.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        const sizeMB = bytes.length / (1024 * 1024);
        console.log(`[SMART-UPLOAD] Downloaded ${mimeType}, size=${sizeMB.toFixed(1)}MB`);

        if (sizeMB > 20) {
          throw new Error(`Arquivo muito grande (${sizeMB.toFixed(0)}MB). Máximo suportado: 20MB para processamento de IA.`);
        }

        // Convert to base64 data URL
        const { encode: base64Encode } = await import("https://deno.land/std@0.168.0/encoding/base64.ts");
        const base64 = base64Encode(bytes);
        const dataUrl = `data:${mimeType};base64,${base64}`;

        content = await callAI(prompt, dataUrl, mimeType);
      } else {
        // Images/PDFs: use signed URL (gateway supports image URLs)
        const { data: signedData, error: signErr } = await supabase.storage
          .from("ai-knowledge-base")
          .createSignedUrl(storageKey, 600);
        if (signErr) throw signErr;

        console.log("[SMART-UPLOAD] Using signed URL for", mimeType);
        content = await callAI(prompt, signedData.signedUrl, mimeType);
      }
    }

    return new Response(JSON.stringify({
      content: content.trim(),
      mimeType,
      extractionMethod: mimeType.startsWith("text/") ? "direct" : "gemini",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[SMART-UPLOAD] error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function getInstruction(mimeType: string): string {
  if (mimeType === "application/pdf") {
    return "Extraia TODO o texto deste PDF. Retorne apenas o conteúdo textual, sem formatação markdown.";
  }
  if (mimeType.startsWith("image/")) {
    return "Descreva detalhadamente esta imagem. Se for um destino turístico, descreva o local, pontos de interesse visíveis, clima aparente, e qualquer informação útil para um agente de viagens vender esse destino.";
  }
  if (mimeType.startsWith("audio/")) {
    return "Transcreva este áudio COMPLETAMENTE em português, do início ao fim, sem pular nenhuma parte. Retorne apenas a transcrição integral.";
  }
  if (mimeType.startsWith("video/")) {
    return "IMPORTANTE: Transcreva TODO o conteúdo deste vídeo do INÍCIO AO FIM, sem pular NENHUMA seção. Inclua:\n1. Transcrição COMPLETA de todo o áudio/narração do vídeo inteiro\n2. Descrição do conteúdo visual relevante\n3. Foque em informações úteis sobre destinos, experiências, hotéis, restaurantes, preços e dicas de viagem\n\nNÃO pare no meio. NÃO resuma. Transcreva TUDO até o último segundo do vídeo. O vídeo pode ter 20+ minutos — cubra cada minuto.";
  }
  return "Extraia todo o conteúdo textual deste arquivo.";
}

// ─── Unified AI call with fallback model ───
async function callAI(textPrompt: string, fileUrl: string, mimeType: string): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  const isHeavyMedia = mimeType.startsWith("video/") || mimeType.startsWith("audio/");
  const models = isHeavyMedia
    ? ["google/gemini-2.5-pro", "google/gemini-2.5-flash"]
    : ["google/gemini-2.5-flash", "google/gemini-2.5-flash-lite"];

  const errors: string[] = [];

  for (const model of models) {
    console.log(`[SMART-UPLOAD] Trying ${model} for ${mimeType}`);
    try {
      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [{
            role: "user",
            content: [
              { type: "text", text: textPrompt },
              { type: "image_url", image_url: { url: fileUrl } },
            ],
          }],
        }),
      });

      const body = await r.text();
      console.log(`[SMART-UPLOAD] ${model} → ${r.status}, body length=${body.length}`);

      if (!r.ok) {
        errors.push(`${model} → ${r.status}: ${body.substring(0, 500)}`);
        if (r.status === 429) throw new Error("Rate limit atingido. Tente novamente em alguns segundos.");
        if (r.status === 402) throw new Error("Créditos de IA esgotados. Adicione créditos no workspace.");
        continue;
      }

      const text = JSON.parse(body)?.choices?.[0]?.message?.content?.trim();
      if (text) return text;
      errors.push(`${model} → empty content: ${body.substring(0, 500)}`);
    } catch (err: any) {
      if (err.message.includes("Rate limit") || err.message.includes("Créditos")) throw err;
      errors.push(`${model} → ${err.message}`);
    }
  }

  // Surface the REAL errors instead of generic message
  const detail = errors.join(" | ");
  console.error(`[SMART-UPLOAD] All failed: ${detail}`);
  throw new Error(`AI extraction failed: ${detail}`);
}
