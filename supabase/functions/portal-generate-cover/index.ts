import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const { sale_id, destination, title } = await req.json();
    if (!sale_id || (!destination && !title)) {
      return new Response(JSON.stringify({ error: "sale_id and destination|title required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `Crie uma fotografia cinematográfica, ultra-realista, em proporção 16:9, retratando ${destination || title}. Composição editorial de revista de viagens, hora dourada, paleta vibrante, foco nítido em ponto turístico icônico, sem texto, sem pessoas em primeiro plano, sem marca d'água.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!resp.ok) {
      const t = await resp.text();
      console.error("cover gen gateway error:", resp.status, t);
      return new Response(JSON.stringify({ error: "AI image generation failed", detail: t }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const imageUrl: string | undefined = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!imageUrl || !imageUrl.startsWith("data:image")) {
      return new Response(JSON.stringify({ error: "no image returned" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Convert data URL to bytes and upload
    const match = imageUrl.match(/^data:(image\/[^;]+);base64,(.+)$/);
    if (!match) throw new Error("invalid data URL");
    const mime = match[1];
    const ext = mime.split("/")[1] || "png";
    const bytes = Uint8Array.from(atob(match[2]), c => c.charCodeAt(0));

    const path = `covers/${sale_id}-${Date.now()}.${ext}`;
    const { error: upErr } = await admin.storage.from("portal-documents").upload(path, bytes, {
      contentType: mime,
      upsert: true,
    });
    if (upErr) throw upErr;

    const { data: pub } = admin.storage.from("portal-documents").getPublicUrl(path);
    const publicUrl = pub.publicUrl;

    // Persist on portal_published_sales (best-effort; row may not exist yet)
    await admin.from("portal_published_sales")
      .update({ cover_image_url: publicUrl })
      .eq("sale_id", sale_id);

    return new Response(JSON.stringify({ url: publicUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("portal-generate-cover error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
