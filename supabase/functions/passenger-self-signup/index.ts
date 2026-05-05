import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, cache-control, pragma, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// Cache-busting headers (avoid stale 404 / preflight cache on browsers)
const noCacheHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
};

const jsonHeaders = {
  ...corsHeaders,
  ...noCacheHeaders,
  "Content-Type": "application/json",
};

// Rate limit thresholds (per IP)
const LIMIT_10MIN = 20;
const LIMIT_24H = 50;
const VALIDATION_FAILS_AUTOBLOCK = 8; // in 10 min

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

function getIp(req: Request): string {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0].trim();
  return req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") || "unknown";
}

async function logAttempt(sb: any, params: {
  ip: string; ua: string; slug: string; status: string;
  error?: string; email?: string | null; cpf?: string | null;
}) {
  try {
    await sb.from("passenger_signup_attempts").insert({
      ip: params.ip,
      user_agent: params.ua,
      slug: params.slug,
      status: params.status,
      error: params.error || null,
      payload_email: params.email || null,
      payload_cpf: params.cpf || null,
    });
  } catch (e) {
    console.error("logAttempt failed", e);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { ...corsHeaders, ...noCacheHeaders } });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(supabaseUrl, serviceKey);

  const ip = getIp(req);
  const ua = req.headers.get("user-agent") || "";

  try {
    const url = new URL(req.url);

    // ---------- GET: validate link ----------
    if (req.method === "GET") {
      const slug = url.searchParams.get("slug");
      if (!slug) {
        return new Response(JSON.stringify({ error: "slug required" }), { status: 400, headers: jsonHeaders });
      }
      const { data: link } = await sb
        .from("passenger_signup_links")
        .select("id, slug, label, active, expires_at, max_uses, uses_count")
        .eq("slug", slug)
        .maybeSingle();

      if (!link) return new Response(JSON.stringify({ valid: false, reason: "not_found" }), { status: 200, headers: jsonHeaders });
      if (!link.active) return new Response(JSON.stringify({ valid: false, reason: "inactive" }), { status: 200, headers: jsonHeaders });
      if (link.expires_at && new Date(link.expires_at) < new Date()) {
        return new Response(JSON.stringify({ valid: false, reason: "expired" }), { status: 200, headers: jsonHeaders });
      }
      if (link.max_uses && link.uses_count >= link.max_uses) {
        return new Response(JSON.stringify({ valid: false, reason: "limit_reached" }), { status: 200, headers: jsonHeaders });
      }
      return new Response(JSON.stringify({ valid: true, label: link.label }), { status: 200, headers: jsonHeaders });
    }

    // ---------- POST: submit ----------
    const body = await req.json();
    const { slug, payload } = body || {};
    if (!slug || !payload) {
      await logAttempt(sb, { ip, ua, slug: slug || "", status: "validation_error", error: "slug/payload faltando" });
      return new Response(JSON.stringify({ error: "slug e payload são obrigatórios" }), { status: 400, headers: jsonHeaders });
    }

    // 1) IP block check
    const { data: blocked } = await sb
      .from("passenger_signup_blocked_ips")
      .select("ip, reason, blocked_until")
      .eq("ip", ip)
      .maybeSingle();
    if (blocked && (!blocked.blocked_until || new Date(blocked.blocked_until) > new Date())) {
      await logAttempt(sb, { ip, ua, slug, status: "blocked_ip", error: blocked.reason || "ip bloqueado" });
      return new Response(JSON.stringify({
        error: "Este endereço foi temporariamente bloqueado. Se acha que é um engano, fale com a equipe NatLeva pelo WhatsApp.",
        code: "blocked_ip",
      }), { status: 429, headers: jsonHeaders });
    }

    // 2) Rate limit check (10 min and 24h)
    const since10 = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [{ count: c10 }, { count: c24 }, { count: failsRecent }] = await Promise.all([
      sb.from("passenger_signup_attempts").select("id", { count: "exact", head: true }).eq("ip", ip).eq("status", "ok").gte("created_at", since10),
      sb.from("passenger_signup_attempts").select("id", { count: "exact", head: true }).eq("ip", ip).eq("status", "ok").gte("created_at", since24h),
      sb.from("passenger_signup_attempts").select("id", { count: "exact", head: true }).eq("ip", ip).eq("status", "validation_error").gte("created_at", since10),
    ]);

    if ((c10 || 0) >= LIMIT_10MIN) {
      await logAttempt(sb, { ip, ua, slug, status: "blocked_rate", error: `>= ${LIMIT_10MIN} cadastros em 10 min` });
      return new Response(JSON.stringify({
        error: "Muitos cadastros em pouco tempo. Aguarde alguns minutos e tente de novo · se for um grupo grande, fale com a equipe NatLeva pelo WhatsApp.",
        code: "rate_limit_10min",
      }), { status: 429, headers: jsonHeaders });
    }
    if ((c24 || 0) >= LIMIT_24H) {
      await logAttempt(sb, { ip, ua, slug, status: "blocked_rate", error: `>= ${LIMIT_24H} cadastros em 24h` });
      return new Response(JSON.stringify({
        error: "Limite diário de cadastros atingido neste dispositivo. Tente novamente amanhã ou fale com a equipe NatLeva.",
        code: "rate_limit_24h",
      }), { status: 429, headers: jsonHeaders });
    }
    if ((failsRecent || 0) >= VALIDATION_FAILS_AUTOBLOCK) {
      await sb.from("passenger_signup_blocked_ips").upsert({
        ip,
        reason: "auto: muitas falhas de validação",
        blocked_until: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      });
      await logAttempt(sb, { ip, ua, slug, status: "blocked_ip", error: "auto-block por falhas" });
      return new Response(JSON.stringify({
        error: "Muitas tentativas com erros. Acesso temporariamente bloqueado.",
        code: "auto_blocked",
      }), { status: 429, headers: jsonHeaders });
    }

    // 3) Link validity
    const { data: link } = await sb
      .from("passenger_signup_links")
      .select("id, active, expires_at, max_uses, uses_count")
      .eq("slug", slug)
      .maybeSingle();

    if (!link || !link.active) {
      await logAttempt(sb, { ip, ua, slug, status: "validation_error", error: "link inválido" });
      return new Response(JSON.stringify({ error: "Link inválido" }), { status: 400, headers: jsonHeaders });
    }
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      await logAttempt(sb, { ip, ua, slug, status: "validation_error", error: "expirado" });
      return new Response(JSON.stringify({ error: "Link expirado" }), { status: 400, headers: jsonHeaders });
    }
    if (link.max_uses && link.uses_count >= link.max_uses) {
      await logAttempt(sb, { ip, ua, slug, status: "validation_error", error: "limite atingido" });
      return new Response(JSON.stringify({ error: "Limite de cadastros atingido" }), { status: 400, headers: jsonHeaders });
    }

    // 4) Field validation
    const fullName = String(payload.full_name || "").trim();
    if (fullName.length < 3) {
      await logAttempt(sb, { ip, ua, slug, status: "validation_error", error: "nome inválido" });
      return new Response(JSON.stringify({ error: "Nome completo é obrigatório" }), { status: 400, headers: jsonHeaders });
    }

    const cpf = digits(payload.cpf);
    const phone = digits(payload.phone);
    const email = payload.email ? String(payload.email).trim().toLowerCase() : null;
    const internationalOutsideSA = !!payload.international_outside_sa;
    const passportNumber = String(payload.passport_number || "").trim() || null;
    const passportExpiry = payload.passport_expiry || null;
    const passportPhotoUrl = payload.passport_photo_url || null;

    if (internationalOutsideSA) {
      if (!passportNumber || !passportExpiry) {
        await logAttempt(sb, { ip, ua, slug, status: "validation_error", error: "passaporte obrigatório" });
        return new Response(JSON.stringify({ error: "Passaporte e validade obrigatórios para viagem internacional fora da América do Sul" }), { status: 400, headers: jsonHeaders });
      }
    }

    // 5) Duplicate detection (email or cpf or passport)
    if (email || cpf || passportNumber) {
      const orParts: string[] = [];
      if (email) orParts.push(`email.eq.${email}`);
      if (cpf) orParts.push(`cpf.eq.${cpf}`);
      if (passportNumber) orParts.push(`passport_number.eq.${passportNumber}`);
      const { data: existing } = await sb
        .from("passengers")
        .select("id")
        .or(orParts.join(","))
        .limit(1)
        .maybeSingle();
      if (existing) {
        await logAttempt(sb, { ip, ua, slug, status: "duplicate", email, cpf, error: "passageiro já cadastrado" });
        return new Response(JSON.stringify({
          error: "Já existe um cadastro com este e-mail, CPF ou passaporte. Se precisar atualizar seus dados, fale com a equipe NatLeva.",
          code: "duplicate",
        }), { status: 409, headers: jsonHeaders });
      }
    }

    const insertPayload = {
      full_name: smartCapitalize(fullName),
      cpf: cpf || null,
      birth_date: payload.birth_date || null,
      phone: phone || null,
      email,
      rg: payload.rg ? String(payload.rg).trim() : null,
      passport_number: passportNumber,
      passport_expiry: passportExpiry,
      passport_photo_url: passportPhotoUrl,
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
      await logAttempt(sb, { ip, ua, slug, status: "error", email, cpf, error: insertError.message });
      return new Response(JSON.stringify({ error: "Falha ao salvar cadastro" }), { status: 500, headers: jsonHeaders });
    }

    await sb.from("passenger_signup_links")
      .update({ uses_count: (link.uses_count || 0) + 1 })
      .eq("id", link.id);

    await logAttempt(sb, { ip, ua, slug, status: "ok", email, cpf });

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: jsonHeaders });
  } catch (e) {
    console.error("passenger-self-signup error", e);
    await logAttempt(sb, { ip, ua, slug: "", status: "error", error: e instanceof Error ? e.message : "unknown" });
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: jsonHeaders });
  }
});
