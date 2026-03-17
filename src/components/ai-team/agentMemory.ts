/**
 * Agent Memory — pure functions for memory management.
 * No React, no side effects. Caller passes state + time.
 */

/* ═══════════════════════════════════════════
   Types
   ═══════════════════════════════════════════ */

export type MemoryType = "decision" | "interaction" | "pattern" | "alert";

export interface MemoryItem {
  id: string;
  type: MemoryType;
  content: string;
  timestamp: number;
  relevanceScore: number; // 0–1
  agentId: string;
  context?: string; // e.g. "upsell", "backlog", "pricing"
  metadata?: Record<string, string>; // category, source agent, task type etc.
}

export interface AgentMemory {
  shortTerm: MemoryItem[];          // FIFO, max 10
  longTerm: MemoryItem[];           // top relevance, max 50
  preferences: Record<string, number>; // clamped -1..+1, e.g. { "upsell": -0.3 }
  learnedPatterns: string[];        // natural language, max 7
}

/* ═══════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════ */

const MAX_SHORT_TERM = 10;
const MAX_LONG_TERM = 50;
const MAX_PATTERNS = 7;
const PROMOTION_THRESHOLD = 0.7;
const PREFERENCE_CLAMP = 1;
const DECAY_FACTOR = 0.97; // per-cycle decay for preferences
const PATTERN_INFERENCE_MIN_DECISIONS = 3;

/* ═══════════════════════════════════════════
   Relevance scoring — explicit rules
   ═══════════════════════════════════════════ */

interface RelevanceInput {
  type: MemoryType;
  isApproval?: boolean;
  isRepeat?: boolean; // same context appeared before
  ageMs?: number;     // age since creation
}

export function computeRelevance(input: RelevanceInput): number {
  let score = 0;

  // Base by type
  switch (input.type) {
    case "alert":       score = 0.85; break;
    case "decision":    score = 0.75; break;
    case "pattern":     score = 0.8;  break;
    case "interaction": score = 0.45; break;
  }

  // Approval/rejection boost
  if (input.type === "decision") {
    score += input.isApproval ? 0.1 : 0.05;
  }

  // Repetition boost
  if (input.isRepeat) score += 0.1;

  // Recency penalty (older → less relevant)
  if (input.ageMs && input.ageMs > 300_000) {
    score -= 0.05;
  }

  return Math.min(1, Math.max(0, score));
}

/* ═══════════════════════════════════════════
   Init
   ═══════════════════════════════════════════ */

export function createEmptyMemory(): AgentMemory {
  return {
    shortTerm: [],
    longTerm: [],
    preferences: {},
    learnedPatterns: [],
  };
}

/* ═══════════════════════════════════════════
   Core operations (all pure)
   ═══════════════════════════════════════════ */

let _memIdCounter = 0;
function memUid(): string {
  return `mem_${++_memIdCounter}_${Math.random().toString(36).slice(2, 5)}`;
}

/**
 * Add a memory item. Handles short-term insertion,
 * promotion to long-term, and preference updates.
 */
export function addMemory(
  memory: AgentMemory,
  item: Omit<MemoryItem, "id">,
): AgentMemory {
  const newItem: MemoryItem = { ...item, id: memUid() };

  // Short-term: FIFO
  let shortTerm = [newItem, ...memory.shortTerm].slice(0, MAX_SHORT_TERM);

  // Promote to long-term if relevant enough
  let longTerm = [...memory.longTerm];
  if (newItem.relevanceScore >= PROMOTION_THRESHOLD) {
    longTerm = [newItem, ...longTerm]
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, MAX_LONG_TERM);
  }

  // Update preferences from decisions
  let preferences = { ...memory.preferences };
  if (newItem.type === "decision" && newItem.context) {
    const ctx = newItem.context;
    const current = preferences[ctx] ?? 0;
    const isApproval = newItem.metadata?.action === "approve";
    const delta = isApproval ? 0.15 : -0.15;
    preferences[ctx] = clamp(current + delta, -PREFERENCE_CLAMP, PREFERENCE_CLAMP);
  }

  // Infer patterns from accumulated decisions
  const learnedPatterns = inferPatterns(
    [...shortTerm, ...longTerm],
    memory.learnedPatterns,
  );

  return { shortTerm, longTerm, preferences, learnedPatterns };
}

/**
 * Apply time-based decay to preferences.
 * Call periodically (e.g. every N ticks).
 */
