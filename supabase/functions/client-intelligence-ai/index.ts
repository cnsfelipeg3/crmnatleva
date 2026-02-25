import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { metrics } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `Você é um consultor estratégico sênior especializado em agências de turismo premium. 
Analise os dados da carteira de clientes e gere um plano estratégico completo e detalhado EM PORTUGUÊS DO BRASIL.

FORMATO DA RESPOSTA (use exatamente este formato com os marcadores):

## 🎯 DIAGNÓSTICO GERAL
Análise do estado atual da carteira em 3-4 parágrafos.

## 📊 INDICADORES CRÍTICOS
Para cada indicador abaixo, explique o que o número significa e o que fazer:
- Receita e Lucro
- Margem média
- Churn e inatividade
- Score médio da base
- Concentração de receita

## 🗺️ MAPA MENTAL ESTRATÉGICO
Organize em árvore de decisão:
### Pilar 1: Retenção e Anti-Churn
- Ação 1.1: [detalhamento]
- Ação 1.2: [detalhamento]
### Pilar 2: Crescimento de Receita  
- Ação 2.1: [detalhamento]
- Ação 2.2: [detalhamento]
### Pilar 3: Comunidade e Pertencimento
- Ação 3.1: [detalhamento]
- Ação 3.2: [detalhamento]
### Pilar 4: Experiência Premium
- Ação 4.1: [detalhamento]
- Ação 4.2: [detalhamento]

## 💎 PLANO POR SEGMENTO
Para cada segmento (VIP Elite, VIP Premium, Estratégico, Recorrente, Potencial, Em Risco):
### [Emoji] [Segmento] ([quantidade] clientes)
- **Objetivo**: 
- **Estratégia de relacionamento**: 
- **Agrados e presentes sugeridos** (baseado no LTV):
- **Frequência de contato ideal**:
- **Meta de upsell**:

## 🎁 PROGRAMA DE FIDELIDADE E COMUNIDADE
Detalhe um programa completo com:
- Níveis de fidelidade
- Benefícios por nível
- Sistema de pontos/recompensas
- Eventos exclusivos
- Surpresas e agrados por LTV
- Estratégia de comunidade (grupo VIP, eventos, conteúdo)

## 📈 PLANO DE AÇÃO - 90 DIAS
### Semana 1-2: Quick Wins
### Semana 3-4: Estruturação
### Mês 2: Implementação
### Mês 3: Otimização

## 💰 PROJEÇÃO DE IMPACTO
- Receita adicional estimada com reativação de inativos
- Receita adicional com upsell de base ativa
- Redução de churn projetada
- ROI estimado das ações

## ⚠️ RISCOS E ALERTAS
Top 5 riscos imediatos que precisam de atenção.

Seja EXTREMAMENTE detalhado, prático e específico. Use os números reais fornecidos. 
Cada sugestão de presente/agrado deve ter estimativa de custo vs LTV do cliente.
Pense como um diretor de CRM de uma empresa de luxo.`;

    const userPrompt = `Analise estes dados da minha agência de turismo NatLeva:

RESUMO DA CARTEIRA:
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
${metrics.segments?.map((s: any) => `- ${s.name}: ${s.count} clientes (${s.pct}%)`).join("\n")}

CLUSTERS:
${metrics.clusters?.map((c: any) => `- ${c.name}: ${c.count} clientes, receita R$ ${c.rev?.toLocaleString("pt-BR")}`).join("\n")}

CHURN:
- Clientes inativos >6 meses: ${metrics.inactive6m}
- Receita anual perdida (estimada): R$ ${metrics.lostRevenue?.toLocaleString("pt-BR")}
- Distribuição de inativos: ${metrics.inactiveBuckets?.map((b: any) => `${b.name}: ${b.count}`).join(", ")}

TOP 10 CLIENTES POR RECEITA:
${metrics.topClients?.map((c: any, i: number) => `${i + 1}. ${c.name} — R$ ${c.revenue?.toLocaleString("pt-BR")} | Margem: ${c.margin?.toFixed(1)}% | Score: ${c.score} | ${c.segment} | ${c.cluster} | Inativo: ${c.daysInactive} dias | LTV: R$ ${c.ltv?.toLocaleString("pt-BR")}`).join("\n")}

TOP 5 EM RISCO (maior LTV perdido):
${metrics.topRisk?.map((c: any, i: number) => `${i + 1}. ${c.name} — LTV: R$ ${c.ltv?.toLocaleString("pt-BR")} | Inativo: ${c.daysInactive} dias | Freq: ${c.freq?.toFixed(1)}/ano | Ticket: R$ ${c.ticket?.toLocaleString("pt-BR")}`).join("\n")}

REGIÕES MAIS LUCRATIVAS:
${metrics.topRegions?.map((r: any) => `- ${r.region}: Margem ${r.margin?.toFixed(1)}%, Receita R$ ${r.rev?.toLocaleString("pt-BR")}`).join("\n")}

Gere o plano estratégico completo conforme o formato solicitado.`;

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
          { role: "user", content: userPrompt },
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
