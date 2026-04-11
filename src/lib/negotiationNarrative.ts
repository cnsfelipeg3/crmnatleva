import { formatDistanceToNow, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";

function safeDistanceToNow(dateStr: string): string {
  const d = new Date(dateStr);
  if (!isValid(d)) return "data desconhecida";
  return formatDistanceToNow(d, { locale: ptBR, addSuffix: true });
}

export interface BriefingData {
  briefingId?: string;
  conversationSummary?: string | null;
  aiRecommendation?: string | null;
  nextSteps?: string | null;
  budgetBehavioralReading?: string | null;
  tripMotivation?: string | null;
  leadScore?: number | null;
  leadSentiment?: string | null;
  leadType?: string | null;
  leadUrgency?: string | null;
  priceSensitivity?: string | null;
  behavioralNotes?: string | null;
  travelExperience?: string | null;
  travelPace?: string | null;
  flexibleDates?: boolean | null;
  durationDays?: number | null;
  adults?: number | null;
  children?: number | null;
  childrenAges?: string[] | null;
  groupDetails?: string | null;
  hotelPreference?: string | null;
  hotelStars?: string | null;
  hotelLocation?: string | null;
  hotelNeeds?: string[] | null;
  hotelNotes?: string | null;
  departureAirport?: string | null;
  preferredAirline?: string | null;
  flightPreference?: string | null;
  mustHaveExperiences?: string[] | null;
  desiredExperiences?: string[] | null;
  experienceNotes?: string | null;
  transferNeeded?: boolean | null;
  rentalCar?: boolean | null;
  transportNotes?: string | null;
}

export interface NegotiationItem {
  id: string;
  stage: string;
  origin: string;
  destination: string;
  clientName: string;
  pax: number;
  departureDate: string | null;
  returnDate: string | null;
  createdAt: string;
  source: "quote" | "proposal" | "briefing";
  quoteId?: string;
  proposalId?: string;
  proposalSlug?: string;
  proposalStatus?: string;
  rawQuote?: any;
  cabinClass?: string;
  budgetRange?: string;
  viewCount?: number;
  lastViewedAt?: string | null;
  sentAt?: string | null;
  // Briefing-enriched fields
  briefing?: BriefingData;
  rawBriefing?: any;
}

export type Temperature = "hot" | "warm" | "cold" | "won" | "lost";

const CABIN_LABELS: Record<string, string> = {
  economy: "econômica",
  premium_economy: "premium",
  business: "executiva",
  first: "primeira classe",
};

export function generateNarrative(item: NegotiationItem): string {
  const dest = item.destination || "destino não informado";
  const timeAgo = safeDistanceToNow(item.createdAt);
  const paxLabel = item.pax > 1 ? `${item.pax} pessoas` : "1 pessoa";
  const cabin = item.cabinClass ? `, ${CABIN_LABELS[item.cabinClass] || item.cabinClass}` : "";
  const b = item.briefing;

  // Build enriched motivation/context string
  const motivation = b?.tripMotivation ? ` para ${b.tripMotivation.toLowerCase()}` : "";
  const hotel = b?.hotelStars ? `, hotel ${b.hotelStars}★` : (b?.hotelPreference ? `, ${b.hotelPreference}` : "");
  const scoreTag = b?.leadScore && b.leadScore >= 70 ? ` Lead score ${b.leadScore} — urgência ${b.leadUrgency || "média"}.` : "";

  if (item.stage === "aceita") {
    return `Negociação fechada! ${dest}${motivation} para ${paxLabel}.${scoreTag}`;
  }
  if (item.stage === "perdida") {
    return `Proposta perdida para ${dest}. Solicitação recebida ${timeAgo}.`;
  }

  // Sent but not viewed
  if (item.stage === "enviada" && !item.viewCount) {
    const sentAgo = item.sentAt ? safeDistanceToNow(item.sentAt) : timeAgo;
    return `Proposta enviada ${sentAgo}, ainda sem visualização. ${dest}${motivation} para ${paxLabel}${cabin}${hotel}.${scoreTag}`;
  }

  // Sent and viewed
  if (item.stage === "enviada" && (item.viewCount || 0) > 0) {
    const views = item.viewCount || 0;
    const lastView = item.lastViewedAt ? safeDistanceToNow(item.lastViewedAt) : "";
    return `Proposta visualizada ${views}x${lastView ? ` (último acesso ${lastView})` : ""}. ${dest}${motivation} para ${paxLabel}${cabin}.${scoreTag}`;
  }

  // Proposal created, not sent
  if (item.stage === "proposta_criada") {
    return `Proposta criada para ${dest}${motivation}${cabin}${hotel}. Aguardando revisão e envio.${scoreTag}`;
  }

  // In analysis
  if (item.stage === "analise") {
    return `Em análise — ${dest}${motivation} para ${paxLabel}${cabin}${hotel}. Solicitação recebida ${timeAgo}.${scoreTag}`;
  }

  // New request — enriched with briefing data
  if (b?.tripMotivation || b?.hotelStars || b?.leadScore) {
    return `${item.clientName || "Lead"} pediu ${dest}${motivation} para ${paxLabel}${cabin}${hotel}. Aguardando proposta ${timeAgo}.${scoreTag}`;
  }

  return `Pediu ${dest} para ${paxLabel}${cabin}. Aguardando proposta ${timeAgo}.`;
}

export function calculateTemperature(item: NegotiationItem): Temperature {
  if (item.stage === "aceita") return "won";
  if (item.stage === "perdida") return "lost";

  let score = 50; // base
  const b = item.briefing;

  // Briefing lead_score boost
  if (b?.leadScore) {
    if (b.leadScore >= 80) score += 25;
    else if (b.leadScore >= 60) score += 15;
    else if (b.leadScore >= 40) score += 5;
  }

  // Briefing urgency boost
  if (b?.leadUrgency === "alta") score += 20;
  else if (b?.leadUrgency === "média") score += 5;

  // Positive sentiment boost
  if (b?.leadSentiment === "positivo" || b?.leadSentiment === "entusiasmado") score += 10;
  else if (b?.leadSentiment === "hesitante" || b?.leadSentiment === "negativo") score -= 10;

  // Recurring client boost
  if (b?.leadType === "recorrente" || b?.leadType === "vip") score += 10;

  // Time pressure: closer departure = hotter
  if (item.departureDate) {
    const daysUntil = (new Date(item.departureDate + "T12:00:00").getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    if (daysUntil < 7) score += 30;
    else if (daysUntil < 14) score += 20;
    else if (daysUntil < 30) score += 10;
  }

  // Views increase temperature
  if (item.viewCount) {
    score += Math.min(item.viewCount * 10, 30);
  }

  // Recent view = very hot
  if (item.lastViewedAt) {
    const hoursAgo = (Date.now() - new Date(item.lastViewedAt).getTime()) / (1000 * 60 * 60);
    if (hoursAgo < 1) score += 25;
    else if (hoursAgo < 6) score += 15;
    else if (hoursAgo < 24) score += 5;
  }

  // Waiting too long without action cools down
  const hoursElapsed = (Date.now() - new Date(item.createdAt).getTime()) / (1000 * 60 * 60);
  if (item.stage === "nova" && hoursElapsed > 4) score -= 10;
  if (item.stage === "enviada" && !item.viewCount && hoursElapsed > 48) score -= 20;

  if (score >= 70) return "hot";
  if (score >= 45) return "warm";
  return "cold";
}

export function calculateProgress(item: NegotiationItem): number {
  switch (item.stage) {
    case "nova": return 10;
    case "analise": return 25;
    case "proposta_criada": return 45;
    case "enviada": return 65;
    case "aceita": return 100;
    case "perdida": return 0;
    default: return 10;
  }
}

export function getUrgencyScore(item: NegotiationItem): number {
  let urgency = 0;
  const hoursElapsed = (Date.now() - new Date(item.createdAt).getTime()) / (1000 * 60 * 60);
  const b = item.briefing;

  // Briefing-based urgency
  if (b?.leadScore) urgency += Math.min(b.leadScore * 0.3, 30);
  if (b?.leadUrgency === "alta") urgency += 25;
  else if (b?.leadUrgency === "média") urgency += 10;
  if (b?.leadSentiment === "positivo" || b?.leadSentiment === "entusiasmado") urgency += 10;

  // New quotes without proposal
  if (item.stage === "nova") {
    urgency += Math.min(hoursElapsed * 5, 50);
    if (hoursElapsed > 2) urgency += 30;
  }

  // Sent without views
  if (item.stage === "enviada" && !item.viewCount) {
    urgency += 20;
    if (hoursElapsed > 24) urgency += 20;
  }

  // Recently viewed (action moment)
  if (item.lastViewedAt) {
    const viewHoursAgo = (Date.now() - new Date(item.lastViewedAt).getTime()) / (1000 * 60 * 60);
    if (viewHoursAgo < 1) urgency += 40;
    else if (viewHoursAgo < 6) urgency += 20;
  }

  // Departure proximity
  if (item.departureDate) {
    const daysUntil = (new Date(item.departureDate + "T12:00:00").getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    if (daysUntil < 7 && daysUntil > 0) urgency += 40;
    else if (daysUntil < 14) urgency += 20;
  }

  // Finished items go to bottom
  if (item.stage === "aceita" || item.stage === "perdida") urgency = -1;

  return urgency;
}
