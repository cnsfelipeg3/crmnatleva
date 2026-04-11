import { useMemo } from "react";
import { NegotiationItem, getUrgencyScore, calculateTemperature, Temperature } from "@/lib/negotiationNarrative";

export type TimeGroup = "now" | "today" | "yesterday" | "this_week" | "older" | "closed";

export interface GroupedNegotiations {
  key: TimeGroup;
  label: string;
  items: NegotiationItem[];
}

function getTimeGroup(item: NegotiationItem): TimeGroup {
  if (item.stage === "aceita" || item.stage === "perdida") return "closed";

  const urgency = getUrgencyScore(item);
  if (urgency >= 50) return "now";

  const created = new Date(item.createdAt);
  const now = new Date();
  const diffHours = (now.getTime() - created.getTime()) / (1000 * 60 * 60);

  if (diffHours < 24) return "today";
  if (diffHours < 48) return "yesterday";
  if (diffHours < 168) return "this_week";
  return "older";
}

const GROUP_LABELS: Record<TimeGroup, string> = {
  now: "Precisam de atenção agora",
  today: "Hoje",
  yesterday: "Ontem",
  this_week: "Esta semana",
  older: "Anteriores",
  closed: "Finalizadas",
};

const GROUP_ORDER: TimeGroup[] = ["now", "today", "yesterday", "this_week", "older", "closed"];

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
    const map: Record<TimeGroup, NegotiationItem[]> = {
      now: [], today: [], yesterday: [], this_week: [], older: [], closed: [],
    };

    for (const item of filtered) {
      const group = getTimeGroup(item);
      map[group].push(item);
    }

    // Sort each group by urgency (desc)
    for (const key of GROUP_ORDER) {
      map[key].sort((a, b) => getUrgencyScore(b) - getUrgencyScore(a));
    }

    const result: GroupedNegotiations[] = [];
    for (const key of GROUP_ORDER) {
      if (map[key].length > 0) {
        result.push({ key, label: GROUP_LABELS[key], items: map[key] });
      }
    }

    return result;
  }, [filtered]);

  const stats = useMemo(() => {
    let hot = 0, warm = 0, cold = 0;
    for (const item of items) {
      const t = calculateTemperature(item);
      if (t === "hot") hot++;
      else if (t === "warm") warm++;
      else if (t === "cold") cold++;
    }
    return { hot, warm, cold, total: items.length, needAttention: grouped.find(g => g.key === "now")?.items.length || 0 };
  }, [items, grouped]);

  return { grouped, stats };
}
