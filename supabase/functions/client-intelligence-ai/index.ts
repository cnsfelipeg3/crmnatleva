import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, metrics } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `Você é um consultor estratégico sênior especializado em agências de turismo premium, chamado "IA NatLeva".
Você tem acesso aos dados reais da carteira de clientes da agência NatLeva e deve responder SEMPRE em português do Brasil.

Você é um assistente conversacional — responda de forma direta, prática e personalizada.
Use os dados fornecidos para embasar suas respostas com números reais.
Seja proativo: sugira ações, estratégias, presentes, agrados, campanhas.
Pense como um diretor de CRM de uma empresa de luxo.

Quando o usuário pedir planos, seja EXTREMAMENTE detalhado e prático.
Use markdown para formatar suas respostas (títulos, listas, negrito, etc).

DADOS DA CARTEIRA NATLEVA:
${metrics ? `
- Total de clientes ativos: ${metrics.totalClients}
- Receita total acumulada: R$ ${metrics.totalRevenue?.toLocaleString("pt-BR")}
- Lucro total: R$ ${metrics.totalProfit?.toLocaleString("pt-BR")}
- Ticket médio: R$ ${metrics.avgTicket?.toLocaleString("pt-BR")}
- Margem média: ${metrics.avgMargin?.toFixed(1)}%
- Frequência média: ${metrics.avgFreq?.toFixed(1)} viagens/ano
- Score NatLeva médio: ${metrics.avgScore}/100
- LTV total da base: R$ ${metrics.totalLtv?.toLocaleString("pt-BR")}
- Receita últimos 12 meses: R$ ${metrics.rev12m?.toLocaleString("pt-BR")}

SEGMENTAÇÃO:
${metrics.segments?.map((s: any) => `- ${s.name}: ${s.count} clientes (${s.pct}%)`).join("\n") || "N/A"}

CLUSTERS:
${metrics.clusters?.map((c: any) => `- ${c.name}: ${c.count} clientes, receita R$ ${c.rev?.toLocaleString("pt-BR")}`).join("\n") || "N/A"}

CHURN:
- Clientes inativos >6 meses: ${metrics.inactive6m}
- Receita anual perdida (estimada): R$ ${metrics.lostRevenue?.toLocaleString("pt-BR")}
- Distribuição de inativos: ${metrics.inactiveBuckets?.map((b: any) => `${b.name}: ${b.count}`).join(", ") || "N/A"}

TOP 10 CLIENTES POR RECEITA:
${metrics.topClients?.map((c: any, i: number) => `${i + 1}. ${c.name} — R$ ${c.revenue?.toLocaleString("pt-BR")} | Margem: ${c.margin?.toFixed(1)}% | Score: ${c.score} | ${c.segment} | ${c.cluster} | Inativo: ${c.daysInactive} dias | LTV: R$ ${c.ltv?.toLocaleString("pt-BR")}`).join("\n") || "N/A"}

TOP 5 EM RISCO (maior LTV perdido):
${metrics.topRisk?.map((c: any, i: number) => `${i + 1}. ${c.name} — LTV: R$ ${c.ltv?.toLocaleString("pt-BR")} | Inativo: ${c.daysInactive} dias | Freq: ${c.freq?.toFixed(1)}/ano | Ticket: R$ ${c.ticket?.toLocaleString("pt-BR")}`).join("\n") || "N/A"}

REGIÕES MAIS LUCRATIVAS:
${metrics.topRegions?.map((r: any) => `- ${r.region}: Margem ${r.margin?.toFixed(1)}%, Receita R$ ${r.rev?.toLocaleString("pt-BR")}`).join("\n") || "N/A"}
` : "Dados não disponíveis ainda."}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...(messages || []),
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit atingido, tente novamente em alguns segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos em Settings → Workspace → Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro no gateway de IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("client-intelligence-ai error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
