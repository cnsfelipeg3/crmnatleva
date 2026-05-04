import { parsePhoneNumber, isValidPhoneNumber } from "libphonenumber-js/min";

/**
 * Formata telefone para exibição no formato internacional (ex: +55 11 94175-0465).
 * - Detecta grupos do WhatsApp (15+ dígitos) e retorna o nome do grupo (ou "Grupo").
 * - Retorna o valor cru se não conseguir validar/formatar (fallback seguro).
 */
export function formatPhoneDisplay(
  rawPhone: string | null | undefined,
  opts?: { groupName?: string | null }
): string {
  if (!rawPhone) return "";
  const digits = String(rawPhone).replace(/\D/g, "");
  if (!digits) return "";

  if (digits.length >= 15) {
    return opts?.groupName?.trim() || "Grupo";
  }

  const e164 = String(rawPhone).startsWith("+") ? String(rawPhone) : `+${digits}`;
  try {
    if (!isValidPhoneNumber(e164)) return String(rawPhone);
    return parsePhoneNumber(e164).formatInternational();
  } catch {
    return String(rawPhone);
  }
}

/** Versão nacional, sem country code, para UIs compactas. */
export function formatPhoneNational(rawPhone: string | null | undefined): string {
  if (!rawPhone) return "";
  const digits = String(rawPhone).replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length >= 15) return "Grupo";

  const e164 = String(rawPhone).startsWith("+") ? String(rawPhone) : `+${digits}`;
  try {
    if (!isValidPhoneNumber(e164)) return String(rawPhone);
    return parsePhoneNumber(e164).formatNational();
  } catch {
    return String(rawPhone);
  }
}

/** Normaliza input de busca/filtro: remove tudo exceto dígitos. */
export function cleanPhoneForSearch(input: string): string {
  return String(input || "").replace(/\D/g, "");
}
