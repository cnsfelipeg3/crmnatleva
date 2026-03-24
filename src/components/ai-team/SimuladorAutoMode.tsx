import { useState, useCallback, useRef, useEffect } from "react";
import { Play, Loader2, CheckCircle2, XCircle, ChevronDown, ChevronUp, Check, X, Square, BarChart3, Zap, User, MessageSquare, Lightbulb, AlertTriangle, Brain, Heart, Shield, Clock, TrendingUp, Send, MapPin, Wallet, Radio, Users, BookOpen, Search, FileText, Workflow, Edit3, Download } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import NathOpinionButton from "./NathOpinionButton";
import { Slider } from "@/components/ui/slider";
import { AGENTS_V4, SQUADS } from "@/components/ai-team/agentsV4Data";
import { getAgentTraining } from "@/components/ai-team/agentTrainingStore";
import { useGlobalRules, buildGlobalRulesBlock, type GlobalRule } from "@/hooks/useGlobalRules";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useSimulationPersistence } from "@/hooks/useSimulationPersistence";
import { buildActiveContext, shouldChunk, createChunkSummary, type SimEvent, type ChunkData, CHUNK_SIZE, createMetricsSnapshot, buildLeadContextSummary } from "./simulationEngine";
import {
  type LeadInteligente, type MensagemLead, type PerfilPsicologico,
  PERFIS_INTELIGENTES, DESTINOS_LEAD, BUDGETS_LEAD, CANAIS_LEAD, GRUPOS_LEAD, ETAPAS_FUNIL,
  buildLeadPersona, buildConversaContext, buildFirstMessagePrompt, buildObjecaoPrompt,
  buildAvaliacaoPrompt, buildMensagemPerdaPrompt,
  gerarLeadInteligente, deveInserirObjecao, atualizarEstadoEmocional, devePerdeLead,
} from "./intelligentLeads";
import { compressConversation, estimateTokens, BUILT_IN_PRESETS } from "./contextCompression";
import {
  getAgentPesos, getNivel, buildLiveEvalPrompt, buildDebriefV2Prompt,
  SYSTEM_DEBRIEF_V2, CRITERIOS_AVALIACAO,
  type DimensaoScore, type CriterioScore,
  saveHistoricoAvaliacao, loadHistoricoAvaliacoes,
} from "./evaluationFramework";

// ===== API — Roteamento inteligente por tipo de chamada =====
type SimCallType = "lead" | "agent" | "evaluate" | "debrief" | "objection" | "loss" | "deep" | "price_image";

