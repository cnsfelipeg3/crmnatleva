import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, cache-control, pragma, x-supabase-client-platform, x-supabase-client-runtime",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonHeaders = {
  ...corsHeaders,
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
  "Content-Type": "application/json",
};

const publicFallbackUrl = "https://adm.natleva.com";

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

function isLikelyEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error || "Erro inesperado");
}

function isAlreadyConfirmed(message: string) {
  const normalized = message.toLowerCase();
  return normalized.includes("already confirmed") || normalized.includes("already been confirmed");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: jsonHeaders });

  try {
    const { full_name, email, password, phone } = await req.json();
    const cleanName = String(full_name || "").trim().replace(/\s+/g, " ");
    const cleanEmail = String(email || "").trim().toLowerCase();

    if (!cleanName || !isLikelyEmail(cleanEmail) || !password || password.length < 6) {
      return json(400, { error: "Confira nome, e-mail e senha antes de enviar" });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const auth = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    const origin = req.headers.get("origin");
    const siteUrl = origin?.startsWith("http") ? origin : publicFallbackUrl;
    const redirectTo = `${siteUrl}/vitrine/login`;

    const resendConfirmation = async () => auth.auth.resend({
      type: "signup",
      email: cleanEmail,
      options: { emailRedirectTo: redirectTo },
    });

    // Check if affiliate already exists for this email
    const { data: existingAff } = await admin
      .from("affiliates")
      .select("id")
      .eq("email", cleanEmail)
      .maybeSingle();
    if (existingAff) {
      const { error: resendErr } = await resendConfirmation();
      if (resendErr && !isAlreadyConfirmed(resendErr.message)) {
        return json(409, { error: "Já existe um cadastro com esse e-mail, mas não conseguimos reenviar a confirmação agora. Tente reenviar pela tela de login." });
      }
      return json(200, {
        ok: true,
        existing: true,
        message: resendErr
          ? "Esse cadastro já existe e o e-mail já está confirmado. Faça login para acessar a vitrine."
          : "Esse cadastro já existia. Reenviamos o e-mail de confirmação para você.",
      });
    }

    // Create auth user without auto-confirming. The confirmation email is sent explicitly below.
    const { data: created, error: signErr } = await admin.auth.admin.createUser({
      email: cleanEmail,
      password,
      email_confirm: false,
      user_metadata: { full_name: cleanName },
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
        return json(400, { error: signErr?.message || "Erro ao criar usuário" });
      }
    }

    const { error: resendErr } = await resendConfirmation();
    if (resendErr && !isAlreadyConfirmed(resendErr.message)) {
      return json(502, { error: `Cadastro criado, mas o e-mail de confirmação não foi enviado. Tente reenviar pela tela de login. Detalhe: ${resendErr.message}` });
    }

    // Insert affiliate row with service role (bypasses RLS)
    const { error: insErr } = await admin.from("affiliates").insert({
      user_id: userId,
      full_name: cleanName,
      email: cleanEmail,
      phone: phone ?? null,
      status: "pending",
    });

    if (insErr && insErr.code !== "23505") {
      return json(500, { error: insErr.message });
    }

    return json(200, {
      ok: true,
      user_id: userId,
      message: "Cadastro criado. Enviamos o e-mail de confirmação para ativar sua conta.",
    });
  } catch (err: unknown) {
    return json(500, { error: getErrorMessage(err) });
  }
});
