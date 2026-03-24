import { AGENTS_V4, SQUADS } from "@/components/ai-team/agentsV4Data";
import { getAgentTraining } from "@/components/ai-team/agentTrainingStore";
import {
  type LeadInteligente, type MensagemLead,
  ETAPAS_FUNIL,
  buildLeadPersona, buildConversaContext, buildFirstMessagePrompt, buildObjecaoPrompt,
  buildMensagemPerdaPrompt,
  atualizarEstadoEmocional, devePerdeLead,
} from "./intelligentLeads";

// ===== API — Roteamento inteligente por tipo de chamada =====
export type SimCallType = "lead" | "agent" | "evaluate" | "debrief" | "objection" | "loss" | "deep" | "price_image";

export function normalizeSimMessage(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function hasRecentDuplicateMessage(
  lead: LeadInteligente,
  role: MensagemLead["role"],
  content: string,
  windowSize = 6,
) {
  const normalized = normalizeSimMessage(content);
  if (!normalized) return true;

  return lead.mensagens
    .slice(-windowSize)
    .some((message) => message.role === role && normalizeSimMessage(message.content) === normalized);
}

export function pushUniqueSimMessage(
  lead: LeadInteligente,
  message: MensagemLead,
  options?: { windowSize?: number },
) {
  if (hasRecentDuplicateMessage(lead, message.role, message.content, options?.windowSize)) {
    return false;
  }

  lead.mensagens.push(message);
  return true;
}

export async function callSimulatorAI(sysPrompt: string, history: { role: string; content: string }[], type: SimCallType = "agent", agentBehaviorPrompt?: string, _retryCount = 0): Promise<string> {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/simulator-ai`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
    body: JSON.stringify({ type, systemPrompt: sysPrompt, history, agentBehaviorPrompt: agentBehaviorPrompt || "", provider: "lovable" }),
  });
  if (resp.status === 429 && _retryCount < 3) {
    const delay = Math.pow(2, _retryCount) * 1000 + Math.random() * 500;
    await new Promise(r => setTimeout(r, delay));
    return callSimulatorAI(sysPrompt, history, type, agentBehaviorPrompt, _retryCount + 1);
  }
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

  if (type === "evaluate" || type === "debrief" || type === "deep" || type === "price_image") {
    const data = await resp.json();
    return data.content || "";
  }

  let text = "";
  if (resp.body) {
    const reader = resp.body.getReader(); const decoder = new TextDecoder(); let buf = "";
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      buf += decoder.decode(value, { stream: true }); let nl: number;
      while ((nl = buf.indexOf("\n")) !== -1) {
        let line = buf.slice(0, nl); buf = buf.slice(nl + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (!line.startsWith("data: ")) continue;
        const json = line.slice(6).trim(); if (json === "[DONE]") break;
        try { const p = JSON.parse(json); const c = p.choices?.[0]?.delta?.content; if (c) text += c; } catch {}
      }
    }
  }
  return text;
}

// Detect if agent response mentions sending a price/quote print
const PRICE_PRINT_PATTERNS = /\b(segue o (print|orçamento|orcamento|preço|preco|valor)|vou (te |lhe )?(enviar|mandar|passar) (o |um )?(print|orçamento|orcamento|screenshot|imagem|foto|tabelinha|cotação|cotacao|proposta|valores)|aqui (está|esta|vai|tá) o (print|orçamento|preço|valor)|conforme solicitado.{0,20}(orçamento|valor|preço)|olha (só )?o (orçamento|preço|valor))\b/i;

export function detectsPricePrint(text: string): boolean {
  return PRICE_PRINT_PATTERNS.test(text);
}

export async function generatePriceImage(lead: { nome: string; destino: string; pax: number; orcamento: string; ticket: number; paxLabel: string }): Promise<string | null> {
  try {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/simulator-ai`;
    const basePrice = lead.ticket || Math.floor(Math.random() * 8000 + 3000);
    const perPerson = Math.round(basePrice / Math.max(1, lead.pax));
    const hotel3 = Math.round(perPerson * 0.7);
    const hotel4 = perPerson;
    const hotel5 = Math.round(perPerson * 1.4);

    const prompt = `Generate a clean, professional WhatsApp-style price quote image for a travel agency called "NatLeva Viagens". 
Make it look like a real screenshot that a travel agent would send via WhatsApp.

Details to include:
- Client: ${lead.nome}
- Destination: ${lead.destino}
- Travelers: ${lead.pax} ${lead.paxLabel}
- Package options (show 2-3 options):
  Option 1: Hotel 3★ - R$ ${hotel3.toLocaleString("pt-BR")}/pessoa (${lead.pax}x = R$ ${(hotel3 * lead.pax).toLocaleString("pt-BR")})
  Option 2: Hotel 4★ - R$ ${hotel4.toLocaleString("pt-BR")}/pessoa (${lead.pax}x = R$ ${(hotel4 * lead.pax).toLocaleString("pt-BR")})
  Option 3: Hotel 5★ - R$ ${hotel5.toLocaleString("pt-BR")}/pessoa (${lead.pax}x = R$ ${(hotel5 * lead.pax).toLocaleString("pt-BR")})
- Include: Aéreo + Hotel + Transfer + Seguro Viagem
- Period: 7 noites
- Validity: "Valores válidos por 48h"
- Add NatLeva logo text and professional formatting
- Use green/dark theme similar to WhatsApp

Style: Clean table layout, dark background (#0B141A), green accents (#10B981), white text. Make it look like a real agency price card screenshot. NO watermarks. Professional travel agency aesthetic.`;

    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
      body: JSON.stringify({ type: "price_image", systemPrompt: "You generate professional travel price quote images.", history: [{ role: "user", content: prompt }] }),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return data.imageUrl || null;
  } catch (err) {
    console.error("Price image generation error:", err);
    return null;
  }
}

