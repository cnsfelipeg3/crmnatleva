/**
 * Compliance Engine — Garante que TODA resposta de agente respeita 100% das regras configuradas.
 * 
 * Fluxo: Agente gera resposta → Compliance Engine valida → Se violação → Reescreve → Retorna limpa.
 * 
 * Fontes consultadas:
 * 1. behavior_prompt do agente (DB: ai_team_agents)
 * 2. Training config do agente (localStorage: agentTrainingStore)
 * 3. Regras globais da agência (DB: ai_strategy_knowledge)
 * 4. Base de conhecimento ativa (DB: ai_knowledge_base)
 * 5. Skills do agente (agentsV4Data)
 * 6. Melhorias aprovadas (DB: ai_team_improvements)
 * 7. NATLEVA_BEHAVIOR_CORE (hardcoded behavioral directives)
 */

import { supabase } from "@/integrations/supabase/client";
import { getAgentTraining } from "./agentTrainingStore";
import { AGENTS_V4 } from "./agentsV4Data";
import { buildKnowledgeBlocksByAgent } from "./knowledgeRouting";
import { extractClientNames, sanitizeClientNameUsage } from "./agentFormatting";
import type { GlobalRule } from "@/hooks/useGlobalRules";

// ─── Cache for expensive DB queries (refreshed every 60s) ───
let cachedAgentConfigs: Record<string, AgentComplianceProfile> = {};
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60_000;

/** Clears the compliance cache — call on session reset to avoid cross-session contamination. */
export function clearComplianceCache() {
  cachedAgentConfigs = {};
  cacheTimestamp = 0;
}

export interface AgentComplianceProfile {
  agentId: string;
  agentName: string;
  behaviorPromptDB: string;
  behaviorPromptLocal: string;
  customRules: { name: string; description: string; impact: string }[];
  globalRules: { title: string; rule: string; category: string; impact: string }[];
  knowledgeSummaries: string[];
  skills: string[];
  approvedImprovements: string[];
  prohibitions: string[];
}

/**
 * Extracts explicit prohibitions from all text sources.
 */
function extractProhibitions(texts: string[]): string[] {
  const prohibitions: string[] = [];
  const patterns = [
    /proibido[\s]+(.+)/gi,
    /nunca\s+(?:use|faça|fale|mencione|diga|escreva|coloque|utilize)\s+(.+)/gi,
    /não\s+(?:use|faça|fale|mencione|diga|escreva|coloque|utilize)\s+(.+)/gi,
    /jamais\s+(.+)/gi,
    /vedado[\s]+(.+)/gi,
    /evite\s+(?:a todo custo|sempre|absolutamente)\s+(.+)/gi,
  ];
  for (const text of texts) {
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const prohibition = match[1].trim().replace(/\n.*/s, "").slice(0, 200);
        if (prohibition.length > 3) prohibitions.push(prohibition);
      }
    }
  }
  return [...new Set(prohibitions)];
}

/**
 * Loads and caches the full compliance profile for an agent.
 */
