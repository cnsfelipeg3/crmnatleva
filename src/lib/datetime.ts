// Helper único de formatação de datas no fuso de São Paulo.
// Usa Intl API nativa (sem deps extras) para evitar bundle bloat.
import { isToday, isYesterday } from "date-fns";

const SP_TZ = "America/Sao_Paulo";

const timeFmt = new Intl.DateTimeFormat("pt-BR", {
  timeZone: SP_TZ,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const dayMonthFmt = new Intl.DateTimeFormat("pt-BR", {
  timeZone: SP_TZ,
  day: "2-digit",
  month: "2-digit",
});

const fullDateFmt = new Intl.DateTimeFormat("pt-BR", {
  timeZone: SP_TZ,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function toDate(date: string | Date | null | undefined): Date | null {
  if (!date) return null;
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return null;
  return d;
}

/** Retorna HH:mm no fuso de São Paulo. */
export function formatToSP(date: string | Date | null | undefined): string {
  const d = toDate(date);
  if (!d) return "";
  return timeFmt.format(d);
}

/** Estilo WhatsApp: hoje → HH:mm · ontem → "Ontem" · resto → dd/MM. */
export function formatRelativeSP(date: string | Date | null | undefined): string {
  const d = toDate(date);
  if (!d) return "";
  // Para isToday/isYesterday usamos a data convertida ao fuso SP
  const spString = d.toLocaleString("en-US", { timeZone: SP_TZ });
  const zoned = new Date(spString);
  if (isToday(zoned)) return timeFmt.format(d);
  if (isYesterday(zoned)) return "Ontem";
  return dayMonthFmt.format(d);
}

/** Data + hora completa no fuso SP. */
export function formatFullSP(date: string | Date | null | undefined): string {
  const d = toDate(date);
  if (!d) return "";
  return fullDateFmt.format(d);
}
