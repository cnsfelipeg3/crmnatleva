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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: jsonHeaders });

  try {
    const { full_name, email, password, phone } = await req.json();
    const cleanName = String(full_name || "").trim().replace(/\s+/g, " ");
    const cleanEmail = String(email || "").trim().toLowerCase();

    if (!cleanName || !isLikelyEmail(cleanEmail) || !password || String(password).length < 6) {
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

    // 1) Já existe afiliado com esse e-mail? Reenvia confirmação e retorna rápido.
    const { data: existingAff } = await admin
      .from("affiliates")
      .select("id, user_id, status")
      .eq("email", cleanEmail)
      .maybeSingle();

    if (existingAff) {
      // tenta reenviar a confirmação (sem bloquear se falhar)
      const { error: resendErr } = await auth.auth.resend({
        type: "signup",
        email: cleanEmail,
        options: { emailRedirectTo: redirectTo },
      });
      const confirmed = resendErr && /already.*confirmed/i.test(resendErr.message);
      return json(200, {
        ok: true,
        existing: true,
        message: confirmed
          ? "Esse e-mail já está confirmado. Faça login pra acessar a vitrine."
          : "Esse cadastro já existia. Reenviamos o e-mail de confirmação pra você.",
      });
    }

    // 2) Fluxo padrão: signUp anônimo (cria usuário + envia e-mail de confirmação numa só chamada)
    const { data: signData, error: signErr } = await auth.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        emailRedirectTo: redirectTo,
        data: { full_name: cleanName, phone: phone ?? null },
      },
    });

    if (signErr) {
      const msg = signErr.message || "";
      // Usuário já existe no auth, mas sem affiliate -> cria affiliate e reenviar confirmação
      if (/already.*registered|already.*exists/i.test(msg)) {
        const { error: resendErr } = await auth.auth.resend({
          type: "signup",
          email: cleanEmail,
          options: { emailRedirectTo: redirectTo },
        });
        // tenta localizar o user_id pelo admin
        let userId: string | undefined;
        try {
          const { data: list } = await admin.auth.admin.listUsers();
          userId = list?.users?.find((u) => u.email?.toLowerCase() === cleanEmail)?.id;
        } catch (_) { /* ignore */ }

        if (userId) {
          await admin.from("affiliates").insert({
            user_id: userId,
            full_name: cleanName,
            email: cleanEmail,
            phone: phone ?? null,
            status: "pending",
          });
        }
        return json(200, {
          ok: true,
          existing: true,
          message: resendErr && /already.*confirmed/i.test(resendErr.message)
            ? "Esse e-mail já está confirmado. Faça login pra acessar a vitrine."
            : "Esse e-mail já tinha cadastro. Reenviamos a confirmação pra você.",
        });
      }
      return json(400, { error: msg || "Erro ao criar cadastro" });
    }

    const userId = signData?.user?.id;
    if (!userId) {
      // Confirmação por e-mail ativa: signUp pode retornar user=null. Tenta achar pelo admin.
      try {
        const { data: list } = await admin.auth.admin.listUsers();
        const found = list?.users?.find((u) => u.email?.toLowerCase() === cleanEmail);
        if (found) {
          await admin.from("affiliates").insert({
            user_id: found.id,
            full_name: cleanName,
            email: cleanEmail,
            phone: phone ?? null,
            status: "pending",
          });
        }
      } catch (_) { /* ignore */ }

      return json(200, {
        ok: true,
        message: "Cadastro criado. Enviamos o e-mail de confirmação pra ativar sua conta.",
      });
    }

    // 3) Cria o registro do afiliado (service role bypassa RLS)
    const { error: insErr } = await admin.from("affiliates").insert({
      user_id: userId,
      full_name: cleanName,
      email: cleanEmail,
      phone: phone ?? null,
      status: "pending",
    });
    if (insErr && insErr.code !== "23505") {
      // não bloqueia o sucesso do signup; apenas reporta o problema interno
      return json(200, {
        ok: true,
        user_id: userId,
        message: "Cadastro criado. Enviamos o e-mail de confirmação. (Aviso: registro de afiliado pendente)",
        warn: insErr.message,
      });
    }

    return json(200, {
      ok: true,
      user_id: userId,
      message: "Cadastro criado. Enviamos o e-mail de confirmação pra ativar sua conta.",
    });
  } catch (err: unknown) {
    return json(500, { error: getErrorMessage(err) });
  }
});
