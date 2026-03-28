/**
 * SimulatorObservationsPanel v2
 * Full observation-to-improvement pipeline:
 * 1. Click message → write observation
 * 2. Observations accumulate grouped by agent
 * 3. "Organize with AI" synthesizes into actionable improvements
 * 4. Approve → writes to agent behavior_prompt in DB
 */
import { useState, useRef, useEffect, useCallback, Fragment } from "react";
import {
  MessageSquarePlus, X, Send, Eye, Lightbulb, Sparkles, Trash2,
  Bot, Check, XCircle, Loader2, Wand2, ChevronDown, ChevronUp,
  AlertTriangle, ArrowRight, Shield, Zap, FileText, ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import { AGENTS_V4 } from "./agentsV4Data";

import { logAITeamAudit, AUDIT_ACTIONS, AUDIT_ENTITIES } from "@/lib/aiTeamAudit";

// ===== TYPES =====
export interface SelectedMessage {
  content: string;
  role: "agent" | "client";
  agentName?: string;
  agentId?: string;
  leadId: string;
  leadName: string;
  timestamp: number;
}

export interface Observation {
  id: string;
  scope: "message" | "session";
  observationText: string;
  messageContent?: string;
  messageRole?: string;
  leadId?: string;
  leadName?: string;
  agentName?: string;
  agentId?: string;
  createdAt: string;
}

interface SynthesizedImprovement {
  id: string;
  agentId: string;
  agentName: string;
  agentEmoji: string;
  category: "behavior" | "tone" | "knowledge" | "flow";
  title: string;
  description: string;
  actionText: string; // The actual text to append to behavior_prompt
  severity: "critical" | "important" | "suggestion";
  sourceObservationIds: string[];
  status: "pending" | "approved" | "rejected";
  improvementDbId?: string; // id from ai_team_improvements after approval
}

type PanelView = "observations" | "review";

interface Props {
  simulationId?: string;
  selectedMessage: SelectedMessage | null;
  onClearSelectedMessage: () => void;
  className?: string;
}

// ===== CATEGORY META =====
const CATEGORY_META: Record<string, { icon: typeof Lightbulb; label: string; color: string }> = {
  behavior: { icon: Shield, label: "Comportamento", color: "#F59E0B" },
  tone: { icon: MessageSquarePlus, label: "Tom de Voz", color: "#8B5CF6" },
  knowledge: { icon: FileText, label: "Conhecimento", color: "#3B82F6" },
  flow: { icon: Zap, label: "Fluxo", color: "#06B6D4" },
};
const DEFAULT_CATEGORY = { icon: Lightbulb, label: "Geral", color: "#94A3B8" };

const SEVERITY_META: Record<string, { label: string; color: string; bg: string }> = {
  critical: { label: "Crítico", color: "#EF4444", bg: "rgba(239,68,68,0.1)" },
  important: { label: "Importante", color: "#F59E0B", bg: "rgba(245,158,11,0.1)" },
  suggestion: { label: "Sugestão", color: "#10B981", bg: "rgba(16,185,129,0.1)" },
};
const DEFAULT_SEVERITY = { label: "Info", color: "#94A3B8", bg: "rgba(148,163,184,0.1)" };

// ===== MAIN COMPONENT =====
export default function SimulatorObservationsPanel({
  simulationId,
  selectedMessage,
  onClearSelectedMessage,
  className,
}: Props) {
  const [observations, setObservations] = useState<Observation[]>([]);
  const [improvements, setImprovements] = useState<SynthesizedImprovement[]>([]);
  const [inputText, setInputText] = useState("");
  const [saving, setSaving] = useState(false);
  const [synthesizing, setSynthesizing] = useState(false);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [view, setView] = useState<PanelView>("observations");
  const [expandedImpId, setExpandedImpId] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  // Focus input when message selected
  useEffect(() => {
    if (selectedMessage && inputRef.current) {
      inputRef.current.focus();
    }
  }, [selectedMessage]);

  // Try to resolve agentId from agentName
  const resolveAgentId = (name?: string): string | undefined => {
    if (!name) return undefined;
    const found = AGENTS_V4.find(
      (a) => a.name.toLowerCase() === name.toLowerCase(),
    );
    return found?.id;
  };

  // ===== SAVE OBSERVATION =====
  const saveObservation = useCallback(async () => {
    if (!inputText.trim()) return;
    setSaving(true);

    const agentId =
      selectedMessage?.agentId || resolveAgentId(selectedMessage?.agentName);

    const newObs: Observation = {
      id: crypto.randomUUID(),
      scope: selectedMessage ? "message" : "session",
      observationText: inputText.trim(),
      messageContent: selectedMessage?.content,
      messageRole: selectedMessage?.role,
      leadId: selectedMessage?.leadId,
      leadName: selectedMessage?.leadName,
      agentName: selectedMessage?.agentName,
      agentId,
      createdAt: new Date().toISOString(),
    };

    setObservations((prev) => [newObs, ...prev]);
    setInputText("");
    onClearSelectedMessage();

    // Persist to DB (fire-and-forget)
    supabase
      .from("simulation_observations" as any)
      .insert({
        simulation_id: simulationId || null,
        lead_id: newObs.leadId || null,
        lead_name: newObs.leadName || null,
        agent_id: newObs.agentId || null,
        agent_name: newObs.agentName || null,
        scope: newObs.scope,
        message_content: newObs.messageContent || null,
        message_role: newObs.messageRole || null,
        observation_text: newObs.observationText,
      } as any)
      .then(({ error }) => {
        if (error) console.warn("[Observations] Save failed:", error.message);
      });

    setSaving(false);
    sonnerToast.success("📝 Observação registrada", {
      description:
        newObs.scope === "message"
          ? `Vinculada à mensagem de ${newObs.agentName || "agente"}`
          : "Observação geral da sessão",
    });
  }, [inputText, selectedMessage, simulationId, onClearSelectedMessage]);

  const removeObs = (id: string) => {
    setObservations((prev) => prev.filter((o) => o.id !== id));
  };

  // ===== AI SYNTHESIS =====
  const synthesizeWithAI = useCallback(async () => {
    if (observations.length === 0) return;
    setSynthesizing(true);
    setView("review");

    // Group observations by agent
    const byAgent = new Map<string, Observation[]>();
    for (const obs of observations) {
      const key = obs.agentName || "geral";
      if (!byAgent.has(key)) byAgent.set(key, []);
      byAgent.get(key)!.push(obs);
    }

    const observationsText = observations
      .map(
        (o, i) =>
          `[${i + 1}] ${o.scope === "message" ? `Sobre mensagem do ${o.agentName || "agente"}: "${o.messageContent?.slice(0, 100)}"` : "Geral"} → ${o.observationText}`,
      )
      .join("\n");

    const agentsList = AGENTS_V4.map((a) => `${a.id}: ${a.name} (${a.emoji})`).join(", ");

    const systemPrompt = `Você é um analista especializado em otimização de agentes de IA para uma agência de viagens premium.
Analise as observações do gestor sobre o desempenho dos agentes durante uma simulação e converta em melhorias estruturadas.

AGENTES DISPONÍVEIS: ${agentsList}

RETORNE APENAS um JSON array com objetos no formato:
[{
  "agentId": "id do agente alvo",
  "agentName": "nome do agente",
  "category": "behavior" | "tone" | "knowledge" | "flow",
  "title": "título curto da melhoria",
  "description": "descrição detalhada do problema e solução",
  "actionText": "instrução EXATA a ser adicionada ao prompt do agente (em português, escrita como regra direta ex: 'Nunca faça mais de 2 perguntas seguidas ao cliente')",
  "severity": "critical" | "important" | "suggestion",
  "sourceObservationIndexes": [1, 2]
}]

REGRAS:
- Cada observação deve gerar pelo menos 1 melhoria
- actionText deve ser uma instrução clara e direta que será INJETADA no behavior_prompt do agente
- Priorize melhorias de comportamento e tom de voz
- Se não conseguir identificar o agente, use o primeiro agente comercial
- Agrupe observações similares em uma única melhoria`;

    try {
      // Direct fetch to avoid simulator queue/cooldown blocking
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/simulator-ai`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          type: "evaluate",
          systemPrompt,
          history: [{ role: "user", content: `OBSERVAÇÕES DO GESTOR:\n${observationsText}` }],
          provider: "lovable",
        }),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        console.error("[Synthesis] API error:", resp.status, errText);
        throw new Error(`HTTP ${resp.status}`);
      }

      const data = await resp.json();
      const result = data.content || "";

      // Parse JSON from response
      const jsonMatch = result.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error("No JSON array found");

      const parsed = JSON.parse(jsonMatch[0]) as Array<{
        agentId: string;
        agentName: string;
        category: SynthesizedImprovement["category"];
        title: string;
        description: string;
        actionText: string;
        severity: SynthesizedImprovement["severity"];
        sourceObservationIndexes: number[];
      }>;

      const newImprovements: SynthesizedImprovement[] = parsed.map((item) => {
        const agent = AGENTS_V4.find((a) => a.id === item.agentId);
        return {
          id: crypto.randomUUID(),
          agentId: item.agentId || agent?.id || "bia",
          agentName: item.agentName || agent?.name || "Bia",
          agentEmoji: agent?.emoji || "🤖",
          category: item.category || "behavior",
          title: item.title,
          description: item.description,
          actionText: item.actionText,
          severity: item.severity || "important",
          sourceObservationIds: (item.sourceObservationIndexes || []).map(
            (idx) => observations[idx - 1]?.id || "",
          ),
          status: "pending",
        };
      });

      setImprovements(newImprovements);
      sonnerToast.success(`✨ ${newImprovements.length} melhorias identificadas`);
    } catch (err) {
      console.error("[Synthesis] Failed:", err);
      sonnerToast.error("Erro na análise", {
        description: "Tente novamente em alguns segundos",
      });
    } finally {
      setSynthesizing(false);
    }
  }, [observations]);

  // ===== APPROVE & APPLY =====
  const approveImprovement = useCallback(
    async (imp: SynthesizedImprovement) => {
      setApplyingId(imp.id);

      try {
        // 1. Fetch current behavior_prompt from DB
        const { data: agentRow } = await supabase
          .from("ai_team_agents")
          .select("behavior_prompt, name")
          .eq("id", imp.agentId)
          .single();

        const currentPrompt = (agentRow as any)?.behavior_prompt || "";
        const separator = "\n\n---\n";
        const header = `[Correção via Simulador - ${new Date().toLocaleDateString("pt-BR")}]`;
        const newBlock = `${header}\n${imp.actionText}`;
        const updatedPrompt = currentPrompt
          ? `${currentPrompt}${separator}${newBlock}`
          : newBlock;

        // 2. Update behavior_prompt in DB
        const { error } = await supabase
          .from("ai_team_agents")
          .update({
            behavior_prompt: updatedPrompt,
            updated_at: new Date().toISOString(),
          })
          .eq("id", imp.agentId);

        if (error) throw error;

        // 3. Log to audit
        logAITeamAudit({
          action_type: AUDIT_ACTIONS.UPDATE,
          entity_type: AUDIT_ENTITIES.PROMPT,
          entity_id: imp.id,
          entity_name: imp.title,
          agent_id: imp.agentId,
          agent_name: imp.agentName,
          description: `Melhoria aprovada via simulador: ${imp.title}`,
          details: {
            category: imp.category,
            severity: imp.severity,
            actionText: imp.actionText,
          },
          performed_by: "gestor",
        });

        // 4. Log improvement to ai_team_improvements
        const { data: improvementRow } = await supabase.from("ai_team_improvements").insert({
          agent_id: imp.agentId,
          title: imp.title,
          description: imp.description,
          category: imp.category,
          impact_score: imp.severity === "critical" ? 90 : imp.severity === "important" ? 70 : 50,
          status: "approved",
          approved_at: new Date().toISOString(),
          approved_by: "gestor_simulador",
        }).select("id").single();

        const improvementDbId = (improvementRow as any)?.id || null;

        // 5. Update local state
        setImprovements((prev) =>
          prev.map((i) =>
            i.id === imp.id ? { ...i, status: "approved", improvementDbId } : i,
          ),
        );

        const categoryLabel = CATEGORY_META[imp.category]?.label || "Comportamento";

        sonnerToast.success(`✅ Aplicado em ${imp.agentName}`, {
          description: `"${imp.title}" adicionado ao prompt (${categoryLabel}) do agente`,
        });
      } catch (err: any) {
        console.error("[Approve] Failed:", err);
        sonnerToast.error("Erro ao aplicar", {
          description: err?.message || "Tente novamente",
        });
      } finally {
        setApplyingId(null);
      }
    },
    [],
  );

  const rejectImprovement = (id: string) => {
    setImprovements((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: "rejected" } : i)),
    );
  };

  const approveAll = async () => {
    const pending = improvements.filter((i) => i.status === "pending");
    for (const imp of pending) {
      await approveImprovement(imp);
    }
  };

  const pendingCount = improvements.filter((i) => i.status === "pending").length;
  const approvedCount = improvements.filter((i) => i.status === "approved").length;

  // ===== RENDER =====
  return (
    <div
      className={cn("flex flex-col rounded-2xl overflow-hidden", className)}
      style={{
        background: "rgba(13,18,32,0.95)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Header with tabs */}
      <div
        className="px-3 py-2.5 flex items-center gap-1"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <button
          onClick={() => setView("observations")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all",
            view === "observations"
              ? "text-amber-400"
              : "text-muted-foreground/60 hover:text-muted-foreground",
          )}
          style={
            view === "observations"
              ? { background: "rgba(245,158,11,0.1)" }
              : {}
          }
        >
          <Eye className="w-3.5 h-3.5" />
          Observações
          {observations.length > 0 && (
            <span
              className="ml-0.5 text-[9px] px-1.5 py-0.5 rounded-full font-bold"
              style={{
                background: "rgba(245,158,11,0.15)",
                color: "#F59E0B",
              }}
            >
              {observations.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setView("review")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all",
            view === "review"
              ? "text-emerald-400"
              : "text-muted-foreground/60 hover:text-muted-foreground",
          )}
          style={
            view === "review"
              ? { background: "rgba(16,185,129,0.1)" }
              : {}
          }
        >
          <Wand2 className="w-3.5 h-3.5" />
          Melhorias
          {improvements.length > 0 && (
            <span
              className="ml-0.5 text-[9px] px-1.5 py-0.5 rounded-full font-bold"
              style={{
                background:
                  pendingCount > 0
                    ? "rgba(245,158,11,0.15)"
                    : "rgba(16,185,129,0.15)",
                color: pendingCount > 0 ? "#F59E0B" : "#10B981",
              }}
            >
              {pendingCount > 0
                ? `${pendingCount} pendente${pendingCount > 1 ? "s" : ""}`
                : `${approvedCount} ✓`}
            </span>
          )}
        </button>
      </div>

      {/* ===== OBSERVATIONS VIEW ===== */}
      {view === "observations" && (
        <>
          {/* Selected message context */}
          {selectedMessage && (
            <div
              className="mx-3 mt-3 rounded-xl p-3 relative animate-in slide-in-from-top-2 duration-200"
              style={{
                background: "rgba(245,158,11,0.06)",
                border: "1px solid rgba(245,158,11,0.15)",
              }}
            >
              <button
                onClick={onClearSelectedMessage}
                className="absolute top-2 right-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <p
                className="text-[9px] uppercase tracking-widest font-bold mb-1.5"
                style={{ color: "#F59E0B" }}
              >
                📌 Mensagem selecionada
              </p>
              <p
                className="text-[11px] leading-relaxed line-clamp-3"
                style={{ color: "#E2E8F0" }}
              >
                "
                {selectedMessage.content.slice(0, 120)}
                {selectedMessage.content.length > 120 ? "..." : ""}"
              </p>
              <div className="flex items-center gap-2 mt-1.5">
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded"
                  style={{
                    background:
                      selectedMessage.role === "agent"
                        ? "rgba(16,185,129,0.1)"
                        : "rgba(59,130,246,0.1)",
                    color:
                      selectedMessage.role === "agent"
                        ? "#10B981"
                        : "#3B82F6",
                  }}
                >
                  {selectedMessage.role === "agent"
                    ? selectedMessage.agentName || "Agente"
                    : selectedMessage.leadName || "Lead"}
                </span>
              </div>
            </div>
          )}

          {/* Input area */}
          <div className="p-3">
            <div className="relative">
              <textarea
                ref={inputRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    saveObservation();
                  }
                }}
                placeholder={
                  selectedMessage
                    ? "O que você observou nesta mensagem?"
                    : "Observação geral sobre a sessão..."
                }
                className="w-full bg-secondary/30 text-sm text-foreground rounded-xl px-4 py-3 pr-12 resize-none placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30 transition-all"
                rows={2}
                style={{ border: "1px solid rgba(255,255,255,0.06)" }}
              />
              <button
                onClick={saveObservation}
                disabled={!inputText.trim() || saving}
                className="absolute bottom-3 right-3 p-1.5 rounded-lg transition-all disabled:opacity-30"
                style={{
                  background: inputText.trim()
                    ? "rgba(245,158,11,0.2)"
                    : "transparent",
                  color: "#F59E0B",
                }}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            {!selectedMessage && (
              <p
                className="text-[10px] mt-1.5 px-1"
                style={{ color: "#64748B" }}
              >
                💡 Clique em uma mensagem no chat para vincular a observação
              </p>
            )}
          </div>

          {/* Observations list */}
          <div className="flex-1 overflow-y-auto custom-scrollbar px-3 pb-2 space-y-2">
            {observations.length === 0 ? (
              <div className="text-center py-6">
                <MessageSquarePlus
                  className="w-8 h-8 mx-auto mb-2 opacity-20"
                  style={{ color: "#94A3B8" }}
                />
                <p className="text-[11px]" style={{ color: "#64748B" }}>
                  Registre observações enquanto assiste
                </p>
              </div>
            ) : (
              observations.map((obs) => (
                <div
                  key={obs.id}
                  className="group rounded-xl p-3 transition-all hover:brightness-110"
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.04)",
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {obs.scope === "message" ? (
                        <Lightbulb
                          className="w-3 h-3 shrink-0"
                          style={{ color: "#F59E0B" }}
                        />
                      ) : (
                        <Sparkles
                          className="w-3 h-3 shrink-0"
                          style={{ color: "#8B5CF6" }}
                        />
                      )}
                      <span
                        className="text-[9px] uppercase tracking-wider font-bold"
                        style={{
                          color:
                            obs.scope === "message" ? "#F59E0B" : "#8B5CF6",
                        }}
                      >
                        {obs.scope === "message" ? "Mensagem" : "Sessão"}
                      </span>
                    </div>
                    <button
                      onClick={() => removeObs(obs.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>
                  {obs.messageContent && (
                    <p
                      className="text-[10px] italic mt-1.5 line-clamp-2 px-2 py-1 rounded"
                      style={{
                        color: "#94A3B8",
                        background: "rgba(255,255,255,0.02)",
                      }}
                    >
                      "
                      {obs.messageContent.slice(0, 80)}
                      {obs.messageContent.length > 80 ? "..." : ""}"
                    </p>
                  )}
                  <p
                    className="text-xs mt-1.5 leading-relaxed"
                    style={{ color: "#E2E8F0" }}
                  >
                    {obs.observationText}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    {obs.agentName && (
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded"
                        style={{
                          background: "rgba(16,185,129,0.08)",
                          color: "#10B981",
                        }}
                      >
                        {obs.agentName}
                      </span>
                    )}
                    {obs.leadName && (
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded"
                        style={{
                          background: "rgba(59,130,246,0.08)",
                          color: "#3B82F6",
                        }}
                      >
                        {obs.leadName}
                      </span>
                    )}
                    <span
                      className="text-[9px] ml-auto"
                      style={{ color: "#64748B" }}
                    >
                      {new Date(obs.createdAt).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Synthesize CTA */}
          {observations.length >= 1 && (
            <div
              className="px-3 pb-3 pt-1"
              style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
            >
              <button
                onClick={synthesizeWithAI}
                disabled={synthesizing}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all hover:brightness-110 disabled:opacity-60"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(139,92,246,0.15))",
                  border: "1px solid rgba(245,158,11,0.2)",
                  color: "#F59E0B",
                }}
              >
                {synthesizing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analisando {observations.length} observações...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    Organizar com IA ({observations.length} obs.)
                  </>
                )}
              </button>
            </div>
          )}
        </>
      )}

      {/* ===== REVIEW / IMPROVEMENTS VIEW ===== */}
      {view === "review" && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {synthesizing ? (
            <div className="flex-1 flex flex-col items-center justify-center py-8 gap-3">
              <Loader2
                className="w-10 h-10 animate-spin"
                style={{ color: "#F59E0B" }}
              />
              <p className="text-xs" style={{ color: "#94A3B8" }}>
                Convertendo observações em melhorias...
              </p>
            </div>
          ) : improvements.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-8 gap-2">
              <Wand2
                className="w-8 h-8 opacity-20"
                style={{ color: "#94A3B8" }}
              />
              <p className="text-[11px]" style={{ color: "#64748B" }}>
                Registre observações e clique "Organizar com IA"
              </p>
              <button
                onClick={() => setView("observations")}
                className="text-[11px] mt-1 px-3 py-1 rounded-lg"
                style={{
                  background: "rgba(245,158,11,0.1)",
                  color: "#F59E0B",
                }}
              >
                ← Voltar às observações
              </button>
            </div>
          ) : (
            <>
              {/* Stats bar */}
              <div
                className="px-3 py-2 flex items-center gap-3"
                style={{
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                  background: "rgba(255,255,255,0.01)",
                }}
              >
                <span className="text-[10px]" style={{ color: "#94A3B8" }}>
                  {improvements.length} melhoria
                  {improvements.length > 1 ? "s" : ""}
                </span>
                <div className="flex-1" />
                {pendingCount > 0 && (
                  <button
                    onClick={approveAll}
                    disabled={!!applyingId}
                    className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all hover:brightness-110 disabled:opacity-50"
                    style={{
                      background: "rgba(16,185,129,0.12)",
                      color: "#10B981",
                    }}
                  >
                    <Check className="w-3 h-3" />
                    Aprovar todas ({pendingCount})
                  </button>
                )}
              </div>

              {/* Improvements list */}
              <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-2 space-y-2">
                {improvements.map((imp) => {
                  const catMeta = CATEGORY_META[imp.category] || DEFAULT_CATEGORY;
                  const sevMeta = SEVERITY_META[imp.severity] || DEFAULT_SEVERITY;
                  const CatIcon = catMeta.icon;
                  const isExpanded = expandedImpId === imp.id;
                  const isApplying = applyingId === imp.id;

                  return (
                    <div
                      key={imp.id}
                      className={cn(
                        "rounded-xl overflow-hidden transition-all",
                        imp.status === "approved" && "opacity-70",
                        imp.status === "rejected" && "opacity-40",
                      )}
                      style={{
                        background: "rgba(255,255,255,0.02)",
                        border: `1px solid ${imp.status === "approved" ? "rgba(16,185,129,0.2)" : imp.status === "rejected" ? "rgba(239,68,68,0.1)" : "rgba(255,255,255,0.06)"}`,
                      }}
                    >
                      {/* Header */}
                      <div
                        className="flex items-start gap-2.5 p-3 cursor-pointer"
                        onClick={() =>
                          setExpandedImpId(isExpanded ? null : imp.id)
                        }
                      >
                        <span className="text-base mt-0.5">{imp.agentEmoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            <CatIcon
                              className="w-3 h-3 shrink-0"
                              style={{ color: catMeta.color }}
                            />
                            <span
                              className="text-[9px] uppercase tracking-wider font-bold"
                              style={{ color: catMeta.color }}
                            >
                              {catMeta.label}
                            </span>
                            <span
                              className="text-[8px] px-1.5 py-0.5 rounded-full font-bold ml-auto"
                              style={{
                                background: sevMeta.bg,
                                color: sevMeta.color,
                              }}
                            >
                              {sevMeta.label}
                            </span>
                          </div>
                          <p
                            className="text-xs font-semibold leading-tight"
                            style={{ color: "#E2E8F0" }}
                          >
                            {imp.title}
                          </p>
                          <p
                            className="text-[10px] mt-0.5"
                            style={{ color: "#94A3B8" }}
                          >
                            {imp.agentName}
                          </p>
                        </div>

                        {imp.status === "approved" && (
                          <Check
                            className="w-4 h-4 shrink-0"
                            style={{ color: "#10B981" }}
                          />
                        )}
                        {imp.status === "rejected" && (
                          <XCircle
                            className="w-4 h-4 shrink-0"
                            style={{ color: "#EF4444" }}
                          />
                        )}
                        {imp.status === "pending" && (
                          <ChevronDown
                            className={cn(
                              "w-4 h-4 shrink-0 transition-transform",
                              isExpanded && "rotate-180",
                            )}
                            style={{ color: "#64748B" }}
                          />
                        )}
                      </div>

                      {/* Expanded detail */}
                      {isExpanded && (
                        <div
                          className="px-3 pb-3 space-y-2.5 animate-in slide-in-from-top-1 duration-200"
                          style={{
                            borderTop: "1px solid rgba(255,255,255,0.04)",
                          }}
                        >
                          <p
                            className="text-[11px] leading-relaxed pt-2.5"
                            style={{ color: "#CBD5E1" }}
                          >
                            {imp.description}
                          </p>

                          {/* Action text preview */}
                          <div
                            className="rounded-lg p-2.5"
                            style={{
                              background: "rgba(139,92,246,0.05)",
                              border: "1px solid rgba(139,92,246,0.1)",
                            }}
                          >
                            <p
                              className="text-[9px] uppercase tracking-wider font-bold mb-1"
                              style={{ color: "#8B5CF6" }}
                            >
                              📝 Instrução que será adicionada
                            </p>
                            <p
                              className="text-[11px] leading-relaxed italic"
                              style={{ color: "#E2E8F0" }}
                            >
                              "{imp.actionText}"
                            </p>
                          </div>

                          {/* Action buttons */}
                          {imp.status === "pending" && (
                            <div className="flex items-center gap-2 pt-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  approveImprovement(imp);
                                }}
                                disabled={isApplying}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-bold transition-all hover:brightness-110 disabled:opacity-60"
                                style={{
                                  background:
                                    "linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.08))",
                                  border: "1px solid rgba(16,185,129,0.2)",
                                  color: "#10B981",
                                }}
                              >
                                {isApplying ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Check className="w-3.5 h-3.5" />
                                )}
                                {isApplying ? "Aplicando..." : "Aprovar e Aplicar"}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  rejectImprovement(imp.id);
                                }}
                                className="px-3 py-2 rounded-lg text-[11px] font-bold transition-all hover:brightness-110"
                                style={{
                                  background: "rgba(239,68,68,0.08)",
                                  border: "1px solid rgba(239,68,68,0.1)",
                                  color: "#EF4444",
                                }}
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}

                          {imp.status === "approved" && (
                            <div
                              className="py-2 px-2.5 rounded-lg space-y-1.5"
                              style={{
                                background: "rgba(16,185,129,0.06)",
                                border: "1px solid rgba(16,185,129,0.1)",
                              }}
                            >
                              <div className="flex items-center gap-1.5">
                                <Check
                                  className="w-3.5 h-3.5 shrink-0"
                                  style={{ color: "#10B981" }}
                                />
                                <span
                                  className="text-[11px] font-bold"
                                  style={{ color: "#10B981" }}
                                >
                                  Aplicado em {imp.agentName}
                                </span>
                              </div>
                              <p
                                className="text-[10px] leading-relaxed"
                                style={{ color: "#94A3B8" }}
                              >
                                "{imp.title}" adicionado ao <strong style={{ color: "#CBD5E1" }}>prompt ({CATEGORY_META[imp.category]?.label || "Comportamento"})</strong> do agente
                              </p>
                              <a
                                href={`/ai-team/equipe?agent=${imp.agentId}&tab=melhorias`}
                                className="inline-flex items-center gap-1 text-[10px] font-semibold mt-0.5 hover:underline transition-colors"
                                style={{ color: "#8B5CF6" }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <ExternalLink className="w-3 h-3" />
                                Ver melhoria no painel do agente
                              </a>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
