/**
 * Motor de Recomendação Inteligente — NatLeva
 */

import type { ClientAnalysis } from "./clientScoring";

export interface Recommendation {
  title: string;
  reason: string;
  probability: "alta" | "média" | "baixa";
  type: "destino" | "produto" | "reativação" | "upgrade";
}

export function generateRecommendations(client: ClientAnalysis): Recommendation[] {
  const recs: Recommendation[] = [];

  // Luxury Frequent → Suggest exotic destinations
  if (client.cluster === "Luxo Frequente") {
    if (!client.regionMap["África"]) {
      recs.push({ title: "Safari na África do Sul ou Tanzânia", reason: "Cliente de luxo que nunca explorou a África — alta disposição para experiências premium", probability: "alta", type: "destino" });
    }
    if (!client.regionMap["Oriente Médio"]) {
      recs.push({ title: "Dubai ou Abu Dhabi Premium", reason: "Perfil de alto ticket compatível com hotéis 5★ no Oriente Médio", probability: "média", type: "destino" });
    }
    if (!client.regionMap["Ásia"]) {
      recs.push({ title: "Japão ou Tailândia — Experiência Cultural", reason: "Destino aspiracional para viajantes frequentes de luxo", probability: "média", type: "destino" });
    }
    recs.push({ title: "Upgrade para Primeira Classe / Business", reason: "Ticket médio alto sugere disposição para cabines premium", probability: "alta", type: "upgrade" });
  }

  // Family Premium → Family-friendly destinations
  if (client.cluster === "Família Premium") {
    if (!client.regionMap["Caribe/LatAm"] || (client.destMap["CUN"] || 0) < 2) {
      recs.push({ title: "Cruzeiro pelo Caribe", reason: "Famílias premium têm alta conversão em cruzeiros all-inclusive", probability: "alta", type: "produto" });
    }
    if ((client.destMap["MCO"] || 0) >= 2) {
      recs.push({ title: "Orlando VIP Experience", reason: "Recorrente em Orlando — oferecer pacote com parques + hotel boutique", probability: "alta", type: "upgrade" });
    }
    recs.push({ title: "Resort All-Inclusive Premium", reason: "Perfil familiar com ticket elevado — ideal para experiências sem preocupação", probability: "média", type: "produto" });
  }

  // Churn Risk → Reactivation offers
  if (client.cluster === "Risco de Churn" || client.daysInactive > 180) {
    const avgHistorical = client.avgTicket;
    recs.push({
      title: `Oferta especial até ${fmtBRL(avgHistorical * 0.9)}`,
      reason: `Cliente inativo há ${client.daysInactive} dias — oferta dentro da faixa histórica para reativação`,
      probability: client.daysInactive < 365 ? "média" : "baixa",
      type: "reativação",
    });
    if (client.topRegion !== "Desconhecido") {
      recs.push({
        title: `Promoção ${client.topRegion} — destino favorito`,
        reason: `Enviar oferta personalizada para ${client.topRegion}, região preferida do cliente`,
        probability: "média",
        type: "reativação",
      });
    }
  }

  // High Ticket Low Freq → Loyalty program
  if (client.cluster === "Alto Ticket Baixa Freq.") {
    recs.push({ title: "Programa de Fidelidade VIP", reason: "Cliente com ticket muito alto mas frequência baixa — incentivar recorrência com benefícios exclusivos", probability: "média", type: "upgrade" });
    recs.push({ title: "Viagem de Aniversário / Data Especial", reason: "Aproveitar datas especiais para gerar segunda compra no ano", probability: "média", type: "produto" });
  }

  // Economical Recurring → Upsell
  if (client.cluster === "Econômico Recorrente") {
    recs.push({ title: "Upgrade de categoria de hotel", reason: "Cliente recorrente com ticket baixo — margem para incrementar valor com upgrade de hospedagem", probability: "alta", type: "upgrade" });
    if (!client.isInternational) {
      recs.push({ title: "Primeira viagem internacional", reason: "Cliente recorrente doméstico — apresentar destino internacional acessível como Buenos Aires ou Santiago", probability: "média", type: "destino" });
    }
  }

  // Special Experience → More experiences
  if (client.cluster === "Experiência Especial") {
    recs.push({ title: "Roteiro Personalizado Exclusivo", reason: "Perfil de experiências especiais — oferecer roteiros customizados com guia privativo", probability: "alta", type: "produto" });
  }

  // New/Occasional → Convert to recurring
  if (client.cluster === "Novo/Ocasional") {
    recs.push({ title: "Follow-up pós-viagem + Nova oferta", reason: "Cliente com apenas 1 viagem — contato proativo para gerar segunda compra", probability: "média", type: "reativação" });
  }

  // General: if margin is low, suggest higher-margin products
  if (client.avgMargin < 10 && client.totalTrips >= 2) {
    recs.push({ title: "Migrar para emissão por milhas", reason: "Margem média abaixo de 10% — emissão por milhas pode aumentar lucratividade", probability: "média", type: "upgrade" });
  }

  return recs.slice(0, 5);
}

function fmtBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