// Generate lead message using AI with full persona context
export function buildCalibrationPrompt(lead: LeadInteligente): string {
  const l = lead as any;
  const parts: string[] = [];
  const tone = l._toneFormality ?? 50;
  if (tone < 30) parts.push("Use linguagem BEM informal: gírias, abreviações (vc, tb, tmj, blz), sem pontuação formal.");
  else if (tone > 70) parts.push("Use linguagem formal e educada. Trate por 'você/senhor(a)', frases completas, boa gramática.");
  if (l._typingStyle === "rapido") parts.push("Escreva mensagens MUITO curtas (1-5 palavras), direto ao ponto.");
  else if (l._typingStyle === "detalhado") parts.push("Escreva textos longos e detalhados com contexto completo.");
  if (l._enableTypos) parts.push("Cometa erros de digitação realistas: 'tbm', 'vc', 'pq', letras trocadas ocasionalmente.");
  if (l._enableEmojis) parts.push("Use emojis naturalmente (😊 🙏 ✈️ ❤️) — de 1 a 3 por mensagem.");
  else parts.push("NÃO use emojis.");
  if (l._enableAudioRef && Math.random() < 0.2) parts.push("Em algum momento mencione que prefere mandar áudio ou que não consegue ler textos longos agora.");
  const goal = l._conversationGoal || "comprar";
  if (goal === "pesquisar") parts.push("Você está APENAS pesquisando. Não tem pressa, faça muitas perguntas mas não avance para fechamento.");
  else if (goal === "comparar") parts.push("Você está comparando com concorrentes. Mencione que viu preços em outros lugares. Peça para baterem ofertas.");
  if (l._infoRevealSpeed === "resistente") parts.push("NÃO revele informações pessoais facilmente. Exija confiança e boas respostas primeiro.");
  else if (l._infoRevealSpeed === "imediato") parts.push("Dê todas as informações logo na primeira mensagem: datas, orçamento, nº de pessoas, destino preferido.");
  if ((l._followUpPressure ?? 30) > 60) parts.push("Seja INSISTENTE: se não receber resposta detalhada, mande follow-up do tipo '??', 'e aí?', 'alguém?'.");
  if (l._customInstructions) parts.push(`INSTRUÇÃO ESPECIAL: ${l._customInstructions}`);
  return parts.length > 0 ? "\n\nCALIBRAÇÃO DE COMPORTAMENTO:\n" + parts.join("\n") : "";
}

