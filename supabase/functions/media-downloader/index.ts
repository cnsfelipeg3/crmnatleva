import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-attempt",
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
    "video/mp4": "mp4", "video/3gpp": "3gp", "video/quicktime": "mov", "video/webm": "webm",
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  };
  return map[m] || m.split("/")[1]?.replace(/[^a-z0-9]/g, "") || "bin";
}

async function downloadWithRetry(url: string): Promise<{ res: Response; attempts: number }> {
  const delays = [1000, 3000, 9000, 20000];
  const retries = 4;
  let lastErr: any = null;
  let lastStatus: number | null = null;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return { res, attempts: i + 1 };
      lastStatus = res.status;
      if (i < retries - 1) await new Promise(r => setTimeout(r, delays[i]));
    } catch (e) {
      lastErr = e;
      if (i < retries - 1) await new Promise(r => setTimeout(r, delays[i]));
    }
  }
  throw new Error(lastStatus ? `http_error_${lastStatus}` : (lastErr?.message || "download_failed"));
}

async function markFailure(supabase: any, messageId: string, reason: string) {
  await Promise.allSettled([
    supabase.from("conversation_messages")
      .update({ media_status: "failed", media_failure_reason: reason })
      .eq("external_message_id", messageId),
    supabase.from("messages")
      .update({ media_status: "failed", media_failure_reason: reason })
      .eq("external_message_id", messageId),
  ]);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  let parsedBody: any = null;
  try {
    parsedBody = await req.json();
    const { messageId, sourceUrl, mediaType, mimeType } = parsedBody;
    const attempt = req.headers.get("x-attempt") || "1";

    if (!messageId || !sourceUrl) {
      return new Response(JSON.stringify({ error: "missing messageId or sourceUrl" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark as 'downloading' at start (UI distinguishes from 'pending')
    await supabase.from("conversation_messages")
      .update({ media_status: "downloading" })
      .eq("external_message_id", messageId);
    await supabase.from("messages")
      .update({ media_status: "downloading" })
      .eq("external_message_id", messageId);

    const ext = extFromMime(mimeType, mediaType || "document");
    const now = new Date();
    const path = `${mediaType || "other"}/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${messageId}.${ext}`;

    // Download with 4 retries [1s, 3s, 9s, 20s]
    let dlResult;
    try {
      dlResult = await downloadWithRetry(sourceUrl);
    } catch (e: any) {
      console.error(`[media-downloader] Download failed for ${messageId} (attempt header: ${attempt}):`, e.message);
      await markFailure(supabase, messageId, e.message || "download_failed");
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const buffer = new Uint8Array(await dlResult.res.arrayBuffer());
    const contentType = dlResult.res.headers.get("content-type") || mimeType || "application/octet-stream";

    // Upload to storage
    const { error: uploadErr } = await supabase.storage
      .from("whatsapp-media")
      .upload(path, buffer, { contentType, upsert: true });

    if (uploadErr) {
      console.error("[media-downloader] Upload failed:", uploadErr.message);
      await markFailure(supabase, messageId, "upload_failed");
      return new Response(JSON.stringify({ error: uploadErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: publicUrlData } = supabase.storage.from("whatsapp-media").getPublicUrl(path);
    const storageUrl = publicUrlData?.publicUrl || "";

    // Parity update on both tables
    await Promise.allSettled([
      supabase.from("conversation_messages").update({
        media_url: storageUrl,
        media_storage_url: storageUrl,
        media_status: "downloaded",
        media_size_bytes: buffer.length,
        media_failure_reason: null,
      }).eq("external_message_id", messageId),
      supabase.from("messages").update({
        media_url: storageUrl,
        media_storage_url: storageUrl,
        media_status: "downloaded",
        media_size_bytes: buffer.length,
        media_failure_reason: null,
      }).eq("external_message_id", messageId),
    ]);

    console.log(`[media-downloader] ✓ ${mediaType} stored in ${dlResult.attempts} attempt(s): ${path} (${buffer.length} bytes)`);

    return new Response(JSON.stringify({ success: true, url: storageUrl, path, attempts: dlResult.attempts }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[media-downloader] Unexpected error:", err.message);
    if (parsedBody?.messageId) {
      await markFailure(supabase, parsedBody.messageId, "unexpected_error").catch(() => {});
    }
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
