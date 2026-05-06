// One-shot helper to create/repair a Supabase Auth user for an existing employee row.
// Body: { email: string, password: string, full_name?: string, employee_id?: string, role?: string }
// - Creates auth user (or updates password if user already exists)
// - Marks email as confirmed
// - Upserts profile
// - Sets role in user_roles (default: vendedor)
// - Links employees.user_id when employee_id is provided
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const srk = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const admin = createClient(url, srk);

    // ─── AUTH GUARD: só admin pode criar/editar contas ───
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: userData.user.id, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: admin role required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, password, full_name, employee_id, role } = await req.json();
    if (!email || !password) throw new Error("email and password are required");

    // 1. Find existing user
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    let user = list?.users?.find((u: any) => (u.email || "").toLowerCase() === email.toLowerCase());

    if (!user) {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: full_name || email },
      });
      if (createErr) throw createErr;
      user = created.user;
    } else {
      const { error: updErr } = await admin.auth.admin.updateUserById(user.id, {
        password,
        email_confirm: true,
        user_metadata: { ...(user.user_metadata || {}), full_name: full_name || user.user_metadata?.full_name || email },
      });
      if (updErr) throw updErr;
    }

    // 2. Upsert profile
    await admin.from("profiles").upsert({
      id: user!.id,
      full_name: full_name || email,
      email,
    });

    // 3. Set role
    const targetRole = role || "vendedor";
    const { data: existingRoles } = await admin.from("user_roles").select("role").eq("user_id", user!.id);
    if (!existingRoles || existingRoles.length === 0) {
      await admin.from("user_roles").insert({ user_id: user!.id, role: targetRole });
    } else if (role) {
      await admin.from("user_roles").delete().eq("user_id", user!.id);
      await admin.from("user_roles").insert({ user_id: user!.id, role: targetRole });
    }

    // 4. Link employee
    if (employee_id) {
      const { error: linkErr } = await admin
        .from("employees")
        .update({ user_id: user!.id, email })
        .eq("id", employee_id);
      if (linkErr) throw linkErr;
    }

    return new Response(
      JSON.stringify({ ok: true, user_id: user!.id, email, role: targetRole }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
