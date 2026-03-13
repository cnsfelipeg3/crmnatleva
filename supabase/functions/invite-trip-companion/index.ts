import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller is a portal user
    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await anonClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Verify caller has portal access
    const { data: callerAccess } = await admin
      .from("portal_access")
      .select("client_id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single();

    if (!callerAccess) {
      return new Response(JSON.stringify({ error: "Sem acesso ao portal" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { sale_id, passenger_name, email } = body;

    if (!sale_id || !email || !passenger_name) {
      return new Response(JSON.stringify({ error: "sale_id, passenger_name e email são obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({ error: "E-mail inválido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Block inviting the titular (primary) passenger
    const { data: salePassengers } = await admin
      .from("sale_passengers")
      .select("role, passengers(full_name, email)")
      .eq("sale_id", sale_id);

    const titularPax = (salePassengers || []).find(
      (sp: any) => sp.role === "titular" || sp.role === "Titular"
    );
    if (titularPax) {
      const titularEmail = (titularPax as any).passengers?.email;
      const titularName = (titularPax as any).passengers?.full_name;
      if (
        (titularEmail && titularEmail.toLowerCase() === email.toLowerCase()) ||
        (titularName && titularName.toLowerCase() === passenger_name.toLowerCase() && titularPax.role?.toLowerCase() === "titular")
      ) {
        return new Response(JSON.stringify({ error: "O titular da viagem já possui acesso e não pode ser convidado." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Verify the sale is published for the caller's client
    const { data: published } = await admin
      .from("portal_published_sales")
      .select("*")
      .eq("sale_id", sale_id)
      .eq("client_id", callerAccess.client_id)
      .eq("is_active", true)
      .single();

    if (!published) {
      return new Response(JSON.stringify({ error: "Viagem não encontrada" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find or create a client for the companion
    let companionClientId: string;

    // Try to find existing client by email
    const { data: existingClient } = await admin
      .from("clients")
      .select("id")
      .eq("email", email)
      .single();

    if (existingClient) {
      companionClientId = existingClient.id;
    } else {
      // Create a new client record for the companion
      const { data: newClient, error: clientErr } = await admin
        .from("clients")
        .insert({
          display_name: passenger_name,
          email,
          client_type: "pessoa_fisica",
        })
        .select("id")
        .single();

      if (clientErr) {
        return new Response(JSON.stringify({ error: "Erro ao criar registro do convidado: " + clientErr.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      companionClientId = newClient.id;
    }

    // Create auth user (or find existing)
    let portalUserId: string;
    const tempPassword = "NatLeva@" + Math.random().toString(36).slice(-8) + "!";

    const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { is_portal_user: true },
    });

    if (createErr) {
      if (createErr.message?.includes("already been registered")) {
        const { data: { users } } = await admin.auth.admin.listUsers();
        const found = users?.find((u: any) => u.email === email);
        if (found) {
          portalUserId = found.id;
        } else {
          return new Response(JSON.stringify({ error: "Usuário já cadastrado mas não encontrado" }), {
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

    // Create portal_access for companion
    const { error: accessErr } = await admin.from("portal_access").upsert({
      user_id: portalUserId!,
      client_id: companionClientId,
      is_active: true,
      must_change_password: true,
    }, { onConflict: "client_id" });

    if (accessErr && !accessErr.message?.includes("duplicate")) {
      console.error("Portal access error:", accessErr);
    }

    // Publish the same sale for the companion
    const { error: pubErr } = await admin.from("portal_published_sales").upsert({
      sale_id,
      client_id: companionClientId,
      published_by: user.id,
      is_active: true,
      cover_image_url: published.cover_image_url,
      custom_title: published.custom_title,
      notes_for_client: published.notes_for_client,
    }, { onConflict: "sale_id,client_id" });

    if (pubErr) {
      // Try insert if upsert fails (no unique constraint on sale_id,client_id)
      await admin.from("portal_published_sales").insert({
        sale_id,
        client_id: companionClientId,
        published_by: user.id,
        is_active: true,
        cover_image_url: published.cover_image_url,
        custom_title: published.custom_title,
        notes_for_client: published.notes_for_client,
      });
    }

    // Create notification for the companion
    await admin.from("portal_notifications").insert({
      client_id: companionClientId,
      sale_id,
      notification_type: "trip_published",
      title: "Você foi convidado para uma viagem! 🎉",
      message: `${user.email} compartilhou uma viagem com você. Acesse o portal para conferir todos os detalhes.`,
      channel: "portal",
      status: "sent",
      sent_at: new Date().toISOString(),
      metadata: { key: `invite_${sale_id}_${companionClientId}`, invited_by: user.id },
    });

    // Get caller's client name for response
    const { data: callerClient } = await admin.from("clients").select("display_name").eq("id", callerAccess.client_id).single();

    return new Response(JSON.stringify({
      success: true,
      message: `Convite enviado para ${passenger_name} (${email})`,
      temp_password: tempPassword,
      is_new_user: !createErr,
      companion_name: passenger_name,
      inviter_name: callerClient?.display_name || "Cliente NatLeva",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Invite companion error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
