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
    const admin = createClient(url, srk);

    const presidents = [
      { email: "tiago@natleva.com", password: "N@ti20012019", full_name: "Tiago - Presidente" },
      { email: "nathalia@natleva.com", password: "N@ti20012019", full_name: "Nathalia - Presidente" },
    ];

    const results: any[] = [];
    for (const p of presidents) {
      // try to find existing user
      const { data: list } = await admin.auth.admin.listUsers();
      let user = list?.users?.find((u: any) => u.email === p.email);

      if (!user) {
        const { data: created, error: createErr } = await admin.auth.admin.createUser({
          email: p.email,
          password: p.password,
          email_confirm: true,
          user_metadata: { full_name: p.full_name },
        });
        if (createErr) { results.push({ email: p.email, error: createErr.message }); continue; }
        user = created.user;
      } else {
        // update password to ensure it matches
        await admin.auth.admin.updateUserById(user.id, { password: p.password, email_confirm: true });
      }

      // ensure profile
      await admin.from("profiles").upsert({ id: user!.id, full_name: p.full_name, email: p.email });

      // wipe non-admin roles and set admin
      await admin.from("user_roles").delete().eq("user_id", user!.id);
      const { error: roleErr } = await admin.from("user_roles").insert({ user_id: user!.id, role: "admin" });

      results.push({ email: p.email, user_id: user!.id, role: roleErr ? `ERR: ${roleErr.message}` : "admin" });
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