export async function generateLeadMsg(
  lead: LeadInteligente,
  ultimaMsgAgente: string,
  isFirst: boolean,
  options?: { avoidRecentDuplicates?: boolean }
): Promise<string> {
  const sysPrompt = buildLeadPersona(lead) + buildCalibrationPrompt(lead);
  const duplicateGuard = options?.avoidRecentDuplicates
    ? (() => {
        const recentClientMessages = lead.mensagens
          .filter((message) => message.role === "client")
          .slice(-4)
          .map((message) => `- ${message.content}`)
          .join("\n");

        return recentClientMessages
          ? `\n\nREGRA CRÍTICA DE NATURALIDADE:\nNÃO repita nenhuma destas mensagens recentes quase com as mesmas palavras:\n${recentClientMessages}\nCrie uma continuação NOVA, humana e coerente.`
          : "";
      })()
    : "";
  const userPrompt = (isFirst
    ? buildFirstMessagePrompt(lead)
    : buildConversaContext(lead.mensagens, ultimaMsgAgente, lead.etapaAtual, lead)) + duplicateGuard;
  return callSimulatorAI(sysPrompt, [{ role: "user", content: userPrompt }], "lead");
}

export async function gerarObjecao(lead: LeadInteligente, ultimaMsgAgente: string): Promise<string> {
  const prompt = buildObjecaoPrompt(lead, lead.etapaAtual, ultimaMsgAgente);
  return callSimulatorAI(buildLeadPersona(lead) + buildCalibrationPrompt(lead), [{ role: "user", content: prompt }], "objection");
}

export async function avaliarRespostaAgente(resposta: string, lead: LeadInteligente): Promise<{ nota: number; reacao: string; sentimento: number; motivo: string; humanizacao: number; eficaciaComercial: number; qualidadeTecnica: number }> {
  try {
    const { buildLiveEvalPrompt } = await import("./evaluationFramework");
    const prompt = buildLiveEvalPrompt(resposta, lead.perfil.label, lead.etapaAtual);
    const result = await callSimulatorAI("Voce avalia qualidade de atendimento em 3 dimensões. Retorne SOMENTE JSON válido sem markdown.", [{ role: "user", content: prompt }], "evaluate");
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[0]);
      return {
        nota: Math.min(100, Math.max(0, data.nota || 50)),
        reacao: data.reacaoEmocional || "neutro",
        sentimento: Math.min(100, Math.max(0, data.sentimentoScore || 50)),
        motivo: data.motivoNota || "",
        humanizacao: Math.min(100, Math.max(0, data.humanizacao || 50)),
        eficaciaComercial: Math.min(100, Math.max(0, data.eficaciaComercial || 50)),
        qualidadeTecnica: Math.min(100, Math.max(0, data.qualidadeTecnica || 50)),
      };
    }
  } catch {}
  return { nota: 50, reacao: "neutro", sentimento: 50, motivo: "", humanizacao: 50, eficaciaComercial: 50, qualidadeTecnica: 50 };
}

export async function gerarMensagemPerda(lead: LeadInteligente): Promise<string> {
  const prompt = buildMensagemPerdaPrompt(lead, lead.etapaAtual);
  return callSimulatorAI(buildLeadPersona(lead) + buildCalibrationPrompt(lead), [{ role: "user", content: prompt }], "loss");
}

export const MIN_TROCAS_POR_AGENTE: Record<string, number> = {
  maya: 5, atlas: 6, habibi: 7, nemo: 7, dante: 7, luna: 5, nero: 5, iris: 4,
};

