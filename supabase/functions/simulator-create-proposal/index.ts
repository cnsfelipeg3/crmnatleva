// Edge Function: simulator-create-proposal
// Reads a simulator transcript, extracts trip data via Lovable AI (tool calling),
// creates a draft proposal (status='rascunho_ia') linked to the simulator session,
// and returns { proposalId, slug, reused }.
//
// Idempotent by simulator_session_id: if a proposal already exists, returns it.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TEMPLATE_RULES: Array<{ keywords: RegExp; templateNames: RegExp }> = [
  { keywords: /safari|tanz[âa]nia|zanzibar|qu[êe]nia|serengeti|kruger|botsuana|nam[íi]bia|africa/i, templateNames: /safari/i },
  { keywords: /lua de mel|honeymoon|rom[âa]ntic|casamento|noivos|bodas/i, templateNames: /lua de mel|romance|rom[âa]ntic/i },
  { keywords: /jap[ãa]o|t[óo]quio|kyoto|tail[âa]ndia|bangkok|bali|vietnam|singapura|[áa]sia/i, templateNames: /[áa]sia|asia|futurista/i },
  { keywords: /maldivas|caribe|canc[úu]n|punta cana|aruba|bahamas|praia|resort|tropical|orlando|miami|nordeste|fortaleza|salvador|recife|natal/i, templateNames: /tropical/i },
  { keywords: /gr[ée]cia|santorini|it[áa]lia|roma|paris|londres|amsterdam|barcelona|madrid|europa|portugal|lisboa|cro[áa]cia|su[íi]?[çc]a|viena|praga|budapeste/i, templateNames: /eleg[âa]ncia|cl[áa]ssica/i },
];

function generateSlug(title: string): string {
  return (
    title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) +
    "-" +
    Date.now().toString(36)
  );
}

async function pickTemplate(sb: any, searchText: string): Promise<string | null> {
  try {
    const { data: templates } = await sb
      .from("proposal_templates")
      .select("id, name, description, is_default")
      .eq("is_active", true);
    if (!templates || templates.length === 0) return null;
    for (const rule of TEMPLATE_RULES) {
      if (rule.keywords.test(searchText)) {
        const m = templates.find((t: any) => rule.templateNames.test(t.name) || rule.templateNames.test(t.description || ""));
        if (m) return m.id;
      }
    }
    const def = templates.find((t: any) => t.is_default);
    return def?.id || templates[0]?.id || null;
  } catch {
    return null;
  }
}

interface InMessage {
  role: "user" | "agent" | "client" | "lead";
  content: string;
  agentName?: string;
}

const EXTRACTION_TOOL = {
  type: "function",
  function: {
    name: "extract_trip_brief",
    description: "Extract a structured travel brief from a chat transcript between a client and a travel agent.",
    parameters: {
      type: "object",
      properties: {
        destination: { type: "string", description: "Main destination city or region (e.g. 'Dubai', 'Paris', 'Maldivas'). Empty string if unknown." },
        origin: { type: "string", description: "Origin city/airport mentioned by client. Empty string if unknown." },
        departure_date: { type: "string", description: "Departure date in YYYY-MM-DD if explicit, otherwise empty string." },
        return_date: { type: "string", description: "Return date in YYYY-MM-DD if explicit, otherwise empty string." },
        adults: { type: "integer", description: "Number of adult passengers. Default 2 if unknown." },
        children: { type: "integer", description: "Number of children. Default 0." },
        infants: { type: "integer", description: "Number of infants. Default 0." },
        cabin_class: { type: "string", enum: ["economy", "premium_economy", "business", "first", ""], description: "Flight cabin class. Empty if unknown." },
        hotel_needed: { type: "boolean" },
        transfer_needed: { type: "boolean" },
        insurance_needed: { type: "boolean" },
        budget_brl: { type: "string", description: "Budget mentioned (e.g. 'R$ 15.000', 'aberto'). Empty if unknown." },
        special_requests: { type: "string", description: "Any special requests, preferences, dietary needs, occasion (honeymoon, anniversary, etc). Empty if none." },
        client_name: { type: "string", description: "Client full name if mentioned, else empty." },
        client_profile: { type: "string", description: "Short profile (1 phrase): luxury, family, adventure, business, romantic, etc." },
        confidence: { type: "string", enum: ["alta", "média", "baixa"] },
      },
      required: ["destination", "origin", "adults", "children", "infants", "hotel_needed", "transfer_needed", "insurance_needed", "confidence"],
      additionalProperties: false,
    },
  },
};

