// Identidade visual NatLeva · usada em todos os prompts de geração de arte
export const NATLEVA_BRAND = {
  name: "NatLeva Viagens",
  handle: "@natlevaviagens",
  whatsapp: "+55 (11) 96639-6692",
  logoUrl:
    "https://mexlhkqcmiaktjxsyvod.supabase.co/storage/v1/object/public/marketing-assets/_brand%2Flogo-natleva.png",
  colors: {
    cardBg: "#FFFFFF",
    text: "#111827",
    gold: "#C9A84C",
    goldSoft: "#E6CE85",
    overlay: "rgba(17, 24, 39, 0.55)",
  },
  typography: {
    display: "Modern editorial sans serif (similar to Sora, Manrope or Inter Display)",
    body: "Clean geometric sans serif (similar to Inter or Manrope)",
  },
} as const;

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
    "You are a senior art director generating a finished, ready-to-publish social media advertisement for the Brazilian travel agency NatLeva Viagens.",
    "The output MUST look like a polished commercial creative made by a top-tier agency · NOT a photo with random text on top.",
    "",
    "BRAND IDENTITY (mandatory · non-negotiable):",
    `- Brand name: ${NATLEVA_BRAND.name}`,
    `- Instagram handle: ${NATLEVA_BRAND.handle}`,
    `- WhatsApp: ${NATLEVA_BRAND.whatsapp}`,
    `- Primary text on white: ${c.text} (deep slate, almost black)`,
    `- Card / panel background: ${c.cardBg} (pure white, soft shadow)`,
    `- Accent color: ${c.gold} (warm muted gold) · use for thin 4px horizontal divider lines, price underline, CTA button fill`,
    `- Headline typography: ${NATLEVA_BRAND.typography.display}, tight tracking, weight 700-800`,
    `- Body typography: ${NATLEVA_BRAND.typography.body}, weight 400-500`,
    "",
    "LOGO INTEGRATION (mandatory):",
    "- The SECOND image attached is the official NatLeva logotype · place it visibly in the top-left corner OR as part of the footer card",
    "- Render the logo crisp and recognizable · do NOT distort, recolor, blur, or invent a new logo",
    "- Logo height ~6% to 8% of the artwork height",
    "",
    "VISUAL STRUCTURE (mandatory):",
    "- Background: cinematic destination photo (the FIRST attached image), with a soft dark gradient overlay for legibility",
    "- Top zone: NatLeva logo + small destination tag",
    "- Center zone: large bold headline (white) + subheadline (white 80% opacity)",
    "- Information card (white rounded card, ~75% width, slight shadow): contains dates, nights, hotel and includes",
    "- Price card (separate or fused): shows ENTRY value in big gold figures + installments line below in slate · DO NOT show only the total value, show entry + installments to feel attractive",
    "- CTA: solid gold pill with deep slate text",
    "- Footer strip: white logotype text on the left, handle and WhatsApp on the right, separated by a thin gold 4px rule",
    "",
    "ABSOLUTE PROHIBITIONS:",
    "- NEVER use emojis anywhere on the artwork",
    "- NEVER use hyphens (-) or em-dashes (—) as separators · use mid-dot (·) instead",
    "- NEVER invent prices, dates, hotel names or destinations not present in the briefing",
    "- NEVER add fake hotel logos, airline logos, third-party brands, watermarks or stock-photo signatures",
    "- NEVER write the total package price as a single big number · always lead with entry + installments",
    "- All text MUST be perfectly legible, correctly spelled in Brazilian Portuguese, aligned to a clean grid",
    "",
    "OUTPUT: a single finished, polished, premium social ad image · ready to publish today.",
  ].join("\n");
}

export function buildArtUserPrompt(briefing: ArtBriefing, formatLabel: string, aspect: string): string {
  const includes = (briefing.includes || []).slice(0, 4);
  const lines = [
    `Generate a finished social media ad in ${formatLabel} format (aspect ratio ${aspect}).`,
    "",
    "BRIEFING (use EXACTLY this content, in Brazilian Portuguese, NEVER paraphrase numbers or dates):",
    `- Headline: "${briefing.headline}"`,
    `- Subheadline: "${briefing.subheadline}"`,
    briefing.destination ? `- Destination tag: ${briefing.destination}` : "",
    briefing.hotelName
      ? `- Hotel: ${briefing.hotelName}${briefing.hotelStars ? ` · ${briefing.hotelStars}★` : ""}`
      : "",
    briefing.nights ? `- Duration: ${briefing.nights} noites` : "",
    briefing.departureDate && briefing.returnDate
      ? `- Period: ${briefing.departureDate} a ${briefing.returnDate}`
      : briefing.departureDate ? `- Saída: ${briefing.departureDate}` : "",
    includes.length ? `- What's included (render as a small bullet list with mid-dot bullets): ${includes.join(" · ")}` : "",
    briefing.payment
      ? [
          "- PRICE BLOCK (render exactly like this, prioritizing entry + installments over total):",
          `   · Big gold line: "${briefing.payment.entryLabel}"`,
          `   · Slate sub line: "${briefing.payment.installmentsLabel}"`,
          briefing.payment.pixLabel ? `   · Tiny line: "${briefing.payment.pixLabel}"` : "",
          briefing.payment.fromLabel ? `   · Caption above the card: "${briefing.payment.fromLabel}"` : "",
        ].filter(Boolean).join("\n")
      : "",
    briefing.scarcity ? `- Scarcity badge (small gold pill at top-right): "${briefing.scarcity}"` : "",
    `- CTA button text: "${briefing.cta}"`,
    `- Visual tone: ${TONE_LABEL[briefing.tone]}`,
    "",
    "Use the FIRST attached image as the destination background.",
    "Use the SECOND attached image as the official NatLeva logotype · render it crisp at the top-left or footer.",
    "Apply the NatLeva brand identity defined in the system instructions. Render every text element pixel-perfect and correctly spelled.",
  ];
  return lines.filter(Boolean).join("\n");
}

// ====================================================================
// Sales triggers · gera headline e subheadline magnéticas
// ====================================================================

const POWER_VERBS = ["Embarque", "Realize", "Viva", "Conquiste", "Garanta"];

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
