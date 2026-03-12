import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user
    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await anonClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Check portal access
    const { data: access } = await admin
      .from("portal_access")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (!access) {
      return new Response(JSON.stringify({ error: "No portal access" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clientId = access.client_id;
    const body = await req.json().catch(() => ({}));
    const action = body.action;

    // ---- LIST TRIPS ----
    if (action === "trips") {
      const { data: published } = await admin
        .from("portal_published_sales")
        .select("*")
        .eq("client_id", clientId)
        .eq("is_active", true)
        .order("published_at", { ascending: false });

      if (!published?.length) {
        return new Response(JSON.stringify({ trips: [], portalAccess: access }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const saleIds = published.map((p: any) => p.sale_id);

      const { data: sales } = await admin
        .from("sales")
        .select("*")
        .in("id", saleIds);

      const { data: segments } = await admin
        .from("flight_segments")
        .select("*")
        .in("sale_id", saleIds)
        .order("segment_order");

      const trips = published.map((pub: any) => {
        const sale = sales?.find((s: any) => s.id === pub.sale_id);
        const flightSegs = segments?.filter((s: any) => s.sale_id === pub.sale_id) || [];
        return { ...pub, sale, segments: flightSegs };
      });

      return new Response(JSON.stringify({ trips, portalAccess: access }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- TRIP DETAIL ----
    if (action === "trip-detail") {
      const saleId = body.sale_id;
      if (!saleId) {
        return new Response(JSON.stringify({ error: "sale_id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: pub } = await admin
        .from("portal_published_sales")
        .select("*")
        .eq("sale_id", saleId)
        .eq("client_id", clientId)
        .eq("is_active", true)
        .single();

      if (!pub) {
        return new Response(JSON.stringify({ error: "Trip not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const [saleRes, segRes, costRes, attRes, recvRes, paxRes, lodgRes] = await Promise.all([
        admin.from("sales").select("*").eq("id", saleId).single(),
        admin.from("flight_segments").select("*").eq("sale_id", saleId).order("segment_order"),
        admin.from("cost_items").select("*").eq("sale_id", saleId),
        admin.from("attachments").select("*").eq("sale_id", saleId),
        admin.from("accounts_receivable").select("*").eq("sale_id", saleId).order("due_date"),
        admin.from("sale_passengers").select("*, passengers(*)").eq("sale_id", saleId),
        admin.from("lodging_confirmation_tasks").select("*").eq("sale_id", saleId),
      ]);

      let sellerName = null;
      if (saleRes.data?.seller_id) {
        const { data: profile } = await admin.from("profiles").select("full_name").eq("id", saleRes.data.seller_id).single();
        sellerName = profile?.full_name;
      }

      const hotels = (costRes.data || []).filter((c: any) => c.category === "hotel" || c.product_type === "hotel");
      const services = (costRes.data || []).filter((c: any) => c.category !== "aereo" && c.category !== "hotel" && c.product_type !== "hotel");

      return new Response(JSON.stringify({
        published: pub,
        sale: saleRes.data,
        segments: segRes.data || [],
        hotels,
        services,
        lodging: lodgRes.data || [],
        attachments: attRes.data || [],
        financial: { receivables: recvRes.data || [] },
        passengers: (paxRes.data || []).map((sp: any) => ({ ...sp.passengers, role: sp.role })),
        sellerName,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
