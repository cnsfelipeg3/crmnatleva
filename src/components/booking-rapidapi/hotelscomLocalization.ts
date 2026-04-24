const EXACT_TRANSLATIONS: Record<string, string> = {
  "you will not be charged yet": "Você ainda não será cobrado",
  "pay later": "Pague depois",
  "pay now": "Pagamento imediato",
  "payment immediate": "Pagamento imediato",
  "free cancellation": "Cancelamento grátis",
  "fully refundable": "Totalmente reembolsável",
  "non refundable": "Não reembolsável",
  "breakfast included": "Café da manhã incluso",
  "free breakfast": "Café da manhã grátis",
  "free self parking": "Estacionamento grátis",
  "free parking": "Estacionamento grátis",
  "private bathroom": "Banheiro privativo",
  "free toiletries": "Amenidades de banho grátis",
  "hair dryer": "Secador de cabelo",
  shower: "Chuveiro",
  towels: "Toalhas",
  "bed sheets": "Roupa de cama",
  minibar: "Frigobar",
  "separate bedroom": "Quarto separado",
  "wheelchair accessibility": "Acessibilidade para cadeira de rodas",
  "smart tv with satellite channels": "Smart TV com canais via satélite",
  "wi-fi grátis": "Wi‑Fi grátis",
  "free wifi": "Wi‑Fi grátis",
  "free wi-fi": "Wi‑Fi grátis",
  "verified traveler": "Hóspede verificado",
};

const RATING_WORDS: Record<string, string> = {
  exceptional: "Excepcional",
  excellent: "Excelente",
  wonderful: "Maravilhoso",
  superb: "Excelente",
  verygood: "Muito bom",
  very_good: "Muito bom",
  good: "Bom",
  fair: "Razoável",
};

function pluralize(value: number, singular: string, plural: string): string {
  return `${value} ${value === 1 ? singular : plural}`;
}

function translateExact(text: string): string | undefined {
  return EXACT_TRANSLATIONS[text.trim().toLowerCase()];
}

export function translateHotelscomRatingWord(text?: string): string | undefined {
  if (!text) return undefined;
  const key = text.trim().toLowerCase().replace(/\s+/g, "_");
  return RATING_WORDS[key] ?? RATING_WORDS[key.replace(/_/g, "")] ?? text;
}

export function translateHotelscomDistance(text?: string): string | undefined {
  if (!text) return undefined;
  return text
    .replace(/\b(\d+)\s*min\s*walk\b/gi, (_, n) => `${n} min a pé`)
    .replace(/\b(\d+)\s*min\s*drive\b/gi, (_, n) => `${n} min de carro`)
    .replace(/\b(\d+)\s*min\s*by\s*car\b/gi, (_, n) => `${n} min de carro`)
    .replace(/\b(\d+)\s*min\s*from\b/gi, (_, n) => `${n} min de`);
}

