import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { full_name, email, password, phone } = await req.json();

    if (!full_name?.trim() || !email?.trim() || !password || password.length < 6) {
      return new Response(JSON.stringify({ error: "Dados inválidos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const cleanEmail = String(email).trim().toLowerCase();

    // Check if affiliate already exists for this email
    const { data: existingAff } = await admin
      .from("affiliates")
      .select("id")
      .eq("email", cleanEmail)
      .maybeSingle();
    if (existingAff) {
      return new Response(JSON.stringify({ error: "Já existe um cadastro de afiliado com esse e-mail" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create auth user (email NOT auto-confirmed; Supabase sends confirmation email)
    const siteUrl = req.headers.get("origin") || supabaseUrl;
    const { data: created, error: signErr } = await admin.auth.admin.createUser({
      email: cleanEmail,
      password,
      email_confirm: false,
      user_metadata: { full_name: full_name.trim() },
    });

    let userId = created?.user?.id;

    if (signErr || !userId) {
      // If user already exists in auth, try to find them
      const msg = signErr?.message || "";
      if (msg.toLowerCase().includes("already") || msg.toLowerCase().includes("registered")) {
        const { data: list } = await admin.auth.admin.listUsers();
        const found = list?.users?.find((u: any) => u.email?.toLowerCase() === cleanEmail);
        if (found) userId = found.id;
      }
      if (!userId) {
        return new Response(JSON.stringify({ error: signErr?.message || "Erro ao criar usuário" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Send confirmation email (signup link)
    await admin.auth.admin.generateLink({
      type: "signup",
      email: cleanEmail,
      password,
      options: { redirectTo: `${siteUrl}/vitrine/login` },
    }).catch(() => {});

    // Insert affiliate row with service role (bypasses RLS)
    const { error: insErr } = await admin.from("affiliates").insert({
      user_id: userId,
      full_name: full_name.trim(),
      email: cleanEmail,
      phone: phone ?? null,
      status: "pending",
    });

    if (insErr && insErr.code !== "23505") {
      return new Response(JSON.stringify({ error: insErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, user_id: userId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || "Erro inesperado" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