export const AGENT_ROLE_INSTRUCTIONS: Record<string, string> = {
  maya: `\nSEU PAPEL: voce e o primeiro contato. Nao qualifica — ENCANTA.\nAntes de qualquer dado, crie conexao com a PESSOA.\nPergunte a ocasiao, o que imaginam, o que os animou.\nSo transfira quando o lead estiver animado e curioso pelo que vem.`,
  atlas: `\nSEU PAPEL: qualifica sem parecer interrogatorio.\nDescubra orcamento, datas e grupo no fluxo natural — nao em perguntas diretas.\nIdentifique o perfil (familia, VIP, pechincheiro, lua de mel) e adapte o tom.\nSo transfira com: destino + orcamento + datas + ocasiao confirmados.`,
  habibi: `\nSEU PAPEL: faca o lead SONHAR com a viagem.\nNao apresente roteiro — conte uma historia que ele quer viver.\nInclua ao menos 1 experiencia exclusiva que ele nao ia encontrar pesquisando.\nPergunte o que ele imagina, sonha, quer sentir.\nSo transfira quando demonstrar animacao com algo especifico.`,
  nemo: `\nSEU PAPEL: faca o lead SONHAR com a viagem.\nNao apresente roteiro — conte uma historia que ele quer viver.\nInclua ao menos 1 experiencia exclusiva que ele nao ia encontrar pesquisando.\nPergunte o que ele imagina, sonha, quer sentir.\nSo transfira quando demonstrar animacao com algo especifico.`,
  dante: `\nSEU PAPEL: faca o lead SONHAR com a viagem.\nNao apresente roteiro — conte uma historia que ele quer viver.\nInclua ao menos 1 experiencia exclusiva que ele nao ia encontrar pesquisando.\nPergunte o que ele imagina, sonha, quer sentir.\nSo transfira quando demonstrar animacao com algo especifico.`,
  luna: `\nSEU PAPEL: a proposta e o culminar de tudo que foi conversado.\nCada item deve conectar com algo que o lead disse antes.\nApresente valor como experiencia, nao como custo.\nAbra espaco para o lead reagir antes de avancar.`,
  nero: `\nSEU PAPEL: voce e o mais paciente de todos.\nA ultima objecao e a mais importante — nunca desista nela.\nPergunte o que esta por tras da objecao antes de responder.\nUse argumento de valor ANTES de qualquer desconto.\nSo transfira para IRIS depois de SIM claro e sem ressalvas.`,
  iris: `\nSEU PAPEL: a venda foi feita. Agora crie um fa.\nConfirme detalhes com cuidado e entusiasmo genuino.\nDemonstre que a NatLeva vai cuidar de tudo.\nPlante a semente da proxima viagem e da indicacao.`,
};

export const FILOSOFIA_NATLEVA = `
FILOSOFIA DE ATENDIMENTO NATLEVA:
Voce esta em uma conversa, nao em um formulario. Seu objetivo NAO e coletar dados e passar adiante. Seu objetivo E fazer este lead querer continuar a conversa.

REGRAS DE OURO:
- Nunca encerre sem pergunta aberta ou elemento que convide resposta
- Antes de qualquer dado, crie conexao. Interesse genuino pela pessoa.
- Se o lead falou algo pessoal (ocasiao, sonho, familia), volte a isso.
- Faca ao menos 1 pergunta que nao era necessaria — so curiosidade.
- Celebre conquistas do lead (aniversario, casamento, viagem dos sonhos).
`;

