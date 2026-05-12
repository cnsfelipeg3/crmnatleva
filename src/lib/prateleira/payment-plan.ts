// Plano de pagamento padrão Natleva
// 30% de entrada à vista (PIX, cartão ou link) + saldo no boleto sem juros
// Quitação até N dias antes do embarque (default 20)

export type NatlevaPlan = {
  total: number;
  entryPercent: number;
  entryAmount: number;
  balanceAmount: number;
  installments: number;
  installmentAmount: number;
  payoffDate: Date | null;
  departureDate: Date | null;
  daysBefore: number;
  isSimulated: boolean; // true quando não há departure_date e usamos hipótese
  currency: string;
};

const SYMBOL: Record<string, string> = { BRL: "R$", USD: "US$", EUR: "€" };

export function formatMoneyBR(v: number, currency = "BRL") {
  const s = SYMBOL[currency] || "R$";
  return `${s} ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function computeNatlevaPlan(
  price: number | null | undefined,
  departureDate: string | Date | null | undefined,
  opts?: { entryPercent?: number; daysBefore?: number; currency?: string; maxInstallments?: number; simulatedMonths?: number }
): NatlevaPlan | null {
  if (!price || price <= 0) return null;
  const entryPercent = opts?.entryPercent ?? 30;
  const daysBefore = opts?.daysBefore ?? 20;
  const maxInstallments = opts?.maxInstallments ?? 12;
  const currency = opts?.currency ?? "BRL";

  let dep: Date | null = null;
  if (departureDate) {
    dep = typeof departureDate === "string" ? new Date(departureDate + "T00:00:00") : departureDate;
    if (isNaN(dep.getTime())) dep = null;
  }
  const isSimulated = !dep;
  const simulatedMonths = opts?.simulatedMonths ?? 6;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let payoffDate: Date | null = null;
  let monthsAvailable = 1;

  if (dep) {
    payoffDate = new Date(dep.getTime() - daysBefore * 24 * 60 * 60 * 1000);
    const diffMs = payoffDate.getTime() - today.getTime();
    const diffMonths = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30));
    monthsAvailable = Math.max(1, Math.min(maxInstallments, diffMonths));
  } else {
    monthsAvailable = Math.min(maxInstallments, simulatedMonths);
  }

  const total = Number(price);
  const entryAmount = Math.round(total * (entryPercent / 100) * 100) / 100;
  const balanceAmount = Math.round((total - entryAmount) * 100) / 100;
  const installments = monthsAvailable;
  const installmentAmount = Math.round((balanceAmount / installments) * 100) / 100;

  return {
    total,
    entryPercent,
    entryAmount,
    balanceAmount,
    installments,
    installmentAmount,
    payoffDate,
    departureDate: dep,
    daysBefore,
    isSimulated,
    currency,
  };
}

export function formatPayoffDate(d: Date | null): string | null {
  if (!d) return null;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}
