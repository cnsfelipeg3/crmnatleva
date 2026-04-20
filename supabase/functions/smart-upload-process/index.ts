import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import { extractText, getDocumentProxy } from "https://esm.sh/unpdf@0.12.1";

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
    let extractionMethod = "direct";

    // ─── Text files: download directly ───
    if (mimeType.startsWith("text/") || mimeType === "application/json") {
      const { data: fileData, error: dlErr } = await supabase.storage
        .from("ai-knowledge-base").download(storageKey);
      if (dlErr) throw dlErr;
      content = await fileData.text();
    }
    // ─── PDFs: native text extraction first, OCR fallback ───
    else if (mimeType === "application/pdf") {
      const { data: fileData, error: dlErr } = await supabase.storage
        .from("ai-knowledge-base").download(storageKey);
      if (dlErr) throw dlErr;
      const arrayBuffer = await fileData.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      const sizeMB = bytes.length / (1024 * 1024);
      console.log(`[SMART-UPLOAD] PDF downloaded, size=${sizeMB.toFixed(2)}MB`);

      // Try unpdf native extraction
      let nativeText = "";
      let pageCount = 0;
      try {
        const pdf = await getDocumentProxy(bytes);
        pageCount = pdf.numPages;
        const result = await extractText(pdf, { mergePages: true });
        nativeText = (typeof result.text === "string" ? result.text : (result.text as string[]).join("\n\n")).trim();
        console.log(`[SMART-UPLOAD] unpdf: ${pageCount} pages, ${nativeText.length} chars extracted`);
      } catch (e: any) {
        console.warn(`[SMART-UPLOAD] unpdf failed: ${e.message}`);
      }

      const letterCount = (nativeText.match(/[a-zA-ZÀ-ÿ]/g) || []).length;
      const isGoodNative = nativeText.length > 500 && letterCount > 100;

      if (isGoodNative) {
        content = nativeText.slice(0, 80000);
        extractionMethod = "native-pdf";
        console.log(`[SMART-UPLOAD] ✅ Native PDF extraction succeeded (${content.length} chars)`);
      } else {
        // Fallback: OCR via Gemini multimodal with proper PDF data URL
        console.log(`[SMART-UPLOAD] Native extraction poor (${nativeText.length} chars, ${letterCount} letters) — falling back to Gemini OCR`);
        if (sizeMB > 20) {
          throw new Error(`PDF muito grande para OCR (${sizeMB.toFixed(0)}MB). Máximo: 20MB.`);
        }
        const base64 = base64Encode(bytes);
        const dataUrl = `data:application/pdf;base64,${base64}`;
        const prompt = `Título: "${title}"\n\nExtraia TODO o texto deste PDF (incluindo tabelas, legendas e cabeçalhos), do início ao fim. Retorne apenas o conteúdo textual em português, sem markdown.`;
        content = await callAI(prompt, dataUrl, "application/pdf");
        extractionMethod = "ocr-gemini";
      }
    }
    // ─── Other binary files (images, audio, video) ───
    else {
      const instruction = getInstruction(mimeType);
      const prompt = `Título: "${title}"\n\n${instruction}`;

      const { data: fileData, error: dlErr } = await supabase.storage
        .from("ai-knowledge-base").download(storageKey);
      if (dlErr) throw dlErr;

      const arrayBuffer = await fileData.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      const sizeMB = bytes.length / (1024 * 1024);
      console.log(`[SMART-UPLOAD] Downloaded ${mimeType}, size=${sizeMB.toFixed(1)}MB`);

      if (sizeMB > 20) {
        throw new Error(`Arquivo muito grande (${sizeMB.toFixed(0)}MB). Máximo suportado: 20MB.`);
      }

      const base64 = base64Encode(bytes);
      const dataUrl = `data:${mimeType};base64,${base64}`;
      content = await callAI(prompt, dataUrl, mimeType);
      extractionMethod = "gemini";
    }

    return new Response(JSON.stringify({
      content: content.trim(),
      mimeType,
      extractionMethod,
      length: content.trim().length,
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

  const isHeavyMedia = mimeType.startsWith("video/") || mimeType.startsWith("audio/") || mimeType === "application/pdf";
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

  const detail = errors.join(" | ");
  console.error(`[SMART-UPLOAD] All failed: ${detail}`);
  throw new Error(`AI extraction failed: ${detail}`);
}
