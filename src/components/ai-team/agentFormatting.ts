/**
 * Shared agent formatting utilities — used by both Manual and Chameleon simulators.
 * Enforces formatting rules that LLMs sometimes ignore, guaranteeing 100% compliance.
 */

// ─── Robust client name/alias extractor ───

export interface ClientNameInfo {
  fullName: string;       // "Fernanda"
  aliases: string[];      // ["Fê", "Fer", "Fernanda"]
  allPatterns: RegExp[];  // compiled regexes for each alias
}

/**
 * Extracts the client's name and aliases from conversation context.
 * Covers: "sou a Fernanda", "me chamo Fernanda", "pode me chamar de Fê",
 *         "Fernanda (ou Fê)", short nicknames like "Lu", "Ju", "Fê".
 */
export function extractClientNames(conversationContext: string, knownName?: string): ClientNameInfo | null {
  const names = new Set<string>();

  if (knownName) {
    const clean = knownName.trim().split(/\s+/)[0];
    if (clean.length >= 2) names.add(clean);
  }

  const leadLines = conversationContext.split("\n").filter(l => /^(Lead|user|lead|cliente):/i.test(l));
  const allLeadText = leadLines.join(" ");

  const introPatterns = [
    /\b(?:sou|chamo|aqui\s+[ée])\s+(?:a\s+|o\s+)?([A-ZÀ-Ú][a-zà-ú]{1,15})\b/gi,
    /(?:pode\s+me\s+chamar\s+de)\s+([A-ZÀ-Úa-zà-ú]{2,15})/gi,
    /\bmeu\s+nome\s+[ée]\s+([A-ZÀ-Ú][a-zà-ú]{1,15})\b/gi,
  ];

  for (const p of introPatterns) {
    let m;
    while ((m = p.exec(allLeadText)) !== null) {
      const n = m[1].trim();
      if (n.length >= 2) names.add(n);
    }
  }

  // Extract aliases in parentheses: "Fernanda (ou Fê)" or "(Fê)"
  const aliasInParens = allLeadText.match(/\(\s*(?:ou\s+)?([A-ZÀ-Úa-zà-ú]{2,10})\s*\)/gi);
  if (aliasInParens) {
    for (const match of aliasInParens) {
      const inner = match.replace(/[()]/g, "").replace(/^ou\s+/i, "").trim();
      if (inner.length >= 2) names.add(inner);
    }
  }

  // Fallback: extract from agent greeting patterns
  if (names.size === 0) {
    const agentLines = conversationContext.split("\n").filter(l => /^(Agente|agent|assistant):/i.test(l));
    for (const line of agentLines) {
      const greeting = line.match(/^(?:Agente|agent|assistant):\s*([A-ZÀ-Ú][a-zà-ú]{1,12})\s*[,!]/i);
      if (greeting) { names.add(greeting[1]); break; }
    }
  }

  if (names.size === 0) return null;

  const allNames = [...names];
  const fullName = allNames.reduce((a, b) => a.length >= b.length ? a : b, "");
  const allPatterns = allNames.map(n => {
    const escaped = n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Use lookahead/lookbehind for word boundaries that work with accented chars
    return new RegExp(`(?<![A-Za-zÀ-ÿ])${escaped}(?![A-Za-zÀ-ÿ])`, "gi");
  });

  return { fullName, aliases: allNames, allPatterns };
}

/**
 * Sanitizes client name usage in agent messages.
 * Rules:
 * - Never use the name in consecutive agent messages
 * - Max 1 use in the last 3 agent responses
 * - If limit exceeded, ALL name/alias occurrences are stripped
 */