function normalizeSimMessage(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function hasRecentDuplicateMessage(
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

function pushUniqueSimMessage(
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

async function callSimulatorAI(sysPrompt: string, history: { role: string; content: string }[], type: SimCallType = "agent", agentBehaviorPrompt?: string, _retryCount = 0): Promise<string> {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/simulator-ai`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
    body: JSON.stringify({ type, systemPrompt: sysPrompt, history, agentBehaviorPrompt: agentBehaviorPrompt || "", provider: "anthropic" }),
  });
  // Retry with exponential backoff on rate limit (429)
  if (resp.status === 429 && _retryCount < 3) {
    const delay = Math.pow(2, _retryCount) * 1000 + Math.random() * 500;
    await new Promise(r => setTimeout(r, delay));
    return callSimulatorAI(sysPrompt, history, type, agentBehaviorPrompt, _retryCount + 1);
  }
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

  // Non-streaming types return JSON directly
  if (type === "evaluate" || type === "debrief" || type === "deep" || type === "price_image") {
    const data = await resp.json();
    return data.content || "";
  }

  // Streaming types (lead, agent, objection, loss)
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

function detectsPricePrint(text: string): boolean {
  return PRICE_PRINT_PATTERNS.test(text);
}

// Generate a realistic price quote image via AI
async function generatePriceImage(lead: { nome: string; destino: string; pax: number; orcamento: string; ticket: number; paxLabel: string }): Promise<string | null> {
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
function buildCalibrationPrompt(lead: LeadInteligente): string {
  const l = lead as any;
  const parts: string[] = [];
  // Tone
  const tone = l._toneFormality ?? 50;
  if (tone < 30) parts.push("Use linguagem BEM informal: gírias, abreviações (vc, tb, tmj, blz), sem pontuação formal.");
  else if (tone > 70) parts.push("Use linguagem formal e educada. Trate por 'você/senhor(a)', frases completas, boa gramática.");
  // Typing style
  if (l._typingStyle === "rapido") parts.push("Escreva mensagens MUITO curtas (1-5 palavras), direto ao ponto.");
  else if (l._typingStyle === "detalhado") parts.push("Escreva textos longos e detalhados com contexto completo.");
  // Typos
  if (l._enableTypos) parts.push("Cometa erros de digitação realistas: 'tbm', 'vc', 'pq', letras trocadas ocasionalmente.");
  // Emojis
  if (l._enableEmojis) parts.push("Use emojis naturalmente (😊 🙏 ✈️ ❤️) — de 1 a 3 por mensagem.");
  else parts.push("NÃO use emojis.");
  // Audio refs
  if (l._enableAudioRef && Math.random() < 0.2) parts.push("Em algum momento mencione que prefere mandar áudio ou que não consegue ler textos longos agora.");
  // Conversation goal
  const goal = l._conversationGoal || "comprar";
  if (goal === "pesquisar") parts.push("Você está APENAS pesquisando. Não tem pressa, faça muitas perguntas mas não avance para fechamento.");
  else if (goal === "comparar") parts.push("Você está comparando com concorrentes. Mencione que viu preços em outros lugares. Peça para baterem ofertas.");
  // Info reveal
  if (l._infoRevealSpeed === "resistente") parts.push("NÃO revele informações pessoais facilmente. Exija confiança e boas respostas primeiro.");
  else if (l._infoRevealSpeed === "imediato") parts.push("Dê todas as informações logo na primeira mensagem: datas, orçamento, nº de pessoas, destino preferido.");
  // Follow-up pressure
  if ((l._followUpPressure ?? 30) > 60) parts.push("Seja INSISTENTE: se não receber resposta detalhada, mande follow-up do tipo '??', 'e aí?', 'alguém?'.");
  // Custom
  if (l._customInstructions) parts.push(`INSTRUÇÃO ESPECIAL: ${l._customInstructions}`);
  return parts.length > 0 ? "\n\nCALIBRAÇÃO DE COMPORTAMENTO:\n" + parts.join("\n") : "";
}

async function generateLeadMsg(
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

// Generate contextual objection
async function gerarObjecao(lead: LeadInteligente, ultimaMsgAgente: string): Promise<string> {
  const prompt = buildObjecaoPrompt(lead, lead.etapaAtual, ultimaMsgAgente);
  return callSimulatorAI(buildLeadPersona(lead) + buildCalibrationPrompt(lead), [{ role: "user", content: prompt }], "objection");
}

// Evaluate agent response quality — 3 dimensions
async function avaliarRespostaAgente(resposta: string, lead: LeadInteligente): Promise<{ nota: number; reacao: string; sentimento: number; motivo: string; humanizacao: number; eficaciaComercial: number; qualidadeTecnica: number }> {
  try {
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

// Generate motivated loss message
async function gerarMensagemPerda(lead: LeadInteligente): Promise<string> {
  const prompt = buildMensagemPerdaPrompt(lead, lead.etapaAtual);
  return callSimulatorAI(buildLeadPersona(lead) + buildCalibrationPrompt(lead), [{ role: "user", content: prompt }], "loss");
}

const MIN_TROCAS_POR_AGENTE: Record<string, number> = {
  maya: 5, atlas: 6, habibi: 7, nemo: 7, dante: 7, luna: 5, nero: 5, iris: 4,
};

const AGENT_ROLE_INSTRUCTIONS: Record<string, string> = {
  maya: `\nSEU PAPEL: voce e o primeiro contato. Nao qualifica — ENCANTA.\nAntes de qualquer dado, crie conexao com a PESSOA.\nPergunte a ocasiao, o que imaginam, o que os animou.\nSo transfira quando o lead estiver animado e curioso pelo que vem.`,
  atlas: `\nSEU PAPEL: qualifica sem parecer interrogatorio.\nDescubra orcamento, datas e grupo no fluxo natural — nao em perguntas diretas.\nIdentifique o perfil (familia, VIP, pechincheiro, lua de mel) e adapte o tom.\nSo transfira com: destino + orcamento + datas + ocasiao confirmados.`,
  habibi: `\nSEU PAPEL: faca o lead SONHAR com a viagem.\nNao apresente roteiro — conte uma historia que ele quer viver.\nInclua ao menos 1 experiencia exclusiva que ele nao ia encontrar pesquisando.\nPergunte o que ele imagina, sonha, quer sentir.\nSo transfira quando demonstrar animacao com algo especifico.`,
  nemo: `\nSEU PAPEL: faca o lead SONHAR com a viagem.\nNao apresente roteiro — conte uma historia que ele quer viver.\nInclua ao menos 1 experiencia exclusiva que ele nao ia encontrar pesquisando.\nPergunte o que ele imagina, sonha, quer sentir.\nSo transfira quando demonstrar animacao com algo especifico.`,
  dante: `\nSEU PAPEL: faca o lead SONHAR com a viagem.\nNao apresente roteiro — conte uma historia que ele quer viver.\nInclua ao menos 1 experiencia exclusiva que ele nao ia encontrar pesquisando.\nPergunte o que ele imagina, sonha, quer sentir.\nSo transfira quando demonstrar animacao com algo especifico.`,
  luna: `\nSEU PAPEL: a proposta e o culminar de tudo que foi conversado.\nCada item deve conectar com algo que o lead disse antes.\nApresente valor como experiencia, nao como custo.\nAbra espaco para o lead reagir antes de avancar.`,
  nero: `\nSEU PAPEL: voce e o mais paciente de todos.\nA ultima objecao e a mais importante — nunca desista nela.\nPergunte o que esta por tras da objecao antes de responder.\nUse argumento de valor ANTES de qualquer desconto.\nSo transfira para IRIS depois de SIM claro e sem ressalvas.`,
  iris: `\nSEU PAPEL: a venda foi feita. Agora crie um fa.\nConfirme detalhes com cuidado e entusiasmo genuino.\nDemonstre que a NatLeva vai cuidar de tudo.\nPlante a semente da proxima viagem e da indicacao.`,
};

const FILOSOFIA_NATLEVA = `
FILOSOFIA DE ATENDIMENTO NATLEVA:
Voce esta em uma conversa, nao em um formulario. Seu objetivo NAO e coletar dados e passar adiante. Seu objetivo E fazer este lead querer continuar a conversa.

REGRAS DE OURO:
- Nunca encerre sem pergunta aberta ou elemento que convide resposta
- Antes de qualquer dado, crie conexao. Interesse genuino pela pessoa.
- Se o lead falou algo pessoal (ocasiao, sonho, familia), volte a isso.
- Faca ao menos 1 pergunta que nao era necessaria — so curiosidade.
- Celebre conquistas do lead (aniversario, casamento, viagem dos sonhos).
`;

function buildAgentSysPrompt(agent: typeof AGENTS_V4[0], hasNext: boolean, enableTransfers: boolean, responseLength: "curta" | "media" | "longa", globalRulesBlock: string = "") {
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
  
  // Inject training data from shared store
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

const SPEED_OPTIONS = [
  { id: "lenta", label: "Lenta", delay: 5000 },
  { id: "normal", label: "Normal", delay: 2500 },
  { id: "rapida", label: "Rápida", delay: 500 },
  { id: "instant", label: "Instantâneo", delay: 0 },
];

const getAgentColor = (agent: typeof AGENTS_V4[0]) => {
  const c: Record<string, string> = { orquestracao: "#10B981", comercial: "#F59E0B", atendimento: "#3B82F6", financeiro: "#8B5CF6", operacional: "#06B6D4", demanda: "#EF4444", retencao: "#EC4899" };
  return c[agent.squadId] || "#10B981";
};

type Phase = "config" | "running" | "report";
type ReportTab = "numeros" | "conversas" | "debrief";
type ImprovementType = "conhecimento_kb" | "nova_skill" | "instrucao_prompt" | "workflow";

interface Improvement {
  id: string; titulo: string; desc: string; impacto: string; agente: string;
  prioridade: "alta" | "media" | "baixa"; status: "pending" | "analyzing" | "approved" | "rejected";
  tipo: ImprovementType; conteudoSugerido: string; fonte: string;
  deepAnalysis?: DeepAnalysis | null; editedContent?: string; rejectReason?: string;
}
interface DeepAnalysis {
  analiseCompleta: string; linhaRaciocinio: string[];
  impactoNumeros: { conversao: string; receita: string; satisfacao: string; eficiencia: string };
  psicologiaCliente: string; riscosNaoImplementar: string;
  recomendacao: string; confianca: number;
}
interface DebriefDimensoes {
  humanizacao: DimensaoScore;
  eficaciaComercial: DimensaoScore;
  qualidadeTecnica: DimensaoScore;
}
interface DebriefData {
  scoreGeral: number; resumoExecutivo: string; fraseNathAI: string;
  pontosFortes: string[]; melhorias: Improvement[]; lacunasConhecimento: string[]; insightsCliente: string[];
  dimensoes?: DebriefDimensoes;
}
interface SimHistoryEntry {
  id: string; date: string; scoreGeral: number; totalLeads: number;
  fechados: number; perdidos: number; conversao: number; melhorias_aprovadas: string[];
  dimensoes?: { humanizacao: number; eficaciaComercial: number; qualidadeTecnica: number };
}

const TIPO_COLORS: Record<ImprovementType, { bg: string; color: string; label: string; icon: string }> = {
  conhecimento_kb: { bg: "rgba(59,130,246,0.08)", color: "#3B82F6", label: "KB", icon: "📚" },
  nova_skill: { bg: "rgba(245,158,11,0.08)", color: "#F59E0B", label: "Skill", icon: "⚡" },
  instrucao_prompt: { bg: "rgba(139,92,246,0.08)", color: "#8B5CF6", label: "Prompt", icon: "📝" },
  workflow: { bg: "rgba(6,182,212,0.08)", color: "#06B6D4", label: "Workflow", icon: "🔄" },
};

// ===== FLYWHEEL STORAGE =====
const STORAGE_KEYS = {
  sim_history: "natleva_sim_historico",
  kb: "natleva_knowledge_base_improvements",
  skills: "natleva_skills_improvements",
  prompts: "natleva_prompt_improvements",
  workflows: "natleva_workflow_improvements",
  evolution: "natleva_evolution_timeline",
};

function loadJson(key: string) {
  try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; }
}
function saveJson(key: string, data: any) {
  localStorage.setItem(key, JSON.stringify(data));
}

async function implementImprovement(m: Improvement) {
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
  // Register in Evolution timeline
  const timeline = loadJson(STORAGE_KEYS.evolution);
  timeline.unshift({
    id: "ev_" + Date.now(), tipo: m.tipo, agenteId: m.agente,
    titulo: m.titulo, antes: "Problema identificado em simulação",
    depois: (m.editedContent || m.conteudoSugerido).slice(0, 80),
    impacto: m.impacto, status: "aplicado", data: new Date().toISOString(), fonte: "debrief_simulacao",
  });
  saveJson(STORAGE_KEYS.evolution, timeline);
}

function saveSimHistory(entry: SimHistoryEntry) {
  const history = loadJson(STORAGE_KEYS.sim_history);
  history.unshift(entry);
  saveJson(STORAGE_KEYS.sim_history, history.slice(0, 20));
}

function useCountUp(target: number, duration = 500) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (target === 0) { setVal(0); return; }
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      setVal(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return val;
}

// ===== COMPONENT =====
export default function SimuladorAutoMode() {
  const isMobile = useIsMobile();
  // Config — Volume
  const [numLeads, setNumLeads] = useState(8);
  const [msgsPerLead, setMsgsPerLead] = useState(14);
  const [intervalSec, setIntervalSec] = useState(1);
  const [duration, setDuration] = useState(180);
  const [parallelLeads, setParallelLeads] = useState(1); // How many leads to process simultaneously
  const [dispatchMode, setDispatchMode] = useState<"sequential" | "simultaneous" | "wave">("sequential");
  // Config — Perfis
  const [selectedProfiles, setSelectedProfiles] = useState<string[]>([]);
  const [profileMode, setProfileMode] = useState<"random" | "roundrobin">("random");
  // Config — Cenário
  const [selectedDestinos, setSelectedDestinos] = useState<string[]>([]);
  const [selectedBudgets, setSelectedBudgets] = useState<string[]>([]);
  const [selectedCanais, setSelectedCanais] = useState<string[]>([]);
  const [selectedGrupos, setSelectedGrupos] = useState<string[]>([]);
  // Config — Comportamento
  const [conversionOverride, setConversionOverride] = useState<number | null>(null);
  const [objectionDensity, setObjectionDensity] = useState(50);
  const [speed, setSpeed] = useState("normal");
  const [funnelMode, setFunnelMode] = useState<"full" | "comercial" | "custom" | "individual">("full");
  const [customFunnelAgents, setCustomFunnelAgents] = useState<string[]>([]);
  // Config — Motor IA
  const [enableEvaluation, setEnableEvaluation] = useState(true);
  const [enableMultiMsg, setEnableMultiMsg] = useState(true);
  const [enableTransfers, setEnableTransfers] = useState(true);
  const [emotionalVolatility, setEmotionalVolatility] = useState(50);
  const [agentResponseLength, setAgentResponseLength] = useState<"curta" | "media" | "longa">("media");
  const [enableLossNarrative, setEnableLossNarrative] = useState(true);
  const [evalFrequency, setEvalFrequency] = useState<"every" | "every2" | "every3">("every");
  // Config — Calibração Lead
  const [leadPatienceCurve, setLeadPatienceCurve] = useState<"linear" | "exponential" | "sudden">("linear");
  const [initialPatience, setInitialPatience] = useState(80);
  const [leadToneFormality, setLeadToneFormality] = useState(50); // 0=informal 100=formal
  const [leadTypingStyle, setLeadTypingStyle] = useState<"natural" | "rapido" | "detalhado">("natural");
  const [abandonmentSensitivity, setAbandonmentSensitivity] = useState(50); // 0=nunca desiste 100=desiste fácil
  const [infoRevealSpeed, setInfoRevealSpeed] = useState<"gradual" | "imediato" | "resistente">("gradual");
  const [leadFollowUpPressure, setLeadFollowUpPressure] = useState(30); // % chance de mandar follow-up
  const [enableLeadTypos, setEnableLeadTypos] = useState(false);
  const [enableLeadEmojis, setEnableLeadEmojis] = useState(true);
  const [enableLeadAudioRef, setEnableLeadAudioRef] = useState(false); // simula "prefiro audio" / "não consigo ler agora"
  const [leadConversationGoal, setLeadConversationGoal] = useState<"comprar" | "pesquisar" | "comparar" | "aleatorio">("aleatorio");
  const [maxConversationMinutes, setMaxConversationMinutes] = useState(0); // 0 = sem limite por conversa
  const [leadReengagementChance, setLeadReengagementChance] = useState(20); // % chance de voltar depois de silêncio
  const [leadCustomInstructions, setLeadCustomInstructions] = useState("");
  // Config — Presets
  const [presetName, setPresetName] = useState("");
  const [configTab, setConfigTab] = useState<"volume" | "perfis" | "cenario" | "lead_behavior" | "comportamento" | "avancado" | "presets">("volume");

  // Runtime
  const [phase, setPhase] = useState<Phase>("config");
  const [leads, setLeads] = useState<LeadInteligente[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [events, setEvents] = useState<{ id: string; color: string; text: string; time: string; icon?: string }[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [reportTab, setReportTab] = useState<ReportTab>("numeros");
  const [debrief, setDebrief] = useState<DebriefData | null>(null);
  const [debriefLoading, setDebriefLoading] = useState(false);
  const [leadFilter, setLeadFilter] = useState<"all" | "ativo" | "fechou" | "perdeu">("all");
  const [expandedMelhoriaId, setExpandedMelhoriaId] = useState<string | null>(null);

  const chatRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef(false);
  const simAtivaRef = useRef(false);
  const { toast } = useToast();
  const simPersistence = useSimulationPersistence();
  const chunksRef = useRef<Map<string, ChunkData[]>>(new Map());
  const selectedLead = leads.find(l => l.id === selectedLeadId) || null;
  const closedLeads = leads.filter(l => l.status === "fechou");
  const lostLeads = leads.filter(l => l.status === "perdeu");
  const totalReceita = closedLeads.reduce((s, l) => s + l.ticket, 0);
  const conversionRate = leads.length > 0 ? Math.round((closedLeads.length / leads.length) * 100) : 0;
  const totalObjecoes = leads.reduce((s, l) => s + l.objecoesLancadas.length, 0);
  const totalContornadas = leads.reduce((s, l) => s + (l.status === "fechou" ? l.objecoesLancadas.length : 0), 0);
  const ticketMedio = closedLeads.length > 0 ? Math.round(totalReceita / closedLeads.length) : 0;
  const avgSentimento = leads.length > 0 ? Math.round(leads.reduce((s, l) => s + l.sentimentoScore, 0) / leads.length) : 0;
  // 3 Dimensões — médias ao vivo
  const avgHumanizacao = leads.length > 0 ? Math.round(leads.reduce((s, l) => s + l.scoreHumanizacao, 0) / leads.length) : 0;
  const avgEficacia = leads.length > 0 ? Math.round(leads.reduce((s, l) => s + l.scoreEficacia, 0) / leads.length) : 0;
  const avgTecnica = leads.length > 0 ? Math.round(leads.reduce((s, l) => s + l.scoreTecnica, 0) / leads.length) : 0;

  const animLeads = useCountUp(leads.length);
  const animClosed = useCountUp(closedLeads.length);
  const animReceita = useCountUp(Math.round(totalReceita / 1000));

  const filteredLeads = leadFilter === "all" ? leads : leads.filter(l => l.status === leadFilter);

  // configTab is used for tab navigation in the config panel
  const toggleMulti = (arr: string[], id: string, setter: (v: string[]) => void) => {
    setter(arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id]);
  };
  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const addEvent = (color: string, text: string, icon?: string) => {
    setEvents(prev => [{ id: crypto.randomUUID(), color, text, icon, time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) }, ...prev].slice(0, 30));
  };

  // Auto-scroll chat
  useEffect(() => { chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" }); }, [selectedLead?.mensagens?.length]);

  // ★ Auto-stop simulation when duration is exceeded
  useEffect(() => {
    if (running && elapsedSeconds >= duration) {
      stopSimulationRef.current();
    }
  }, [running, elapsedSeconds, duration]);

  const stopSimulationRef = useRef(() => {});
  stopSimulationRef.current = () => { simAtivaRef.current = false; abortRef.current = true; setRunning(false); if (timerRef.current) clearInterval(timerRef.current); setPhase("report"); };

  // ===== PRESETS =====
  const PRESET_STORAGE_KEY = "natleva_sim_presets";
  const loadPresets = (): Array<{ name: string; config: any }> => {
    try { return JSON.parse(localStorage.getItem(PRESET_STORAGE_KEY) || "[]"); } catch { return []; }
  };
  const [presets, setPresets] = useState(loadPresets);
  const savePreset = (name: string) => {
    const config = { numLeads, msgsPerLead, intervalSec, duration, selectedProfiles, profileMode, selectedDestinos, selectedBudgets, selectedCanais, selectedGrupos, conversionOverride, objectionDensity, speed, funnelMode, customFunnelAgents, enableEvaluation, enableMultiMsg, enableTransfers, emotionalVolatility, agentResponseLength, enableLossNarrative, evalFrequency, leadPatienceCurve, initialPatience, leadToneFormality, leadTypingStyle, abandonmentSensitivity, infoRevealSpeed, leadFollowUpPressure, enableLeadTypos, enableLeadEmojis, enableLeadAudioRef, leadConversationGoal, maxConversationMinutes, leadReengagementChance, leadCustomInstructions };
    const updated = [...presets.filter(p => p.name !== name), { name, config }];
    localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(updated));
    setPresets(updated);
    toast({ title: `✅ Preset "${name}" salvo` });
  };
  const loadPreset = (config: any) => {
    setNumLeads(config.numLeads ?? 8); setMsgsPerLead(config.msgsPerLead ?? 14); setIntervalSec(config.intervalSec ?? 1);
    setDuration(config.duration ?? 180); setSelectedProfiles(config.selectedProfiles ?? []); setProfileMode(config.profileMode ?? "random");
    setSelectedDestinos(config.selectedDestinos ?? []); setSelectedBudgets(config.selectedBudgets ?? []); setSelectedCanais(config.selectedCanais ?? []);
    setSelectedGrupos(config.selectedGrupos ?? []); setConversionOverride(config.conversionOverride ?? null); setObjectionDensity(config.objectionDensity ?? 50);
    setSpeed(config.speed ?? "normal"); setFunnelMode(config.funnelMode ?? "full"); setCustomFunnelAgents(config.customFunnelAgents ?? []);
    setEnableEvaluation(config.enableEvaluation ?? true); setEnableMultiMsg(config.enableMultiMsg ?? true);
    setEnableTransfers(config.enableTransfers ?? true); setEmotionalVolatility(config.emotionalVolatility ?? 50);
    setAgentResponseLength(config.agentResponseLength ?? "media"); setEnableLossNarrative(config.enableLossNarrative ?? true);
    setEvalFrequency(config.evalFrequency ?? "every");
    setLeadPatienceCurve(config.leadPatienceCurve ?? "linear"); setInitialPatience(config.initialPatience ?? 80);
    setLeadToneFormality(config.leadToneFormality ?? 50); setLeadTypingStyle(config.leadTypingStyle ?? "natural");
    setAbandonmentSensitivity(config.abandonmentSensitivity ?? 50); setInfoRevealSpeed(config.infoRevealSpeed ?? "gradual");
    setLeadFollowUpPressure(config.leadFollowUpPressure ?? 30); setEnableLeadTypos(config.enableLeadTypos ?? false);
    setEnableLeadEmojis(config.enableLeadEmojis ?? true); setEnableLeadAudioRef(config.enableLeadAudioRef ?? false);
    setLeadConversationGoal(config.leadConversationGoal ?? "aleatorio"); setMaxConversationMinutes(config.maxConversationMinutes ?? 0);
    setLeadReengagementChance(config.leadReengagementChance ?? 20); setLeadCustomInstructions(config.leadCustomInstructions ?? "");
    toast({ title: "Preset carregado!" });
  };
  const deletePreset = (name: string) => {
    const updated = presets.filter(p => p.name !== name);
    localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(updated));
    setPresets(updated);
  };

  // ===== SIMULATION ENGINE =====
  const runSimulation = useCallback(async () => {
    setPhase("running"); setRunning(true); setLeads([]); setEvents([]); setElapsedSeconds(0);
    setSelectedLeadId(null); setDebrief(null); abortRef.current = false; simAtivaRef.current = true;
    chunksRef.current = new Map();

    timerRef.current = setInterval(() => setElapsedSeconds(p => p + 1), 1000);

    // Start DB persistence
    const simConfig = { numLeads, msgsPerLead, intervalSec, duration, speed, dispatchMode, parallelLeads, objectionDensity, enableEvaluation, enableMultiMsg, enableTransfers, emotionalVolatility, agentResponseLength, enableLossNarrative, evalFrequency, funnelMode };
    const leadsRef_local = { current: [] as LeadInteligente[] };
    const simId = await simPersistence.startSimulation(simConfig, () => leadsRef_local.current);

    const profiles = selectedProfiles.length > 0
      ? PERFIS_INTELIGENTES.filter(p => selectedProfiles.includes(p.tipo))
      : PERFIS_INTELIGENTES;
    const destinos = selectedDestinos.length > 0 ? selectedDestinos : DESTINOS_LEAD;
    const budgets = selectedBudgets.length > 0 ? selectedBudgets : BUDGETS_LEAD;
    const canais = selectedCanais.length > 0 ? selectedCanais : CANAIS_LEAD;
    const speedDelay = SPEED_OPTIONS.find(s => s.id === speed)?.delay ?? 2500;
    const simStartTime = Date.now();
    const durationMs = duration * 1000;
    const evalEvery = evalFrequency === "every" ? 1 : evalFrequency === "every2" ? 2 : 3;

    // Helper to check duration limit
    const isDurationExceeded = () => Date.now() - simStartTime >= durationMs;

    const funnelAgents = funnelMode === "full"
      ? AGENTS_V4.filter(a => ["comercial", "atendimento"].includes(a.squadId)).slice(0, 6)
      : funnelMode === "comercial"
        ? AGENTS_V4.filter(a => a.squadId === "comercial")
        : funnelMode === "individual"
          ? customFunnelAgents.slice(0, 1).map(id => AGENTS_V4.find(a => a.id === id)!).filter(Boolean)
          : customFunnelAgents.map(id => AGENTS_V4.find(a => a.id === id)!).filter(Boolean);

    if (funnelAgents.length === 0) {
      toast({ title: "Selecione agentes para o funil", variant: "destructive" });
      setRunning(false); setPhase("config");
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const allLeads: LeadInteligente[] = [];
    const grupos = selectedGrupos.length > 0 ? selectedGrupos : GRUPOS_LEAD;

    // ===== Create all leads upfront =====
    for (let i = 0; i < numLeads; i++) {
      const perfil = profileMode === "roundrobin"
        ? profiles[i % profiles.length]
        : profiles[Math.floor(Math.random() * profiles.length)];

      const lead = gerarLeadInteligente(perfil, {
        destino: destinos[Math.floor(Math.random() * destinos.length)],
        orcamento: budgets[Math.floor(Math.random() * budgets.length)],
        canal: canais[Math.floor(Math.random() * canais.length)],
        grupo: grupos[Math.floor(Math.random() * grupos.length)],
      });

      if (conversionOverride !== null) {
        lead.ticket = Math.random() * 100 < conversionOverride ? (8000 + Math.floor(Math.random() * 42000)) : 0;
      }
      lead.temObjecao = Math.random() * 100 < objectionDensity;
      lead.pacienciaRestante = initialPatience;
      if (emotionalVolatility > 70) {
        lead.pacienciaRestante = Math.max(20, lead.pacienciaRestante - Math.floor((emotionalVolatility - 50) * 0.5));
      }
      (lead as any)._abandonSensitivity = abandonmentSensitivity;
      (lead as any)._patienceCurve = leadPatienceCurve;
      (lead as any)._toneFormality = leadToneFormality;
      (lead as any)._typingStyle = leadTypingStyle;
      (lead as any)._followUpPressure = leadFollowUpPressure;
      (lead as any)._infoRevealSpeed = infoRevealSpeed;
      (lead as any)._enableTypos = enableLeadTypos;
      (lead as any)._enableEmojis = enableLeadEmojis;
      (lead as any)._enableAudioRef = enableLeadAudioRef;
      (lead as any)._conversationGoal = leadConversationGoal === "aleatorio" ? ["comprar","pesquisar","comparar"][Math.floor(Math.random()*3)] : leadConversationGoal;
      (lead as any)._maxConvMinutes = maxConversationMinutes;
      (lead as any)._reengagementChance = leadReengagementChance;
      (lead as any)._customInstructions = leadCustomInstructions;

      allLeads.push(lead);
    }
    setLeads([...allLeads]);
    leadsRef_local.current = allLeads;
    if (allLeads.length > 0) setSelectedLeadId(allLeads[0].id);

    // Register all leads in DB
    for (const lead of allLeads) {
      await simPersistence.registerLead(lead);
    }

    // ===== Per-lead simulation logic (extracted for parallel use) =====
    const simulateLead = async (lead: LeadInteligente) => {
      if (!simAtivaRef.current || abortRef.current) return;
      if (isDurationExceeded()) return;

      addEvent("#3B82F6", `${lead.perfil.emoji} ${lead.nome} entrou via ${lead.origem} · ${lead.destino} · ${lead.paxLabel}`, "📥");
      simPersistence.bufferEvent({ id: crypto.randomUUID(), type: "lead_created", leadId: lead.id, payload: { profile: lead.perfil.tipo, destino: lead.destino }, timestamp: Date.now() });

      try {
        const firstMsg = await generateLeadMsg(lead, "", true);
        if (!simAtivaRef.current) return;
        const addedFirstMsg = pushUniqueSimMessage(lead, { role: "client", content: firstMsg, timestamp: Date.now() });
        if (!addedFirstMsg) return;
        setLeads(prev => [...prev]);
        addEvent(lead.perfil.cor, `${lead.nome}: "${firstMsg.slice(0, 50)}..."`, "💬");

        const stages = ETAPAS_FUNIL.map(e => e.id);
        const rounds = Math.floor(msgsPerLead / 2);
        let agentIdx = 0;
        let forceLoss = false;
        let evalCounter = 0;

        for (let r = 0; r < rounds; r++) {
          if (!simAtivaRef.current || abortRef.current || forceLoss) break;
          if (isDurationExceeded()) {
            addEvent("#F59E0B", `⏱️ Tempo esgotado durante conversa com ${lead.nome}`, "⏰");
            break;
          }

          const agent = funnelAgents[agentIdx % funnelAgents.length];
          const hasNext = enableTransfers && agentIdx < funnelAgents.length - 1;
          lead.etapaAtual = stages[Math.min(agentIdx, stages.length - 1)];

          // Agent responds — with context compression + chunking for long conversations
          // Check if we need to chunk before building context
          if (shouldChunk(lead.mensagens.length)) {
            const toArchive = lead.mensagens.splice(0, CHUNK_SIZE);
            const summary = createChunkSummary(toArchive, lead.nome);
            const chunk: ChunkData = { chunkIndex: (chunksRef.current.get(lead.id) || []).length, messages: toArchive, summary, tokenEstimate: Math.ceil(toArchive.reduce((s, m) => s + m.content.length, 0) / 3.5) };
            const existingChunks = chunksRef.current.get(lead.id) || [];
            existingChunks.push(chunk);
            chunksRef.current.set(lead.id, existingChunks);
            simPersistence.processChunking(lead);
            addEvent("#8B5CF6", `📦 ${lead.nome}: bloco ${chunk.chunkIndex + 1} arquivado (${CHUNK_SIZE} msgs resumidas)`, "📦");
          }
          const leadChunks = chunksRef.current.get(lead.id) || [];
          const compressedHistory = leadChunks.length > 0 ? buildActiveContext(lead, leadChunks) : compressConversation(lead.mensagens);
          const agentResp = await callSimulatorAI(
            buildAgentSysPrompt(agent, hasNext, enableTransfers, agentResponseLength),
            compressedHistory, "agent"
          );
          if (!simAtivaRef.current) return;
          const addedAgentResp = pushUniqueSimMessage(lead, { role: "agent", content: agentResp, agentName: agent.name, timestamp: Date.now() });
          if (addedAgentResp) setLeads(prev => [...prev]);

          // Detect price print mention → generate actual image
          if (detectsPricePrint(agentResp)) {
            addEvent("#8B5CF6", `📸 ${agent.name} gerando print de preço para ${lead.nome}...`, "🖼️");
            const priceImg = await generatePriceImage(lead);
            if (priceImg && simAtivaRef.current) {
              lead.mensagens.push({ role: "agent", content: "📋 Orçamento", agentName: agent.name, timestamp: Date.now(), imageUrl: priceImg });
              setLeads(prev => [...prev]);
              addEvent("#10B981", `✅ Print de preço enviado para ${lead.nome}`, "🖼️");
            }
          }

          // Evaluate agent response
          evalCounter++;
          if (enableEvaluation && evalCounter % evalEvery === 0) {
            const avaliacao = await avaliarRespostaAgente(agentResp, lead);
            if (!simAtivaRef.current) return;
            const volatilityMult = emotionalVolatility / 50;
            const adjustedNota = Math.round(avaliacao.nota * volatilityMult + (50 * (1 - volatilityMult / 2)));
            const updatedLead = atualizarEstadoEmocional(lead, adjustedNota, avaliacao.reacao, avaliacao.sentimento);
            Object.assign(lead, updatedLead);
            const curve = (lead as any)._patienceCurve || "linear";
            const abSens = ((lead as any)._abandonSensitivity ?? 50) / 100;
            if (curve === "exponential") {
              const ratio = 1 - (lead.pacienciaRestante / initialPatience);
              const extraDrain = Math.floor(ratio * ratio * 15 * (1 + abSens));
              lead.pacienciaRestante = Math.max(0, lead.pacienciaRestante - extraDrain);
            } else if (curve === "sudden") {
              if (lead.pacienciaRestante < 40 && adjustedNota < 60) {
                lead.pacienciaRestante = Math.max(0, lead.pacienciaRestante - Math.floor(25 * (1 + abSens)));
              }
            } else {
              const drain = Math.floor(5 * (1 + abSens));
              if (adjustedNota < 50) lead.pacienciaRestante = Math.max(0, lead.pacienciaRestante - drain);
            }
            lead.scoreHumanizacao = lead.scoreHumanizacao > 0 ? Math.round((lead.scoreHumanizacao + avaliacao.humanizacao) / 2) : avaliacao.humanizacao;
            lead.scoreEficacia = lead.scoreEficacia > 0 ? Math.round((lead.scoreEficacia + avaliacao.eficaciaComercial) / 2) : avaliacao.eficaciaComercial;
            lead.scoreTecnica = lead.scoreTecnica > 0 ? Math.round((lead.scoreTecnica + avaliacao.qualidadeTecnica) / 2) : avaliacao.qualidadeTecnica;
            setLeads(prev => [...prev]);

            if (avaliacao.nota < 40) {
              addEvent("#F59E0B", `${lead.nome}: ${avaliacao.reacao} (H:${avaliacao.humanizacao} E:${avaliacao.eficaciaComercial} T:${avaliacao.qualidadeTecnica})`, "😤");
            } else if (avaliacao.nota >= 80) {
              addEvent("#10B981", `${lead.nome}: ${avaliacao.reacao} (H:${avaliacao.humanizacao} E:${avaliacao.eficaciaComercial} T:${avaliacao.qualidadeTecnica})`, "😊");
            }

            if (devePerdeLead(lead)) {
              if (enableLossNarrative) {
                const lossMsg = await gerarMensagemPerda(lead);
                pushUniqueSimMessage(lead, { role: "client", content: lossMsg, timestamp: Date.now() });
                lead.motivoPerda = lossMsg;
              } else {
                lead.motivoPerda = `Paciência esgotada (${lead.pacienciaRestante})`;
              }
              lead.status = "perdeu"; lead.resultadoFinal = "perdeu"; lead.etapaPerda = lead.etapaAtual;
              setLeads(prev => [...prev]);
              addEvent("#EF4444", `❌ ${lead.nome} DESISTIU em ${lead.etapaAtual}: "${(lead.motivoPerda || "").slice(0, 60)}..."`, "💔");
              forceLoss = true;
              break;
            }
          }

          // Handle transfer
          if (enableTransfers && hasNext && agentResp.includes("[TRANSFERIR]")) {
            agentIdx++;
            const nextAgent = funnelAgents[agentIdx % funnelAgents.length];
            addEvent("#06B6D4", `${agent.name} → ${nextAgent.name}`, "🔄");
            if (lead.informacoesPendentes.length > 0) {
              const revealed = lead.informacoesPendentes.shift()!;
              lead.informacoesReveladas.push(revealed);
            }
          }

          if (speedDelay > 0) await new Promise(r => setTimeout(r, speedDelay));
          if (r >= rounds - 1 || abortRef.current) break;

          // Check for dynamic objection
          const turno = r + 1;
          if (deveInserirObjecao(lead, lead.etapaAtual, turno)) {
            const objecao = await gerarObjecao(lead, agentResp);
            if (!simAtivaRef.current) return;
            const addedObjection = pushUniqueSimMessage(lead, { role: "client", content: objecao, timestamp: Date.now() });
            if (lead.objecoesPendentes.length > 0) {
              lead.objecoesLancadas.push(lead.objecoesPendentes.shift()!);
            }
            if (addedObjection) {
              setLeads(prev => [...prev]);
              addEvent("#F59E0B", `⚠️ Objeção de ${lead.nome}: "${objecao.slice(0, 50)}..."`, "🛡️");
            }

            const objCompressed = compressConversation(lead.mensagens);
            const objResp = await callSimulatorAI(
              buildAgentSysPrompt(agent, false, enableTransfers, agentResponseLength),
              objCompressed, "agent"
            );
            if (!simAtivaRef.current) return;
            const addedObjectionResp = pushUniqueSimMessage(lead, { role: "agent", content: objResp, agentName: agent.name, timestamp: Date.now() });
            if (addedObjectionResp) setLeads(prev => [...prev]);
            continue;
          }

          // Generate contextual lead response via AI
          const clientResp = await generateLeadMsg(lead, agentResp, false, { avoidRecentDuplicates: true });
          if (!simAtivaRef.current) return;
          const addedClientResp = pushUniqueSimMessage(lead, { role: "client", content: clientResp, timestamp: Date.now() });
          if (addedClientResp) setLeads(prev => [...prev]);

          // Multi-message behavior
          if (enableMultiMsg && Math.random() < lead.probabilidadeMultiMensagem) {
            const extraMsg = await generateLeadMsg(lead, agentResp, false, { avoidRecentDuplicates: true });
            if (simAtivaRef.current) {
              const addedExtraMsg = pushUniqueSimMessage(lead, { role: "client", content: extraMsg, timestamp: Date.now() }, { windowSize: 8 });
              if (addedExtraMsg) {
                setLeads(prev => [...prev]);
                addEvent(lead.perfil.cor, `${lead.nome} enviou múltiplas msgs`, "💬💬");
              }
            }
          }

          // Follow-up pressure
          const fup = (lead as any)._followUpPressure ?? 30;
          if (fup > 0 && Math.random() * 100 < fup) {
            const followUps = ["??", "e aí?", "alguém?", "oi?", "tô aguardando", "???", "🙄", "tem alguém aí?", "vou procurar outra agência..."];
            const fMsg = followUps[Math.floor(Math.random() * followUps.length)];
            const addedFollowUp = pushUniqueSimMessage(lead, { role: "client", content: fMsg, timestamp: Date.now() }, { windowSize: 10 });
            if (addedFollowUp) {
              setLeads(prev => [...prev]);
              addEvent("#F59E0B", `${lead.nome}: follow-up "${fMsg}"`, "⏰");
            }
          }

          // Per-conversation time limit
          const maxConvMs = ((lead as any)._maxConvMinutes ?? 0) * 60 * 1000;
          if (maxConvMs > 0 && lead.mensagens.length >= 2) {
            const convDuration = Date.now() - lead.mensagens[0].timestamp;
            if (convDuration >= maxConvMs) {
              addEvent("#8B5CF6", `${lead.nome}: limite de ${(lead as any)._maxConvMinutes}min por conversa`, "⏱️");
              break;
            }
          }

          if (speedDelay > 0) await new Promise(r => setTimeout(r, Math.max(100, speedDelay / 2)));
        }

        // Resolve lead
        if (!forceLoss && lead.status === "ativo") {
          const willClose = conversionOverride !== null
            ? Math.random() * 100 < conversionOverride
            : lead.ticket > 0;

          if (willClose) {
            lead.status = "fechou"; lead.resultadoFinal = "fechou"; lead.etapaAtual = "fechamento";
            addEvent("#EAB308", `🎉 ${lead.nome} FECHOU · R$${(lead.ticket / 1000).toFixed(0)}k · ${lead.perfil.label}`, "🏆");
          } else {
            if (enableLossNarrative) {
              const lossMsg = await gerarMensagemPerda(lead);
                pushUniqueSimMessage(lead, { role: "client", content: lossMsg, timestamp: Date.now() });
              lead.motivoPerda = lossMsg;
            } else {
              lead.motivoPerda = "Não converteu";
            }
            lead.status = "perdeu"; lead.resultadoFinal = "perdeu"; lead.etapaPerda = lead.etapaAtual;
            addEvent("#EF4444", `${lead.nome} perdido em ${lead.etapaAtual} · ${lead.perfil.label}`, "📉");
          }
          setLeads(prev => [...prev]);
          // Persist final lead state to DB
          simPersistence.updateLeadState(lead);
        }
      } catch (err) {
        console.error("Lead sim error:", err);
        lead.status = "perdeu"; lead.motivoPerda = "Erro de sistema";
        setLeads(prev => [...prev]);
        simPersistence.updateLeadState(lead);
      }
    };

    // ===== Dispatch leads based on mode =====
    if (dispatchMode === "simultaneous") {
      // All leads start at once — parallel processing
      addEvent("#8B5CF6", `⚡ Disparo simultâneo: ${allLeads.length} leads ao mesmo tempo!`, "🚀");
      const batchSize = Math.min(allLeads.length, 10); // API rate limit protection
      for (let i = 0; i < allLeads.length; i += batchSize) {
        if (!simAtivaRef.current || abortRef.current || isDurationExceeded()) break;
        const batch = allLeads.slice(i, i + batchSize);
        await Promise.all(batch.map(lead => simulateLead(lead)));
        if (i + batchSize < allLeads.length) {
          await new Promise(r => setTimeout(r, 500)); // Small delay between batches for rate limiting
        }
      }
    } else if (dispatchMode === "wave") {
      // Wave mode — process in configurable parallel batches
      const waveSize = Math.max(2, parallelLeads);
      let waveNum = 1;
      for (let i = 0; i < allLeads.length; i += waveSize) {
        if (!simAtivaRef.current || abortRef.current || isDurationExceeded()) break;
        const batch = allLeads.slice(i, i + waveSize);
        addEvent("#06B6D4", `🌊 Onda ${waveNum}: ${batch.length} leads`, "🌊");
        await Promise.all(batch.map(lead => simulateLead(lead)));
        waveNum++;
        if (i + waveSize < allLeads.length && intervalSec > 0) {
          await new Promise(r => setTimeout(r, intervalSec * 1000));
        }
      }
    } else {
      // Sequential — original behavior
      for (let i = 0; i < allLeads.length; i++) {
        if (!simAtivaRef.current || abortRef.current || isDurationExceeded()) break;
        await simulateLead(allLeads[i]);
        if (i < allLeads.length - 1 && !abortRef.current && intervalSec > 0) {
          await new Promise(r => setTimeout(r, intervalSec * 1000));
        }
      }
    }

    if (timerRef.current) clearInterval(timerRef.current);
    setRunning(false);
    setPhase("report");
    const elapsed = Math.round((Date.now() - simStartTime) / 1000);
    const wasTimeout = elapsed >= duration;

    // Finalize DB persistence
    const finalClosed = allLeads.filter(l => l.status === "fechou");
    const finalLost = allLeads.filter(l => l.status === "perdeu");
    const finalRevenue = finalClosed.reduce((s, l) => s + l.ticket, 0);
    const finalConv = allLeads.length > 0 ? Math.round((finalClosed.length / allLeads.length) * 100) : 0;
    simPersistence.finishSimulation({
      leadsClosed: finalClosed.length,
      leadsLost: finalLost.length,
      conversionRate: finalConv,
      totalRevenue: finalRevenue,
      scoreGeral: 0,
      durationSeconds: elapsed,
    });

    toast({ title: wasTimeout ? "Simulação encerrada por tempo!" : "Simulação concluída!", description: `${allLeads.length} leads processados em ${formatTime(elapsed)}` });
  }, [numLeads, msgsPerLead, intervalSec, duration, parallelLeads, dispatchMode, selectedProfiles, profileMode, selectedDestinos, selectedBudgets, selectedCanais, selectedGrupos, conversionOverride, objectionDensity, speed, funnelMode, customFunnelAgents, enableEvaluation, enableMultiMsg, enableTransfers, emotionalVolatility, agentResponseLength, enableLossNarrative, evalFrequency, initialPatience, leadPatienceCurve, abandonmentSensitivity, leadToneFormality, leadTypingStyle, leadFollowUpPressure, infoRevealSpeed, enableLeadTypos, enableLeadEmojis, enableLeadAudioRef, leadConversationGoal, maxConversationMinutes, leadReengagementChance, leadCustomInstructions, toast, simPersistence]);

  const stopSimulation = () => stopSimulationRef.current();

  // Generate debrief — V2 com 12 critérios
  const generateDebrief = useCallback(async () => {
    setDebriefLoading(true);
    try {
      const sampleConvos = leads.slice(0, 8).map(l => ({
        name: l.nome, profile: l.perfil.label, destino: l.destino, status: l.status,
        sentimento: l.sentimentoScore, emocao: l.estadoEmocional, motivoPerda: l.motivoPerda,
        objecoes: l.objecoesLancadas, etapaPerda: l.etapaPerda,
        dimensoes: { h: l.scoreHumanizacao, e: l.scoreEficacia, t: l.scoreTecnica },
        msgs: l.mensagens.slice(0, 12).map(m => `${m.role}: ${m.content.slice(0, 120)}`).join("\n"),
      }));

      const pResumo = PERFIS_INTELIGENTES.map(p => {
        const pLeads = leads.filter(l => l.perfil.tipo === p.tipo);
        const pClosed = pLeads.filter(l => l.status === "fechou");
        return pLeads.length > 0 ? `${p.label}: ${pClosed.length}/${pLeads.length}` : null;
      }).filter(Boolean).join(" | ");

      const topObjs = leads.flatMap(l => l.objecoesLancadas).reduce((acc, o) => { acc[o] = (acc[o] || 0) + 1; return acc; }, {} as Record<string, number>);
      const topObjsStr = Object.entries(topObjs).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => `"${k}" (${v}x)`).join(", ");

      // Collect unique agent names used
      const agentesUsados = [...new Set(leads.flatMap(l => l.mensagens.filter(m => m.agentName).map(m => m.agentName!)))];

      const prompt = buildDebriefV2Prompt({
        totalLeads: leads.length,
        fechados: closedLeads.length,
        perdidos: lostLeads.length,
        conversionRate,
        receita: totalReceita,
        ticketMedio,
        totalObjecoes,
        totalContornadas,
        performancePorPerfil: pResumo,
        topObjecoes: topObjsStr,
        perdasMotivadas: lostLeads.slice(0, 5).map(l => `${l.perfil.label} em ${l.etapaPerda}: ${l.motivoPerda?.slice(0, 80)}`).join(" | "),
        amostraConversas: JSON.stringify(sampleConvos),
        agentesUsados,
      });

      const resp = await callSimulatorAI(SYSTEM_DEBRIEF_V2, [{ role: "user", content: prompt }], "debrief");
      const jsonMatch = resp.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);

        // Parse dimensões
        const parseDimensao = (dim: any, pesoKey: string): DimensaoScore => {
          if (!dim) return { score: 50, peso_agente: 35, criterios: {} };
          const criterios: Record<string, CriterioScore> = {};
          if (dim.criterios) {
            Object.entries(dim.criterios).forEach(([k, v]: [string, any]) => {
              criterios[k] = { score: v?.score ?? 50, nivel: v?.nivel ?? "REGULAR", evidencia: v?.evidencia ?? "" };
            });
          }
          return { score: dim.score ?? 50, peso_agente: dim.peso_agente ?? 35, criterios };
        };

        const dimensoes: DebriefDimensoes = {
          humanizacao: parseDimensao(data.dimensoes?.humanizacao, "humanizacao"),
          eficaciaComercial: parseDimensao(data.dimensoes?.eficaciaComercial, "eficaciaComercial"),
          qualidadeTecnica: parseDimensao(data.dimensoes?.qualidadeTecnica, "qualidadeTecnica"),
        };

        const debriefResult: DebriefData = {
          scoreGeral: data.scoreGeral || 0,
          resumoExecutivo: data.resumoExecutivo || data.resumo_executivo || "",
          fraseNathAI: data.fraseNathAI || "",
          pontosFortes: data.pontosFortes || data.pontos_fortes || [],
          dimensoes,
          melhorias: (data.melhorias || []).map((m: any, i: number) => ({
            id: `imp-${Date.now()}-${i}`,
            titulo: m.titulo || "",
            desc: m.desc || m.descricao || "",
            impacto: m.impacto || "",
            agente: m.agente || "",
            prioridade: m.prioridade || "media",
            tipo: (m.tipo || "instrucao_prompt") as ImprovementType,
            conteudoSugerido: m.conteudoSugerido || "",
            fonte: `debrief_criterio_${m.criterio || "geral"}`,
            status: "pending" as const,
            deepAnalysis: null,
            editedContent: undefined,
          })),
          lacunasConhecimento: data.lacunasConhecimento || [],
          insightsCliente: data.insightsCliente || [],
        };
        setDebrief(debriefResult);

        // Save to simulation history with dimensions
        saveSimHistory({
          id: "wr_" + Date.now(),
          date: new Date().toISOString(),
          scoreGeral: debriefResult.scoreGeral,
          totalLeads: leads.length,
          fechados: closedLeads.length,
          perdidos: lostLeads.length,
          conversao: conversionRate,
          melhorias_aprovadas: [],
          dimensoes: {
            humanizacao: dimensoes.humanizacao.score,
            eficaciaComercial: dimensoes.eficaciaComercial.score,
            qualidadeTecnica: dimensoes.qualidadeTecnica.score,
          },
        });

        // Save to evaluation history
        agentesUsados.forEach(agenteName => {
          saveHistoricoAvaliacao({
            id: `eval_${Date.now()}_${agenteName}`,
            timestamp: Date.now(),
            agenteId: agenteName.toLowerCase(),
            agenteName,
            scoreGeral: debriefResult.scoreGeral,
            dimensoes: {
              humanizacao: dimensoes.humanizacao.score,
              eficaciaComercial: dimensoes.eficaciaComercial.score,
              qualidadeTecnica: dimensoes.qualidadeTecnica.score,
            },
            perfilLead: leads.map(l => l.perfil.label).join(", "),
            fonteSimulacao: "war_room_auto",
          });
        });
      }
    } catch (err) {
      console.error("Debrief generation error:", err);
      toast({ title: "Erro ao gerar debrief IA", description: "Tente novamente clicando em 'Debrief IA'.", variant: "destructive" });
    }
    finally { setDebriefLoading(false); }
  }, [leads, closedLeads, lostLeads, totalReceita, totalObjecoes, totalContornadas, avgSentimento, conversionRate, ticketMedio, toast]);

  useEffect(() => { if (phase === "report" && !debrief && !debriefLoading) generateDebrief(); }, [phase, generateDebrief]);

  // Deep analysis for a single improvement
  const runDeepAnalysis = useCallback(async (improvementId: string) => {
    if (!debrief) return;
    const m = debrief.melhorias.find(x => x.id === improvementId);
    if (!m) return;
    setDebrief(prev => prev ? { ...prev, melhorias: prev.melhorias.map(x => x.id === improvementId ? { ...x, status: "analyzing" as const } : x) } : prev);
    try {
      const agent = AGENTS_V4.find(a => a.name.toLowerCase().includes(m.agente.toLowerCase()));
      const prompt = `Você é NATH.AI. Analise esta melhoria com profundidade máxima.
Tom: consultora sênior. Evidências primeiro, depois recomendação.
Retorne SOMENTE JSON.

Melhoria: ${m.titulo}
Descrição: ${m.desc}
Agente afetado: ${m.agente} (${agent?.role || "agente"})
Tipo de implementação: ${m.tipo}
Impacto estimado: ${m.impacto}
Prioridade: ${m.prioridade}
Conteúdo sugerido: ${m.conteudoSugerido?.slice(0, 200)}

Retorne JSON:
{
  "analiseCompleta": "3-5 parágrafos com problema, causa raiz, solução, evidências",
  "linhaRaciocinio": ["passo 1", "passo 2", "passo 3", "conclusão"],
  "impactoNumeros": {
    "conversao": "ex: +12% taxa com Pechincheiro",
    "receita": "ex: +R$1.800/mês",
    "satisfacao": "ex: NPS +0.3 em 60 dias",
    "eficiencia": "ex: -2 turnos por conversa"
  },
  "psicologiaCliente": "como a melhoria afeta a percepção do cliente",
  "riscosNaoImplementar": "o que acontece se ignorar",
  "recomendacao": "APROVAR|AVALIAR|REJEITAR",
  "confianca": 0-100
}`;
      const resp = await callSimulatorAI("Voce e NATH.AI analista senior. Retorne SOMENTE JSON.", [{ role: "user", content: prompt }], "deep");
      const jsonMatch = resp.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysis: DeepAnalysis = JSON.parse(jsonMatch[0]);
        setDebrief(prev => prev ? { ...prev, melhorias: prev.melhorias.map(x => x.id === improvementId ? { ...x, status: "pending" as const, deepAnalysis: analysis } : x) } : prev);
      }
    } catch {
      setDebrief(prev => prev ? { ...prev, melhorias: prev.melhorias.map(x => x.id === improvementId ? { ...x, status: "pending" as const } : x) } : prev);
      toast({ title: "Erro na análise profunda", variant: "destructive" });
    }
  }, [debrief, toast]);

  const handleImprovement = async (id: string, action: "approved" | "rejected", reason?: string) => {
    if (!debrief) return;
    const m = debrief.melhorias.find(x => x.id === id);
    if (!m) return;
    if (action === "approved") {
      await implementImprovement(m);
    }
    setDebrief({ ...debrief, melhorias: debrief.melhorias.map(x => x.id === id ? { ...x, status: action, rejectReason: reason } : x) });
    toast({ title: action === "approved" ? "✅ Melhoria aprovada e implementada" : "Melhoria rejeitada", description: action === "approved" ? `Salva em ${TIPO_COLORS[m.tipo].label} → ${m.agente}` : reason || "" });
  };

  const approveAll = async () => {
    if (!debrief) return;
    const pending = debrief.melhorias.filter(m => m.status === "pending");
    for (const m of pending) { await implementImprovement(m); }
    setDebrief({ ...debrief, melhorias: debrief.melhorias.map(m => ({ ...m, status: "approved" as const })) });
    toast({ title: `✅ ${pending.length} melhorias aprovadas e implementadas` });
  };

  const updateImprovementContent = (id: string, content: string) => {
    if (!debrief) return;
    setDebrief({ ...debrief, melhorias: debrief.melhorias.map(m => m.id === id ? { ...m, editedContent: content } : m) });
  };

  const convertInsightToImprovement = (insight: string) => {
    if (!debrief) return;
    const newImp: Improvement = {
      id: `imp-insight-${Date.now()}`, titulo: insight.slice(0, 60),
      desc: insight, impacto: "A ser avaliado", agente: "NATH.AI",
      prioridade: "media", status: "pending", tipo: "instrucao_prompt",
      conteudoSugerido: "", fonte: "insight_convertido",
    };
    setDebrief({ ...debrief, melhorias: [...debrief.melhorias, newImp] });
    toast({ title: "Insight convertido em melhoria pendente" });
  };

  const convertLacunaToKB = (lacuna: string) => {
    if (!debrief) return;
    const newImp: Improvement = {
      id: `imp-kb-${Date.now()}`, titulo: `KB: ${lacuna.slice(0, 50)}`,
      desc: lacuna, impacto: "Preencher lacuna de conhecimento", agente: "DANTE",
      prioridade: "alta", status: "pending", tipo: "conhecimento_kb",
      conteudoSugerido: "", fonte: "lacuna_convertida",
    };
    setDebrief({ ...debrief, melhorias: [...debrief.melhorias, newImp] });
    toast({ title: "Lacuna convertida em documento KB pendente" });
  };

  const simHistory: SimHistoryEntry[] = loadJson(STORAGE_KEYS.sim_history);

  // Sentiment color helper
  const sentimentColor = (s: number) => s >= 70 ? "#10B981" : s >= 40 ? "#F59E0B" : "#EF4444";
  const sentimentLabel = (s: number) => s >= 80 ? "Empolgado" : s >= 60 ? "Satisfeito" : s >= 40 ? "Neutro" : s >= 20 ? "Impaciente" : "Desistindo";

  // ===== EXPORT FUNCTIONS =====
  const exportConversations = useCallback((format: "txt" | "pdf") => {
    if (leads.length === 0) return;

    const timestamp = new Date().toLocaleString("pt-BR");
    const dateFile = new Date().toISOString().slice(0, 10);

    if (format === "txt") {
      const lines: string[] = [];
      lines.push("╔══════════════════════════════════════════════════════════════╗");
      lines.push("║           RELATÓRIO DE SIMULAÇÃO — NATLEVA AI              ║");
      lines.push("╚══════════════════════════════════════════════════════════════╝");
      lines.push("");
      lines.push(`📅 Data: ${timestamp}`);
      lines.push(`⏱️ Duração: ${formatTime(elapsedSeconds)}`);
      lines.push(`👥 Total de leads: ${leads.length}`);
      lines.push(`✅ Fechados: ${closedLeads.length}`);
      lines.push(`❌ Perdidos: ${lostLeads.length}`);
      lines.push(`📊 Conversão: ${conversionRate}%`);
      lines.push(`💰 Receita total: R$${totalReceita.toLocaleString("pt-BR")}`);
      lines.push(`🎯 Ticket médio: R$${ticketMedio.toLocaleString("pt-BR")}`);
      lines.push(`😊 Sentimento médio: ${avgSentimento}/100`);
      lines.push("");
      lines.push("┌──────────────────────────────────────────────────────────────┐");
      lines.push("│  📊 SCORECARD — 3 DIMENSÕES                                │");
      lines.push("├──────────────────────────────────────────────────────────────┤");
      lines.push(`│  ❤️ Humanização:       ${"█".repeat(Math.round(avgHumanizacao / 5))}${"░".repeat(20 - Math.round(avgHumanizacao / 5))}  ${avgHumanizacao}/100  │`);
      lines.push(`│  🎯 Eficácia Comercial: ${"█".repeat(Math.round(avgEficacia / 5))}${"░".repeat(20 - Math.round(avgEficacia / 5))}  ${avgEficacia}/100  │`);
      lines.push(`│  🔧 Qualidade Técnica:  ${"█".repeat(Math.round(avgTecnica / 5))}${"░".repeat(20 - Math.round(avgTecnica / 5))}  ${avgTecnica}/100  │`);
      lines.push("└──────────────────────────────────────────────────────────────┘");
      lines.push("");

      leads.forEach((lead, idx) => {
        lines.push("═".repeat(64));
        lines.push(`📱 CONVERSA ${idx + 1}/${leads.length}`);
        lines.push("═".repeat(64));
        lines.push(`👤 Lead: ${lead.nome}`);
        lines.push(`🧠 Perfil: ${lead.perfil.emoji} ${lead.perfil.label}`);
        lines.push(`✈️ Destino: ${lead.destino}`);
        lines.push(`💰 Orçamento: ${lead.orcamento}`);
        lines.push(`👥 Grupo: ${lead.paxLabel}`);
        lines.push(`📱 Canal: ${lead.origem}`);
        lines.push(`📍 Resultado: ${lead.status === "fechou" ? `✅ FECHOU — R$${(lead.ticket / 1000).toFixed(0)}k` : lead.status === "perdeu" ? `❌ PERDEU em ${lead.etapaPerda || "N/A"}` : "⏳ Ativo"}`);
        if (lead.motivoPerda) lines.push(`💬 Motivo: ${lead.motivoPerda.slice(0, 120)}`);
        lines.push(`❤️ Sentimento final: ${lead.sentimentoScore}/100 (${sentimentLabel(lead.sentimentoScore)})`);
        lines.push(`🔋 Paciência final: ${lead.pacienciaRestante}/100`);
        lines.push("");
        lines.push("─".repeat(50));
        lines.push("  MENSAGENS");
        lines.push("─".repeat(50));
        lines.push("");

        lead.mensagens.forEach(msg => {
          const time = new Date(msg.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
          if (msg.role === "client") {
            lines.push(`  ┌─ 👤 ${lead.nome} · ${time}`);
            lines.push(`  │ ${msg.content}`);
            lines.push(`  └─`);
          } else {
            lines.push(`  ┌─ 🤖 ${msg.agentName || "Agente"} · ${time}`);
            lines.push(`  │ ${msg.content}`);
            lines.push(`  └─`);
          }
          lines.push("");
        });

        if (lead.objecoesLancadas.length > 0) {
          lines.push(`  ⚠️ Objeções: ${lead.objecoesLancadas.join(", ")}`);
          lines.push("");
        }
      });

      lines.push("");
      lines.push("═".repeat(64));
      lines.push("Gerado automaticamente pelo Simulador NatLeva AI");
      lines.push(`${timestamp}`);

      const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `simulacao-natleva-${dateFile}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "📄 Conversa exportada em TXT!" });

    } else if (format === "pdf") {
      // Generate rich HTML and print to PDF
      const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Simulação NatLeva AI — ${dateFile}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', -apple-system, sans-serif; background: #0F172A; color: #E2E8F0; padding: 40px; font-size: 13px; line-height: 1.6; }
  .header { text-align: center; margin-bottom: 40px; padding: 30px; background: linear-gradient(135deg, #0A1628, #1E293B); border-radius: 16px; border: 1px solid rgba(255,255,255,0.06); }
  .header h1 { font-size: 24px; font-weight: 800; letter-spacing: -0.03em; margin-bottom: 4px; background: linear-gradient(135deg, #10B981, #06B6D4); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  .header .subtitle { color: #64748B; font-size: 12px; }
  .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 30px; }
  .stat-card { background: #1E293B; border-radius: 12px; padding: 16px; text-align: center; border: 1px solid rgba(255,255,255,0.04); }
  .stat-value { font-size: 28px; font-weight: 800; }
  .stat-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; color: #64748B; margin-top: 2px; }
  .dimensions { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 30px; }
  .dim-card { background: #1E293B; border-radius: 12px; padding: 16px; border: 1px solid rgba(255,255,255,0.04); }
  .dim-label { font-size: 10px; font-weight: 700; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.08em; }
  .dim-bar { height: 6px; border-radius: 3px; background: rgba(255,255,255,0.06); margin-top: 8px; overflow: hidden; }
  .dim-fill { height: 100%; border-radius: 3px; }
  .dim-score { font-size: 22px; font-weight: 800; margin-top: 6px; }
  .conversation { margin-bottom: 30px; background: #1E293B; border-radius: 16px; overflow: hidden; border: 1px solid rgba(255,255,255,0.04); page-break-inside: avoid; }
  .conv-header { padding: 16px 20px; background: linear-gradient(135deg, rgba(16,185,129,0.06), rgba(6,182,212,0.04)); border-bottom: 1px solid rgba(255,255,255,0.04); display: flex; align-items: center; justify-content: space-between; }
  .conv-header .lead-name { font-size: 15px; font-weight: 700; }
  .conv-header .lead-meta { font-size: 10px; color: #64748B; }
  .conv-result { font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 20px; }
  .conv-result.won { background: rgba(16,185,129,0.12); color: #10B981; }
  .conv-result.lost { background: rgba(239,68,68,0.12); color: #EF4444; }
  .messages { padding: 16px 20px; }
  .msg { margin-bottom: 12px; max-width: 80%; }
  .msg.client { margin-left: auto; }
  .msg.agent { margin-right: auto; }
  .msg-bubble { padding: 10px 14px; border-radius: 12px; font-size: 12px; line-height: 1.5; }
  .msg.client .msg-bubble { background: #065F46; color: #D1FAE5; border-bottom-right-radius: 4px; }
  .msg.agent .msg-bubble { background: #1E293B; color: #E2E8F0; border: 1px solid rgba(255,255,255,0.06); border-bottom-left-radius: 4px; }
  .msg-sender { font-size: 9px; font-weight: 700; margin-bottom: 3px; text-transform: uppercase; letter-spacing: 0.05em; }
  .msg.client .msg-sender { text-align: right; color: #34D399; }
  .msg.agent .msg-sender { color: #60A5FA; }
  .msg-time { font-size: 8px; color: #475569; margin-top: 2px; }
  .msg.client .msg-time { text-align: right; }
  .conv-footer { padding: 10px 20px; background: rgba(0,0,0,0.2); font-size: 10px; color: #64748B; display: flex; gap: 16px; flex-wrap: wrap; }
  .conv-footer span { display: flex; align-items: center; gap: 4px; }
  .footer { text-align: center; margin-top: 40px; color: #475569; font-size: 10px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.04); }
  @media print { body { background: #0F172A !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
  <div class="header">
    <h1>✨ Simulação NatLeva AI</h1>
    <div class="subtitle">${timestamp} · Duração: ${formatTime(elapsedSeconds)}</div>
  </div>

  <div class="stats-grid">
    <div class="stat-card"><div class="stat-value" style="color:#3B82F6">${leads.length}</div><div class="stat-label">Leads</div></div>
    <div class="stat-card"><div class="stat-value" style="color:#10B981">${closedLeads.length}</div><div class="stat-label">Fechados</div></div>
    <div class="stat-card"><div class="stat-value" style="color:#F59E0B">${conversionRate}%</div><div class="stat-label">Conversão</div></div>
    <div class="stat-card"><div class="stat-value" style="color:#8B5CF6">R$${(totalReceita / 1000).toFixed(0)}k</div><div class="stat-label">Receita</div></div>
  </div>

  <div class="dimensions">
    <div class="dim-card"><div class="dim-label">❤️ Humanização</div><div class="dim-score" style="color:#EC4899">${avgHumanizacao}</div><div class="dim-bar"><div class="dim-fill" style="width:${avgHumanizacao}%;background:#EC4899"></div></div></div>
    <div class="dim-card"><div class="dim-label">🎯 Eficácia</div><div class="dim-score" style="color:#F59E0B">${avgEficacia}</div><div class="dim-bar"><div class="dim-fill" style="width:${avgEficacia}%;background:#F59E0B"></div></div></div>
    <div class="dim-card"><div class="dim-label">🔧 Técnica</div><div class="dim-score" style="color:#3B82F6">${avgTecnica}</div><div class="dim-bar"><div class="dim-fill" style="width:${avgTecnica}%;background:#3B82F6"></div></div></div>
  </div>

  ${leads.map((lead, idx) => `
  <div class="conversation">
    <div class="conv-header">
      <div>
        <div class="lead-name">${lead.perfil.emoji} ${lead.nome}</div>
        <div class="lead-meta">${lead.perfil.label} · ${lead.destino} · ${lead.orcamento} · ${lead.paxLabel} · via ${lead.origem}</div>
      </div>
      <div class="conv-result ${lead.status === "fechou" ? "won" : "lost"}">
        ${lead.status === "fechou" ? `✅ Fechou R$${(lead.ticket / 1000).toFixed(0)}k` : lead.status === "perdeu" ? `❌ Perdeu (${lead.etapaPerda || "N/A"})` : "⏳ Ativo"}
      </div>
    </div>
    <div class="messages">
      ${lead.mensagens.map(msg => {
        const time = new Date(msg.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
        return `<div class="msg ${msg.role === "client" ? "client" : "agent"}">
          <div class="msg-sender">${msg.role === "client" ? lead.nome : msg.agentName || "Agente"}</div>
          <div class="msg-bubble">${msg.content.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
          <div class="msg-time">${time}</div>
        </div>`;
      }).join("")}
    </div>
    <div class="conv-footer">
      <span>❤️ Sentimento: ${lead.sentimentoScore}/100</span>
      <span>🔋 Paciência: ${lead.pacienciaRestante}/100</span>
      <span>📊 H:${lead.scoreHumanizacao} E:${lead.scoreEficacia} T:${lead.scoreTecnica}</span>
      ${lead.objecoesLancadas.length > 0 ? `<span>⚠️ Objeções: ${lead.objecoesLancadas.join(", ")}</span>` : ""}
      ${lead.motivoPerda ? `<span>💬 ${lead.motivoPerda.slice(0, 80)}...</span>` : ""}
    </div>
  </div>`).join("")}

  <div class="footer">
    Gerado pelo Simulador NatLeva AI · ${timestamp}
  </div>
</body>
</html>`;

      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const printWin = window.open(url, "_blank");
      if (printWin) {
        printWin.onload = () => {
          setTimeout(() => {
            printWin.print();
          }, 800);
        };
      }
      URL.revokeObjectURL(url);
      toast({ title: "🖨️ PDF aberto para impressão!" });
    }
  }, [leads, closedLeads, lostLeads, elapsedSeconds, conversionRate, totalReceita, ticketMedio, avgSentimento, avgHumanizacao, avgEficacia, avgTecnica, toast]);

  const CONFIG_TABS = [
    { id: "volume" as const, label: "Volume & Tempo", icon: BarChart3, color: "#3B82F6", summary: `${numLeads} leads · ${msgsPerLead} msgs · ${duration >= 3600 ? Math.floor(duration / 3600) + "h" : formatTime(duration)} · ${dispatchMode === "simultaneous" ? "simultâneo" : dispatchMode === "wave" ? "ondas" : "seq."}` },
    { id: "perfis" as const, label: "Perfis", icon: User, color: "#EC4899", summary: `${selectedProfiles.length || 8} perfis ativos` },
    { id: "cenario" as const, label: "Cenário", icon: MapPin, color: "#06B6D4", summary: `${selectedDestinos.length || DESTINOS_LEAD.length} destinos` },
    { id: "lead_behavior" as const, label: "Calibração Lead", icon: Heart, color: "#EF4444", summary: `Paciência ${initialPatience}% · ${leadPatienceCurve} · ${abandonmentSensitivity}% sensib.` },
    { id: "comportamento" as const, label: "Agentes & Funil", icon: Users, color: "#8B5CF6", summary: `${funnelMode === "full" ? "Todos (pipeline)" : funnelMode === "comercial" ? "Squad Comercial" : funnelMode === "individual" ? (customFunnelAgents[0] ? AGENTS_V4.find(a => a.id === customFunnelAgents[0])?.name || "1 agente" : "Nenhum") : `${customFunnelAgents.length} agentes`} · ${SPEED_OPTIONS.find(s => s.id === speed)?.label}` },
    { id: "avancado" as const, label: "Motor IA", icon: Brain, color: "#F59E0B", summary: `${enableEvaluation ? "Aval." : "—"} ${enableTransfers ? "Transf." : "—"} ${agentResponseLength}` },
    { id: "presets" as const, label: "Presets", icon: BookOpen, color: "#10B981", summary: `${presets.length} salvo${presets.length !== 1 ? "s" : ""}` },
  ];

  // ===== RENDER: CONFIG =====
  if (phase === "config") {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-3 duration-500" style={{ maxWidth: 1100 }}>
        {/* Mobile: horizontal scroll tabs. Desktop: 2-column */}
        <div className={cn("flex", isMobile ? "flex-col gap-3" : "gap-5")} style={{ minHeight: isMobile ? undefined : 520 }}>
          {/* Tab Navigation */}
          <div className={cn(isMobile ? "flex gap-2 overflow-x-auto pb-2 scrollbar-hide" : "w-[220px] shrink-0 space-y-1.5")}>
            {CONFIG_TABS.map((tab, i) => {
              const active = configTab === tab.id;
              const Icon = tab.icon;
              return (
                <button key={tab.id} onClick={() => setConfigTab(tab.id)}
                  className={cn(
                    "text-left rounded-xl transition-all duration-300 relative group",
                    isMobile ? "shrink-0 px-3 py-2.5 min-w-[100px]" : "w-full px-4 py-3.5"
                  )}
                  style={{
                    background: active ? `linear-gradient(135deg, ${tab.color}18, ${tab.color}0A)` : "rgba(255,255,255,0.02)",
                    border: `1px solid ${active ? `${tab.color}40` : "rgba(255,255,255,0.08)"}`,
                  }}>
                  {!isMobile && active && <div className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full" style={{ background: tab.color }} />}
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className={cn("rounded-lg flex items-center justify-center transition-all", isMobile ? "w-6 h-6" : "w-8 h-8")} style={{
                      background: active ? `${tab.color}20` : "rgba(255,255,255,0.05)",
                      border: `1px solid ${active ? `${tab.color}35` : "rgba(255,255,255,0.08)"}`,
                    }}>
                      <Icon className={isMobile ? "w-3 h-3" : "w-4 h-4"} style={{ color: active ? tab.color : "#94A3B8" }} />
                    </div>
                    <div>
                      <p className={cn("font-bold", isMobile ? "text-[15px]" : "text-[15px]")} style={{ color: active ? "#F8FAFC" : "#CBD5E1" }}>{tab.label}</p>
                      {!isMobile && <p className="text-[15px] mt-0.5" style={{ color: active ? tab.color : "#94A3B8" }}>{tab.summary}</p>}
                    </div>
                  </div>
                  {/* Step number — desktop only */}
                  {!isMobile && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-[15px] font-bold"
                      style={{ background: active ? `${tab.color}20` : "rgba(255,255,255,0.05)", color: active ? tab.color : "#94A3B8" }}>
                      {i + 1}
                    </div>
                  )}
                </button>
              );
            })}

            {/* Config Summary Card — desktop only */}
            {!isMobile && (
            <div className="mt-4 rounded-xl p-4 space-y-2" style={{
              background: "linear-gradient(135deg, rgba(16,185,129,0.04), rgba(6,182,212,0.04))",
              border: "1px solid rgba(16,185,129,0.1)",
            }}>
              <p className="text-[15px] uppercase tracking-[0.12em] font-bold" style={{ color: "#10B981" }}>Resumo da Config</p>
              <div className="space-y-1.5">
                {[
                  { label: "Leads", value: `${numLeads}`, color: "#3B82F6" },
                  { label: "Msgs/lead", value: `${msgsPerLead}`, color: "#10B981" },
                  { label: "Duração", value: formatTime(duration), color: "#8B5CF6" },
                  { label: "Objeções", value: `${objectionDensity}%`, color: "#F59E0B" },
                  { label: "Perfis", value: `${selectedProfiles.length || 8}`, color: "#EC4899" },
                  { label: "Paciência", value: `${initialPatience}%`, color: "#EF4444" },
                  { label: "Abandono", value: `${abandonmentSensitivity}%`, color: "#EF4444" },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between">
                    <span className="text-[15px]" style={{ color: "#94A3B8" }}>{item.label}</span>
                    <span className="text-[15px] font-bold tabular-nums" style={{ color: item.color }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
            )}
          </div>

          {/* RIGHT: Content Area */}
          <div className="flex-1 rounded-2xl overflow-hidden relative" style={{
            background: "linear-gradient(135deg, rgba(13,18,32,0.9), rgba(13,18,32,0.7))",
            border: "1px solid rgba(255,255,255,0.06)",
            backdropFilter: "blur(8px)",
          }}>
            {/* Active tab accent line */}
            <div className="h-[2px]" style={{ background: `linear-gradient(90deg, transparent, ${CONFIG_TABS.find(t => t.id === configTab)?.color || "#10B981"}, transparent)` }} />

            <div className={cn("overflow-y-auto", isMobile ? "p-4" : "p-6")} style={{ maxHeight: isMobile ? "60vh" : 500 }}>
              {/* ===== VOLUME TAB ===== */}
              {configTab === "volume" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-3 duration-300">
                  <div className="flex items-center gap-3 mb-2">
                    <BarChart3 className="w-5 h-5" style={{ color: "#3B82F6" }} />
                    <div>
                      <h3 className="text-[15px] font-bold" style={{ color: "#F1F5F9" }}>Volume & Tempo</h3>
                      <p className="text-[15px]" style={{ color: "#94A3B8" }}>Configure a escala e duração do teste de estresse</p>
                    </div>
                  </div>
                  <div className={cn("gap-6", isMobile ? "grid grid-cols-1" : "grid grid-cols-2")}>
                    {[
                      { label: "Leads totais", value: numLeads, setter: setNumLeads, min: 1, max: 500, step: 1, color: "#3B82F6", desc: "Quantidade de leads na simulação (até 500)" },
                      { label: "Mensagens por lead", value: msgsPerLead, setter: setMsgsPerLead, min: 4, max: 500, step: 2, color: "#10B981", desc: "Rodadas de conversa (até 500 — compressão automática)" },
                      { label: "Intervalo entre leads", value: intervalSec, setter: setIntervalSec, min: 0, max: 60, step: 1, color: "#F59E0B", desc: "Segundos entre entrada de cada lead (0 = simultâneo)", suffix: "s" },
                      { label: "Duração máxima", value: duration, setter: setDuration, min: 30, max: 86400, step: 30, color: "#8B5CF6", desc: "Tempo limite (até 24h)", format: true },
                    ].map(s => (
                      <div key={s.label} className="rounded-xl p-5" style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)" }}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[15px] font-semibold" style={{ color: "#E2E8F0" }}>{s.label}</span>
                          <span className="text-[22px] font-extrabold tabular-nums" style={{ color: s.color, textShadow: `0 0 20px ${s.color}20` }}>
                            {s.format ? (s.value >= 3600 ? `${Math.floor(s.value / 3600)}h${Math.floor((s.value % 3600) / 60)}m` : formatTime(s.value)) : s.value}{s.suffix || ""}
                          </span>
                        </div>
                        <p className="text-[15px] mb-3" style={{ color: "#94A3B8" }}>{s.desc}</p>
                        <Slider min={s.min} max={s.max} step={s.step} value={[s.value]} onValueChange={v => s.setter(v[0])} />
                      </div>
                    ))}
                  </div>

                  {/* Dispatch Mode */}
                  <div className="rounded-xl p-4 mt-2" style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)" }}>
                    <p className="text-[15px] font-semibold mb-2" style={{ color: "#E2E8F0" }}>Modo de Disparo</p>
                    <p className="text-[15px] mb-3" style={{ color: "#94A3B8" }}>Como os leads entram na simulação</p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { id: "sequential" as const, label: "Sequencial", desc: "Um lead por vez", icon: "📋" },
                        { id: "simultaneous" as const, label: "Simultâneo", desc: "Todos ao mesmo tempo", icon: "⚡" },
                        { id: "wave" as const, label: "Ondas", desc: "Lotes paralelos", icon: "🌊" },
                      ].map(m => (
                        <button key={m.id} onClick={() => setDispatchMode(m.id)}
                          className="flex-1 min-w-[100px] text-left rounded-xl px-3 py-2.5 transition-all"
                          style={{
                            background: dispatchMode === m.id ? "rgba(59,130,246,0.08)" : "rgba(255,255,255,0.01)",
                            border: `1px solid ${dispatchMode === m.id ? "rgba(59,130,246,0.25)" : "rgba(255,255,255,0.04)"}`,
                          }}>
                          <span className="text-sm">{m.icon}</span>
                          <p className="text-[15px] font-bold mt-1" style={{ color: dispatchMode === m.id ? "#3B82F6" : "#94A3B8" }}>{m.label}</p>
                          <p className="text-[15px]" style={{ color: "#94A3B8" }}>{m.desc}</p>
                        </button>
                      ))}
                    </div>
                    {dispatchMode === "wave" && (
                      <div className="mt-3 rounded-xl p-3" style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.03)" }}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[15px] font-semibold" style={{ color: "#E2E8F0" }}>Leads por onda</span>
                          <span className="text-[16px] font-extrabold tabular-nums" style={{ color: "#06B6D4" }}>{parallelLeads}</span>
                        </div>
                        <Slider min={2} max={Math.min(50, numLeads)} step={1} value={[parallelLeads]} onValueChange={v => setParallelLeads(v[0])} />
                      </div>
                    )}
                  </div>

                  {/* Context Compression Info */}
                  {msgsPerLead > 20 && (
                    <div className="rounded-xl p-3 mt-2 flex items-start gap-2" style={{ background: "rgba(16,185,129,0.04)", border: "1px solid rgba(16,185,129,0.12)" }}>
                      <Brain className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#10B981" }} />
                      <div>
                        <p className="text-[15px] font-bold" style={{ color: "#10B981" }}>Compressão de Contexto Ativa</p>
                        <p className="text-[15px]" style={{ color: "#94A3B8" }}>
                          Conversas com {msgsPerLead}+ msgs usam resumo inteligente do histórico antigo, 
                          mantendo apenas as últimas 16 mensagens completas. Isso economiza tokens e mantém coerência.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ===== PERFIS TAB ===== */}
              {configTab === "perfis" && (
                <div className="space-y-5 animate-in fade-in slide-in-from-right-3 duration-300">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <User className="w-5 h-5" style={{ color: "#EC4899" }} />
                      <div>
                        <h3 className="text-[15px] font-bold" style={{ color: "#F1F5F9" }}>Perfis Psicológicos</h3>
                        <p className="text-[15px]" style={{ color: "#94A3B8" }}>Selecione quais perfis participam · {selectedProfiles.length || "Todos os 8"} ativos</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {[
                        { id: "random", label: "Aleatório", icon: "🎲" },
                        { id: "roundrobin", label: "Round-robin", icon: "🔄" },
                      ].map(m => (
                        <button key={m.id} onClick={() => setProfileMode(m.id as any)}
                          className="text-[15px] px-3 py-1.5 rounded-lg font-semibold transition-all"
                          style={{
                            background: profileMode === m.id ? "rgba(236,72,153,0.1)" : "rgba(255,255,255,0.02)",
                            border: `1px solid ${profileMode === m.id ? "rgba(236,72,153,0.25)" : "rgba(255,255,255,0.04)"}`,
                            color: profileMode === m.id ? "#EC4899" : "#64748B",
                          }}>
                          {m.icon} {m.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {PERFIS_INTELIGENTES.map(p => {
                      const active = selectedProfiles.length === 0 || selectedProfiles.includes(p.tipo);
                      return (
                        <button key={p.tipo} onClick={() => toggleMulti(selectedProfiles, p.tipo, setSelectedProfiles)}
                          className="flex items-start gap-3 p-4 rounded-xl text-left transition-all duration-200"
                          style={{
                            background: active ? `${p.cor}06` : "rgba(255,255,255,0.01)",
                            border: `1px solid ${active ? `${p.cor}25` : "rgba(255,255,255,0.04)"}`,
                          }}>
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0" style={{
                            background: active ? `${p.cor}12` : "rgba(255,255,255,0.03)",
                          }}>
                            {p.emoji}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-[15px] font-bold" style={{ color: active ? "#F1F5F9" : "#64748B" }}>{p.label}</p>
                              {active && <div className="w-2 h-2 rounded-full" style={{ background: p.cor }} />}
                            </div>
                            <p className="text-[15px] mt-0.5 line-clamp-2" style={{ color: "#94A3B8" }}>{p.gatilhosCompra.slice(0, 2).join(" · ")}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ===== CENARIO TAB ===== */}
              {configTab === "cenario" && (
                <div className="space-y-5 animate-in fade-in slide-in-from-right-3 duration-300">
                  <div className="flex items-center gap-3 mb-2">
                    <MapPin className="w-5 h-5" style={{ color: "#06B6D4" }} />
                    <div>
                      <h3 className="text-[15px] font-bold" style={{ color: "#F1F5F9" }}>Cenário dos Leads</h3>
                      <p className="text-[15px]" style={{ color: "#94A3B8" }}>Destinos, orçamentos, canais e composição de grupo</p>
                    </div>
                  </div>

                  {/* Destinations */}
                  {(() => {
                    const DESTINO_DATA = DESTINOS_LEAD.map(d => {
                      const regions: Record<string, { icon: string; region: string }> = {
                        "Maldivas": { icon: "🏝️", region: "Ásia" }, "Paris": { icon: "🗼", region: "Europa" }, "Nova York": { icon: "🗽", region: "América" },
                        "Tóquio": { icon: "🗾", region: "Ásia" }, "Dubai": { icon: "🏙️", region: "Oriente Médio" }, "Roma": { icon: "🏛️", region: "Europa" },
                        "Cancún": { icon: "🌴", region: "América" }, "Santorini": { icon: "🏖️", region: "Europa" }, "Fernando de Noronha": { icon: "🐢", region: "Brasil" },
                        "Gramado": { icon: "🏔️", region: "Brasil" }, "Bali": { icon: "🛕", region: "Ásia" }, "Londres": { icon: "🎡", region: "Europa" },
                        "Orlando": { icon: "🎢", region: "América" }, "Santiago": { icon: "🏔️", region: "América" }, "Lisboa": { icon: "⛵", region: "Europa" },
                      };
                      return { name: d, ...regions[d] || { icon: "🌍", region: "Outros" } };
                    });

                    return (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[15px] font-bold" style={{ color: "#E2E8F0" }}>Destinos</span>
                            <span className="text-[15px] px-2 py-0.5 rounded-full" style={{ background: "rgba(6,182,212,0.08)", color: "#06B6D4" }}>
                              {selectedDestinos.length || DESTINOS_LEAD.length} selecionados
                            </span>
                          </div>
                          <button onClick={() => setSelectedDestinos([])} className="text-[15px] font-semibold px-2 py-1 rounded-lg" style={{ color: "#94A3B8", background: "rgba(255,255,255,0.02)" }}>
                            {selectedDestinos.length > 0 ? "Limpar" : "Todos"}
                          </button>
                        </div>
                        <div className={cn("grid gap-0 rounded-xl overflow-hidden", isMobile ? "grid-cols-2" : "grid-cols-5")} style={{ border: "1px solid rgba(255,255,255,0.04)" }}>
                          {DESTINO_DATA.map((d, i) => {
                            const active = selectedDestinos.length === 0 || selectedDestinos.includes(d.name);
                            return (
                              <button key={d.name} onClick={() => toggleMulti(selectedDestinos, d.name, setSelectedDestinos)}
                                className="flex items-center gap-2 px-3 py-2.5 text-left transition-all duration-200 hover:bg-white/[0.02]"
                                style={{
                                  background: active ? "rgba(6,182,212,0.06)" : "transparent",
                                  borderBottom: i < DESTINO_DATA.length - 5 ? "1px solid rgba(255,255,255,0.03)" : "none",
                                  borderRight: (i + 1) % 5 !== 0 ? "1px solid rgba(255,255,255,0.03)" : "none",
                                }}>
                                <div className="w-4 h-4 rounded flex items-center justify-center shrink-0 transition-all" style={{
                                  background: active ? "#06B6D4" : "rgba(255,255,255,0.04)",
                                  border: `1px solid ${active ? "#06B6D4" : "rgba(255,255,255,0.08)"}`,
                                }}>
                                  {active && <Check className="w-2.5 h-2.5 text-white" />}
                                </div>
                                <span className="text-sm">{d.icon}</span>
                                <div className="min-w-0">
                                  <p className="text-[15px] font-semibold truncate" style={{ color: active ? "#E2E8F0" : "#94A3B8" }}>{d.name}</p>
                                  <p className="text-[15px]" style={{ color: "#94A3B8" }}>{d.region}</p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Budget + Canal side by side */}
                  <div className={cn("gap-4", isMobile ? "grid grid-cols-1" : "grid grid-cols-2")}>
                    {/* Budget */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Wallet className="w-3.5 h-3.5" style={{ color: "#10B981" }} />
                        <span className="text-[15px] font-bold" style={{ color: "#E2E8F0" }}>Faixa de Orçamento</span>
                      </div>
                      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.04)" }}>
                        {BUDGETS_LEAD.map((b, i) => {
                          const active = selectedBudgets.includes(b);
                          const barWidths = [20, 35, 55, 75, 100];
                          return (
                            <button key={b} onClick={() => toggleMulti(selectedBudgets, b, setSelectedBudgets)}
                              className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all duration-200 hover:bg-white/[0.02]"
                              style={{
                                background: active ? "rgba(16,185,129,0.05)" : "transparent",
                                borderBottom: i < BUDGETS_LEAD.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none",
                              }}>
                              <div className="w-4 h-4 rounded flex items-center justify-center shrink-0 transition-all" style={{
                                background: active ? "#10B981" : "rgba(255,255,255,0.04)",
                                border: `1px solid ${active ? "#10B981" : "rgba(255,255,255,0.08)"}`,
                              }}>
                                {active && <Check className="w-2.5 h-2.5 text-white" />}
                              </div>
                              <span className="text-[15px] font-semibold w-24 shrink-0" style={{ color: active ? "#E2E8F0" : "#94A3B8" }}>{b}</span>
                              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
                                <div className="h-full rounded-full transition-all" style={{ width: `${barWidths[i]}%`, background: active ? "#10B981" : "rgba(255,255,255,0.08)" }} />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Canal */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Radio className="w-3.5 h-3.5" style={{ color: "#8B5CF6" }} />
                        <span className="text-[15px] font-bold" style={{ color: "#E2E8F0" }}>Origem do Lead</span>
                      </div>
                      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.04)" }}>
                        {CANAIS_LEAD.map((c, i) => {
                          const active = selectedCanais.includes(c);
                          const canalIcons: Record<string, string> = { "Instagram DM": "📸", WhatsApp: "💬", Site: "🌐", Indicação: "🤝", Google: "🔍", TikTok: "🎵" };
                          return (
                            <button key={c} onClick={() => toggleMulti(selectedCanais, c, setSelectedCanais)}
                              className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all duration-200 hover:bg-white/[0.02]"
                              style={{
                                background: active ? "rgba(139,92,246,0.05)" : "transparent",
                                borderBottom: i < CANAIS_LEAD.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none",
                              }}>
                              <div className="w-4 h-4 rounded flex items-center justify-center shrink-0 transition-all" style={{
                                background: active ? "#8B5CF6" : "rgba(255,255,255,0.04)",
                                border: `1px solid ${active ? "#8B5CF6" : "rgba(255,255,255,0.08)"}`,
                              }}>
                                {active && <Check className="w-2.5 h-2.5 text-white" />}
                              </div>
                              <span className="text-sm">{canalIcons[c] || "📡"}</span>
                              <span className="text-[15px] font-semibold" style={{ color: active ? "#E2E8F0" : "#94A3B8" }}>{c}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Grupos */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-3.5 h-3.5" style={{ color: "#F59E0B" }} />
                      <span className="text-[15px] font-bold" style={{ color: "#E2E8F0" }}>Grupo de Viajantes</span>
                    </div>
                    <div className={cn("grid gap-0 rounded-xl overflow-hidden", isMobile ? "grid-cols-2" : "grid-cols-3")} style={{ border: "1px solid rgba(255,255,255,0.04)" }}>
                      {GRUPOS_LEAD.map((g, i) => {
                        const active = selectedGrupos.includes(g);
                        const grupoIcons: Record<string, string> = { "1 pessoa": "🧍", Casal: "👫", "Família 4 pax": "👨‍👩‍👧‍👦", "Grupo 6 amigos": "👥", "Corporativo 3 pax": "💼", "Casal lua de mel": "💍" };
                        return (
                          <button key={g} onClick={() => toggleMulti(selectedGrupos, g, setSelectedGrupos)}
                            className="flex items-center gap-2.5 px-3 py-2.5 text-left transition-all duration-200 hover:bg-white/[0.02]"
                            style={{
                              background: active ? "rgba(245,158,11,0.05)" : "transparent",
                              borderBottom: i < GRUPOS_LEAD.length - 3 ? "1px solid rgba(255,255,255,0.03)" : "none",
                              borderRight: (i + 1) % 3 !== 0 ? "1px solid rgba(255,255,255,0.03)" : "none",
                            }}>
                            <div className="w-4 h-4 rounded flex items-center justify-center shrink-0 transition-all" style={{
                              background: active ? "#F59E0B" : "rgba(255,255,255,0.04)",
                              border: `1px solid ${active ? "#F59E0B" : "rgba(255,255,255,0.08)"}`,
                            }}>
                              {active && <Check className="w-2.5 h-2.5 text-white" />}
                            </div>
                            <span className="text-sm">{grupoIcons[g] || "👤"}</span>
                            <span className="text-[15px] font-semibold" style={{ color: active ? "#E2E8F0" : "#94A3B8" }}>{g}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ===== LEAD BEHAVIOR TAB ===== */}
              {configTab === "lead_behavior" && (
                <div className="space-y-5 animate-in fade-in slide-in-from-right-3 duration-300">
                  <div className="flex items-center gap-3 mb-2">
                    <Heart className="w-5 h-5" style={{ color: "#EF4444" }} />
                    <div>
                      <h3 className="text-[15px] font-bold" style={{ color: "#F1F5F9" }}>Calibração do Lead Fictício</h3>
                      <p className="text-[15px]" style={{ color: "#94A3B8" }}>Controle fino do comportamento, tom e reações do lead durante a simulação</p>
                    </div>
                  </div>

                  {/* Patience & Abandonment */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-xl p-5" style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)" }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[15px] font-semibold" style={{ color: "#E2E8F0" }}>Paciência inicial</span>
                        <span className="text-[20px] font-extrabold tabular-nums" style={{ color: initialPatience >= 70 ? "#10B981" : initialPatience >= 40 ? "#F59E0B" : "#EF4444" }}>{initialPatience}%</span>
                      </div>
                      <p className="text-[15px] mb-3" style={{ color: "#94A3B8" }}>Nível de paciência com que o lead começa a conversa</p>
                      <Slider min={10} max={100} step={5} value={[initialPatience]} onValueChange={v => setInitialPatience(v[0])} />
                      <div className="flex justify-between mt-1">
                        <span className="text-[15px]" style={{ color: "#EF4444" }}>Impaciente</span>
                        <span className="text-[15px]" style={{ color: "#10B981" }}>Paciente</span>
                      </div>
                    </div>
                    <div className="rounded-xl p-5" style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)" }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[15px] font-semibold" style={{ color: "#E2E8F0" }}>Sensibilidade a abandono</span>
                        <span className="text-[20px] font-extrabold tabular-nums" style={{ color: abandonmentSensitivity >= 70 ? "#EF4444" : abandonmentSensitivity >= 40 ? "#F59E0B" : "#10B981" }}>{abandonmentSensitivity}%</span>
                      </div>
                      <p className="text-[15px] mb-3" style={{ color: "#94A3B8" }}>Quão facilmente o lead desiste ao receber respostas fracas</p>
                      <Slider min={0} max={100} step={5} value={[abandonmentSensitivity]} onValueChange={v => setAbandonmentSensitivity(v[0])} />
                      <div className="flex justify-between mt-1">
                        <span className="text-[15px]" style={{ color: "#10B981" }}>Tolerante</span>
                        <span className="text-[15px]" style={{ color: "#EF4444" }}>Desiste fácil</span>
                      </div>
                    </div>
                  </div>

                  {/* Patience Curve */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-3.5 h-3.5" style={{ color: "#EF4444" }} />
                      <span className="text-[15px] font-bold" style={{ color: "#E2E8F0" }}>Curva de perda de paciência</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        { id: "linear" as const, label: "Linear", desc: "Perde paciência de forma constante", icon: "📉", visual: "━━━━━━━━" },
                        { id: "exponential" as const, label: "Exponencial", desc: "Começa tolerante, depois desaba", icon: "📈", visual: "━━━━━╲╲╲" },
                        { id: "sudden" as const, label: "Abrupta", desc: "Mantém paciência até estourar de repente", icon: "💥", visual: "━━━━━━━╲" },
                      ]).map(c => (
                        <button key={c.id} onClick={() => setLeadPatienceCurve(c.id)}
                          className="flex flex-col items-center gap-1.5 p-3.5 rounded-xl transition-all text-center"
                          style={{
                            background: leadPatienceCurve === c.id ? "rgba(239,68,68,0.08)" : "rgba(255,255,255,0.015)",
                            border: `1px solid ${leadPatienceCurve === c.id ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.04)"}`,
                          }}>
                          <span className="text-lg">{c.icon}</span>
                          <span className="text-[15px] font-bold" style={{ color: leadPatienceCurve === c.id ? "#F1F5F9" : "#94A3B8" }}>{c.label}</span>
                          <span className="text-[15px] font-mono tracking-wider" style={{ color: leadPatienceCurve === c.id ? "#EF4444" : "#334155" }}>{c.visual}</span>
                          <span className="text-[15px]" style={{ color: "#94A3B8" }}>{c.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Communication Style */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-xl p-5" style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)" }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[15px] font-semibold" style={{ color: "#E2E8F0" }}>Tom de formalidade</span>
                        <span className="text-[15px] font-bold" style={{ color: "#8B5CF6" }}>{leadToneFormality}%</span>
                      </div>
                      <p className="text-[15px] mb-3" style={{ color: "#94A3B8" }}>Como o lead se comunica: informal (gírias, abreviações) vs formal</p>
                      <Slider min={0} max={100} step={10} value={[leadToneFormality]} onValueChange={v => setLeadToneFormality(v[0])} />
                      <div className="flex justify-between mt-1">
                        <span className="text-[15px]" style={{ color: "#EC4899" }}>🤙 "eae mano"</span>
                        <span className="text-[15px]" style={{ color: "#3B82F6" }}>🎩 "Prezado(a)"</span>
                      </div>
                    </div>
                    <div className="rounded-xl p-5" style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)" }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[15px] font-semibold" style={{ color: "#E2E8F0" }}>Follow-up espontâneo</span>
                        <span className="text-[15px] font-bold" style={{ color: "#F59E0B" }}>{leadFollowUpPressure}%</span>
                      </div>
                      <p className="text-[15px] mb-3" style={{ color: "#94A3B8" }}>Chance do lead mandar msg extra pressionando ("e aí?", "???")</p>
                      <Slider min={0} max={100} step={5} value={[leadFollowUpPressure]} onValueChange={v => setLeadFollowUpPressure(v[0])} />
                      <div className="flex justify-between mt-1">
                        <span className="text-[15px]" style={{ color: "#10B981" }}>Passivo</span>
                        <span className="text-[15px]" style={{ color: "#EF4444" }}>Insistente</span>
                      </div>
                    </div>
                  </div>

                  {/* Typing style */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare className="w-3.5 h-3.5" style={{ color: "#06B6D4" }} />
                      <span className="text-[15px] font-bold" style={{ color: "#E2E8F0" }}>Estilo de escrita do lead</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        { id: "rapido" as const, label: "Rápido", desc: "Msgs curtas, direto ao ponto", icon: "⚡", example: "\"quanto?\"" },
                        { id: "natural" as const, label: "Natural", desc: "Conversacional, parágrafos curtos", icon: "💬", example: "\"Oi! Queria saber sobre...\"" },
                        { id: "detalhado" as const, label: "Detalhista", desc: "Textos longos, muita informação", icon: "📝", example: "\"Bom dia! Preciso de um pacote completo incluindo...\"" },
                      ]).map(ts => (
                        <button key={ts.id} onClick={() => setLeadTypingStyle(ts.id)}
                          className="flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all text-center"
                          style={{
                            background: leadTypingStyle === ts.id ? "rgba(6,182,212,0.08)" : "rgba(255,255,255,0.015)",
                            border: `1px solid ${leadTypingStyle === ts.id ? "rgba(6,182,212,0.3)" : "rgba(255,255,255,0.04)"}`,
                          }}>
                          <span className="text-lg">{ts.icon}</span>
                          <span className="text-[15px] font-bold" style={{ color: leadTypingStyle === ts.id ? "#E2E8F0" : "#94A3B8" }}>{ts.label}</span>
                          <span className="text-[15px] italic" style={{ color: "#94A3B8" }}>{ts.example}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Info reveal + conversation goal */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Search className="w-3.5 h-3.5" style={{ color: "#10B981" }} />
                        <span className="text-[15px] font-bold" style={{ color: "#E2E8F0" }}>Revelação de informações</span>
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {([
                          { id: "imediato" as const, label: "Imediato", desc: "Dá todas as infos na 1ª msg", icon: "📢" },
                          { id: "gradual" as const, label: "Gradual", desc: "Revela aos poucos conforme perguntado", icon: "🧩" },
                          { id: "resistente" as const, label: "Resistente", desc: "Omite dados, exige confiança primeiro", icon: "🔒" },
                        ]).map(ir => (
                          <button key={ir.id} onClick={() => setInfoRevealSpeed(ir.id)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all"
                            style={{
                              background: infoRevealSpeed === ir.id ? "rgba(16,185,129,0.06)" : "rgba(255,255,255,0.015)",
                              border: `1px solid ${infoRevealSpeed === ir.id ? "rgba(16,185,129,0.25)" : "rgba(255,255,255,0.04)"}`,
                            }}>
                            <span>{ir.icon}</span>
                            <div>
                              <p className="text-[15px] font-bold" style={{ color: infoRevealSpeed === ir.id ? "#E2E8F0" : "#94A3B8" }}>{ir.label}</p>
                              <p className="text-[15px]" style={{ color: "#94A3B8" }}>{ir.desc}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Lightbulb className="w-3.5 h-3.5" style={{ color: "#F59E0B" }} />
                        <span className="text-[15px] font-bold" style={{ color: "#E2E8F0" }}>Objetivo do lead</span>
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {([
                          { id: "comprar" as const, label: "Quer comprar", desc: "Intenção real de fechar", icon: "🎯" },
                          { id: "pesquisar" as const, label: "Só pesquisando", desc: "Coleta informação, sem pressa", icon: "🔍" },
                          { id: "comparar" as const, label: "Comparando preços", desc: "Tem concorrente, quer melhor oferta", icon: "⚖️" },
                          { id: "aleatorio" as const, label: "Aleatório", desc: "Mix realista de intenções", icon: "🎲" },
                        ]).map(cg => (
                          <button key={cg.id} onClick={() => setLeadConversationGoal(cg.id)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all"
                            style={{
                              background: leadConversationGoal === cg.id ? "rgba(245,158,11,0.06)" : "rgba(255,255,255,0.015)",
                              border: `1px solid ${leadConversationGoal === cg.id ? "rgba(245,158,11,0.25)" : "rgba(255,255,255,0.04)"}`,
                            }}>
                            <span>{cg.icon}</span>
                            <div>
                              <p className="text-[15px] font-bold" style={{ color: leadConversationGoal === cg.id ? "#E2E8F0" : "#94A3B8" }}>{cg.label}</p>
                              <p className="text-[15px]" style={{ color: "#94A3B8" }}>{cg.desc}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Toggles row */}
                  <div className="space-y-2">
                    <p className="text-[15px] uppercase tracking-[0.1em] font-bold" style={{ color: "#94A3B8" }}>🎭 Traços de personalidade</p>
                    {[
                      { label: "Erros de digitação", desc: "Lead comete typos realistas (\"tbm\", \"vc\", palavras cortadas)", value: enableLeadTypos, setter: setEnableLeadTypos, color: "#EC4899", icon: "✏️" },
                      { label: "Emojis na conversa", desc: "Lead usa emojis naturalmente (😊 🙏 ✈️)", value: enableLeadEmojis, setter: setEnableLeadEmojis, color: "#F59E0B", icon: "😊" },
                      { label: "Referências a áudio", desc: "Lead menciona 'prefiro mandar áudio' ou 'não consigo ler agora'", value: enableLeadAudioRef, setter: setEnableLeadAudioRef, color: "#8B5CF6", icon: "🎤" },
                    ].map(opt => (
                      <button key={opt.label} onClick={() => opt.setter(!opt.value)}
                        className="w-full flex items-center gap-4 px-4 py-2.5 rounded-xl text-left transition-all"
                        style={{
                          background: opt.value ? `${opt.color}06` : "rgba(255,255,255,0.015)",
                          border: `1px solid ${opt.value ? `${opt.color}25` : "rgba(255,255,255,0.04)"}`,
                        }}>
                        <span className="text-sm">{opt.icon}</span>
                        <div className="flex-1">
                          <p className="text-[15px] font-bold" style={{ color: opt.value ? "#F1F5F9" : "#94A3B8" }}>{opt.label}</p>
                          <p className="text-[15px] mt-0.5" style={{ color: "#94A3B8" }}>{opt.desc}</p>
                        </div>
                        <div className="w-9 h-5 rounded-full relative transition-all" style={{ background: opt.value ? opt.color : "rgba(255,255,255,0.1)" }}>
                          <div className="absolute top-0.5 w-4 h-4 rounded-full transition-all" style={{ left: opt.value ? 18 : 2, background: "#fff" }} />
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Advanced: re-engagement + max conv time + custom instructions */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-xl p-5" style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)" }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[15px] font-semibold" style={{ color: "#E2E8F0" }}>Reengajamento</span>
                        <span className="text-[15px] font-bold" style={{ color: "#06B6D4" }}>{leadReengagementChance}%</span>
                      </div>
                      <p className="text-[15px] mb-3" style={{ color: "#94A3B8" }}>Chance do lead voltar após silêncio/desistência parcial</p>
                      <Slider min={0} max={80} step={5} value={[leadReengagementChance]} onValueChange={v => setLeadReengagementChance(v[0])} />
                    </div>
                    <div className="rounded-xl p-5" style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)" }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[15px] font-semibold" style={{ color: "#E2E8F0" }}>Duração máx por conversa</span>
                        <span className="text-[15px] font-bold" style={{ color: "#8B5CF6" }}>{maxConversationMinutes === 0 ? "∞" : `${maxConversationMinutes}min`}</span>
                      </div>
                      <p className="text-[15px] mb-3" style={{ color: "#94A3B8" }}>Limite de tempo por conversa individual (0 = ilimitado)</p>
                      <Slider min={0} max={30} step={1} value={[maxConversationMinutes]} onValueChange={v => setMaxConversationMinutes(v[0])} />
                    </div>
                  </div>

                  {/* Custom instructions */}
                  <div className="rounded-xl p-4" style={{ background: "rgba(139,92,246,0.04)", border: "1px solid rgba(139,92,246,0.12)" }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Edit3 className="w-3.5 h-3.5" style={{ color: "#8B5CF6" }} />
                      <span className="text-[15px] font-bold" style={{ color: "#E2E8F0" }}>Instruções customizadas para o lead</span>
                    </div>
                    <p className="text-[15px] mb-2" style={{ color: "#94A3B8" }}>Adicione comportamentos específicos que serão injetados no prompt do lead fictício</p>
                    <textarea
                      value={leadCustomInstructions}
                      onChange={e => setLeadCustomInstructions(e.target.value)}
                      placeholder="Ex: 'Sempre mencione que já viajou com a CVC antes', 'Pergunte sobre seguro viagem', 'Insista em saber sobre cancelamento'..."
                      rows={3}
                      className="w-full rounded-lg px-3 py-2 text-[15px] outline-none resize-none"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", color: "#E2E8F0" }}
                    />
                  </div>
                </div>
              )}

              {/* ===== AGENTES & FUNIL TAB ===== */}
              {configTab === "comportamento" && (
                <div className="space-y-5 animate-in fade-in slide-in-from-right-3 duration-300">
                  <div className="flex items-center gap-3 mb-2">
                    <Users className="w-5 h-5" style={{ color: "#8B5CF6" }} />
                    <div>
                      <h3 className="text-[15px] font-bold" style={{ color: "#F1F5F9" }}>Seleção de Agentes & Pipeline</h3>
                      <p className="text-[15px]" style={{ color: "#94A3B8" }}>Escolha quem será testado: um único agente, vários específicos ou o pipeline completo</p>
                    </div>
                  </div>

                  {/* Mode selector — 4 options */}
                  <div className="grid grid-cols-4 gap-2">
                    {([
                      { id: "individual" as const, label: "Individual", desc: "Teste 1 agente isolado", icon: "🎯", color: "#EC4899" },
                      { id: "custom" as const, label: "Específicos", desc: "Selecione vários agentes", icon: "🔧", color: "#8B5CF6" },
                      { id: "comercial" as const, label: "Squad Comercial", desc: "Pipeline de vendas completo", icon: "💼", color: "#F59E0B" },
                      { id: "full" as const, label: "Todos (Pipeline)", desc: "Comercial + Atendimento", icon: "🔄", color: "#10B981" },
                    ] as const).map(m => (
                      <button key={m.id} onClick={() => { setFunnelMode(m.id); if (m.id !== "custom" && m.id !== "individual") setCustomFunnelAgents([]); }}
                        className="flex flex-col items-center gap-1.5 p-3.5 rounded-xl transition-all duration-200 relative overflow-hidden group"
                        style={{
                          background: funnelMode === m.id ? `${m.color}10` : "rgba(255,255,255,0.015)",
                          border: `1px solid ${funnelMode === m.id ? `${m.color}35` : "rgba(255,255,255,0.04)"}`,
                        }}>
                        {funnelMode === m.id && <div className="absolute inset-x-0 top-0 h-[2px]" style={{ background: m.color }} />}
                        <span className="text-xl">{m.icon}</span>
                        <span className="text-[15px] font-bold" style={{ color: funnelMode === m.id ? "#F1F5F9" : "#94A3B8" }}>{m.label}</span>
                        <span className="text-[15px] text-center leading-tight" style={{ color: "#94A3B8" }}>{m.desc}</span>
                      </button>
                    ))}
                  </div>

                  {/* INDIVIDUAL MODE — single agent selector */}
                  {funnelMode === "individual" && (
                    <div className="space-y-3 animate-in fade-in duration-200">
                      <div className="flex items-center gap-2">
                        <span className="text-[15px] uppercase tracking-[0.1em] font-bold" style={{ color: "#EC4899" }}>🎯 Selecione o agente para teste individual</span>
                      </div>
                      <div className="space-y-2">
                        {SQUADS.filter(s => s.id !== 'orquestracao').map(squad => {
                          const squadAgents = AGENTS_V4.filter(a => a.squadId === squad.id);
                          if (squadAgents.length === 0) return null;
                          return (
                            <div key={squad.id}>
                              <p className="text-[15px] uppercase tracking-[0.1em] font-bold mb-1.5 flex items-center gap-1.5"
                                style={{ color: "#94A3B8" }}>
                                <span>{squad.emoji}</span> {squad.name}
                              </p>
                              <div className={cn("gap-1.5", isMobile ? "grid grid-cols-1" : "grid grid-cols-2")}>
                                {squadAgents.map(a => {
                                  const selected = customFunnelAgents[0] === a.id;
                                  const c = getAgentColor(a);
                                  return (
                                    <button key={a.id} onClick={() => setCustomFunnelAgents([a.id])}
                                      className="flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition-all duration-200 relative overflow-hidden"
                                      style={{
                                        background: selected ? `${c}12` : "rgba(255,255,255,0.015)",
                                        border: `1.5px solid ${selected ? c : "rgba(255,255,255,0.04)"}`,
                                        boxShadow: selected ? `0 0 20px ${c}15` : "none",
                                      }}>
                                      {selected && <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: c }} />}
                                      <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg shrink-0" style={{
                                        background: selected ? `${c}20` : "rgba(255,255,255,0.03)",
                                        border: `1px solid ${selected ? `${c}30` : "rgba(255,255,255,0.06)"}`,
                                      }}>
                                        {a.emoji}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                          <p className="text-[15px] font-bold" style={{ color: selected ? "#F1F5F9" : "#94A3B8" }}>{a.name}</p>
                                          {selected && <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: c }} />}
                                        </div>
                                        <p className="text-[15px] truncate" style={{ color: "#94A3B8" }}>{a.role}</p>
                                        <div className="flex items-center gap-1.5 mt-1">
                                          <span className="text-[15px] px-1.5 py-0.5 rounded" style={{ background: `${c}08`, color: c }}>{a.skills[0]}</span>
                                          <span className="text-[15px]" style={{ color: "#94A3B8" }}>Lv.{a.level}</span>
                                          <span className="text-[15px]" style={{ color: "#94A3B8" }}>{a.successRate}%</span>
                                        </div>
                                      </div>
                                      {selected && (
                                        <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: c }}>
                                          <Check className="w-3.5 h-3.5 text-white" />
                                        </div>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {customFunnelAgents.length > 0 && (() => {
                        const agent = AGENTS_V4.find(a => a.id === customFunnelAgents[0]);
                        if (!agent) return null;
                        const c = getAgentColor(agent);
                        return (
                          <div className="rounded-xl p-4 mt-2" style={{ background: `${c}06`, border: `1px solid ${c}20` }}>
                            <p className="text-[15px] font-bold mb-2" style={{ color: c }}>📋 Detalhes do agente selecionado</p>
                            <div className="grid grid-cols-3 gap-3">
                              <div><p className="text-[15px] uppercase" style={{ color: "#94A3B8" }}>Squad</p><p className="text-[15px] font-bold" style={{ color: "#E2E8F0" }}>{SQUADS.find(s => s.id === agent.squadId)?.name}</p></div>
                              <div><p className="text-[15px] uppercase" style={{ color: "#94A3B8" }}>Nível</p><p className="text-[15px] font-bold" style={{ color: "#E2E8F0" }}>Lv.{agent.level} ({agent.xp}/{agent.maxXp} XP)</p></div>
                              <div><p className="text-[15px] uppercase" style={{ color: "#94A3B8" }}>Taxa Sucesso</p><p className="text-[15px] font-bold" style={{ color: "#10B981" }}>{agent.successRate}%</p></div>
                            </div>
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {agent.skills.map(s => <span key={s} className="text-[15px] px-2 py-0.5 rounded-full" style={{ background: `${c}10`, color: c, border: `1px solid ${c}20` }}>{s}</span>)}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* CUSTOM MODE — multi-select by squad */}
                  {funnelMode === "custom" && (
                    <div className="space-y-3 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between">
                        <span className="text-[15px] uppercase tracking-[0.1em] font-bold" style={{ color: "#8B5CF6" }}>
                          🔧 Selecione os agentes ({customFunnelAgents.length} selecionados)
                        </span>
                        <div className="flex gap-2">
                          <button onClick={() => setCustomFunnelAgents(AGENTS_V4.map(a => a.id))}
                            className="text-[15px] font-bold px-2.5 py-1 rounded-lg transition-all"
                            style={{ background: "rgba(139,92,246,0.08)", color: "#8B5CF6", border: "1px solid rgba(139,92,246,0.2)" }}>
                            Todos
                          </button>
                          <button onClick={() => setCustomFunnelAgents([])}
                            className="text-[15px] font-bold px-2.5 py-1 rounded-lg transition-all"
                            style={{ background: "rgba(255,255,255,0.02)", color: "#94A3B8", border: "1px solid rgba(255,255,255,0.04)" }}>
                            Limpar
                          </button>
                        </div>
                      </div>
                      {/* Squad quick-select buttons */}
                      <div className="flex flex-wrap gap-2">
                        {SQUADS.filter(s => s.id !== 'orquestracao').map(squad => {
                          const squadAgentIds = AGENTS_V4.filter(a => a.squadId === squad.id).map(a => a.id);
                          const allSelected = squadAgentIds.every(id => customFunnelAgents.includes(id));
                          return (
                            <button key={squad.id} onClick={() => {
                              if (allSelected) {
                                setCustomFunnelAgents(prev => prev.filter(id => !squadAgentIds.includes(id)));
                              } else {
                                setCustomFunnelAgents(prev => [...new Set([...prev, ...squadAgentIds])]);
                              }
                            }}
                              className="text-[15px] font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5"
                              style={{
                                background: allSelected ? "rgba(139,92,246,0.12)" : "rgba(255,255,255,0.02)",
                                border: `1px solid ${allSelected ? "rgba(139,92,246,0.3)" : "rgba(255,255,255,0.06)"}`,
                                color: allSelected ? "#8B5CF6" : "#64748B",
                              }}>
                              {squad.emoji} {squad.name}
                              {allSelected && <Check className="w-3 h-3" />}
                            </button>
                          );
                        })}
                      </div>
                      {/* Agent grid */}
                      <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1" style={{ scrollbarWidth: "thin" }}>
                        {SQUADS.filter(s => s.id !== 'orquestracao').map(squad => {
                          const squadAgents = AGENTS_V4.filter(a => a.squadId === squad.id);
                          if (squadAgents.length === 0) return null;
                          return (
                            <div key={squad.id}>
                              <p className="text-[15px] uppercase tracking-[0.12em] font-bold mb-1 flex items-center gap-1" style={{ color: "#94A3B8" }}>
                                {squad.emoji} {squad.name}
                              </p>
                              <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.04)" }}>
                                {squadAgents.map((a, i) => {
                                  const active = customFunnelAgents.includes(a.id);
                                  const c = getAgentColor(a);
                                  return (
                                    <button key={a.id} onClick={() => toggleMulti(customFunnelAgents, a.id, setCustomFunnelAgents)}
                                      className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all duration-200 hover:bg-white/[0.02]"
                                      style={{
                                        background: active ? `${c}08` : "transparent",
                                        borderBottom: i < squadAgents.length - 1 ? "1px solid rgba(255,255,255,0.02)" : "none",
                                      }}>
                                      <div className="w-5 h-5 rounded flex items-center justify-center shrink-0 transition-all" style={{
                                        background: active ? c : "rgba(255,255,255,0.04)",
                                        border: `1px solid ${active ? c : "rgba(255,255,255,0.08)"}`,
                                      }}>
                                        {active && <Check className="w-3 h-3 text-white" />}
                                      </div>
                                      <span className="text-sm">{a.emoji}</span>
                                      <div className="flex-1 min-w-0">
                                        <span className="text-[15px] font-bold" style={{ color: active ? "#E2E8F0" : "#64748B" }}>{a.name}</span>
                                        <span className="text-[15px] ml-2" style={{ color: "#94A3B8" }}>{a.role}</span>
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0">
                                        <span className="text-[15px] tabular-nums" style={{ color: "#94A3B8" }}>Lv.{a.level}</span>
                                        <span className="text-[15px] px-1.5 py-0.5 rounded" style={{ background: `${c}10`, color: c }}>{a.successRate}%</span>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* FULL / COMERCIAL preview */}
                  {(funnelMode === "full" || funnelMode === "comercial") && (
                    <div className="animate-in fade-in duration-200">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[15px] uppercase tracking-[0.1em] font-bold" style={{ color: funnelMode === "full" ? "#10B981" : "#F59E0B" }}>
                          {funnelMode === "full" ? "🔄 Pipeline completo — agentes que serão testados" : "💼 Squad Comercial — agentes do funil de vendas"}
                        </span>
                      </div>
                      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.04)" }}>
                        {(funnelMode === "full"
                          ? AGENTS_V4.filter(a => ["comercial", "atendimento"].includes(a.squadId)).slice(0, 6)
                          : AGENTS_V4.filter(a => a.squadId === "comercial")
                        ).map((a, i, arr) => {
                          const c = getAgentColor(a);
                          return (
                            <div key={a.id} className="flex items-center gap-3 px-4 py-2.5"
                              style={{
                                background: `${c}04`,
                                borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none",
                              }}>
                              <span className="text-[15px] font-bold tabular-nums w-5 text-center" style={{ color: c }}>{i + 1}</span>
                              <span className="text-sm">{a.emoji}</span>
                              <div className="flex-1">
                                <span className="text-[15px] font-bold" style={{ color: "#E2E8F0" }}>{a.name}</span>
                                <span className="text-[15px] ml-2" style={{ color: "#94A3B8" }}>{a.role}</span>
                              </div>
                              <span className="text-[15px] px-1.5 py-0.5 rounded" style={{ background: `${c}10`, color: c }}>{a.successRate}%</span>
                              {i < arr.length - 1 && <span className="text-[15px]" style={{ color: "#94A3B8" }}>→</span>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Divider */}
                  <div className="h-px" style={{ background: "rgba(255,255,255,0.06)" }} />

                  {/* Speed + Objections + Conversion — compacted */}
                  <div className={cn("gap-4", isMobile ? "grid grid-cols-1" : "grid grid-cols-2")}>
                    <div className="rounded-xl p-5" style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)" }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[15px] font-semibold" style={{ color: "#E2E8F0" }}>Taxa alvo de conversão</span>
                        <span className="text-[15px] font-bold" style={{ color: conversionOverride !== null ? "#10B981" : "#64748B" }}>
                          {conversionOverride !== null ? `${conversionOverride}%` : "Natural"}
                        </span>
                      </div>
                      <p className="text-[15px] mb-3" style={{ color: "#94A3B8" }}>Forçar taxa ou deixar natural</p>
                      <div className="flex items-center gap-3">
                        <Slider min={0} max={100} step={5} value={[conversionOverride ?? 50]} onValueChange={v => setConversionOverride(v[0])} disabled={conversionOverride === null} />
                        <button onClick={() => setConversionOverride(conversionOverride === null ? 50 : null)}
                          className="text-[15px] px-3 py-1.5 rounded-lg shrink-0 font-semibold transition-all"
                          style={{ background: conversionOverride !== null ? "rgba(16,185,129,0.1)" : "rgba(255,255,255,0.02)", border: `1px solid ${conversionOverride !== null ? "rgba(16,185,129,0.25)" : "rgba(255,255,255,0.04)"}`, color: conversionOverride !== null ? "#10B981" : "#64748B" }}>
                          {conversionOverride !== null ? "Override" : "Natural"}
                        </button>
                      </div>
                    </div>
                    <div className="rounded-xl p-5" style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)" }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[15px] font-semibold" style={{ color: "#E2E8F0" }}>Densidade de objeções</span>
                        <span className="text-[15px] font-bold" style={{ color: "#F59E0B" }}>{objectionDensity}%</span>
                      </div>
                      <p className="text-[15px] mb-3" style={{ color: "#94A3B8" }}>Probabilidade de objeções por turno</p>
                      <Slider min={0} max={100} step={5} value={[objectionDensity]} onValueChange={v => setObjectionDensity(v[0])} />
                    </div>
                  </div>

                  {/* Speed */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-3.5 h-3.5" style={{ color: "#8B5CF6" }} />
                      <span className="text-[15px] font-bold" style={{ color: "#E2E8F0" }}>Velocidade da Simulação</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {SPEED_OPTIONS.map(s => {
                        const active = speed === s.id;
                        const speedIcons: Record<string, string> = { lenta: "🐢", normal: "⚡", rapida: "🚀", instant: "💥" };
                        return (
                          <button key={s.id} onClick={() => setSpeed(s.id)}
                            className="flex flex-col items-center gap-1 p-2.5 rounded-xl transition-all"
                            style={{
                              background: active ? "rgba(139,92,246,0.08)" : "rgba(255,255,255,0.015)",
                              border: `1px solid ${active ? "rgba(139,92,246,0.3)" : "rgba(255,255,255,0.04)"}`,
                            }}>
                            <span className="text-lg">{speedIcons[s.id]}</span>
                            <span className="text-[15px] font-bold" style={{ color: active ? "#E2E8F0" : "#94A3B8" }}>{s.label}</span>
                            <span className="text-[15px]" style={{ color: "#94A3B8" }}>{s.delay > 0 ? `${s.delay / 1000}s` : "0s"}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ===== AVANCADO TAB ===== */}
              {configTab === "avancado" && (
                <div className="space-y-5 animate-in fade-in slide-in-from-right-3 duration-300">
                  <div className="flex items-center gap-3 mb-2">
                    <Brain className="w-5 h-5" style={{ color: "#F59E0B" }} />
                    <div>
                      <h3 className="text-[15px] font-bold" style={{ color: "#F1F5F9" }}>Motor IA Avançado</h3>
                      <p className="text-[15px]" style={{ color: "#94A3B8" }}>Controle granular de cada aspecto da simulação</p>
                    </div>
                  </div>
                  {/* Toggles */}
                  <div className="space-y-2">
                    {[
                      { label: "Avaliação IA em tempo real", desc: "Lead julga qualidade de cada resposta (3 dimensões: H/E/T)", value: enableEvaluation, setter: setEnableEvaluation, color: "#EC4899", icon: "🧠" },
                      { label: "Multi-mensagem por perfil", desc: "Ansioso e Sonhador enviam múltiplas msgs seguidas", value: enableMultiMsg, setter: setEnableMultiMsg, color: "#F59E0B", icon: "💬" },
                      { label: "Transferência entre agentes", desc: "Permite passagem de bastão via [TRANSFERIR] entre agentes", value: enableTransfers, setter: setEnableTransfers, color: "#06B6D4", icon: "🔄" },
                      { label: "Narrativa de perda por IA", desc: "Gera mensagem de desistência contextual (desativar = mais rápido)", value: enableLossNarrative, setter: setEnableLossNarrative, color: "#EF4444", icon: "📝" },
                    ].map(opt => (
                      <button key={opt.label} onClick={() => opt.setter(!opt.value)}
                        className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-left transition-all"
                        style={{
                          background: opt.value ? `${opt.color}06` : "rgba(255,255,255,0.015)",
                          border: `1px solid ${opt.value ? `${opt.color}25` : "rgba(255,255,255,0.04)"}`,
                        }}>
                        <span className="text-lg">{opt.icon}</span>
                        <div className="flex-1">
                          <p className="text-[15px] font-bold" style={{ color: opt.value ? "#F1F5F9" : "#94A3B8" }}>{opt.label}</p>
                          <p className="text-[15px] mt-0.5" style={{ color: "#94A3B8" }}>{opt.desc}</p>
                        </div>
                        <div className="w-10 h-6 rounded-full relative transition-all" style={{ background: opt.value ? opt.color : "rgba(255,255,255,0.1)" }}>
                          <div className="absolute top-1 w-4 h-4 rounded-full transition-all" style={{ left: opt.value ? 20 : 4, background: "#fff" }} />
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Sliders */}
                   <div className={cn("gap-4", isMobile ? "grid grid-cols-1" : "grid grid-cols-2")}>
                    <div className="rounded-xl p-5" style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)" }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[15px] font-semibold" style={{ color: "#E2E8F0" }}>Volatilidade emocional</span>
                        <span className="text-[15px] font-bold" style={{ color: "#EC4899" }}>{emotionalVolatility}%</span>
                      </div>
                      <p className="text-[15px] mb-3" style={{ color: "#94A3B8" }}>0% = lead estável · 100% = extremamente volátil</p>
                      <Slider min={0} max={100} step={5} value={[emotionalVolatility]} onValueChange={v => setEmotionalVolatility(v[0])} />
                    </div>
                    <div className="rounded-xl p-5" style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)" }}>
                      <span className="text-[15px] font-semibold" style={{ color: "#E2E8F0" }}>Frequência de avaliação IA</span>
                      <p className="text-[15px] mb-3 mt-1" style={{ color: "#94A3B8" }}>Com que frequência o juiz IA avalia o agente</p>
                      <div className="grid grid-cols-3 gap-2">
                        {([
                          { id: "every" as const, label: "Toda msg", icon: "🔍" },
                          { id: "every2" as const, label: "A cada 2", icon: "⚡" },
                          { id: "every3" as const, label: "A cada 3", icon: "💨" },
                        ]).map(ef => (
                          <button key={ef.id} onClick={() => setEvalFrequency(ef.id)}
                            className="flex flex-col items-center gap-1 p-2 rounded-lg transition-all text-center"
                            style={{
                              background: evalFrequency === ef.id ? "rgba(236,72,153,0.08)" : "rgba(255,255,255,0.015)",
                              border: `1px solid ${evalFrequency === ef.id ? "rgba(236,72,153,0.3)" : "rgba(255,255,255,0.04)"}`,
                            }}>
                            <span className="text-sm">{ef.icon}</span>
                            <span className="text-[15px] font-bold" style={{ color: evalFrequency === ef.id ? "#EC4899" : "#64748B" }}>{ef.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Response length */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare className="w-3.5 h-3.5" style={{ color: "#8B5CF6" }} />
                      <span className="text-[15px] font-bold" style={{ color: "#E2E8F0" }}>Tamanho de resposta do agente</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        { id: "curta" as const, label: "Curta", desc: "1 frase", icon: "⚡" },
                        { id: "media" as const, label: "Média", desc: "1-3 frases", icon: "📝" },
                        { id: "longa" as const, label: "Detalhada", desc: "3-5 frases", icon: "📄" },
                      ]).map(rl => (
                        <button key={rl.id} onClick={() => setAgentResponseLength(rl.id)}
                          className="flex flex-col items-center gap-1 p-3 rounded-xl transition-all"
                          style={{
                            background: agentResponseLength === rl.id ? "rgba(139,92,246,0.08)" : "rgba(255,255,255,0.015)",
                            border: `1px solid ${agentResponseLength === rl.id ? "rgba(139,92,246,0.3)" : "rgba(255,255,255,0.04)"}`,
                          }}>
                          <span className="text-lg">{rl.icon}</span>
                          <span className="text-[15px] font-bold" style={{ color: agentResponseLength === rl.id ? "#E2E8F0" : "#94A3B8" }}>{rl.label}</span>
                          <span className="text-[15px]" style={{ color: "#94A3B8" }}>{rl.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Engine features checklist */}
                  <div className="rounded-xl p-4" style={{ background: "rgba(236,72,153,0.04)", border: "1px solid rgba(236,72,153,0.1)" }}>
                    <p className="text-[15px] font-bold mb-2" style={{ color: "#EC4899" }}>Motor de Leads Inteligentes v3.0</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                      {[
                        "✅ 8 perfis psicológicos", "✅ Objeções dinâmicas IA",
                        "✅ 3 dimensões (H/E/T)", "✅ 12 critérios debrief",
                        "✅ Avaliação ao vivo", "✅ Duração enforced",
                        "✅ Multi-mensagem", "✅ Sentimento adaptativo",
                        "✅ Transferência agentes", "✅ Presets de config",
                        "✅ Volatilidade emocional", "✅ Freq. avaliação ajustável",
                      ].map(f => (
                        <p key={f} className="text-[15px]" style={{ color: "#94A3B8" }}>{f}</p>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ===== PRESETS TAB ===== */}
              {configTab === "presets" && (
                <div className="space-y-5 animate-in fade-in slide-in-from-right-3 duration-300">
                  <div className="flex items-center gap-3 mb-2">
                    <BookOpen className="w-5 h-5" style={{ color: "#10B981" }} />
                    <div>
                      <h3 className="text-[15px] font-bold" style={{ color: "#F1F5F9" }}>Presets de Configuração</h3>
                      <p className="text-[15px]" style={{ color: "#94A3B8" }}>Salve e reutilize configurações de teste</p>
                    </div>
                  </div>

                  {/* Built-in presets */}
                  <div>
                    <p className="text-[15px] uppercase tracking-[0.1em] font-bold mb-2" style={{ color: "#94A3B8" }}>⚡ Cenários pré-configurados</p>
                    <div className={cn("grid gap-2", isMobile ? "grid-cols-1" : "grid-cols-2 lg:grid-cols-3")}>
                      {Object.values(BUILT_IN_PRESETS).map(bp => (
                        <button key={bp.name} onClick={() => { loadPreset(bp.config); toast({ title: `${bp.name} aplicado!` }); }}
                          className="flex flex-col items-start gap-1.5 p-4 rounded-xl transition-all hover:scale-[1.02] text-left"
                          style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)" }}>
                          <span className="text-[15px] font-bold" style={{ color: "#E2E8F0" }}>{bp.name}</span>
                          <span className="text-[15px] leading-tight" style={{ color: "#94A3B8" }}>{bp.description}</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            <span className="text-[15px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: "rgba(59,130,246,0.1)", color: "#3B82F6" }}>{bp.config.numLeads} leads</span>
                            <span className="text-[15px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: "rgba(16,185,129,0.1)", color: "#10B981" }}>{bp.config.msgsPerLead} msgs</span>
                            <span className="text-[15px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: "rgba(139,92,246,0.1)", color: "#8B5CF6" }}>
                              {bp.config.duration >= 3600 ? `${Math.floor(bp.config.duration / 3600)}h` : `${Math.floor(bp.config.duration / 60)}min`}
                            </span>
                          </div>
                        </button>
                      ))}
                      {/* Legacy quick presets */}
                      <button onClick={() => { setNumLeads(3); setMsgsPerLead(6); setSpeed("instant"); setDuration(60); setEnableEvaluation(false); toast({ title: "Teste rápido aplicado" }); }}
                        className="flex flex-col items-start gap-1.5 p-4 rounded-xl transition-all hover:scale-[1.02] text-left"
                        style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)" }}>
                        <span className="text-[15px] font-bold" style={{ color: "#E2E8F0" }}>🚀 Teste Rápido</span>
                        <span className="text-[15px]" style={{ color: "#94A3B8" }}>3 leads, 6 msgs, instantâneo</span>
                        <div className="flex gap-1 mt-1">
                          <span className="text-[15px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: "rgba(59,130,246,0.1)", color: "#3B82F6" }}>3 leads</span>
                          <span className="text-[15px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: "rgba(16,185,129,0.1)", color: "#10B981" }}>6 msgs</span>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Save preset */}
                  <div className="rounded-xl p-4" style={{ background: "rgba(16,185,129,0.04)", border: "1px solid rgba(16,185,129,0.1)" }}>
                    <p className="text-[15px] uppercase tracking-[0.1em] font-bold mb-2" style={{ color: "#10B981" }}>💾 Salvar config atual</p>
                    <div className="flex gap-2">
                      <input type="text" value={presetName} onChange={e => setPresetName(e.target.value)}
                        placeholder="Nome do preset..."
                        className="flex-1 h-9 rounded-lg px-3 text-[15px] font-semibold outline-none"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", color: "#E2E8F0" }} />
                      <button onClick={() => { if (presetName.trim()) { savePreset(presetName.trim()); setPresetName(""); } }}
                        disabled={!presetName.trim()}
                        className="px-4 h-9 rounded-lg text-[15px] font-bold transition-all"
                        style={{ background: presetName.trim() ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.02)", color: presetName.trim() ? "#10B981" : "#475569", border: `1px solid ${presetName.trim() ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.04)"}` }}>
                        Salvar
                      </button>
                    </div>
                  </div>

                  {/* Saved presets */}
                  {presets.length > 0 && (
                    <div>
                      <p className="text-[15px] uppercase tracking-[0.1em] font-bold mb-2" style={{ color: "#94A3B8" }}>📂 Presets salvos</p>
                      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.04)" }}>
                        {presets.map((p, i) => (
                          <div key={p.name} className="flex items-center gap-3 px-4 py-3 transition-all hover:bg-white/[0.02]"
                            style={{ borderBottom: i < presets.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none" }}>
                            <BookOpen className="w-4 h-4 shrink-0" style={{ color: "#10B981" }} />
                            <div className="flex-1 min-w-0">
                              <p className="text-[15px] font-bold" style={{ color: "#E2E8F0" }}>{p.name}</p>
                              <p className="text-[15px]" style={{ color: "#94A3B8" }}>
                                {p.config.numLeads} leads · {p.config.msgsPerLead} msgs · {p.config.speed}
                              </p>
                            </div>
                            <button onClick={() => loadPreset(p.config)} className="text-[15px] font-bold px-3 py-1.5 rounded-lg transition-all"
                              style={{ background: "rgba(16,185,129,0.08)", color: "#10B981", border: "1px solid rgba(16,185,129,0.2)" }}>
                              Carregar
                            </button>
                            <button onClick={() => deletePreset(p.name)} className="text-[15px] font-bold px-2 py-1.5 rounded-lg transition-all"
                              style={{ background: "rgba(239,68,68,0.06)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.15)" }}>
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Export / Import */}
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => {
                      const config = { numLeads, msgsPerLead, intervalSec, duration, selectedProfiles, profileMode, selectedDestinos, selectedBudgets, selectedCanais, selectedGrupos, conversionOverride, objectionDensity, speed, funnelMode, enableEvaluation, enableMultiMsg, enableTransfers, emotionalVolatility, agentResponseLength, enableLossNarrative, evalFrequency };
                      navigator.clipboard.writeText(JSON.stringify(config, null, 2));
                      toast({ title: "Config copiada para clipboard!" });
                    }}
                      className="flex items-center justify-center gap-2 p-3 rounded-xl text-[15px] font-bold transition-all"
                      style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)", color: "#94A3B8" }}>
                      📋 Copiar JSON
                    </button>
                    <button onClick={() => {
                      const input = prompt("Cole o JSON da configuração:");
                      if (input) { try { loadPreset(JSON.parse(input)); } catch { toast({ title: "JSON inválido", variant: "destructive" }); } }
                    }}
                      className="flex items-center justify-center gap-2 p-3 rounded-xl text-[15px] font-bold transition-all"
                      style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)", color: "#94A3B8" }}>
                      📥 Importar JSON
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CTA Bar */}
        <div className="mt-5 rounded-2xl overflow-hidden relative" style={{
          background: "linear-gradient(135deg, rgba(13,18,32,0.95), rgba(13,18,32,0.8))",
          border: "1px solid rgba(16,185,129,0.15)",
        }}>
          <div className={cn("h-[2px]")} style={{ background: "linear-gradient(90deg, #10B981, #06B6D4, #8B5CF6)" }} />
          <div className={cn("flex items-center gap-4", isMobile ? "flex-col px-4 py-4" : "gap-6 px-6 py-4")}>
            {/* Config chips */}
            <div className="flex-1 flex items-center gap-2 overflow-x-auto scrollbar-hide w-full">
              {[
                { icon: "👥", label: `${numLeads} leads`, color: "#3B82F6" },
                { icon: "💬", label: `${msgsPerLead} msgs`, color: "#10B981" },
                { icon: "⏱️", label: formatTime(duration), color: "#8B5CF6" },
                { icon: "🎯", label: `${selectedProfiles.length || 8} perfis`, color: "#EC4899" },
                { icon: "⚡", label: SPEED_OPTIONS.find(s => s.id === speed)?.label || "Normal", color: "#F59E0B" },
              ].map(chip => (
                <span key={chip.label} className="text-[15px] font-semibold px-2.5 py-1 rounded-lg whitespace-nowrap shrink-0"
                  style={{ background: `${chip.color}08`, color: chip.color, border: `1px solid ${chip.color}15` }}>
                  {chip.icon} {chip.label}
                </span>
              ))}
            </div>
            {/* Start button */}
            <button onClick={runSimulation}
              className={cn("rounded-xl text-[15px] font-bold transition-all duration-300 relative overflow-hidden shrink-0 hover:scale-[1.03] active:scale-[0.98]", isMobile ? "w-full py-3.5 px-6" : "px-8 py-3")}
              style={{ background: "linear-gradient(135deg, #10B981, #06B6D4)", color: "#000", boxShadow: "0 4px 24px rgba(16,185,129,0.3)" }}>
              <Play className="w-4 h-4 inline mr-2" />
              Iniciar Simulação IA
            </button>
          </div>
        </div>
      </div>
    );
  }
  // ===== WAR ROOM / REPORT =====
  return (
    <div className="space-y-0 animate-in fade-in duration-300">
      {/* War Room header */}
      {running && (
        <div className={cn("rounded-2xl mb-4 relative overflow-hidden", isMobile ? "px-3 py-2" : "px-5 py-3")} style={{ background: "linear-gradient(135deg, rgba(13,18,32,0.95), rgba(15,23,42,0.9))", border: "1px solid rgba(239,68,68,0.15)" }}>
          <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: "linear-gradient(90deg, transparent, #EF4444, #F59E0B, transparent)" }} />
          <div className={cn("flex items-center", isMobile ? "flex-wrap gap-2" : "gap-4")}>
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-3 h-3 rounded-full animate-pulse" style={{ background: "#EF4444", boxShadow: "0 0 12px rgba(239,68,68,0.5)" }} />
              <span className={cn("font-extrabold tracking-wider", isMobile ? "text-[15px]" : "text-[15px]")} style={{ color: "#F1F5F9" }}>WAR ROOM</span>
              <span className={cn("font-bold tabular-nums px-2 py-0.5 rounded-lg", isMobile ? "text-[15px]" : "text-[15px] px-3 py-1")} style={{ color: "#F59E0B", background: "rgba(245,158,11,0.08)" }}>{formatTime(elapsedSeconds)}</span>
            </div>
            <div className={cn("flex items-center gap-3", isMobile ? "flex-1 justify-between" : "flex-1 justify-center gap-6")}>
              {[
                { label: "Leads", value: animLeads, color: "#3B82F6" },
                { label: "Fechados", value: animClosed, color: "#10B981" },
                { label: "Conversão", value: `${conversionRate}%`, color: "#F59E0B" },
                ...(!isMobile ? [{ label: "Sentimento", value: `${avgSentimento}`, color: sentimentColor(avgSentimento) }] : []),
              ].map(k => (
                <div key={k.label} className="text-center">
                  <span className={cn("font-extrabold tabular-nums block", isMobile ? "text-[15px]" : "text-[16px]")} style={{ color: k.color }}>{k.value}</span>
                  <span className="text-[15px] uppercase tracking-wider" style={{ color: "#94A3B8" }}>{k.label}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {!isMobile && (
                <>
                  <button onClick={() => exportConversations("txt")} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[15px] font-bold transition-all hover:scale-105"
                    style={{ background: "rgba(16,185,129,0.1)", color: "#10B981", border: "1px solid rgba(16,185,129,0.2)" }}>
                    <Download className="w-3 h-3" /> TXT
                  </button>
                  <button onClick={() => exportConversations("pdf")} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[15px] font-bold transition-all hover:scale-105"
                    style={{ background: "rgba(139,92,246,0.1)", color: "#8B5CF6", border: "1px solid rgba(139,92,246,0.2)" }}>
                    <FileText className="w-3 h-3" /> PDF
                  </button>
                </>
              )}
              <button onClick={stopSimulation} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[15px] font-bold transition-all hover:scale-105"
                style={{ background: "rgba(239,68,68,0.1)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.2)" }}>
                <Square className="w-3 h-3" /> Parar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report tabs */}
      {phase === "report" && !running && (
        <div className={cn("mb-4 rounded-2xl relative overflow-hidden", isMobile ? "px-3 py-2" : "px-5 py-3")} style={{
          background: "linear-gradient(135deg, rgba(13,18,32,0.95), rgba(15,23,42,0.9))",
          border: "1px solid rgba(255,255,255,0.06)",
        }}>
          <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: "linear-gradient(90deg, #3B82F6, #10B981, #8B5CF6)" }} />
          <div className={cn("flex items-center", isMobile ? "flex-col gap-2" : "gap-3")}>
            {/* Tab buttons */}
            <div className={cn("flex items-center gap-1.5", isMobile ? "w-full" : "flex-1")}>
              {(["numeros", "conversas", "debrief"] as ReportTab[]).map(t => {
                const active = reportTab === t;
                const accent = t === "debrief" ? "#8B5CF6" : t === "numeros" ? "#3B82F6" : "#10B981";
                const icons = { numeros: "📊", conversas: "💬", debrief: "🧠" };
                const labels = { numeros: "Números", conversas: "Conversas", debrief: "Debrief" };
                return (
                  <button key={t} onClick={() => setReportTab(t)}
                    className={cn("font-bold rounded-xl transition-all duration-300", isMobile ? "flex-1 text-[15px] px-2 py-2" : "text-[15px] px-4 py-2")}
                    style={{
                      background: active ? `${accent}12` : "transparent",
                      border: `1px solid ${active ? `${accent}30` : "transparent"}`,
                      color: active ? accent : "#64748B",
                    }}>
                    {icons[t]} {labels[t]}
                  </button>
                );
              })}
            </div>
            {/* Export + Nova Simulação */}
            <div className={cn("flex items-center gap-1.5", isMobile ? "w-full" : "")}>
              <button onClick={() => exportConversations("txt")} className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[15px] font-bold transition-all"
                style={{ background: "rgba(16,185,129,0.08)", color: "#10B981", border: "1px solid rgba(16,185,129,0.15)" }}>
                <Download className="w-3 h-3" /> TXT
              </button>
              <button onClick={() => exportConversations("pdf")} className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[15px] font-bold transition-all"
                style={{ background: "rgba(139,92,246,0.08)", color: "#8B5CF6", border: "1px solid rgba(139,92,246,0.15)" }}>
                <FileText className="w-3 h-3" /> PDF
              </button>
              <button onClick={() => { if (leads.length > 0 && !confirm("Tem certeza? Os dados da simulação atual serão perdidos.")) return; setPhase("config"); setLeads([]); setDebrief(null); setEvents([]); setElapsedSeconds(0); }}
                className={cn("flex items-center gap-1.5 rounded-xl font-bold transition-all", isMobile ? "flex-1 justify-center text-[15px] px-3 py-2" : "text-[15px] px-5 py-2.5 hover:scale-[1.03]")}
                style={{
                  background: "linear-gradient(135deg, rgba(16,185,129,0.1), rgba(6,182,212,0.1))",
                  border: "1px solid rgba(16,185,129,0.2)",
                  color: "#10B981",
                }}>
                <Play className="w-3.5 h-3.5" /> Nova
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3-column layout */}
      {(running || (phase === "report" && reportTab === "conversas")) && (
        <div className={cn(isMobile ? "flex flex-col gap-2" : "flex gap-4")} style={{ height: isMobile ? "auto" : "calc(100vh - 300px)", minHeight: isMobile ? undefined : 500 }}>
          {/* LEFT: Lead list */}
          <div className={cn("rounded-2xl overflow-hidden flex flex-col", isMobile ? "max-h-[35vh]" : "w-[280px] shrink-0")} style={{ background: "rgba(11,20,26,0.9)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <span className="text-[15px] font-bold" style={{ color: "#F1F5F9" }}>Leads Inteligentes</span>
              <span className="text-[15px] font-bold px-2 py-0.5 rounded-lg" style={{ background: "rgba(37,211,102,0.1)", color: "#25D366" }}>
                {leads.filter(l => l.status === "ativo").length} ativos
              </span>
            </div>
            {!running && (
              <div className="flex px-3 py-1.5 gap-1" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                {(["all", "ativo", "fechou", "perdeu"] as const).map(f => (
                  <button key={f} onClick={() => setLeadFilter(f)}
                    className="flex-1 text-[15px] py-1.5 font-semibold transition-all rounded-lg"
                    style={{ color: leadFilter === f ? "#10B981" : "#667781", background: leadFilter === f ? "rgba(16,185,129,0.06)" : "transparent" }}>
                    {f === "all" ? "Todos" : f === "ativo" ? "Ativos" : f === "fechou" ? "Fechados" : "Perdidos"}
                  </button>
                ))}
              </div>
            )}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {(running ? leads : filteredLeads).map((l, i) => (
                <button key={l.id} onClick={() => setSelectedLeadId(l.id)}
                  className={cn("w-full text-left px-3.5 py-3 transition-all duration-300", i === 0 && running && "animate-in slide-in-from-top-2")}
                  style={{
                    background: selectedLeadId === l.id ? "rgba(16,185,129,0.05)" : "transparent",
                    borderLeft: selectedLeadId === l.id ? `3px solid ${l.perfil.cor}` : "3px solid transparent",
                    borderBottom: "1px solid rgba(255,255,255,0.03)",
                  }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm shrink-0 relative"
                      style={{ background: `${l.perfil.cor}12`, border: `1px solid ${l.perfil.cor}20` }}>
                      {l.perfil.emoji}
                      {/* Sentiment indicator */}
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full" style={{
                        background: sentimentColor(l.sentimentoScore), border: "2px solid #0B141A",
                      }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-[15px] font-bold truncate" style={{ color: "#E2E8F0" }}>{l.nome}</p>
                        <span className="text-[15px] tabular-nums" style={{ color: "#94A3B8" }}>{l.perfil.label}</span>
                      </div>
                      <p className="text-[15px] truncate mt-0.5" style={{ color: "#94A3B8" }}>
                        {l.mensagens[l.mensagens.length - 1]?.content?.slice(0, 40) || l.destino}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[15px] px-1.5 py-0.5 rounded" style={{ background: `${l.perfil.cor}08`, color: l.perfil.cor }}>{l.destino}</span>
                        <span className="text-[15px]" style={{ color: sentimentColor(l.sentimentoScore) }}>♥ {l.sentimentoScore}</span>
                        {l.status !== "ativo" && (
                          <span className="text-[15px] font-bold" style={{ color: l.status === "fechou" ? "#10B981" : "#EF4444" }}>
                            {l.status === "fechou" ? "✓ FECHOU" : "✗ PERDEU"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* CENTER: Chat */}
          <div className={cn("flex-1 rounded-2xl flex flex-col overflow-hidden", isMobile && "min-h-[40vh]")} style={{ background: "rgba(11,20,26,0.9)", border: "1px solid rgba(255,255,255,0.06)" }}>
            {selectedLead ? (
              <>
                <div className="flex items-center gap-3 px-5 shrink-0 relative" style={{ height: 64, background: "linear-gradient(180deg, rgba(31,44,51,0.95), rgba(31,44,51,0.8))" }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold"
                    style={{ background: `${selectedLead.perfil.cor}12`, color: selectedLead.perfil.cor, border: `1px solid ${selectedLead.perfil.cor}20` }}>
                    {selectedLead.perfil.emoji}
                  </div>
                  <div className="flex-1">
                    <p className="text-[15px] font-bold" style={{ color: "#F1F5F9" }}>{selectedLead.nome}</p>
                    <p className="text-[15px]" style={{ color: "#94A3B8" }}>{selectedLead.destino} · {selectedLead.perfil.label} · {selectedLead.ocasiao}</p>
                  </div>
                  {/* Sentiment gauge */}
                  <div className="flex items-center gap-2">
                    <div className="text-center">
                      <div className="flex items-center gap-1">
                        <Heart className="w-3 h-3" style={{ color: sentimentColor(selectedLead.sentimentoScore) }} />
                        <span className="text-[15px] font-bold tabular-nums" style={{ color: sentimentColor(selectedLead.sentimentoScore) }}>{selectedLead.sentimentoScore}</span>
                      </div>
                      <p className="text-[15px]" style={{ color: "#94A3B8" }}>{sentimentLabel(selectedLead.sentimentoScore)}</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center gap-1">
                        <Shield className="w-3 h-3" style={{ color: selectedLead.pacienciaRestante > 50 ? "#10B981" : "#EF4444" }} />
                        <span className="text-[15px] font-bold tabular-nums" style={{ color: selectedLead.pacienciaRestante > 50 ? "#10B981" : "#EF4444" }}>{selectedLead.pacienciaRestante}</span>
                      </div>
                      <p className="text-[15px]" style={{ color: "#94A3B8" }}>Paciência</p>
                    </div>
                  </div>
                  {/* Stage */}
                  <div className="flex items-center gap-1 bg-black/20 px-2.5 py-1.5 rounded-full">
                    {ETAPAS_FUNIL.map((e, i) => {
                      const idx = ETAPAS_FUNIL.findIndex(et => et.id === selectedLead.etapaAtual);
                      return (
                        <div key={e.id} className="flex items-center gap-0.5" title={e.label}>
                          <div className="w-2 h-2 rounded-full transition-all" style={{
                            background: i < idx ? "#10B981" : i === idx ? selectedLead.perfil.cor : "rgba(255,255,255,0.08)",
                            boxShadow: i === idx ? `0 0 6px ${selectedLead.perfil.cor}80` : "none",
                          }} />
                          {i < ETAPAS_FUNIL.length - 1 && <div className="w-2 h-px" style={{ background: i < idx ? "#10B98160" : "rgba(255,255,255,0.06)" }} />}
                         </div>
                       );
                     })}
                   </div>
                   <NathOpinionButton
                     messages={selectedLead.mensagens.map(m => ({ role: m.role, content: m.content, agentName: m.agentName, timestamp: String(m.timestamp) }))}
                     context={`Destino: ${selectedLead.destino} · Perfil: ${selectedLead.perfil.label} · Sentimento: ${selectedLead.sentimentoScore}/100 · Paciência: ${selectedLead.pacienciaRestante}% · Etapa: ${selectedLead.etapaAtual} · Ocasião: ${selectedLead.ocasiao}`}
                     variant="inline"
                   />
                </div>
                {/* Messages */}
                <div ref={chatRef} className="flex-1 overflow-y-auto p-5 space-y-2" style={{ background: "#0B141A" }}>
                  {selectedLead.mensagens.map((msg, i) => {
                    const isAgent = msg.role === "agent";
                    const showName = isAgent && (i === 0 || selectedLead.mensagens[i - 1]?.role !== "agent" || selectedLead.mensagens[i - 1]?.agentName !== msg.agentName);
                    return (
                      <div key={`msg-${msg.timestamp}-${i}`} className={cn("flex gap-2 animate-in duration-300", isAgent ? "justify-start slide-in-from-left-3" : "justify-end slide-in-from-right-3")}>
                        <div style={{
                          background: isAgent ? "rgba(31,44,51,0.9)" : "linear-gradient(135deg, #005C4B, #00694D)", color: "#E9EDEF",
                          borderRadius: isAgent ? "4px 16px 16px 16px" : "16px 4px 16px 16px",
                          maxWidth: "70%", padding: msg.imageUrl ? "4px 4px 4px 4px" : "10px 14px",
                          overflow: "hidden",
                        }}>
                          {showName && msg.agentName && <p className="text-[15px] font-bold mb-1" style={{ color: "#53BDEB", padding: msg.imageUrl ? "6px 10px 0" : undefined }}>{msg.agentName}</p>}
                          {msg.imageUrl ? (
                            <div>
                              <img src={msg.imageUrl} alt="Orçamento" className="rounded-lg w-full max-w-[320px]" style={{ marginBottom: 4 }} />
                              <div className="flex items-center justify-end gap-1.5 px-2 pb-1">
                                <span className="text-[15px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                                  {new Date(msg.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                                </span>
                                {!isAgent && <span className="text-[15px]" style={{ color: "#34B7F1" }}>✓✓</span>}
                              </div>
                            </div>
                          ) : (
                            <>
                              <p className="text-[15px] leading-[1.6]">{msg.content.replace("[TRANSFERIR]", "").trim()}</p>
                              <div className="flex items-center justify-end gap-1.5 mt-1">
                                <span className="text-[15px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                                  {new Date(msg.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                                </span>
                                {!isAgent && <span className="text-[15px]" style={{ color: "#34B7F1" }}>✓✓</span>}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Lead info bar */}
                {selectedLead.motivoPerda && (
                  <div className="px-5 py-2 flex items-center gap-2" style={{ background: "rgba(239,68,68,0.05)", borderTop: "1px solid rgba(239,68,68,0.1)" }}>
                    <AlertTriangle className="w-3.5 h-3.5" style={{ color: "#EF4444" }} />
                    <p className="text-[15px]" style={{ color: "#EF4444" }}>Perda: {selectedLead.motivoPerda.slice(0, 100)}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-3" style={{ background: "#0B141A" }}>
                <Brain className="w-10 h-10" style={{ color: "rgba(255,255,255,0.05)" }} />
                <p className="text-[15px]" style={{ color: "#94A3B8" }}>Selecione um lead para ver a conversa</p>
              </div>
            )}
          </div>

          {/* RIGHT: KPIs + Feed */}
          {running && !isMobile && (
            <div className="w-[240px] shrink-0 space-y-3 overflow-y-auto custom-scrollbar">
              {[
                { label: "Leads", value: animLeads, color: "#3B82F6", icon: "👥" },
                { label: "Fechados", value: animClosed, color: "#10B981", icon: "✅" },
                { label: "Receita", value: `R$${animReceita}k`, color: "#EAB308", icon: "💰" },
              ].map(k => (
                <div key={k.label} className="relative rounded-2xl overflow-hidden" style={{ background: "rgba(13,18,32,0.9)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: `linear-gradient(90deg, transparent, ${k.color}, transparent)` }} />
                  <div className="p-3.5 text-center">
                    <p className="text-[22px] font-extrabold tabular-nums" style={{ color: k.color }}>{k.value}</p>
                    <p className="text-[15px] uppercase tracking-[0.12em]" style={{ color: "#94A3B8" }}>{k.icon} {k.label}</p>
                  </div>
                </div>
              ))}
              {/* 3 Dimensões — Scorecard ao vivo */}
              <div className="relative rounded-2xl overflow-hidden" style={{ background: "rgba(13,18,32,0.9)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: "linear-gradient(90deg, #EC4899, #F59E0B, #06B6D4)" }} />
                <div className="p-3.5">
                  <p className="text-[15px] uppercase tracking-[0.12em] font-bold text-center mb-2" style={{ color: "#94A3B8" }}>📊 3 Dimensões</p>
                  {[
                    { label: "Humanização", value: avgHumanizacao, color: "#EC4899" },
                    { label: "Eficácia", value: avgEficacia, color: "#F59E0B" },
                    { label: "Técnica", value: avgTecnica, color: "#06B6D4" },
                  ].map(d => (
                    <div key={d.label} className="flex items-center gap-2 py-1">
                      <span className="text-[15px] w-16 shrink-0" style={{ color: d.color }}>{d.label}</span>
                      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${d.value}%`, background: d.color }} />
                      </div>
                      <span className="text-[15px] font-extrabold tabular-nums w-8 text-right" style={{ color: d.color }}>{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Conversion gauge */}
              <div className="rounded-2xl p-4 text-center" style={{ background: "rgba(13,18,32,0.9)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="relative w-18 h-18 mx-auto" style={{ width: 72, height: 72 }}>
                  <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                    <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="3" />
                    <circle cx="18" cy="18" r="15" fill="none" stroke={sentimentColor(conversionRate)}
                      strokeWidth="3" strokeDasharray={`${conversionRate * 0.94} 100`} strokeLinecap="round" className="transition-all duration-500"
                      style={{ filter: `drop-shadow(0 0 4px ${sentimentColor(conversionRate)})` }} />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-[16px] font-extrabold" style={{ color: "#F1F5F9" }}>{conversionRate}%</span>
                </div>
                <p className="text-[15px] uppercase tracking-[0.12em] mt-1.5" style={{ color: "#94A3B8" }}>Conversão</p>
              </div>
              {/* Feed */}
              <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(13,18,32,0.9)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <p className="text-[15px] uppercase tracking-[0.12em] font-bold px-4 py-2.5" style={{ color: "#94A3B8", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>Feed ao vivo</p>
                <div className="max-h-[200px] overflow-y-auto custom-scrollbar">
                  {events.map(e => (
                    <div key={e.id} className="flex items-start gap-2.5 px-4 py-2 animate-in slide-in-from-top-1 duration-200" style={{ borderBottom: "1px solid rgba(255,255,255,0.02)" }}>
                      <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: e.color, boxShadow: `0 0 4px ${e.color}40` }} />
                      <div>
                        <p className="text-[15px]" style={{ color: "#E2E8F0" }}>{e.text}</p>
                        <p className="text-[15px]" style={{ color: "#94A3B8" }}>{e.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Report: Números */}
      {phase === "report" && !running && reportTab === "numeros" && (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className={cn("grid gap-3", isMobile ? "grid-cols-2" : "grid-cols-4 md:grid-cols-8")}>
            {[
              { label: "Leads", value: leads.length, color: "#3B82F6" },
              { label: "Fechados", value: closedLeads.length, color: "#10B981" },
              { label: "Perdidos", value: lostLeads.length, color: "#EF4444" },
              { label: "Receita", value: `R$${Math.round(totalReceita / 1000)}k`, color: "#EAB308" },
              { label: "Conversão", value: `${conversionRate}%`, color: conversionRate >= 50 ? "#10B981" : "#F59E0B" },
              { label: "Ticket Médio", value: `R$${Math.round(ticketMedio / 1000)}k`, color: "#8B5CF6" },
              { label: "Objeções", value: `${totalContornadas}/${totalObjecoes}`, color: "#F59E0B" },
              { label: "Sentimento", value: avgSentimento, color: sentimentColor(avgSentimento) },
            ].map(k => (
              <div key={k.label} className="relative rounded-2xl overflow-hidden" style={{ background: "rgba(13,18,32,0.9)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: `linear-gradient(90deg, transparent, ${k.color}, transparent)` }} />
                <div className="p-3 text-center">
                  <p className="text-[18px] font-extrabold tabular-nums" style={{ color: k.color }}>{k.value}</p>
                  <p className="text-[15px] uppercase tracking-[0.12em]" style={{ color: "#94A3B8" }}>{k.label}</p>
                </div>
              </div>
            ))}
          </div>
          {/* By profile */}
          <div className="rounded-2xl p-5" style={{ background: "rgba(13,18,32,0.9)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-[15px] uppercase tracking-[0.1em] font-bold mb-4" style={{ color: "#94A3B8" }}>Desempenho por Perfil Psicológico</p>
            {PERFIS_INTELIGENTES.map(p => {
              const pLeads = leads.filter(l => l.perfil.tipo === p.tipo);
              const pClosed = pLeads.filter(l => l.status === "fechou");
              const rate = pLeads.length > 0 ? Math.round((pClosed.length / pLeads.length) * 100) : 0;
              const avgS = pLeads.length > 0 ? Math.round(pLeads.reduce((s, l) => s + l.sentimentoScore, 0) / pLeads.length) : 0;
              if (pLeads.length === 0) return null;
              return (
                <div key={p.tipo} className={cn("py-2.5", isMobile ? "flex flex-col gap-1" : "flex items-center gap-3")} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{p.emoji}</span>
                    <span className="text-[15px] font-bold" style={{ color: p.cor }}>{p.label}</span>
                    <span className="text-[15px] ml-auto" style={{ color: "#94A3B8" }}>{pLeads.length} leads</span>
                    <span className="text-[15px] font-semibold" style={{ color: "#10B981" }}>{pClosed.length}✓</span>
                    <span className="text-[15px]" style={{ color: sentimentColor(avgS) }}>♥{avgS}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${rate}%`, background: `linear-gradient(90deg, ${rate >= 50 ? "#10B981" : rate >= 30 ? "#F59E0B" : "#EF4444"}, ${rate >= 50 ? "#06D6A0" : rate >= 30 ? "#FBBF24" : "#F87171"})` }} />
                    </div>
                    <span className="text-[15px] font-extrabold tabular-nums w-12 text-right" style={{ color: rate >= 50 ? "#10B981" : rate >= 30 ? "#F59E0B" : "#EF4444" }}>{rate}%</span>
                  </div>
                </div>
              );
            })}
          </div>
          {/* Losses by stage */}
          {lostLeads.length > 0 && (
            <div className="rounded-2xl p-5" style={{ background: "rgba(13,18,32,0.9)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="text-[15px] uppercase tracking-[0.1em] font-bold mb-4" style={{ color: "#EF4444" }}>Perdas Motivadas por IA</p>
              {lostLeads.slice(0, 10).map(l => (
                <div key={l.id} className="flex items-start gap-3 py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                  <span className="text-sm">{l.perfil.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[15px] font-bold" style={{ color: "#E2E8F0" }}>{l.nome}</span>
                      <span className="text-[15px] px-1.5 py-0.5 rounded" style={{ background: "rgba(239,68,68,0.08)", color: "#EF4444" }}>{l.etapaPerda}</span>
                    </div>
                    <p className="text-[15px] mt-0.5" style={{ color: "#94A3B8" }}>"{l.motivoPerda?.slice(0, 120)}"</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Report: Debrief */}
      {phase === "report" && !running && reportTab === "debrief" && (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-500">
          {debriefLoading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#8B5CF6" }} />
              <p className="text-[15px]" style={{ color: "#94A3B8" }}>NATH.AI analisando simulação com leads inteligentes...</p>
            </div>
          )}
          {!debriefLoading && !debrief && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <AlertTriangle className="w-8 h-8" style={{ color: "#F59E0B" }} />
              <p className="text-[15px]" style={{ color: "#94A3B8" }}>O debrief não foi gerado. Clique abaixo para tentar novamente.</p>
              <button onClick={generateDebrief} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[15px] font-bold transition-all hover:scale-[1.03]"
                style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.15), rgba(99,102,241,0.15))", border: "1px solid rgba(139,92,246,0.25)", color: "#8B5CF6" }}>
                <Brain className="w-4 h-4" /> Gerar Debrief IA
              </button>
            </div>
          )}
          {debrief && (
            <>
              {/* Header */}
              <div className="rounded-2xl p-5 relative overflow-hidden" style={{ background: "#0D1220", border: "1px solid rgba(30,41,59,0.5)" }}>
                <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: `linear-gradient(90deg, transparent, ${sentimentColor(debrief.scoreGeral)}, transparent)` }} />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Brain className="w-5 h-5" style={{ color: "#8B5CF6" }} />
                    <div>
                      <p className="text-[15px] font-bold" style={{ color: "#F1F5F9" }}>Debrief da Simulação</p>
                      <p className="text-[15px]" style={{ color: "#94A3B8" }}>{new Date().toLocaleDateString("pt-BR")} · {leads.length} leads · {closedLeads.length} fechados</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={generateDebrief} className="text-[15px] px-4 py-2 rounded-xl font-semibold transition-all hover:scale-[1.02]"
                      style={{ border: "1px solid rgba(255,255,255,0.06)", color: "#94A3B8", background: "rgba(255,255,255,0.02)" }}>
                      <Loader2 className={cn("w-3 h-3 inline mr-1.5", debriefLoading && "animate-spin")} /> Reanalisar
                    </button>
                    {debrief.melhorias.filter(m => m.status === "pending").length > 0 && (
                      <button onClick={approveAll} className="text-[15px] px-4 py-2 rounded-xl font-bold transition-all hover:scale-105"
                        style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.15), rgba(6,182,212,0.15))", color: "#10B981", border: "1px solid rgba(16,185,129,0.25)" }}>
                        Aprovar todas ({debrief.melhorias.filter(m => m.status === "pending").length})
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Score + 3 Dimensões + Summary */}
              <div className={cn(isMobile ? "flex flex-col gap-3" : "flex gap-4")}>
                <div className="rounded-2xl p-6 text-center relative overflow-hidden" style={{ background: "rgba(13,18,32,0.9)", border: "1px solid rgba(255,255,255,0.06)", minWidth: 180 }}>
                  <div className="relative w-[72px] h-[72px] mx-auto">
                    <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                      <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="3" />
                      <circle cx="18" cy="18" r="15" fill="none" stroke={sentimentColor(debrief.scoreGeral)}
                        strokeWidth="3" strokeDasharray={`${debrief.scoreGeral * 0.94} 100`} strokeLinecap="round"
                        style={{ filter: `drop-shadow(0 0 6px ${sentimentColor(debrief.scoreGeral)})` }} />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-[22px] font-extrabold" style={{ color: sentimentColor(debrief.scoreGeral) }}>{debrief.scoreGeral}</span>
                  </div>
                  <p className="text-[15px] uppercase tracking-[0.12em] mt-2" style={{ color: "#94A3B8" }}>Score Geral</p>
                  {debrief.dimensoes && (
                    <div className="mt-4 space-y-2">
                      {[
                        { label: "Humanização", score: debrief.dimensoes.humanizacao.score, color: "#EC4899" },
                        { label: "Eficácia", score: debrief.dimensoes.eficaciaComercial.score, color: "#F59E0B" },
                        { label: "Técnica", score: debrief.dimensoes.qualidadeTecnica.score, color: "#06B6D4" },
                      ].map(d => (
                        <div key={d.label}>
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[15px]" style={{ color: d.color }}>{d.label}</span>
                            <span className="text-[15px] font-extrabold tabular-nums" style={{ color: d.color }}>{d.score}</span>
                          </div>
                          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
                            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${d.score}%`, background: d.color }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-3">
                  <div className="rounded-2xl p-4" style={{ background: "rgba(13,18,32,0.9)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <p className="text-[15px] leading-[1.7]" style={{ color: "#E2E8F0" }}>{debrief.resumoExecutivo}</p>
                  </div>
                  {debrief.fraseNathAI && (
                    <div className="rounded-2xl p-4 relative overflow-hidden" style={{ background: "rgba(16,185,129,0.04)", border: "1px solid rgba(16,185,129,0.1)" }}>
                      <p className="text-[15px] italic" style={{ color: "#10B981" }}>"{debrief.fraseNathAI}"</p>
                      <p className="text-[15px] mt-1.5 font-bold" style={{ color: "#94A3B8" }}>— NATH.AI</p>
                    </div>
                  )}
                  {debrief.dimensoes && (
                    <div className="rounded-2xl p-4" style={{ background: "rgba(13,18,32,0.9)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <p className="text-[15px] uppercase tracking-[0.1em] font-bold mb-3" style={{ color: "#8B5CF6" }}>📋 12 Critérios de Excelência</p>
                      {([
                        { key: "humanizacao" as const, label: "Humanização", color: "#EC4899", criterioIds: ["rapport", "personalizacao", "tomVoz", "surpresa"] },
                        { key: "eficaciaComercial" as const, label: "Eficácia Comercial", color: "#F59E0B", criterioIds: ["identificacaoPerfil", "progressaoFunil", "manejoObjecoes", "antecipacao"] },
                        { key: "qualidadeTecnica" as const, label: "Qualidade Técnica", color: "#06B6D4", criterioIds: ["clarezaEscrita", "conhecimentoProduto", "coerencia", "timing"] },
                      ]).map(dim => {
                        const dimData = debrief.dimensoes![dim.key];
                        return (
                          <div key={dim.key} className="mb-3 last:mb-0">
                            <div className="flex items-center gap-2 mb-1.5">
                              <div className="w-2 h-2 rounded-full" style={{ background: dim.color }} />
                              <span className="text-[15px] font-bold" style={{ color: dim.color }}>{dim.label}</span>
                              <span className="text-[15px] font-extrabold ml-auto" style={{ color: dim.color }}>{dimData.score}</span>
                            </div>
                            <div className={cn("gap-x-4 gap-y-1 pl-4", isMobile ? "grid grid-cols-1" : "grid grid-cols-2")}>
                              {dim.criterioIds.map(cId => {
                                const criterio = dimData.criterios[cId];
                                const nome = CRITERIOS_AVALIACAO.find(c => c.id === cId)?.nome || cId;
                                if (!criterio) return (
                                  <div key={cId} className="flex items-center justify-between">
                                    <span className="text-[15px]" style={{ color: "#94A3B8" }}>{nome}</span>
                                    <span className="text-[15px]" style={{ color: "#94A3B8" }}>—</span>
                                  </div>
                                );
                                const nivelInfo = getNivel(criterio.score);
                                return (
                                  <div key={cId} className="flex items-center justify-between group" title={criterio.evidencia}>
                                    <span className="text-[15px]" style={{ color: "#94A3B8" }}>{nome}</span>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[15px] font-semibold px-1.5 py-0.5 rounded" style={{ background: `${nivelInfo.cor}10`, color: nivelInfo.cor }}>{nivelInfo.nivel}</span>
                                      <span className="text-[15px] font-bold tabular-nums" style={{ color: nivelInfo.cor }}>{criterio.score}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Pontos Fortes */}
              {debrief.pontosFortes.length > 0 && (
                <div className="rounded-2xl p-5" style={{ background: "rgba(13,18,32,0.9)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <p className="text-[15px] uppercase tracking-[0.1em] font-bold mb-3" style={{ color: "#10B981" }}>✅ Pontos Fortes</p>
                  {debrief.pontosFortes.slice(0, 4).map((p, i) => (
                    <div key={`forte-${i}`} className="flex items-start gap-2.5 py-1.5">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#10B981" }} />
                      <p className="text-[15px] leading-relaxed" style={{ color: "#E2E8F0" }}>{p}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* === MELHORIAS — O CORAÇÃO DO DEBRIEF === */}
              <div className="rounded-2xl p-5" style={{ background: "rgba(13,18,32,0.9)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <p className="text-[15px] uppercase tracking-[0.1em] font-bold" style={{ color: "#F59E0B" }}>🔧 Melhorias Sugeridas</p>
                    <div className="flex gap-2">
                      {Object.entries(TIPO_COLORS).map(([key, val]) => {
                        const count = debrief.melhorias.filter(m => m.tipo === key).length;
                        if (count === 0) return null;
                        return <span key={key} className="text-[15px] px-2 py-0.5 rounded-full font-semibold" style={{ background: val.bg, color: val.color }}>{val.icon} {val.label} ({count})</span>;
                      })}
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  {debrief.melhorias.map(m => {
                    const tipoInfo = TIPO_COLORS[m.tipo] || TIPO_COLORS.instrucao_prompt;
                    const isAnalyzing = m.status === "analyzing";
                    const isApproved = m.status === "approved";
                    const isRejected = m.status === "rejected";
                    const isPending = m.status === "pending";
                    const hasDeepAnalysis = !!m.deepAnalysis;

                    const isExpanded = expandedMelhoriaId === m.id;

                    return (
                      <div key={m.id} className="rounded-xl overflow-hidden transition-all duration-300" style={{
                        border: `1px solid ${isApproved ? "rgba(16,185,129,0.25)" : isRejected ? "rgba(239,68,68,0.15)" : isAnalyzing ? "rgba(139,92,246,0.25)" : isExpanded ? "rgba(245,158,11,0.3)" : "rgba(245,158,11,0.15)"}`,
                        opacity: isRejected ? 0.5 : 1,
                      }}>
                        {/* Card header bar */}
                        <div className="h-[2px]" style={{ background: isApproved ? "#10B981" : isRejected ? "#EF4444" : isAnalyzing ? "#8B5CF6" : "#F59E0B" }} />

                        {/* Clickable header */}
                        <div
                          className="p-4 cursor-pointer transition-colors hover:brightness-110"
                          style={{ background: isApproved ? "rgba(16,185,129,0.03)" : isExpanded ? "rgba(255,255,255,0.025)" : "rgba(255,255,255,0.015)" }}
                          onClick={() => setExpandedMelhoriaId(isExpanded ? null : m.id)}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                <p className="text-[15px] font-bold" style={{ color: "#F1F5F9" }}>{m.titulo}</p>
                                <span className="text-[15px] font-bold px-2 py-0.5 rounded-full" style={{ background: tipoInfo.bg, color: tipoInfo.color }}>
                                  {tipoInfo.icon} {tipoInfo.label}
                                </span>
                                <span className="text-[15px] font-bold uppercase px-2 py-0.5 rounded-full"
                                  style={{ background: m.prioridade === "alta" ? "rgba(239,68,68,0.08)" : m.prioridade === "media" ? "rgba(245,158,11,0.08)" : "rgba(59,130,246,0.08)", color: m.prioridade === "alta" ? "#EF4444" : m.prioridade === "media" ? "#F59E0B" : "#3B82F6" }}>{m.prioridade}</span>
                                <span className="text-[15px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(139,92,246,0.08)", color: "#8B5CF6" }}>{m.agente}</span>
                              </div>
                              <p className={cn("text-[15px] leading-relaxed", !isExpanded && "line-clamp-1")} style={{ color: "#94A3B8" }}>{m.desc}</p>
                              {!isExpanded && (
                                <p className="text-[15px] mt-1" style={{ color: "#10B981" }}>📈 Impacto: {m.impacto}</p>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {isApproved && <CheckCircle2 className="w-5 h-5" style={{ color: "#10B981" }} />}
                              {isRejected && <XCircle className="w-5 h-5" style={{ color: "#EF4444" }} />}
                              {isAnalyzing && <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#8B5CF6" }} />}
                              <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", isExpanded && "rotate-180")} style={{ color: "#94A3B8" }} />
                            </div>
                          </div>
                        </div>

                        {/* Expanded detail panel */}
                        {isExpanded && (
                          <div className="px-4 pb-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300" style={{ background: "rgba(255,255,255,0.01)" }}>
                            <div className="h-px" style={{ background: "rgba(255,255,255,0.06)" }} />

                            {/* Full description */}
                            <div className="rounded-xl p-5" style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)" }}>
                              <p className="text-[15px] uppercase font-bold mb-1.5" style={{ color: "#94A3B8" }}>Descrição Completa</p>
                              <p className="text-[15px] leading-[1.8]" style={{ color: "#E2E8F0" }}>{m.desc}</p>
                              <p className="text-[15px] mt-2" style={{ color: "#10B981" }}>📈 Impacto estimado: {m.impacto}</p>
                            </div>

                            {/* Approved state */}
                            {isApproved && (
                              <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.1)" }}>
                                <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "#10B981" }} />
                                <span className="text-[15px] font-semibold" style={{ color: "#10B981" }}>Implementada em {tipoInfo.label} → {m.agente}</span>
                              </div>
                            )}

                            {/* Deep analysis content if available */}
                            {hasDeepAnalysis && m.deepAnalysis && (
                              <>
                                {/* Recommendation + Confidence */}
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="rounded-xl p-3 text-center" style={{
                                    background: m.deepAnalysis.recomendacao === "APROVAR" ? "rgba(16,185,129,0.06)" : m.deepAnalysis.recomendacao === "REJEITAR" ? "rgba(239,68,68,0.06)" : "rgba(245,158,11,0.06)",
                                    border: `1px solid ${m.deepAnalysis.recomendacao === "APROVAR" ? "rgba(16,185,129,0.15)" : m.deepAnalysis.recomendacao === "REJEITAR" ? "rgba(239,68,68,0.15)" : "rgba(245,158,11,0.15)"}`,
                                  }}>
                                    <p className="text-[16px] font-extrabold" style={{
                                      color: m.deepAnalysis.recomendacao === "APROVAR" ? "#10B981" : m.deepAnalysis.recomendacao === "REJEITAR" ? "#EF4444" : "#F59E0B"
                                    }}>{m.deepAnalysis.recomendacao}</p>
                                    <p className="text-[15px] uppercase" style={{ color: "#94A3B8" }}>Recomendação</p>
                                  </div>
                                  <div className="rounded-xl p-3 text-center" style={{ background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.15)" }}>
                                    <p className="text-[16px] font-extrabold" style={{ color: "#8B5CF6" }}>{m.deepAnalysis.confianca}%</p>
                                    <p className="text-[15px] uppercase" style={{ color: "#94A3B8" }}>Confiança</p>
                                  </div>
                                </div>

                                {/* Full analysis */}
                                <div className="rounded-xl p-4" style={{ background: "#111827", maxHeight: 200, overflow: "auto" }}>
                                  <p className="text-[15px] uppercase font-bold mb-1" style={{ color: "#94A3B8" }}>Análise Completa</p>
                                  <p className="text-[15px] leading-[1.8]" style={{ color: "#D1D5DB" }}>{m.deepAnalysis.analiseCompleta}</p>
                                </div>

                                {/* Reasoning chain */}
                                {m.deepAnalysis.linhaRaciocinio?.length > 0 && (
                                  <div className="rounded-xl p-5" style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)" }}>
                                    <p className="text-[15px] uppercase font-bold mb-2" style={{ color: "#94A3B8" }}>Linha de Raciocínio</p>
                                    <div className="flex items-start gap-2 flex-wrap">
                                      {m.deepAnalysis.linhaRaciocinio.map((step, i) => (
                                        <div key={`step-${i}`} className="flex items-center gap-2">
                                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[15px] font-bold shrink-0" style={{
                                            background: `hsl(${260 + i * 30}, 70%, 50%)`, color: "#fff"
                                          }}>{i + 1}</div>
                                          <p className="text-[15px]" style={{ color: "#E2E8F0" }}>{step}</p>
                                          {i < m.deepAnalysis!.linhaRaciocinio.length - 1 && <span className="text-[15px]" style={{ color: "#94A3B8" }}>→</span>}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Impact 4 dimensions */}
                                {m.deepAnalysis.impactoNumeros && (
                                  <div className="grid grid-cols-4 gap-2">
                                    {[
                                      { key: "conversao", label: "Conversão", icon: "📊", color: "#3B82F6" },
                                      { key: "receita", label: "Receita", icon: "💰", color: "#10B981" },
                                      { key: "satisfacao", label: "Satisfação", icon: "💗", color: "#EC4899" },
                                      { key: "eficiencia", label: "Eficiência", icon: "⚡", color: "#F59E0B" },
                                    ].map(dim => (
                                      <div key={dim.key} className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)" }}>
                                        <p className="text-[15px] uppercase font-bold" style={{ color: dim.color }}>{dim.icon} {dim.label}</p>
                                        <p className="text-[15px] mt-1" style={{ color: "#E2E8F0" }}>{(m.deepAnalysis!.impactoNumeros as any)[dim.key]}</p>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Psychology */}
                                {m.deepAnalysis.psicologiaCliente && (
                                  <div className="rounded-xl p-4" style={{ background: "rgba(236,72,153,0.04)", border: "1px solid rgba(236,72,153,0.1)" }}>
                                    <p className="text-[15px] uppercase font-bold mb-1" style={{ color: "#EC4899" }}>🧠 Psicologia do Cliente</p>
                                    <p className="text-[15px] leading-relaxed" style={{ color: "#E2E8F0" }}>{m.deepAnalysis.psicologiaCliente}</p>
                                  </div>
                                )}

                                {/* Risks */}
                                {m.deepAnalysis.riscosNaoImplementar && (
                                  <div className="rounded-xl p-4" style={{ background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.1)" }}>
                                    <p className="text-[15px] uppercase font-bold mb-1" style={{ color: "#EF4444" }}>⚠️ Riscos de não implementar</p>
                                    <p className="text-[15px] leading-relaxed" style={{ color: "#E2E8F0" }}>{m.deepAnalysis.riscosNaoImplementar}</p>
                                  </div>
                                )}
                              </>
                            )}

                            {/* Conteúdo sugerido */}
                            {m.conteudoSugerido && (
                              <div>
                                <p className="text-[15px] uppercase font-bold mb-1.5" style={{ color: "#94A3B8" }}>
                                  <Edit3 className="w-3 h-3 inline mr-1" />Conteúdo sugerido {isPending ? "(editável)" : ""}
                                </p>
                                {isPending ? (
                                  <textarea
                                    value={m.editedContent ?? m.conteudoSugerido}
                                    onChange={e => updateImprovementContent(m.id, e.target.value)}
                                    onClick={e => e.stopPropagation()}
                                    className="w-full rounded-xl text-[15px] p-4 resize-y"
                                    rows={4}
                                    style={{ background: "#111827", color: "#E2E8F0", border: "1px solid rgba(255,255,255,0.08)", outline: "none" }}
                                  />
                                ) : (
                                  <div className="rounded-xl p-4" style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}>
                                    <p className="text-[15px] leading-[1.8]" style={{ color: "#E2E8F0" }}>{m.editedContent || m.conteudoSugerido}</p>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Action buttons for pending */}
                            {isPending && (
                              <div className="flex gap-3" onClick={e => e.stopPropagation()}>
                                {!hasDeepAnalysis && (
                                  <button onClick={() => runDeepAnalysis(m.id)}
                                    className="px-5 py-3 rounded-xl text-[15px] font-bold transition-all hover:scale-[1.02]"
                                    style={{ color: "#8B5CF6", border: "1px solid rgba(139,92,246,0.2)", background: "rgba(139,92,246,0.05)" }}>
                                    <Search className="w-4 h-4 inline mr-1.5" />Análise Profunda
                                  </button>
                                )}
                                <button onClick={() => handleImprovement(m.id, "approved")}
                                  className="flex-1 py-3 rounded-xl text-[15px] font-bold transition-all hover:scale-[1.02]"
                                  style={{ background: "linear-gradient(135deg, #10B981, #06B6D4)", color: "#000" }}>
                                  <CheckCircle2 className="w-4 h-4 inline mr-1.5" />Aprovar e implementar
                                </button>
                                <button onClick={() => handleImprovement(m.id, "rejected")}
                                  className="px-6 py-3 rounded-xl text-[15px] font-bold transition-all hover:scale-[1.02]"
                                  style={{ color: "#EF4444", border: "1px solid rgba(239,68,68,0.2)", background: "transparent" }}>
                                  Rejeitar
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Lacunas + Insights side by side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {debrief.lacunasConhecimento.length > 0 && (
                  <div className="rounded-2xl p-5" style={{ background: "rgba(13,18,32,0.9)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <p className="text-[15px] uppercase tracking-[0.1em] font-bold mb-3" style={{ color: "#F59E0B" }}>
                      <BookOpen className="w-3.5 h-3.5 inline mr-1.5" />Lacunas de Conhecimento
                    </p>
                    {debrief.lacunasConhecimento.map((l, i) => (
                      <div key={`lacuna-${i}`} className="flex items-start gap-2.5 py-2 group" style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "#F59E0B" }} />
                        <p className="text-[15px] flex-1" style={{ color: "#E2E8F0" }}>{l}</p>
                        <button onClick={() => convertLacunaToKB(l)}
                          className="text-[15px] px-2 py-1 rounded-lg font-semibold opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                          style={{ background: "rgba(59,130,246,0.08)", color: "#3B82F6", border: "1px solid rgba(59,130,246,0.15)" }}>
                          📚 Criar KB
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {debrief.insightsCliente.length > 0 && (
                  <div className="rounded-2xl p-5" style={{ background: "rgba(13,18,32,0.9)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <p className="text-[15px] uppercase tracking-[0.1em] font-bold mb-3" style={{ color: "#06B6D4" }}>
                      <Lightbulb className="w-3.5 h-3.5 inline mr-1.5" />Insights de Comportamento
                    </p>
                    {debrief.insightsCliente.map((ins, i) => (
                      <div key={`insight-${i}`} className="flex items-start gap-2.5 py-2 group" style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                        <Lightbulb className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "#06B6D4" }} />
                        <p className="text-[15px] flex-1" style={{ color: "#E2E8F0" }}>{ins}</p>
                        <button onClick={() => convertInsightToImprovement(ins)}
                          className="text-[15px] px-2 py-1 rounded-lg font-semibold opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                          style={{ background: "rgba(245,158,11,0.08)", color: "#F59E0B", border: "1px solid rgba(245,158,11,0.15)" }}>
                          🔧 Usar como melhoria
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Simulation History */}
              {simHistory.length > 1 && (
                <div className="rounded-2xl p-5" style={{ background: "rgba(13,18,32,0.9)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <p className="text-[15px] uppercase tracking-[0.1em] font-bold mb-4" style={{ color: "#94A3B8" }}>
                    <TrendingUp className="w-3.5 h-3.5 inline mr-1.5" />Histórico de Simulações
                  </p>
                  <div className="flex items-end gap-2" style={{ height: 80 }}>
                    {simHistory.slice(0, 10).reverse().map((h, i) => {
                      const maxScore = Math.max(...simHistory.slice(0, 10).map(s => s.scoreGeral), 1);
                      const height = (h.scoreGeral / maxScore) * 100;
                      return (
                        <div key={h.id} className="flex-1 flex flex-col items-center gap-1 group relative">
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-[15px] px-2 py-1 rounded-lg whitespace-nowrap z-10"
                            style={{ background: "#1E293B", color: "#E2E8F0", border: "1px solid rgba(255,255,255,0.1)" }}>
                            {new Date(h.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} · {h.conversao}% conv · {h.melhorias_aprovadas?.length || 0} mel.
                          </div>
                          <div className="w-full rounded-t transition-all duration-300 hover:opacity-80" style={{
                            height: `${height}%`,
                            background: `linear-gradient(180deg, ${sentimentColor(h.scoreGeral)}, ${sentimentColor(h.scoreGeral)}40)`,
                            minHeight: 4,
                          }} />
                          <span className="text-[15px] font-bold tabular-nums" style={{ color: sentimentColor(h.scoreGeral) }}>{h.scoreGeral}</span>
                        </div>
                      );
                    })}
                  </div>
                  {simHistory.length >= 2 && (
                    <div className="flex items-center gap-2 mt-3 px-3 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.02)" }}>
                      <TrendingUp className="w-3 h-3" style={{ color: simHistory[0].scoreGeral >= simHistory[1].scoreGeral ? "#10B981" : "#EF4444" }} />
                      <p className="text-[15px]" style={{ color: "#94A3B8" }}>
                        Delta: <span style={{ color: simHistory[0].scoreGeral >= simHistory[1].scoreGeral ? "#10B981" : "#EF4444", fontWeight: 700 }}>
                          {simHistory[0].scoreGeral >= simHistory[1].scoreGeral ? "+" : ""}{simHistory[0].scoreGeral - simHistory[1].scoreGeral} pontos
                        </span> vs simulação anterior
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
