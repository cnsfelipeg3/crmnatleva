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

      // Generate a signed URL for ALL binary files — pass as image_url so the AI can fetch it
      const { data: signedData, error: signErr } = await supabase.storage
        .from("ai-knowledge-base")
        .createSignedUrl(storageKey, 600); // 10 min expiry
      if (signErr) throw signErr;

      console.log("[SMART-UPLOAD] Using signed URL for", mimeType, "size strategy: url");
      content = await callAI(prompt, signedData.signedUrl);
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
async function callAI(textPrompt: string, fileUrl: string): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  const models = ["google/gemini-2.5-flash", "google/gemini-2.5-flash-lite"];

  for (const model of models) {
    console.log(`[SMART-UPLOAD] Trying model ${model} with file URL...`);
    try {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
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
          max_tokens: 65000,
        }),
      });

      const rawText = await response.text();
      console.log(`[SMART-UPLOAD] ${model} status: ${response.status}, length: ${rawText.length}`);

      if (!response.ok) {
        console.warn(`[SMART-UPLOAD] ${model} failed: ${response.status} ${rawText.substring(0, 200)}`);
        if (response.status === 429) throw new Error("Rate limit atingido. Tente novamente em alguns segundos.");
        if (response.status === 402) throw new Error("Créditos de IA esgotados. Adicione créditos no workspace.");
        // For 503/5xx, try next model
        continue;
      }

      if (!rawText.trim()) {
        console.warn(`[SMART-UPLOAD] ${model} returned empty, trying next...`);
        continue;
      }

      try {
        const data = JSON.parse(rawText);
        const content = data?.choices?.[0]?.message?.content;
        if (content) return content;
        console.warn(`[SMART-UPLOAD] Parsed JSON but no choices.content`);
        return rawText;
      } catch {
        return rawText;
      }
    } catch (err: any) {
      // Re-throw user-facing errors (rate limit, credits)
      if (err.message.includes("Rate limit") || err.message.includes("Créditos")) throw err;
      console.warn(`[SMART-UPLOAD] ${model} error: ${err.message}`);
      continue;
    }
  }

  throw new Error("Todos os modelos de IA falharam. Tente novamente em alguns minutos.");
}