export function translateHotelscomText(text?: string): string {
  if (!text) return "";

  const exact = translateExact(text);
  if (exact) return exact;

  let out = text.trim();

  out = out
    .replace(/\b(\d+)\s*reviews?\b/gi, (_, n) => `${Number(n).toLocaleString("pt-BR")} avaliações`)
    .replace(/\bfor (\d+) nights?\b/gi, (_, n) => `por ${pluralize(Number(n), "noite", "noites")}`)
    .replace(/\bper night\b/gi, "por noite")
    .replace(/\bnightly\b/gi, "por noite")
    .replace(/\btotal with taxes and fees\b/gi, "Total com impostos e taxas")
    .replace(/\byou will not be charged yet\b/gi, "Você ainda não será cobrado")
    .replace(/\bpay later\b/gi, "Pague depois")
    .replace(/\bpay now\b/gi, "Pagamento imediato")
    .replace(/\breserve now, pay later\b/gi, "Reserve agora e pague depois")
    .replace(/\bno prepayment needed\b/gi, "Sem cobrança antecipada")
    .replace(/\bfree cancellation\b/gi, "Cancelamento grátis")
    .replace(/\bfully refundable\b/gi, "Totalmente reembolsável")
    .replace(/\bnon-refundable\b/gi, "Não reembolsável")
    .replace(/\bnon refundable\b/gi, "Não reembolsável")
    .replace(/\bfree breakfast\b/gi, "Café da manhã grátis")
    .replace(/\bbreakfast included\b/gi, "Café da manhã incluso")
    .replace(/\bfree self parking\b/gi, "Estacionamento grátis")
    .replace(/\bfree parking\b/gi, "Estacionamento grátis")
    .replace(/\bself parking\b/gi, "estacionamento no local")
    .replace(/\bprivate bathroom\b/gi, "Banheiro privativo")
    .replace(/\bfree toiletries\b/gi, "Amenidades de banho grátis")
    .replace(/\btoothbrush and toothpaste not available\b/gi, "Escova e pasta de dente não disponíveis")
    .replace(/\bair conditioning \(climate-controlled\)\b/gi, "Ar-condicionado com controle de temperatura")
    .replace(/\bseparate bedroom\b/gi, "Quarto separado")
    .replace(/\bhousekeeping \(daily\)\b/gi, "Arrumação diária")
    .replace(/\bgrab bar near toilet\b/gi, "Barra de apoio próxima ao vaso sanitário")
    .replace(/\bwheelchair accessibility\b/gi, "Acessibilidade para cadeira de rodas")
    .replace(/\bhair dryer\b/gi, "Secador de cabelo")
    .replace(/\bsmart tv with satellite channels\b/gi, "Smart TV com canais via satélite")
    .replace(/\biron\/ironing board \(on request\)\b/gi, "Ferro e tábua de passar (sob solicitação)")
    .replace(/\bwe have (\d+) left at this price\b/gi, (_, n) => `Restam ${pluralize(Number(n), "1 unidade", `${n} unidades`)} nesse preço`)
    .replace(/\bwe have (\d+) left\b/gi, (_, n) => `Restam ${pluralize(Number(n), "1 unidade", `${n} unidades`)}`)
    .replace(/\bsleeps (\d+)\b/gi, (_, n) => `Acomoda ${n}`)
    .replace(/\b(\d+)\s*bedrooms?\b/gi, (_, n) => pluralize(Number(n), "quarto", "quartos"))
    .replace(/\b(\d+)\s*queen beds?\b/gi, (_, n) => pluralize(Number(n), "cama queen", "camas queen"))
    .replace(/\b(\d+)\s*king beds?\b/gi, (_, n) => pluralize(Number(n), "cama king", "camas king"))
    .replace(/\b(\d+)\s*twin beds?\b/gi, (_, n) => pluralize(Number(n), "cama de solteiro", "camas de solteiro"))
    .replace(/\b(\d+)\s*double beds?\b/gi, (_, n) => pluralize(Number(n), "cama de casal", "camas de casal"))
    .replace(/\b(\d+)\s*single beds?\b/gi, (_, n) => pluralize(Number(n), "cama de solteiro", "camas de solteiro"))
    .replace(/\broom\b/gi, "Quarto")
    .replace(/\bsuite\b/gi, "Suíte")
    .replace(/\bdeluxe\b/gi, "Deluxe")
    .replace(/\bsuperior\b/gi, "Superior")
    .replace(/\bexecutive\b/gi, "Executivo")
    .replace(/\bfamily\b/gi, "Família")
    .replace(/\bstandard\b/gi, "Standard")
    .replace(/\btriple\b/gi, "Triplo")
    .replace(/\bdouble\b/gi, "Duplo")
    .replace(/\btwin\b/gi, "Twin")
    .replace(/\band\b/gi, "e");

  return translateHotelscomDistance(out) ?? out;
}

export function translateHotelscomCaption(text?: string): string | undefined {
  if (!text) return undefined;
  const first = text.split(".")[0]?.trim();
  if (!first) return undefined;
  return translateHotelscomText(first);
}