export function sanitizeClientNameUsage(
  agentText: string,
  nameInfo: ClientNameInfo | null,
  recentAgentMessages: string[],
): string {
  if (!nameInfo || nameInfo.aliases.length === 0) return agentText;

  // Reset lastIndex on all patterns (they're global)
  nameInfo.allPatterns.forEach(p => { p.lastIndex = 0; });

  const currentHasName = nameInfo.allPatterns.some(p => { p.lastIndex = 0; return p.test(agentText); });
  if (!currentHasName) return agentText;

  // Rule 1: If previous agent message used the name → strip ALL from current
  const lastMsg = recentAgentMessages.length > 0 ? recentAgentMessages[recentAgentMessages.length - 1] : "";
  const prevUsedName = lastMsg && nameInfo.allPatterns.some(p => { p.lastIndex = 0; return p.test(lastMsg); });

  // Rule 2: Count usage in last 3 agent messages
  const last3 = recentAgentMessages.slice(-3);
  const recentUsageCount = last3.filter(msg => nameInfo.allPatterns.some(p => { p.lastIndex = 0; return p.test(msg); })).length;

  if (prevUsedName || recentUsageCount >= 1) {
    return stripAllNameOccurrences(agentText, nameInfo);
  }

  // Rule 3: If current message uses name 2+ times, keep only first
  let totalInCurrent = 0;
  for (const p of nameInfo.allPatterns) {
    p.lastIndex = 0;
    totalInCurrent += (agentText.match(p) || []).length;
  }
  if (totalInCurrent >= 2) {
    let kept = false;
    let result = agentText;
    for (const alias of nameInfo.aliases) {
      const r = new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
      result = result.replace(r, (match) => {
        if (!kept) { kept = true; return match; }
        return "";
      });
    }
    return cleanAfterNameStrip(result);
  }

  return agentText;
}

function stripAllNameOccurrences(text: string, nameInfo: ClientNameInfo): string {
  let result = text;
  for (const alias of nameInfo.aliases) {
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Strip leading "Name," or "Name!"
    result = result.replace(new RegExp(`^${escaped}\\s*[,!]\\s*`, "i"), "");
    // Strip remaining occurrences
    result = result.replace(new RegExp(`[,.]?\\s*(?<![A-Za-zÀ-ÿ])${escaped}(?![A-Za-zÀ-ÿ])[,!]?\\s*`, "gi"), " ");
  }
  return cleanAfterNameStrip(result);
}

function cleanAfterNameStrip(text: string): string {
  let result = text
    .replace(/\s{2,}/g, " ")
    .replace(/^[,.\s]+/, "")
    .replace(/,\s*,/g, ",")
    .replace(/,\s*\./g, ".")
    .trim();
  result = result.replace(/^[a-zà-ú]/, c => c.toUpperCase());
  return result;
}

/**
 * Post-processing: enforces formatting rules that LLMs sometimes ignore.
 */
export function enforceAgentFormatting(text: string): string {
  let cleaned = text.replace(/\s*[—–]\s*/g, ", ");
  cleaned = cleaned.replace(/(?<=\S)\s+-\s+/g, ", ");
  cleaned = cleaned.replace(/(^|[\n])，?\s*,\s*/g, "$1");
  cleaned = cleaned.replace(/,\s*,/g, ",");
  cleaned = cleaned.replace(/,\s*\./g, ".");
  cleaned = cleaned.replace(/[^.!?\n]*\b(vou te passar|vou te encaminhar|meu colega|minha colega|minha parceira|meu parceiro|nosso especialista|nossa especialista|nossa equipe vai|outro consultor|outra consultora|próximo agente|próximo atendente|te transferir|te direcionar)\b[^.!?\n]*[.!?]?\s*/gi, "");
  cleaned = cleaned.replace(/\[TRANSFERIR\]/g, "");
  cleaned = cleaned.replace(/\[BRIEFING[^\]]*\]:?\s*/gi, "");
  cleaned = cleaned.replace(/\[ESCALON[^\]]*\]:?\s*/gi, "");
  cleaned = cleaned.replace(/\[INTERNO[^\]]*\]:?\s*/gi, "");
  cleaned = cleaned.replace(/^.*\b(ESTADO|FASE|STEP|ETAPA|STAGE|QUALIFICA[ÇC][ÃA]O|TRANSFER[ÊE]NCIA)[_\s]*\d*[+,;]*\s*.*$/gm, "");
  cleaned = cleaned.replace(/^.*\b(ESTADO|FASE|STEP|ETAPA)[\s_]*\d+.*$/gm, "");
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n").trim();
  return cleaned;
}

/**
 * @deprecated Use sanitizeClientNameUsage instead.
 * Kept for backward compatibility.
 */
export function stripRepeatedLeadingName(currentMsg: string, previousAgentMsg?: string): string {
  if (!previousAgentMsg) return currentMsg;

  const namePattern = /^([A-ZÀ-Ú][a-zà-ú]{1,12})\s*[,!]\s*/;
  const currentMatch = currentMsg.match(namePattern);
  const prevMatch = previousAgentMsg.match(namePattern);
  const clientName = currentMatch?.[1] || prevMatch?.[1];
  if (!clientName) return currentMsg;

  const nameInfo = extractClientNames("", clientName);
  if (!nameInfo) return currentMsg;

  return sanitizeClientNameUsage(currentMsg, nameInfo, [previousAgentMsg]);
}