export async function loadAgentComplianceProfile(agentId: string): Promise<AgentComplianceProfile> {
  const now = Date.now();
  if (cachedAgentConfigs[agentId] && (now - cacheTimestamp) < CACHE_TTL_MS) {
    return cachedAgentConfigs[agentId];
  }

  const agent = AGENTS_V4.find(a => a.id === agentId);
  const training = getAgentTraining(agentId);

  // Parallel DB queries — now includes real skills from agent_skills table
  const [dbAgentRes, globalRulesRes, kbRes, improvementsRes, skillsRes] = await Promise.all([
    supabase.from("ai_team_agents").select("behavior_prompt, skills").eq("id", agentId).maybeSingle(),
    supabase.from("ai_strategy_knowledge").select("title, rule, category, estimated_impact").eq("is_active", true).order("priority", { ascending: false }),
    supabase.from("ai_knowledge_base").select("title, content_text, category").eq("is_active", true),
    supabase.from("ai_team_improvements").select("title, description").eq("agent_id", agentId).eq("status", "approved"),
    supabase.from("agent_skill_assignments").select("skill_id, is_active").eq("agent_id", agentId).eq("is_active", true),
  ]);

  // Fetch full skill details for active assignments
  let skillInstructions: string[] = [];
  const activeSkillIds = (skillsRes.data || []).map((a: any) => a.skill_id);
  if (activeSkillIds.length > 0) {
    const { data: fullSkills } = await supabase.from("agent_skills").select("name, prompt_instruction").in("id", activeSkillIds).eq("is_active", true);
    skillInstructions = (fullSkills || []).filter((s: any) => s.prompt_instruction).map((s: any) => `[SKILL: ${s.name}] ${s.prompt_instruction}`);
  }

  const behaviorPromptDB = dbAgentRes.data?.behavior_prompt || "";
  const behaviorPromptLocal = training?.behaviorPrompt || "";
  const customRules = (training?.customRules || []).filter(r => r.active).map(r => ({
    name: r.name, description: r.description, impact: r.impact,
  }));
  const globalRules = (globalRulesRes.data || []).map((r: any) => ({
    title: r.title, rule: r.rule, category: r.category, impact: r.estimated_impact || "médio",
  }));
  const dbKnowledgeBlock = buildKnowledgeBlocksByAgent(kbRes.data || [])[agentId] || "";
  const knowledgeSummaries = [
    ...(training?.knowledgeSummaries || []),
    ...(dbKnowledgeBlock ? [dbKnowledgeBlock.slice(0, 4000)] : []),
  ];
  const skills = skillInstructions.length > 0 ? skillInstructions : (agent?.skills || (dbAgentRes.data?.skills as string[]) || []);
  const approvedImprovements = (improvementsRes.data || []).map((i: any) => `${i.title}: ${i.description || ""}`);

  // Extract ALL prohibitions from every text source
  const allTexts = [
    behaviorPromptDB,
    behaviorPromptLocal,
    ...customRules.map(r => r.description),
    ...globalRules.map(r => r.rule),
    ...knowledgeSummaries,
  ];
  const prohibitions = extractProhibitions(allTexts);

  const profile: AgentComplianceProfile = {
    agentId,
    agentName: agent?.name || agentId,
    behaviorPromptDB,
    behaviorPromptLocal,
    customRules,
    globalRules,
    knowledgeSummaries,
    skills,
    approvedImprovements,
    prohibitions,
  };

  cachedAgentConfigs[agentId] = profile;
  cacheTimestamp = now;
  return profile;
}

/**
 * Builds the compliance validation prompt for the second AI call.
 */
