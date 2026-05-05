/**
 * Formata "tempo como cliente" em PT-BR humanizado.
 */
export function formatCustomerSince(customerSince: string | Date | null | undefined): string | null {
  if (!customerSince) return null;
  const since = typeof customerSince === "string" ? new Date(customerSince) : customerSince;
  if (isNaN(since.getTime())) return null;

  const dias = Math.floor((Date.now() - since.getTime()) / 86400000);
  if (dias < 0) return null;
  if (dias < 7) return `Cliente há ${dias} dia${dias === 1 ? "" : "s"}`;
  if (dias < 30) {
    const semanas = Math.floor(dias / 7);
    return `Cliente há ${semanas} semana${semanas === 1 ? "" : "s"}`;
  }
  if (dias < 365) {
    const meses = Math.floor(dias / 30);
    return `Cliente há ${meses} ${meses === 1 ? "mês" : "meses"}`;
  }
  const anos = Math.floor(dias / 365);
  const restoMeses = Math.floor((dias % 365) / 30);
  if (restoMeses === 0) return `Cliente há ${anos} ano${anos === 1 ? "" : "s"}`;
  return `Cliente há ${anos}a ${restoMeses}m`;
}

export function customerTier(
  customerSince: string | Date | null | undefined
): "novo" | "recente" | "fiel" | "veterano" | null {
  if (!customerSince) return null;
  const since = typeof customerSince === "string" ? new Date(customerSince) : customerSince;
  if (isNaN(since.getTime())) return null;
  const dias = Math.floor((Date.now() - since.getTime()) / 86400000);
  if (dias < 0) return null;
  if (dias < 30) return "novo";
  if (dias < 180) return "recente";
  if (dias < 365) return "fiel";
  return "veterano";
}