export function decayPreferences(memory: AgentMemory): AgentMemory {
  const preferences: Record<string, number> = {};
  for (const [key, val] of Object.entries(memory.preferences)) {
    const decayed = val * DECAY_FACTOR;
    // Drop near-zero preferences
    if (Math.abs(decayed) > 0.02) {
      preferences[key] = Math.round(decayed * 1000) / 1000;
    }
  }
  return { ...memory, preferences };
}

/**
 * Build a decision memory item with full context from a task action.
 */
export function createDecisionMemory(
  agentId: string,
  taskTitle: string,
  taskCategory: string,
  action: "approve" | "ignore",
  now: number,
): Omit<MemoryItem, "id"> {
  const isApproval = action === "approve";
  const context = categorizeTask(taskTitle);

  return {
    type: "decision",
    content: `${isApproval ? "Aprovação" : "Ignorou"}: ${taskTitle}`,
    timestamp: now,
    relevanceScore: computeRelevance({
      type: "decision",
      isApproval,
    }),
    agentId,
    context,
    metadata: {
      action,
      taskCategory,
      originalTitle: taskTitle,
    },
  };
}

/**
 * Returns preference weight for a given context/category.
 * Positive = user likes it, negative = user dislikes it.
 */
export function getPreferenceWeight(memory: AgentMemory, context: string): number {
  return memory.preferences[context] ?? 0;
}

/**
 * Check if memory-aware thoughts should trigger.
 * Only when long-term has enough entries + a clear preference exists.
 */
export function shouldUseMemoryThought(memory: AgentMemory): boolean {
  if (memory.longTerm.length < 3) return false;
  // Check if any preference is strong enough
  return Object.values(memory.preferences).some(v => Math.abs(v) >= 0.3);
}

/* ═══════════════════════════════════════════
   Internal helpers
   ═══════════════════════════════════════════ */

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

/**
 * Infer natural-language patterns from accumulated memory items.
 * Deduplicates by context and keeps only top patterns.
 */
function inferPatterns(allItems: MemoryItem[], existing: string[]): string[] {
  const decisions = allItems.filter(m => m.type === "decision");
  if (decisions.length < PATTERN_INFERENCE_MIN_DECISIONS) return existing;

  // Group decisions by context
  const contextCounts: Record<string, { approve: number; ignore: number }> = {};
  for (const d of decisions) {
    const ctx = d.context || "geral";
    if (!contextCounts[ctx]) contextCounts[ctx] = { approve: 0, ignore: 0 };
    if (d.metadata?.action === "approve") contextCounts[ctx].approve++;
    else contextCounts[ctx].ignore++;
  }

  const newPatterns: string[] = [];

  for (const [ctx, counts] of Object.entries(contextCounts)) {
    const total = counts.approve + counts.ignore;
    if (total < 2) continue;

    if (counts.approve > counts.ignore * 2) {
      newPatterns.push(`Tende a aceitar sugestões de ${ctx}`);
    } else if (counts.ignore > counts.approve * 2) {
      newPatterns.push(`Frequentemente ignora sugestões de ${ctx}`);
    } else if (total >= 3) {
      newPatterns.push(`Avalia caso a caso sugestões de ${ctx}`);
    }
  }

  // Deduplicate by context similarity: keep new patterns, replace old ones
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const p of newPatterns) {
    const key = p.replace(/sugestões de /, "").toLowerCase();
    if (!seen.has(key)) { seen.add(key); merged.push(p); }
  }
  // Keep existing patterns not covered by new ones
  for (const p of existing) {
    const key = p.replace(/sugestões de /, "").toLowerCase();
    if (!seen.has(key)) { seen.add(key); merged.push(p); }
  }

  return merged.slice(0, MAX_PATTERNS);
}

/**
 * Categorize a task by title keywords → context string.
 */
function categorizeTask(title: string): string {
  const lower = title.toLowerCase();
  if (lower.includes("upsell") || lower.includes("upgrade")) return "upsell";
  if (lower.includes("mídia") || lower.includes("media") || lower.includes("foto")) return "mídia";
  if (lower.includes("backlog") || lower.includes("priorid")) return "backlog";
  if (lower.includes("margem") || lower.includes("preço") || lower.includes("precif")) return "pricing";
  if (lower.includes("fornecedor") || lower.includes("supplier")) return "fornecedores";
  if (lower.includes("proposta") || lower.includes("template")) return "propostas";
  if (lower.includes("sazonalid") || lower.includes("tendência")) return "estratégia";
  if (lower.includes("follow") || lower.includes("recontato")) return "follow-up";
  if (lower.includes("sla") || lower.includes("prazo")) return "sla";
  return "operacional";
}
