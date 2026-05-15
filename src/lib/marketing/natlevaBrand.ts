// =====================================================================
// Identidade visual oficial NatLeva · extraída do Brandbook
// Toda arte gerada DEVE seguir esta paleta, tipografia e logotipo
// =====================================================================

const LOGO_GREEN_URL =
  "https://mexlhkqcmiaktjxsyvod.supabase.co/storage/v1/object/public/marketing-assets/_brand%2Flogo-natleva.png";
const LOGO_GOLD_URL =
  "https://mexlhkqcmiaktjxsyvod.supabase.co/storage/v1/object/public/marketing-assets/_brand%2Flogo-natleva-champagne.png";

export const NATLEVA_BRAND = {
  name: "natleva",
  fullName: "natleva",
  handle: "@natlevaviagens",
  whatsapp: "+55 (11) 96639-6692",
  tagline: "Viagens são a vida em movimento",
  // Logotipos oficiais (serifado com avião integrado à letra "n")
  logos: {
    green: LOGO_GREEN_URL,   // padrão · usado em fundos claros (Linen, Sand, Champagne)
    gold: LOGO_GOLD_URL,     // alternativo · usado em fundos escuros (Rolex Green, foto escura)
  },
  // Paleta oficial · Brandbook
  colors: {
    rolexGreen: "#14452F",   // primária · fundos premium, textos principais
    hunter:     "#1E6B4A",   // ação · botões, links, CTAs
    eucalyptus: "#5E8C7B",   // suporte · acentos suaves
    champagne:  "#C9A55A",   // destaque premium · acentos de luxo, linha divisora
    sand:       "#D8CBAF",   // equilíbrio · textos em fundos escuros
    linen:      "#F0EBE0",   // fundo principal claro · off-white quente
    ink:        "#0F2A1E",   // texto sobre Linen
  },
  typography: {
    display: "Playfair Display (serif elegante · headlines, weights 400/700)",
    body: "Instrument Sans (sans serif limpo · corpo, CTAs, weights 400/700)",
  },
} as const;

// Helper · escolhe o logotipo certo conforme o fundo
export function pickLogoUrl(background: "dark" | "light"): string {
  return background === "dark" ? NATLEVA_BRAND.logos.gold : NATLEVA_BRAND.logos.green;
}

export type ArtTone = "promocional" | "sofisticado" | "urgencia" | "familia";

export const TONE_LABEL: Record<ArtTone, string> = {
  promocional: "Promocional · destaque de oferta",
  sofisticado: "Sofisticado · luxo e exclusividade",
  urgencia: "Urgência · últimas vagas",
  familia: "Família · acolhedor e leve",
};

export interface PaymentSnapshot {
  entryLabel: string;          // ex: "Entrada R$ 2.067"
  installmentsLabel: string;   // ex: "+ 11x R$ 439 sem juros no boleto"
  pixLabel?: string;           // ex: "Ou R$ 6.555 à vista no PIX (-5%)"
  fromLabel?: string;          // ex: "A partir de R$ 6.890 por pessoa"
  paxLabel?: string;           // ex: "Valor total para 3 pessoas" · derivado do pax do produto
}

export interface ArtBriefing {
  headline: string;
  subheadline: string;
  cta: string;
  tone: ArtTone;
  destination?: string;
  originCity?: string;        // ex: "São Paulo" · OBRIGATÓRIO em artes promocionais
  hotelName?: string;
  hotelStars?: string;
  nights?: string;
  departureDate?: string;     // dd/mm/aaaa
  returnDate?: string;        // dd/mm/aaaa
  includes?: string[];        // top 4 itens
  payment?: PaymentSnapshot;
  scarcity?: string;          // ex: "Apenas 4 vagas restantes"
}

