import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanCpf(cpf: string | null | undefined): string | null {
  if (!cpf) return null;
  const digits = cpf.replace(/\D/g, "");
  return digits.length === 11 ? digits : null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    // 1. Get all extraction_runs with passenger data
    const { data: runs } = await sb
      .from("extraction_runs")
      .select("id, sale_id, extracted_json")
      .eq("status", "completed")
      .not("sale_id", "is", null);

    let created = 0;
    let linked = 0;
    let skipped = 0;

    // Also get all sales to extract names from sale name field
    const { data: allSales } = await sb.from("sales").select("id, name, adults, children");

    for (const run of (runs || [])) {
      const json = run.extracted_json as any;
      if (!json?.fields) continue;
      const saleId = run.sale_id;

      // Extract passenger_details from the AI extraction
      const details: any[] = json.fields.passenger_details || [];
      // Also try passenger_names as fallback
      const names: any[] = json.fields.passenger_names || [];

      const passengers: { full_name: string; cpf: string | null; phone: string | null; passport_number: string | null; birth_date: string | null; address_city: string | null; address_state: string | null; address_cep: string | null; address_street: string | null; address_number: string | null; address_neighborhood: string | null }[] = [];

      // From detailed passenger_details
      for (const d of details) {
        const name = d.full_name || d.value;
        if (!name || typeof name !== "string" || name.trim().length < 2) continue;
        passengers.push({
          full_name: name.trim(),
          cpf: d.cpf || null,
          phone: d.phone || null,
          passport_number: d.passport_number || null,
          birth_date: d.birth_date || null,
          address_city: d.address_city || null,
          address_state: d.address_state || null,
          address_cep: d.address_cep || null,
          address_street: d.address_street || null,
          address_number: d.address_number || null,
          address_neighborhood: d.address_neighborhood || null,
        });
      }

      // From passenger_names (if no details)
      if (passengers.length === 0) {
        for (const n of names) {
          const name = n.value || n;
          if (!name || typeof name !== "string" || name.trim().length < 2) continue;
          passengers.push({
            full_name: name.trim(),
            cpf: null, phone: null, passport_number: null, birth_date: null,
            address_city: null, address_state: null, address_cep: null,
            address_street: null, address_number: null, address_neighborhood: null,
          });
        }
      }

      for (const pax of passengers) {
        const cleanedCpf = cleanCpf(pax.cpf);
        let existingId: string | null = null;

        // Match by CPF (strong)
        if (cleanedCpf) {
          const { data: byCpf } = await sb
            .from("passengers")
            .select("id")
            .eq("cpf", cleanedCpf)
            .limit(1)
            .maybeSingle();
          if (byCpf) existingId = byCpf.id;
        }

        // Match by passport (strong)
        if (!existingId && pax.passport_number) {
          const { data: byPassport } = await sb
            .from("passengers")
            .select("id")
            .eq("passport_number", pax.passport_number)
            .limit(1)
            .maybeSingle();
          if (byPassport) existingId = byPassport.id;
        }

        // Match by normalized name (medium)
        if (!existingId) {
          const normalized = normalizeName(pax.full_name);
          const { data: byName } = await sb
            .from("passengers")
            .select("id, full_name")
            .limit(100);
          if (byName) {
            const match = byName.find(p => normalizeName(p.full_name) === normalized);
            if (match) existingId = match.id;
          }
        }

        if (existingId) {
          // Update missing fields only
          const updates: any = {};
          if (cleanedCpf) updates.cpf = cleanedCpf;
          if (pax.phone) updates.phone = pax.phone;
          if (pax.passport_number) updates.passport_number = pax.passport_number;
          if (pax.birth_date) updates.birth_date = pax.birth_date;
          if (pax.address_city) updates.address_city = pax.address_city;
          if (pax.address_state) updates.address_state = pax.address_state;
          if (pax.address_cep) updates.address_cep = pax.address_cep;
          if (pax.address_street) updates.address_street = pax.address_street;
          if (pax.address_number) updates.address_number = pax.address_number;
          if (pax.address_neighborhood) updates.address_neighborhood = pax.address_neighborhood;

          if (Object.keys(updates).length > 0) {
            await sb.from("passengers").update(updates).eq("id", existingId).is("cpf", null);
          }
          skipped++;
        } else {
          // Create new passenger
          const { data: newPax, error } = await sb.from("passengers").insert({
            full_name: pax.full_name,
            cpf: cleanedCpf,
            phone: pax.phone,
            passport_number: pax.passport_number,
            birth_date: pax.birth_date,
            address_city: pax.address_city,
            address_state: pax.address_state,
            address_cep: pax.address_cep,
            address_street: pax.address_street,
            address_number: pax.address_number,
            address_neighborhood: pax.address_neighborhood,
          }).select("id").single();

          if (error) {
            console.error("Insert passenger error:", error);
            continue;
          }
          existingId = newPax.id;
          created++;
        }

        // Link to sale (avoid duplicates)
        if (saleId && existingId) {
          const { data: existingLink } = await sb
            .from("sale_passengers")
            .select("id")
            .eq("sale_id", saleId)
            .eq("passenger_id", existingId)
            .maybeSingle();

          if (!existingLink) {
            await sb.from("sale_passengers").insert({
              sale_id: saleId,
              passenger_id: existingId,
            });
            linked++;
          }
        }
      }
    }

    // Audit log
    await sb.from("audit_log").insert({
      action: "backfill_passengers",
      details: `Backfill passageiros: ${created} criados, ${linked} vinculados, ${skipped} existentes atualizados`,
    });

    return new Response(JSON.stringify({ created, linked, skipped }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("backfill-passengers error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
