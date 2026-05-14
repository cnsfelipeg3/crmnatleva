// Identidade visual NatLeva · usada em todos os prompts de geração de arte
export const NATLEVA_BRAND = {
  name: "NatLeva Viagens",
  handle: "@natlevaviagens",
  whatsapp: "+55 (11) 96639-6692",
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

export interface ArtBriefing {
  headline: string;
  subheadline: string;
  cta: string;
  tone: ArtTone;
  destination?: string;
  priceLabel?: string; // ex: "A partir de R$ 6.890 · 10x sem juros"
}

export function buildBrandSystemPrompt(): string {
  const c = NATLEVA_BRAND.colors;
  return [
    "You are a senior art director generating a finished social media advertisement for the Brazilian travel agency NatLeva Viagens.",
    "The output MUST look like a professional, ready-to-post commercial ad, NOT a photo with random text.",
    "",
    "BRAND IDENTITY (mandatory):",
    `- Brand name: ${NATLEVA_BRAND.name}`,
    `- Instagram handle: ${NATLEVA_BRAND.handle}`,
    `- WhatsApp: ${NATLEVA_BRAND.whatsapp}`,
    `- Primary text color: ${c.text} (deep slate, almost black)`,
    `- Card / panel background: ${c.cardBg} (pure white)`,
    `- Accent color: ${c.gold} (warm muted gold)`,
    `- Use a 4px gold horizontal divider line as a signature element`,
    `- Typography: headline in ${NATLEVA_BRAND.typography.display}, body in ${NATLEVA_BRAND.typography.body}`,
    "",
    "MANDATORY LAYOUT RULES:",
    "- Use the reference photo as the cinematic background of the destination, with a soft dark gradient overlay for text legibility",
    "- Headline: large, tight tracking, white or off-white, top or center",
    "- Subheadline: smaller, lighter weight, directly below the headline",
    "- Price badge: white rounded card with deep slate text and a gold accent line above the price",
    "- CTA button: solid gold pill with deep slate text",
    `- Footer (always present): small white logotype \"${NATLEVA_BRAND.name}\" on the left, \"${NATLEVA_BRAND.handle}\" and \"${NATLEVA_BRAND.whatsapp}\" on the right, separated by a thin gold rule`,
    "",
    "ABSOLUTE PROHIBITIONS:",
    "- NEVER use emojis anywhere on the artwork",
    "- NEVER use hyphens (-) or em-dashes (—) as separators · use mid-dot (·) instead",
    "- NEVER invent prices, dates or destinations not present in the briefing",
    "- NEVER add fake hotel logos, airline logos or third-party brands",
    "- NEVER add stock-photo watermarks",
    "- All text MUST be perfectly legible, correctly spelled in Brazilian Portuguese, and aligned to a clean grid",
    "",
    "OUTPUT: a single finished social ad image, polished, premium, ready to publish.",
  ].join("\n");
}

export function buildArtUserPrompt(briefing: ArtBriefing, formatLabel: string, aspect: string): string {
  return [
    `Generate a finished social media ad in ${formatLabel} format (aspect ratio ${aspect}).`,
    "",
    "BRIEFING (use EXACTLY this content, in Brazilian Portuguese, no translation, no paraphrasing of numbers/dates):",
    `- Headline: "${briefing.headline}"`,
    `- Subheadline: "${briefing.subheadline}"`,
    briefing.priceLabel ? `- Price block: "${briefing.priceLabel}"` : "",
    `- CTA button text: "${briefing.cta}"`,
    briefing.destination ? `- Destination shown in background: ${briefing.destination}` : "",
    `- Visual tone: ${TONE_LABEL[briefing.tone]}`,
    "",
    "Use the attached reference image as the destination background. Apply the NatLeva brand identity defined in the system instructions. Render every text element pixel-perfect and correctly spelled.",
  ].filter(Boolean).join("\n");
}
