import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ZAPI_INSTANCE_ID = Deno.env.get("ZAPI_INSTANCE_ID")!;
const ZAPI_TOKEN = Deno.env.get("ZAPI_TOKEN")!;
const ZAPI_CLIENT_TOKEN = Deno.env.get("ZAPI_CLIENT_TOKEN")!;
const ZAPI_BASE = `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}`;

async function fetchProfilePic(phone: string): Promise<string | null> {
  try {
    const res = await fetch(`${ZAPI_BASE}/profile-picture?phone=${phone}`, {
      headers: { "Client-Token": ZAPI_CLIENT_TOKEN },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.link || data?.profilePictureUrl || data?.imageUrl || null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  let body: any = {};
  try { body = await req.json(); } catch {}

  const batchSize = Math.min(body.batch_size || 50, 200);
  const dryRun = body.dry_run === true;

  const stats = {
    batch_size: batchSize,
    processed: 0,
    updated: 0,
    not_found: 0,
    errors: 0,
  };

  try {
    const { data: convs, error } = await supabase
      .from("conversations")
      .select("id, phone")
      .is("profile_picture_url", null)
      .not("phone", "is", null)
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(batchSize);

    if (error) throw error;
    if (!convs?.length) {
      return new Response(JSON.stringify({ success: true, message: "No conversations to backfill", ...stats }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Process in parallel chunks of 8 to avoid hammering Z-API
    const chunkSize = 8;
    for (let i = 0; i < convs.length; i += chunkSize) {
      const chunk = convs.slice(i, i + chunkSize);
      await Promise.all(chunk.map(async (c) => {
        stats.processed++;
        const pic = await fetchProfilePic(c.phone);
        if (!pic) {
          stats.not_found++;
          // Mark as "tried" to skip on next run (write timestamp without url)
          if (!dryRun) {
            await supabase.from("conversations")
              .update({ profile_picture_fetched_at: new Date().toISOString() })
              .eq("id", c.id);
          }
          return;
        }
        if (!dryRun) {
          const now = new Date().toISOString();
          await Promise.all([
            supabase.from("conversations").update({
              profile_picture_url: pic,
              profile_picture_fetched_at: now,
            }).eq("id", c.id),
            supabase.from("zapi_contacts").upsert({
              phone: c.phone,
              profile_picture_url: pic,
              updated_at: now,
            }, { onConflict: "phone" }),
          ]);
        }
        stats.updated++;
      }));
    }

    return new Response(JSON.stringify({
      success: true,
      has_more: convs.length === batchSize,
      ...stats,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("[backfill-profile-pics] Error:", err.message);
    return new Response(JSON.stringify({ error: err.message, ...stats }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
