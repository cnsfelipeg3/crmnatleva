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

    // Download file from storage
    const { data: fileData, error: dlErr } = await supabase.storage
      .from("ai-knowledge-base")
      .download(storageKey);
    if (dlErr) throw dlErr;

    let content = "";

    // ─── Text files (.txt, .csv, .md) ───
    if (mimeType.startsWith("text/") || mimeType === "application/json") {
      content = await fileData.text();
    }
    // ─── PDF ───
    else if (mimeType === "application/pdf") {
      // Extract text from PDF using base64 + Gemini
      const bytes = await fileData.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(bytes)));
      content = await extractWithGemini(base64, mimeType, title, "Extraia TODO o texto deste PDF. Retorne apenas o conteúdo textual, sem formatação markdown.");
    }
    // ─── Images ───
    else if (mimeType.startsWith("image/")) {
      const bytes = await fileData.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(bytes)));
      content = await extractWithGemini(base64, mimeType, title, "Descreva detalhadamente esta imagem. Se for um destino turístico, descreva o local, pontos de interesse visíveis, clima aparente, e qualquer informação útil para um agente de viagens vender esse destino.");
    }
    // ─── Audio ───
    else if (mimeType.startsWith("audio/")) {
      const bytes = await fileData.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(bytes)));
      content = await extractWithGemini(base64, mimeType, title, "Transcreva este áudio completamente em português. Retorne apenas a transcrição.");
    }
    // ─── Video ───
    else if (mimeType.startsWith("video/")) {
      const bytes = await fileData.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(bytes)));
      content = await extractWithGemini(base64, mimeType, title, "Transcreva o áudio deste vídeo e descreva o conteúdo visual. Foque em informações úteis sobre destinos, experiências, hotéis, restaurantes e dicas de viagem.");
    }
    // ─── Fallback ───
    else {
      try {
        content = await fileData.text();
      } catch {
        content = `[Arquivo ${mimeType} não suportado para extração automática]`;
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
    console.error("smart-upload-process error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ─── Gemini Flash extraction via Lovable AI gateway ───
async function extractWithGemini(base64Data: string, mimeType: string, title: string, instruction: string): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  const response = await fetch("https://api.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Título do documento: "${title}"\n\n${instruction}`,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64Data}`,
              },
            },
          ],
        },
      ],
      max_tokens: 8000,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("Gemini API error:", response.status, errText);
    throw new Error(`AI extraction failed: ${response.status}`);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content || "";
}
