import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { normalizeProductsToSlugs, inferProductSlugsFromSale } from "../_shared/productTypes.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function cleanCpf(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 11 || digits.length === 14) return digits;
  return null;
}

function cleanPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let s = String(raw).trim();
  // Handle scientific notation from Excel (e.g. "5.51195E+12")
  if (s.includes("E+") || s.includes("e+")) {
    try { s = BigInt(Math.round(Number(s))).toString(); } catch { return null; }
  }
  const digits = s.replace(/\D/g, "");
  if (digits.length >= 10) return digits;
  return null;
}

function parseDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s || s === "undefined") return null;
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10);
  // DD/MM/YYYY
  const dmy = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
  return null;
}

function parseCityState(raw: string | null | undefined): { city: string | null; state: string | null } {
  if (!raw) return { city: null, state: null };
  // "São Paulo, SP, Brasil" or "Rio de Janeiro, RJ, Brasil"
  const parts = raw.split(",").map(p => p.trim());
  if (parts.length >= 2) {
    return { city: parts[0], state: parts[1] };
  }
  return { city: raw.trim(), state: null };
}

function parseNumber(raw: any): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const n = Number(raw);
  return isNaN(n) ? null : n;
}

function normalizeName(name: string): string {
  return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
}

const PREPOSITIONS = new Set(["de", "da", "do", "das", "dos", "e"]);

