/**
 * Formata uma data para o padrão dd/MM/yyyy
 * Usa componentes locais para evitar shifts de timezone.
 */
export function formatDateBR(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  // Parse sem timezone shift: trata "YYYY-MM-DD" como local
  const parts = dateStr.split("T")[0].split("-");
  if (parts.length === 3) {
    const [y, m, d] = parts;
    return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;
  }
  // Fallback para ISO strings completas
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "—";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear());
  return `${day}/${month}/${year}`;
}

/**
 * Formata uma data+hora para o padrão dd/mm/yy - HH:MM
 */
export function formatDateTimeBR(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "—";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear());
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} - ${hours}:${minutes}`;
}

/**
 * Formata apenas hora HH:MM a partir de string time "HH:MM:SS" ou "HH:MM"
 */
export function formatTimeBR(timeStr: string | null | undefined): string {
  if (!timeStr) return "";
  return timeStr.split(":").slice(0, 2).join(":");
}
