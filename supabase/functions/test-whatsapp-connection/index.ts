import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { connection_id } = await req.json();
    if (!connection_id) throw new Error("Missing connection_id");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: conn, error: fetchErr } = await supabase
      .from("whatsapp_cloud_config")
      .select("*")
      .eq("id", connection_id)
      .single();

    if (fetchErr || !conn) throw new Error("Connection not found");

    // Decrypt the access token via service role RPC
    const { data: decryptedToken, error: decryptErr } = await supabase.rpc(
      "decrypt_whatsapp_secret",
      { ciphertext: conn.access_token_encrypted }
    );

    if (decryptErr || !decryptedToken) {
      throw new Error("Failed to decrypt access token");
    }

    const testUrl = `https://graph.facebook.com/v21.0/${conn.phone_number_id}?access_token=${decryptedToken}`;
    const testRes = await fetch(testUrl);
    const testData = await testRes.json();

    if (testData.error) {
      return new Response(JSON.stringify({
        success: false,
        error: testData.error.message,
        token_expired: testData.error.code === 190,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({
      success: true,
      phone_number: testData.display_phone_number,
      verified_name: testData.verified_name,
      quality_rating: testData.quality_rating,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