async function extractBrief(transcript: string, simulatorContext: string): Promise<any> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

  const systemPrompt = `Você é um analista de viagens da NatLeva. Extraia um briefing estruturado a partir do transcript abaixo.
Regras:
- Se um campo não for mencionado claramente, deixe vazio (string) ou use o default da ferramenta.
- Datas só se forem explícitas (DD/MM/YYYY ou similar). Caso contrário, vazio.
- Pax: se o cliente disser "casal" → 2 adultos. "família" sem detalhes → 2 adultos + 2 crianças.
- Inferir hotel/transfer/seguro como TRUE só se mencionado.
- "confidence" reflete quão completos são os dados extraídos.
${simulatorContext ? `\nContexto do simulador: ${simulatorContext}` : ""}`;

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Transcript:\n${transcript}` },
      ],
      tools: [EXTRACTION_TOOL],
      tool_choice: { type: "function", function: { name: "extract_trip_brief" } },
    }),
  });

  if (!resp.ok) {
    const txt = await resp.text();
    console.error("[simulator-create-proposal] AI gateway error", resp.status, txt);
    if (resp.status === 429) throw new Error("Rate limit. Aguarde alguns segundos.");
    if (resp.status === 402) throw new Error("Créditos esgotados. Adicione créditos em Settings > Workspace > Usage.");
    throw new Error("Falha ao extrair briefing");
  }

  const data = await resp.json();
  const call = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!call?.function?.arguments) throw new Error("IA não retornou estrutura esperada");
  return JSON.parse(call.function.arguments);
}

function fmtBR(iso: string): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

const CABIN_LABELS: Record<string, string> = {
  economy: "Econômica",
  premium_economy: "Premium Economy",
  business: "Executiva",
  first: "Primeira Classe",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    const body = await req.json();
    const {
      messages,
      sessionId,
      mode,
      agentName,
      destinoHint,
      simulatorContext,
    }: {
      messages: InMessage[];
      sessionId: string;
      mode: "manual" | "auto" | "chameleon";
      agentName?: string;
      destinoHint?: string;
      simulatorContext?: string;
    } = body;

    if (!sessionId || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "sessionId e messages obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Idempotency: if a proposal already exists for this session, return it.
    const { data: existing } = await sb
      .from("proposals")
      .select("id, slug")
      .eq("simulator_session_id", sessionId)
      .maybeSingle();

    if (existing?.id) {
      return new Response(
        JSON.stringify({ proposalId: existing.id, slug: existing.slug, reused: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Build transcript
    const transcript = messages
      .map((m) => {
        const who = m.role === "user" || m.role === "client" || m.role === "lead" ? "Cliente" : `Agente${m.agentName ? ` (${m.agentName})` : ""}`;
        return `${who}: ${m.content}`;
      })
      .join("\n");

    const ctx = `${simulatorContext || ""}${destinoHint ? ` · Destino sugerido: ${destinoHint}` : ""}${agentName ? ` · Agente ativo: ${agentName}` : ""}`;
    const brief = await extractBrief(transcript, ctx);

    const dest = brief.destination || destinoHint || "Destino";
    const origin = brief.origin || "";
    const cabin = CABIN_LABELS[brief.cabin_class] || "Econômica";
    const adults = Number(brief.adults || 2);
    const children = Number(brief.children || 0);
    const infants = Number(brief.infants || 0);
    const pax = adults + children + infants;

    // Intro text
    const sections: string[] = [`🤖 Proposta gerada via Simulador (${mode})`];
    sections.push(`Destino: ${dest}`);
    if (origin) sections.push(`Origem: ${origin}`);
    if (brief.departure_date || brief.return_date) {
      sections.push(`Período: ${[fmtBR(brief.departure_date), fmtBR(brief.return_date)].filter(Boolean).join(" a ")}`);
    }
    const paxParts: string[] = [];
    if (adults) paxParts.push(`${adults} adulto${adults > 1 ? "s" : ""}`);
    if (children) paxParts.push(`${children} criança${children > 1 ? "s" : ""}`);
    if (infants) paxParts.push(`${infants} bebê${infants > 1 ? "s" : ""}`);
    if (paxParts.length) sections.push(`Passageiros: ${paxParts.join(" + ")}`);
    sections.push(`Classe: ${cabin}`);
    if (brief.budget_brl) sections.push(`Orçamento: ${brief.budget_brl}`);
    if (brief.hotel_needed) sections.push("Hotel: solicitado");
    if (brief.transfer_needed) sections.push("Transfer: solicitado");
    if (brief.insurance_needed) sections.push("Seguro: solicitado");
    if (brief.special_requests) sections.push(`Pedidos especiais: ${brief.special_requests}`);
    sections.push(`Confiança da extração: ${brief.confidence}`);

    const introText = sections.join("\n");
    const title = `Proposta ${dest}${brief.client_name ? ` — ${brief.client_name}` : ""}`;
    const slug = generateSlug(title);

    const searchText = [dest, origin, brief.special_requests, brief.client_profile].filter(Boolean).join(" ");
    const templateId = await pickTemplate(sb, searchText);

    const { data: created, error } = await sb
      .from("proposals")
      .insert({
        title,
        slug,
        status: "rascunho_ia",
        client_name: brief.client_name || null,
        origin: origin || null,
        destinations: dest ? [dest] : [],
        travel_start_date: brief.departure_date || null,
        travel_end_date: brief.return_date || null,
        passenger_count: pax || null,
        intro_text: introText,
        template_id: templateId,
        source: "simulator",
        simulator_session_id: sessionId,
        simulator_mode: mode,
      })
      .select("id, slug")
      .single();

    if (error || !created) {
      console.error("[simulator-create-proposal] insert error", error);
      return new Response(JSON.stringify({ error: error?.message || "Falha ao criar proposta" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Suggested items
    const items: any[] = [];
    let pos = 0;
    if (origin || dest) {
      items.push({
        proposal_id: created.id,
        item_type: "flight",
        position: pos++,
        title: `✈️ Voo ${origin || "Origem"} → ${dest}`,
        description: `Trecho de ida · Classe ${cabin}${brief.departure_date ? ` · ${fmtBR(brief.departure_date)}` : ""}`,
        data: { origin, destination: dest, cabin_class: cabin, departure_date: brief.departure_date, direction: "ida", suggested: true },
      });
      if (brief.return_date) {
        items.push({
          proposal_id: created.id,
          item_type: "flight",
          position: pos++,
          title: `✈️ Voo ${dest} → ${origin || "Origem"}`,
          description: `Trecho de volta · Classe ${cabin} · ${fmtBR(brief.return_date)}`,
          data: { origin: dest, destination: origin, cabin_class: cabin, departure_date: brief.return_date, direction: "volta", suggested: true },
        });
      }
    }
    if (brief.hotel_needed && dest) {
      items.push({
        proposal_id: created.id,
        item_type: "hotel",
        position: pos++,
        title: `🏨 Hospedagem em ${dest}`,
        description: `Sugestão de hotel`,
        data: { destination: dest, check_in: brief.departure_date, check_out: brief.return_date, suggested: true },
      });
    }
    if (brief.transfer_needed) {
      items.push({
        proposal_id: created.id,
        item_type: "transfer",
        position: pos++,
        title: `🚐 Transfer aeroporto ↔ hotel`,
        description: `Transfer privativo · Ida e volta`,
        data: { destination: dest, round_trip: true, suggested: true },
      });
    }
    if (items.length > 0) {
      await sb.from("proposal_items").insert(items);
    }

    return new Response(
      JSON.stringify({ proposalId: created.id, slug: created.slug, reused: false, brief }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[simulator-create-proposal] exception", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
