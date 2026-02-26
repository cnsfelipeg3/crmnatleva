import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey);

    const { period = "30d", conversationIds } = await req.json().catch(() => ({}));

    // Calculate date range
    const daysMap: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90 };
    const days = daysMap[period] || 30;
    const since = new Date(Date.now() - days * 86400000).toISOString();

    // Fetch recent conversations
    let convQuery = sb.from("conversations").select("id, display_name, phone, funnel_stage, tags, status, created_at, last_message_at").order("last_message_at", { ascending: false });
    
    if (conversationIds?.length) {
      convQuery = convQuery.in("id", conversationIds);
    } else {
      convQuery = convQuery.gte("last_message_at", since).limit(50);
    }

    const { data: conversations, error: convError } = await convQuery;
    if (convError) throw convError;
    if (!conversations?.length) {
      return new Response(JSON.stringify({ error: "Nenhuma conversa encontrada no período selecionado." }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const convIds = conversations.map(c => c.id);

    // Fetch messages for these conversations (limit to keep context manageable)
    const { data: messages, error: msgError } = await sb
      .from("chat_messages")
      .select("conversation_id, sender_type, content, created_at, message_type")
      .in("conversation_id", convIds)
      .order("created_at", { ascending: true })
      .limit(2000);

    if (msgError) throw msgError;

    // Group messages by conversation and build summaries
    const convSummaries = conversations.map(conv => {
      const convMsgs = (messages || []).filter(m => m.conversation_id === conv.id);
      const clientMsgs = convMsgs.filter(m => m.sender_type === "cliente" || m.sender_type === "contact");
      const agentMsgs = convMsgs.filter(m => m.sender_type === "atendente" || m.sender_type === "agent");
      
      // Calculate response times
      let totalResponseTime = 0;
      let responseCount = 0;
      for (let i = 1; i < convMsgs.length; i++) {
        if ((convMsgs[i].sender_type === "atendente" || convMsgs[i].sender_type === "agent") &&
            (convMsgs[i-1].sender_type === "cliente" || convMsgs[i-1].sender_type === "contact")) {
          const diff = new Date(convMsgs[i].created_at).getTime() - new Date(convMsgs[i-1].created_at).getTime();
          if (diff > 0 && diff < 86400000) {
            totalResponseTime += diff;
            responseCount++;
          }
        }
      }

      const avgResponseMin = responseCount > 0 ? Math.round(totalResponseTime / responseCount / 60000) : null;

      // Get a sample of the conversation (first and last messages)
      const sampleMsgs = [
        ...convMsgs.slice(0, 8),
        ...(convMsgs.length > 16 ? convMsgs.slice(-8) : [])
      ];

      const transcript = sampleMsgs.map(m => {
        const sender = (m.sender_type === "cliente" || m.sender_type === "contact") ? "CLIENTE" : "ATENDENTE";
        return `[${sender}]: ${(m.content || "").slice(0, 200)}`;
      }).join("\n");

      return {
        name: conv.display_name || conv.phone || "Anônimo",
        stage: conv.funnel_stage,
        status: conv.status,
        tags: conv.tags,
        totalMsgs: convMsgs.length,
        clientMsgs: clientMsgs.length,
        agentMsgs: agentMsgs.length,
        avgResponseMin,
        transcript,
      };
    });

    // Build the AI prompt
    const totalConversations = conversations.length;
    const totalMessages = messages?.length || 0;
    const avgMsgsPerConv = totalConversations > 0 ? Math.round(totalMessages / totalConversations) : 0;
    
    const funnelDist = conversations.reduce((acc: Record<string, number>, c) => {
      acc[c.funnel_stage || "sem_etapa"] = (acc[c.funnel_stage || "sem_etapa"] || 0) + 1;
      return acc;
    }, {});

    const systemPrompt = `Você é um consultor sênior de atendimento ao cliente e vendas, especializado em agências de turismo premium.
Analise as conversas reais de atendimento fornecidas e forneça uma análise COMPLETA e DETALHADA em português do Brasil.

Sua análise DEVE incluir as seguintes seções (use markdown com títulos ##):

## 📊 Visão Geral do Período
Resumo quantitativo: total de conversas, mensagens, tempo médio de resposta, distribuição por etapa do funil.

## ✅ Pontos Fortes do Atendimento
O que a equipe está fazendo bem. Cite exemplos específicos das conversas.

## ⚠️ Pontos de Melhoria
Problemas identificados: tempo de resposta lento, falta de follow-up, mensagens genéricas, oportunidades perdidas.

## 💡 Dicas Práticas
Ações concretas e imediatas que a equipe pode implementar para melhorar.

## 🎯 Oportunidades de Venda
Clientes com potencial de upsell, cross-sell ou reativação identificados nas conversas.

## 📈 Score de Atendimento
Dê uma nota de 0 a 100 para o atendimento geral, com justificativa.

Seja ESPECÍFICO, cite nomes de clientes e situações reais. Não seja genérico.`;

    const userContent = `DADOS DO PERÍODO (últimos ${days} dias):
- Total de conversas analisadas: ${totalConversations}
- Total de mensagens: ${totalMessages}
- Média de mensagens por conversa: ${avgMsgsPerConv}
- Distribuição por etapa do funil: ${JSON.stringify(funnelDist)}

CONVERSAS DETALHADAS:
${convSummaries.map((c, i) => `
--- CONVERSA ${i + 1}: ${c.name} ---
Etapa: ${c.stage || "N/A"} | Status: ${c.status}
Tags: ${(c.tags || []).join(", ") || "nenhuma"}
Msgs cliente: ${c.clientMsgs} | Msgs atendente: ${c.agentMsgs}
Tempo médio resposta: ${c.avgResponseMin !== null ? c.avgResponseMin + " min" : "N/A"}
Transcrição:
${c.transcript}
`).join("\n")}`;

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
          { role: "user", content: userContent },
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
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
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
    console.error("analyze-atendimento error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
