/**
 * Context Compression Engine — Simulador NatLeva
 * 
 * Handles long conversations by summarizing older messages
 * while keeping recent context fresh. This prevents:
 * - Token limit overflows
 * - High API costs
 * - Memory bloat
 */

import type { MensagemLead } from "./intelligentLeads";

/** Maximum messages to send in full to the AI */
const MAX_RECENT_MESSAGES = 16;

/** Threshold: only compress if conversation exceeds this */
const COMPRESSION_THRESHOLD = 20;

/** Build a condensed summary of older messages */
function summarizeOlderMessages(messages: MensagemLead[]): string {
  if (messages.length === 0) return "";

  const clientMsgs = messages.filter(m => m.role === "client");
  const agentMsgs = messages.filter(m => m.role === "agent");

  // Extract key topics discussed
  const allContent = messages.map(m => m.content).join(" ");
  
  // Detect mentioned destinations, budgets, dates
  const destinations = allContent.match(/\b(Maldivas|Paris|Nova York|Tóquio|Dubai|Roma|Cancún|Santorini|Fernando de Noronha|Orlando|Lisboa|Bali|Londres|Grécia|Tailândia|Egito|Marrocos|Peru|Chile|Argentina|Colômbia|México)\b/gi);
  const budgetMentions = allContent.match(/R\$\s*[\d.,]+(?:\s*(?:mil|k))?/gi);
  const dateMentions = allContent.match(/\b(?:janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro|jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\b/gi);
  const paxMentions = allContent.match(/\b(\d+)\s*(?:pessoa|adulto|criança|casal|família|pax)\b/gi);

  // Detect emotional shifts
  const positiveSignals = (allContent.match(/[😍😊🥰❤️🎉✨💖🙏]/g) || []).length;
  const negativeSignals = (allContent.match(/[😤😒😡🙄😞]/g) || []).length;
  const objections = clientMsgs.filter(m => 
    /\b(caro|preço|desconto|concorrente|pensar|depois|difícil|não sei|orçamento apert|outra agência)\b/i.test(m.content)
  );

  // Build key decisions/preferences
  const decisions: string[] = [];
  if (destinations?.length) decisions.push(`Destinos discutidos: ${[...new Set(destinations.map(d => d.charAt(0).toUpperCase() + d.slice(1).toLowerCase()))].join(", ")}`);
  if (budgetMentions?.length) decisions.push(`Valores mencionados: ${[...new Set(budgetMentions)].join(", ")}`);
  if (dateMentions?.length) decisions.push(`Datas mencionadas: ${[...new Set(dateMentions.map(d => d.toLowerCase()))].join(", ")}`);
  if (paxMentions?.length) decisions.push(`Grupo: ${[...new Set(paxMentions)].join(", ")}`);
  if (objections.length > 0) decisions.push(`Objeções levantadas (${objections.length}): ${objections.map(o => o.content.slice(0, 40)).join(" | ")}`);
  
  // Emotional trajectory
  const emotionSummary = positiveSignals > negativeSignals 
    ? "Tom geral positivo, cliente engajado" 
    : negativeSignals > positiveSignals
    ? "Tom geral tenso, cliente demonstrou insatisfação"
    : "Tom neutro, cliente objetivo";

  // Agents involved
  const agents = [...new Set(agentMsgs.filter(m => m.agentName).map(m => m.agentName!))];

  // Last substantive exchange
  const lastClientMsg = clientMsgs[clientMsgs.length - 1]?.content.slice(0, 100) || "";
  const lastAgentMsg = agentMsgs[agentMsgs.length - 1]?.content.slice(0, 100) || "";

  return `[RESUMO DAS PRIMEIRAS ${messages.length} MENSAGENS DA CONVERSA]
Total de trocas: ${messages.length} mensagens (${clientMsgs.length} do cliente, ${agentMsgs.length} do agente)
Agentes que atenderam: ${agents.join(", ") || "N/A"}
${decisions.length > 0 ? decisions.join("\n") : "Nenhuma decisão concreta registrada ainda."}
Estado emocional: ${emotionSummary}
Última mensagem relevante do cliente: "${lastClientMsg}"
Última resposta do agente: "${lastAgentMsg}"
[FIM DO RESUMO — CONTINUE A CONVERSA A PARTIR DAS MENSAGENS RECENTES ABAIXO]`;
}

/**
 * Compresses conversation history for AI consumption.
 * Keeps recent messages in full, summarizes older ones.
 */
export function compressConversation(
  messages: MensagemLead[],
  options: { maxRecent?: number; threshold?: number } = {}
): { role: string; content: string }[] {
  const maxRecent = options.maxRecent ?? MAX_RECENT_MESSAGES;
  const threshold = options.threshold ?? COMPRESSION_THRESHOLD;

  // If under threshold, return all messages as-is
  if (messages.length <= threshold) {
    return messages.map(m => ({
      role: m.role === "client" ? "user" : "assistant",
      content: m.content,
    }));
  }

  // Split: older messages get summarized, recent stay full
  const olderMessages = messages.slice(0, messages.length - maxRecent);
  const recentMessages = messages.slice(messages.length - maxRecent);

  const summary = summarizeOlderMessages(olderMessages);

  return [
    { role: "user", content: summary },
    ...recentMessages.map(m => ({
      role: m.role === "client" ? "user" : "assistant",
      content: m.content,
    })),
  ];
}

/**
 * Estimates token count for a message array (rough approximation).
 * Useful for cost monitoring.
 */
export function estimateTokens(messages: { content: string }[]): number {
  return messages.reduce((sum, m) => sum + Math.ceil(m.content.length / 3.5), 0);
}

/**
 * Built-in simulation presets for common scenarios.
 */
export const BUILT_IN_PRESETS = {
  stressTest: {
    name: "🔥 Stress Test",
    description: "100 leads simultâneos, resposta rápida — teste de carga máxima",
    config: {
      numLeads: 100, msgsPerLead: 10, intervalSec: 0, duration: 600,
      speed: "instant", objectionDensity: 70, enableEvaluation: false,
      enableMultiMsg: true, enableTransfers: true, emotionalVolatility: 80,
      agentResponseLength: "curta" as const, enableLossNarrative: false,
      evalFrequency: "every3" as const, funnelMode: "full" as const,
      initialPatience: 50, abandonmentSensitivity: 70,
      leadPatienceCurve: "sudden" as const,
    },
  },
  vendaReal: {
    name: "🎯 Venda Real",
    description: "8 leads com conversas profundas de 50+ mensagens — ciclo completo",
    config: {
      numLeads: 8, msgsPerLead: 60, intervalSec: 2, duration: 3600,
      speed: "normal", objectionDensity: 60, enableEvaluation: true,
      enableMultiMsg: true, enableTransfers: true, emotionalVolatility: 50,
      agentResponseLength: "longa" as const, enableLossNarrative: true,
      evalFrequency: "every2" as const, funnelMode: "full" as const,
      initialPatience: 85, abandonmentSensitivity: 40,
      leadPatienceCurve: "linear" as const,
    },
  },
  cicloLongo: {
    name: "⏰ Ciclo Longo Premium",
    description: "4 leads VIP com 200+ mensagens — simulação de venda premium real",
    config: {
      numLeads: 4, msgsPerLead: 200, intervalSec: 3, duration: 7200,
      speed: "lenta", objectionDensity: 40, enableEvaluation: true,
      enableMultiMsg: true, enableTransfers: true, emotionalVolatility: 30,
      agentResponseLength: "longa" as const, enableLossNarrative: true,
      evalFrequency: "every3" as const, funnelMode: "full" as const,
      initialPatience: 95, abandonmentSensitivity: 20,
      leadPatienceCurve: "linear" as const,
    },
  },
  campanhaPico: {
    name: "📢 Pico de Campanha",
    description: "50 leads em 30s — simula tráfego pago forte",
    config: {
      numLeads: 50, msgsPerLead: 16, intervalSec: 0, duration: 900,
      speed: "rapida", objectionDensity: 55, enableEvaluation: true,
      enableMultiMsg: true, enableTransfers: true, emotionalVolatility: 60,
      agentResponseLength: "media" as const, enableLossNarrative: true,
      evalFrequency: "every2" as const, funnelMode: "full" as const,
      initialPatience: 60, abandonmentSensitivity: 60,
      leadPatienceCurve: "exponential" as const,
    },
  },
  negociacaoCompleta: {
    name: "🤝 Negociação Complexa",
    description: "12 leads difíceis com alto volume de objeções e mudanças",
    config: {
      numLeads: 12, msgsPerLead: 80, intervalSec: 1, duration: 5400,
      speed: "normal", objectionDensity: 85, enableEvaluation: true,
      enableMultiMsg: true, enableTransfers: true, emotionalVolatility: 70,
      agentResponseLength: "longa" as const, enableLossNarrative: true,
      evalFrequency: "every" as const, funnelMode: "full" as const,
      initialPatience: 70, abandonmentSensitivity: 50,
      leadPatienceCurve: "exponential" as const,
    },
  },
};
