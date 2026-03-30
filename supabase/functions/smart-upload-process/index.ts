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
    return "Transcreva este áudio completamente em português. Retorne apenas a transcrição.";
  }
  if (mimeType.startsWith("video/")) {
    return "Transcreva o áudio deste vídeo e descreva o conteúdo visual. Foque em informações úteis sobre destinos, experiências, hotéis, restaurantes e dicas de viagem. Retorne o conteúdo completo em português.";
  }
  return "Extraia todo o conteúdo textual deste arquivo.";
}

// ─── Unified AI call — always passes file as image_url so gateway can fetch it ───
async function callAI(textPrompt: string, fileUrl: string): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  console.log("[SMART-UPLOAD] Calling AI gateway with file URL...");

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
        messages: [{
          role: "user",
          content: [
            { type: "text", text: textPrompt },
            { type: "image_url", image_url: { url: fileUrl } },
          ],
        }],
        max_tokens: 8000,
      }),
    });
  } catch (fetchErr: any) {
    console.error("[SMART-UPLOAD] Fetch failed:", fetchErr.message);
    throw new Error(`AI gateway unreachable: ${fetchErr.message}`);
  }

  // Always read as text first to avoid JSON parse errors
  const rawText = await response.text();
  console.log("[SMART-UPLOAD] AI status:", response.status, "body length:", rawText.length);
  console.log("[SMART-UPLOAD] AI raw (first 500):", rawText.substring(0, 500));

  if (!response.ok) {
    console.error("[SMART-UPLOAD] AI error:", response.status, rawText.substring(0, 1000));
    if (response.status === 429) throw new Error("Rate limit atingido. Tente novamente em alguns segundos.");
    if (response.status === 402) throw new Error("Créditos de IA esgotados. Adicione créditos no workspace.");
    throw new Error(`AI extraction failed (${response.status}): ${rawText.substring(0, 200)}`);
  }

  if (!rawText.trim()) {
    throw new Error("AI returned empty response");
  }

  // Parse as OpenAI-compatible JSON
  try {
    const data = JSON.parse(rawText);
    const content = data?.choices?.[0]?.message?.content;
    if (content) return content;
    console.warn("[SMART-UPLOAD] Parsed JSON but no choices.content");
    return rawText;
  } catch {
    // Not JSON — return as plain text
    console.log("[SMART-UPLOAD] Response is plain text, using directly");
    return rawText;
  }
}
