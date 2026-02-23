import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch sales with hotel data
    const { data: sales } = await supabase
      .from("sales")
      .select("id, hotel_name, hotel_reservation_code, hotel_checkin_date, hotel_checkout_date, departure_date, destination_iata, status")
      .not("status", "eq", "Cancelado");

    // Fetch existing tasks
    const { data: existingTasks } = await supabase
      .from("lodging_confirmation_tasks")
      .select("id, sale_id, milestone, status");

    const existingMap = new Map<string, any>();
    (existingTasks || []).forEach((t: any) => {
      existingMap.set(`${t.sale_id}|${t.milestone}`, t);
    });

    const now = new Date();
    const tasksToCreate: any[] = [];
    const tasksToUpdate: any[] = [];

    const milestones = [
      { key: "D14", daysBefore: 14, urgency: "LOW" },
      { key: "D7", daysBefore: 7, urgency: "MEDIUM" },
      { key: "H24", daysBefore: 1, urgency: "HIGH" },
    ];

    if (sales) {
      for (const sale of sales) {
        // Must have hotel_name or hotel_reservation_code
        if (!sale.hotel_name && !sale.hotel_reservation_code) continue;

        // Determine check-in date: prefer hotel_checkin_date, fallback to departure_date
        const checkinDateStr = sale.hotel_checkin_date || sale.departure_date;
        if (!checkinDateStr) continue;

        const checkinDatetime = new Date(`${checkinDateStr}T14:00:00Z`); // Default 14:00 check-in
        
        // Skip if check-in was more than 2 days ago
        if (checkinDatetime.getTime() < now.getTime() - 2 * 24 * 60 * 60 * 1000) continue;

        const isFallback = !sale.hotel_checkin_date;
        const isBlocked = !sale.hotel_name || !sale.hotel_reservation_code;

        for (const ms of milestones) {
          const scheduledAt = new Date(checkinDatetime.getTime() - ms.daysBefore * 24 * 60 * 60 * 1000);
          
          let status = "PENDENTE";
          if (isBlocked) {
            status = "BLOQUEADO";
          } else if (now.getTime() >= scheduledAt.getTime()) {
            status = "PENDENTE"; // Now active/visible
          }

          const key = `${sale.id}|${ms.key}`;
          const existing = existingMap.get(key);

          if (existing) {
            // Only update if not confirmed/cancelled
            if (!["CONFIRMADO", "CANCELADO"].includes(existing.status)) {
              // Don't downgrade from PROBLEMA
              const newStatus = existing.status === "PROBLEMA" ? "PROBLEMA" : (isBlocked ? "BLOQUEADO" : existing.status);
              tasksToUpdate.push({
                id: existing.id,
                hotel_name: sale.hotel_name,
                hotel_reservation_code: sale.hotel_reservation_code,
                hotel_checkin_datetime_utc: checkinDatetime.toISOString(),
                scheduled_at_utc: scheduledAt.toISOString(),
                status: newStatus,
                urgency_level: ms.urgency,
                updated_at: now.toISOString(),
              });
            }
          } else {
            tasksToCreate.push({
              sale_id: sale.id,
              hotel_name: sale.hotel_name,
              hotel_reservation_code: sale.hotel_reservation_code,
              hotel_checkin_datetime_utc: checkinDatetime.toISOString(),
              milestone: ms.key,
              scheduled_at_utc: scheduledAt.toISOString(),
              status,
              urgency_level: ms.urgency,
              created_by: "SYSTEM",
            });
          }
        }
      }
    }

    let created = 0, updated = 0;

    if (tasksToCreate.length > 0) {
      const { error } = await supabase.from("lodging_confirmation_tasks").insert(tasksToCreate);
      if (error) console.error("Insert error:", error);
      else created = tasksToCreate.length;
    }

    for (const task of tasksToUpdate) {
      const { id, ...updates } = task;
      await supabase.from("lodging_confirmation_tasks").update(updates).eq("id", id);
      updated++;
    }

    return new Response(
      JSON.stringify({ created, updated, total: created + updated }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("lodging-generate error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
