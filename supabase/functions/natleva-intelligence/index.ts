import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Extract URLs from text
function extractUrls(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;
  return (text.match(urlRegex) || []).slice(0, 3); // max 3 URLs per message
}

// Fetch URL content as text (best effort)
async function fetchUrlContent(url: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const resp = await fetch(url, {
      headers: { "User-Agent": "NatLeva-Intelligence/1.0" },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!resp.ok) return `[Erro ao acessar ${url}: HTTP ${resp.status}]`;
    const contentType = resp.headers.get("content-type") || "";
    if (contentType.includes("text/html") || contentType.includes("text/plain") || contentType.includes("application/json")) {
      const text = await resp.text();
      // Strip HTML tags for cleaner content
      const cleaned = text.replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      return cleaned.slice(0, 15000); // limit to 15k chars
    }
    return `[Conteúdo binário de ${url}, tipo: ${contentType}]`;
  } catch (e) {
    return `[Não foi possível acessar ${url}: ${e instanceof Error ? e.message : "erro desconhecido"}]`;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ── Query ALL system data in parallel (ACESSO TOTAL) ──
    const [
      salesRes, clientsRes, employeesRes, suppliersRes, goalsRes,
      payrollRes, receivableRes, payableRes, creditCardsRes,
      flightsRes, passengersRes, configRes, knowledgeRes,
      performanceRes, feedbacksRes, lodgingRes, checkinRes,
      costItemsRes, creditCardItemsRes, commissionRulesRes,
      clientContactsRes, clientNotesRes, attachmentsRes,
      auditLogRes, chartOfAccountsRes, employeeDocsRes,
      hotelDirectoryRes, timeEntriesRes, teamCheckinsRes,
      salePassengersRes, paymentFeeRulesRes, profilesRes,
    ] = await Promise.all([
      supabase.from("sales").select("name, status, received_value, total_cost, profit, margin, close_date, departure_date, destination_iata, origin_iata, airline, products, seller_id, client_id, adults, children, hotel_name, payment_method, flight_class, is_international, return_date, emission_status, locators, hotel_reservation_code, hotel_checkin_date, hotel_checkout_date, display_id").order("created_at", { ascending: false }).limit(500),
      supabase.from("clients").select("id, display_name, email, phone, city, state, tags, client_type, country, observations").limit(500),
      supabase.from("employees").select("id, full_name, position, department, status, base_salary, hire_date, commission_enabled, email, phone, contract_type, work_regime, work_schedule_start, work_schedule_end, lunch_duration_minutes, manager_id").limit(100),
      supabase.from("suppliers").select("id, name, category, email, phone, cnpj, contact_name, payment_conditions, notes").limit(200),
      supabase.from("goals").select("title, target_value, current_value, status, period_start, period_end, employee_id, metric_type, description, department, bonus_on_80, bonus_on_100, bonus_on_120").limit(100),
      supabase.from("payroll").select("employee_id, reference_month, base_salary, commission_value, bonus_value, net_total, status, deductions, advances, overtime_value, reimbursements, paid_date").order("reference_month", { ascending: false }).limit(100),
      supabase.from("accounts_receivable").select("description, gross_value, net_value, status, due_date, received_date, payment_method, fee_percent, fee_value, installment_number, installment_total, client_id, sale_id, seller_id").limit(500),
      supabase.from("accounts_payable").select("description, value, status, due_date, paid_date, payment_method, supplier_id, sale_id, category_id, installment_number, installment_total, is_recurring, recurrence_interval").limit(500),
      supabase.from("credit_cards").select("nickname, bank, credit_limit, is_active, last_digits, closing_day, due_day, default_fee_percent, card_type, responsible").limit(20),
      supabase.from("flight_segments").select("origin_iata, destination_iata, airline, departure_date, direction, flight_number, flight_class, cabin_type, departure_time, arrival_time, duration_minutes, sale_id, segment_order").limit(500),
      supabase.from("passengers").select("full_name, birth_date, cpf, categoria, phone, passport_number, passport_expiry, rg, address_city, address_state").limit(500),
      supabase.from("ai_config").select("config_key, config_value"),
      supabase.from("ai_knowledge_base").select("title, description, category, content_text").eq("is_active", true).limit(50),
      supabase.from("performance_scores").select("employee_id, period_month, overall_score, attendance_score, quality_score, goals_score, initiative_score, teamwork_score, notes").order("period_month", { ascending: false }).limit(100),
      supabase.from("feedbacks").select("employee_id, feedback_type, points, status, meeting_date, context, action_plan, next_followup, given_by").limit(100),
      supabase.from("lodging_confirmation_tasks").select("hotel_name, status, urgency_level, milestone, sale_id, hotel_reservation_code, contact_method, issue_type, issue_resolution, notes, scheduled_at_utc").limit(200),
      supabase.from("checkin_tasks").select("status, direction, priority_score, sale_id, segment_id, departure_datetime_utc, checkin_open_datetime_utc, notes, seat_info").limit(200),
      // ── NEW: Tabelas adicionais para acesso TOTAL ──
      supabase.from("cost_items").select("sale_id, category, description, cash_value, miles_quantity, miles_program, miles_price_per_thousand, miles_cost_brl, taxes, total_item_cost, emission_source").limit(500),
      supabase.from("credit_card_items").select("credit_card_id, description, transaction_date, value, installment_number, installment_total, status, is_refund, sale_id, supplier_id").order("transaction_date", { ascending: false }).limit(300),
      supabase.from("commission_rules").select("seller_id, product_type, commission_type, commission_value, min_margin_percent, is_active").limit(50),
      supabase.from("client_contacts").select("client_id, name, phone, email, role").limit(300),
      supabase.from("client_notes").select("client_id, content, created_at").order("created_at", { ascending: false }).limit(200),
      supabase.from("attachments").select("sale_id, file_name, category, file_type, created_at").limit(300),
      supabase.from("audit_log").select("action, details, sale_id, created_at").order("created_at", { ascending: false }).limit(100),
      supabase.from("chart_of_accounts").select("code, name, type, is_active, parent_id").limit(100),
      supabase.from("employee_documents").select("employee_id, title, document_type, expiry_date, tags").limit(200),
      supabase.from("hotel_contact_directory").select("hotel_name_normalized, emails, phones, whatsapp, preferred_language, reservation_portal_url, notes").limit(100),
      supabase.from("time_entries").select("employee_id, entry_date, clock_in, lunch_out, lunch_in, clock_out, status, worked_minutes, late_minutes, overtime_minutes").order("entry_date", { ascending: false }).limit(200),
      supabase.from("team_checkins").select("employee_id, checkin_date, mood_score, energy_score, comment").order("checkin_date", { ascending: false }).limit(100),
      supabase.from("sale_passengers").select("sale_id, passenger_id").limit(500),
      supabase.from("payment_fee_rules").select("payment_method, fee_percent, fee_fixed, installments, acquirer, is_active, notes").limit(50),
      supabase.from("profiles").select("id, full_name, email, avatar_url").limit(50),
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
    const feedbacks = feedbacksRes.data || [];
    const lodging = lodgingRes.data || [];
    const checkin = checkinRes.data || [];
    const costItems = costItemsRes.data || [];
    const creditCardItems = creditCardItemsRes.data || [];
    const commissionRules = commissionRulesRes.data || [];
    const clientContacts = clientContactsRes.data || [];
    const clientNotes = clientNotesRes.data || [];
    const saleAttachments = attachmentsRes.data || [];
    const auditLog = auditLogRes.data || [];
    const chartOfAccounts = chartOfAccountsRes.data || [];
    const employeeDocs = employeeDocsRes.data || [];
    const hotelDirectory = hotelDirectoryRes.data || [];
    const timeEntries = timeEntriesRes.data || [];
    const teamCheckins = teamCheckinsRes.data || [];
    const salePassengers = salePassengersRes.data || [];
    const paymentFeeRules = paymentFeeRulesRes.data || [];
    const profiles = profilesRes.data || [];

    // ── Build config map ──
    const configMap: Record<string, string> = {};
    config.forEach((c: any) => { configMap[c.config_key] = c.config_value; });

    // ── Compute summaries ──
    const totalRevenue = sales.reduce((a: number, s: any) => a + (s.received_value || 0), 0);
    const totalCost = sales.reduce((a: number, s: any) => a + (s.total_cost || 0), 0);
    const totalProfit = sales.reduce((a: number, s: any) => a + (s.profit || 0), 0);
    const avgMargin = sales.length > 0 ? sales.reduce((a: number, s: any) => a + (s.margin || 0), 0) / sales.length : 0;
    const totalReceivablePending = receivable.filter((r: any) => r.status === "pendente").reduce((a: number, r: any) => a + (r.gross_value || 0), 0);
    const totalPayablePending = payable.filter((p: any) => p.status === "pendente").reduce((a: number, p: any) => a + (p.value || 0), 0);
    const activeEmployees = employees.filter((e: any) => e.status === "ativo");
    const totalPayrollLast = payroll.length > 0 ? payroll.slice(0, activeEmployees.length).reduce((a: number, p: any) => a + (p.net_total || 0), 0) : 0;
    const activeGoals = goals.filter((g: any) => g.status === "em_andamento");
    const goalsProgress = activeGoals.map((g: any) => ({
      title: g.title,
      progress: g.target_value > 0 ? ((g.current_value || 0) / g.target_value * 100).toFixed(1) : "0",
      target: g.target_value,
      current: g.current_value || 0,
    }));
    const destCount: Record<string, number> = {};
    sales.forEach((s: any) => { if (s.destination_iata) destCount[s.destination_iata] = (destCount[s.destination_iata] || 0) + 1; });
    const topDestinations = Object.entries(destCount).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([d, c]) => `${d}: ${c} vendas`).join(", ");
    const statusCount: Record<string, number> = {};
    sales.forEach((s: any) => { statusCount[s.status] = (statusCount[s.status] || 0) + 1; });
    const checkinPending = checkin.filter((c: any) => c.status === "PENDENTE").length;
    const lodgingPending = lodging.filter((l: any) => l.status === "PENDENTE").length;
    const knowledgeContext = knowledge.map((k: any) => `[${k.category}] ${k.title}: ${k.content_text || k.description || ""}`).join("\n\n");

    // ── NEW: Extended summaries ──
    const totalCostItemsValue = costItems.reduce((a: number, c: any) => a + (c.total_item_cost || 0), 0);
    const totalMilesUsed = costItems.reduce((a: number, c: any) => a + (c.miles_quantity || 0), 0);
    const totalCCItemsValue = creditCardItems.reduce((a: number, c: any) => a + (c.value || 0), 0);
    const openCCItems = creditCardItems.filter((c: any) => c.status === "aberto").length;
    const internationalSales = sales.filter((s: any) => s.is_international).length;
    const avgWorkedMinutes = timeEntries.length > 0 ? Math.round(timeEntries.reduce((a: number, t: any) => a + (t.worked_minutes || 0), 0) / timeEntries.length) : 0;
    const avgMood = teamCheckins.length > 0 ? (teamCheckins.reduce((a: number, t: any) => a + (t.mood_score || 0), 0) / teamCheckins.length).toFixed(1) : "N/A";
    const avgEnergy = teamCheckins.length > 0 ? (teamCheckins.reduce((a: number, t: any) => a + (t.energy_score || 0), 0) / teamCheckins.length).toFixed(1) : "N/A";
    const docsExpiringSoon = employeeDocs.filter((d: any) => {
      if (!d.expiry_date) return false;
      const diff = new Date(d.expiry_date).getTime() - Date.now();
      return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000;
    });

    // ── Process attachments and URLs from latest user message ──
    const lastUserMsg = [...(messages || [])].reverse().find((m: any) => m.role === "user");
    let attachmentContext = "";
    let urlContext = "";

    if (lastUserMsg) {
      const attachments = lastUserMsg.attachments || [];
      if (attachments.length > 0) {
        const attachmentTexts: string[] = [];
        for (const att of attachments) {
          if (att.content && !att.type?.startsWith("image/")) {
            attachmentTexts.push(`📎 Arquivo "${att.name}" (${att.type}):\n${att.content}`);
          } else if (att.url) {
            attachmentTexts.push(`📎 Arquivo "${att.name}" (${att.type}) enviado como anexo. URL: ${att.url}`);
          }
        }
        if (attachmentTexts.length > 0) {
          attachmentContext = "\n\n📎 ARQUIVOS ANEXADOS PELO USUÁRIO:\n" + attachmentTexts.join("\n\n");
        }
      }

      const urls = extractUrls(lastUserMsg.content || "");
      if (urls.length > 0) {
        const urlContents = await Promise.all(urls.map(fetchUrlContent));
        const urlTexts = urls.map((url: string, i: number) => `🔗 Conteúdo de ${url}:\n${urlContents[i]}`);
        urlContext = "\n\n🔗 CONTEÚDO DOS LINKS ENVIADOS:\n" + urlTexts.join("\n\n");
      }
    }

    // ── Extract learning context ──
    let learningContext = "";
    if (messages && messages.length > 4) {
      const userMessages = messages.filter((m: any) => m.role === "user").map((m: any) => m.content);
      const topics = userMessages.join(" ").slice(0, 2000);
      learningContext = `\n\n🧠 CONTEXTO DE APRENDIZADO (padrões desta conversa):\nO usuário já fez ${userMessages.length} perguntas nesta conversa. Tópicos abordados: ${topics}\nAdapte o nível de detalhe e foco com base no que o usuário já perguntou.`;
    }

    // ── Build system prompt ──
    const systemPrompt = `Você é a NatLeva Intelligence — o sistema operacional inteligente da agência de turismo NatLeva.
Você tem ACESSO TOTAL E IRRESTRITO a todos os dados do sistema em tempo real.

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
🧠 Consultora estratégica • 📊 Analista financeiro • 🎯 Analista comercial
👥 Gestora de performance • 🔍 Auditora operacional • 💡 Mentora da equipe • 🚀 Motor de melhoria contínua

CAPACIDADES:
📎 Arquivos (imagens, PDFs, planilhas, CSVs) • 🔗 Links (conteúdo extraído automaticamente)
🧠 Aprendizado contínuo • 🎙️ Áudio (transcrito automaticamente) • 🎨 Geração de imagens

Responda SEMPRE em português do Brasil. Use markdown rico (títulos, listas, negrito, tabelas, emojis).
Seja proativa: adicione insights e sugestões. Cruze dados entre módulos para análises profundas.

═══════════════════════════════════════════
📊 DADOS COMPLETOS DO SISTEMA EM TEMPO REAL
═══════════════════════════════════════════

💰 FINANCEIRO:
- Receita total: R$ ${totalRevenue.toLocaleString("pt-BR")} | Custo: R$ ${totalCost.toLocaleString("pt-BR")} | Lucro: R$ ${totalProfit.toLocaleString("pt-BR")}
- Margem média: ${avgMargin.toFixed(1)}%
- Contas a receber pendentes: R$ ${totalReceivablePending.toLocaleString("pt-BR")} (${receivable.filter((r: any) => r.status === "pendente").length} parcelas)
- Contas a pagar pendentes: R$ ${totalPayablePending.toLocaleString("pt-BR")} (${payable.filter((p: any) => p.status === "pendente").length} parcelas)
- Cartões de crédito: ${creditCards.map((c: any) => `${c.nickname} (${c.bank || "?"}, limite R$ ${(c.credit_limit || 0).toLocaleString("pt-BR")}, ${c.is_active ? "ativo" : "inativo"})`).join(" | ")}
- Itens de cartão abertos: ${openCCItems} | Total: R$ ${totalCCItemsValue.toLocaleString("pt-BR")}
- Total vendas: ${sales.length} | Status: ${Object.entries(statusCount).map(([s, c]) => `${s}: ${c}`).join(", ")}
- Vendas internacionais: ${internationalSales}

💳 TAXAS E MEIOS DE PAGAMENTO:
${paymentFeeRules.map((r: any) => `- ${r.payment_method} ${r.installments ? `(${r.installments}x)` : ""}: ${r.fee_percent}% ${r.fee_fixed ? `+ R$ ${r.fee_fixed}` : ""} ${r.acquirer ? `(${r.acquirer})` : ""}`).join("\n") || "- Nenhuma regra cadastrada"}

📊 CUSTOS DETALHADOS:
- Total custos operacionais: R$ ${totalCostItemsValue.toLocaleString("pt-BR")}
- Milhas utilizadas: ${totalMilesUsed.toLocaleString("pt-BR")}
- Categorias de custo: ${[...new Set(costItems.map((c: any) => c.category))].join(", ") || "N/A"}
- Fontes de emissão: ${[...new Set(costItems.map((c: any) => c.emission_source).filter(Boolean))].join(", ") || "N/A"}

📋 PLANO DE CONTAS:
${chartOfAccounts.filter((c: any) => c.is_active).slice(0, 20).map((c: any) => `- [${c.code || "?"}] ${c.name} (${c.type})`).join("\n") || "- Sem plano de contas"}

🛫 OPERACIONAL:
- Destinos mais vendidos: ${topDestinations}
- Check-ins pendentes: ${checkinPending} | Hospedagens pendentes: ${lodgingPending}
- Total passageiros: ${passengers.length} | Voos: ${flights.length} segmentos
- Anexos de vendas: ${saleAttachments.length} arquivos
- Vínculos venda↔passageiro: ${salePassengers.length}

🏨 DIRETÓRIO DE HOTÉIS:
${hotelDirectory.slice(0, 15).map((h: any) => `- ${h.hotel_name_normalized}: ${(h.emails || []).join(", ")} | ${(h.phones || []).join(", ")} | WhatsApp: ${(h.whatsapp || []).join(", ")}`).join("\n") || "- Nenhum hotel cadastrado"}

💼 COMISSÕES:
${commissionRules.filter((r: any) => r.is_active).map((r: any) => `- ${r.product_type || "Geral"}: ${r.commission_type === "percentual" ? `${r.commission_value}%` : `R$ ${r.commission_value}`} (margem mín: ${r.min_margin_percent || 0}%)`).join("\n") || "- Sem regras de comissão"}

👥 CLIENTES (${clients.length} cadastrados):
- Tipos: ${[...new Set(clients.map((c: any) => c.client_type))].join(", ")}
- Cidades: ${[...new Set(clients.map((c: any) => c.city).filter(Boolean))].slice(0, 15).join(", ")}
- Contatos adicionais: ${clientContacts.length} | Notas: ${clientNotes.length}

👔 EQUIPE (RH):
- Colaboradores ativos: ${activeEmployees.length}
- Departamentos: ${[...new Set(activeEmployees.map((e: any) => e.department))].join(", ")}
- Cargos: ${[...new Set(activeEmployees.map((e: any) => e.position))].join(", ")}
- Folha última ref: R$ ${totalPayrollLast.toLocaleString("pt-BR")}
- Feedbacks pendentes: ${feedbacks.filter((f: any) => f.status === "aberto").length}
- Documentos vencendo em 30 dias: ${docsExpiringSoon.length}
- Média de horas trabalhadas: ${avgWorkedMinutes > 0 ? `${Math.floor(avgWorkedMinutes / 60)}h${avgWorkedMinutes % 60}min` : "N/A"}

😊 CLIMA DO TIME:
- Humor médio: ${avgMood}/5 | Energia média: ${avgEnergy}/5
- Check-ins de clima registrados: ${teamCheckins.length}

🎯 METAS:
${goalsProgress.length > 0 ? goalsProgress.map((g: any) => `- ${g.title}: ${g.progress}% (${g.current}/${g.target})`).join("\n") : "- Nenhuma meta ativa"}

🏢 FORNECEDORES (${suppliers.length}):
- Categorias: ${[...new Set(suppliers.map((s: any) => s.category).filter(Boolean))].join(", ")}

📝 AUDITORIA (últimas 10 ações):
${auditLog.slice(0, 10).map((a: any) => `- ${a.action}: ${a.details || "sem detalhes"} (${new Date(a.created_at).toLocaleDateString("pt-BR")})`).join("\n") || "- Sem registros"}

👤 USUÁRIOS DO SISTEMA:
${profiles.map((p: any) => `- ${p.full_name} (${p.email})`).join("\n") || "- Sem perfis"}

${knowledgeContext ? `\n📚 BASE DE CONHECIMENTO NATLEVA:\n${knowledgeContext}` : ""}

═══════ DADOS DETALHADOS ═══════

COLABORADORES:
${activeEmployees.slice(0, 20).map((e: any) => `- ${e.full_name} | ${e.position} | ${e.department} | R$ ${(e.base_salary || 0).toLocaleString("pt-BR")} | ${e.contract_type} | ${e.work_regime || "?"} | Comissão: ${e.commission_enabled ? "Sim" : "Não"}`).join("\n")}

ÚLTIMAS 30 VENDAS:
${sales.slice(0, 30).map((s: any) => `- ${s.display_id} ${s.name} | ${s.status} | R$ ${(s.received_value || 0).toLocaleString("pt-BR")} | Margem: ${(s.margin || 0).toFixed(1)}% | ${s.origin_iata || "?"} → ${s.destination_iata || "?"} | ${s.close_date || "?"} | ${s.airline || "?"} | ${s.flight_class || "?"} | ${s.payment_method || "?"} | Hotel: ${s.hotel_name || "N/A"}`).join("\n")}

CONTAS A RECEBER DETALHADAS (últimas 20):
${receivable.slice(0, 20).map((r: any) => `- ${r.description || "?"} | R$ ${(r.gross_value || 0).toLocaleString("pt-BR")} (líq R$ ${(r.net_value || 0).toLocaleString("pt-BR")}) | ${r.status} | Venc: ${r.due_date || "?"} | ${r.payment_method || "?"}`).join("\n")}

CONTAS A PAGAR DETALHADAS (últimas 20):
${payable.slice(0, 20).map((p: any) => `- ${p.description || "?"} | R$ ${(p.value || 0).toLocaleString("pt-BR")} | ${p.status} | Venc: ${p.due_date || "?"} | ${p.payment_method || "?"}`).join("\n")}

PERFORMANCE DA EQUIPE:
${performance.slice(0, 20).map((p: any) => `- Emp ${p.employee_id?.slice(0, 8)} | ${p.period_month} | Score: ${p.overall_score} | Qualidade: ${p.quality_score} | Metas: ${p.goals_score} | Iniciativa: ${p.initiative_score}`).join("\n") || "- Sem dados"}

FOLHA DE PAGAMENTO:
${payroll.slice(0, 20).map((p: any) => `- Emp ${p.employee_id?.slice(0, 8)} | ${p.reference_month} | Base: R$ ${(p.base_salary || 0).toLocaleString("pt-BR")} | Comissão: R$ ${(p.commission_value || 0).toLocaleString("pt-BR")} | Bônus: R$ ${(p.bonus_value || 0).toLocaleString("pt-BR")} | Líquido: R$ ${(p.net_total || 0).toLocaleString("pt-BR")} | ${p.status}`).join("\n") || "- Sem dados"}

NOTAS DE CLIENTES RECENTES:
${clientNotes.slice(0, 10).map((n: any) => `- Cliente ${n.client_id?.slice(0, 8)}: ${n.content?.slice(0, 100)}...`).join("\n") || "- Sem notas"}

ÚLTIMAS TRANSAÇÕES CARTÃO:
${creditCardItems.slice(0, 15).map((c: any) => `- ${c.transaction_date} | ${c.description || "?"} | R$ ${(c.value || 0).toLocaleString("pt-BR")} | ${c.status} ${c.is_refund ? "(ESTORNO)" : ""}`).join("\n") || "- Sem transações"}
${attachmentContext}${urlContext}${learningContext}`;

    // ── Build messages for AI, handling multimodal (images) ──
    const aiMessages: any[] = [{ role: "system", content: systemPrompt }];

    for (const msg of (messages || [])) {
      if (msg.role === "user") {
        // Check for image attachments for multimodal
        const imageAttachments = (msg.attachments || []).filter((a: any) => a.type?.startsWith("image/") && a.content);

        if (imageAttachments.length > 0) {
          // Multimodal message with images
          const contentParts: any[] = [{ type: "text", text: msg.content || "Analise esta imagem:" }];
          for (const img of imageAttachments) {
            // Extract base64 data from data URL
            const base64Match = img.content.match(/^data:([^;]+);base64,(.+)$/);
            if (base64Match) {
              contentParts.push({
                type: "image_url",
                image_url: { url: img.content },
              });
            }
          }
          aiMessages.push({ role: "user", content: contentParts });
        } else {
          aiMessages.push({ role: "user", content: msg.content });
        }
      } else {
        aiMessages.push({ role: msg.role, content: msg.content });
      }
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: aiMessages,
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
