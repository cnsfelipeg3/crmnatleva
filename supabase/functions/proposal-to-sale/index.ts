// Convert a Proposal into a draft Sale (status = 'Rascunho').
// Idempotent: if the proposal already has sale_id, returns that sale.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return json({ error: "Unauthorized" }, 401);
    }

    // Validate JWT in code (verify_jwt = false is the project default)
    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await anonClient.auth.getUser();
    if (userErr || !user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const proposalId = body?.proposal_id as string | undefined;
    if (!proposalId) return json({ error: "proposal_id required" }, 400);

    const admin = createClient(supabaseUrl, serviceKey);

    // 1) Load proposal
    const { data: proposal, error: pErr } = await admin
      .from("proposals")
      .select("*")
      .eq("id", proposalId)
      .single();
    if (pErr || !proposal) return json({ error: "Proposta não encontrada" }, 404);

    // 2) Idempotent: already converted
    if (proposal.sale_id) {
      return json({ sale_id: proposal.sale_id, already_existed: true });
    }

    // 3) Guard rails
    if (proposal.status === "lost" || proposal.proposal_outcome === "rejected") {
      return json({ error: "Proposta marcada como perdida · não pode virar venda" }, 400);
    }
    // Try to derive destination from multiple sources (destinations array, flight items, title)
    let destination: string | null = (proposal.destinations || [])[0] || null;
    if (!destination) {
      const { data: preItems } = await admin
        .from("proposal_items")
        .select("item_type, title, data")
        .eq("proposal_id", proposalId);
      const flight = (preItems || []).find((i: any) => i.item_type === "flight");
      const segs = flight?.data?.flight_segments || [];
      const lastSeg = segs[segs.length - 1];
      destination =
        flight?.data?.destination_city ||
        lastSeg?.destination_city ||
        lastSeg?.destination_iata ||
        (preItems || []).find((i: any) => i.item_type === "hotel")?.data?.city ||
        proposal.title ||
        "A definir";
    }
    if (!proposal.travel_start_date) {
      return json({
        error: "Proposta sem data de ida · preencha a data antes de converter",
      }, 400);
    }

    // 4) Load proposal items
    const { data: items } = await admin
      .from("proposal_items")
      .select("*")
      .eq("proposal_id", proposalId)
      .order("position");

    const flightItem = (items || []).find((i: any) => i.item_type === "flight");
    const hotelItems = (items || []).filter((i: any) => i.item_type === "hotel");
    const otherItems = (items || []).filter(
      (i: any) => !["flight", "hotel", "destination"].includes(i.item_type),
    );
    const firstHotel = hotelItems[0];
    const hotelData = firstHotel?.data || {};

    // 5) Build sale payload
    const adults = proposal.passengers_adults ?? proposal.passenger_count ?? 1;
    const children = proposal.passengers_children ?? 0;

    const salePayload: Record<string, unknown> = {
      name: proposal.client_name || proposal.title || "Sem nome",
      status: "Rascunho",
      client_id: proposal.client_id,
      seller_id: proposal.created_by,
      destination_city: destination,
      origin_city: proposal.origin || null,
      departure_date: proposal.travel_start_date,
      return_date: proposal.travel_end_date,
      adults,
      children,
      children_ages: proposal.children_ages || [],
      received_value: proposal.total_value ?? 0,
      total_cost: 0,
      profit: 0,
      margin: 0,
      source_proposal_id: proposalId,
      products: [
        ...(flightItem ? ["aereo"] : []),
        ...(hotelItems.length ? ["hospedagem"] : []),
      ],
      // Hotel fields (first hotel only — additional hotels go into cost_items)
      hotel_name: firstHotel?.title || hotelData?.name || null,
      hotel_room: hotelData?.room_type || null,
      hotel_meal_plan: hotelData?.meal_plan || null,
      hotel_checkin_date: hotelData?.checkin_date || hotelData?.check_in || null,
      hotel_checkout_date: hotelData?.checkout_date || hotelData?.check_out || null,
      hotel_city: hotelData?.city || null,
      hotel_country: hotelData?.country || null,
      hotel_address: hotelData?.address || null,
      hotel_lat: hotelData?.coords?.lat ?? null,
      hotel_lng: hotelData?.coords?.lng ?? null,
      hotel_place_id: hotelData?.place_id || null,
      observations: `Gerada automaticamente da proposta "${proposal.title}".`,
    };

    // Flight airline (from first segment)
    const segs = flightItem?.data?.flight_segments || [];
    if (segs.length) {
      salePayload.airline = segs[0].airline_name || segs[0].airline || null;
      salePayload.flight_class = flightItem?.data?.cabin_class || null;
      salePayload.is_international = !!segs.find(
        (s: any) => s.is_connection || (s.origin_iata && s.destination_iata),
      );
    }

    // 6) Insert sale
    const { data: sale, error: sErr } = await admin
      .from("sales")
      .insert(salePayload)
      .select("id")
      .single();
    if (sErr || !sale) {
      return json({ error: `Falha ao criar venda: ${sErr?.message}` }, 500);
    }
    const saleId = sale.id;

    // Helper: compensation cleanup on any error from here on
    const rollback = async (msg: string) => {
      await admin.from("sales").delete().eq("id", saleId);
      return json({ error: msg }, 500);
    };

    // 7) Insert flight_segments
    if (segs.length) {
      let order = 1;
      const flightRows = segs.map((s: any) => ({
        sale_id: saleId,
        direction: s.direction === "volta" ? "volta" : "ida",
        segment_order: order++,
        airline: s.airline || null,
        flight_number: s.flight_number || null,
        origin_iata: s.origin_iata || "",
        destination_iata: s.destination_iata || "",
        departure_date: s.departure_date || null,
        departure_time: s.departure_time || null,
        arrival_time: s.arrival_time || null,
        duration_minutes: s.duration_minutes || null,
      }));
      const valid = flightRows.filter((r: any) => r.origin_iata && r.destination_iata);
      if (valid.length) {
        const { error: fErr } = await admin.from("flight_segments").insert(valid);
        if (fErr) return rollback(`Falha ao copiar voos: ${fErr.message}`);
      }
    }

    // 8) Insert cost_items (hotels + extras) — costs ZERO so operator fills real cost
    const costRows: any[] = [];
    for (const h of hotelItems) {
      costRows.push({
        sale_id: saleId,
        category: "hotel",
        product_type: "hotel",
        description: h.title || (h.data?.name) || "Hospedagem",
        cash_value: 0,
      });
    }
    for (const o of otherItems) {
      costRows.push({
        sale_id: saleId,
        category: "outro",
        product_type: o.item_type,
        description: o.title || o.description || o.item_type,
        cash_value: 0,
      });
    }
    if (costRows.length) {
      const { error: cErr } = await admin.from("cost_items").insert(costRows);
      if (cErr) return rollback(`Falha ao copiar itens: ${cErr.message}`);
    }

    // 9) Link proposal → sale
    const { error: linkErr } = await admin
      .from("proposals")
      .update({ sale_id: saleId })
      .eq("id", proposalId);
    if (linkErr) return rollback(`Falha ao vincular proposta: ${linkErr.message}`);

    // 10) Audit log (best-effort)
    try {
      await admin.from("audit_log").insert({
        sale_id: saleId,
        action: "proposal_converted_to_sale",
        details: { proposal_id: proposalId, proposal_title: proposal.title },
        user_id: user.id,
      });
    } catch (_) { /* audit_log shape unknown, ignore */ }

    return json({ sale_id: saleId, already_existed: false });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }

  function json(payload: unknown, status = 200) {
    return new Response(JSON.stringify(payload), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
