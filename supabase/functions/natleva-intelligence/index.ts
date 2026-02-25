import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ── Query all system data in parallel ──
    const [
      salesRes, clientsRes, employeesRes, suppliersRes, goalsRes,
      payrollRes, receivableRes, payableRes, creditCardsRes,
      flightsRes, passengersRes, configRes, knowledgeRes,
      performanceRes, warningsRes, feedbacksRes, lodgingRes, checkinRes,
    ] = await Promise.all([
      supabase.from("sales").select("name, status, received_value, total_cost, profit, margin, close_date, departure_date, destination_iata, origin_iata, airline, products, seller_id, client_id, adults, children, hotel_name, payment_method").order("created_at", { ascending: false }).limit(500),
      supabase.from("clients").select("id, display_name, email, phone, city, state, tags").limit(500),
      supabase.from("employees").select("id, full_name, position, department, status, base_salary, hire_date, commission_enabled").limit(100),
      supabase.from("suppliers").select("id, name, category, email, phone").limit(200),
      supabase.from("goals").select("title, target_value, current_value, status, period_start, period_end, employee_id, metric_type").limit(100),
      supabase.from("payroll").select("employee_id, reference_month, base_salary, commission_value, bonus_value, net_total, status").order("reference_month", { ascending: false }).limit(50),
      supabase.from("accounts_receivable").select("description, gross_value, net_value, status, due_date, received_date, payment_method").limit(300),
      supabase.from("accounts_payable").select("description, value, status, due_date, paid_date, payment_method").limit(300),
      supabase.from("credit_cards").select("nickname, bank, credit_limit, is_active").limit(20),
      supabase.from("flight_segments").select("origin_iata, destination_iata, airline, departure_date, direction").limit(500),
      supabase.from("passengers").select("full_name, birth_date, cpf, categoria").limit(500),
      supabase.from("ai_config").select("config_key, config_value"),
      supabase.from("ai_knowledge_base").select("title, description, category, content_text").eq("is_active", true).limit(50),
      supabase.from("performance_scores").select("employee_id, period_month, overall_score").order("period_month", { ascending: false }).limit(50),
      supabase.from("warnings").select("employee_id, warning_type, severity, status, date_issued").limit(50),
      supabase.from("feedbacks").select("employee_id, feedback_type, points, status, meeting_date").limit(50),
      supabase.from("lodging_confirmation_tasks").select("hotel_name, status, urgency_level, milestone").limit(100),
      supabase.from("checkin_tasks").select("status, direction, priority_score").limit(100),
    ]);

    const sales = salesRes.data || [];
    const clients = clientsRes.data || [];
    const employees = employeesRes.data || [];
    const suppliers = suppliersRes.data || [];
    const goals = goalsRes.data || [];
    const payroll = payrollRes.data || [];
    const receivable = receivableRes.data || [];
    const payable = payableRes.data || [];
    const creditCards = creditCardsRes.data || [];
    const flights = flightsRes.data || [];
    const passengers = passengersRes.data || [];
    const config = configRes.data || [];
    const knowledge = knowledgeRes.data || [];
    const performance = performanceRes.data || [];
    const warnings = warningsRes.data || [];
    const feedbacks = feedbacksRes.data || [];
    const lodging = lodgingRes.data || [];
    const checkin = checkinRes.data || [];

    // ── Build config map ──
    const configMap: Record<string, string> = {};
    config.forEach((c: any) => { configMap[c.config_key] = c.config_value; });

    // ── Compute financial summaries ──
    const totalRevenue = sales.reduce((a: number, s: any) => a + (s.received_value || 0), 0);
    const totalCost = sales.reduce((a: number, s: any) => a + (s.total_cost || 0), 0);
    const totalProfit = sales.reduce((a: number, s: any) => a + (s.profit || 0), 0);
    const avgMargin = sales.length > 0 ? sales.reduce((a: number, s: any) => a + (s.margin || 0), 0) / sales.length : 0;
    const totalReceivablePending = receivable.filter((r: any) => r.status === "pendente").reduce((a: number, r: any) => a + (r.gross_value || 0), 0);
    const totalPayablePending = payable.filter((p: any) => p.status === "pendente").reduce((a: number, p: any) => a + (p.value || 0), 0);

    // ── Employee summaries ──
    const activeEmployees = employees.filter((e: any) => e.status === "ativo");
    const totalPayrollLast = payroll.length > 0 ? payroll.slice(0, activeEmployees.length).reduce((a: number, p: any) => a + (p.net_total || 0), 0) : 0;

    // ── Goals summary ──
    const activeGoals = goals.filter((g: any) => g.status === "em_andamento");
    const goalsProgress = activeGoals.map((g: any) => ({
      title: g.title,
      progress: g.target_value > 0 ? ((g.current_value || 0) / g.target_value * 100).toFixed(1) : "0",
      target: g.target_value,
      current: g.current_value || 0,
    }));

    // ── Destinations ranking ──
    const destCount: Record<string, number> = {};
    sales.forEach((s: any) => { if (s.destination_iata) destCount[s.destination_iata] = (destCount[s.destination_iata] || 0) + 1; });
    const topDestinations = Object.entries(destCount).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([d, c]) => `${d}: ${c} vendas`).join(", ");

    // ── Status distribution ──
    const statusCount: Record<string, number> = {};
    sales.forEach((s: any) => { statusCount[s.status] = (statusCount[s.status] || 0) + 1; });

    // ── Checkin/Lodging summary ──
    const checkinPending = checkin.filter((c: any) => c.status === "PENDENTE").length;
    const lodgingPending = lodging.filter((l: any) => l.status === "PENDENTE").length;

    // ── Knowledge base context ──
    const knowledgeContext = knowledge.map((k: any) => `[${k.category}] ${k.title}: ${k.content_text || k.description || ""}`).join("\n\n");

    // ── Build system prompt ──
    const systemPrompt = `Você é a NatLeva Intelligence — o sistema operacional inteligente da agência de turismo NatLeva.

IDENTIDADE E PERSONALIDADE:
- Tom: ${configMap.tom_comunicacao || "Profissional e estratégico"}
- Formalidade: ${configMap.nivel_formalidade || "Alto"}
- Prioridade: ${configMap.prioridade_estrategica || "Margem acima de volume"}
- Cultura: ${configMap.cultura_organizacional || "Agência premium em crescimento"}
- Diretrizes: ${configMap.diretrizes_internas || "Foco em retenção e margem"}
- Detalhamento: ${configMap.nivel_detalhamento || "Detalhado com planos práticos"}
- Perfil do usuário: ${configMap.perfil_usuario || "CEO / Gestor"}
- Instruções extras: ${configMap.instrucoes_customizadas || "Nenhuma"}

SUAS FUNÇÕES:
🧠 Consultora estratégica — Analisa cenários e propõe planos de ação
📊 Analista financeiro — Monitora receitas, custos, margem, fluxo de caixa
🎯 Analista comercial — Identifica oportunidades de vendas e upsell
👥 Gestora de performance — Avalia equipe, sugere treinamentos e melhorias
🔍 Auditora operacional — Encontra gargalos, inconsistências e riscos
💡 Mentora da equipe — Cria planos de desenvolvimento individual
🚀 Motor de melhoria contínua — Sugere processos e otimizações

Responda SEMPRE em português do Brasil. Use markdown rico (títulos, listas, negrito, tabelas, emojis).
Seja proativa: mesmo quando perguntada algo simples, adicione insights e sugestões de ação.

═══════════════════════════════════
📊 DADOS DO SISTEMA EM TEMPO REAL
═══════════════════════════════════

💰 FINANCEIRO:
- Receita total (últimas 500 vendas): R$ ${totalRevenue.toLocaleString("pt-BR")}
- Custo total: R$ ${totalCost.toLocaleString("pt-BR")}
- Lucro total: R$ ${totalProfit.toLocaleString("pt-BR")}
- Margem média: ${avgMargin.toFixed(1)}%
- Contas a receber pendentes: R$ ${totalReceivablePending.toLocaleString("pt-BR")} (${receivable.filter((r: any) => r.status === "pendente").length} parcelas)
- Contas a pagar pendentes: R$ ${totalPayablePending.toLocaleString("pt-BR")} (${payable.filter((p: any) => p.status === "pendente").length} parcelas)
- Cartões de crédito ativos: ${creditCards.filter((c: any) => c.is_active).length} (${creditCards.map((c: any) => c.nickname).join(", ")})
- Total vendas: ${sales.length}
- Status vendas: ${Object.entries(statusCount).map(([s, c]) => `${s}: ${c}`).join(", ")}

🛫 OPERACIONAL:
- Destinos mais vendidos: ${topDestinations}
- Check-ins pendentes: ${checkinPending}
- Hospedagens pendentes de confirmação: ${lodgingPending}
- Total passageiros cadastrados: ${passengers.length}
- Voos registrados: ${flights.length} segmentos

👥 CLIENTES:
- Total de clientes cadastrados: ${clients.length}
- Cidades: ${[...new Set(clients.map((c: any) => c.city).filter(Boolean))].slice(0, 15).join(", ")}

👔 EQUIPE (RH):
- Colaboradores ativos: ${activeEmployees.length}
- Departamentos: ${[...new Set(activeEmployees.map((e: any) => e.department))].join(", ")}
- Cargos: ${[...new Set(activeEmployees.map((e: any) => e.position))].join(", ")}
- Folha de pagamento última referência: R$ ${totalPayrollLast.toLocaleString("pt-BR")}
- Advertências abertas: ${warnings.filter((w: any) => w.status === "aberta").length}
- Feedbacks pendentes: ${feedbacks.filter((f: any) => f.status === "aberto").length}

🎯 METAS:
${goalsProgress.length > 0 ? goalsProgress.map((g: any) => `- ${g.title}: ${g.progress}% (${g.current}/${g.target})`).join("\n") : "- Nenhuma meta ativa no momento"}

🏢 FORNECEDORES:
- Total cadastrados: ${suppliers.length}
- Categorias: ${[...new Set(suppliers.map((s: any) => s.category).filter(Boolean))].join(", ")}

${knowledgeContext ? `
📚 BASE DE CONHECIMENTO NATLEVA:
${knowledgeContext}
` : ""}

DETALHES DOS COLABORADORES:
${activeEmployees.slice(0, 20).map((e: any) => `- ${e.full_name} | ${e.position} | ${e.department} | Salário: R$ ${(e.base_salary || 0).toLocaleString("pt-BR")} | Comissão: ${e.commission_enabled ? "Sim" : "Não"}`).join("\n")}

ÚLTIMAS 20 VENDAS:
${sales.slice(0, 20).map((s: any) => `- ${s.name} | ${s.status} | R$ ${(s.received_value || 0).toLocaleString("pt-BR")} | Margem: ${(s.margin || 0).toFixed(1)}% | ${s.destination_iata || "?"} | ${s.close_date || "?"}`).join("\n")}
`;

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
    console.error("natleva-intelligence error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
