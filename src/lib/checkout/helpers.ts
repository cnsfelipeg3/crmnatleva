// Helpers do checkout em etapas
import { hasProduct } from "@/lib/productTypes";

export const TERMS_VERSION = "v1.2026-06";

// Países sul-americanos que NÃO exigem passaporte para brasileiros (entram com RG)
const SOUTH_AMERICA_NO_PASSPORT = new Set([
  "argentina", "bolivia", "bolívia",
  "chile", "colombia", "colômbia",
  "equador", "paraguai", "peru",
  "uruguai", "venezuela",
]);

function norm(s?: string | null) {
  return String(s ?? "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().trim();
}

export function temAereo(product: any): boolean {
  if (!product) return false;
  const kind = norm(product.product_kind);
  if (kind === "aereo" || kind === "pacote") return true;
  if (Array.isArray(product.products) && hasProduct(product.products, "aereo")) return true;
  if (product.airline || product.origin_iata) return true;
  return false;
}

export function ehInternacional(product: any): boolean {
  const country = norm(product?.destination_country);
  if (!country) return false;
  return country !== "brasil" && country !== "brazil";
}

/** Retorna true quando o passageiro precisa preencher passaporte (número + validade). */
export function exigePassaporte(product: any): boolean {
  if (!temAereo(product) || !ehInternacional(product)) return false;
  const country = norm(product?.destination_country);
  if (SOUTH_AMERICA_NO_PASSPORT.has(country)) return false;
  return true;
}

// ---------- CPF ----------
const onlyDigits = (s: string) => String(s ?? "").replace(/\D/g, "");

export function isValidCPF(raw: string): boolean {
  const cpf = onlyDigits(raw);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1+$/.test(cpf)) return false;
  const calc = (factor: number) => {
    let sum = 0;
    for (let i = 0; i < factor - 1; i++) sum += Number(cpf[i]) * (factor - i);
    const d = (sum * 10) % 11;
    return d === 10 ? 0 : d;
  };
  return calc(10) === Number(cpf[9]) && calc(11) === Number(cpf[10]);
}

export function formatCPF(raw: string): string {
  const d = onlyDigits(raw).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function formatPhoneBR(raw: string): string {
  const d = onlyDigits(raw).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function isValidEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v ?? "").trim());
}

export function isValidPhoneBR(v: string): boolean {
  const d = onlyDigits(v);
  return d.length === 10 || d.length === 11;
}

export function isValidBirthDate(v: string): string | null {
  if (!v) return "informe a data de nascimento";
  const d = new Date(v + "T00:00:00");
  if (isNaN(d.getTime())) return "data inválida";
  const now = new Date();
  if (d > now) return "data no futuro";
  const minYear = now.getFullYear() - 120;
  if (d.getFullYear() < minYear) return "data muito antiga";
  return null;
}

export function isFuturePassportExpiry(v: string): boolean {
  if (!v) return false;
  const d = new Date(v + "T00:00:00");
  if (isNaN(d.getTime())) return false;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return d > today;
}

export const CHECKOUT_STEPS = ["resumo", "contato", "passageiros", "termos", "pagamento"] as const;
export type CheckoutStep = typeof CHECKOUT_STEPS[number];

export function stepIndex(step: string): number {
  const i = (CHECKOUT_STEPS as readonly string[]).indexOf(step);
  return i < 0 ? 0 : i;
}
