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
}

export interface ArtBriefing {
  headline: string;
  subheadline: string;
  cta: string;
  tone: ArtTone;
  destination?: string;
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
    "You are the senior art director of NatLeva Viagens, a premium Brazilian travel agency.",
    "Generate a finished, ready-to-publish social media advertisement that is INDISTINGUISHABLE from a professional brand piece designed in the official NatLeva brandbook.",
    "",
    "================================",
    "OFFICIAL BRAND IDENTITY (MANDATORY · extracted from the brandbook · DO NOT improvise)",
    "================================",
    `Brand wordmark: lowercase "${NATLEVA_BRAND.name}" in elegant serif with a small airplane integrated into the letter "n" · NEVER recreate the wordmark from scratch · ALWAYS render the official attached logotype.`,
    `Tagline (optional, small caps in body font): "${NATLEVA_BRAND.tagline}"`,
    `Instagram handle (footer): ${NATLEVA_BRAND.handle}`,
    `WhatsApp (footer): ${NATLEVA_BRAND.whatsapp}`,
    "",
    "OFFICIAL COLOR PALETTE (use ONLY these hex values · no random colors):",
    `  · Rolex Green ${c.rolexGreen} · primary background, primary text on light backgrounds`,
    `  · Hunter ${c.hunter} · CTAs, action buttons, secondary green`,
    `  · Eucalyptus ${c.eucalyptus} · soft tertiary accents`,
    `  · Champagne ${c.champagne} · premium gold for thin divider lines, price highlights, badges, decorative accents`,
    `  · Sand ${c.sand} · text on dark green backgrounds, secondary elements`,
    `  · Linen ${c.linen} · warm off-white background that REPLACES pure white`,
    `  · Ink ${c.ink} · dark text on Linen`,
    "  NEVER use pure white (#FFFFFF) · always use Linen.",
    "  NEVER use pure black (#000000) · always use Rolex Green or Ink.",
    "",
    "OFFICIAL TYPOGRAPHY:",
    `  · Headlines & display: ${NATLEVA_BRAND.typography.display}`,
    `  · Body, captions, CTAs: ${NATLEVA_BRAND.typography.body}`,
    "  Headlines feel editorial, sophisticated, slightly italic when small. CTAs are uppercase, tracked.",
    "",
    "================================",
    "LOGO RULES (NON-NEGOTIABLE)",
    "================================",
    "Two image references are attached:",
    "  · IMAGE 1 = the destination background photo",
    "  · IMAGE 2 = the OFFICIAL NatLeva logotype",
    "Render IMAGE 2 EXACTLY as provided (same shape, same airplane, same serif, same proportions). NEVER trace it, restyle it, recolor it, italicize it, distort it, or recreate it from memory.",
    "Logo placement: top-left at ~7% of artwork height OR centered above the wordmark in the footer card.",
    "If the logo sits over a dark area: the gold/cream variant has been provided · keep its color.",
    "If the logo sits over a Linen/light card: use the Rolex Green variant · keep its color.",
    "Maintain a clear-space margin around the logo of at least the height of the airplane icon.",
    "",
    "================================",
    "VISUAL STRUCTURE (mandatory)",
    "================================",
    "1. Background: cinematic destination photo (IMAGE 1) with a subtle Rolex Green gradient overlay (rgba(20,69,47,0.55) at the bottom · transparent at the top) for legibility.",
    "2. Top-left: NatLeva logotype (IMAGE 2) in its original color.",
    "3. Top-right (only if scarcity provided): small Champagne pill with Rolex Green text.",
    "4. Headline (Sand or Linen color, Playfair Display, weight 700, tight tracking): large editorial title.",
    "5. Subheadline (Sand 80% opacity, Instrument Sans regular): one short line directly below.",
    "6. Information card · Linen rounded card (~75% width, 16-24px radius, soft shadow):",
    "      · Top: Champagne 4px horizontal divider line (signature element).",
    "      · Period (saída · volta), nights, hotel + estrelas.",
    "      · Bullet list of 'Inclusos' with mid-dot bullets in Hunter color.",
    "7. Price block (separate Linen card OR fused with info card):",
    "      · Big Champagne figure with the ENTRY value (Playfair Display, very bold).",
    "      · Smaller Hunter line with the installments label.",
    "      · Tiny Eucalyptus line with the PIX option, when present.",
    "      · NEVER show only the total price · always lead with entry + installments.",
    "8. CTA: solid Champagne pill, Rolex Green text, Instrument Sans Bold uppercase tracked.",
    "9. Footer strip on Rolex Green:",
    "      · Center or left: ONLY the official 'natleva' wordmark (the lowercase serif logotype with the airplane in the 'n'). DO NOT add the word 'Viagens'. DO NOT write 'NatLeva Viagens'. The wordmark stands alone.",
    "      · Right: handle and WhatsApp in Sand, separated by a thin Champagne 4px rule.",
    "",
    "================================",
    "ABSOLUTE PROHIBITIONS",
    "================================",
    "· NEVER use emojis anywhere on the artwork.",
    "· NEVER use hyphens (-) or em-dashes (—) as separators · use mid-dot (·) instead.",
    "· NEVER invent prices, dates, hotel names, destinations or values not present in the briefing.",
    "· NEVER add fake third-party logos, airline logos, hotel logos or stock-photo watermarks.",
    "· NEVER recreate the NatLeva wordmark · always render the attached logotype pixel-perfect.",
    "· NEVER use colors outside the official palette above.",
    "· NEVER use Comic Sans, Arial, Times New Roman or any generic font that breaks the editorial feel.",
    "· NEVER show the total package price as a single big number · always lead with entry + installments.",
    "· All text MUST be perfectly legible, correctly spelled in Brazilian Portuguese, aligned to a clean baseline grid.",
    "",
    "OUTPUT: a single finished, polished, premium social ad that looks like it came straight out of the NatLeva brandbook · ready to publish today.",
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

// Itens padrão obrigatórios em todas as artes
export const DEFAULT_INCLUDES = [
  "Aéreo de ida e volta",
  "Hospedagem All Inclusive",
  "Assessoria completa",
] as const;

export function mergeIncludes(custom?: string[]): string[] {
  const base = (custom || []).map((s) => s.trim()).filter(Boolean);
  // Garante os 3 itens essenciais sempre presentes (sem duplicar)
  const merged = [...base];
  for (const item of DEFAULT_INCLUDES) {
    if (!merged.some((m) => m.toLowerCase().includes(item.toLowerCase().split(" ")[0]))) {
      merged.push(item);
    }
  }
  return merged.slice(0, 4);
}

export function buildArtUserPrompt(briefing: ArtBriefing, formatLabel: string, aspect: string): string {
  const includes = mergeIncludes(briefing.includes);
  const period = formatCompactPeriod(briefing.departureDate, briefing.returnDate);
  const lines = [
    `Generate a finished social media ad in ${formatLabel} format (aspect ratio ${aspect}).`,
    "",
    "BRIEFING (use EXACTLY this content, in Brazilian Portuguese, NEVER paraphrase numbers or dates):",
    `· Headline: "${briefing.headline}"`,
    `· Subheadline: "${briefing.subheadline}"`,
    briefing.destination ? `· Destination tag: ${briefing.destination}` : "",
    briefing.hotelName
      ? `· Hotel: ${briefing.hotelName}${briefing.hotelStars ? ` · ${briefing.hotelStars}★` : ""}`
      : "",
    briefing.nights ? `· Duration: ${briefing.nights} noites` : "",
    period ? `· Period (render EXACTLY like this, do NOT reformat): ${period}` : "",
    `· "Está incluso:" section (render as a small bullet list with mid-dot bullets in Hunter green, EXACTLY these items in this order): ${includes.join(" · ")}`,
    briefing.payment
      ? [
          "· PRICE BLOCK (render EXACTLY like this · entry + installments ONLY · NEVER show or mention the total package price):",
          `   · Big Champagne figure: "${briefing.payment.entryLabel}"`,
          `   · Hunter sub line: "${briefing.payment.installmentsLabel}"`,
          briefing.payment.pixLabel ? `   · Eucalyptus tiny line: "${briefing.payment.pixLabel}"` : "",
          "   · DO NOT print the total amount anywhere on the artwork. The 'A partir de' caption is also forbidden if it shows the full sum.",
        ].filter(Boolean).join("\n")
      : "",
    briefing.scarcity ? `· Scarcity badge (small Champagne pill at top-right with Rolex Green text): "${briefing.scarcity}"` : "",
    `· CTA button text: "${briefing.cta}"`,
    `· Visual tone: ${TONE_LABEL[briefing.tone]}`,
    "· Footer wordmark: render ONLY the official 'natleva' logotype (no extra word 'Viagens', no tagline next to it).",
    "",
    "IMAGE 1 (attached) = destination background.",
    "IMAGE 2 (attached) = OFFICIAL NatLeva logotype · render it pixel-perfect, do NOT recreate it, do NOT add any extra text beside it.",
    "Apply the NatLeva brand identity defined in the system instructions (Rolex Green, Hunter, Champagne, Sand, Linen palette · Playfair Display + Instrument Sans typography).",
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
