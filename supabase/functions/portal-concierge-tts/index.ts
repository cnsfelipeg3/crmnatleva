import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Text-to-speech for Concierge.IA replies.
 * Uses Google Gemini 2.5 Flash Preview TTS via Lovable AI Gateway when available,
 * with a fallback path to direct Google Generative Language API (free tier) if needed.
 *
 * Returns: { audioBase64: string, mimeType: string }  → frontend wraps in a data URL.
 */

const VOICE_BY_LANG: Record<string, string> = {
  "pt-BR": "Kore",
  "en-US": "Puck",
  "es-ES": "Charon",
  "fr-FR": "Aoede",
  "it-IT": "Fenrir",
  "de-DE": "Leda",
  "ja-JP": "Orus",
  "zh-CN": "Zephyr",
  "ko-KR": "Aoede",
  "ar-SA": "Charon",
  "ru-RU": "Puck",
};

// Convert raw PCM (24kHz, 16-bit, mono) returned by Gemini TTS into a WAV container
function pcmToWav(pcmBase64: string, sampleRate = 24000): string {
  const binary = atob(pcmBase64);
  const pcmBytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) pcmBytes[i] = binary.charCodeAt(i);

  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcmBytes.length;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };

  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeStr(36, "data");
  view.setUint32(40, dataSize, true);

  const out = new Uint8Array(buffer);
  out.set(pcmBytes, 44);

  // Encode to base64
  let binStr = "";
  const chunk = 0x8000;
  for (let i = 0; i < out.length; i += chunk) {
    binStr += String.fromCharCode.apply(null, Array.from(out.subarray(i, i + chunk)));
  }
  return btoa(binStr);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { text, lang = "pt-BR" } = await req.json();
    if (!text || typeof text !== "string") {
      return new Response(JSON.stringify({ error: "text is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Try Lovable AI Gateway first (uses LOVABLE_API_KEY)
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GOOGLE_API_KEY");

    const voiceName = VOICE_BY_LANG[lang] || VOICE_BY_LANG["pt-BR"];

    // Direct Google Generative Language API path (most reliable for TTS today)
    if (GEMINI_API_KEY) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${GEMINI_API_KEY}`;
      const body = {
        contents: [{ parts: [{ text }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName } },
          },
        },
      };
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (r.ok) {
        const j = await r.json();
        const part = j?.candidates?.[0]?.content?.parts?.[0];
        const pcmB64 = part?.inlineData?.data || part?.inline_data?.data;
        if (pcmB64) {
          const wav = pcmToWav(pcmB64);
          return new Response(JSON.stringify({ audioBase64: wav, mimeType: "audio/wav" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        console.error("tts: no audio in google response", JSON.stringify(j).slice(0, 500));
      } else {
        console.error("tts: google direct error", r.status, await r.text());
      }
    }

    // Fallback: try via Lovable AI Gateway (chat endpoint with TTS model)
    if (LOVABLE_API_KEY) {
      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-preview-tts",
          messages: [{ role: "user", content: text }],
          modalities: ["audio"],
          audio: { voice: voiceName, format: "wav" },
        }),
      });
      if (r.ok) {
        const j = await r.json();
        const audio = j?.choices?.[0]?.message?.audio;
        if (audio?.data) {
          return new Response(JSON.stringify({ audioBase64: audio.data, mimeType: "audio/wav" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        console.error("tts: gateway returned no audio", JSON.stringify(j).slice(0, 500));
      } else {
        console.error("tts: gateway error", r.status, await r.text());
      }
    }

    return new Response(JSON.stringify({
      error: "TTS indisponível. Adicione GEMINI_API_KEY nos secrets para habilitar respostas em áudio.",
    }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("portal-concierge-tts error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
