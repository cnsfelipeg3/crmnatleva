import { useState, useCallback } from "react";
import { Node, Edge } from "@xyflow/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  FlaskConical, Play, RotateCcw, X, CheckCircle2, Send,
  Tag, Workflow, MessageSquare, Bot, Pause, ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SimState {
  currentNodeId: string | null;
  visitedNodes: string[];
  variables: Record<string, string>;
  tags: string[];
  funnelStage: string;
  decisions: { nodeId: string; label: string; path: string }[];
  messages: { from: "bot" | "user"; text: string }[];
  isPaused: boolean;
}

const INITIAL_STATE: SimState = {
  currentNodeId: null,
  visitedNodes: [],
  variables: { nome: "João Silva", destino: "", datas: "" },
  tags: [],
  funnelStage: "novo_lead",
  decisions: [],
  messages: [],
  isPaused: false,
};

export function FlowSimulator({
  nodes,
  edges,
  onHighlightNode,
  onClose,
}: {
  nodes: Node[];
  edges: Edge[];
  onHighlightNode: (nodeIds: string[], activeId: string | null) => void;
  onClose: () => void;
}) {
  const [sim, setSim] = useState<SimState>(INITIAL_STATE);
  const [userInput, setUserInput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [autoMode, setAutoMode] = useState(false);

  const getNode = (id: string) => nodes.find((n) => n.id === id);
  const getOutEdges = (id: string) => edges.filter((e) => e.source === id);

  const processNode = useCallback((nodeId: string, state: SimState): SimState => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return state;

    const data = node.data as any;
    const config = data?.config || {};
    const newState = { ...state, currentNodeId: nodeId, visitedNodes: [...state.visitedNodes, nodeId] };

    switch (data?.nodeType) {
      case "trigger":
        break;

      case "message": {
        const text = (config.text || "Mensagem")
          .replace(/{nome}/g, newState.variables.nome)
          .replace(/{destino}/g, newState.variables.destino || "destino")
          .replace(/{datas}/g, newState.variables.datas || "a definir");
        newState.messages = [...newState.messages, { from: "bot", text: text.substring(0, 200) }];
        break;
      }

      case "action_tag":
        if (config.tags) {
          newState.tags = [...new Set([...newState.tags, ...(config.tags as string[])])];
        }
        break;

      case "action_funnel":
        if (config.funnel_stage) {
          newState.funnelStage = config.funnel_stage;
        }
        break;

      case "ai_agent": {
        const mode = config.send_mode || "suggest";
        const persona = config.persona || "sdr";
        newState.messages = [...newState.messages, {
          from: "bot",
          text: `🤖 [IA ${persona}${mode === "auto" ? " - AUTO" : " - AGUARDA APROVAÇÃO"}] ${config.system_prompt?.substring(0, 80) || "Resposta gerada..."}...`,
        }];
        break;
      }

      case "handoff":
        if (config.pause_automation) {
          newState.isPaused = true;
          newState.messages = [...newState.messages, { from: "bot", text: `⏸️ Automação PAUSADA — Transferido para ${config.queue || "vendas"}` }];
        } else {
          newState.messages = [...newState.messages, { from: "bot", text: `👤 Transferido para fila: ${config.queue || "vendas"}` }];
        }
        break;

      case "condition": {
        const outEdges = getOutEdges(nodeId);
        // In simulation, take "yes" path by default unless user input suggests otherwise
        const yesEdge = outEdges.find((e) => e.sourceHandle === "yes");
        const noEdge = outEdges.find((e) => e.sourceHandle === "no");
        const takeYes = true; // simplified
        const chosenEdge = takeYes ? yesEdge : noEdge;
        newState.decisions = [...newState.decisions, {
          nodeId,
          label: data.label || "Condição",
          path: takeYes ? "Sim ✅" : "Não ❌",
        }];
        break;
      }
    }

    return newState;
  }, [nodes, edges]);

  const advanceStep = useCallback((currentState: SimState) => {
    if (!currentState.currentNodeId || currentState.isPaused) return currentState;

    const outEdges = getOutEdges(currentState.currentNodeId);
    if (outEdges.length === 0) return currentState;

    const node = getNode(currentState.currentNodeId);
    const isCondition = (node?.data as any)?.nodeType === "condition";

    let nextEdge;
    if (isCondition) {
      nextEdge = outEdges.find((e) => e.sourceHandle === "yes") || outEdges[0];
    } else {
      nextEdge = outEdges[0];
    }

    if (!nextEdge) return currentState;
    return processNode(nextEdge.target, currentState);
  }, [nodes, edges, processNode]);

  const startSimulation = () => {
    const trigger = nodes.find((n) => (n.data as any)?.nodeType === "trigger");
    if (!trigger) return;

    setIsRunning(true);
    const initial = processNode(trigger.id, { ...INITIAL_STATE });
    setSim(initial);
    onHighlightNode([trigger.id], trigger.id);
  };

  const stepForward = () => {
    const next = advanceStep(sim);
    setSim(next);
    onHighlightNode(next.visitedNodes, next.currentNodeId);
  };

  const sendUserMessage = () => {
    if (!userInput.trim()) return;
    const withMsg: SimState = {
      ...sim,
      messages: [...sim.messages, { from: "user", text: userInput }],
      isPaused: false,
    };

    // Extract variables from user input
    if (userInput.toLowerCase().includes("dubai")) {
      withMsg.variables = { ...withMsg.variables, destino: "Dubai" };
    }
    if (userInput.toLowerCase().includes("europa") || userInput.toLowerCase().includes("paris")) {
      withMsg.variables = { ...withMsg.variables, destino: "Europa" };
    }

    setSim(withMsg);
    setUserInput("");

    // Auto-advance if not paused
    if (!withMsg.isPaused) {
      setTimeout(() => {
        const next = advanceStep(withMsg);
        setSim(next);
        onHighlightNode(next.visitedNodes, next.currentNodeId);
      }, 500);
    }
  };

  const resetSimulation = () => {
    setSim(INITIAL_STATE);
    setIsRunning(false);
    onHighlightNode([], null);
  };

  const FUNNEL_LABELS: Record<string, string> = {
    novo_lead: "Novo Lead",
    recepcao: "Recepção & Conexão",
    qualificacao: "Qualificação",
    aguardando_info: "Aguardando Info",
    orcamento_preparacao: "Orçamento em Preparação",
    proposta_enviada: "Proposta Enviada",
    negociacao: "Negociação",
    fechado: "Fechado",
    pos_venda: "Pós-venda",
    perdido: "Perdido",
  };

  return (
    <Card className="w-[380px] shadow-2xl border-border/50 backdrop-blur-sm bg-card/95 flex flex-col h-full">
      <CardHeader className="p-3 pb-2 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-primary" />
            🧪 Simulação do Fluxo
          </CardTitle>
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={resetSimulation}>
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onClose}>
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {!isRunning ? (
            <div className="space-y-3 py-4">
              <p className="text-xs text-muted-foreground text-center">
                Simule o fluxo como se fosse um cliente. Nenhum dado real será afetado.
              </p>
              <Button className="w-full" onClick={startSimulation}>
                <Play className="w-4 h-4 mr-2" /> Iniciar Simulação
              </Button>
            </div>
          ) : (
            <>
              {/* Status bar */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 rounded-lg bg-muted/50 border border-border/30">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Workflow className="w-3 h-3 text-primary" />
                    <span className="text-[9px] font-semibold uppercase text-muted-foreground">Etapa</span>
                  </div>
                  <Badge variant="default" className="text-[10px]">
                    {FUNNEL_LABELS[sim.funnelStage] || sim.funnelStage}
                  </Badge>
                </div>
                <div className="p-2 rounded-lg bg-muted/50 border border-border/30">
                  <div className="flex items-center gap-1.5 mb-1">
                    <CheckCircle2 className="w-3 h-3 text-green-500" />
                    <span className="text-[9px] font-semibold uppercase text-muted-foreground">Blocos</span>
                  </div>
                  <span className="text-sm font-bold">{sim.visitedNodes.length}</span>
                </div>
              </div>

              {/* Tags */}
              {sim.tags.length > 0 && (
                <div className="p-2 rounded-lg bg-muted/50 border border-border/30">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Tag className="w-3 h-3 text-purple-500" />
                    <span className="text-[9px] font-semibold uppercase text-muted-foreground">Tags aplicadas</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {sim.tags.map((t) => (
                      <Badge key={t} variant="secondary" className="text-[9px] h-5">{t}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Variables */}
              <div className="p-2 rounded-lg bg-muted/50 border border-border/30">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="text-[9px] font-semibold uppercase text-muted-foreground">📋 Variáveis</span>
                </div>
                <div className="space-y-0.5">
                  {Object.entries(sim.variables).filter(([, v]) => v).map(([k, v]) => (
                    <div key={k} className="flex justify-between text-[10px]">
                      <span className="text-muted-foreground font-mono">{k}</span>
                      <span className="font-medium">{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Decisions */}
              {sim.decisions.length > 0 && (
                <div className="p-2 rounded-lg bg-muted/50 border border-border/30">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-[9px] font-semibold uppercase text-muted-foreground">🔀 Decisões</span>
                  </div>
                  <div className="space-y-1">
                    {sim.decisions.map((d, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-[10px]">
                        <ArrowRight className="w-3 h-3 text-muted-foreground" />
                        <span className="text-muted-foreground">{d.label}</span>
                        <Badge variant="outline" className="text-[8px] h-4">{d.path}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Paused indicator */}
              {sim.isPaused && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-center">
                  <Pause className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                  <p className="text-xs font-semibold text-amber-600">Automação Pausada</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Aguardando ação do vendedor. Envie mensagem para simular retomada.
                  </p>
                </div>
              )}

              <Separator />

              {/* Chat simulation */}
              <div className="space-y-2">
                <span className="text-[9px] font-semibold uppercase text-muted-foreground">💬 Conversa simulada</span>
                <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                  {sim.messages.map((m, i) => (
                    <div key={i} className={cn("flex", m.from === "user" ? "justify-end" : "justify-start")}>
                      <div className={cn(
                        "px-2.5 py-1.5 rounded-xl text-[11px] max-w-[85%]",
                        m.from === "user"
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-muted border border-border/30 rounded-bl-sm"
                      )}>
                        {m.text}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* User input */}
              <div className="flex gap-1.5">
                <Input
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendUserMessage()}
                  placeholder="Digite como cliente..."
                  className="h-8 text-xs"
                />
                <Button size="icon" className="h-8 w-8 shrink-0" onClick={sendUserMessage}>
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </div>

              {/* Step controls */}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 text-xs h-7" onClick={stepForward} disabled={sim.isPaused}>
                  <ArrowRight className="w-3 h-3 mr-1" /> Próximo bloco
                </Button>
                <Button variant="outline" size="sm" className="text-xs h-7" onClick={resetSimulation}>
                  <RotateCcw className="w-3 h-3 mr-1" /> Reset
                </Button>
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </Card>
  );
}