export function buildAgentSysPrompt(agent: typeof AGENTS_V4[0], hasNext: boolean, enableTransfers: boolean, responseLength: "curta" | "media" | "longa", globalRulesBlock: string = "") {
  const lengthInstr = responseLength === "curta" ? "Responda de forma concisa mas com personalidade." : responseLength === "longa" ? "Responda de forma detalhada (3-5 frases), incluindo detalhes do produto." : "O agente decide o tamanho certo para cada momento da conversa.";
  const minTrocas = MIN_TROCAS_POR_AGENTE[agent.id] || 4;
  const transferInstr = hasNext && enableTransfers ? `\nSOBRE [TRANSFERIR]:
Use [TRANSFERIR] SOMENTE quando TUDO isso for verdade:
1. Voce teve ao menos ${minTrocas} trocas reais com este lead
2. O lead demonstrou entusiasmo genuino — nao apenas respondeu, se engajou
3. A proxima pergunta natural do lead e algo que so o proximo agente responde melhor
4. A transferencia beneficia o lead, nao e uma saida operacional

Se qualquer condicao faltar: continue a conversa. Aprofunde. Instigue. Surpreenda.
[TRANSFERIR] e resultado de conversa bem feita, nunca atalho.
Ao transferir: apresente o proximo agente com entusiasmo e contexto.\n` : "";
  const priceInstr = "IMPORTANTE: Quando for hora de enviar valores/orçamento, diga que vai enviar o print com os valores (ex: 'Segue o print com os valores!', 'Vou te enviar o orçamento agora!', 'Olha só o print com as opções de preço!'). Isso é fundamental para a experiência do cliente.\n";
  const roleInstr = AGENT_ROLE_INSTRUCTIONS[agent.id] || "";
  
  const training = getAgentTraining(agent.id);
  let trainingBlock = "";
  if (training) {
    const parts: string[] = [];
    if (training.behaviorPrompt) {
      parts.push(`\n=== DIRETIVAS COMPORTAMENTAIS (configuradas pela gestão — PRIORIDADE MÁXIMA) ===\nVocê DEVE seguir rigorosamente estas instruções:\n${training.behaviorPrompt}`);
    }
    if (training.customRules && training.customRules.length > 0) {
      const activeRules = training.customRules.filter(r => r.active);
      if (activeRules.length > 0) {
        parts.push(`\n=== REGRAS ESPECÍFICAS ===\n${activeRules.map(r => `- [${r.impact.toUpperCase()}] ${r.name}: ${r.description}`).join("\n")}`);
      }
    }
    if (training.knowledgeSummaries && training.knowledgeSummaries.length > 0) {
      parts.push(`\n=== BASE DE CONHECIMENTO ===\n${training.knowledgeSummaries.join("\n")}`);
    }
    trainingBlock = parts.join("\n");
  }
  
  return `${agent.persona}\nVoce conversa como ${agent.name} (${agent.role}) da agencia NatLeva pelo WhatsApp.\n${FILOSOFIA_NATLEVA}${roleInstr}\n${trainingBlock}\n${globalRulesBlock}\n${priceInstr}${transferInstr}${lengthInstr}`;
}

export const SPEED_OPTIONS = [
  { id: "lenta", label: "Lenta", delay: 5000 },
  { id: "normal", label: "Normal", delay: 2500 },
  { id: "rapida", label: "Rápida", delay: 500 },
  { id: "instant", label: "Instantâneo", delay: 0 },
];

export const getAgentColor = (agent: typeof AGENTS_V4[0]) => {
  const c: Record<string, string> = { orquestracao: "#10B981", comercial: "#F59E0B", atendimento: "#3B82F6", financeiro: "#8B5CF6", operacional: "#06B6D4", demanda: "#EF4444", retencao: "#EC4899" };
  return c[agent.squadId] || "#10B981";
};

export type Phase = "config" | "running" | "report";
export type ReportTab = "numeros" | "conversas" | "debrief";
export type ImprovementType = "conhecimento_kb" | "nova_skill" | "instrucao_prompt" | "workflow";

export interface Improvement {
  id: string; titulo: string; desc: string; impacto: string; agente: string;
  prioridade: "alta" | "media" | "baixa"; status: "pending" | "analyzing" | "approved" | "rejected";
  tipo: ImprovementType; conteudoSugerido: string; fonte: string;
  deepAnalysis?: DeepAnalysis | null; editedContent?: string; rejectReason?: string;
}
export interface DeepAnalysis {
  analiseCompleta: string; linhaRaciocinio: string[];
  impactoNumeros: { conversao: string; receita: string; satisfacao: string; eficiencia: string };
  psicologiaCliente: string; riscosNaoImplementar: string;
  recomendacao: string; confianca: number;
}
export interface DebriefDimensoes {
  humanizacao: import("./evaluationFramework").DimensaoScore;
  eficaciaComercial: import("./evaluationFramework").DimensaoScore;
  qualidadeTecnica: import("./evaluationFramework").DimensaoScore;
}
export interface DebriefData {
  scoreGeral: number; resumoExecutivo: string; fraseNathAI: string;
  pontosFortes: string[]; melhorias: Improvement[]; lacunasConhecimento: string[]; insightsCliente: string[];
  dimensoes?: DebriefDimensoes;
}
export interface SimHistoryEntry {
  id: string; date: string; scoreGeral: number; totalLeads: number;
  fechados: number; perdidos: number; conversao: number; melhorias_aprovadas: string[];
  dimensoes?: { humanizacao: number; eficaciaComercial: number; qualidadeTecnica: number };
}