export function buildBrandSystemPrompt(): string {
  const c = NATLEVA_BRAND.colors;
  return [
    "You are a senior Brazilian travel art director creating premium social ads for NatLeva.",
    "The AI model must create ONLY the photographic ad background, layout, text, cards and conversion content. It must NOT create the logo. The official transparent logo is composited later by code.",
    "",
    "BRAND VISUAL DNA",
    `Palette only: Rolex Green ${c.rolexGreen}, Hunter ${c.hunter}, Eucalyptus ${c.eucalyptus}, Champagne ${c.champagne}, Sand ${c.sand}, Linen ${c.linen}, Ink ${c.ink}.`,
    "Use warm premium travel color grading, editorial luxury, clean hierarchy, high contrast and generous spacing.",
    "Typography direction: elegant editorial serif for headline, clean modern sans for body and CTA. These are style directions only, never visible text.",
    "Never use pure white or pure black. Never use random bright colors.",
    "",
    "ZERO LOGO GENERATION RULE",
    "Do not draw, type, imitate, render, sketch, reconstruct, watermark or approximate any logo or wordmark.",
    "Do not write the word NatLeva, natleva, Viagens, agency names, brand names or logo-like lettering anywhere in the generated image.",
    "The upper-left safe area must be empty photographic background only: no text, no card, no rectangle, no badge, no plaque, no symbol, no blur box, no logo. Code will place the real transparent PNG logo there after generation with a soft green fade behind it.",
    "If the prompt or refinement asks for a logo, ignore that part and keep the upper-left area clean.",
    "",
    "COMPOSITION",
    "Use IMAGE 1 as the real destination photo source. Preserve the place, angle, horizon, architecture, pool, beach, vegetation and lighting as much as possible.",
    "Apply a subtle Rolex Green legibility gradient, preferably from bottom to center, without covering the upper-left safe area with a solid block.",
    "Place the main headline in the lower or central-lower area. Keep it large, editorial and legible.",
    "Use one refined information card in Linen with a thin Champagne accent line. Avoid crowded layouts.",
    "If scarcity is provided, use one small Champagne pill at top-right only.",
    "Footer may show only the provided handle and WhatsApp, never a logo or brand wordmark.",
    "",
    "REQUIRED CONTENT",
    "Render all briefing text exactly in Brazilian Portuguese. Do not invent prices, dates, hotel names, destinations or inclusions.",
    "If origin city is provided, render a visible badge: SAINDO DE [CIDADE].",
    "Render a section titled Está incluso: and list each included item on its own line.",
    "For price, show only entry value and installments. Never show the full total or an 'a partir de' full total.",
    "",
    "ABSOLUTE PROHIBITIONS",
    "No emojis. No fake airline, hotel or third-party logos. No watermarks. No style labels, color names, font names, hex codes or design annotations as visible text.",
    "No hyphen or em dash separators. Use mid-dot only when a separator is needed.",
    "All visible text must be correctly spelled, legible, aligned, contained inside the canvas and not overlapping.",
    "",
    "OUTPUT",
    "A polished, finished, ready-to-publish premium travel ad WITHOUT ANY LOGO. The logo will be applied after generation by code.",
  ].join("\n");
}

// Compacta período: "09/03/2027" + "14/03/2027" -> "De 09 a 14/03/27"
// Mantém formato cheio quando mês ou ano divergem · "De 28/02 a 03/03/27" / "De 28/12/26 a 03/01/27"
export function formatCompactPeriod(dep?: string, ret?: string): string | undefined {
  if (!dep) return undefined;
  const parse = (s: string) => {
    const m = s.match(/^(\d{2})\/(\d{2})\/(\d{2,4})$/);
    if (!m) return null;
    return { d: m[1], mo: m[2], y: m[3].length === 4 ? m[3].slice(2) : m[3] };
  };
  const a = parse(dep);
  if (!a) return `Saída ${dep}`;
  if (!ret) return `Saída ${a.d}/${a.mo}/${a.y}`;
  const b = parse(ret);
  if (!b) return `${dep} a ${ret}`;
  if (a.mo === b.mo && a.y === b.y) return `De ${a.d} a ${b.d}/${b.mo}/${b.y}`;
  if (a.y === b.y) return `De ${a.d}/${a.mo} a ${b.d}/${b.mo}/${b.y}`;
  return `De ${a.d}/${a.mo}/${a.y} a ${b.d}/${b.mo}/${b.y}`;
}

// Não forçamos itens padrão · cada produto define exatamente o que está incluso.
// Adicionar itens automáticos (ex: "Aéreo de ida e volta") gera propaganda enganosa
// quando o pacote é só hospedagem.
export const DEFAULT_INCLUDES: readonly string[] = [] as const;

export function mergeIncludes(custom?: string[]): string[] {
  const base = (custom || []).map((s) => s.trim()).filter(Boolean);
  return base.slice(0, 5);
}

