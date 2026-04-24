// Engine de cálculo de comissão personalizado por colaborador.
// Suporta dois modos:
//  - "default": usa percentuais por origem (7% agência / 20% orgânico) sobre o lucro de cada venda.
//  - "tiers":   faixas progressivas sobre o lucro acumulado no mês.
//               A base pode ser "company" (lucro total da empresa) ou "individual" (lucro do colab).

export type CommissionTier = {
  /** Limite superior da faixa em R$. `null` = infinito (última faixa). */
  up_to: number | null;
  /** Percentual aplicado dentro da faixa (0-100). */
  percent: number;
};

export type CommissionRules = {
  mode: "default" | "tiers";
  base: "company" | "individual";
  tiers: CommissionTier[];
};

export const DEFAULT_COMMISSION_RULES: CommissionRules = {
  mode: "default",
  base: "individual",
  tiers: [],
};

/** Padrões usados no modo "default" (definidos pela diretoria). */
export const DEFAULT_COMMISSION_AGENCIA = 0.07;
export const DEFAULT_COMMISSION_ORGANICO = 0.20;

export function parseCommissionRules(raw: unknown): CommissionRules {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_COMMISSION_RULES };
  const r = raw as Partial<CommissionRules>;
  return {
    mode: r.mode === "tiers" ? "tiers" : "default",
    base: r.base === "company" ? "company" : "individual",
    tiers: Array.isArray(r.tiers)
      ? r.tiers
          .filter((t) => t && typeof t === "object")
          .map((t) => ({
            up_to: t.up_to === null || t.up_to === undefined ? null : Number(t.up_to),
            percent: Number(t.percent) || 0,
          }))
      : [],
  };
}

/**
 * Calcula a comissão de uma única faixa progressiva sobre um lucro acumulado.
 * Ex: lucro=150k, tiers=[{up_to:100k,5%},{up_to:null,10%}] => 5%*100k + 10%*50k = 10k.
 */
export function computeProgressiveCommission(profitTotal: number, tiers: CommissionTier[]): number {
  if (profitTotal <= 0 || !tiers.length) return 0;
  // Garante ordem crescente por up_to (null = infinito vai pro fim).
  const ordered = [...tiers].sort((a, b) => {
    const av = a.up_to ?? Infinity;
    const bv = b.up_to ?? Infinity;
    return av - bv;
  });

  let remaining = profitTotal;
  let lower = 0;
  let total = 0;
  for (const tier of ordered) {
    const cap = tier.up_to ?? Infinity;
    const slice = Math.max(0, Math.min(remaining, cap - lower));
    if (slice <= 0) {
      lower = cap;
      continue;
    }
    total += slice * (tier.percent / 100);
    remaining -= slice;
    lower = cap;
    if (remaining <= 0) break;
  }
  return total;
}

/** Cálculo padrão (7%/20% por origem) somando venda a venda. */
export function computeDefaultCommission(
  sales: Array<{ profit?: number | null; lead_type?: string | null }>
): { agencia: number; organico: number; total: number } {
  let agencia = 0;
  let organico = 0;
  for (const s of sales) {
    const lucro = Math.max(0, Number(s.profit) || 0);
    if (s.lead_type === "organico") organico += lucro * DEFAULT_COMMISSION_ORGANICO;
    else agencia += lucro * DEFAULT_COMMISSION_AGENCIA;
  }
  return { agencia, organico, total: agencia + organico };
}