export const TIPO_COLORS: Record<ImprovementType, { bg: string; color: string; label: string; icon: string }> = {
  conhecimento_kb: { bg: "rgba(59,130,246,0.08)", color: "#3B82F6", label: "KB", icon: "📚" },
  nova_skill: { bg: "rgba(245,158,11,0.08)", color: "#F59E0B", label: "Skill", icon: "⚡" },
  instrucao_prompt: { bg: "rgba(139,92,246,0.08)", color: "#8B5CF6", label: "Prompt", icon: "📝" },
  workflow: { bg: "rgba(6,182,212,0.08)", color: "#06B6D4", label: "Workflow", icon: "🔄" },
};

// ===== FLYWHEEL STORAGE =====
export const STORAGE_KEYS = {
  sim_history: "natleva_sim_historico",
  kb: "natleva_knowledge_base_improvements",
  skills: "natleva_skills_improvements",
  prompts: "natleva_prompt_improvements",
  workflows: "natleva_workflow_improvements",
  evolution: "natleva_evolution_timeline",
};

export function loadJson(key: string) {
  try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; }
}
export function saveJson(key: string, data: any) {
  localStorage.setItem(key, JSON.stringify(data));
}

export async function implementImprovement(m: Improvement) {
  const entry = { id: m.id, titulo: m.titulo, agente: m.agente, conteudo: m.editedContent || m.conteudoSugerido, data: new Date().toISOString(), tipo: m.tipo };
  if (m.tipo === "conhecimento_kb") {
    const kb = loadJson(STORAGE_KEYS.kb);
    kb.unshift(entry);
    saveJson(STORAGE_KEYS.kb, kb);
  } else if (m.tipo === "nova_skill") {
    const skills = loadJson(STORAGE_KEYS.skills);
    skills.unshift(entry);
    saveJson(STORAGE_KEYS.skills, skills);
  } else if (m.tipo === "instrucao_prompt") {
    const prompts = loadJson(STORAGE_KEYS.prompts);
    prompts.unshift(entry);
    saveJson(STORAGE_KEYS.prompts, prompts);
  } else if (m.tipo === "workflow") {
    const wfs = loadJson(STORAGE_KEYS.workflows);
    wfs.unshift(entry);
    saveJson(STORAGE_KEYS.workflows, wfs);
  }
  const timeline = loadJson(STORAGE_KEYS.evolution);
  timeline.unshift({
    id: "ev_" + Date.now(), tipo: m.tipo, agenteId: m.agente,
    titulo: m.titulo, antes: "Problema identificado em simulação",
    depois: (m.editedContent || m.conteudoSugerido).slice(0, 80),
    impacto: m.impacto, status: "aplicado", data: new Date().toISOString(), fonte: "debrief_simulacao",
  });
  saveJson(STORAGE_KEYS.evolution, timeline);
}

export function saveSimHistory(entry: SimHistoryEntry) {
  const history = loadJson(STORAGE_KEYS.sim_history);
  history.unshift(entry);
  saveJson(STORAGE_KEYS.sim_history, history.slice(0, 20));
}

export const sentimentColor = (s: number) => s >= 70 ? "#10B981" : s >= 40 ? "#F59E0B" : "#EF4444";
export const sentimentLabel = (s: number) => s >= 80 ? "Empolgado" : s >= 60 ? "Satisfeito" : s >= 40 ? "Neutro" : s >= 20 ? "Impaciente" : "Desistindo";
