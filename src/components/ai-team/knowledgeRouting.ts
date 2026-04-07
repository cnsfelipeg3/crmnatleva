export interface KnowledgeDocRecord {
  title?: string | null;
  category?: string | null;
  content_text?: string | null;
}

const FUNNEL_AGENT_IDS = ["maya", "atlas", "habibi", "nemo", "dante", "luna", "nero", "iris"] as const;

// Keywords per specialist — used to route "destinos" docs accurately
const SPECIALIST_KEYWORDS: Record<string, RegExp> = {
  habibi: /\b(dubai|abu\s*dhabi|emirados|maldivas|turquia|istambul|oriente|catar|qatar|oman|bahrein|arabia|marrocos|egito|jordania)\b/i,
  nemo: /\b(orlando|disney|universal|miami|nova\s*york|new\s*york|estados\s*unidos|eua|usa|las\s*vegas|california|los\s*angeles|hawaii|cancun|punta\s*cana|caribe|mexico|colombia|cartagena|peru|machu\s*picchu|santiago|buenos\s*aires|bariloche|ushuaia|patagonia)\b/i,
  dante: /\b(europa|paris|fran[çc]a|italia|roma|veneza|floren[çc]a|espanha|madrid|barcelona|portugal|lisboa|porto|londres|london|inglaterra|grecia|santorini|atenas|su[ií][çc]a|alemanha|holanda|amsterdam|croacia|rep[úu]blica\s*tcheca|praga|austria|viena|irlanda|escocia|noruega|islandia)\b/i,
};

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
    const searchableText = `${title} ${content.slice(0, 500).toLowerCase()}`;

    if (category === "destinos") {
      // Route to specific specialist based on content keywords — NOT all specialists
      let matched = false;
      for (const [agentId, regex] of Object.entries(SPECIALIST_KEYWORDS)) {
        if (regex.test(searchableText)) {
          pushDoc(routed, agentId, content);
          // Also give to LUNA so she can reference when building proposals
          pushDoc(routed, "luna", content);
          matched = true;
        }
      }
      // If no specialist matches (e.g. Asia, Africa, Oceania) → give to LUNA as fallback
      if (!matched) {
        pushDoc(routed, "luna", content);
      }
      continue;
    }

    // Title-based routing for non-"destinos" categories
    if (title.includes("dubai") || title.includes("oriente")) {
      pushDoc(routed, "habibi", content);
      pushDoc(routed, "luna", content);
    }
    if (title.includes("orlando") || title.includes("américas") || title.includes("americas")) {
      pushDoc(routed, "nemo", content);
      pushDoc(routed, "luna", content);
    }
    if (title.includes("europa")) {
      pushDoc(routed, "dante", content);
      pushDoc(routed, "luna", content);
    }

    // Universal categories → all funnel agents
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
