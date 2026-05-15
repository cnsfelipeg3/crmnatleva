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
  /** Quando o produto tem parcelas personalizadas (valor por boleto), exposto pra UI montar o cronograma. */
  customInstallments?: number[];
  /** true quando a soma da entrada + parcelas personalizadas diverge do total (>1 R$ de diferença). */
  customMismatch?: boolean;
};

export type PublicPaymentTerms = {
  entry_percent?: number | string | null;
  entry_amount?: number | string | null;
  min_days_before_checkin?: number | string | null;
  balance_installments_max?: number | string | null;
  balance_min_installment?: number | string | null;
  balance_interest_percent?: number | string | null;
  balance_custom_installments?: unknown[] | null;
  balance_method?: string | null;
};

const SYMBOL: Record<string, string> = { BRL: "R$", USD: "US$", EUR: "€" };

export function formatMoneyBR(v: number, currency = "BRL") {
  const s = SYMBOL[currency] || "R$";
  return `${s} ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function readPaymentTermNumber(value: unknown, allowZero = false): number | undefined {
  const n = Number(value);
  if (!Number.isFinite(n)) return undefined;
  if (allowZero ? n < 0 : n <= 0) return undefined;
  return n;
}

export function paymentBalanceLabel(method?: string | null, interestPercent?: number | string | null): string {
  const interest = Number(interestPercent) > 0 ? "com juros" : "sem juros";
  if (method === "cartao") return `${interest} no cartão`;
  if (method === "ambos") return `${interest} no boleto ou cartão`;
  return `${interest} no boleto`;
}

export function paymentPlanOptionsFromTerms(
  terms: PublicPaymentTerms | null | undefined,
  fallback?: { currency?: string; maxInstallments?: number | null }
) {
  const customInstallments = Array.isArray(terms?.balance_custom_installments)
    ? terms.balance_custom_installments.map(Number).filter((v) => Number.isFinite(v) && v > 0)
    : undefined;

  return {
    entryPercent: readPaymentTermNumber(terms?.entry_percent, true),
    entryAmount: readPaymentTermNumber(terms?.entry_amount, true),
    daysBefore: readPaymentTermNumber(terms?.min_days_before_checkin),
    currency: fallback?.currency ?? "BRL",
    maxInstallments: readPaymentTermNumber(terms?.balance_installments_max) ?? fallback?.maxInstallments ?? undefined,
    minInstallment: readPaymentTermNumber(terms?.balance_min_installment),
    customInstallments: customInstallments && customInstallments.length > 0 ? customInstallments : undefined,
  };
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
    /** Valores explícitos de cada parcela do saldo (em moeda). Quando definido, ignora maxInstallments/minInstallment. */
    customInstallments?: number[];
  }
): NatlevaPlan | null {
  if (!price || price <= 0) return null;
  const daysBefore = opts?.daysBefore ?? 20;
  const maxInstallments = Math.max(1, Math.round(opts?.maxInstallments ?? 12));
  const currency = opts?.currency ?? "BRL";
  const minInstallment = opts?.minInstallment ?? 0;
  const pixDiscountPercent = opts?.pixDiscountPercent ?? 0;
  const total = Number(price);
  // Se entryAmount foi definido e é válido, deriva o entryPercent dele
  const fixedEntry = opts?.entryAmount != null && Number.isFinite(opts.entryAmount) && opts.entryAmount >= 0 && opts.entryAmount < total ? opts.entryAmount : null;
  const entryPercent = fixedEntry != null
    ? Math.round((fixedEntry / total) * 100 * 10) / 10
    : (opts?.entryPercent ?? 30);

  let dep: Date | null = null;
  if (departureDate) {
    dep = typeof departureDate === "string" ? new Date(departureDate + "T00:00:00") : departureDate;
    if (isNaN(dep.getTime())) dep = null;
  }
  const isSimulated = !dep;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let payoffDate: Date | null = null;

  if (dep) {
    payoffDate = new Date(dep.getTime() - daysBefore * 24 * 60 * 60 * 1000);
  }

  const entryAmount = fixedEntry != null
    ? Math.round(fixedEntry * 100) / 100
    : Math.round(total * (entryPercent / 100) * 100) / 100;
  const balanceAmount = Math.round((total - entryAmount) * 100) / 100;

  // Modo personalizado · usa exatamente as parcelas informadas
  const customRaw = opts?.customInstallments?.filter((v) => Number.isFinite(v) && v > 0) ?? [];
  const useCustom = customRaw.length > 0;

  let installments: number;
  let installmentAmount: number;
  let customMismatch: boolean | undefined;

  if (useCustom) {
    installments = customRaw.length;
    const sum = Math.round(customRaw.reduce((a, b) => a + b, 0) * 100) / 100;
    installmentAmount = Math.round((sum / installments) * 100) / 100;
    customMismatch = Math.abs(sum - balanceAmount) > 1;
  } else {
    installments = maxInstallments;
    // minInstallment é piso informativo · NÃO reduz o número de parcelas configurado pelo usuário
    // (se o usuário configurou 10x, mostramos 10x mesmo que o valor por parcela fique abaixo do mínimo)
    // Arredonda pra cima em centavo pra garantir que entrada + n×parcela >= total
    // (a última parcela absorve a diferença · UI mostra o valor padrão)
    installmentAmount = Math.ceil((balanceAmount / installments) * 100) / 100;
  }

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
    customInstallments: useCustom ? customRaw.map((v) => Math.round(v * 100) / 100) : undefined,
    customMismatch,
  };
}

export function formatPayoffDate(d: Date | null): string | null {
  if (!d) return null;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}
