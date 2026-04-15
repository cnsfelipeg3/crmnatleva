import { AGENTS_V4, SQUADS } from "@/components/ai-team/agentsV4Data";
import { getAgentTraining } from "@/components/ai-team/agentTrainingStore";
import { buildUnifiedAgentPrompt } from "@/utils/buildAgentPrompt";
import { supabase } from "@/integrations/supabase/client";
import {
  type LeadInteligente, type MensagemLead,
  ETAPAS_FUNIL,
  buildLeadPersona, buildConversaContext, buildFirstMessagePrompt, buildObjecaoPrompt,
  buildMensagemPerdaPrompt,
  atualizarEstadoEmocional, devePerdeLead,
} from "./intelligentLeads";

// ===== API — Roteamento inteligente por tipo de chamada =====
export type SimCallType = "lead" | "agent" | "evaluate" | "debrief" | "objection" | "loss" | "deep" | "price_image";

const SIMULATOR_MAX_CONCURRENT_REQUESTS = 2;
const SIMULATOR_REQUEST_GAP_MS = 1200;
const SIMULATOR_INPUT_TOKEN_BUDGET_PER_MIN = 18000;
const SIMULATOR_INPUT_WINDOW_MS = 60_000;
const SIMULATOR_COOLDOWN_ON_429_MS = 25_000;
let activeSimulatorRequests = 0;
let lastSimulatorRequestAt = 0;
let simulatorCooldownUntil = 0;
const simulatorRequestQueue: Array<() => void> = [];
const simulatorTokenUsage: Array<{ timestamp: number; tokens: number }> = [];

function pumpSimulatorQueue() {
  if (activeSimulatorRequests >= SIMULATOR_MAX_CONCURRENT_REQUESTS || simulatorRequestQueue.length === 0) {
    return;
  }

  const now = Date.now();
  const waitMs = Math.max(
    0,
    lastSimulatorRequestAt + SIMULATOR_REQUEST_GAP_MS - now,
    simulatorCooldownUntil - now,
  );

  if (waitMs > 0) {
    setTimeout(pumpSimulatorQueue, waitMs);
    return;
  }

  activeSimulatorRequests += 1;
  lastSimulatorRequestAt = Date.now();
  simulatorRequestQueue.shift()?.();
}

async function withSimulatorRequestSlot<T>(task: () => Promise<T>): Promise<T> {
  await new Promise<void>((resolve) => {
    simulatorRequestQueue.push(resolve);
    pumpSimulatorQueue();
  });

  try {
    return await task();
  } finally {
    activeSimulatorRequests = Math.max(0, activeSimulatorRequests - 1);
    pumpSimulatorQueue();
  }
}

function estimateTextTokens(text: string) {
  return Math.ceil(text.length / 3.5);
}

function pruneSimulatorTokenUsage(now = Date.now()) {
  while (simulatorTokenUsage.length > 0 && now - simulatorTokenUsage[0].timestamp > SIMULATOR_INPUT_WINDOW_MS) {
    simulatorTokenUsage.shift();
  }
}

async function waitForSimulatorCooldown() {
  while (Date.now() < simulatorCooldownUntil) {
    await new Promise((resolve) => setTimeout(resolve, Math.max(500, simulatorCooldownUntil - Date.now())));
  }
}

