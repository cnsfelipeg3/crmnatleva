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
  cleaned = cleaned.replace(/[^.!?\n]*\b(vou te passar|vou te encaminhar|meu colega|nosso especialista|outro consultor|próximo agente|próximo atendente|te transferir|te direcionar)\b[^.!?\n]*[.!?]?\s*/gi, "");
  // Strip leaked internal state labels
  cleaned = cleaned.replace(/^.*\b(ESTADO|FASE|STEP|ETAPA|STAGE|QUALIFICA[ÇC][ÃA]O|TRANSFER[ÊE]NCIA)[_\s]*\d*[+,;]*\s*.*$/gm, "");
  cleaned = cleaned.replace(/^.*\b(ESTADO|FASE|STEP|ETAPA)[\s_]*\d+.*$/gm, "");
  // Clean up multiple blank lines left after stripping
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n").trim();
  return cleaned;
}
