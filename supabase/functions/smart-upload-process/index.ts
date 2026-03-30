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

      // Always use signed URL — avoids downloading large files into memory
      const { data: signedData, error: signErr } = await supabase.storage
        .from("ai-knowledge-base")
        .createSignedUrl(storageKey, 600);
      if (signErr) throw signErr;

      const fileUrl = signedData.signedUrl;
      console.log(`[SMART-UPLOAD] Using signed URL for ${mimeType}, key=${storageKey}`);

      content = await callAI(prompt, fileUrl, mimeType);
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
    return "IMPORTANTE: Transcreva TODO o conteúdo deste vídeo do INÍCIO AO FIM, sem pular NENHUMA seção. Inclua:\n1. Transcrição COMPLETA de todo o áudio/narração do vídeo inteiro\n2. Descrição do conteúdo visual relevante\n3. Foque em informações úteis sobre destinos, experiências, hotéis, restaurantes, preços e dicas de viagem\n\nNÃO pare no meio. NÃO resuma. Transcreva TUDO até o último segundo do vídeo.";
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
      // For video/audio, use inline_data approach with a small fetch to check,
      // but actually the gateway supports URLs for all types via image_url field
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
        if (r.status === 402) throw new Error("Créditos de IA esgotados.");
        
        // If "Unsupported image format" for video/audio, try with file_url content part
        if (body.includes("Unsupported image format") && isHeavyMedia) {
          console.log(`[SMART-UPLOAD] Retrying ${model} with file_url approach`);
          const r2 = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
                  { type: "file_url", file_url: { url: fileUrl } },
                ],
              }],
            }),
          });
          const body2 = await r2.text();
          console.log(`[SMART-UPLOAD] ${model} file_url → ${r2.status}, len=${body2.length}`);
          if (r2.ok) {
            const text2 = JSON.parse(body2)?.choices?.[0]?.message?.content?.trim();
            if (text2) return text2;
          }
          errors.push(`${model} file_url → ${r2.status}: ${body2.substring(0, 500)}`);
        }
        continue;
      }

      const text = JSON.parse(body)?.choices?.[0]?.message?.content?.trim();
      if (text) return text;
      errors.push(`${model} → empty content`);
    } catch (err: any) {
      if (err.message.includes("Rate limit") || err.message.includes("Créditos")) throw err;
      errors.push(`${model} → ${err.message}`);
    }
  }

  const detail = errors.join(" | ");
  console.error(`[SMART-UPLOAD] All failed: ${detail}`);
  throw new Error(`Falha na extração de IA. ${detail.includes("Unsupported") ? "Vídeos muito grandes podem não ser suportados. Tente usar a importação via YouTube." : "Tente novamente em alguns minutos."}`);
}
