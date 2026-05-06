import { parsePhoneNumber, isValidPhoneNumber, AsYouType } from "libphonenumber-js/min";

/**
 * Formata telefone brasileiro manualmente quando o libphonenumber não valida.
 * Aceita 10 dígitos (fixo: DDD + 8) ou 11 dígitos (móvel: DDD + 9).
 * Se vier com 10 dígitos e o terceiro não for 9, mantém formato fixo.
 */
function formatBR(digitsWithoutCC: string): string | null {
  const d = digitsWithoutCC.replace(/\D/g, "");
  if (d.length === 11) {
    return `+55 ${d.slice(0, 2)} ${d.slice(2, 7)}·${d.slice(7)}`.replace("·", "-");
  }
  if (d.length === 10) {
    // Pode ser fixo (DDD + 8) ou móvel antigo. Insere 9 se for celular antigo (3º dígito 6/7/8/9 sem 9 prefix).
    const ddd = d.slice(0, 2);
    const local = d.slice(2);
    // Heurística: número móvel antigo (8 dígitos começando com 6/7/8/9) → adiciona 9
    if (/^[6-9]/.test(local)) {
      const fixed = `9${local}`;
      return `+55 ${ddd} ${fixed.slice(0, 5)}-${fixed.slice(5)}`;
    }
    return `+55 ${ddd} ${local.slice(0, 4)}-${local.slice(4)}`;
  }
  return null;
}

/**
 * Formata telefone para exibição internacional (ex: +55 11 94175-0465).
 * Fallback robusto: tenta libphonenumber, depois formato BR manual, depois AsYouType.
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

  // 1. Caminho feliz: libphonenumber valida e formata
  try {
    if (isValidPhoneNumber(e164)) {
      return parsePhoneNumber(e164).formatInternational();
    }
  } catch {
    /* segue fallback */
  }

  // 2. Brasil (começa com 55): formata manualmente
  if (digits.startsWith("55") && digits.length >= 12 && digits.length <= 13) {
    const br = formatBR(digits.slice(2));
    if (br) return br;
  }
  // 2b. Sem code, mas 10/11 dígitos → assume Brasil
  if (!digits.startsWith("55") && (digits.length === 10 || digits.length === 11)) {
    const br = formatBR(digits);
    if (br) return br;
  }

  // 3. AsYouType genérico (não valida, mas formata bonitinho)
  try {
    const formatted = new AsYouType().input(e164);
    if (formatted && formatted.length > 4) return formatted;
  } catch {
    /* ignore */
  }

  return String(rawPhone);
}

/** Versão nacional, sem country code, para UIs compactas. */
export function formatPhoneNational(rawPhone: string | null | undefined): string {
  if (!rawPhone) return "";
  const digits = String(rawPhone).replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length >= 15) return "Grupo";

  const e164 = String(rawPhone).startsWith("+") ? String(rawPhone) : `+${digits}`;
  try {
    if (isValidPhoneNumber(e164)) return parsePhoneNumber(e164).formatNational();
  } catch {
    /* ignore */
  }

  // Fallback BR
  const local = digits.startsWith("55") ? digits.slice(2) : digits;
  const br = formatBR(local);
  if (br) return br.replace(/^\+55\s/, "");

  return String(rawPhone);
}

/** Normaliza input de busca/filtro: remove tudo exceto dígitos. */
export function cleanPhoneForSearch(input: string): string {
  return String(input || "").replace(/\D/g, "");
}
