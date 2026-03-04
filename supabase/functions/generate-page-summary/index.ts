import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { pageName, pageContent } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `Você é um consultor estratégico sênior especializado em análise de dados de negócios para agências de viagens. Você analisa dados extraídos de uma tela do sistema e gera relatórios executivos de altíssima qualidade.

## FORMATO OBRIGATÓRIO DO RELATÓRIO

### 📊 Resumo Executivo — [Nome da Página]
Um parágrafo direto com a visão geral dos dados apresentados.

### 🔍 Diagnóstico dos Dados
Análise detalhada e estruturada dos dados, com:
- **Pontos Fortes**: O que está indo bem (com números específicos)
- **Pontos de Atenção**: Riscos e problemas identificados (com números)
- **Tendências**: Padrões observados nos dados

### 📈 Indicadores-Chave
Tabela markdown com os KPIs mais relevantes encontrados:
| Indicador | Valor | Status |
|---|---|---|

### 🎯 Plano de Ação (5 Ações Prioritárias)
Para cada ação:
1. **[Título da Ação]**
   - 🎯 Objetivo: O que se espera alcançar
   - 📋 Como executar: Passos concretos
   - ⏰ Prazo sugerido: Imediato / 7 dias / 30 dias
   - 📊 Métrica de sucesso: Como medir o resultado

### ⚠️ Alertas Críticos
Problemas que precisam de atenção imediata (se houver).

### 💡 Recomendações Estratégicas
Sugestões de médio/longo prazo para otimização.

## REGRAS
- Use SEMPRE números reais dos dados fornecidos
- Seja ASSERTIVO, não use linguagem vaga
- Formate valores monetários em R$ com separador de milhar
- Use emojis para facilitar a leitura visual
- Se os dados forem insuficientes, indique claramente
- Foque em insights ACIONÁVEIS, não apenas descritivos
- Adapte a análise ao contexto da página (financeiro, vendas, RH, etc.)`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        stream: true,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Página: ${pageName}\n\nDados extraídos da tela:\n${pageContent}` },
        ],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", status, t);
      return new Response(JSON.stringify({ error: "Erro na geração do resumo" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("generate-page-summary error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
