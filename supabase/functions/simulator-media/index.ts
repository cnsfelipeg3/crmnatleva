import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const mediaType = (formData.get("type") as string) || "audio";

    if (!file) {
      return new Response(JSON.stringify({ error: "No file provided" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64 = base64Encode(new Uint8Array(arrayBuffer));
    const mimeType = file.type || (mediaType === "audio" ? "audio/webm" : "image/jpeg");

    console.log(`Processing ${mediaType}: ${file.name}, size=${arrayBuffer.byteLength}, mime=${mimeType}`);

    let messages: Array<{ role: string; content: any }>;

    if (mediaType === "audio") {
      // Gemini uses inline_data for audio
      messages = [
        {
          role: "system",
          content: "Você é um transcritor de áudio. Transcreva o áudio fielmente em português. Retorne APENAS a transcrição, sem prefixos como 'Transcrição:' ou aspas. Se não conseguir entender, retorne '[áudio inaudível]'.",
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${base64}` },
            },
            { type: "text", text: "Transcreva este áudio fielmente em português." },
          ],
        },
      ];
    } else if (mediaType === "image") {
      messages = [
        {
          role: "system",
          content: "Você é um assistente visual. Descreva a imagem de forma concisa e útil em português, como se estivesse contando para um agente de viagens o que o cliente enviou. Máximo 2 frases. Se houver texto na imagem, transcreva-o.",
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${base64}` },
            },
            { type: "text", text: "O que está nesta imagem?" },
          ],
        },
      ];
    } else {
      const decoder = new TextDecoder("utf-8", { fatal: false });
      const textContent = decoder.decode(new Uint8Array(arrayBuffer)).slice(0, 3000);
      messages = [
        {
          role: "system",
          content: "Você é um assistente. Resuma o conteúdo deste documento de forma concisa em português, em no máximo 3 frases.",
        },
        {
          role: "user",
          content: `Conteúdo do arquivo "${file.name}":\n\n${textContent}`,
        },
      ];
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const t = await response.text();
      console.error("AI gateway error:", status, t);
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit atingido." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: `Erro ao processar mídia: ${status}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    console.log(`Result: ${content.slice(0, 100)}`);

    if (mediaType === "audio") {
      return new Response(JSON.stringify({ transcription: content }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      return new Response(JSON.stringify({ description: content }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (e) {
    console.error("simulator-media error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
