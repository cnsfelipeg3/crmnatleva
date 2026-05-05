import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function smartCapitalize(name: string): string {
  if (!name) return name;
  const lows = new Set(["de", "da", "do", "das", "dos", "e"]);
  return name
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((w, i) => {
      const lw = w.toLowerCase();
      if (i > 0 && lows.has(lw)) return lw;
      return lw.charAt(0).toUpperCase() + lw.slice(1);
    })
    .join(" ");
}

function digits(v: string | null | undefined): string {
  return (v || "").replace(/\D/g, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(supabaseUrl, serviceKey);

  try {
    const url = new URL(req.url);

    // GET: validate and return public link metadata
    if (req.method === "GET") {
      const slug = url.searchParams.get("slug");
      if (!slug) {
        return new Response(JSON.stringify({ error: "slug required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { data: link } = await sb
        .from("passenger_signup_links")
        .select("id, slug, label, active, expires_at, max_uses, uses_count")
        .eq("slug", slug)
        .maybeSingle();

      if (!link) return new Response(JSON.stringify({ valid: false, reason: "not_found" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (!link.active) return new Response(JSON.stringify({ valid: false, reason: "inactive" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (link.expires_at && new Date(link.expires_at) < new Date()) {
        return new Response(JSON.stringify({ valid: false, reason: "expired" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (link.max_uses && link.uses_count >= link.max_uses) {
        return new Response(JSON.stringify({ valid: false, reason: "limit_reached" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ valid: true, label: link.label }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // POST: submit
    const body = await req.json();
    const { slug, payload } = body || {};
    if (!slug || !payload) {
      return new Response(JSON.stringify({ error: "slug e payload são obrigatórios" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: link } = await sb
      .from("passenger_signup_links")
      .select("id, active, expires_at, max_uses, uses_count")
      .eq("slug", slug)
      .maybeSingle();

    if (!link || !link.active) return new Response(JSON.stringify({ error: "Link inválido" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "Link expirado" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (link.max_uses && link.uses_count >= link.max_uses) {
      return new Response(JSON.stringify({ error: "Limite de cadastros atingido" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const fullName = String(payload.full_name || "").trim();
    if (fullName.length < 3) {
      return new Response(JSON.stringify({ error: "Nome completo é obrigatório" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const cpf = digits(payload.cpf);
    const phone = digits(payload.phone);
    const internationalOutsideSA = !!payload.international_outside_sa;
    const passportNumber = String(payload.passport_number || "").trim() || null;
    const passportExpiry = payload.passport_expiry || null;

    if (internationalOutsideSA) {
      if (!passportNumber || !passportExpiry) {
        return new Response(JSON.stringify({ error: "Passaporte e validade obrigatórios para viagem internacional fora da América do Sul" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    const insertPayload = {
      full_name: smartCapitalize(fullName),
      cpf: cpf || null,
      birth_date: payload.birth_date || null,
      phone: phone || null,
      email: payload.email ? String(payload.email).trim().toLowerCase() : null,
      rg: payload.rg ? String(payload.rg).trim() : null,
      passport_number: passportNumber,
      passport_expiry: passportExpiry,
      address_cep: digits(payload.address_cep) || null,
      address_street: payload.address_street || null,
      address_number: payload.address_number || null,
      address_complement: payload.address_complement || null,
      address_neighborhood: payload.address_neighborhood || null,
      address_city: payload.address_city || null,
      address_state: payload.address_state || null,
      created_via: "self_signup",
      signup_link_id: link.id,
    };

    const { error: insertError } = await sb.from("passengers").insert(insertPayload);
    if (insertError) {
      console.error("insert error", insertError);
      return new Response(JSON.stringify({ error: "Falha ao salvar cadastro" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    await sb
      .from("passenger_signup_links")
      .update({ uses_count: (link.uses_count || 0) + 1 })
      .eq("id", link.id);

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("passenger-self-signup error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
