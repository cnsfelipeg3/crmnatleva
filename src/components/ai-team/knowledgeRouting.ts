export interface KnowledgeDocRecord {
  title?: string | null;
  category?: string | null;
  content_text?: string | null;
}

const FUNNEL_AGENT_IDS = ["maya", "atlas", "habibi", "nemo", "dante", "luna", "nero", "iris"] as const;

function normalize(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

function pushDoc(target: Record<string, string[]>, agentId: string, content: string) {
  const trimmed = content.trim();
  if (!trimmed) return;

  const current = (target[agentId] ??= []);
  if (!current.includes(trimmed)) {
    current.push(trimmed);
  }
}

export function routeKnowledgeDocsByAgent(docs: KnowledgeDocRecord[]): Record<string, string[]> {
  const routed: Record<string, string[]> = {};

  for (const doc of docs) {
    const content = doc.content_text?.trim();
    if (!content) continue;

    const title = normalize(doc.title);
    const category = normalize(doc.category);

    if (category === "destinos" || title.includes("dubai") || title.includes("oriente")) {
      pushDoc(routed, "habibi", content);
    }

    if (category === "destinos" || title.includes("orlando") || title.includes("américas") || title.includes("americas")) {
      pushDoc(routed, "nemo", content);
    }

    if (category === "destinos" || title.includes("europa")) {
      pushDoc(routed, "dante", content);
    }

    if (category === "cultura" || category === "atendimento" || category === "regras" || category === "eventos") {
      for (const agentId of FUNNEL_AGENT_IDS) {
        pushDoc(routed, agentId, content);
      }
    }
  }

  return routed;
}

export function buildKnowledgeBlocksByAgent(docs: KnowledgeDocRecord[]): Record<string, string> {
  const routed = routeKnowledgeDocsByAgent(docs);

  return Object.fromEntries(
    Object.entries(routed).map(([agentId, agentDocs]) => [agentId, `=== BASE DE CONHECIMENTO ===\n${agentDocs.join("\n\n")}`]),
  );
}