function buildCompliancePrompt(profile: AgentComplianceProfile, agentResponse: string, conversationContext: string): string {
  const sections: string[] = [];

  sections.push(`AGENTE: ${profile.agentName} (ID: ${profile.agentId})`);

  if (profile.behaviorPromptDB) {
    sections.push(`\n=== DIRETIVA COMPORTAMENTAL (DB) ===\n${profile.behaviorPromptDB}`);
  }
  if (profile.behaviorPromptLocal) {
    sections.push(`\n=== DIRETIVA COMPORTAMENTAL (TREINAMENTO) ===\n${profile.behaviorPromptLocal}`);
  }
  if (profile.customRules.length > 0) {
    sections.push(`\n=== REGRAS ESPECÍFICAS DO AGENTE ===\n${profile.customRules.map(r => `- [${r.impact.toUpperCase()}] ${r.name}: ${r.description}`).join("\n")}`);
  }
  if (profile.globalRules.length > 0) {
    sections.push(`\n=== REGRAS GLOBAIS DA AGÊNCIA ===\n${profile.globalRules.map(r => `- [${r.category}/${r.impact.toUpperCase()}] ${r.title}: ${r.rule}`).join("\n")}`);
  }
  if (profile.prohibitions.length > 0) {
    sections.push(`\n=== PROIBIÇÕES EXTRAÍDAS (COMPLIANCE MÁXIMO) ===\n${profile.prohibitions.map(p => `❌ ${p}`).join("\n")}`);
  }
  if (profile.skills.length > 0) {
    sections.push(`\n=== SKILLS DO AGENTE ===\n${profile.skills.join(", ")}`);
  }
  if (profile.approvedImprovements.length > 0) {
    sections.push(`\n=== MELHORIAS APROVADAS ===\n${profile.approvedImprovements.join("\n")}`);
  }
  if (profile.knowledgeSummaries.length > 0) {
    sections.push(`\n=== BASE DE CONHECIMENTO ===\n${profile.knowledgeSummaries.slice(0, 5).join("\n---\n")}`);
  }

  return `Você é o VALIDADOR DE COMPLIANCE da agência NatLeva.

Sua ÚNICA função: verificar se a RESPOSTA DO AGENTE respeita TODAS as regras, proibições, diretivas e configurações listadas abaixo.

${sections.join("\n")}

=== CONTEXTO DA CONVERSA ===
${conversationContext.slice(-1500)}

=== RESPOSTA DO AGENTE PARA VALIDAR ===
"${agentResponse}"

INSTRUÇÕES:
1. Analise a resposta contra CADA regra, proibição e diretiva listada acima.
2. Se a resposta está 100% em conformidade, retorne EXATAMENTE: APPROVED
3. Se encontrar QUALQUER violação (mesmo mínima), reescreva a resposta corrigindo TODAS as violações, mantendo o sentido e o tom original.

REGRAS DA REESCRITA:
- Se a resposta excede os limites de palavras definidos nas diretivas, ENCURTE mantendo apenas o essencial
- Priorize brevidade: respostas de WhatsApp devem ser curtas e diretas
- Mantenha o mesmo tom e intenção
- Corrija APENAS o que viola as regras
- NÃO adicione explicações sobre o que foi corrigido
- Retorne APENAS a mensagem reescrita (sem prefixo, sem aspas, sem "Resposta corrigida:")

RESPONDA AGORA:`;
}

/**
 * Runs the compliance check on an agent response.
 * Returns the original text if compliant, or a rewritten version if violations found.
 */
