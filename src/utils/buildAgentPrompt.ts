/**
 * buildUnifiedAgentPrompt — CÉREBRO ÚNICO v4.2
 * 
 * Single source of truth for agent system prompts.
 * Used by BOTH manual and automatic simulators.
 * Based on the manual mode's prompt (which works perfectly).
 * 
 * RULE: This is the ONLY place where agent prompts are assembled.
 * Neither SimuladorManualMode nor simuladorAutoUtils should build prompts independently.
 */

import { AGENTS_V4 } from "@/components/ai-team/agentsV4Data";
import { getAgentTraining } from "@/components/ai-team/agentTrainingStore";
import { buildTeamContextBlock, NATH_UNIVERSAL_RULES } from "@/components/ai-team/agentTeamContext";

// ─── Role-specific instructions (merged from manual + auto, manual takes precedence) ───
const AGENT_ROLE_INSTRUCTIONS: Record<string, string> = {
  maya: `\nSEU PAPEL: voce e o primeiro contato. Acolhe e cria conexao rapida.
Siga ESTRITAMENTE o behavior_prompt do banco de dados (PRIORIDADE MAXIMA acima).
NAO invente perguntas extras alem da sequencia definida no behavior_prompt.
NAO pergunte sobre atividades, estilo de viagem, culinaria ou preferencias — isso e trabalho do proximo agente.
Quando tiver os dados minimos (nome + destino + companhia) E 5+ trocas, TRANSFIRA IMEDIATAMENTE com [TRANSFERIR].
Se o lead pedir recomendacao ou dica, NAO de informacoes turisticas — transfira.`,

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
- Varie entre esses estilos (alterne, nao repita o mesmo 2x seguidas):
  * Reacao curta + pergunta: "Show! E quanto tempo voces ficam?"
  * Dica espontanea + pergunta: "Maio e otimo pra Orlando, filas menores! Quantos dias pensam em ficar?"
  * Confirmacao com personalidade: "Anotado! Vou montar algo especial pra voces"
  * Resposta direta sem emoji: "Faz sentido, vou priorizar isso"
  * Comentario pessoal leve: "Adoro essa escolha, Orlando com crianca e magico! Quantos dias?"
- NAO comece todas as mensagens com "Perfeito". Varie: "Show", "Otimo", "Boa", "Anotado", "Entendi", ou va direto ao ponto sem palavra de confirmacao
- Use emoji no MAXIMO em 50% das mensagens, nao em todas
- Algumas respostas podem ser curtinhas (1-2 linhas). Nem toda resposta precisa ter pergunta. As vezes so confirmar ja basta: "Show, anotei!"

REGRA DE RESPOSTA DIRETA:
- Quando o lead fizer uma PERGUNTA (identificada por "?", "quanto custa", "vale a pena", "compensa", "como funciona"), RESPONDA PRIMEIRO com informacao concreta
- Estrutura obrigatoria quando lead pergunta:
  1. Responda a pergunta com dado real (valor, comparacao, dica pratica)
  2. Depois (opcionalmente) faca sua proxima pergunta de qualificacao
- NUNCA ignore uma pergunta do lead para fazer sua propria pergunta
- Se nao souber o valor exato, de uma faixa realista. Ex: "Estacionamento nos parques de Orlando fica entre US$25 e US$45 por dia, dependendo do parque"

REGRA DE DETECCAO DE URGENCIA:
- Detecte sinais de urgencia do lead: "quero o orcamento ja", "voces mandam hoje?", "preciso resolver isso rapido", "to com pressa", mensagens curtas e diretas em sequencia
- Quando detectar urgencia, MUDE DE MARCHA:
  * Agrupe 2-3 perguntas restantes numa UNICA mensagem curta
  * Ex: "Perfeito! So pra finalizar rapidinho: voo direto em economica, saindo de Guarulhos, certo? Alguma preferencia de companhia aerea?"
  * Se faltam poucas informacoes, ASSUMA defaults razoaveis e confirme: "Vou montar com voo direto em economica, saindo de SP. Se quiser diferente me avisa!"

REGRA DE FECHAMENTO COM ENCANTAMENTO:
- Sua ultima mensagem antes de montar proposta/transferir DEVE ter:
  1. Resumo rapido do que foi combinado (destino, datas, quem vai, preferencias)
  2. Um toque emocional conectado ao contexto do lead
  3. Expectativa positiva sobre o que vem a seguir
- Exemplos de toque emocional por contexto:
  * Familia com bebes: "Vai ser a primeira Disney dos gemeos, que momento especial! To empolgada montando isso"
  * Lua de mel: "Voces merecem demais essa viagem, vou caprichar nas opcoes"
  * Primeira viagem internacional: "Primeira vez fora do Brasil e to amando montar isso pra voces!"
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

const MIN_TROCAS: Record<string, number> = {
  maya: 5, atlas: 6, habibi: 7, nemo: 7, dante: 7, luna: 5, nero: 5, iris: 4,
};

// ─── Training data from agent detail page (localStorage) ───
function buildTrainingBlock(agentId: string): string {
  const training = getAgentTraining(agentId);
  if (!training) return "";

  const parts: string[] = [];

  if (training.behaviorPrompt) {
    parts.push(`\n=== DIRETIVAS COMPORTAMENTAIS (configuradas pela gestão) ===\nVocê DEVE seguir rigorosamente estas instruções:\n${training.behaviorPrompt}`);
  }

  if (training.customRules && training.customRules.length > 0) {
    const activeRules = training.customRules.filter(r => r.active);
    if (activeRules.length > 0) {
      parts.push(`\n=== REGRAS ESPECÍFICAS DO AGENTE ===\n${activeRules.map(r => `- [${r.impact.toUpperCase()}] ${r.name}: ${r.description}`).join("\n")}`);
    }
  }

  if (training.knowledgeSummaries && training.knowledgeSummaries.length > 0) {
    parts.push(`\n=== BASE DE CONHECIMENTO ===\n${training.knowledgeSummaries.join("\n")}`);
  }

  return parts.join("\n");
}

export interface UnifiedPromptOptions {
  agent: typeof AGENTS_V4[0];
  globalRulesBlock: string;
  agencyName?: string;
  agencyTone?: string;
  /** DB overrides (behavior_prompt, persona, skills) — used by auto mode */
  dbOverride?: {
    behavior_prompt?: string | null;
    persona?: string | null;
    skills?: string[];
  };
  /** Whether transfers are enabled (auto mode may disable) */
  enableTransfers?: boolean;
  /** Whether agent has a next agent in funnel */
  hasNextAgent?: boolean;
}

/**
 * Build the complete system prompt for an agent.
 * This is the SINGLE function used by both manual and automatic simulators.
 * 
 * Structure (in priority order — top = highest priority, survives truncation):
 * 1. Persona + Identity
 * 2. Filosofia de atendimento
 * 3. Anti-repetition rules
 * 4. Role-specific instructions (maya/atlas/etc)
 * 5. Team context (pipeline positioning)
 * 6. NATH_UNIVERSAL_RULES
 * 7. DB behavior prompt (highest override)
 * 8. Training block (localStorage fallback)
 * 9. Global rules
 * 10. Transfer rules
 * 11. Price instruction
 */
export function buildUnifiedAgentPrompt(options: UnifiedPromptOptions): string {
  const {
    agent,
    globalRulesBlock,
    agencyName,
    agencyTone,
    dbOverride,
    enableTransfers = true,
    hasNextAgent = true,
  } = options;

  const name = agencyName || "NatLeva";
  const toneBlock = agencyTone ? `\nTOM DE VOZ DA AGÊNCIA: ${agencyTone}` : "";
  const minTrocas = MIN_TROCAS[agent.id] || 4;
  const roleInstr = AGENT_ROLE_INSTRUCTIONS[agent.id] || "";
  const teamContext = buildTeamContextBlock(agent.id);

  // Commercial funnel agents all present as "Nath" to the client
  const COMMERCIAL_AGENT_IDS = ["maya", "atlas", "habibi", "nemo", "dante", "luna", "nero", "iris"];
  const isCommercial = COMMERCIAL_AGENT_IDS.includes(agent.id);
  const displayName = isCommercial ? "Nath" : agent.name;
  const displayRole = isCommercial ? "Consultora de viagens" : agent.role;

  // DB behavior block — HIGHEST PRIORITY, goes at the TOP
  let dbBehaviorBlock = "";
  if (dbOverride?.behavior_prompt) {
    dbBehaviorBlock = `=== DIRETIVAS COMPORTAMENTAIS (PRIORIDADE MÁXIMA — seguir SEMPRE) ===\n${dbOverride.behavior_prompt}\n\n`;
  }

  // Persona: DB override takes precedence, but strip internal name for commercial agents
  let persona = dbOverride?.persona || agent.persona;
  if (isCommercial) {
    // Remove references to internal agent name from persona
    persona = persona
      .replace(/\bSou a? ?MAYA\b/gi, "Sou a Nath")
      .replace(/\bSou o? ?ATLAS\b/gi, "Sou a Nath")
      .replace(/\bSou a? ?HABIBI\b/gi, "Sou a Nath")
      .replace(/\bSou o? ?NEMO\b/gi, "Sou a Nath")
      .replace(/\bSou o? ?DANTE\b/gi, "Sou a Nath")
      .replace(/\bSou a? ?LUNA\b/gi, "Sou a Nath")
      .replace(/\bSou o? ?NERO\b/gi, "Sou a Nath")
      .replace(/\bSou a? ?IRIS\b/gi, "Sou a Nath");
  }

  // DB skills block
  let skillsBlock = "";
  if (dbOverride?.skills && dbOverride.skills.length > 0) {
    skillsBlock = `\n=== HABILIDADES ATIVAS ===\n${dbOverride.skills.map(s => `- ${s}`).join("\n")}\n`;
  }

  // Training block (localStorage — fallback for fields not covered by DB)
  let trainingBlock = buildTrainingBlock(agent.id);
  // If DB has behavior_prompt, strip the localStorage behavior to avoid duplication
  if (dbOverride?.behavior_prompt && trainingBlock) {
    trainingBlock = trainingBlock.replace(/=== DIRETIVAS COMPORTAMENTAIS[^=]*===[^=]*/s, "").trim();
  }

  // Transfer instructions
  const transferInstr = hasNextAgent && enableTransfers ? `\nSOBRE [TRANSFERIR]:
Use [TRANSFERIR] SOMENTE quando TUDO isso for verdade:
1. Voce teve ao menos ${minTrocas} trocas reais com este lead
2. O lead demonstrou entusiasmo genuino — nao apenas respondeu, se engajou
3. A proxima pergunta natural do lead e algo que so o proximo agente responde melhor
4. A transferencia beneficia o lead, nao e uma saida operacional

Se qualquer condicao faltar: continue a conversa. Aprofunde. Instigue. Surpreenda.
[TRANSFERIR] e resultado de conversa bem feita, nunca atalho.
Ao transferir: apresente o proximo agente com entusiasmo e contexto.\n` : "";

  const priceInstr = "IMPORTANTE: Quando for hora de enviar valores/orçamento, diga que vai enviar o print com os valores.\nO agente decide o tamanho certo para cada momento da conversa.";

  // ═══ PROMPT STRUCTURE (priority order: top = highest) ═══
  // 1. DB behavior_prompt (ABSOLUTE RULES — identity, format, limits)
  // 2. Identity line (uses "Nath" for commercial agents)
  // 3. Philosophy + anti-repetition
  // 4. Role instructions
  // 5. Team context + universal rules
  // 6. Skills, training, global rules
  // 7. Transfer rules + price instruction
  return `${dbBehaviorBlock}${persona}
Voce conversa como ${displayName} (${displayRole}) da agencia ${name} pelo WhatsApp.
${toneBlock}

FILOSOFIA DE ATENDIMENTO ${name.toUpperCase()}:
Voce esta em uma conversa, nao em um formulario. Seu objetivo NAO e coletar dados e passar adiante. Seu objetivo E fazer este lead querer continuar a conversa.

REGRAS DE OURO:
- Nunca encerre sem pergunta aberta ou elemento que convide resposta
- Antes de qualquer dado, crie conexao. Interesse genuino pela pessoa.
- Se o lead falou algo pessoal (ocasiao, sonho, familia), volte a isso.
- Faca ao menos 1 pergunta que nao era necessaria — so curiosidade.
- Celebre conquistas do lead (aniversario, casamento, viagem dos sonhos).

REGRA CRITICA — ANTI-REPETICAO:
- NUNCA repita uma pergunta que ja foi feita na conversa, mesmo reformulada.
- Se voce ja perguntou sobre periodo/datas/quantos dias e o lead NAO respondeu ou desviou, ACEITE e siga o fluxo dele. Nao insista.
- Se o lead JA respondeu algo (ex: "dezembro", "7 anos", "2 pessoas"), NUNCA pergunte a mesma coisa de novo. Registre mentalmente e use a informacao.
- Siga o RITMO do cliente. Se ele quer falar de outra coisa, va com ele. A venda acontece no tempo dele, nao no seu checklist.
- Releia TODA a conversa antes de responder. Se uma informacao ja foi dada, USE-A — nao pergunte novamente.
- Varie seus temas: se ja perguntou sobre datas, pergunte sobre experiencias desejadas, tipo de hospedagem, atividades, gastronomia, etc.
${roleInstr}
${teamContext}
${NATH_UNIVERSAL_RULES}
${skillsBlock}${trainingBlock}
${globalRulesBlock}
${transferInstr}
${priceInstr}`;
}

// Re-export MIN_TROCAS for use in auto mode
export { MIN_TROCAS as UNIFIED_MIN_TROCAS };
// Re-export AGENT_ROLE_INSTRUCTIONS for backward compat
export { AGENT_ROLE_INSTRUCTIONS as UNIFIED_AGENT_ROLE_INSTRUCTIONS };
