import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_INLINE_SIZE = 8 * 1024 * 1024; // 8MB

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

      // Video/audio → always use signed URL (too large for inline)
      const alwaysUrl = mimeType.startsWith("video/") || mimeType.startsWith("audio/");

      if (alwaysUrl) {
        const { data: signedData, error: signErr } = await supabase.storage
          .from("ai-knowledge-base")
          .createSignedUrl(storageKey, 600);
        if (signErr) throw signErr;

        content = await callAI(
          `Título: "${title}"\n\n${instruction}\n\nURL do arquivo: ${signedData.signedUrl}\n\nAcesse a URL e processe o conteúdo conforme a instrução acima.`,
          null, null
        );
      } else {
        // Small file: inline base64
        const { data: fileData, error: dlErr } = await supabase.storage
          .from("ai-knowledge-base").download(storageKey);
        if (dlErr) throw dlErr;

        const bytes = new Uint8Array(await fileData.arrayBuffer());
        const base64 = arrayBufferToBase64(bytes);
        content = await callAI(
          `Título: "${title}"\n\n${instruction}`,
          `data:${mimeType};base64,${base64}`, null
        );
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
    return "Transcreva este áudio completamente em português. Retorne apenas a transcrição.";
  }
  if (mimeType.startsWith("video/")) {
    return "Transcreva o áudio deste vídeo e descreva o conteúdo visual. Foque em informações úteis sobre destinos, experiências, hotéis, restaurantes e dicas de viagem.";
  }
  return "Extraia todo o conteúdo textual deste arquivo.";
}

function arrayBufferToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    for (let j = 0; j < chunk.length; j++) {
      binary += String.fromCharCode(chunk[j]);
    }
  }
  return btoa(binary);
}

// ─── Unified AI call with robust response handling ───
async function callAI(textPrompt: string, imageUrl: string | null, _unused: null): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  const contentParts: any[] = [{ type: "text", text: textPrompt }];
  if (imageUrl) {
    contentParts.push({ type: "image_url", image_url: { url: imageUrl } });
  }

  console.log("[SMART-UPLOAD] Calling AI gateway...", {
    hasImage: !!imageUrl,
    promptLength: textPrompt.length,
  });

  let response: Response;
  try {
    response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: contentParts }],
        max_tokens: 8000,
      }),
    });
  } catch (fetchErr: any) {
    console.error("[SMART-UPLOAD] Fetch failed:", fetchErr.message);
    throw new Error(`AI gateway unreachable: ${fetchErr.message}`);
  }

  // Read raw text first — never call response.json() directly
  const rawText = await response.text();
  console.log("[SMART-UPLOAD] AI response status:", response.status, "length:", rawText.length);
  console.log("[SMART-UPLOAD] AI raw (first 500):", rawText.substring(0, 500));

  if (!response.ok) {
    console.error("[SMART-UPLOAD] AI error:", response.status, rawText.substring(0, 1000));
    if (response.status === 429) throw new Error("Rate limit atingido. Tente novamente em alguns segundos.");
    if (response.status === 402) throw new Error("Créditos de IA esgotados. Adicione créditos no workspace.");
    throw new Error(`AI extraction failed (${response.status})`);
  }

  // Try to parse as JSON (OpenAI-compatible response)
  if (rawText.trim()) {
    try {
      const data = JSON.parse(rawText);
      const content = data?.choices?.[0]?.message?.content;
      if (content) return content;
      // If parsed but no content, log and return raw
      console.warn("[SMART-UPLOAD] Parsed JSON but no choices content, using raw");
      return rawText;
    } catch {
      // Not JSON — Gemini sometimes returns plain text
      console.log("[SMART-UPLOAD] Response is not JSON, using as plain text");
      return rawText;
    }
  }

  throw new Error("AI returned empty response");
}
