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

    // 1. Fetch all flight segments with departure info
    const { data: segments } = await supabase
      .from("flight_segments")
      .select("id, sale_id, direction, airline, flight_number, origin_iata, destination_iata, departure_date, departure_time");

    // 2. Fetch sales for fallback data
    const { data: sales } = await supabase
      .from("sales")
      .select("id, departure_date, return_date, airline, origin_iata, destination_iata, locators, status")
      .not("status", "eq", "Cancelado");

    // 3. Fetch airline rules
    const { data: rules } = await supabase
      .from("airline_checkin_rules")
      .select("*");

    // 4. Fetch existing tasks
    const { data: existingTasks } = await supabase
      .from("checkin_tasks")
      .select("id, sale_id, direction, segment_id, status");

    const rulesMap = new Map((rules || []).map((r: any) => [r.airline_iata, r]));
    const existingMap = new Map<string, any>();
    (existingTasks || []).forEach((t: any) => {
      const key = `${t.sale_id}|${t.direction}|${t.segment_id || ""}`;
      existingMap.set(key, t);
    });

    // Track which (sale_id|direction) already have a segment-based task
    // so we can skip the fallback (and clean up legacy fallbacks).
    const segmentDirSet = new Set<string>();
    (existingTasks || []).forEach((t: any) => {
      if (t.segment_id) segmentDirSet.add(`${t.sale_id}|${t.direction}`);
    });
    if (segments) {
      for (const seg of segments) {
        segmentDirSet.add(`${seg.sale_id}|${seg.direction}`);
      }
    }

    // Delete legacy fallback tasks (no segment_id) when a segment-based task exists
    // for the same (sale_id, direction). Keeps CONCLUIDO/CANCELADO untouched.
    const fallbackIdsToDelete: string[] = [];
    (existingTasks || []).forEach((t: any) => {
      if (!t.segment_id
        && segmentDirSet.has(`${t.sale_id}|${t.direction}`)
        && t.status !== "CONCLUIDO"
        && t.status !== "CANCELADO") {
        fallbackIdsToDelete.push(t.id);
      }
    });
    if (fallbackIdsToDelete.length > 0) {
      await supabase.from("checkin_tasks").delete().in("id", fallbackIdsToDelete);
      fallbackIdsToDelete.forEach(id => {
        for (const [k, v] of existingMap.entries()) {
          if (v.id === id) existingMap.delete(k);
        }
      });
    }

    const now = new Date();
    const tasksToCreate: any[] = [];
    const tasksToUpdate: any[] = [];

    // Process segments
    if (segments && segments.length > 0) {
      for (const seg of segments) {
        if (!seg.departure_date) continue;

        // Build departure datetime
        let timeStr = seg.departure_time || "12:00";
        // Normalize time: ensure HH:MM format, handle HH:MM:SS from DB
        if (timeStr.split(":").length >= 3) {
          timeStr = timeStr.split(":").slice(0, 2).join(":");
        }
        const depDatetime = new Date(`${seg.departure_date}T${timeStr}:00Z`);
        
        // Skip if already departed more than 24h ago
        if (depDatetime.getTime() < now.getTime() - 24 * 60 * 60 * 1000) continue;

        const rule = rulesMap.get(seg.airline || "");
        const windowHours = rule?.earliest_checkin_hours || 48;
        const criticalHours = 6;

        const openDatetime = new Date(depDatetime.getTime() - windowHours * 60 * 60 * 1000);
        const dueDatetime = new Date(depDatetime.getTime() - criticalHours * 60 * 60 * 1000);

        const hoursUntilDep = (depDatetime.getTime() - now.getTime()) / (1000 * 60 * 60);
        let status = "PENDENTE";
        if (hoursUntilDep <= 0) status = "CRITICO";
        else if (hoursUntilDep <= criticalHours) status = "CRITICO";
        else if (hoursUntilDep <= 24) status = "URGENTE";

        // Check for missing critical data
        const sale = (sales || []).find((s: any) => s.id === seg.sale_id);
        const hasLocator = sale?.locators?.some((l: string) => l && l.trim());
        if (!hasLocator && !seg.flight_number) {
          status = "BLOQUEADO";
        }

        const key = `${seg.sale_id}|${seg.direction}|${seg.id}`;
        const existing = existingMap.get(key);

        if (existing) {
          // Update status if not completed/cancelled
          if (existing.status !== "CONCLUIDO" && existing.status !== "CANCELADO") {
            tasksToUpdate.push({
              id: existing.id,
              status,
              departure_datetime_utc: depDatetime.toISOString(),
              checkin_open_datetime_utc: openDatetime.toISOString(),
              checkin_due_datetime_utc: dueDatetime.toISOString(),
              priority_score: status === "CRITICO" ? 3 : status === "URGENTE" ? 2 : status === "BLOQUEADO" ? 0 : 1,
              updated_at: now.toISOString(),
            });
          }
        } else {
          tasksToCreate.push({
            sale_id: seg.sale_id,
            direction: seg.direction,
            segment_id: seg.id,
            departure_datetime_utc: depDatetime.toISOString(),
            checkin_open_datetime_utc: openDatetime.toISOString(),
            checkin_due_datetime_utc: dueDatetime.toISOString(),
            status,
            priority_score: status === "CRITICO" ? 3 : status === "URGENTE" ? 2 : status === "BLOQUEADO" ? 0 : 1,
            created_by: "SYSTEM",
          });
        }
      }
    }

    // Fallback: sales without segments but with departure_date
    if (sales) {
      for (const sale of sales) {
        // Check if we already have segment-based tasks for this sale
        const hasSegmentTasks = segments?.some((s: any) => s.sale_id === sale.id);
        if (hasSegmentTasks) continue;

        const directions = [
          { dir: "ida", date: sale.departure_date },
          { dir: "volta", date: sale.return_date },
        ];

        for (const { dir, date } of directions) {
          if (!date) continue;

          const depDatetime = new Date(`${date}T12:00:00Z`);
          if (depDatetime.getTime() < now.getTime() - 24 * 60 * 60 * 1000) continue;

          const rule = rulesMap.get(sale.airline || "");
          const windowHours = rule?.earliest_checkin_hours || 48;

          const openDatetime = new Date(depDatetime.getTime() - windowHours * 60 * 60 * 1000);
          const dueDatetime = new Date(depDatetime.getTime() - 6 * 60 * 60 * 1000);

          const hoursUntilDep = (depDatetime.getTime() - now.getTime()) / (1000 * 60 * 60);
          let status = "PENDENTE";
          if (hoursUntilDep <= 0) status = "CRITICO";
          else if (hoursUntilDep <= 6) status = "CRITICO";
          else if (hoursUntilDep <= 24) status = "URGENTE";

          const hasLocator = sale.locators?.some((l: string) => l && l.trim());
          if (!hasLocator) status = "BLOQUEADO";

          const key = `${sale.id}|${dir}|`;
          const existing = existingMap.get(key);

          if (existing) {
            if (existing.status !== "CONCLUIDO" && existing.status !== "CANCELADO") {
              tasksToUpdate.push({
                id: existing.id,
                status,
                departure_datetime_utc: depDatetime.toISOString(),
                checkin_open_datetime_utc: openDatetime.toISOString(),
                checkin_due_datetime_utc: dueDatetime.toISOString(),
                priority_score: status === "CRITICO" ? 3 : status === "URGENTE" ? 2 : 1,
                updated_at: now.toISOString(),
              });
            }
          } else {
            tasksToCreate.push({
              sale_id: sale.id,
              direction: dir,
              segment_id: null,
              departure_datetime_utc: depDatetime.toISOString(),
              checkin_open_datetime_utc: openDatetime.toISOString(),
              checkin_due_datetime_utc: dueDatetime.toISOString(),
              status,
              priority_score: status === "CRITICO" ? 3 : status === "URGENTE" ? 2 : 1,
              created_by: "SYSTEM",
            });
          }
        }
      }
    }

    // Execute
    let created = 0, updated = 0;

    if (tasksToCreate.length > 0) {
      const { error } = await supabase.from("checkin_tasks").insert(tasksToCreate);
      if (error) console.error("Insert error:", error);
      else created = tasksToCreate.length;
    }

    for (const task of tasksToUpdate) {
      const { id, ...updates } = task;
      await supabase.from("checkin_tasks").update(updates).eq("id", id);
      updated++;
    }

    return new Response(
      JSON.stringify({ created, updated, total: created + updated }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("checkin-generate error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
