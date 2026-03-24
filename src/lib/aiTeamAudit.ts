/**
 * AI Team Audit Logger
 * Logs every modification in the AI Team ecosystem with full traceability.
 */
import { supabase } from "@/integrations/supabase/client";

export interface AuditEntry {
  action_type: string;       // "create" | "update" | "delete" | "approve" | "archive" | "import"
  entity_type: string;       // "improvement" | "knowledge" | "rule" | "skill" | "agent" | "mission" | "flow" | "prompt"
  entity_id?: string;
  entity_name?: string;
  agent_id?: string;
  agent_name?: string;
  description: string;
  details?: Record<string, any>;
  performed_by?: string;
  approved_by?: string;
}

/**
 * Fire-and-forget audit log entry.
 */
export function logAITeamAudit(entry: AuditEntry) {
  supabase
    .from("ai_team_audit_log" as any)
    .insert({
      action_type: entry.action_type,
      entity_type: entry.entity_type,
      entity_id: entry.entity_id || null,
      entity_name: entry.entity_name || null,
      agent_id: entry.agent_id || null,
      agent_name: entry.agent_name || null,
      description: entry.description,
      details: entry.details || null,
      performed_by: entry.performed_by || null,
      approved_by: entry.approved_by || null,
      approved_at: entry.approved_by ? new Date().toISOString() : null,
    } as any)
    .then(({ error }) => {
      if (error) console.warn("[AITeamAudit] Failed:", error.message);
    });
}

export const AUDIT_ACTIONS = {
  CREATE: "create",
  UPDATE: "update",
  DELETE: "delete",
  APPROVE: "approve",
  ARCHIVE: "archive",
  IMPORT: "import",
  ACTIVATE: "activate",
  DEACTIVATE: "deactivate",
} as const;

export const AUDIT_ENTITIES = {
  IMPROVEMENT: "improvement",
  KNOWLEDGE: "knowledge",
  RULE: "rule",
  SKILL: "skill",
  AGENT: "agent",
  MISSION: "mission",
  FLOW: "flow",
  PROMPT: "prompt",
  LAB_RESULT: "lab_result",
  CONFIG: "config",
} as const;
