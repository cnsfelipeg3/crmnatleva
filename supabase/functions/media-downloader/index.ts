import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function extFromMime(mime: string | null, mediaType: string): string {
  if (!mime) {
    const defaults: Record<string, string> = {
      audio: "ogg", image: "jpg", video: "mp4", document: "pdf",
    };
    return defaults[mediaType] || "bin";
  }
  const m = mime.split(";")[0].trim().toLowerCase();
  const map: Record<string, string> = {
    "audio/ogg": "ogg", "audio/mpeg": "mp3", "audio/mp4": "m4a", "audio/aac": "aac",
    "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif",
    "video/mp4": "mp4", "video/3gpp": "3gp",
    "application/pdf": "pdf", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  };
  return map[m] || m.split("/")[1]?.replace(/[^a-z0-9]/g, "") || "bin";
}

async function downloadWithRetry(url: string, retries = 3): Promise<Response> {
  const delays = [1000, 3000, 9000];
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return res;
      if (i < retries - 1) await new Promise(r => setTimeout(r, delays[i]));
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, delays[i]));
    }
  }
  throw new Error(`Failed to download after ${retries} attempts`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { messageId, sourceUrl, mediaType, mimeType } = await req.json();

    if (!messageId || !sourceUrl) {
      return new Response(JSON.stringify({ error: "missing messageId or sourceUrl" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ext = extFromMime(mimeType, mediaType || "document");
    const now = new Date();
    const path = `${mediaType || "other"}/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${messageId}.${ext}`;

    // Download
    const dlRes = await downloadWithRetry(sourceUrl);
    const buffer = new Uint8Array(await dlRes.arrayBuffer());
    const contentType = dlRes.headers.get("content-type") || mimeType || "application/octet-stream";

    // Upload to storage
    const { error: uploadErr } = await supabase.storage
      .from("whatsapp-media")
      .upload(path, buffer, { contentType, upsert: true });

    if (uploadErr) {
      console.error("[media-downloader] Upload failed:", uploadErr.message);
      // Mark as failed
      await supabase.from("conversation_messages")
        .update({ media_status: "failed" })
        .eq("external_message_id", messageId);
      return new Response(JSON.stringify({ error: uploadErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage.from("whatsapp-media").getPublicUrl(path);
    const storageUrl = publicUrlData?.publicUrl || "";

    // Update conversation_messages with storage URL
    await supabase.from("conversation_messages").update({
      media_url: storageUrl,
      media_storage_url: storageUrl,
      media_status: "downloaded",
      media_size_bytes: buffer.length,
    }).eq("external_message_id", messageId);

    // Also update legacy messages table
    await supabase.from("messages").update({
      media_url: storageUrl,
    }).eq("external_message_id", messageId);

    console.log(`[media-downloader] ✓ ${mediaType} stored: ${path} (${buffer.length} bytes)`);

    return new Response(JSON.stringify({ success: true, url: storageUrl, path }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[media-downloader] Error:", err.message);

    // Try to mark as failed
    try {
      const body = await req.clone().json().catch(() => null);
      if (body?.messageId) {
        await supabase.from("conversation_messages")
          .update({ media_status: "failed" })
          .eq("external_message_id", body.messageId);
      }
    } catch { /* best effort */ }

    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