function smartCapitalizeName(name: string): string {
  const cleaned = name.trim().replace(/\s+/g, " ");
  if (!cleaned) return "";
  return cleaned.split(" ").map((word, index) => {
    const lower = word.toLowerCase();
    if (index > 0 && PREPOSITIONS.has(lower)) return lower;
    if (word.includes("-")) {
      return word.split("-").map(p => p.length > 0 ? p.charAt(0).toUpperCase() + p.slice(1).toLowerCase() : p).join("-");
    }
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }).join(" ");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Guard: shared admin secret. Importa PII de passageiros e vendas com
  // service-role · qualquer chamada não autenticada poderia poluir a base.
  const expected = Deno.env.get("ADMIN_TASK_TOKEN") ?? "";
  const provided = req.headers.get("x-admin-token") ?? "";
  if (!expected || !provided || !timingSafeEqual(expected, provided)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }


  try {
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { passengers: paxRows, sales: saleRows } = await req.json();

    let paxCreated = 0, paxUpdated = 0, salesCreated = 0, costsCreated = 0, linksCreated = 0;

    // ========== 1. IMPORT PASSENGERS ==========
    const paxNameToId: Record<string, string> = {};

    for (const p of (paxRows || [])) {
      const fullName = p.full_name?.trim();
      if (!fullName || fullName.length < 2 || fullName === "Criar nome") continue;

      const cpf = cleanCpf(p.cpf);
      const phone = cleanPhone(p.phone);
      const birthDate = parseDate(p.birth_date);
      const passportNumber = p.passport_number?.trim() || null;
      const passportExpiry = parseDate(p.passport_expiry);
      const { city, state } = parseCityState(p.city);
      const rg = p.rg?.trim() || null;
      const categoria = p.categoria?.trim() || "SILVER";
      const cep = p.cep?.trim() || null;
      const address = p.address?.trim() || null;
      const complement = p.complement?.trim() || null;
      const email = p.email?.trim() || null;
      const gender = p.gender?.trim() || null;

      // Check existing by CPF first
      let existingId: string | null = null;
      if (cpf) {
        const { data } = await sb.from("passengers").select("id").eq("cpf", cpf).maybeSingle();
        if (data) existingId = data.id;
      }

      // Check by normalized name using ilike for exact match
      if (!existingId) {
        const { data: byName } = await sb.from("passengers").select("id").ilike("full_name", fullName).limit(1);
        if (byName && byName.length > 0) existingId = byName[0].id;
      }

      if (existingId) {
        // Update missing fields
        const updates: any = {};
        if (cpf) updates.cpf = cpf;
        if (phone) updates.phone = phone;
        if (birthDate) updates.birth_date = birthDate;
        if (passportNumber) updates.passport_number = passportNumber;
        if (passportExpiry) updates.passport_expiry = passportExpiry;
        if (city) updates.address_city = city;
        if (state) updates.address_state = state;
        if (rg) updates.rg = rg;
        if (categoria) updates.categoria = categoria;
        if (cep) updates.address_cep = cep;
        if (address) updates.address_street = address;
        if (complement) updates.address_complement = complement;
        if (Object.keys(updates).length > 0) {
          await sb.from("passengers").update(updates).eq("id", existingId);
        }
        paxNameToId[normalizeName(fullName)] = existingId;
        paxUpdated++;
      } else {
      const { data: newPax, error } = await sb.from("passengers").insert({
          full_name: smartCapitalizeName(fullName),
          cpf, phone, birth_date: birthDate,
          passport_number: passportNumber, passport_expiry: passportExpiry,
          address_city: city, address_state: state,
          address_cep: cep, address_street: address, address_complement: complement,
          rg, categoria,
        }).select("id").single();

        if (error) { console.error("Insert pax error:", error, fullName); continue; }
        paxNameToId[normalizeName(fullName)] = newPax.id;
        paxCreated++;
      }
    }

    // ========== 2. IMPORT SALES ==========
    for (const sale of (saleRows || [])) {
      if (!sale.name || sale.name.trim().length < 2) continue;
      const rawName = sale.name.trim();
      if (rawName === "teste") continue;
      // Clean sale name: remove suffixes like "- Tassia", "(VINI E TASSIA)", "(Check-in ...)"
      let saleName = rawName
        .replace(/\s*-\s*(Tassia|TASSIA)$/i, "")
        .replace(/^\(.*?\)\s*/i, "")
        .trim();
      if (!saleName || saleName.length < 2) saleName = rawName;
      saleName = smartCapitalizeName(saleName);

      const departureDate = parseDate(sale.departure_date);
      const returnDate = parseDate(sale.return_date);
      const closeDate = parseDate(sale.close_date);
      const receivedValue = parseNumber(sale.received_value) || 0;
      const totalCost = parseNumber(sale.total_cost) || 0;
      const profit = parseNumber(sale.profit) || 0;
      const adults = parseNumber(sale.adults) || 1;
      const children = parseNumber(sale.children) || 0;

      // Parse origin/destination IATA from text
      let originIata: string | null = null;
      let destIata: string | null = null;
      const originText = sale.origin || "";
      const destText = sale.destination || "";
      
      // Try to extract IATA codes from parentheses like "(GRU)"
      const originMatch = originText.match(/\(([A-Z]{3})\)/);
      if (originMatch) originIata = originMatch[1];
      const destMatch = destText.match(/\(([A-Z]{3})\)/);
      if (destMatch) destIata = destMatch[1];

      // Parse products → normalize legacy labels to canonical slugs
      const rawProducts = sale.products ? sale.products.split(",").map((p: string) => p.trim()).filter(Boolean) : [];
      let products = normalizeProductsToSlugs(rawProducts);
      // Fallback: infer from structural data if no explicit products
      if (products.length === 0) {
        products = inferProductSlugsFromSale({
          origin_iata: originIata,
          destination_iata: destIata,
          airline: sale.airline,
          hotel_name: sale.hotel_name,
        });
      }

      // Parse connections
      const connectionsRaw = sale.connections || "";
      const connections = connectionsRaw && connectionsRaw !== "Vôo direto" 
        ? connectionsRaw.split(",").map((c: string) => c.trim()).filter(Boolean) 
        : [];

      // Parse locators
      const locatorsRaw = sale.locators || "";
      const locators = locatorsRaw ? locatorsRaw.split(/[\/,]/).map((l: string) => l.trim()).filter(Boolean) : [];

      // Parse children ages
      const childrenAgesRaw = sale.children_ages || "";
      const childrenAges = childrenAgesRaw ? childrenAgesRaw.split(",").map((a: string) => parseInt(a.trim())).filter((n: number) => !isNaN(n)) : [];

      const { data: newSale, error: saleError } = await sb.from("sales").insert({
        name: saleName,
        status: "Concluída",
        departure_date: departureDate,
        return_date: returnDate,
        close_date: closeDate,
        received_value: receivedValue,
        total_cost: totalCost,
        profit: profit,
        margin: receivedValue > 0 ? (profit / receivedValue) * 100 : 0,
        adults, children,
        children_ages: childrenAges.length > 0 ? childrenAges : null,
        origin_city: sale.origin || null,
        origin_iata: originIata,
        destination_city: sale.destination || null,
        destination_iata: destIata,
        airline: sale.airline || null,
        flight_class: sale.flight_class || null,
        connections: connections.length > 0 ? connections : null,
        locators: locators.length > 0 ? locators : null,
        products: products.length > 0 ? products : null,
        payment_method: sale.payment_method || null,
        observations: sale.observations || null,
        hotel_name: sale.hotel_name || null,
        hotel_room: sale.hotel_room || null,
        hotel_meal_plan: sale.hotel_meal_plan || null,
        hotel_reservation_code: sale.hotel_reservation_code || null,
        tag_chatguru: sale.tag_chatguru || null,
        link_chat: sale.link_chat || null,
        other_codes: sale.other_codes ? sale.other_codes.split(",").map((c: string) => c.trim()).filter(Boolean) : null,
        is_international: !!(destText && (
          destText.includes("Europa") || destText.includes("EUA") || destText.includes("Itália") ||
          destText.includes("Portugal") || destText.includes("Espanha") || destText.includes("França") ||
          destText.includes("Argentina") || destText.includes("Colômbia") || destText.includes("República Dominicana") ||
          destText.includes("Ásia") || destText.includes("Dubai") || destText.includes("Internacional")
        )),
      }).select("id").single();

      if (saleError) { console.error("Insert sale error:", saleError, sale.name); continue; }
      salesCreated++;

      // ========== 3. LINK PASSENGERS TO SALE ==========
      const paxNames = sale.passengers || "";
      if (paxNames && newSale) {
        const names = paxNames.split(",").map((n: string) => n.trim()).filter(Boolean);
        for (const pName of names) {
          const normalized = normalizeName(pName);
          let paxId = paxNameToId[normalized];

          // If not found in map, search DB by ilike
          if (!paxId) {
            const { data: byName } = await sb.from("passengers").select("id").ilike("full_name", pName.trim()).limit(1);
            if (byName && byName.length > 0) {
              paxId = byName[0].id;
              paxNameToId[normalized] = byName[0].id;
            }
          }

          // If still not found, create passenger with just name
          if (!paxId) {
            const { data: created } = await sb.from("passengers").insert({
              full_name: smartCapitalizeName(pName.trim()),
            }).select("id").single();
            if (created) {
              paxId = created.id;
              paxNameToId[normalized] = created.id;
              paxCreated++;
            }
          }

          if (paxId) {
            const { data: existing } = await sb.from("sale_passengers")
              .select("id").eq("sale_id", newSale.id).eq("passenger_id", paxId).maybeSingle();
            if (!existing) {
              await sb.from("sale_passengers").insert({ sale_id: newSale.id, passenger_id: paxId });
              linksCreated++;
            }
          }
        }
      }

      // ========== 4. INSERT COST ITEMS ==========
      if (sale.cost_items && Array.isArray(sale.cost_items) && newSale) {
        for (const ci of sale.cost_items) {
          const desc = ci.description?.trim();
          if (!desc) continue;

          const milesQty = parseNumber(ci.miles_quantity) || 0;
          const milesPrice = parseNumber(ci.miles_price_per_thousand) || 0;
          const cashValue = parseNumber(ci.cash_value) || 0;
          const taxes = parseNumber(ci.taxes) || 0;
          const totalItemCost = parseNumber(ci.total_cost) || 0;
          const milesProgram = ci.miles_program?.trim() || null;
          const emissionSource = ci.emission_source?.trim() || null;

          // Determine category
          let category = "outro";
          const descLower = desc.toLowerCase();
          if (descLower.includes("aereo") || descLower.includes("aéreo") || descLower.includes("passagem") || descLower.includes("voo") || descLower.includes("vôo")) category = "aereo";
          else if (descLower.includes("hotel") || descLower.includes("hospedagem")) category = "hotel";
          else if (descLower.includes("transfer")) category = "transfer";
          else if (descLower.includes("trem")) category = "trem";
          else if (descLower.includes("cruzeiro")) category = "cruzeiro";
          else if (descLower.includes("carro") || descLower.includes("aluguel")) category = "carro";
          else if (descLower.includes("pacote")) category = "pacote";
          else if (descLower.includes("passeio") || descLower.includes("tour")) category = "passeio";
          else if (descLower.includes("seguro")) category = "seguro";

          const milesCostBrl = milesQty > 0 && milesPrice > 0 ? (milesQty / 1000) * milesPrice : 0;

          await sb.from("cost_items").insert({
            sale_id: newSale.id,
            description: desc,
            category,
            miles_quantity: milesQty || null,
            miles_price_per_thousand: milesPrice || null,
            miles_program: milesProgram,
            cash_value: cashValue || null,
            taxes: taxes || null,
            total_item_cost: totalItemCost || null,
            miles_cost_brl: milesCostBrl || null,
            emission_source: emissionSource,
          });
          costsCreated++;
        }
      }
    }

    // Audit log
    await sb.from("audit_log").insert({
      action: "import_monday_data",
      details: `Importação Monday: ${paxCreated} passageiros criados, ${paxUpdated} atualizados, ${salesCreated} vendas, ${costsCreated} custos, ${linksCreated} vínculos`,
    });

    return new Response(JSON.stringify({
      paxCreated, paxUpdated, salesCreated, costsCreated, linksCreated,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("import-monday-data error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
