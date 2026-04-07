/**
 * Shared agent formatting utilities — used by both Manual and Chameleon simulators.
 * Enforces formatting rules that LLMs sometimes ignore, guaranteeing 100% compliance.
 */

/**
 * Post-processing: enforces formatting rules that LLMs sometimes ignore.
 * Runs AFTER the AI response, guaranteeing 100% compliance.
 */
export function enforceAgentFormatting(text: string): string {
  // Remove em-dashes (—), en-dashes (–) and hyphens used as dashes ( - ) → replace with comma or period
  let cleaned = text.replace(/\s*[—–]\s*/g, ", ");
  // Hyphens flanked by spaces (used as dash/travessão) but NOT at line start (lists)
  cleaned = cleaned.replace(/(?<=\S)\s+-\s+/g, ", ");
  // Remove leading comma if line starts with it after replacement
  cleaned = cleaned.replace(/(^|[\n])，?\s*,\s*/g, "$1");
  // Collapse multiple commas
  cleaned = cleaned.replace(/,\s*,/g, ",");
  // Remove trailing comma before period
  cleaned = cleaned.replace(/,\s*\./g, ".");
  // 🛡️ Invisible handoff: remove any leaked transfer language
  cleaned = cleaned.replace(/[^.!?\n]*\b(vou te passar|vou te encaminhar|meu colega|minha colega|minha parceira|meu parceiro|nosso especialista|nossa especialista|nossa equipe vai|outro consultor|outra consultora|próximo agente|próximo atendente|te transferir|te direcionar)\b[^.!?\n]*[.!?]?\s*/gi, "");
  // Strip internal tags that should never reach UI
  cleaned = cleaned.replace(/\[TRANSFERIR\]/g, "");
  cleaned = cleaned.replace(/\[BRIEFING[^\]]*\]:?\s*/gi, "");
  cleaned = cleaned.replace(/\[ESCALON[^\]]*\]:?\s*/gi, "");
  cleaned = cleaned.replace(/\[INTERNO[^\]]*\]:?\s*/gi, "");
  // Strip leaked internal state labels
  cleaned = cleaned.replace(/^.*\b(ESTADO|FASE|STEP|ETAPA|STAGE|QUALIFICA[ÇC][ÃA]O|TRANSFER[ÊE]NCIA)[_\s]*\d*[+,;]*\s*.*$/gm, "");
  cleaned = cleaned.replace(/^.*\b(ESTADO|FASE|STEP|ETAPA)[\s_]*\d+.*$/gm, "");
  // Clean up multiple blank lines left after stripping
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n").trim();
  return cleaned;
}

/**
 * Strips excessive client name usage from agent messages.
 * 
 * Two layers:
 * 1. If previous agent msg started with same name → strip from beginning of current
 * 2. If current msg uses the name 2+ times → remove all but the first occurrence
 * 3. If previous agent msg used the name anywhere → strip ALL occurrences from current
 * 
 * @param currentMsg - The new agent message
 * @param previousAgentMsg - The last agent message (if any)
 * @returns The message with excessive name usage removed
 */
export function stripRepeatedLeadingName(currentMsg: string, previousAgentMsg?: string): string {
  if (!previousAgentMsg) return currentMsg;

  // Extract leading name pattern: "Name," or "Name!" at the start
  const namePattern = /^([A-ZÀ-Ú][a-zà-ú]{1,12})\s*[,!]\s*/;
  const currentMatch = currentMsg.match(namePattern);
  const prevMatch = previousAgentMsg.match(namePattern);

  // Detect the client name from either message
  const clientName = currentMatch?.[1] || prevMatch?.[1];
  if (!clientName) return currentMsg;

  const nameRegex = new RegExp(`\\b${clientName}\\b`, "gi");

  // Count how many times the name appears in previous agent message
  const prevNameCount = (previousAgentMsg.match(nameRegex) || []).length;
  // Count how many times the name appears in current message
  const currentNameCount = (currentMsg.match(nameRegex) || []).length;

  // If previous message already used the name → strip ALL from current
  if (prevNameCount > 0 && currentNameCount > 0) {
    let result = currentMsg;
    // Strip leading "Name," or "Name!"
    result = result.replace(namePattern, "");
    // Strip remaining occurrences like "Name," or ", Name," in the middle
    result = result.replace(new RegExp(`[,.]?\\s*${clientName}[,!]?\\s*`, "gi"), " ");
    // Clean up double spaces and leading lowercase
    result = result.replace(/\s{2,}/g, " ").trim();
    result = result.replace(/^[a-zà-ú]/, c => c.toUpperCase());
    // Clean artifacts: leading comma/period
    result = result.replace(/^[,.\s]+/, "").trim();
    return result;
  }

  // If current message uses the name 2+ times → keep only first
  if (currentNameCount >= 2) {
    let kept = false;
    const result = currentMsg.replace(nameRegex, (match) => {
      if (!kept) { kept = true; return match; }
      return "";
    }).replace(/\s{2,}/g, " ").replace(/,\s*,/g, ",").replace(/,\s*\./g, ".").trim();
    return result;
  }

  return currentMsg;
}
