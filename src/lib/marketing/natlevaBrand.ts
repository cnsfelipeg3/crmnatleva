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
    "      · Left: small wordmark or 'NatLeva Viagens' in Sand.",
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

export function buildArtUserPrompt(briefing: ArtBriefing, formatLabel: string, aspect: string): string {
  const includes = (briefing.includes || []).slice(0, 4);
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
    briefing.departureDate && briefing.returnDate
      ? `· Period: ${briefing.departureDate} a ${briefing.returnDate}`
      : briefing.departureDate ? `· Saída: ${briefing.departureDate}` : "",
    includes.length
      ? `· What is included (render as a small bullet list with mid-dot bullets in Hunter green): ${includes.join(" · ")}`
      : "",
    briefing.payment
      ? [
          "· PRICE BLOCK (render exactly like this · entry + installments lead, NEVER total alone):",
          `   · Big Champagne figure: "${briefing.payment.entryLabel}"`,
          `   · Hunter sub line: "${briefing.payment.installmentsLabel}"`,
          briefing.payment.pixLabel ? `   · Eucalyptus tiny line: "${briefing.payment.pixLabel}"` : "",
          briefing.payment.fromLabel ? `   · Caption above the card in Sand: "${briefing.payment.fromLabel}"` : "",
        ].filter(Boolean).join("\n")
      : "",
    briefing.scarcity ? `· Scarcity badge (small Champagne pill at top-right with Rolex Green text): "${briefing.scarcity}"` : "",
    `· CTA button text: "${briefing.cta}"`,
    `· Visual tone: ${TONE_LABEL[briefing.tone]}`,
    "",
    "IMAGE 1 (attached) = destination background.",
    "IMAGE 2 (attached) = OFFICIAL NatLeva logotype · render it pixel-perfect, do NOT recreate it.",
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
  if (opts.departureDate && opts.returnDate) {
    parts.push(`${opts.departureDate} a ${opts.returnDate}`);
  } else if (opts.departureDate) {
    parts.push(`Saída ${opts.departureDate}`);
  }
  if (parts.length === 0 && opts.shortDescription) {
    return opts.shortDescription.slice(0, 110);
  }
  return parts.join(" · ").slice(0, 110);
}

export function buildScarcityBadge(seatsLeft?: string | number): string | undefined {
  const n = typeof seatsLeft === "string" ? parseInt(seatsLeft, 10) : seatsLeft;
  if (!n || n <= 0) return undefined;
  if (n <= 6) return `Apenas ${n} vagas`;
  return undefined;
}
