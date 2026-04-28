// Fare classifier · normaliza tarifas de qualquer cia em 6 tiers visuais consistentes.
// Funciona por SEMÂNTICA (palavras-chave em cabin/fare_type/features), não por nome de cia.

import type { GBookingProvider, GFareTier } from "./gflightsTypes";

// ---------- TIER (categoria normalizada) ----------

export function classifyFareTier(
  p: Pick<GBookingProvider, "cabin" | "fareType" | "features" | "baggage">,
): GFareTier {
  const cabin = (p.cabin ?? "").toUpperCase();
  const fareType = (p.fareType ?? "").toUpperCase();
  const text = `${cabin} ${fareType}`;
  const features = (p.features ?? []).join(" ").toLowerCase();

  // First (mais alta)
  if (/(^|\s)FIRST(\s|$)|PRIMEIRA\s*CLASSE/.test(text)) return "first";

  // Business / Executiva
  if (/BUSINESS|EXECUTIV[AO]/.test(text)) return "business";

  // Premium Economy
  if (/PREMIUM\s*(ECONOMY|ECONOMICA|PLUS)|ECONOMIA\s*PREMIUM/.test(text)) return "premium";

  // Flexible / Refundable
  if (/REFUND|FLEX|REEMBOLS|FLEXIBLE|FULLY\s*REFUND/.test(text)) return "flexible";
  if (/altera[cç][aã]o\s*gr[aá]tis|reembols|change.*free|refundable/.test(features)) return "flexible";

  // Basic / Restrictive
  if (/BASIC|SAVER|LIGHT|MINIMA|LITE|PROMO|B[AÁ]SICA?/.test(text)) return "basic";

  return "standard";
}

// ---------- DISPLAY NAME ----------

const TIER_PT_LABELS: Record<GFareTier, string> = {
  basic: "Restrita",
  standard: "Padrão",
  flexible: "Flexível",
  premium: "Premium Economy",
  business: "Executiva",
  first: "Primeira Classe",
};

export function fareDisplayName(
  p: Pick<GBookingProvider, "cabin" | "fareType">,
  tier: GFareTier,
): string {
  const raw = p.fareType || p.cabin || "";
  if (!raw) return TIER_PT_LABELS[tier];
  const titleCased = raw
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase())
    .replace(/Inr/i, "")
    .trim();
  return titleCased || TIER_PT_LABELS[tier];
}

// ---------- ANALYSIS ----------

export interface FareAnalysis {
  tier: GFareTier;
  displayName: string;
  benefits: string[];
  restrictions: string[];
}

export function analyzeFare(p: GBookingProvider): FareAnalysis {
  const tier = classifyFareTier(p);
  const displayName = fareDisplayName(p, tier);
  const features = p.features ?? [];
  const baggage = p.baggage ?? [];

  const benefits: string[] = [];
  const restrictions: string[] = [];

  // Bagagem
  const hasBagMao = baggage.some((b) => /bagagem\s*de\s*m[aã]o|carry-on/i.test(b));
  const hasBagDespachada = baggage.some((b) =>
    /bagagem\s*despachada|checked\s*bag|bag\s*incluída/i.test(b),
  );

  if (hasBagMao) benefits.push("1 bagagem de mão inclusa");
  if (hasBagDespachada) benefits.push("Bagagem despachada inclusa");
  else if (tier === "basic" || (tier === "standard" && baggage.length > 0)) {
    restrictions.push("Sem bagagem despachada inclusa");
  }

  // Features positivas/negativas
  for (const f of features) {
    const lf = f.toLowerCase();
    if (/altera[cç][aã]o\s*gr[aá]tis|change.*free/.test(lf)) {
      benefits.push("Alteração gratuita");
    } else if (/reembols[áa]vel|refundable/.test(lf) && !/n[ãa]o\s*reembols/.test(lf)) {
      benefits.push("Tarifa reembolsável");
    } else if (
      /sele[cç][aã]o.*assent.*gratuit|seat.*free|escolha.*assento.*gratuit/.test(lf)
    ) {
      benefits.push("Seleção de assentos grátis");
    } else if (/embarque\s*priorit[aá]rio|priority.*board/.test(lf)) {
      benefits.push("Embarque prioritário");
    } else if (/espa[cç]o.*extra.*pernas|extra\s*legroom/.test(lf) && !/cobrad/.test(lf)) {
      benefits.push("Espaço extra para pernas");
    } else if (/upgrade.*gratuit|free\s*upgrade/.test(lf)) {
      benefits.push("Upgrade incluso");
    } else if (/cobrad|taxa|à\s*parte|fee/.test(lf)) {
      if (/assento|seat/.test(lf)) restrictions.push("Assento pago à parte");
      else if (/embarque/.test(lf)) restrictions.push("Embarque preferencial pago");
      else if (/espa[cç]o|legroom/.test(lf)) restrictions.push("Espaço extra pago à parte");
      else if (/altera/.test(lf)) restrictions.push("Alteração com taxa");
      else restrictions.push(f);
    }
  }

  if (features.length === 0 && baggage.length === 0) {
    if (tier === "basic") {
      restrictions.push("Tarifa restrita · sem bagagem despachada, sem alteração, sem reembolso");
    }
  }

  return {
    tier,
    displayName,
    benefits: Array.from(new Set(benefits)),
    restrictions: Array.from(new Set(restrictions)),
  };
}

// ---------- VISUAL META ----------

export const TIER_META: Record<
  GFareTier,
  {
    color: string;
    bg: string;
    border: string;
    emoji: string;
    label: string;
    description: string;
  }
> = {
  basic: {
    color: "text-rose-700 dark:text-rose-300",
    bg: "bg-rose-500/10",
    border: "border-rose-500/30",
    emoji: "🔴",
    label: "Restrita",
    description: "Tarifa básica · sem benefícios · cuidado com taxas extras",
  },
  standard: {
    color: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    emoji: "🟡",
    label: "Padrão",
    description: "Econômica regular da companhia",
  },
  flexible: {
    color: "text-emerald-700 dark:text-emerald-300",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    emoji: "🟢",
    label: "Flexível",
    description: "Inclui alteração ou reembolso · mais bagagem · mais segurança",
  },
  premium: {
    color: "text-sky-700 dark:text-sky-300",
    bg: "bg-sky-500/10",
    border: "border-sky-500/30",
    emoji: "🔵",
    label: "Premium Economy",
    description: "Categoria entre econômica e executiva · mais conforto",
  },
  business: {
    color: "text-violet-700 dark:text-violet-300",
    bg: "bg-violet-500/10",
    border: "border-violet-500/30",
    emoji: "🟣",
    label: "Executiva",
    description: "Cabine business · benefícios completos",
  },
  first: {
    color: "text-fuchsia-700 dark:text-fuchsia-300",
    bg: "bg-fuchsia-500/10",
    border: "border-fuchsia-500/30",
    emoji: "👑",
    label: "Primeira Classe",
    description: "Cabine premium top · todos os luxos",
  },
};