export async function runComplianceCheck(
  agentId: string,
  agentResponse: string,
  conversationContext: string,
): Promise<{ text: string; wasRewritten: boolean; profile: AgentComplianceProfile }> {
  // Skip compliance for very short or error messages
  if (!agentResponse || agentResponse.length < 20 || agentResponse.startsWith("Erro") || agentResponse.startsWith("Desculpe, tive um problema")) {
    const profile = await loadAgentComplianceProfile(agentId);
    return { text: agentResponse, wasRewritten: false, profile };
  }

  const profile = await loadAgentComplianceProfile(agentId);

  // If no rules configured, skip
  const hasRules = profile.behaviorPromptDB || profile.behaviorPromptLocal || 
    profile.customRules.length > 0 || profile.globalRules.length > 0 || profile.prohibitions.length > 0;
  if (!hasRules) {
    return { text: agentResponse, wasRewritten: false, profile };
  }

  const compliancePrompt = buildCompliancePrompt(profile, agentResponse, conversationContext);

  try {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/simulator-ai`;
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        type: "evaluate", // non-streaming, powerful model
        systemPrompt: "Você é um validador de compliance rigoroso. Analise e corrija violações.",
        userPrompt: compliancePrompt,
        provider: "anthropic", // Uses Anthropic as requested by user
      }),
    });

    if (!resp.ok) {
      console.warn("Compliance check failed, returning original:", resp.status);
      return { text: agentResponse, wasRewritten: false, profile };
    }

    const data = await resp.json();
    const result = (data.content || "").trim();

    if (!result || result === "APPROVED" || result.startsWith("APPROVED")) {
      return { text: agentResponse, wasRewritten: false, profile };
    }

    // Safety: reject compliance responses that are clearly meta-commentary
    // (the validator AI responding about itself instead of rewriting)
    const metaPatterns = [
      /validador/i, /compliance/i, /verificando/i, /analis(e|ar)/i,
      /preciso que voc[eê] forne[cç]a/i, /aguardando/i, /minha fun[cç][aã]o/i,
      /vou verificar/i, /documento/i, /STATUS/,
      // Patterns that catch full analysis outputs leaking into chat
      /VIOLA[ÇC][ÃA]O/i, /VIOLA[ÇC][ÕO]ES/i, /VEREDICTO/i, /RESPOSTA\s+(REPROVADA|APROVADA)/i,
      /ESTADO_\d/i, /FASE_\d/i, /ETAPA_\d/i,
      /##\s+\d+\.\s+VIOLA/i, /RESPOSTA\s+CORRETA\s+PARA/i,
      /AN[ÁA]LISE\s+ADICIONAL/i, /REGRA\s+VIOLADA/i,
      // Catch compliance validator asking for input instead of processing
      /RESPOSTA DO AGENTE/i, /para validar/i, /forne[cç]a/i,
      /resposta completa/i, /contexto da conversa/i,
      /Por favor,?\s*(forne|envie|mande|informe)/i,
      /Preciso d[aoe]/i,
    ];
    const isMetaResponse = metaPatterns.filter(p => p.test(result)).length >= 1;
    if (isMetaResponse) {
      console.warn(`🛡️ Compliance returned meta-commentary/analysis instead of rewrite, keeping original for ${profile.agentName}`);
      return { text: agentResponse, wasRewritten: false, profile };
    }

    // Safety: reject if result contains markdown headers (##) — rewrites should be plain chat text
    const markdownHeaderCount = (result.match(/^#{1,3}\s+/gm) || []).length;
    if (markdownHeaderCount >= 2) {
      console.warn(`🛡️ Compliance rewrite contains ${markdownHeaderCount} markdown headers, keeping original for ${profile.agentName}`);
      return { text: agentResponse, wasRewritten: false, profile };
    }

    // Safety: if result is wildly different length, likely not a valid rewrite
    if (result.length > agentResponse.length * 3 || result.length < agentResponse.length * 0.1) {
      console.warn(`🛡️ Compliance rewrite has suspicious length ratio, keeping original for ${profile.agentName}`);
      return { text: agentResponse, wasRewritten: false, profile };
    }

    // The AI returned a rewritten version
    // Compliance rewrite applied — violations detected and corrected
    return { text: result, wasRewritten: true, profile };
  } catch (err) {
    console.error("Compliance check error:", err);
    return { text: agentResponse, wasRewritten: false, profile };
  }
}

/** Word limits per agent role (deterministic, 100% guaranteed). */
const AGENT_WORD_LIMITS: Record<string, number> = {
  maya: 60,
  atlas: 90,
  habibi: 120,
  nemo: 120,
  dante: 120,
  luna: 150,
  nero: 120,
};
const DEFAULT_WORD_LIMIT = 100;

/**
 * Truncates text to the last complete sentence within a word limit.
 */
function truncateToWordLimit(text: string, maxWords: number): string {
  const words = text.split(/\s+/);
  if (words.length <= maxWords) return text;

  const truncated = words.slice(0, maxWords).join(" ");
  // Find the last sentence-ending punctuation within the truncated text
  const lastSentenceEnd = Math.max(
    truncated.lastIndexOf("."),
    truncated.lastIndexOf("!"),
    truncated.lastIndexOf("?"),
  );
  if (lastSentenceEnd > truncated.length * 0.4) {
    return truncated.slice(0, lastSentenceEnd + 1).trim();
  }
  // No good sentence boundary — just cut at word limit
  return truncated.trim();
}

/**
 * Detects if the 5 mandatory fields are present in the conversation history.
 * Fields: nome, destino, período, duração, composição do grupo.
 */
function detectMandatoryFields(conversationText: string): boolean {
  const lower = conversationText.toLowerCase();

  // Name: lead introduced themselves (e.g. "sou o Leo", "me chamo", "meu nome é")
  const hasName = /\b(sou\s+[ao]?\s*\w+|me\s+chamo|meu\s+nome|pode\s+me\s+chamar)\b/i.test(lower)
    || /\b(oi|ol[aá])\s*(nath|nat)\b/i.test(lower); // greeting implies name is in context

  // Destination: any city/country/destination mention
  const hasDestino = /\b(orlando|disney|miami|nova\s*york|new\s*york|cancun|paris|roma|italia|europa|dubai|maldivas|tailandia|bali|toquio|japao|portugal|lisboa|londres|london|hawaii|punta\s*cana|santiago|buenos\s*aires|cape\s*town|egito|grecia|turquia|caribe|africa|asia|oceania|fernando\s*de\s*noronha|gramado|bariloche|ushuaia|patagonia|peru|machu\s*picchu|colombia|cartagena|mexico|los\s*angeles|las\s*vegas|california|floripa|florianopolis|rio\s*de\s*janeiro|salvador|jericoacoara|maragogi|bonito|eua|estados\s*unidos)\b/i.test(lower);

  // Period: month, season or date reference
  const hasPeriodo = /\b(janeiro|fevereiro|mar[cç]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro|jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez|f[ée]rias|natal|carnaval|ano\s*novo|reveillon|202[4-9]|203\d)\b/i.test(lower);

  // Duration: number + days/nights/weeks or "X dias"
  const hasDuracao = /\b(\d+\s*(dias?|noites?|semanas?|diaria)|\d+d\b|\d+\s*a\s*\d+\s*dias?)\b/i.test(lower);

  // Group composition: number of people, couple, family etc.
  const hasGrupo = /\b(casal|sozinho|sozinha|familia|fam[ií]lia|\d+\s*(pessoa|pax|adulto|crian[cç]a|beb[eê]|filh[oa])|\bsomos\s*\d|\beu\s+e\s+(meu|minha|o|a)\b|\d+\s*\(|\(\d+\))\b/i.test(lower);

  return hasName && hasDestino && hasPeriodo && hasDuracao && hasGrupo;
}

/**
 * Detects if the agent is stuck in a "promise loop" — repeating variations
 * of "vou montar/preparar/organizar" without escalating.
 */
function detectPromiseLoop(conversationText: string): boolean {
  const agentMessages = conversationText.match(/(?:^|\n)(?:AGENTE|NATH|ATLAS|MAYA)[:\s]([^\n]+)/gi) || [];
  const promisePatterns = /\b(vou\s+montar|vou\s+preparar|vou\s+organizar|te\s+mand[oa]|te\s+envio|j[áa]\s+j[áa]|em\s+breve|rapidinho|te\s+retorno|volto\s+com|finalizar\s+aqui|caprichar|mont(ar|ando)\s+(as\s+)?op[çc][õo]es)\b/i;

  let promiseCount = 0;
  for (const msg of agentMessages) {
    if (promisePatterns.test(msg)) promiseCount++;
  }
  return promiseCount >= 2;
}

// enforceNameFrequency REMOVED — replaced by sanitizeClientNameUsage in fullCompliancePipeline (Step 3)


export function enforceHardRules(
  text: string,
  agentId?: string,
  lastLeadMessage?: string,
  agentMessageCount?: number,
  conversationContext?: string,
): string {
  // Remove em-dashes (—) and en-dashes (–)
  let cleaned = text.replace(/\s*[—–]\s*/g, ", ");
  // Collapse double commas
  cleaned = cleaned.replace(/,\s*,/g, ",");
  // Remove comma before period
  cleaned = cleaned.replace(/,\s*\./g, ".");
  // Remove leading comma
  cleaned = cleaned.replace(/^,\s*/, "");
  // Remove excessive emojis (keep max 1)
  const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
  const emojis = cleaned.match(emojiRegex);
  if (emojis && emojis.length > 1) {
    let kept = false;
    cleaned = cleaned.replace(emojiRegex, (match) => {
      if (!kept) { kept = true; return match; }
      return "";
    });
  }

  // ── TRANSFER LEAK FILTER (ALL agents — highest priority) ──
  // Remove any sentence mentioning transfer/colleague/team keywords
  const transferLeakPatterns = [
    /[^.!?\n]*\b(vou te passar|vou te encaminhar|meu colega|minha colega|minha parceira|meu parceiro|nosso especialista|nossa especialista|nossa equipe vai|outro consultor|outra consultora|próximo agente|próximo atendente|te transferir|te direcionar|te conectar|vou te conectar|deixa eu te passar|passar pra?\s+\w+|conectar com\s+\w+)\b[^.!?\n]*[.!?]?\s*/gi,
    /[^.!?\n]*\b(outras?\s+meninas?\s+do\s+time|time\s+aqui\s+da|equipe\s+da|meninas?\s+da\s+nat|colegas?\s+que|fica\s+mais\s+com\s+outr[ao]|não\s+[ée]\s+minha\s+[áa]rea|fica\s+com\s+outr[ao]\s+pessoa|sou\s+especialista\s+(?:nos?|em))\b[^.!?\n]*[.!?]?\s*/gi,
  ];
  for (const tp of transferLeakPatterns) {
    cleaned = cleaned.replace(tp, "").trim();
  }

  // ── INTERNAL NAME LEAK FILTER (strip agent internal names) ──
  const internalNames = /\b(Maya|Atlas|Habibi|Nemo|Dante|Luna|Nero|Iris|[ÓO]rion|Nath\.AI|Spark|Hunter|Aegis|Nurture|FinX|Sage|OpEx|Vigil|Sentinel|Athos|Zara)\b/g;
  // Don't strip "Nath" — that's the identity they SHOULD use
  const nameMatches = cleaned.match(internalNames);
  if (nameMatches) {
    // Replace internal names (except in "sou a Nath" context)
    for (const nm of nameMatches) {
      if (nm.toLowerCase() === "nath") continue; // keep Nath
      // Remove sentences containing internal agent names
      const nameRegex = new RegExp(`[^.!?\\n]*\\b${nm}\\b[^.!?\\n]*[.!?]?\\s*`, "gi");
      cleaned = cleaned.replace(nameRegex, "").trim();
    }
  }

  // ── BRIEFING BLOCK FILTER (remove internal handoff data visible in chat) ──
  // Matches structured blocks like "Nome: X\nDestino: Y\nCompanhia: Z"
  const briefingPatterns = [
    /(?:^|\n)(?:Nome|Destino|Companhia|Ocasião|Período|Primeira vez|Tom da conversa|Orçamento|Duração|Composição|Perfil|Grupo)[:\s]+[^\n]+(?:\n(?:Nome|Destino|Companhia|Ocasião|Período|Primeira vez|Tom da conversa|Orçamento|Duração|Composição|Perfil|Grupo)[:\s]+[^\n]+)*/gi,
  ];
  for (const bp of briefingPatterns) {
    cleaned = cleaned.replace(bp, "").trim();
  }

  // Remove [TRANSFERIR] tag from visible text
  cleaned = cleaned.replace(/\[TRANSFERIR\]/g, "").trim();
  // Remove [BRIEFING...], [ESCALON...], [INTERNO...]
  cleaned = cleaned.replace(/\[BRIEFING[^\]]*\]:?\s*/gi, "");
  cleaned = cleaned.replace(/\[ESCALON[^\]]*\]:?\s*/gi, "");
  cleaned = cleaned.replace(/\[INTERNO[^\]]*\]:?\s*/gi, "");
  // Remove state/phase/step labels
  cleaned = cleaned.replace(/^.*\b(ESTADO|FASE|STEP|ETAPA|STAGE|QUALIFICA[ÇC][ÃA]O|TRANSFER[ÊE]NCIA)[_\s]*\d*[+,;]*\s*.*$/gm, "");

    // ── Rude/dismissive phrase filter (all agents) ──
  const rudePatterns = [
    /[^.!?]*j[áa]\s+te\s+expliquei\s+isso[^.!?]*[.!?]?/gi,
    /[^.!?]*j[áa]\s+(?:falei|disse|respondi)\s+(?:isso|sobre\s+isso)[^.!?]*[.!?]?/gi,
    /[^.!?]*como\s+(?:eu\s+)?j[áa]\s+(?:mencionei|expliquei|disse)[^.!?]*[.!?]?/gi,
    /[^.!?]*conforme\s+(?:eu\s+)?j[áa]\s+(?:expliquei|informei|falei)[^.!?]*[.!?]?/gi,
  ];
  for (const rp of rudePatterns) {
    cleaned = cleaned.replace(rp, "").trim();
  }
  // Clean leftover artifacts
  cleaned = cleaned.replace(/^\s*[,.\s]+/, "").trim();
  if (cleaned.length > 0) {
    cleaned = cleaned.replace(/^[a-zà-ú]/, c => c.toUpperCase());
  }

  // ── Storytelling / tourism fluff detector (Maya + Atlas) ──
  if (agentId === "maya" || agentId === "atlas") {
    const storytellingPatterns = [
      /[^.!?]*uma?\s+energia\s+[úu]nica[^.!?]*[.!?]/gi,
      /[^.!?]*imposs[ií]vel\s+de\s+resistir[^.!?]*[.!?]/gi,
      /[^.!?]*foi\s+feit[ao]\s+pr[ao][^.!?]*[.!?]/gi,
      /[^.!?]*cap[ií]tulo\s+[àa]\s+parte[^.!?]*[.!?]/gi,
      /[^.!?]*mistura\s+de\s+\w+\s+com\s+\w+[^.!?]*[.!?]/gi,
      /[^.!?]*lugar\s+m[áa]gico[^.!?]*[.!?]/gi,
      /[^.!?]*experiência\s+[úu]nica[^.!?]*[.!?]/gi,
      /[^.!?]*sonho\s+de\s+consumo[^.!?]*[.!?]/gi,
      /[^.!?]*paraíso\s+(na\s+terra|terrestre)[^.!?]*[.!?]/gi,
      /[^.!?]*[áa]guas?\s+cristalinas?[^.!?]*[.!?]/gi,
      /[^.!?]*de\s+outro\s+mundo[^.!?]*[.!?]/gi,
      /[^.!?]*destinos?\s+incr[ií]ve(l|is)[^.!?]*[.!?]/gi,
      /[^.!?]*cen[áa]rios?\s+deslumbrantes?[^.!?]*[.!?]/gi,
      /[^.!?]*cada\s+viagem\s+[ée]\s+[úu]nica[^.!?]*[.!?]/gi,
      /[^.!?]*paisagens?\s+de\s+tirar\s+o\s+f[ôo]lego[^.!?]*[.!?]/gi,
      /[^.!?]*tudo\s+isso\s+influencia[^.!?]*[.!?]/gi,
      /[^.!?]*depende\s+muito\s+d[oe][^.!?]*[.!?]/gi,
    ];
    for (const pattern of storytellingPatterns) {
      cleaned = cleaned.replace(pattern, "").trim();
    }
  }

  // ── Hotel names / price deterministic blocker (Maya + Atlas) ──
  if (agentId === "maya" || agentId === "atlas") {
    // Remove sentences that cite specific hotel names
    const hotelNamePatterns = /[^.!?]*\b(Grand\s+Floridian|Hard\s+Rock\s+Hotel|Polynesian|Portofino\s+Bay|Atlantis|Burj\s+Al\s+Arab|Four\s+Seasons|Ritz[- ]Carlton|W\s+Hotel|Waldorf|Hilton|Marriott|Hyatt|Sheraton|Novotel|Ibis|Holiday\s+Inn)\b[^.!?]*[.!?]?/gi;
    cleaned = cleaned.replace(hotelNamePatterns, "").trim();
    // Remove sentences with explicit prices (R$ X, US$ X, a partir de X)
    const pricePatterns = /[^.!?]*\b(R\$\s*[\d.,]+|US\$\s*[\d.,]+|a\s+partir\s+de\s+R?\$?\s*[\d.,]+|[\d.,]+\s*(?:reais|dólares|dollars))\b[^.!?]*[.!?]?/gi;
    cleaned = cleaned.replace(pricePatterns, "").trim();
  }

  // ── Maya-specific: max 1 question ──
  if (agentId === "maya") {
    const questionMarks = (cleaned.match(/\?/g) || []).length;
    if (questionMarks >= 2) {
      const firstQ = cleaned.indexOf("?");
      if (firstQ !== -1) {
        cleaned = cleaned.slice(0, firstQ + 1).trim();
      }
    }

    // Pivot detector: if lead asks about logistics/pricing → append [TRANSFERIR]
    if (lastLeadMessage) {
      const pivotKeywords = /\b(hotel|hot[ée]is|pre[çc]o|valor|op[çc][ãa]o|op[çc][õo]es|desconto|or[çc]amento|quanto\s+custa|pacote|tarifa|a[ée]reo|passagem|voo)\b/i;
      const minMayaMessages = 4;
      const hasEnoughHistory = (agentMessageCount ?? 0) >= minMayaMessages;
      if (pivotKeywords.test(lastLeadMessage) && !cleaned.includes("[TRANSFERIR]") && hasEnoughHistory) {
        cleaned += " [TRANSFERIR]";
      }
    }
  } else {
    // ── Non-Maya agents: allow up to 2 questions max ──
    const qMarks = (cleaned.match(/\?/g) || []).length;
    if (qMarks > 2) {
      let idx = -1;
      for (let q = 0; q < 2; q++) {
        idx = cleaned.indexOf("?", idx + 1);
      }
      if (idx !== -1) {
        cleaned = cleaned.slice(0, idx + 1).trim();
      }
    }
  }

  // ── Atlas-specific: force escalation when 5 fields are collected or promise loop detected ──
  if (agentId === "atlas" && conversationContext) {
    const msgCount = agentMessageCount ?? 0;

    // Only apply after Atlas has sent at least 3 messages (avoid instant transfer)
    if (msgCount >= 3) {
      const fieldsComplete = detectMandatoryFields(conversationContext);
      const promiseLoop = detectPromiseLoop(conversationContext);

      if ((fieldsComplete || promiseLoop) && !cleaned.includes("[TRANSFERIR]")) {
        // Strip any "vou montar/preparar" promises and force escalation
        if (promiseLoop) {
          console.log("🔄 Atlas promise loop detected — forcing escalation");
        }
        if (fieldsComplete) {
          console.log("✅ Atlas 5 mandatory fields detected — forcing escalation");
        }
        cleaned += " [TRANSFERIR]";
      }
    }
  }

  // Name enforcement now handled exclusively by sanitizeClientNameUsage in fullCompliancePipeline Step 3

  // Deterministic word-count enforcement
  if (agentId) {
    const limit = AGENT_WORD_LIMITS[agentId] ?? DEFAULT_WORD_LIMIT;
    cleaned = truncateToWordLimit(cleaned, limit);
  }

  return cleaned.trim();
}

/**
 * Full compliance pipeline: AI check + hard rules enforcement.
 * @param knownClientName - Pre-known client name (from lead profile, auto config, etc.)
 * @param recentAgentMessages - Last N agent messages for name-frequency tracking
 */
export async function fullCompliancePipeline(
  agentId: string,
  agentResponse: string,
  conversationContext: string,
  lastLeadMessage?: string,
  agentMessageCount?: number,
  knownClientName?: string,
  recentAgentMessages?: string[],
): Promise<{ text: string; wasRewritten: boolean }> {
  // Step 1: AI-powered compliance check (uses Anthropic)
  const { text: checkedText, wasRewritten } = await runComplianceCheck(agentId, agentResponse, conversationContext);
  
  // Step 2: Deterministic hard rules (code-level, 100% guaranteed)
  const finalText = enforceHardRules(checkedText, agentId, lastLeadMessage, agentMessageCount, conversationContext);

  // Step 3: Unified name-frequency sanitization (deterministic, uses known name + aliases)
  const nameInfo = extractClientNames(conversationContext, knownClientName);
  const agentMsgs = recentAgentMessages ?? conversationContext.split("\n")
    .filter(l => /^(Agente|agent|assistant):/i.test(l))
    .map(l => l.replace(/^(Agente|agent|assistant):\s*/i, ""))
    .slice(-5);
  const sanitizedText = sanitizeClientNameUsage(finalText, nameInfo, agentMsgs);

  return { 
    text: sanitizedText, 
    wasRewritten: wasRewritten || sanitizedText !== checkedText,
  };
}
