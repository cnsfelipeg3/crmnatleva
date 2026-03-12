import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify CRM user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await anonClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Verify CRM role
    const { data: role } = await admin.from("user_roles").select("role").eq("user_id", user.id).single();
    if (!role) {
      return new Response(JSON.stringify({ error: "CRM access required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { client_id, sale_id, client_email, cover_image_url, custom_title, notes_for_client } = body;

    if (!client_id || !sale_id || !client_email) {
      return new Response(JSON.stringify({ error: "client_id, sale_id, client_email required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if client already has portal access
    const { data: existingAccess } = await admin
      .from("portal_access")
      .select("*")
      .eq("client_id", client_id)
      .single();

    let portalUserId: string;

    if (existingAccess) {
      portalUserId = existingAccess.user_id;
    } else {
      // Create auth user for the client
      const tempPassword = "NatLeva@" + Math.random().toString(36).slice(-8) + "!";

      const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
        email: client_email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { is_portal_user: true },
      });

      if (createErr) {
        // If user already exists in auth, find them
        if (createErr.message?.includes("already been registered")) {
          const { data: { users } } = await admin.auth.admin.listUsers();
          const found = users?.find((u: any) => u.email === client_email);
          if (found) {
            portalUserId = found.id;
          } else {
            return new Response(JSON.stringify({ error: createErr.message }), {
              status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        } else {
          return new Response(JSON.stringify({ error: createErr.message }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } else {
        portalUserId = newUser.user.id;
      }

      // Create portal_access
      const { error: accessErr } = await admin.from("portal_access").insert({
        user_id: portalUserId!,
        client_id,
        is_active: true,
        must_change_password: true,
      });

      if (accessErr && !accessErr.message?.includes("duplicate")) {
        return new Response(JSON.stringify({ error: accessErr.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Publish the sale
    const { error: pubErr } = await admin.from("portal_published_sales").upsert({
      sale_id,
      client_id,
      published_by: user.id,
      is_active: true,
      cover_image_url: cover_image_url || null,
      custom_title: custom_title || null,
      notes_for_client: notes_for_client || null,
    }, { onConflict: "sale_id" });

    if (pubErr) {
      return new Response(JSON.stringify({ error: pubErr.message }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: "Viagem publicada no portal do cliente",
      portal_user_id: portalUserId!,
      is_new_user: !existingAccess,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
