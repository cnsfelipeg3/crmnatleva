// Número oficial NatLeva (fallback quando agency_config não retornar valor)
export const DEFAULT_AGENCY_WHATSAPP = "5511966396692";

export function resolveAgencyWhatsApp(value?: string | null): string {
  const v = (value || "").toString().trim();
  return v.length > 0 ? v : DEFAULT_AGENCY_WHATSAPP;
}
