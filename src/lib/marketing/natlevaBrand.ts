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
    "Image references are attached in this exact order:",
    "  · IMAGE 1 = the destination background photo selected by the user · USE THIS as the actual background. This is mandatory. Preserve the same place, horizon, architecture, beach, pool, vegetation, lighting, color mood and camera angle. Do NOT generate a different destination scene.",
    "  · If this is a refinement, IMAGE 2 may be the previous artwork · use it only to preserve the layout while still keeping IMAGE 1 as the destination source.",
    "  · Final image reference = the OFFICIAL NatLeva logotype (FOR REFERENCE ONLY).",
    "CRITICAL · DO NOT draw, render, paint, type, sketch or recreate the natleva wordmark anywhere on the artwork. ZERO occurrences of the word 'natleva' anywhere as a graphic. The official logo will be STAMPED on top of the image in post-processing at the TOP-LEFT corner. If you draw a wordmark, the post-processing will paint over it AND stamp the real one, creating a visible double-logo bug · this is a hard failure.",
    "MANDATORY · LEAVE THE TOP-LEFT ~30% width × ~18% height of the artwork COMPLETELY EMPTY · no text, no logo, no shape, no person, no decorative element, no color block. Use only the background photo (with subtle dark gradient) in that reserved area so the stamped logo will read clearly.",
    "ORIGEM · sempre que a origem da viagem for fornecida no briefing, é OBRIGATÓRIO renderizar uma badge 'SAINDO DE [CIDADE]' visível e legível na arte (Champagne pill com texto Rolex Green Instrument Sans Bold uppercase, posicionada no topo do card de informações). Esta informação é vital para conversão e NUNCA pode ser omitida.",
    "Do NOT mention or hint at the logo in any visible text.",
    "Maintain a clear-space margin around the reserved logo area.",
    "",
    "================================",
    "VISUAL STRUCTURE (mandatory)",
    "================================",
    "1. Background: the selected destination photo (IMAGE 1) must remain visibly recognizable as the source image, with only premium color grading and a subtle Rolex Green gradient overlay (rgba(20,69,47,0.55) at the bottom · transparent at the top) for legibility.",
    "2. Top-left RESERVED AREA (~22% width × ~14% height): leave EMPTY · only the background photo with subtle dark gradient. The official natleva logo will be stamped here in post-processing. DO NOT draw any wordmark, logo, text or shape in this area.",
    "3. Top-right (only if scarcity provided): small Champagne pill with Rolex Green text.",
    "4. Headline (Sand or Linen color, Playfair Display, weight 700, tight tracking): large editorial title.",
    "5. Subheadline (Sand 80% opacity, Instrument Sans regular): one short line directly below.",
    "6. Information card · Linen rounded card (~75% width, 16-24px radius, soft shadow):",
    "      · Top: Champagne 4px horizontal divider line (signature element).",
    "      · Period (saída · volta), nights, hotel + estrelas.",
    "      · MANDATORY label 'Está incluso:' (Instrument Sans, Hunter color, weight 700, slightly larger than the items below) rendered as a centered title above the list. This label is REQUIRED on every art and must NEVER be omitted.",
    "      · Below the label, render each included item as ITS OWN bullet line (one per row, NEVER concatenated on the same line, NEVER separated by mid-dots). Use a small Champagne mid-dot (·) as the bullet marker, item text in Ink/Hunter, Instrument Sans regular. Vertical spacing between bullets ~6-10px.",
"7. Price block (separate Linen card OR fused with info card):",
      "      · Big Champagne figure with the ENTRY value (Playfair Display, very bold).",
      "      · Smaller Hunter line with the installments label.",
      "      · Tiny Eucalyptus line with the PIX option, when present.",
      "      · MANDATORY tiny caption (Eucalyptus, Instrument Sans, ~10-11px, italic): 'Valor total para 2 pessoas' positioned just above or below the entry value.",
      "      · NEVER show only the total price · always lead with entry + installments.",
    "8. CTA: solid Champagne pill, Rolex Green text, Instrument Sans Bold uppercase tracked.",
    "9. Footer strip on Rolex Green:",
    "      · Center or right: handle and WhatsApp in Sand, separated by a thin Champagne 4px rule. DO NOT draw the natleva wordmark in the footer · the wordmark only appears at the top-left and is stamped in post-processing.",
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
"· CRITICAL: NEVER render style annotations as visible text on the artwork. Words like 'Hunter', 'Champagne', 'Sand', 'Ink', 'Linen', 'Eucalyptus', 'Rolex Green', 'Instrument Sans', 'Playfair Display', 'Regular', 'Bold', or any hex code (e.g. '#1E6B4A') are INTERNAL design directions ONLY. They must NEVER appear printed inside the final image. The only text rendered on the artwork is the actual Brazilian Portuguese content from the briefing (headline, subheadline, period, includes, prices, CTA, handle, WhatsApp).",
"· NEVER print the total package price ANYWHERE on the artwork (no 'Total R$ X', no 'A partir de R$ X' showing the full sum). Show ONLY the entry value and installments. The total scares the customer.",
    "· NEVER add the word 'Viagens' next to the natleva wordmark in the footer · the logotype stands alone.",
    "· The 'Está incluso:' section is MANDATORY and must list at minimum: Aéreo de ida e volta · Hospedagem All Inclusive · Assessoria completa.",
    "· Period of travel: when departure and return are in the SAME month/year, render compactly as 'De DD a DD/MM/AA' (example: 'De 09 a 14/03/27'). NEVER repeat month or year on both sides when they match.",
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
          "   · MANDATORY caption right next to the entry value (Eucalyptus, italic, ~10-11px): \"Valor total para 2 pessoas\". This caption is REQUIRED on every art.",
          "   · DO NOT print the total amount anywhere on the artwork. The 'A partir de' caption is also forbidden if it shows the full sum.",
        ].filter(Boolean).join("\n")
      : "",
    briefing.scarcity ? `· Scarcity badge (small Champagne pill at top-right with Rolex Green text): "${briefing.scarcity}"` : "",
    `· CTA button text: "${briefing.cta}"`,
    `· Visual tone: ${TONE_LABEL[briefing.tone]}`,
    "· DO NOT draw the natleva wordmark anywhere · the official logo will be stamped at the top-left in post-processing. Leave the top-left ~22% × ~14% reserved area completely empty.",
    "",
    "IMAGE 1 (attached, FIRST) = destination background photo selected by the user · USE THIS as the actual background scene. Preserve its composition, lighting, palette, horizon and recognizable landmarks. DO NOT invent a different destination.",
    "FINAL IMAGE REFERENCE = OFFICIAL NatLeva logotype · FOR REFERENCE ONLY · DO NOT draw, redraw, trace or render this logo on the artwork. It will be composited in post-processing.",
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
