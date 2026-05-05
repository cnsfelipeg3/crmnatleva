import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: any, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const MAX_AUDIO_BYTES = 8 * 1024 * 1024;
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const MAX_PDF_BYTES = 10 * 1024 * 1024;

async function downloadMedia(url: string) {
  const r = await fetch(url, { method: "GET" });
  if (!r.ok) throw new Error(`download_failed_${r.status}`);
  const mt = r.headers.get("content-type") || "application/octet-stream";
  const buf = await r.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunk, bytes.length)));
  }
  return { base64: btoa(bin), mimeType: mt.split(";")[0], size: bytes.length };
}

async function callGemini(messages: any[], LOVABLE_API_KEY: string) {
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "google/gemini-2.5-flash", messages }),
  });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`gemini_error_${resp.status}_${txt.slice(0, 200)}`);
  }
  const j = await resp.json();
  return (j?.choices?.[0]?.message?.content || "").trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

    const { messageId } = await req.json();
    if (!messageId) return json({ error: "missing_messageId" }, 400);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "missing_lovable_key" }, 500);

    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: msg, error: fetchErr } = await sb
      .from("conversation_messages")
      .select("id, message_type, media_url, content, ai_media_transcript, metadata")
      .eq("id", messageId)
      .maybeSingle();

    if (fetchErr || !msg) return json({ error: "message_not_found" }, 404);

    if (msg.ai_media_transcript) {
      return json({ success: true, transcript: msg.ai_media_transcript, cached: true });
    }

    const type = (msg.message_type || "").toLowerCase();
    const mediaUrl = msg.media_url;
    let transcript = "";
    const model = "google/gemini-2.5-flash";
    let usedModel: string | null = model;

    if (type === "location") {
      const meta: any = msg.metadata || {};
      const lat = meta.latitude || meta.lat;
      const lng = meta.longitude || meta.lng;
      const addr = meta.address || meta.title || "";
      transcript = `[Localização compartilhada${addr ? `: ${addr}` : ""}${lat && lng ? ` (${lat}, ${lng})` : ""}]`;
      usedModel = null;
    } else if (type === "vcard" || type === "multi_vcard") {
      const meta: any = msg.metadata || {};
      const names = (meta.contacts || meta.vcards || []).map((c: any) => c.displayName || c.name).filter(Boolean);
      transcript = `[Contato compartilhado: ${names.join(", ") || "sem nome"}]`;
      usedModel = null;
    } else if (type === "sticker") {
      transcript = "[Sticker]";
      usedModel = null;
    } else if (type === "call_log") {
      transcript = "[Registro de chamada]";
      usedModel = null;
    } else if ((type === "audio" || type === "ptt") && mediaUrl) {
      const { base64, mimeType, size } = await downloadMedia(mediaUrl);
      if (size > MAX_AUDIO_BYTES) {
        transcript = `[Áudio muito grande pra transcrever (${(size / 1024 / 1024).toFixed(1)}MB)]`;
        usedModel = null;
      } else {
        const fmt = mimeType.replace("audio/", "").split(";")[0] || "ogg";
        transcript = await callGemini([
          { role: "system", content: "Você transcreve áudios em PT-BR. Retorne APENAS o texto transcrito, sem aspas. Se inaudível, retorne string vazia." },
          { role: "user", content: [
            { type: "text", text: "Transcreva este áudio:" },
            { type: "input_audio", input_audio: { data: base64, format: fmt } },
          ] },
        ], LOVABLE_API_KEY);
        if (!transcript) transcript = "[Áudio inaudível]";
      }
    } else if (type === "image" && mediaUrl) {
      const { base64, mimeType, size } = await downloadMedia(mediaUrl);
      if (size > MAX_IMAGE_BYTES) {
        transcript = `[Imagem muito grande pra processar (${(size / 1024 / 1024).toFixed(1)}MB)]`;
        usedModel = null;
      } else {
        const dataUrl = `data:${mimeType};base64,${base64}`;
        const desc = await callGemini([
          { role: "system", content: "Descreva imagens em PT-BR de forma objetiva e breve (máx 2 frases). Foco no contexto útil pra agência de viagens (passaportes, vistos, comprovantes, fotos de destinos, prints de tela). Se for documento sensível, descreva o tipo sem revelar números completos." },
          { role: "user", content: [
            { type: "text", text: "Descreva esta imagem em até 2 frases:" },
            { type: "image_url", image_url: { url: dataUrl } },
          ] },
        ], LOVABLE_API_KEY);
        transcript = `[Imagem: ${desc || "sem descrição"}]`;
      }
    } else if (type === "document" && mediaUrl) {
      const { base64, mimeType, size } = await downloadMedia(mediaUrl);
      if (size > MAX_PDF_BYTES) {
        transcript = `[Documento muito grande (${(size / 1024 / 1024).toFixed(1)}MB)]`;
        usedModel = null;
      } else if (mimeType.includes("pdf")) {
        const dataUrl = `data:${mimeType};base64,${base64}`;
        try {
          const desc = await callGemini([
            { role: "system", content: "Você lê PDFs e retorna um resumo objetivo em PT-BR (máx 4 frases). Foco em informações úteis pra agência de viagens: roteiros, propostas, valores, datas, passageiros." },
            { role: "user", content: [
              { type: "text", text: "Resuma o conteúdo deste PDF em até 4 frases:" },
              { type: "image_url", image_url: { url: dataUrl } },
            ] },
          ], LOVABLE_API_KEY);
          transcript = `[PDF: ${desc || "sem conteúdo extraível"}]`;
        } catch {
          const fname = (msg.metadata as any)?.filename || "documento";
          transcript = `[PDF: ${fname} (não foi possível extrair conteúdo)]`;
          usedModel = null;
        }
      } else {
        const fname = (msg.metadata as any)?.filename || "arquivo";
        transcript = `[Documento ${mimeType}: ${fname}]`;
        usedModel = null;
      }
    } else if (type === "video" && mediaUrl) {
      transcript = "[Vídeo enviado · conteúdo não analisado]";
      usedModel = null;
    } else {
      transcript = `[Mídia tipo ${type}${mediaUrl ? "" : " sem URL"}]`;
      usedModel = null;
    }

    await sb
      .from("conversation_messages")
      .update({
        ai_media_transcript: transcript,
        ai_media_processed_at: new Date().toISOString(),
        ai_media_model: usedModel,
      })
      .eq("id", messageId);

    return json({ success: true, transcript, cached: false });
  } catch (e) {
    console.error("livechat-process-media error", e);
    return json({ error: "internal", message: (e as Error).message }, 500);
  }
});
