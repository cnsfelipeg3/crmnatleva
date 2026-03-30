import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertTriangle, Trash2, RotateCcw, CheckCircle, XCircle, Loader2, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { logAITeamAudit, AUDIT_ACTIONS, AUDIT_ENTITIES } from "@/lib/aiTeamAudit";

/* ═══ Entity → Table mapping ═══ */
const ENTITY_TABLE_MAP: Record<string, string> = {
  rule: "ai_strategy_knowledge",
  Regra: "ai_strategy_knowledge",
  knowledge: "ai_knowledge_base",
  skill: "agent_skills",
  flow: "automation_flows",
  agent: "ai_team_agents",
  improvement: "ai_team_improvements",
  prompt: "ai_team_improvements",
  mission: "ai_team_missions",
  lab_result: "ai_team_lab_results",
};

interface UndoAnalysis {
  canUndo: boolean;
  reason?: string;
  table: string;
  matchField: string;
  matchValue: string;
  recordFound: any | null;
  undoAction: string; // "delete" | "toggle_active" | "restore_prompt"
  impactDescription: string;
  relatedCleanups: string[];
}

async function analyzeUndo(entry: any): Promise<UndoAnalysis> {
  const table = ENTITY_TABLE_MAP[entry.entity_type];
  const base: UndoAnalysis = {
    canUndo: false,
    table: table || "desconhecida",
    matchField: "",
    matchValue: "",
    recordFound: null,
    undoAction: "delete",
    impactDescription: "",
    relatedCleanups: [],
  };

  if (!table) {
    return { ...base, reason: `Tipo "${entry.entity_type}" (config) não suporta reversão automática.` };
  }

  /* ─── CREATE → delete the created entity ─── */
  if (entry.action_type === "create") {
    // Determine match field
    let matchField = "title";
    if (["agent_skills", "ai_team_agents"].includes(table)) matchField = "name";
    if (table === "automation_flows") matchField = "name";
    if (table === "ai_team_improvements") matchField = "title";

    const matchValue = entry.entity_name;
    if (!matchValue) return { ...base, reason: "Nome da entidade não registrado no log." };

    const { data, error } = await (supabase.from(table as any) as any)
      .select("*")
      .eq(matchField, matchValue)
      .limit(1);

    if (error || !data?.length) {
      return { ...base, reason: `Registro "${matchValue}" não encontrado na tabela ${table}. Já pode ter sido removido.` };
    }

    const record = data[0];
    const relatedCleanups: string[] = [];

    // For flows, check edges and nodes
    if (table === "automation_flows") {
      const { count: nodesCount } = await (supabase.from("automation_nodes" as any) as any)
        .select("*", { count: "exact", head: true })
        .eq("flow_id", record.id);
      const { count: edgesCount } = await (supabase.from("automation_edges" as any) as any)
        .select("*", { count: "exact", head: true })
        .eq("flow_id", record.id);
      if (nodesCount) relatedCleanups.push(`${nodesCount} nós do fluxo`);
      if (edgesCount) relatedCleanups.push(`${edgesCount} conexões do fluxo`);
    }

    // For skills, check assignments
    if (table === "agent_skills") {
      const { count } = await (supabase.from("agent_skill_assignments" as any) as any)
        .select("*", { count: "exact", head: true })
        .eq("skill_id", record.id);
      if (count) relatedCleanups.push(`${count} atribuições de skill a agentes`);
    }

    return {
      canUndo: true,
      table,
      matchField,
      matchValue,
      recordFound: record,
      undoAction: "delete",
      impactDescription: `Deletar "${matchValue}" da tabela ${table}`,
      relatedCleanups,
    };
  }

  /* ─── ACTIVATE/DEACTIVATE → toggle is_active ─── */
  if (entry.action_type === "activate" || entry.action_type === "deactivate") {
    const matchValue = entry.entity_name;
    if (!matchValue) return { ...base, reason: "Nome da entidade não registrado." };

    const matchField = table === "ai_strategy_knowledge" ? "title" : "name";
    const { data } = await (supabase.from(table as any) as any)
      .select("*").eq(matchField, matchValue).limit(1);

    if (!data?.length) return { ...base, reason: `Registro "${matchValue}" não encontrado.` };

    const currentActive = data[0].is_active;
    const targetActive = entry.action_type === "activate" ? false : true;

    return {
      canUndo: true,
      table,
      matchField,
      matchValue,
      recordFound: data[0],
      undoAction: "toggle_active",
      impactDescription: `Reverter "${matchValue}" para ${targetActive ? "ativo" : "inativo"}`,
      relatedCleanups: [],
    };
  }

  /* ─── UPDATE (prompt) → remove the improvement ─── */
  if (entry.action_type === "update" && entry.entity_type === "prompt" && entry.entity_id) {
    const { data } = await (supabase.from("ai_team_improvements" as any) as any)
      .select("*").eq("id", entry.entity_id).limit(1);

    if (data?.length) {
      return {
        canUndo: true,
        table: "ai_team_improvements",
        matchField: "id",
        matchValue: entry.entity_id,
        recordFound: data[0],
        undoAction: "delete",
        impactDescription: `Remover melhoria "${data[0].title}" do agente`,
        relatedCleanups: ["A instrução será removida do prompt do agente na próxima compilação"],
      };
    }

    // Try to find in behavior_prompt of agents
    return { ...base, reason: "Melhoria de prompt não encontrada. A edição pode ter sido feita diretamente." };
  }

  /* ─── APPROVE (skill) → revert to pending ─── */
  if (entry.action_type === "approve") {
    return { ...base, reason: "Aprovações não podem ser revertidas automaticamente. Desative o item manualmente." };
  }

  /* ─── DELETE → cannot restore without snapshot ─── */
  if (entry.action_type === "delete") {
    return { ...base, reason: "Exclusões não podem ser revertidas — os dados originais não foram salvos no log." };
  }

  /* ─── ARCHIVE → unarchive ─── */
  if (entry.action_type === "archive") {
    return { ...base, reason: "Arquivamentos precisam ser revertidos manualmente na tela de origem." };
  }

  return { ...base, reason: "Este tipo de ação não suporta reversão automática." };
}

