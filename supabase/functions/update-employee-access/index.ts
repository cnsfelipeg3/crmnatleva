import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PRESIDENT_EMAILS = ["nathalia@natleva.com"];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Não autenticado");

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) throw new Error("Não autenticado");

    const admin = createClient(supabaseUrl, serviceRoleKey);

    // Authorize: caller must be admin OR a president email
    const callerEmail = (caller.email || "").toLowerCase();
    const isPresident = PRESIDENT_EMAILS.includes(callerEmail);

    let isAdmin = false;
    if (!isPresident) {
      const { data: roles } = await admin
        .from("user_roles")
        .select("role")
        .eq("user_id", caller.id);
      isAdmin = (roles ?? []).some((r: any) => r.role === "admin");
    }

    if (!isPresident && !isAdmin) {
      return new Response(JSON.stringify({ error: "Apenas presidente/admin pode alterar acessos" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { user_id, new_email, new_password } = await req.json();
    if (!user_id || typeof user_id !== "string") {
      return new Response(JSON.stringify({ error: "user_id obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const updates: Record<string, any> = {};
    if (typeof new_email === "string" && new_email.trim()) {
      updates.email = new_email.trim().toLowerCase();
      updates.email_confirm = true;
    }
    if (typeof new_password === "string" && new_password.length >= 6) {
      updates.password = new_password;
    }

    if (Object.keys(updates).length === 0) {
      return new Response(JSON.stringify({ error: "Nada para atualizar (senha mínima 6 caracteres)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data, error } = await admin.auth.admin.updateUserById(user_id, updates);
    if (error) throw error;

    // Sync profile email if changed
    if (updates.email) {
      await admin.from("profiles").update({ email: updates.email }).eq("id", user_id);
    }

    return new Response(JSON.stringify({
      success: true,
      email: data.user?.email,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