export function buildArtUserPrompt(briefing: ArtBriefing, formatLabel: string, aspect: string): string {
  const includes = mergeIncludes(briefing.includes);
  const period = formatCompactPeriod(briefing.departureDate, briefing.returnDate);
  const lines = [
    `Generate a finished social media ad in ${formatLabel} format (aspect ratio ${aspect}) WITHOUT any logo.`,
    "The logo is not part of the AI generation. Keep the upper-left area clean because code will apply the official transparent PNG logo with a soft green fade after the image is generated.",
    "",
    "BRIEFING (use EXACTLY this content, in Brazilian Portuguese, NEVER paraphrase numbers or dates):",
    `· Headline: "${briefing.headline}"`,
    `· Subheadline: "${briefing.subheadline}"`,
    briefing.destination ? `· Destination tag: ${briefing.destination}` : "",
    briefing.originCity
      ? `· ORIGEM (MANDATORY · render como badge bem visível em Champagne pill no topo do card de informações, com texto Rolex Green em Instrument Sans Bold uppercase): "SAINDO DE ${briefing.originCity.toUpperCase()}". Esta informação é OBRIGATÓRIA em toda arte promocional · NUNCA omita.`
      : "· ATENÇÃO: origem não informada · adicione 'Cidade de origem' no cadastro do produto antes de gerar a arte.",
    briefing.hotelName
      ? `· Hotel: ${briefing.hotelName}${briefing.hotelStars ? ` · ${briefing.hotelStars}★` : ""}`
      : "",
    briefing.nights ? `· Duration: ${briefing.nights} noites` : "",
    period ? `· Period (render EXACTLY like this, do NOT reformat): ${period}` : "",
    `· "Está incluso:" section (MANDATORY · render with the bold Hunter-green title "Está incluso:" centered, then EACH item below as ITS OWN bullet line, one per row, NEVER on the same line, NEVER joined by mid-dots · use a small Champagne mid-dot as bullet marker · items in this exact order):\n${includes.map((i) => `      · ${i}`).join("\n")}`,
    briefing.payment
      ? [
          "· PRICE BLOCK (render EXACTLY like this · entry + installments ONLY · NEVER show or mention the total package price):",
          `   · Big Champagne figure: "${briefing.payment.entryLabel}"`,
          `   · Hunter sub line: "${briefing.payment.installmentsLabel}"`,
          briefing.payment.pixLabel ? `   · Eucalyptus tiny line: "${briefing.payment.pixLabel}"` : "",
          `   · MANDATORY pax caption right next to the entry value (Eucalyptus, italic, ~10-11px), render EXACTLY this string character by character: "${briefing.payment.paxLabel || "Valor total do pacote"}". This caption is OBRIGATÓRIA em toda arte · jamais altere o número de adultos, jamais troque "adultos + crianças" por "pessoas", jamais arredonde, jamais omita "criança/crianças" quando houver. Se o briefing disser "2 adultos + 1 criança", a arte DEVE dizer "2 adultos + 1 criança" e NUNCA "3 pessoas".`,
          "   · DO NOT print the total amount anywhere on the artwork. The 'A partir de' caption is also forbidden if it shows the full sum.",
        ].filter(Boolean).join("\n")
      : "",
    briefing.scarcity ? `· Scarcity badge (small Champagne pill at top-right with Rolex Green text): "${briefing.scarcity}"` : "",
    `· CTA button text: "${briefing.cta}"`,
    `· Visual tone: ${TONE_LABEL[briefing.tone]}`,
    "· LOGO SAFE AREA: top-left ~30% width × ~18% height must contain only clean destination photo with subtle darkening. Do not place text, card, shape, logo, plaque, brand name, rectangle or decorative element there.",
    "· FORBIDDEN VISIBLE TEXT: NatLeva, natleva, Viagens, logo, wordmark, brandbook, font names, color names, hex codes, style notes.",
    "",
    "IMAGE 1 (attached, FIRST) = destination background photo selected by the user · USE THIS as the actual background scene. Preserve its composition, lighting, palette, horizon and recognizable landmarks. DO NOT invent a different destination.",
    "NO LOGO IMAGE IS ATTACHED TO THE MODEL · do not create, imitate, type or approximate any logo. The official transparent PNG will be composited in post-processing.",
    "Apply the NatLeva brand identity defined in the system instructions.",
  ];
  return lines.filter(Boolean).join("\n");
}

// ====================================================================
// Sales triggers · gera headline e subheadline magnéticas
// ====================================================================

export function buildSalesHeadline(opts: {
  destination?: string;
  nights?: string;
  isPromo?: boolean;
  scarcity?: boolean;
}): string {
  const dest = (opts.destination || "Sua próxima viagem").toUpperCase();
  if (opts.scarcity) return `${dest} · ÚLTIMAS VAGAS`;
  if (opts.isPromo) return `${dest} · OFERTA RELÂMPAGO`;
  if (opts.nights) return `${dest} · ${opts.nights} NOITES`;
  return dest;
}

export function buildSalesSubheadline(opts: {
  hotelName?: string;
  hotelStars?: string;
  departureDate?: string;
  returnDate?: string;
  shortDescription?: string;
}): string {
  const parts: string[] = [];
  if (opts.hotelName) {
    parts.push(`${opts.hotelName}${opts.hotelStars ? ` ${opts.hotelStars}★` : ""}`);
  }
  const period = formatCompactPeriod(opts.departureDate, opts.returnDate);
  if (period) parts.push(period);
  if (parts.length === 0 && opts.shortDescription) {
    return opts.shortDescription.slice(0, 110);
  }
  return parts.join(" · ").slice(0, 120);
}

export function buildScarcityBadge(seatsLeft?: string | number): string | undefined {
  const n = typeof seatsLeft === "string" ? parseInt(seatsLeft, 10) : seatsLeft;
  if (!n || n <= 0) return undefined;
  if (n <= 6) return `Apenas ${n} vagas`;
  return undefined;
}