async function waitForSimulatorTokenBudget(estimatedTokens: number) {
  while (true) {
    const now = Date.now();
    pruneSimulatorTokenUsage(now);
    const usedTokens = simulatorTokenUsage.reduce((sum, entry) => sum + entry.tokens, 0);

    if (usedTokens + estimatedTokens <= SIMULATOR_INPUT_TOKEN_BUDGET_PER_MIN || simulatorTokenUsage.length === 0) {
      simulatorTokenUsage.push({ timestamp: now, tokens: estimatedTokens });
      return;
    }

    const oldest = simulatorTokenUsage[0];
    const waitMs = Math.max(1000, SIMULATOR_INPUT_WINDOW_MS - (now - oldest.timestamp) + 100);
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
}

function registerSimulator429(retryCount: number) {
  simulatorCooldownUntil = Math.max(
    simulatorCooldownUntil,
    Date.now() + SIMULATOR_COOLDOWN_ON_429_MS + retryCount * 5000,
  );
}

function compactText(text: string, maxChars: number) {
  const normalized = text.replace(/\s+/g, " ").trim();
  return normalized.length > maxChars ? `${normalized.slice(0, maxChars)}...` : normalized;
}

function compactSystemPromptForTransport(sysPrompt: string, type: SimCallType, retryCount: number) {
  // CRITICAL: Agent prompts are NEVER truncated — this was the root cause of auto vs manual divergence
  if (type === "agent") {
    return sysPrompt;
  }

  const maxCharsByType: Record<SimCallType, number> = {
    lead: retryCount >= 1 ? 900 : 1200,
    agent: 999999, // never reached due to early return above
    evaluate: 700,
    debrief: retryCount >= 1 ? 900 : 1200,
    objection: 850,
    loss: 850,
    deep: retryCount >= 1 ? 900 : 1100,
    price_image: 700,
  };

  return compactText(sysPrompt, maxCharsByType[type]);
}

function compactHistoryForTransport(history: { role: string; content: string }[], type: SimCallType, retryCount: number) {
  // Agent type: send more history to preserve conversation memory
  if (type === "agent") {
    const maxMessages = retryCount >= 1 ? 6 : 10;
    const maxCharsPerMessage = retryCount >= 1 ? 350 : 500;
    return history.slice(-maxMessages).map((message) => ({
      role: message.role,
      content: compactText(message.content, maxCharsPerMessage),
    }));
  }

  const maxMessagesByType: Record<SimCallType, number> = {
    lead: 1,
    agent: 10, // not reached
    evaluate: 1,
    debrief: 1,
    objection: 1,
    loss: 1,
    deep: 1,
    price_image: 1,
  };
  const maxCharsPerMessageByType: Record<SimCallType, number> = {
    lead: 550,
    agent: 500, // not reached
    evaluate: 800,
    debrief: retryCount >= 1 ? 1000 : 1400,
    objection: 420,
    loss: 420,
    deep: retryCount >= 1 ? 850 : 1000,
    price_image: 1500,
  };

  const maxMessages = maxMessagesByType[type];
  const maxCharsPerMessage = maxCharsPerMessageByType[type];

  return history.slice(-maxMessages).map((message) => ({
    role: message.role,
    content: compactText(message.content, maxCharsPerMessage),
  }));
}

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

export async function callSimulatorAI(sysPrompt: string, history: { role: string; content: string }[], type: SimCallType = "agent", agentBehaviorPrompt?: string, _retryCount = 0, providerOverride?: string): Promise<string> {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/simulator-ai`;
  const compactSystemPrompt = compactSystemPromptForTransport(sysPrompt, type, _retryCount);
  const compactAgentBehaviorPrompt = compactText(agentBehaviorPrompt || "", _retryCount >= 1 ? 400 : 700);
  const requestHistory = compactHistoryForTransport(history, type, _retryCount);
  const estimatedInputTokens = estimateTextTokens(
    compactSystemPrompt + compactAgentBehaviorPrompt + requestHistory.map((item) => item.content).join(" "),
  );

  await waitForSimulatorCooldown();
  await waitForSimulatorTokenBudget(estimatedInputTokens);

  const resp = await withSimulatorRequestSlot(() => fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
    body: JSON.stringify({
      type,
      systemPrompt: compactSystemPrompt,
      history: requestHistory,
      agentBehaviorPrompt: compactAgentBehaviorPrompt,
      provider: providerOverride || "lovable",
    }),
  }));

  if (resp.status === 429 && _retryCount < 2) {
    registerSimulator429(_retryCount);
    await waitForSimulatorCooldown();
    return callSimulatorAI(sysPrompt, history, type, agentBehaviorPrompt, _retryCount + 1, providerOverride);
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

  // Post-process: enforce formatting rules the LLM may ignore (e.g. no em-dashes)
  if (type === "agent" || type === "lead" || type === "objection" || type === "loss") {
    text = enforceAgentFormattingRules(text);
  }

  return text;
}

/**
 * Post-processing layer: enforces formatting rules that LLMs sometimes violate.
 * Guarantees 100% compliance for rules like "no em-dash" regardless of model behavior.
 */
function enforceAgentFormattingRules(text: string): string {
  // Strip forced validation openers
  let cleaned = text.replace(/^(Que linda ideia|Adorei isso|Adorei saber disso|Que demais saber que|Que incrível|Adorei essa cena|Adorei essa ideia|Adorei![,!\s]*|Que demais![,!\s]*)[.!,\s]*/i, "");
  cleaned = cleaned.replace(/^([a-zà-ú])/, (_, c) => c.toUpperCase());
  // Remove em-dashes (—) and en-dashes (–) → replace with comma
  cleaned = cleaned.replace(/\s*[—–]\s*/g, ", ");
  // Collapse double commas
  cleaned = cleaned.replace(/,\s*,/g, ",");
  // Remove comma before period
  cleaned = cleaned.replace(/,\s*\./g, ".");
  // Remove leading comma at start of text
  cleaned = cleaned.replace(/^,\s*/, "");
  // Remove bullet point lines
  cleaned = cleaned.replace(/^[\s]*[-*•]\s+.+$/gm, "").replace(/\n{2,}/g, "\n").trim();
  // Remove ESTADO_ metadata
  cleaned = cleaned.replace(/\bESTADO_\w+\b/g, "").trim();
  return cleaned;
}

/**
 * Validate agent response for compliance violations in auto mode.
 * Returns violation list and whether the response should be flagged.
 */
export function validateAutoResponse(text: string, agentName?: string): { violations: string[]; needsWarning: boolean } {
  const violations: string[] = [];
  
  // Check length (300 chars ≈ 60 words)
  if (text.length > 300) {
    violations.push(`resposta longa (${text.length} chars, max 300)`);
  }
  
  // Check bullet points
  if (/^[\s]*[-*•]\s+/m.test(text)) {
    violations.push("bullet points detectados");
  }
  
  // Check agent name leak (not "Nath")
  const agentNames = ["Maya", "Atlas", "Habibi", "Nemo", "Dante", "Luna", "Nero", "Iris"];
  for (const name of agentNames) {
    if (new RegExp(`\\b(sou|sou a|sou o|me chamo|meu nome é|aqui é|aqui é a|aqui é o)\\s+${name}\\b`, "i").test(text)) {
      violations.push(`se apresentou como ${name} (deveria ser Nath)`);
    }
  }
  
  // Check [TRANSFERIR] or ESTADO_ visible
  if (/\[TRANSFERIR\]/.test(text) && text.replace("[TRANSFERIR]", "").trim().length < 20) {
    violations.push("[TRANSFERIR] visível sem mensagem");
  }
  if (/\bESTADO_\w+\b/.test(text)) {
    violations.push("metadado ESTADO_ visível");
  }
  
  // Multiple questions
  const questionCount = (text.match(/\?/g) || []).length;
  if (questionCount > 2) {
    violations.push(`${questionCount} perguntas (max 1-2)`);
  }
  
  return { violations, needsWarning: violations.length > 0 };
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

// Urgency rule injected into ALL commercial agents — HIGHEST PRIORITY
const REGRA_URGENCIA_REFORCADA = `
REGRA DE URGENCIA REFORCADA (PRIORIDADE MAXIMA):
- Se o lead usar QUALQUER desses sinais: "URGENTE", "urgente", "rapido", "RAPIDO", "agora", "AGORA", "pressa", "porfavor" repetido, "??", "!!", letras maiusculas em excesso:
  1. RECONHECA a urgencia IMEDIATAMENTE na sua primeira frase ("Pode deixar, vou resolver isso agora!", "Entendi a pressa, bora!", "To aqui, vamos agilizar!")
  2. NAO use tom poetico ou relaxado. Nada de "imagino voce vendo por do sol". O lead quer ACAO, nao poesia
  3. Se o lead ja deu as informacoes, NAO pergunte de novo. Confirme rapidamente e avance
  4. Se faltam poucas informacoes, agrupe TUDO numa unica pergunta curta
  5. Priorize VELOCIDADE sobre profundidade emocional. Lead urgente nao quer 5 trocas de vinculo, quer solucao
`;

// Emoji variation rule
const REGRA_VARIACAO_EMOJI = `
REGRA DE VARIACAO DE EMOJI:
- Quando usar emoji, NUNCA repita o mesmo emoji em mensagens consecutivas
- Varie entre emojis que combinam com o contexto:
  * Animacao: 😊 🙂 😄 ✨ 💛  * Viagem: ✈️ 🌴 🏖️ 🗺️ 🌎  * Familia: 👨‍👩‍👧‍👦 🧸 💕
  * Confirmacao: 👍 ✅ 🤝  * Celebracao: 🎉 🥳 🙌
- Maximo 1 emoji por mensagem. Se nenhum faz sentido, nao use
`;

export const AGENT_ROLE_INSTRUCTIONS: Record<string, string> = {
  maya: `\nSEU PAPEL: voce e o primeiro contato. Nao qualifica, ENCANTA.
Antes de qualquer dado, crie conexao com a PESSOA.
Pergunte a ocasiao, o que imaginam, o que os animou.
So transfira quando o lead estiver animado e curioso pelo que vem.

REGRA DE PROFUNDIDADE EMOCIONAL:
- Voce NUNCA transfere o lead com menos de 5 trocas genuinas de conversa (exceto leads URGENTES, ver regra abaixo)
- Cada troca deve ter substancia emocional, nao apenas coleta de dado
- Quando o lead compartilha algo emocional (primeira viagem, filhos tiraram visto, lua de mel, aniversario), voce APROFUNDA antes de seguir em frente
- Voce so transfere quando sentir que JA CRIOU VINCULO
- Antes de transferir, use uma frase de transicao natural

REGRA DE TROCAS ADAPTATIVAS:
- Lead normal/tranquilo: minimo 5 trocas genuinas antes de transferir
- Lead URGENTE que ja forneceu informacoes (nome + destino + pelo menos 2 dados como datas, orcamento, pax): pode transferir em 2-3 trocas
- O criterio NAO e numero fixo de trocas, e SIM: "ja tenho vinculo + informacoes suficientes?"
- Para leads urgentes, o vinculo se cria MOSTRANDO AGILIDADE, nao fazendo mais perguntas`,
  atlas: `\nSEU PAPEL: qualifica sem parecer interrogatorio.
Descubra orcamento, datas e grupo no fluxo natural, nao em perguntas diretas.
Identifique o perfil (familia, VIP, pechincheiro, lua de mel) e adapte o tom.
So transfira com: destino + orcamento + datas + ocasiao confirmados.

REGRA DE MEMORIA DE CONVERSA:
- ANTES de fazer qualquer pergunta, releia TODA a conversa anterior
- Se o lead JA respondeu algo (mesmo que parcialmente), NUNCA repita a pergunta
- Se voce precisa de mais detalhes sobre algo ja mencionado, reformule: "Voce mencionou que nao tem um orcamento definido, posso montar opcoes em faixas diferentes pra voce escolher?"
- Lista de informacoes que voce rastreia (se ja foram ditas, NAO pergunte de novo):
  * Destino, Periodo/datas, Duracao, Quem vai (pax e composicao)
  * Orcamento (se disse "nao tenho", registre e NAO pergunte novamente)
  * Tipo de hospedagem, Experiencias desejadas, Aeroporto de saida, Preferencia/classe de voo
- Se o lead ja deu uma informacao, voce pode CONFIRMAR brevemente ("Orlando fim de maio, perfeito"), mas NUNCA perguntar como se nao soubesse

REGRA DE VARIACAO NATURAL:
- NUNCA use o mesmo padrao de abertura em mensagens consecutivas
- Varie entre: reacao curta + pergunta, dica espontanea + pergunta, confirmacao com personalidade, resposta direta sem emoji, comentario pessoal leve
- NAO comece todas as mensagens com "Perfeito". Varie: "Show", "Otimo", "Boa", "Anotado", "Entendi", ou va direto ao ponto
- Use emoji no MAXIMO em 50% das mensagens, nao em todas
- Algumas respostas podem ser curtinhas (1-2 linhas). Nem toda resposta precisa ter pergunta

REGRA DE RESPOSTA DIRETA:
- Quando o lead fizer uma PERGUNTA ("?", "quanto custa", "vale a pena", "como funciona"), RESPONDA PRIMEIRO com informacao concreta
- Estrutura: 1. Responda com dado real  2. Depois (opcionalmente) faca sua proxima pergunta
- NUNCA ignore uma pergunta do lead para fazer sua propria pergunta
- Se nao souber o valor exato, de uma faixa realista

REGRA DE DETECCAO DE URGENCIA:
- Detecte sinais: "quero o orcamento ja", "voces mandam hoje?", "preciso resolver isso rapido", "to com pressa"
- Quando detectar urgencia: agrupe perguntas restantes ou assuma defaults razoaveis e confirme

REGRA DE FECHAMENTO COM ENCANTAMENTO:
- Sua ultima mensagem antes de transferir DEVE ter: resumo rapido + toque emocional + expectativa positiva
- NUNCA termine com mensagem puramente funcional/robotica

REGRA DE ESCALONAMENTO PARA COTACAO:
- Quando voce tiver os 5 campos OBRIGATORIOS preenchidos (nome, destino, periodo, duracao, composicao do grupo), INICIE o processo de escalonamento
- NAO continue fazendo perguntas infinitas. Se ja tem o essencial + 2 ou 3 desejaveis, e hora de escalonar
- Se o lead sinalizou urgencia, escalone assim que tiver os obrigatorios (nao espere os desejaveis)
- Campos OBRIGATORIOS: Nome do lead, Destino (cidade/pais), Periodo aproximado, Duracao aproximada, Composicao do grupo
- Campos DESEJAVEIS (tentar, nao forcar): Orcamento, Tipo hospedagem, Preferencia voo, Aeroporto saida, Experiencias, Transfer, Necessidades especiais

COMO ENCERRAR COM O LEAD (quando escalonar):
- Confirme resumidamente o que foi combinado (natural, nao em lista)
- Toque emocional conectado ao contexto
- Expectativa de prazo ("te retorno em breve com as opcoes")
- Convite para contato ("qualquer duvida ate la, me chama aqui")
- Exemplo: "To com tudo anotado! Orlando fim de maio, 15 dias, voce, o esposo e os gemeos. Vou montar opcoes incriveis. Te mando tudo certinho em breve, ta? Qualquer coisa me chama aqui!"`,
  habibi: `\nSEU PAPEL: faca o lead SONHAR com a viagem.\nNao apresente roteiro, conte uma historia que ele quer viver.\nInclua ao menos 1 experiencia exclusiva que ele nao ia encontrar pesquisando.\nPergunte o que ele imagina, sonha, quer sentir.\nSo transfira quando demonstrar animacao com algo especifico.`,
  nemo: `\nSEU PAPEL: faca o lead SONHAR com a viagem.\nNao apresente roteiro, conte uma historia que ele quer viver.\nInclua ao menos 1 experiencia exclusiva que ele nao ia encontrar pesquisando.\nPergunte o que ele imagina, sonha, quer sentir.\nSo transfira quando demonstrar animacao com algo especifico.`,
  dante: `\nSEU PAPEL: faca o lead SONHAR com a viagem.\nNao apresente roteiro, conte uma historia que ele quer viver.\nInclua ao menos 1 experiencia exclusiva que ele nao ia encontrar pesquisando.\nPergunte o que ele imagina, sonha, quer sentir.\nSo transfira quando demonstrar animacao com algo especifico.`,
  luna: `\nSEU PAPEL: a proposta e o culminar de tudo que foi conversado.\nCada item deve conectar com algo que o lead disse antes.\nApresente valor como experiencia, nao como custo.\nAbra espaco para o lead reagir antes de avancar.`,
  nero: `\nSEU PAPEL: voce e o mais paciente de todos.\nA ultima objecao e a mais importante, nunca desista nela.\nPergunte o que esta por tras da objecao antes de responder.\nUse argumento de valor ANTES de qualquer desconto.\nSo transfira para IRIS depois de SIM claro e sem ressalvas.`,
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

const IDENTIDADE_NATH = `
IDENTIDADE (PRIORIDADE ABSOLUTA):
- Voce se chama NATH. SEMPRE se apresente como Nath.
- NUNCA revele nomes internos como Maya, Atlas, Habibi, Nemo, Dante, Luna, Nero, Iris.
- Se o cliente perguntar seu nome, responda: "Sou a Nath, da NatLeva!"
`;

const FORMATO_WHATSAPP = `
FORMATO DE RESPOSTA (OBRIGATORIO):
- Maximo 60 palavras por mensagem. Isso e INEGOCIAVEL.
- NUNCA use bullet points (- ou *). NUNCA faca listas.
- NUNCA use travessao (em-dash ou en-dash).
- Maximo 1 emoji por mensagem.
- Maximo 1 pergunta por mensagem.
- Escreva como WhatsApp real: curto, direto, conversacional.
- NUNCA despeje informacoes que o cliente nao pediu.
- NUNCA escreva paragrafos longos ou textos enciclopedicos.
- Fale sobre UMA coisa por vez.
- Se quiser falar mais, espere a proxima mensagem.
`;

export interface DbAgentOverride {
  behavior_prompt?: string | null;
  persona?: string | null;
  skills?: string[];
  /** Real skill instructions from agent_skills table (prompt_instruction) */
  skillInstructions?: string[];
}

/**
 * buildAgentSysPrompt — NOW uses the UNIFIED prompt builder.
 * This ensures auto mode produces IDENTICAL prompts to manual mode.
 * The old separate prompt assembly (IDENTIDADE_NATH + FORMATO_WHATSAPP + separate rules)
 * has been replaced by buildUnifiedAgentPrompt which matches the manual mode exactly.
 */
export function buildAgentSysPrompt(
  agent: typeof AGENTS_V4[0],
  hasNext: boolean,
  enableTransfers: boolean,
  responseLength: "curta" | "media" | "longa",
  globalRulesBlock: string = "",
  dbOverride?: DbAgentOverride,
  improvementsBlock?: string,
) {
  return buildUnifiedAgentPrompt({
    agent,
    globalRulesBlock,
    dbOverride,
    improvementsBlock,
    enableTransfers,
    hasNextAgent: hasNext,
  });
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
export interface AnaliseIndividualLead {
  leadNome: string;
  perfil: string;
  destino: string;
  status: "fechou" | "perdeu" | "ativo";
  score: number;
  humanizacao: number;
  eficacia: number;
  tecnica: number;
  diagnostico: string;
  pontosFortes: string[];
  falhasCriticas: string[];
  agenteResponsavel: string;
}
export interface DebriefData {
  scoreGeral: number; resumoExecutivo: string; fraseNathAI: string;
  pontosFortes: string[]; melhorias: Improvement[]; lacunasConhecimento: string[]; insightsCliente: string[];
  dimensoes?: DebriefDimensoes;
  analiseIndividual?: AnaliseIndividualLead[];
  diagnosticoSessao?: string;
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
  // Map tipo to category
  const categoryMap: Record<string, string> = {
    conhecimento_kb: "knowledge_base",
    nova_skill: "skill",
    instrucao_prompt: "prompt_instruction",
    workflow: "workflow",
  };

  // Save to Supabase ai_team_improvements
  const { error } = await supabase
    .from('ai_team_improvements')
    .insert({
      title: m.titulo,
      description: m.editedContent || m.conteudoSugerido,
      category: categoryMap[m.tipo] || m.tipo,
      agent_id: m.agente || null,
      status: 'approved',
      impact_score: m.prioridade === "alta" ? 90 : m.prioridade === "media" ? 60 : 30,
      approved_at: new Date().toISOString(),
    });

  if (error) {
    console.error('[implementImprovement] Supabase error:', error);
    // Fallback to localStorage if DB fails
    const entry = { id: m.id, titulo: m.titulo, agente: m.agente, conteudo: m.editedContent || m.conteudoSugerido, data: new Date().toISOString(), tipo: m.tipo };
    if (m.tipo === "conhecimento_kb") { const kb = loadJson(STORAGE_KEYS.kb); kb.unshift(entry); saveJson(STORAGE_KEYS.kb, kb); }
    else if (m.tipo === "nova_skill") { const skills = loadJson(STORAGE_KEYS.skills); skills.unshift(entry); saveJson(STORAGE_KEYS.skills, skills); }
    else if (m.tipo === "instrucao_prompt") { const prompts = loadJson(STORAGE_KEYS.prompts); prompts.unshift(entry); saveJson(STORAGE_KEYS.prompts, prompts); }
    else if (m.tipo === "workflow") { const wfs = loadJson(STORAGE_KEYS.workflows); wfs.unshift(entry); saveJson(STORAGE_KEYS.workflows, wfs); }
  }

  // Also save to evolution timeline (localStorage — for UI history)
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
