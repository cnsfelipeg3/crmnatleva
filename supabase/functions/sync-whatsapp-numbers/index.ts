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

    // Decrypt the access token
    const { data: decryptedToken, error: decryptErr } = await supabase.rpc(
      "decrypt_whatsapp_secret",
      { ciphertext: conn.access_token_encrypted }
    );

    if (decryptErr || !decryptedToken) {
      throw new Error("Failed to decrypt access token");
    }

    const phonesUrl = `https://graph.facebook.com/v21.0/${conn.waba_id}/phone_numbers?access_token=${decryptedToken}`;
    const phonesRes = await fetch(phonesUrl);
    const phonesData = await phonesRes.json();

    if (phonesData.error) throw new Error(phonesData.error.message);
    if (!phonesData.data?.length) throw new Error("No phone numbers found");

    const phone = phonesData.data[0];

    const { error: updateErr } = await supabase
      .from("whatsapp_cloud_config")
      .update({
        phone_number_id: phone.id,
      })
      .eq("id", connection_id);

    if (updateErr) throw new Error(updateErr.message);

    return new Response(JSON.stringify({
      success: true,
      phone_number: phone.display_phone_number || phone.phone_number,
      display_name: phone.verified_name,
      quality_rating: phone.quality_rating,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
