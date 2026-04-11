import { useMemo } from "react";
import {
  NegotiationItem,
  getUrgencyScore,
  calculateTemperature,
} from "@/lib/negotiationNarrative";
import { countFilledFields, MONITOR_TOTAL_FIELDS } from "@/lib/quotationMonitor";

export type StageGroup =
  | "em_atendimento"
  | "extraindo"
  | "aguardando_cotacao"
  | "proposta_criada"
  | "enviada"
  | "fechadas";

export interface GroupedNegotiations {
  key: StageGroup;
  label: string;
  items: NegotiationItem[];
}

const EXTRACTION_THRESHOLD = 0.7; // 70% = enough data to quote

/** Determine the pipeline stage for display/grouping */
export function resolveDisplayStage(item: NegotiationItem): StageGroup {
  if (item.stage === "aceita" || item.stage === "perdida") return "fechadas";
  if (item.stage === "enviada") return "enviada";
  if (item.stage === "proposta_criada") return "proposta_criada";

  // For items with briefings, determine by extraction completeness
  const raw = item.rawBriefing;
  if (raw) {
    const filled = countFilledFields(raw);
    const pct = filled / MONITOR_TOTAL_FIELDS;

    if (raw.status === "extraindo") return "extraindo";
    if (pct >= EXTRACTION_THRESHOLD && !item.proposalId) return "aguardando_cotacao";
    if (pct < EXTRACTION_THRESHOLD && !item.proposalId) return "extraindo";
  }

  // Items in early stages without briefing
  if (item.stage === "nova" || item.stage === "analise") {
    if (item.source === "briefing" && item.rawBriefing?.status === "extraindo") return "extraindo";
    return "em_atendimento";
  }

  return "em_atendimento";
}

const GROUP_CONFIG: Record<StageGroup, { label: string; order: number }> = {
  em_atendimento: { label: "Em Atendimento", order: 0 },
  extraindo: { label: "Extraindo Dados", order: 1 },
  aguardando_cotacao: { label: "Aguardando Cotação", order: 2 },
  proposta_criada: { label: "Proposta Criada", order: 3 },
  enviada: { label: "Proposta Enviada", order: 4 },
  fechadas: { label: "Finalizadas", order: 5 },
};

const GROUP_ORDER: StageGroup[] = [
  "em_atendimento",
  "extraindo",
  "aguardando_cotacao",
  "proposta_criada",
  "enviada",
  "fechadas",
];

export type TempFilter = "all" | "hot" | "warm" | "cold";

export function useNegotiationPriority(
  items: NegotiationItem[],
  filter: TempFilter = "all",
  search: string = ""
) {
  const filtered = useMemo(() => {
    let list = items;

    if (filter !== "all") {
      list = list.filter((i) => {
        const temp = calculateTemperature(i);
        if (filter === "hot") return temp === "hot";
        if (filter === "warm") return temp === "warm";
        return temp === "cold";
      });
    }

    if (search) {
      const s = search.toLowerCase();
      list = list.filter(
        (i) =>
          (i.destination || "").toLowerCase().includes(s) ||
          (i.origin || "").toLowerCase().includes(s) ||
          (i.clientName || "").toLowerCase().includes(s)
      );
    }

    return list;
  }, [items, filter, search]);

  const grouped = useMemo(() => {
    const map: Record<StageGroup, NegotiationItem[]> = {
      em_atendimento: [],
      extraindo: [],
      aguardando_cotacao: [],
      proposta_criada: [],
      enviada: [],
      fechadas: [],
    };

    for (const item of filtered) {
      const group = resolveDisplayStage(item);
      map[group].push(item);
    }

    // Sort each group by urgency (desc)
    for (const key of GROUP_ORDER) {
      map[key].sort((a, b) => getUrgencyScore(b) - getUrgencyScore(a));
    }

    const result: GroupedNegotiations[] = [];
    for (const key of GROUP_ORDER) {
      if (map[key].length > 0) {
        result.push({
          key,
          label: GROUP_CONFIG[key].label,
          items: map[key],
        });
      }
    }

    return result;
  }, [filtered]);

  const stats = useMemo(() => {
    let hot = 0,
      warm = 0,
      cold = 0;
    const stageCounts: Record<StageGroup, number> = {
      em_atendimento: 0,
      extraindo: 0,
      aguardando_cotacao: 0,
      proposta_criada: 0,
      enviada: 0,
      fechadas: 0,
    };

    for (const item of items) {
      const t = calculateTemperature(item);
      if (t === "hot") hot++;
      else if (t === "warm") warm++;
      else if (t === "cold") cold++;

      const stage = resolveDisplayStage(item);
      stageCounts[stage]++;
    }

    return {
      hot,
      warm,
      cold,
      total: items.length,
      needAttention:
        grouped.find((g) => g.key === "em_atendimento")?.items.length || 0,
      stageCounts,
    };
  }, [items, grouped]);

  return { grouped, stats };
}
