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
 * Strips the client name from the beginning of a message if the previous
 * agent message also started with the same name — prevents robotic repetition.
 * 
 * @param currentMsg - The new agent message
 * @param previousAgentMsg - The last agent message (if any)
 * @returns The message with leading name removed if it was repeated
 */
export function stripRepeatedLeadingName(currentMsg: string, previousAgentMsg?: string): string {
  if (!previousAgentMsg) return currentMsg;

  // Extract leading name pattern: "Name," or "Name!" at the start
  const namePattern = /^([A-ZÀ-Ú][a-zà-ú]{1,12})\s*[,!]\s*/;
  const currentMatch = currentMsg.match(namePattern);
  const prevMatch = previousAgentMsg.match(namePattern);

  if (currentMatch && prevMatch && currentMatch[1].toLowerCase() === prevMatch[1].toLowerCase()) {
    // Both messages start with the same name — strip it from current
    return currentMsg.replace(namePattern, "").replace(/^[a-zà-ú]/, c => c.toUpperCase());
  }
  return currentMsg;
}
