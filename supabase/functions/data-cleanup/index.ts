import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-token, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function normalizeName(name: string): string {
  return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
}

function cleanCpf(raw: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 11 || digits.length === 14) return digits;
  return null;
}

function formatPhone(raw: string | null): string | null {
  if (!raw) return null;
  let s = String(raw).trim();
  if (s.includes("E+") || s.includes("e+")) {
    try { s = BigInt(Math.round(Number(s))).toString(); } catch { return null; }
  }
  const digits = s.replace(/\D/g, "");
  if (digits.length < 10) return null;
  // Normalize to +55 (XX) XXXXX-XXXX
  let d = digits;
  if (d.startsWith("55") && d.length >= 12) d = d.substring(2);
  if (d.length === 10) return `+55 (${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
  if (d.length === 11) return `+55 (${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
  return `+55 ${d}`;
}

function countFilledFields(obj: any, fields: string[]): number {
  return fields.filter(f => obj[f] && obj[f] !== "atualizar campo").length;
}

// Status mapping
const STATUS_MAP: Record<string, string> = {
  "rascunho": "Lead",
  "lead": "Lead",
  "orçamento": "Orçamento enviado",
  "orcamento": "Orçamento enviado",
  "orçamento enviado": "Orçamento enviado",
  "aguardando pagamento": "Aguardando pagamento",
  "pendente": "Aguardando pagamento",
  "fechado": "Fechado",
  "fechada": "Fechado",
  "aguardando emissão": "Aguardando emissão",
  "aguardando emissao": "Aguardando emissão",
  "emitido": "Emitido",
  "emitida": "Emitido",
  "em andamento": "Viagem em andamento",
  "viagem em andamento": "Viagem em andamento",
  "finalizado": "Finalizado",
  "finalizada": "Finalizado",
  "concluída": "Finalizado",
  "concluida": "Finalizado",
  "cancelado": "Cancelado",
  "cancelada": "Cancelado",
};

// Payment method mapping
const PAYMENT_MAP: Record<string, string> = {
  "pix": "Pix",
  "transferência": "Transferência",
  "transferencia": "Transferência",
  "ted": "Transferência",
  "cartão": "Cartão à vista",
  "cartao": "Cartão à vista",
  "cartão à vista": "Cartão à vista",
  "cartão a vista": "Cartão à vista",
  "cartão parcelado": "Cartão parcelado",
  "cartao parcelado": "Cartão parcelado",
  "boleto": "Boleto",
  "misto": "Misto",
};

async function fetchAll(sb: any, table: string, select = "*"): Promise<any[]> {
  const all: any[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await sb.from(table).select(select).range(offset, offset + 999);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < 1000) break;
    offset += 1000;
  }
  return all;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const stats = {
      paxDuplicatesMerged: 0,
      paxStandardized: 0,
      paxMissingFilled: 0,
      salesStatusFixed: 0,
      salesPaymentFixed: 0,
      salesMissingFilled: 0,
      linksFixed: 0,
    };

    // ========== 1. DEDUPLICATE PASSENGERS ==========
    console.log("Fetching all passengers...");
    const allPax = await fetchAll(sb, "passengers");
    console.log(`Found ${allPax.length} passengers`);

    // Group by normalized name
    const nameGroups: Record<string, any[]> = {};
    for (const p of allPax) {
      const key = normalizeName(p.full_name);
      if (!nameGroups[key]) nameGroups[key] = [];
      nameGroups[key].push(p);
    }

    // Also group by CPF for cross-matching
    const cpfGroups: Record<string, any[]> = {};
    for (const p of allPax) {
      const cpf = cleanCpf(p.cpf);
      if (cpf) {
        if (!cpfGroups[cpf]) cpfGroups[cpf] = [];
        cpfGroups[cpf].push(p);
      }
    }

    // Fetch all sale_passengers links
    const allLinks = await fetchAll(sb, "sale_passengers");

    // Process name duplicates
    const mergedIds = new Set<string>();
    const paxFields = ["full_name", "cpf", "phone", "birth_date", "passport_number", "passport_expiry", "rg", "address_city", "address_state", "address_cep", "address_street", "categoria"];

    for (const [key, group] of Object.entries(nameGroups)) {
      if (group.length <= 1) continue;
      // Filter out already merged
      const active = group.filter(p => !mergedIds.has(p.id));
      if (active.length <= 1) continue;

      // Pick master: most filled fields
      active.sort((a, b) => countFilledFields(b, paxFields) - countFilledFields(a, paxFields));
      const master = active[0];
      const duplicates = active.slice(1);

      // Merge data into master
      const updates: any = {};
      for (const field of paxFields) {
        if (!master[field] || master[field] === "atualizar campo") {
          for (const dup of duplicates) {
            if (dup[field] && dup[field] !== "atualizar campo") {
              updates[field] = dup[field];
              break;
            }
          }
        }
      }

      if (Object.keys(updates).length > 0) {
        await sb.from("passengers").update(updates).eq("id", master.id);
      }

      // Move sale_passengers links to master
      for (const dup of duplicates) {
        const dupLinks = allLinks.filter(l => l.passenger_id === dup.id);
        for (const link of dupLinks) {
          // Check if master already has this sale
          const exists = allLinks.some(l => l.passenger_id === master.id && l.sale_id === link.sale_id);
          if (!exists) {
            await sb.from("sale_passengers").update({ passenger_id: master.id }).eq("id", link.id);
            stats.linksFixed++;
          } else {
            await sb.from("sale_passengers").delete().eq("id", link.id);
          }
        }

        // Delete duplicate passenger
        await sb.from("passengers").delete().eq("id", dup.id);
        mergedIds.add(dup.id);
        stats.paxDuplicatesMerged++;
      }
    }

    // Also merge CPF duplicates (different names, same CPF)
    for (const [cpf, group] of Object.entries(cpfGroups)) {
      const active = group.filter(p => !mergedIds.has(p.id));
      if (active.length <= 1) continue;

      active.sort((a, b) => countFilledFields(b, paxFields) - countFilledFields(a, paxFields));
      const master = active[0];
      const duplicates = active.slice(1);

      const updates: any = {};
      for (const field of paxFields) {
        if (!master[field] || master[field] === "atualizar campo") {
          for (const dup of duplicates) {
            if (dup[field] && dup[field] !== "atualizar campo") {
              updates[field] = dup[field];
              break;
            }
          }
        }
      }
      if (Object.keys(updates).length > 0) {
        await sb.from("passengers").update(updates).eq("id", master.id);
      }

      for (const dup of duplicates) {
        // Refetch links since they may have changed
        const { data: dupLinks } = await sb.from("sale_passengers").select("*").eq("passenger_id", dup.id);
        for (const link of (dupLinks || [])) {
          const { data: existing } = await sb.from("sale_passengers").select("id").eq("passenger_id", master.id).eq("sale_id", link.sale_id).maybeSingle();
          if (!existing) {
            await sb.from("sale_passengers").update({ passenger_id: master.id }).eq("id", link.id);
            stats.linksFixed++;
          } else {
            await sb.from("sale_passengers").delete().eq("id", link.id);
          }
        }
        await sb.from("passengers").delete().eq("id", dup.id);
        mergedIds.add(dup.id);
        stats.paxDuplicatesMerged++;
      }
    }

    // ========== 2. STANDARDIZE PASSENGERS ==========
    console.log("Standardizing passengers...");
    const remainingPax = await fetchAll(sb, "passengers");
    
    for (const p of remainingPax) {
      const updates: any = {};

      // Standardize phone
      const formattedPhone = formatPhone(p.phone);
      if (formattedPhone && formattedPhone !== p.phone) {
        updates.phone = formattedPhone;
      }

      // Standardize CPF
      const cleanedCpf = cleanCpf(p.cpf);
      if (p.cpf && cleanedCpf !== p.cpf) {
        updates.cpf = cleanedCpf;
      }

      // Fill missing essential fields with "atualizar campo"
      if (!p.full_name || p.full_name.length < 2) updates.full_name = "atualizar campo";
      if (!p.phone && !p.cpf) {
        // At least one contact method
        if (!p.phone) updates.phone = "atualizar campo";
      }
      if (!p.birth_date && !p.passport_number) {
        // Need at least one ID
        if (!p.birth_date) updates.birth_date = null; // Can't set date to text, track via missing
      }

      // Standardize categoria
      if (p.categoria) {
        const cat = p.categoria.toUpperCase().trim();
        if (cat === "SILVER" || cat === "LEAD" || !p.categoria) updates.categoria = "Cliente";
        else if (cat === "GOLD" || cat === "VIP") updates.categoria = "VIP";
        else if (cat === "CORPORATE" || cat === "CORPORATIVO") updates.categoria = "Corporate";
      }

      if (Object.keys(updates).length > 0) {
        await sb.from("passengers").update(updates).eq("id", p.id);
        stats.paxStandardized++;
      }
    }

    // ========== 3. STANDARDIZE SALES ==========
    console.log("Standardizing sales...");
    const allSales = await fetchAll(sb, "sales");
    
    for (const sale of allSales) {
      const updates: any = {};

      // Standardize status
      if (sale.status) {
        const normalized = sale.status.toLowerCase().trim();
        const mapped = STATUS_MAP[normalized];
        if (mapped && mapped !== sale.status) {
          updates.status = mapped;
          stats.salesStatusFixed++;
        }
      }

      // Standardize payment method
      if (sale.payment_method) {
        const normalized = sale.payment_method.toLowerCase().trim();
        const mapped = PAYMENT_MAP[normalized];
        if (mapped && mapped !== sale.payment_method) {
          updates.payment_method = mapped;
          stats.salesPaymentFixed++;
        }
      }

      // Fill missing essential fields
      if (!sale.name || sale.name.length < 2) {
        updates.name = "atualizar campo";
        stats.salesMissingFilled++;
      }
      if (!sale.payment_method) {
        updates.payment_method = "atualizar campo";
        stats.salesMissingFilled++;
      }
      if (!sale.origin_iata && !sale.origin_city) {
        updates.origin_city = "atualizar campo";
        stats.salesMissingFilled++;
      }
      if (!sale.destination_iata && !sale.destination_city) {
        updates.destination_city = "atualizar campo";
        stats.salesMissingFilled++;
      }

      // Recalculate margin
      if (sale.received_value && sale.profit) {
        const margin = (sale.profit / sale.received_value) * 100;
        if (Math.abs(margin - (sale.margin || 0)) > 0.1) {
          updates.margin = parseFloat(margin.toFixed(2));
        }
      }

      if (Object.keys(updates).length > 0) {
        await sb.from("sales").update(updates).eq("id", sale.id);
      }
    }

    // Audit log
    await sb.from("audit_log").insert({
      action: "data_cleanup",
      details: `Limpeza: ${stats.paxDuplicatesMerged} duplicados mesclados, ${stats.paxStandardized} pax padronizados, ${stats.salesStatusFixed} status corrigidos, ${stats.salesPaymentFixed} pagamentos padronizados, ${stats.linksFixed} vínculos corrigidos`,
    });

    console.log("Cleanup complete:", stats);

    return new Response(JSON.stringify(stats), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("data-cleanup error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
