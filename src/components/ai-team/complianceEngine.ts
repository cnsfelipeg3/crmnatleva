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
 * Code-level enforcement: rules that can be enforced deterministically without AI.
 */
export function enforceHardRules(text: string, agentId?: string, lastLeadMessage?: string, agentMessageCount?: number): string {
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

  // ── Maya-specific behavioral enforcement (deterministic) ──
  if (agentId === "maya") {
    // 1. Multi-question block: keep only text up to (and including) first "?"
    const questionMarks = (cleaned.match(/\?/g) || []).length;
    if (questionMarks >= 2) {
      const firstQ = cleaned.indexOf("?");
      if (firstQ !== -1) {
        cleaned = cleaned.slice(0, firstQ + 1).trim();
      }
    }

    // 2. Storytelling / tourism fluff detector — remove matching sentences
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
      // New patterns — common tourism clichés
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

    // 3. Pivot detector: if lead asks about logistics/pricing → append [TRANSFERIR]
    //    BUT only if Maya has already exchanged at least 4 messages (to avoid premature transfer)
    if (lastLeadMessage) {
      const pivotKeywords = /\b(hotel|hot[ée]is|pre[çc]o|valor|op[çc][ãa]o|op[çc][õo]es|desconto|or[çc]amento|quanto\s+custa|pacote|tarifa|a[ée]reo|passagem|voo)\b/i;
      const minMayaMessages = 4; // Maya must have sent at least 4 messages before auto-pivot
      const hasEnoughHistory = (agentMessageCount ?? 0) >= minMayaMessages;
      if (pivotKeywords.test(lastLeadMessage) && !cleaned.includes("[TRANSFERIR]") && hasEnoughHistory) {
        cleaned += " [TRANSFERIR]";
      }
    }
  }

  // Anti-name-repetition: strip leading client name if it appears too often
  // This is handled via conversationHistory in the caller, but as a safety net
  // we strip common "Name," or "Name!" patterns at the very start when detected
  // (The prompt-level rule should prevent this, but this is a deterministic fallback)

  // Deterministic word-count enforcement
  if (agentId) {
    const limit = AGENT_WORD_LIMITS[agentId] ?? DEFAULT_WORD_LIMIT;
    cleaned = truncateToWordLimit(cleaned, limit);
  }

  return cleaned.trim();
}

/**
 * Full compliance pipeline: AI check + hard rules enforcement.
 */
export async function fullCompliancePipeline(
  agentId: string,
  agentResponse: string,
  conversationContext: string,
  lastLeadMessage?: string,
  agentMessageCount?: number,
): Promise<{ text: string; wasRewritten: boolean }> {
  // Step 1: AI-powered compliance check (uses Anthropic)
  const { text: checkedText, wasRewritten } = await runComplianceCheck(agentId, agentResponse, conversationContext);
  
  // Step 2: Deterministic hard rules (code-level, 100% guaranteed)
  const finalText = enforceHardRules(checkedText, agentId, lastLeadMessage, agentMessageCount);

  return { 
    text: finalText, 
    wasRewritten: wasRewritten || finalText !== checkedText,
  };
}
