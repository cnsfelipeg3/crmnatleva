import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Você é o Concierge.IA da NatLeva, agência de viagens premium brasileira.
Gere conteúdo curto, natural, em PT-BR, sem rodeios poéticos.
Retorne APENAS um JSON válido (sem markdown, sem code fences) com este shape:
{
  "welcome_message": "string (2-4 frases, calorosa, personaliza com nome do cliente e destino, fala como gente — use 'a gente' quando fizer sentido — sem emojis excessivos, sem promessas vazias)",
  "concierge_brief": "string em markdown curto com seções: Melhor época, Moeda & câmbio, Idioma, 3-5 lugares imperdíveis (lista), 2-3 dicas práticas (lista). Sem floreios."
}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const { sale_id, force } = await req.json();
    if (!sale_id) {
      return new Response(JSON.stringify({ error: "sale_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [{ data: sale }, { data: pub }, { data: settings }] = await Promise.all([
      admin.from("sales").select("id,name,destination_iata,origin_iata,departure_date,return_date,client_id").eq("id", sale_id).maybeSingle(),
      admin.from("portal_published_sales").select("welcome_message, concierge_brief").eq("sale_id", sale_id).maybeSingle(),
      admin.from("portal_settings").select("ai_welcome").eq("scope", "global").maybeSingle(),
    ]);

    if (!sale) {
      return new Response(JSON.stringify({ error: "sale not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Idempotency
    const needWelcome = !!settings?.ai_welcome && (force || !(pub?.welcome_message?.trim()));
    const needBrief = force || !(pub?.concierge_brief?.trim());
    if (!needWelcome && !needBrief) {
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let clientName = "viajante";
    if (sale.client_id) {
      const { data: c } = await admin.from("clients").select("display_name").eq("id", sale.client_id).maybeSingle();
      if (c?.display_name) clientName = c.display_name.split(" ")[0];
    }

    const userPrompt = `Cliente: ${clientName}
Viagem: ${sale.name || "Viagem internacional"}
Destino: ${sale.destination_iata || "destino do cliente"} (origem ${sale.origin_iata || "—"})
Período: ${sale.departure_date || "—"} a ${sale.return_date || "—"}

Gere welcome_message e concierge_brief conforme instruído.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 1200,
      }),
      signal: AbortSignal.timeout(45000),
    });

    if (!resp.ok) {
      const t = await resp.text();
      console.error("enrich gateway error:", resp.status, t);
      return new Response(JSON.stringify({ error: "AI failed", detail: t }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const raw: string = data?.choices?.[0]?.message?.content || "";
    const cleaned = raw.replace(/```json\s*|\s*```/g, "").trim();
    let parsed: any = {};
    try { parsed = JSON.parse(cleaned); }
    catch {
      const m = cleaned.match(/\{[\s\S]*\}/);
      if (m) { try { parsed = JSON.parse(m[0]); } catch {} }
    }

    const updates: Record<string, string> = {};
    if (needWelcome && parsed.welcome_message) updates.welcome_message = String(parsed.welcome_message).trim();
    if (needBrief && parsed.concierge_brief) updates.concierge_brief = String(parsed.concierge_brief).trim();

    if (Object.keys(updates).length > 0) {
      const { error: upErr } = await admin.from("portal_published_sales")
        .update(updates)
        .eq("sale_id", sale_id);
      if (upErr) console.error("enrich persist error:", upErr);
    }

    return new Response(JSON.stringify({ ok: true, updated: Object.keys(updates) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("portal-enrich error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