async function executeUndo(analysis: UndoAnalysis): Promise<boolean> {
  const record = analysis.recordFound;
  if (!record) return false;

  if (analysis.undoAction === "delete") {
    // Clean up related records first
    if (analysis.table === "automation_flows") {
      await (supabase.from("automation_edges" as any) as any).delete().eq("flow_id", record.id);
      await (supabase.from("automation_nodes" as any) as any).delete().eq("flow_id", record.id);
      await (supabase.from("automation_executions" as any) as any).delete().eq("flow_id", record.id);
    }
    if (analysis.table === "agent_skills") {
      await (supabase.from("agent_skill_assignments" as any) as any).delete().eq("skill_id", record.id);
    }

    const { error } = await (supabase.from(analysis.table as any) as any)
      .delete()
      .eq("id", record.id);

    return !error;
  }

  if (analysis.undoAction === "toggle_active") {
    const targetActive = !record.is_active;
    const { error } = await (supabase.from(analysis.table as any) as any)
      .update({ is_active: targetActive, updated_at: new Date().toISOString() })
      .eq("id", record.id);
    return !error;
  }

  return false;
}

/* ═══ Dialog Component ═══ */
interface UndoChangeDialogProps {
  entry: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUndone: () => void;
}

export default function UndoChangeDialog({ entry, open, onOpenChange, onUndone }: UndoChangeDialogProps) {
  const [analysis, setAnalysis] = useState<UndoAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);

  useEffect(() => {
    if (!open || !entry) return;
    setLoading(true);
    setAnalysis(null);
    analyzeUndo(entry).then(result => {
      setAnalysis(result);
      setLoading(false);
    });
  }, [open, entry?.id]);

  const handleConfirm = async () => {
    if (!analysis?.canUndo) return;
    setExecuting(true);
    try {
      const success = await executeUndo(analysis);
      if (success) {
        // Log the undo action itself
        logAITeamAudit({
          action_type: AUDIT_ACTIONS.DELETE,
          entity_type: entry.entity_type,
          entity_id: analysis.recordFound?.id,
          entity_name: entry.entity_name,
          agent_name: entry.agent_name,
          description: `↩️ DESFEITO: ${entry.description}`,
          details: { undone_audit_id: entry.id, undo_action: analysis.undoAction },
          performed_by: "Gestor (undo)",
        });
        toast.success("Mudança desfeita com sucesso!");
        onUndone();
        onOpenChange(false);
      } else {
        toast.error("Falha ao desfazer. Verifique o console.");
      }
    } catch (err) {
      console.error("[Undo] Error:", err);
      toast.error("Erro ao desfazer mudança.");
    } finally {
      setExecuting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-amber-500" />
            Desfazer Mudança
          </DialogTitle>
          <DialogDescription>
            Análise do que será revertido no sistema
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12 gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Analisando impacto...</span>
          </div>
        ) : analysis ? (
          <div className="space-y-4">
            {/* Entry summary */}
            <div className="rounded-xl bg-muted/30 border border-border/20 p-4 space-y-2">
              <p className="text-xs text-muted-foreground/60 uppercase tracking-widest font-semibold">Registro original</p>
              <p className="text-sm font-medium text-foreground">{entry.entity_name || entry.description}</p>
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline" className="text-[10px]">{entry.action_type}</Badge>
                <Badge variant="outline" className="text-[10px]">{entry.entity_type}</Badge>
                {entry.agent_name && <Badge variant="secondary" className="text-[10px]">{entry.agent_name}</Badge>}
              </div>
            </div>

            {analysis.canUndo ? (
              <>
                {/* Impact report */}
                <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <p className="text-xs font-semibold text-amber-500 uppercase tracking-wider">O que será revertido</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <Trash2 className="w-3.5 h-3.5 mt-0.5 text-red-400 shrink-0" />
                      <p className="text-sm text-foreground">{analysis.impactDescription}</p>
                    </div>

                    {analysis.relatedCleanups.map((c, i) => (
                      <div key={i} className="flex items-start gap-2 ml-4">
                        <span className="text-muted-foreground/50 text-xs">↳</span>
                        <p className="text-xs text-muted-foreground">{c}</p>
                      </div>
                    ))}
                  </div>

                  {/* Record preview */}
                  {analysis.recordFound && (
                    <details className="mt-2">
                      <summary className="text-[10px] text-muted-foreground/50 cursor-pointer hover:text-muted-foreground">
                        Ver registro que será afetado
                      </summary>
                      <pre className="mt-2 text-[10px] text-muted-foreground/60 font-mono bg-muted/20 rounded-lg p-3 overflow-x-auto max-h-[160px] whitespace-pre-wrap">
                        {JSON.stringify(analysis.recordFound, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </>
            ) : (
              <div className="rounded-xl bg-muted/20 border border-border/10 p-4 flex items-start gap-3">
                <Info className="w-5 h-5 text-muted-foreground/40 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Não é possível desfazer</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">{analysis.reason}</p>
                </div>
              </div>
            )}
          </div>
        ) : null}

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={executing}>
            <XCircle className="w-4 h-4 mr-1.5" />
            Cancelar
          </Button>
          {analysis?.canUndo && (
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={executing}
              className="gap-1.5"
            >
              {executing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RotateCcw className="w-4 h-4" />
              )}
              Confirmar Reversão
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
