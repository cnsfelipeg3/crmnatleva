import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { code } = await req.json();
    if (!code) throw new Error("Missing authorization code");

    const FB_APP_ID = "4313449025566375";
    const FB_APP_SECRET = Deno.env.get("FB_APP_SECRET");
    if (!FB_APP_SECRET) throw new Error("FB_APP_SECRET not configured");

    // Exchange code for access token
    const tokenUrl = `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${FB_APP_ID}&client_secret=${FB_APP_SECRET}&code=${code}`;
    const tokenRes = await fetch(tokenUrl);
    const tokenData = await tokenRes.json();

    if (tokenData.error) throw new Error(tokenData.error.message || "Token exchange failed");

    const accessToken = tokenData.access_token;

    // Debug token to get WABA info
    const debugUrl = `https://graph.facebook.com/v21.0/debug_token?input_token=${accessToken}&access_token=${FB_APP_ID}|${FB_APP_SECRET}`;
    const debugRes = await fetch(debugUrl);
    const debugData = await debugRes.json();

    // Get shared WABA IDs from the token grants
    let wabaId = "";
    let businessId = "";
    let businessName = "";

    if (debugData.data?.granular_scopes) {
      const whatsappScope = debugData.data.granular_scopes.find(
        (s: any) => s.scope === "whatsapp_business_management"
      );
      if (whatsappScope?.target_ids?.length > 0) {
        wabaId = whatsappScope.target_ids[0];
      }
    }

    // If no WABA from debug, try getting shared WABAs
    if (!wabaId) {
      const sharedRes = await fetch(
        `https://graph.facebook.com/v21.0/me/businesses?access_token=${accessToken}`
      );
      const sharedData = await sharedRes.json();
      if (sharedData.data?.length > 0) {
        businessId = sharedData.data[0].id;
        businessName = sharedData.data[0].name;

        // Get WABAs for this business
        const wabaRes = await fetch(
          `https://graph.facebook.com/v21.0/${businessId}/owned_whatsapp_business_accounts?access_token=${accessToken}`
        );
        const wabaData = await wabaRes.json();
        if (wabaData.data?.length > 0) {
          wabaId = wabaData.data[0].id;
        }
      }
    }

    if (!wabaId) throw new Error("No WhatsApp Business Account found");

    // Get phone numbers
    const phonesUrl = `https://graph.facebook.com/v21.0/${wabaId}/phone_numbers?access_token=${accessToken}`;
    const phonesRes = await fetch(phonesUrl);
    const phonesData = await phonesRes.json();

    if (!phonesData.data?.length) throw new Error("No phone numbers found");

    const phone = phonesData.data[0];

    // Get business info if not already
    if (!businessName && phone.verified_name) {
      businessName = phone.verified_name;
    }

    // Save to DB
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    let userId = null;
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id;
    }

    // Encrypt access token before saving
    const { data: encryptedToken, error: encryptErr } = await supabase.rpc(
      "encrypt_whatsapp_secret",
      { plaintext: accessToken }
    );

    if (encryptErr) throw new Error("Failed to encrypt token: " + encryptErr.message);

    // Upsert connection into whatsapp_cloud_config
    const { data: conn, error: dbError } = await supabase
      .from("whatsapp_cloud_config")
      .upsert({
        phone_number_id: phone.id,
        waba_id: wabaId,
        access_token_encrypted: encryptedToken,
        verify_token: `wh_${Date.now()}`,
        is_active: true,
        connected_at: new Date().toISOString(),
      }, { onConflict: "waba_id" })
      .select()
      .single();

    if (dbError) throw new Error(dbError.message);

    return new Response(JSON.stringify({
      success: true,
      connection: {
        id: conn.id,
        waba_id: conn.waba_id,
        phone_number_id: conn.phone_number_id,
        phone_number: conn.phone_number,
        display_name: conn.display_name,
        business_name: conn.business_name,
        business_id: conn.business_id,
        quality_rating: conn.quality_rating,
        status: conn.status,
      },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
