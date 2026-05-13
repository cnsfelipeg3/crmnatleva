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
  pixDiscountPercent?: number;
  pixTotal?: number;
  minInstallment?: number;
};

const SYMBOL: Record<string, string> = { BRL: "R$", USD: "US$", EUR: "€" };

export function formatMoneyBR(v: number, currency = "BRL") {
  const s = SYMBOL[currency] || "R$";
  return `${s} ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function computeNatlevaPlan(
  price: number | null | undefined,
  departureDate: string | Date | null | undefined,
  opts?: {
    entryPercent?: number;
    entryAmount?: number; // valor fixo em moeda · sobrepõe entryPercent quando definido
    daysBefore?: number;
    currency?: string;
    maxInstallments?: number;
    simulatedMonths?: number;
    minInstallment?: number;
    pixDiscountPercent?: number;
  }
): NatlevaPlan | null {
  if (!price || price <= 0) return null;
  const daysBefore = opts?.daysBefore ?? 20;
  const maxInstallments = opts?.maxInstallments ?? 12;
  const currency = opts?.currency ?? "BRL";
  const minInstallment = opts?.minInstallment ?? 0;
  const pixDiscountPercent = opts?.pixDiscountPercent ?? 0;
  const total = Number(price);
  // Se entryAmount foi definido e é válido, deriva o entryPercent dele
  const fixedEntry = opts?.entryAmount && opts.entryAmount > 0 && opts.entryAmount < total ? opts.entryAmount : null;
  const entryPercent = fixedEntry != null
    ? Math.round((fixedEntry / total) * 100 * 10) / 10
    : (opts?.entryPercent ?? 30);

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

  // Aplica valor mínimo da parcela (reduz nº de parcelas se necessário)
  let installments = monthsAvailable;
  if (minInstallment > 0 && balanceAmount > 0) {
    const maxByMin = Math.max(1, Math.floor(balanceAmount / minInstallment));
    installments = Math.min(installments, maxByMin);
  }
  const installmentAmount = Math.round((balanceAmount / installments) * 100) / 100;

  const pixTotal = pixDiscountPercent > 0
    ? Math.round(total * (1 - pixDiscountPercent / 100) * 100) / 100
    : undefined;

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
    pixDiscountPercent: pixDiscountPercent > 0 ? pixDiscountPercent : undefined,
    pixTotal,
    minInstallment: minInstallment > 0 ? minInstallment : undefined,
  };
}

export function formatPayoffDate(d: Date | null): string | null {
  if (!d) return null;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}
