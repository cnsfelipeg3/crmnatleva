// Transcribe audio (webm/opus base64) using Lovable AI Gateway (Gemini multimodal)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const { audioBase64, mimeType } = body as { audioBase64?: string; mimeType?: string };

    if (!audioBase64 || typeof audioBase64 !== "string") {
      return json({ error: "missing_audio", message: "audioBase64 é obrigatório" }, 400);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "missing_api_key" }, 500);

    // Gemini accepts: audio/webm, audio/ogg, audio/mp3, audio/wav, audio/m4a
    const mt = (mimeType || "audio/webm").split(";")[0];

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "Você transcreve áudios em português brasileiro de forma literal. Retorne APENAS o texto transcrito, sem comentários, sem aspas, sem rótulos. Se o áudio estiver vazio ou inaudível, retorne uma string vazia.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Transcreva este áudio:" },
              {
                type: "input_audio",
                input_audio: { data: audioBase64, format: mt.replace("audio/", "") },
              },
            ],
          },
        ],
      }),
    });

    if (!aiRes.ok) {
      const errTxt = await aiRes.text();
      console.error("AI gateway error", aiRes.status, errTxt);
      if (aiRes.status === 429) return json({ error: "rate_limited", message: "Muitas requisições, tente em instantes." }, 429);
      if (aiRes.status === 402) return json({ error: "payment_required", message: "Créditos de IA esgotados." }, 402);
      return json({ error: "ai_error", message: errTxt }, 502);
    }

    const aiJson = await aiRes.json();
    const transcript = (aiJson?.choices?.[0]?.message?.content || "").trim();

    if (!transcript) {
      return json({ error: "empty_transcript", message: "Não consegui ouvir o áudio. Tente gravar de novo." }, 422);
    }

    return json({ success: true, transcript });
  } catch (err) {
    console.error("transcribe error", err);
    return json({ error: "internal", message: (err as Error).message }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
